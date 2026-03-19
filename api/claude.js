module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });

  try {
    // Scrape site content via Jina Reader
    const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
      headers: { 'Accept': 'text/plain', 'X-Timeout': '15' }
    });
    const siteContent = await jinaRes.text();
    const truncated = siteContent.slice(0, 8000);

    const prompt = `You are an expert web product auditor. Analyze this website and provide a thorough, honest audit.

Website URL: ${url}

Website content:
${truncated}

Return a JSON object with this EXACT structure (no other text, just valid JSON):
{
  "overall_score": <integer 0-100>,
  "verdict": "<short punchy verdict, 5-8 words>",
  "summary": "<2-3 honest sentences about the overall state>",
  "scores": {
    "design_ux": <integer 0-100>,
    "content_clarity": <integer 0-100>,
    "trust_credibility": <integer 0-100>,
    "seo_discoverability": <integer 0-100>,
    "conversion": <integer 0-100>,
    "performance": <integer 0-100>
  },
  "score_labels": {
    "design_ux": "Design & UX",
    "content_clarity": "Content clarity",
    "trust_credibility": "Trust & credibility",
    "seo_discoverability": "SEO & discoverability",
    "conversion": "Conversion & CTAs",
    "performance": "Performance & tech"
  },
  "whats_working": [
    {"title": "<strength title>", "description": "<specific explanation>"}
  ],
  "product_gaps": [
    {"title": "<gap title>", "description": "<specific explanation>", "priority": "high|medium|low"}
  ],
  "trust_conversion": [
    {"title": "<issue title>", "description": "<specific explanation>", "priority": "high|medium|low"}
  ],
  "seo_issues": [
    {"title": "<issue title>", "description": "<specific explanation>", "priority": "high|medium|low"}
  ],
  "launch_checklist": [
    {"item": "<action item>", "description": "<why this matters>", "priority": "high|medium|low"}
  ]
}

Rules:
- Be specific and actionable, not generic
- Provide 3-5 items per section
- whats_working should have 2-4 genuine strengths
- overall_score should be a realistic weighted average of the 6 subscores
- Return ONLY valid JSON, nothing else`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': (process.env.ZERO2SHIPPEDKEY || '').trim(),
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const claudeData = await claudeRes.json();
    if (claudeData.error) throw new Error(claudeData.error.message);

    const text = claudeData.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse audit response');

    const audit = JSON.parse(jsonMatch[0]);
    return res.status(200).json(audit);

  } catch (err) {
    console.error('Audit error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
