export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const raw = String(req.query.symbol || '').trim().toUpperCase();
  const base = raw.replace(/-USD$/,'').replace(/USD$/,'');
  const ids = { BTC: '1', ETH: '1027' };
  const id = ids[base];

  if (!id) {
    return res.status(400).json({ error: 'unsupported crypto', symbol: raw });
  }

  const url = new URL('https://pro-api.coinmarketcap.com/public-api/v2/simple/price');
  url.searchParams.set('id', id);
  url.searchParams.set('convert', 'USD');
  url.searchParams.set('include_all', 'true');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({ error: 'coinmarketcap unavailable', status: response.status });
    }

    const payload = await response.json();
    const item = Array.isArray(payload?.data) ? payload.data[0] : null;
    const quote = Array.isArray(item?.quotes)
      ? item.quotes.find(q => String(q?.symbol || '').toUpperCase() === 'USD') || item.quotes[0]
      : null;

    const price = Number(quote?.price);
    const marketCap = Number(quote?.market_cap);
    const volume24h = Number(quote?.volume_24h);
    const pct24h = Number(quote?.percent_change_24h);

    if (!Number.isFinite(price)) {
      return res.status(502).json({ error: 'coinmarketcap no price', symbol: base });
    }

    res.setHeader('Cache-Control', 's-maxage=55, stale-while-revalidate=120');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    return res.status(200).json({
      symbol: `${base}-USD`,
      name: item?.name || (base === 'BTC' ? 'Bitcoin' : 'Ethereum'),
      price,
      marketCap: Number.isFinite(marketCap) ? marketCap : null,
      volume24h: Number.isFinite(volume24h) ? volume24h : null,
      pct24h: Number.isFinite(pct24h) ? pct24h : null,
      lastUpdated: quote?.last_updated || null,
      currency: 'USD',
      source: 'COINMARKETCAP'
    });
  } catch (error) {
    return res.status(502).json({
      error: 'coinmarketcap unavailable',
      symbol: base,
      detail: String(error?.message || 'unknown error')
    });
  }
}
