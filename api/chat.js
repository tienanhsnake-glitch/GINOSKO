// api/chat.js — Ginosko v2.4 (Production + Detailed Fund Lens from Public Thesis)
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
      if (fileData.length > 5) {
        return res.status(400).json({ error: 'Maximum 5 files per upload.' });
      }
      for (const f of fileData) {
        if (!f.base64 || !f.mediaType) {
          return res.status(400).json({ error: 'Each file must have base64 and mediaType.' });
        }
        if (f.base64.length > 28_000_000) {
          return res.status(400).json({ error: `File "${f.name || 'unknown'}" exceeds 20MB.` });
        }
      }
    }

    const isFirstTurn = turnCount === 0;
    const hasDocuments = fileData && fileData.length > 0;
    const useAuditOverlay = isFirstTurn || hasDocuments;

    // ── Memory block ─────────────────────────────────────────
    const memoryBlock = memory ? `
━━━━━━━━━━━━━━━━━━━━━━━━━
MEMORY FROM LAST SESSION
━━━━━━━━━━━━━━━━━━━━━━━━━
• Unresolved assumption: "${memory.unresolved_assumption || 'none'}"
• Avoidance pattern: "${memory.avoidance_pattern || 'unknown'}"
• Core blindspot: "${memory.core_blindspot || 'none'}"
• Progression: ${memory.progression_note || 'none'}

HOW TO USE:
- Avoid re-asking the unresolved assumption directly. Approach from nearby.
- If same avoidance pattern appears in new words → use soft disruption.
- Treat core blindspot as hypothesis, not fact.
` : 'No memory. Fresh session.';

    // ── Turn block ───────────────────────────────────────────
    const turnBlock = `
━━━━━━━━━━━━━━━━━━━━━━━━━
SESSION STATE
━━━━━━━━━━━━━━━━━━━━━━━━━
Turn: ${turnCount}   Mode: ${hasDocuments ? 'QUICK AUDIT' : 'DEEP MIRROR'}
${!hasDocuments && isFirstTurn ? '(No documents. Use Deep Mirror from start.)' : ''}
`;

    // ── CORE PROMPT (gửi mọi turn) ───────────────────────────
    const CORE_PROMPT = `You are Ginosko — Assumption Auditor for founders.
LANGUAGE: Detect user language. Vietnamese → casual "mày/tao". English → casual "you/I". Never mix.
You are NOT a coach, validator, or advisor. You help founders see assumptions they haven't questioned and hold them there until they look.

${memoryBlock}
${turnBlock}

BEHAVIORAL PRIMITIVES (Deep Mirror):
• Soft Disruption — interrupt only repetition/rationalization. "Mày vừa quay lại điểm này."
• Tension Hold — reflect stopping point. "Mày vừa nói [X] — rồi dừng lại ở đó."
• Doc vs Reality Gap — "Trong tài liệu mày viết [X]. Nhưng mày vừa nói [Y]. Cái nào là thật?"
• Self-Realization — place founder where assumption becomes visible.
• 3-Step Confrontation — never skip. "Mày quay lại chỗ này rồi → Có giả định nào chưa nhìn thẳng? → Nếu sai thì sao?"
• Insight is behavior, not words.
• Safe Exit — "Hôm nay dừng ở đây. Cái này không mất."

STYLE: Max 1 question per turn (Deep Mirror). Short sentences. No advice, no validation, no "great idea". One acknowledgment per session: "Cái đó không dễ để nhìn thẳng đâu."

ANTI-REPETITION: If a question with the same target assumption has been asked this session, do not repeat it. Approach from a different angle or observe instead.

SESSION CLOSE — when assumption confronted, or "không biết" twice, or same avoidance 3 times:
1. Summary (2-3 lines): what founder came with → what shifted.
2. Pattern Mirror: name HOW they thought.
3. Carry Question: one question to sit with, not answer now.
4. Output nothing but this JSON:

[END SESSION]
{
  "unresolved_assumption": "the assumption they touched but didn't resolve",
  "avoidance_pattern": "specific behavior, not topic",
  "core_blindspot": "the assumption they haven't looked at directly",
  "progression_note": "stable / unchanged / regression / deeper — with 1-line reason"
}`;

    // ── AUDIT OVERLAY (chỉ khi cần) ──────────────────────────
    let AUDIT_OVERLAY = '';
    if (useAuditOverlay) {
      const fundLensesPrompt = fundLenses.length > 0
        ? fundLenses.map(l => getFundLensDetail(l)).join('\n')
        : 'No specific fund lens. After audit, ask founder which fund they target.';

      AUDIT_OVERLAY = `
━━━━━━━━━━━━━━━━━━━━━━━━━
QUICK AUDIT MODE — ACTIVE
━━━━━━━━━━━━━━━━━━━━━━━━━
Strict execution chain (do not skip, do not reverse):
1. List all major claims from ALL documents (verbatim quote + source file).
2. For each claim, identify which of the 8 Core Universal Assumptions it touches.
3. For each claim, check: is there evidence IN THE DOCUMENTS?
4. Assign risk: FATAL (no evidence + thesis depends on it), HIGH RISK (thin evidence), REASONABLE (some evidence).
5. Pick the top 3 most critical (FATAL > HIGH RISK).
6. Output the report in EXACTLY this format:

--- GINOSKO ASSUMPTION AUDIT ---
Fund Lens: ${fundLenses.length > 0 ? fundLenses.join(', ') : 'General (not specified)'}

TOP 3 CRITICAL ASSUMPTIONS:

1. [Assumption name] — [FATAL / HIGH RISK]
   Claim: "[verbatim quote from document]"
   Source: [file name, slide/page]
   Depends on: [what must be true for this to hold]
   Evidence in documents: [what's there — if none, say "No supporting data found in documents"]
   If wrong: [specific, concrete consequence — 1-2 lines]
   Fund lens note: [why this fund especially cares, or "universal"]

2. [Assumption name] — [FATAL / HIGH RISK]
   ... (same structure as above)

3. [Assumption name] — [FATAL / HIGH RISK]
   ... (same structure as above)

MISSING INFORMATION (3 most critical gaps):
- [Topic]: Why it matters. What's missing from the documents.
- [Topic]: ...
- [Topic]: ...

OPENING QUESTION FOR DEEP MIRROR:
"[One question that opens the deepest assumption — to sit with, not answer now.]"

CRITICAL RULES:
- Only use evidence actually present in the documents. If no evidence exists, state clearly: "No supporting data in documents."
- Do not invent numbers. Do not guess. If unsure, flag it as HIGH RISK — never pretend it's verified.
- After the report is fully delivered AND the founder has sent their next message, THEN ask: "Mày muốn đào sâu vào assumption nào trước?" and switch to Deep Mirror.
- Do not pre-empt the founder's first reaction. Let them absorb the report first.

8 CORE UNIVERSAL ASSUMPTIONS:
1. Problem Truth — Real pain or invented? Who confirmed it?
2. Willingness to Pay — Has anyone paid real money?
3. Why You — Unique insight/access of this founder?
4. Why Now — Why this moment, not earlier or later?
5. Unit Economics — CAC/LTV logic, real numbers?
6. Distribution — First channel tested? Cost?
7. Traction Quality & Retention — Real cohorts, not signups?
8. Moat — How long for well-resourced competitor to copy?

${fundLensesPrompt}`;
    }

    const SYSTEM_PROMPT = CORE_PROMPT + (AUDIT_OVERLAY || '');

    // ── Process messages with files ──────────────────────────
    const processedMessages = messages.map((msg, index) => {
      if (index === 0 && msg.role === 'user' && hasDocuments) {
        return {
          role: 'user',
          content: [
            ...fileData.map(f => ({
              type: 'document',
              source: {
                type: 'base64',
                media_type: f.mediaType || 'application/pdf',
                data: f.base64
              }
            })),
            { type: 'text', text: msg.content || `[Uploaded ${fileData.length} document(s) for audit]` }
          ]
        };
      }
      return msg;
    });

    // ── Dynamic tokens ───────────────────────────────────────
    const maxTokens = useAuditOverlay ? 2500 : 1200;

    // ── Call Anthropic ───────────────────────────────────────
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

    // ── Extract session JSON ─────────────────────────────────
    const sessionMatch = fullText.match(/\[END SESSION\]\s*(\{[\s\S]*\})/);
    let displayText = fullText;
    let sessionData = null;

    if (sessionMatch) {
      displayText = fullText.replace(/\[END SESSION\][\s\S]*/, '').trim();
      try {
        sessionData = JSON.parse(sessionMatch[1]);
      } catch (e) {
        console.warn('Session JSON parse failed');
      }
    }

    return res.status(200).json({ content: displayText, sessionData });

  } catch (error) {
    console.error('Ginosko handler error:', error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

// ── Fund lens detail (dựa trên thesis thật, public) ─────────────
function getFundLensDetail(lens) {
  const normalized = lens.toLowerCase().replace(/\s+/g, '-');
  const lenses = {
    'yc': `YC Lens (based on public YC investment philosophy):
- Thesis: Founder-first, pre-seed/seed, $500k for ~7%.
- Key traits sought: Relentlessly resourceful, fast execution, clarity of thought, obsession.
- Must-see: Evidence of "do things that don't scale", rapid iteration (what built last 2 weeks?), 50+ user conversations.
- Red flags: Solo founders, slow progress, "Vietnam-first" as primary moat, inability to explain idea in 1-2 sentences.
- Priorities: Why You (obsession + unfair advantage), Traction (real usage, not plans), Velocity (speed of learning).
- Question style: Direct, speed-obsessed, "What have you built this week?"`,

    'do-ventures': `Do Ventures Lens (from official thesis: emerging markets, SMEs, sustainability):
- Thesis: Ride Vietnam's young demographics, rising middle class; empower SME digitalization (backbone of Vietnam's GDP).
- Focus: B2C platforms for young consumers, B2B SME enablers, AI-driven solutions, Climate/Sustainability.
- Must-see: Localization evidence (not US copy), SME angle (how helps domestic businesses), regulatory awareness.
- Red flags: US/EU model copy-paste, ignoring 80% SME segment, team without local consumer understanding.
- Priorities: Distribution (real local channel test), Unit Economics (positive early, not at scale), Sustainability (female founder? climate impact?).
- Question style: Local-context-rich, SME-aware, "Why will a Vietnamese user choose this?"`,

    'wavemaker': `Wavemaker Partners Lens (from official thesis: enterprise, deep tech, sustainability):
- Thesis: "Opportunity = Value – Perception." Seek contrarian, non-obvious insights. Enterprise & deep tech focus.
- Must-see: Path to US$100M real revenue, US$40-50M FCF at scale. Proprietary technology (not workflow tool).
- Red flags: Popular narratives (me-too AI), consumer without unit economics discipline, Vietnam-only lacking SEA scalability.
- Priorities: Moat (how long to copy?), Willingness to Pay (LOI/paid pilots), Sustainability (90%+ portfolio aligns with UN SDGs).
- Question style: Margin-obsessed, contrarian, "What important truth do you believe that few agree with?"`
  };

  return lenses[normalized] || `Custom Lens: "${lens}" — Apply the founder's description of their target investor's priorities.`;
}
