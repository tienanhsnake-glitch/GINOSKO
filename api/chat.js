// api/chat.js — Ginosko v2.5 (Token Optimized)
// Deploy on Vercel. Set ANTHROPIC_API_KEY in environment variables.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, memory, turnCount = 0, fileData, fundLenses = [] } = req.body;

    // ── File validation ──────────────────────────────────────
    if (fileData && Array.isArray(fileData)) {
      if (fileData.length > 5) return res.status(400).json({ error: 'Maximum 5 files per upload.' });
      for (const f of fileData) {
        if (!f.base64 || !f.mediaType) return res.status(400).json({ error: 'Each file must have base64 and mediaType.' });
        if (f.base64.length > 28_000_000) return res.status(400).json({ error: `File "${f.name || 'unknown'}" exceeds 20MB.` });
      }
    }

    // ── Token-saving: chỉ bật Audit Overlay ở turn đầu có file ──
    const isFirstTurn = turnCount === 0;
    const hasDocuments = fileData && fileData.length > 0;
    const useAuditOverlay = isFirstTurn && hasDocuments; // CHANGED: chỉ turn đầu + có file

    // ── Memory block ─────────────────────────────────────────
    const memoryBlock = memory ? `
MEMORY: unresolved="${memory.unresolved_assumption || 'none'}" avoidance="${memory.avoidance_pattern || 'unknown'}" blindspot="${memory.core_blindspot || 'none'}"
USE: Approach unresolved from nearby. Flag avoidance in new words. Blindspot = hypothesis.
` : 'No memory.';

    // ── Turn block ───────────────────────────────────────────
    const turnBlock = `Turn ${turnCount}. ${hasDocuments && useAuditOverlay ? 'QUICK AUDIT' : 'DEEP MIRROR'}`;

    // ── CORE PROMPT (gửi mọi turn) ───────────────────────────
    const CORE_PROMPT = `You are Ginosko — Assumption Auditor for founders.

LANGUAGE: Follow user's first message language. Vietnamese → "mày/tao". English → "you/I". Documents don't change language. Never mix.

${memoryBlock}
${turnBlock}

PRIMITIVES:
• Soft Disruption: interrupt repetition. "Mày vừa quay lại điểm này."
• Tension Hold: reflect stopping point only.
• Doc vs Reality: "Trong tài liệu mày viết [X]. Mày vừa nói [Y]. Cái nào thật?"
• Self-Realization: make assumption visible.
• 3-Step Confrontation: never skip steps.
• Insight = behavior, not words.
• Safe Exit: "Hôm nay dừng ở đây. Cái này không mất."

STYLE: 1 question/turn max. Short. No advice/validation. One "Cái đó không dễ" per session.
ANTI-REPETITION: Never repeat same target assumption question.
CLOSE: confronted/"không biết" 2x/avoidance 3x → Summary → Pattern Mirror → Carry Question → this JSON:

[END SESSION]
{"unresolved_assumption":"...","avoidance_pattern":"...","core_blindspot":"...","progression_note":"..."}`;

    // ── AUDIT OVERLAY (chỉ turn đầu + có file) ───────────────
    let AUDIT_OVERLAY = '';
    if (useAuditOverlay) {
      const fundLensesPrompt = fundLenses.length > 0
        ? fundLenses.map(l => getFundLensDetail(l)).join('\n')
        : '';

      AUDIT_OVERLAY = `
QUICK AUDIT — do not skip:
1. Extract ALL claims from docs (verbatim + source).
2. Map each to: Problem Truth / Willingness to Pay / Why You / Why Now / Unit Economics / Distribution / Traction / Moat.
3. Evidence check: IN DOCUMENTS?
4. Risk: FATAL (no evidence+critical) / HIGH (thin evidence) / REASONABLE.
5. Top 3 → format:

--- GINOSKO ASSUMPTION AUDIT ---
Fund Lens: ${fundLenses.length > 0 ? fundLenses.join(', ') : 'General'}

1. [Name] — [FATAL/HIGH RISK]
   Claim: "[verbatim]"
   Source: [file/slide]
   Depends on: [...]
   Evidence: [...]
   If wrong: [1-2 lines]
   Fund note: [...]

2. [...] (same)
3. [...] (same)

MISSING: 3 gaps. OPENING Q: "[one sharp question]"

RULES: Only evidence in docs. Say "No supporting data" if none. Don't invent.
After report + founder replies, THEN ask: "Mày muốn đào sâu vào assumption nào trước?" → Deep Mirror.

${fundLensesPrompt}

OPEN: Docs → audit now. No docs+no memory → pick: "Idea của mày đang đứng trên giả định nào chưa kiểm tra?" / "Nếu thesis sai — phần nào?" / "Build cho ai — đã nói chuyện chưa?"
Memory → "Lần trước kẹt ở [unresolved]. Có gì thay đổi?"
Only ONE opening.`;
    }

    const SYSTEM_PROMPT = CORE_PROMPT + (AUDIT_OVERLAY || '');

    // ── Token-saving: trim message history to last 16 ────────
    const trimmedMessages = messages.length > 16 ? messages.slice(-16) : messages;

    // ── Process messages with files only on first turn ───────
    const processedMessages = trimmedMessages.map((msg, index) => {
      if (index === 0 && msg.role === 'user' && useAuditOverlay) {
        return {
          role: 'user',
          content: [
            ...fileData.map(f => ({
              type: 'document',
              source: { type: 'base64', media_type: f.mediaType || 'application/pdf', data: f.base64 }
            })),
            { type: 'text', text: msg.content || `[Uploaded ${fileData.length} document(s)]` }
          ]
        };
      }
      return msg;
    });

    // ── Dynamic tokens (reduced) ─────────────────────────────
    const maxTokens = useAuditOverlay ? 2048 : 1024;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        messages: processedMessages
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic error:', response.status, errText);
      return res.status(500).json({ error: 'AI service temporarily unavailable.' });
    }

    const data = await response.json();
    const fullText = data.content[0].text;

    const sessionMatch = fullText.match(/\[END SESSION\]\s*(\{[\s\S]*\})/);
    let displayText = fullText;
    let sessionData = null;

    if (sessionMatch) {
      displayText = fullText.replace(/\[END SESSION\][\s\S]*/, '').trim();
      try { sessionData = JSON.parse(sessionMatch[1]); } catch (e) {}
    }

    return res.status(200).json({ content: displayText, sessionData });

  } catch (error) {
    console.error('Ginosko error:', error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

function getFundLensDetail(lens) {
  const normalized = lens.toLowerCase().replace(/\s+/g, '-');
  const lenses = {
    'yc': `YC: Founder-first. Seek obsession, speed, "do things that don't scale". Red flags: solo, slow, explain in 1-2 sentences. Priority: Why You + Traction.`,
    'do-ventures': `Do Ventures: SEA demographics, SME digitalization, sustainability. Seek localization, SME angle, regulatory awareness. Priority: Distribution + Unit Economics.`,
    'wavemaker': `Wavemaker: Enterprise, deep tech, contrarian insights. Seek US$100M revenue path, proprietary tech, UN SDG. Priority: Moat + Willingness to Pay.`
  };
  return lenses[normalized] || `Custom: ${lens}`;
}
