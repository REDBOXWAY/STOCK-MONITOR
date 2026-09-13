const DAY = 86400;
const CMC_ID = '1';
const USD_ID = '2781';

function pct(from, to) {
  const a = Number(from), b = Number(to);
  return Number.isFinite(a) && Number.isFinite(b) && a !== 0 ? (b / a - 1) * 100 : null;
}

function unix(date) { return Math.floor(date.getTime() / 1000); }

function shiftUTC(date, {days=0, months=0, years=0} = {}) {
  const d = new Date(date.getTime());
  if (years) d.setUTCFullYear(d.getUTCFullYear() - years);
  if (months) d.setUTCMonth(d.getUTCMonth() - months);
  if (days) d.setUTCDate(d.getUTCDate() - days);
  return d;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'Accept':'application/json,text/plain,*/*', 'User-Agent':'Mozilla/5.0' }
    });
    if (!r.ok) throw new Error(`CMC ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function history(start, end) {
  const u = new URL('https://api.coinmarketcap.com/data-api/v3/cryptocurrency/historical');
  u.searchParams.set('id', CMC_ID);
  u.searchParams.set('convertId', USD_ID);
  u.searchParams.set('timeStart', String(unix(start)));
  u.searchParams.set('timeEnd', String(unix(end)));
  const d = await fetchJson(u);
  return Array.isArray(d?.data?.quotes) ? d.data.quotes : [];
}

function quoteClose(q) {
  const n = Number(q?.quote?.close);
  return Number.isFinite(n) ? n : null;
}

function quoteTime(q) {
  const s = q?.quote?.timestamp || q?.timeClose || q?.timeOpen;
  const t = s ? Date.parse(s) / 1000 : NaN;
  return Number.isFinite(t) ? t : null;
}

function nearestClose(quotes, target) {
  const targetTs = unix(target);
  let best = null, dist = Infinity;
  for (const q of quotes) {
    const t = quoteTime(q), close = quoteClose(q);
    if (t == null || close == null) continue;
    const d = Math.abs(t - targetTs);
    if (d < dist) { best = close; dist = d; }
  }
  return best;
}

async function exactAnchor(target) {
  const start = shiftUTC(target, {days:5});
  const end = new Date(target.getTime() + 5 * DAY * 1000);
  return nearestClose(await history(start, end), target);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const raw = String(req.query.symbol || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g,'');
  if (!['BTCUSD','BTC-USD','BTC'].includes(raw)) return res.status(400).json({error:'unsupported crypto'});

  try {
    const now = new Date();
    const latestUrl = new URL('https://pro-api.coinmarketcap.com/public-api/v2/simple/price');
    latestUrl.searchParams.set('id', CMC_ID);
    latestUrl.searchParams.set('convert', 'USD');
    latestUrl.searchParams.set('include_all', 'true');

    const recentStart = shiftUTC(now, {days:400});
    const ytd = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const t5d = shiftUTC(now, {days:5});
    const t1m = shiftUTC(now, {months:1});
    const t6m = shiftUTC(now, {months:6});
    const t1y = shiftUTC(now, {years:1});
    const t5y = shiftUTC(now, {years:5});
    const t10y = shiftUTC(now, {years:10});
    const launch = new Date(Date.UTC(2014,8,17));

    const [latest, recent, p5y, p10y, launchQuotes] = await Promise.all([
      fetchJson(latestUrl),
      history(recentStart, now),
      exactAnchor(t5y),
      exactAnchor(t10y),
      history(launch, new Date(Date.UTC(2014,8,30)))
    ]);

    const item = Array.isArray(latest?.data) ? latest.data[0] : null;
    const usd = Array.isArray(item?.quotes) ? (item.quotes.find(x=>String(x?.symbol||'').toUpperCase()==='USD') || item.quotes[0]) : null;
    const current = Number(usd?.price);
    const pct24h = Number(usd?.percent_change_24h);
    if (!Number.isFinite(current)) throw new Error('CMC no current price');

    const firstLaunch = launchQuotes.find(q => quoteClose(q) != null);
    const anchors = {
      d5: nearestClose(recent, t5d),
      m1: nearestClose(recent, t1m),
      m6: nearestClose(recent, t6m),
      ytd: nearestClose(recent, ytd),
      y1: nearestClose(recent, t1y),
      y5: p5y,
      y10: p10y,
      all: quoteClose(firstLaunch)
    };

    const values = {
      day1: Number.isFinite(pct24h) ? pct24h : null,
      day5: pct(anchors.d5, current),
      month1: pct(anchors.m1, current),
      month6: pct(anchors.m6, current),
      ytd: pct(anchors.ytd, current),
      year1: pct(anchors.y1, current),
      year5: pct(anchors.y5, current),
      year10: pct(anchors.y10, current),
      all: pct(anchors.all, current)
    };

    res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=900');
    res.setHeader('Content-Type','application/json; charset=utf-8');
    return res.status(200).json({symbol:'BTCUSD',source:'COINMARKETCAP',price:current,values,anchors,time:Date.now()});
  } catch (error) {
    return res.status(502).json({error:'crypto performance unavailable',detail:String(error?.message||error)});
  }
}
