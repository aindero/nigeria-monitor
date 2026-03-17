const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get('/api/forex', async (req, res) => {
  try {
    const fetch = require('node-fetch');
    const url = 'https://open.er-api.com/v6/latest/USD';
    const r = await fetch(url);
    const d = await r.json();
    const ngn = d.conversion_rates.NGN;
    res.json({
      usd_ngn: ngn.toFixed(2),
      gbp_ngn: (ngn / d.conversion_rates.GBP).toFixed(2),
      eur_ngn: (ngn / d.conversion_rates.EUR).toFixed(2),
      cny_ngn: (ngn / d.conversion_rates.CNY).toFixed(2),
      lastUpdated: d.time_last_update_utc
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/news', async (req, res) => {
  try {
    const Parser = require('rss-parser');
    const parser = new Parser();
    const feeds = [
      { url: 'https://punchng.com/feed/', source: 'Punch' },
      { url: 'https://businessday.ng/feed/', source: 'BusinessDay' },
      { url: 'https://techcabal.com/feed/', source: 'TechCabal' },
      { url: 'https://nairametrics.com/feed/', source: 'Nairametrics' },
    ];
    const results = await Promise.allSettled(
      feeds.map(f => parser.parseURL(f.url).then(p =>
        p.items.slice(0, 8).map(item => ({
          headline: item.title,
          summary: item.contentSnippet ? item.contentSnippet.slice(0, 200) : '',
          url: item.link,
          source: f.source,
          publishedAt: item.pubDate,
          category: inferCategory(item.title || '')
        }))
      ))
    );
    const news = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 40);
    res.json(news);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function inferCategory(text) {
  const t = text.toLowerCase();
  if (/boko haram|iswap|bandit|military|attack|kidnap|soldier|police/.test(t)) return 'SECURITY';
  if (/inflation|cbn|naira|ngx|forex|gdp|budget|economy|bank/.test(t)) return 'ECONOMY';
  if (/nnpc|dangote|refinery|crude|oil|gas|power|electricity/.test(t)) return 'ENERGY';
  if (/tinubu|senate|house|inec|election|governor|minister/.test(t)) return 'POLITICS';
  if (/startup|fintech|tech|5g|app|digital|internet/.test(t)) return 'TECH';
  return 'GENERAL';
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`NigeriaMonitor running on http://localhost:${PORT}`));