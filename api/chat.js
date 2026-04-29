function getFundLensDetail(lens) {
  const normalized = lens.toLowerCase().replace(/\s+/g, '-');
  const lenses = {
    'yc': `YC Lens:
    - Thesis: Back founders first, ideas second. Invest at pre-seed/seed stage, $500k for ~7%.
    - What they truly want: "Relentlessly resourceful" founders. Clarity of thought above polish. Make fast progress on the right thing.
    - Must-have traits (from Paul Graham): Determination > intelligence. Flexibility. Imagination. Ability to launch fast, talk to users, iterate.
    - Red flags: Solo founders, slow progress between application and interview, inability to explain idea in 1-2 sentences.
    - Key assumption checks:
      • Founder-Market Fit: Why is THIS founder obsessed with THIS problem? (Domain expertise or unique insight?)
      • Execution velocity: What have they built in the last 2 weeks? (Not months — weeks. YC measures progress in days.)
      • User understanding: Have they talked to 50+ users? What did they learn? (Not surveys. Real conversations.)
      • "Do things that don't scale": Evidence of manual, unscalable work to get early users? (YC loves founders who did things that don't scale.)
    - Stage fit: Pre-seed, Seed. Pre-revenue is acceptable if founder quality and problem clarity are exceptional.
    - Question style: Direct, speed-obsessed, allergic to over-planning. "What have you built this week?"`,

    'do-ventures': `Do Ventures Lens:
    - Thesis: Leverage Vietnam's favorable demographics (young population, rising middle class, rapid urbanization). Seed to Series B, check size varies.
    - Core focus areas (from official website):
      • Unlocking Growth in Emerging Markets: Consumer platforms riding Vietnam's demographic wave.
      • Empowering SMEs in Digital Economy: B2B platforms helping SMEs digitize (cornerstone of Vietnam's GDP).
      • Advancing Sustainability & Diversity: Female founders, climate solutions, inclusive leadership.
    - Investment sectors: B2C platforms for young consumers, B2B platforms with regional scalability, AI-driven solutions, Climate & Sustainability.
    - Red flags: US/EU business models copy-pasted without local adaptation. Team without understanding of Vietnamese consumer behavior or regulatory landscape. Ignoring SME segment (which drives Vietnam's economy).
    - Key assumption checks:
      • Local adaptation: How is this adapted to Vietnamese behavior (payment, logistics, trust, culture)? Not "SEA version of [US startup]".
      • SME angle: Does this help Vietnamese SMEs? (If yes — strong signal. Do Ventures explicitly targets SME digitalization.)
      • Demographics tailwind: Is this riding Vietnam's young consumer wave? (Median age ~31, rising middle class).
      • Regulatory readiness: Any regulatory risk? (Fintech, edtech, healthtech require licenses in Vietnam.)
      • Sustainability angle: Female founder? Diverse team? Climate impact? (Explicitly prioritized.)
    - Stage fit: Seed to Series B. Need some traction (not idea-only).
    - Question style: Local-context-rich, SME-aware, wants evidence of Vietnam-specific insight.`,

    'wavemaker': `Wavemaker Lens:
    - Thesis: "Opportunity = Value – Perception." Back unobvious, undervalued companies in Enterprise, Deep Tech, and Sustainability. Pre-seed to Series A in SEA.
    - Portfolio: 85% enterprise/deep tech, 90%+ contribute to at least 1 UN Sustainable Development Goal. Over 200 SEA investments, US$600M AUM.
    - Core belief (from Paul Santos, Managing Partner): "Can a company get to US$100M in real revenue? Generate US$40-50M in free cash flow at scale? That's what a unicorn looks like to us."
    - What they truly want: Founders with insights others don't have. "What important truth do you believe that few people agree with?" (Peter Thiel question). Industry or technology that not many people know deeply.
    - Red flags: Consumer/growth-oriented with no unit economics discipline. "Popular theme" startups (everyone is doing it). AI without deep tech differentiation. Vietnam-only with no SEA scalability path.
    - Key assumption checks:
      • Enterprise/deep tech fit: Is this B2B? Does it have proprietary technology? (Not a workflow tool anyone can build in 3 months.)
      • Revenue at scale: Path to US$100M revenue? Free cash flow potential of US$40-50M at scale? (They think in these numbers.)
      • Uniqueness: What insight does this founder have that few others share? (Not "AI for X" — what's the non-obvious truth?)
      • Sustainability alignment: Which UN SDG does this contribute to? (Not mandatory but strongly preferred — 90% of portfolio does.)
      • SEA scalability: Can this scale beyond one country? Indonesia, Philippines, Thailand?
    - Stage fit: Pre-seed to Series A. Enterprise B2B focus means LOI/paid pilots matter more than consumer traction.
    - Question style: Margin-obsessed, B2B-focused, wants contrarian insights, not popular narratives.`
  };

  return lenses[normalized] || `Custom Lens: "${lens}" — Apply the founder's description of their target investor's priorities.`;
}
