module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Missing url' });

  try {
    const base = new URL(url).origin;

    const scrapeJina = async (u) => {
      try {
        const r = await fetch(`https://r.jina.ai/${u}`, {
          headers: { 'Accept': 'text/plain', 'X-Timeout': '8' }
        });
        const t = await r.text();
        return t.length > 200 ? t : null;
      } catch { return null; }
    };

    // Extract internal links from homepage markdown
    const extractInternalLinks = (markdown, baseOrigin) => {
      const seen = new Set();
      const links = [];
      // Match markdown links [text](url) and bare hrefs
      const mdLinks = [...markdown.matchAll(/\]\((https?:\/\/[^\s)]+)\)/g)].map(m => m[1]);
      const relLinks = [...markdown.matchAll(/\]\((\/[^\s)]*)\)/g)].map(m => baseOrigin + m[1]);
      for (const link of [...mdLinks, ...relLinks]) {
        try {
          const u = new URL(link);
          // Same origin only, ignore anchors, query strings, and asset files
          if (u.origin === baseOrigin && !seen.has(u.pathname) && u.pathname !== '/') {
            const ext = u.pathname.split('.').pop().toLowerCase();
            if (!['png','jpg','jpeg','gif','svg','ico','css','js','woff','woff2'].includes(ext)) {
              seen.add(u.pathname);
              links.push(u.origin + u.pathname);
            }
          }
        } catch {}
      }
      return links;
    };

    // 1. Scrape homepage
    const homeContent = await scrapeJina(url);
    if (!homeContent) throw new Error('Could not fetch the page. Make sure the URL is publicly accessible.');

    // 2. Discover internal links and scrape up to 10 sub-pages in parallel
    const internalLinks = extractInternalLinks(homeContent, base);
    const toScrape = internalLinks.slice(0, 5);
    const subContents = await Promise.all(toScrape.map(u => scrapeJina(u)));

    // 3. Build combined content — homepage gets more space, sub-pages share the rest
    const pageSections = [`## ${url} (homepage)\n${homeContent.slice(0, 8000)}`];
    toScrape.forEach((u, i) => {
      if (subContents[i]) {
        const path = new URL(u).pathname;
        pageSections.push(`## ${path}\n${subContents[i].slice(0, 4000)}`);
      }
    });

    const combinedContent = pageSections.join('\n\n').slice(0, 30000);

    const scrapedUrls = toScrape.filter((u, i) => subContents[i]);
    const allPageUrls = [url, ...scrapedUrls];

    const prompt = `You are an expert web product auditor. Analyze this website and provide a thorough, honest audit.

Website URL: ${url}

The following pages were discovered via internal links and successfully scraped. They ALL exist and are part of the site:
${allPageUrls.map(u => '- ' + u).join('\n')}

CRITICAL RULES — read carefully before auditing:
- A page that appears in the list above EXISTS. Do not say it is missing, hidden, or hard to find.
- If a /pricing page is in the list, the site HAS a pricing page. Do not flag pricing as missing.
- If /privacy-policy or /terms pages are in the list, the site HAS legal pages. Do not flag them as missing.
- Judge each issue only on evidence from the actual scraped content below.
- Do not invent problems that contradict what the content shows.

Website content (all pages combined):
${combinedContent}

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
- Base your audit on ALL pages scraped, not just the homepage
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
        model: 'claude-sonnet-4-6',
        max_tokens: 5000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const rawText = await claudeRes.text();
    let claudeData;
    try {
      claudeData = JSON.parse(rawText);
    } catch {
      console.error('Claude raw response:', rawText.slice(0, 500));
      throw new Error('Claude API error: ' + rawText.slice(0, 200));
    }
    if (claudeData.error) throw new Error(claudeData.error.message || JSON.stringify(claudeData.error));

    const text = claudeData.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse audit response. Raw: ' + text.slice(0, 200));

    const audit = JSON.parse(jsonMatch[0]);
    // Include page count so the UI can show it
    audit.pages_scraped = pageSections.length;
    return res.status(200).json(audit);

  } catch (err) {
    console.error('Audit error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
