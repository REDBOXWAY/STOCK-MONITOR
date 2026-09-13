(() => {
  const VERCEL_PROXY = 'https://stock-monitor-umber.vercel.app';
  const PROXY_BASE = location.hostname.endsWith('.vercel.app') ? '' : VERCEL_PROXY;
  const cryptoPerfCache = new Map();

  function percentChange(from, to) {
    if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
    return 100 * (to / from - 1);
  }

  function normalized(item) {
    return String(item?.ticker || item?.yahoo || '').toUpperCase().replace(/[^A-Z0-9]/g,'');
  }

  function isBitcoin(item) {
    return normalized(item) === 'BTCUSD';
  }

  function candleNearYearsAgo(candles, years) {
    if (!candles?.length) return null;
    const last = candles[candles.length - 1];
    const lastDate = new Date(last.time * 1000);
    const target = new Date(Date.UTC(lastDate.getUTCFullYear() - years,lastDate.getUTCMonth(),lastDate.getUTCDate()));
    const targetTs = Math.floor(target.getTime() / 1000);
    const firstTs = candles[0].time;
    if (firstTs > targetTs + 45 * 86400) return null;
    let best = candles[0], bestDistance = Math.abs(best.time - targetTs);
    for (const candle of candles) {
      const distance = Math.abs(candle.time - targetTs);
      if (distance < bestDistance) { best = candle; bestDistance = distance; }
      if (candle.time > targetTs && distance > bestDistance) break;
    }
    return best;
  }

  function paint(values) {
    const rows = [
      ['1 DAY', values.day1],
      ['5 DAYS', values.day5],
      ['1 MONTH', values.month1],
      ['6 MONTHS', values.month6],
      ['YEAR TO DATE', values.ytd],
      ['1 YEAR', values.year1],
      ['5 YEARS', values.year5],
      ['10 YEARS', values.year10],
      ['ALL TIME', values.all]
    ];
    const host = document.getElementById('performanceRows');
    if (!host) return;
    host.innerHTML = rows.map(([label, value]) =>
      `<div class="perf-row"><span>${label}</span><strong class="${value == null ? 'muted' : value >= 0 ? 'up' : 'down'}">${value == null ? '—' : `${value >= 0 ? '+' : ''}${Number(value).toFixed(2)}%`}</strong></div>`
    ).join('');
  }

  async function loadBitcoinPerformance() {
    const key = 'BTCUSD';
    const cached = cryptoPerfCache.get(key);
    if (cached && Date.now() - cached.time < 300000) return cached.data;
    const r = await fetch(`${PROXY_BASE}/api/crypto-performance?symbol=BTCUSD&_=${Date.now()}`, {cache:'no-store',mode:'cors'});
    if (!r.ok) throw new Error(`CMC PERFORMANCE ${r.status}`);
    const data = await r.json();
    cryptoPerfCache.set(key,{time:Date.now(),data});
    return data;
  }

  window.renderPerformance = function(candles) {
    const current = typeof selected === 'function' ? selected() : null;

    if (isBitcoin(current)) {
      const ticker = current?.ticker;
      loadBitcoinPerformance().then(data => {
        if (typeof selected === 'function' && selected()?.ticker !== ticker) return;
        if (data?.values) paint(data.values);
      }).catch(err => console.error('COINMARKETCAP PERFORMANCE UNAVAILABLE', err));
      return;
    }

    if (!candles?.length) return;
    const last = candles[candles.length - 1];
    const lastClose = last.close;
    const pctBySessions = n => candles.length > n ? percentChange(candles[candles.length - 1 - n].close, lastClose) : null;
    const lastYear = new Date(last.time * 1000).getUTCFullYear();
    const ytdStart = candles.find(c => new Date(c.time * 1000).getUTCFullYear() === lastYear);
    const c5 = candleNearYearsAgo(candles, 5);
    const c10 = candleNearYearsAgo(candles, 10);
    const first = candles[0];

    paint({
      day1:pctBySessions(1),
      day5:pctBySessions(5),
      month1:pctBySessions(21),
      month6:pctBySessions(126),
      ytd:ytdStart ? percentChange(ytdStart.close,lastClose) : null,
      year1:pctBySessions(252),
      year5:c5 ? percentChange(c5.close,lastClose) : null,
      year10:c10 ? percentChange(c10.close,lastClose) : null,
      all:first ? percentChange(first.close,lastClose) : null
    });
  };
})();
