export default async function handler(req, res) {
  const symbol = String(req.query.symbol || '').trim().toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1m`;
    const response = await fetch(url);
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta || {};
    const price = meta.regularMarketPrice;
    const previousClose = meta.chartPreviousClose ?? meta.previousClose;
    if (!Number.isFinite(price)) return res.status(502).json({ error: 'no price' });
    const change = Number.isFinite(previousClose) ? price - previousClose : null;
    const pct = Number.isFinite(previousClose) && previousClose !== 0 ? change / previousClose * 100 : null;
    res.setHeader('Cache-Control', 's-maxage=3');
    return res.status(200).json({ symbol, price, change, pct });
  } catch (error) {
    return res.status(502).json({ error: 'quote unavailable' });
  }
}
