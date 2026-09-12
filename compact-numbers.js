(() => {
  function compactNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';

    const abs = Math.abs(n);
    const format = (divisor, suffix) => {
      const scaled = n / divisor;
      const decimals = Math.abs(scaled) < 100 && Math.abs(scaled % 1) > 0.0001 ? 1 : 0;
      return `${scaled.toFixed(decimals)} ${suffix}`;
    };

    if (abs >= 1_000_000_000) return format(1_000_000_000, 'BLN');
    if (abs >= 1_000_000) return format(1_000_000, 'MLN');
    if (abs >= 1_000) return format(1_000, 'K');
    return Math.round(n).toLocaleString('en-US');
  }

  function formatPE(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n.toFixed(1) : '—';
  }

  const fundamentalsCache = new Map();

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

  window.compactNumber = compactNumber;

  window.renderMetricsFromCandles = function(candles) {
    if (!candles?.length) return;

    const last = candles[candles.length - 1];
    const last252 = candles.slice(-252);
    const high52 = Math.max(...last252.map(x => x.high));
    const low52 = Math.min(...last252.map(x => x.low));
    const ticker = typeof selected === 'function' ? selected()?.ticker : null;

    const render = (fundamentals = null) => {
      const marketCap = fundamentals?.marketCap;
      const peRatio = fundamentals?.peRatio;
      const values = [
        ['OPEN', fmtPrice(last.open)],
        ['HIGH', fmtPrice(last.high)],
        ['LOW', fmtPrice(last.low)],
        ['VOLUME', compactNumber(last.volume)],
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

    if (ticker) {
      loadFundamentals(ticker)
        .then(fundamentals => {
          if (typeof selected === 'function' && selected()?.ticker !== ticker) return;
          render(fundamentals);
        })
        .catch(err => console.error('FUNDAMENTALS UNAVAILABLE', err));
    }
  };
})();
