export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const symbol = String(req.query.symbol || '').trim().toUpperCase();

  if (!symbol || !/^[A-Z0-9.^=\-]{1,20}$/.test(symbol)) {
    return res.status(400).json({ error: 'invalid symbol' });
  }

  const urls = [
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m&includePrePost=true&events=div%2Csplits`,
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m&includePrePost=true&events=div%2Csplits`
  ];

  let lastError = null;

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json,text/plain,*/*'
        },
        cache: 'no-store'
      });

      clearTimeout(timeout);

      if (!response.ok) {
        lastError = new Error(`upstream ${response.status}`);
        continue;
      }

      const data = await response.json();
      const result = data?.chart?.result?.[0];
      if (!result) {
        lastError = new Error('no result');
        continue;
      }

      const meta = result.meta || {};
      const closes = result?.indicators?.quote?.[0]?.close || [];
      let latestClose = null;

      for (let i = closes.length - 1; i >= 0; i--) {
        if (Number.isFinite(closes[i])) {
          latestClose = closes[i];
          break;
        }
      }

      const price = Number.isFinite(meta.regularMarketPrice)
        ? meta.regularMarketPrice
        : latestClose;

      const previousClose = Number.isFinite(meta.chartPreviousClose)
        ? meta.chartPreviousClose
        : Number.isFinite(meta.previousClose)
          ? meta.previousClose
          : null;

      if (!Number.isFinite(price)) {
        lastError = new Error('no price');
        continue;
      }

      const change = Number.isFinite(previousClose) ? price - previousClose : null;
      const pct = Number.isFinite(previousClose) && previousClose !== 0
        ? (change / previousClose) * 100
        : null;

      res.setHeader('Cache-Control', 's-maxage=2, stale-while-revalidate=3');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');

      return res.status(200).json({
        symbol,
        price,
        change,
        pct,
        currency: meta.currency || 'USD',
        exchange: meta.fullExchangeName || meta.exchangeName || meta.exchange || null,
        source: 'YAHOO_VIA_VERCEL',
        time: Date.now()
      });
    } catch (error) {
      lastError = error;
    }
  }

  return res.status(502).json({
    error: 'quote unavailable',
    symbol,
    detail: String(lastError?.message || 'unknown error')
  });
}
