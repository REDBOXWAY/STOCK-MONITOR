export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const symbol = String(req.query.symbol || '').trim().toUpperCase();
  const range = String(req.query.range || 'max').trim();
  const interval = String(req.query.interval || '1d').trim();

  if (!symbol || !/^[A-Z0-9.^=\-]{1,20}$/.test(symbol)) {
    return res.status(400).json({ error: 'invalid symbol' });
  }
  if (!/^(1d|5d|1mo|3mo|6mo|1y|2y|5y|10y|ytd|max)$/.test(range)) {
    return res.status(400).json({ error: 'invalid range' });
  }
  if (!/^(1m|2m|5m|15m|30m|60m|90m|1h|1d|5d|1wk|1mo|3mo)$/.test(interval)) {
    return res.status(400).json({ error: 'invalid interval' });
  }

  const urls = [
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}&includePrePost=false&events=div%2Csplits`,
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}&includePrePost=false&events=div%2Csplits`
  ];

  let lastError = null;
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      const upstream = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json,text/plain,*/*'
        },
        cache: 'no-store'
      });
      clearTimeout(timeout);

      if (!upstream.ok) {
        lastError = new Error(`upstream ${upstream.status}`);
        continue;
      }

      const data = await upstream.json();
      if (!data?.chart?.result?.[0]) {
        lastError = new Error('no result');
        continue;
      }

      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).json(data);
    } catch (error) {
      lastError = error;
    }
  }

  return res.status(502).json({
    error: 'history unavailable',
    symbol,
    detail: String(lastError?.message || 'unknown error')
  });
}
