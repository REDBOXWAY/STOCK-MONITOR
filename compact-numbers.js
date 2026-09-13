(() => {
  const VERCEL_PROXY = 'https://stock-monitor-umber.vercel.app';
  const PROXY_BASE = location.hostname.endsWith('.vercel.app') ? '' : VERCEL_PROXY;

  function compactNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';

    const abs = Math.abs(n);
    const format = (divisor, suffix) => {
      const scaled = n / divisor;
      const decimals = Math.abs(scaled) < 100 && Math.abs(scaled % 1) > 0.0001 ? 1 : 0;
      return `${scaled.toFixed(decimals)} ${suffix}`;
    };

    if (abs >= 1_000_000_000_000) return format(1_000_000_000_000, 'TRL');
    if (abs >= 1_000_000_000) return format(1_000_000_000, 'BLN');
    if (abs >= 1_000_000) return format(1_000_000, 'MLN');
    if (abs >= 1_000) return format(1_000, 'K');
    return Math.round(n).toLocaleString('en-US');
  }

  function formatPE(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n.toFixed(1) : '—';
  }

  function normalizedCryptoSymbol(item){
    return String(item?.yahoo || item?.ticker || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g,'');
  }

  function isCryptoItem(item){
    const type = String(item?.type || '').toUpperCase();
    const symbol = normalizedCryptoSymbol(item);
    return type === 'CRYPTO' || symbol === 'BTCUSD' || symbol === 'ETHUSD';
  }

  const fundamentalsCache = new Map();
  const cryptoCache = new Map();

  async function loadFundamentals(ticker) {
    if (!ticker) return null;
    if (fundamentalsCache.has(ticker)) return fundamentalsCache.get(ticker);

    const promise = (async () => {
      const url = new URL(`./market-data/${encodeURIComponent(ticker)}.json?v=${Date.now()}`, window.location.href);
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`FUNDAMENTALS ${response.status}`);
      const payload = await response.json();
      return payload?.fundamentals || null;
    })();

    fundamentalsCache.set(ticker, promise);
    try {
      return await promise;
    } catch (e) {
      fundamentalsCache.delete(ticker);
      throw e;
    }
  }

  async function loadCryptoMetrics(item){
    const displaySymbol = normalizedCryptoSymbol(item);
    const symbol = displaySymbol === 'BTCUSD' ? 'BTCUSD' : displaySymbol === 'ETHUSD' ? 'ETHUSD' : String(item?.yahoo || item?.ticker || '').toUpperCase();
    if (!symbol) return null;

    const cached = cryptoCache.get(symbol);
    if (cached && Date.now() - cached.time < 55000) return cached.data;

    const response = await fetch(`${PROXY_BASE}/api/crypto?symbol=${encodeURIComponent(symbol)}&_=${Date.now()}`, {
      cache:'no-store',
      mode:'cors'
    });
    if (!response.ok) throw new Error(`CRYPTO METRICS ${response.status}`);
    const data = await response.json();
    cryptoCache.set(symbol,{time:Date.now(),data});
    return data;
  }

  window.compactNumber = compactNumber;

  window.renderMetricsFromCandles = function(candles) {
    if (!candles?.length) return;

    const last = candles[candles.length - 1];
    const last252 = candles.slice(-252);
    const high52 = Math.max(...last252.map(x => x.high));
    const low52 = Math.min(...last252.map(x => x.low));
    const current = typeof selected === 'function' ? selected() : null;
    const ticker = current?.ticker || null;
    const crypto = isCryptoItem(current);

    const render = (extra = null) => {
      const marketCap = extra?.marketCap;
      const peRatio = crypto ? null : extra?.peRatio;
      const volume = crypto && Number.isFinite(Number(extra?.volume24h)) ? extra.volume24h : last.volume;
      const values = [
        ['OPEN', fmtPrice(last.open)],
        ['HIGH', fmtPrice(last.high)],
        ['LOW', fmtPrice(last.low)],
        [crypto ? 'VOLUME 24H' : 'VOLUME', compactNumber(volume)],
        ['MARKET CAP', Number.isFinite(Number(marketCap)) ? compactNumber(marketCap) : '—'],
        ['P/E', formatPE(peRatio)],
        ['52W HIGH', fmtPrice(high52)],
        ['52W LOW', fmtPrice(low52)]
      ];

      document.getElementById('metrics').innerHTML = values.map(([label, value]) =>
        `<div class="metric"><div class="metric-label">${label}</div><div class="metric-value">${value}</div></div>`
      ).join('');
    };

    render();

    if (!ticker) return;

    if (crypto) {
      loadCryptoMetrics(current)
        .then(data => {
          if (typeof selected === 'function' && selected()?.ticker !== ticker) return;
          render(data);
        })
        .catch(err => console.error('COINMARKETCAP METRICS UNAVAILABLE', err));
      return;
    }

    loadFundamentals(ticker)
      .then(fundamentals => {
        if (typeof selected === 'function' && selected()?.ticker !== ticker) return;
        render(fundamentals);
      })
      .catch(err => console.error('FUNDAMENTALS UNAVAILABLE', err));
  };
})();
