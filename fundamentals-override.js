(() => {
  const previousRenderMetrics = window.renderMetricsFromCandles;
  const cache = new Map();

  function normalizedSymbol(item) {
    return String(item?.yahoo || item?.ticker || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  }

  function isCryptoItem(item) {
    const type = String(item?.type || '').toUpperCase();
    const symbol = normalizedSymbol(item);
    return type === 'CRYPTO' || symbol === 'BTCUSD' || symbol === 'ETHUSD';
  }

  async function loadFundamentals(ticker) {
    if (!ticker) return null;
    if (cache.has(ticker)) return cache.get(ticker);

    const promise = (async () => {
      try {
        const r = await fetch(`./market-data/${encodeURIComponent(ticker)}.json?v=${Date.now()}`, { cache: 'no-store' });
        if (r.ok) {
          const payload = await r.json();
          if (payload?.fundamentals?.marketCap || payload?.fundamentals?.peRatio) return payload.fundamentals;
        }
      } catch (_) {}

      const r = await fetch(`./market-data/fundamentals.json?v=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) return null;
      const table = await r.json();
      return table?.[ticker] || null;
    })();

    cache.set(ticker, promise);
    return promise;
  }

  window.renderMetricsFromCandles = function(candles) {
    if (!candles?.length) return;

    const current = typeof selected === 'function' ? selected() : null;

    // Crypto metrics (BTCUSD / ETHUSD) must stay on the CoinMarketCap renderer
    // defined by compact-numbers.js. Do not overwrite MARKET CAP / VOLUME 24H.
    if (isCryptoItem(current) && typeof previousRenderMetrics === 'function') {
      return previousRenderMetrics(candles);
    }

    const last = candles[candles.length - 1];
    const last252 = candles.slice(-252);
    const high52 = Math.max(...last252.map(x => x.high));
    const low52 = Math.min(...last252.map(x => x.low));
    const ticker = current?.ticker || null;

    const paint = fundamentals => {
      const marketCap = Number(fundamentals?.marketCap);
      const peRatio = Number(fundamentals?.peRatio);
      const values = [
        ['OPEN', fmtPrice(last.open)],
        ['HIGH', fmtPrice(last.high)],
        ['LOW', fmtPrice(last.low)],
        ['VOLUME', typeof compactNumber === 'function' ? compactNumber(last.volume) : String(last.volume ?? '—')],
        ['MARKET CAP', Number.isFinite(marketCap) ? compactNumber(marketCap) : '—'],
        ['P/E', Number.isFinite(peRatio) && peRatio > 0 ? peRatio.toFixed(1) : '—'],
        ['52W HIGH', fmtPrice(high52)],
        ['52W LOW', fmtPrice(low52)]
      ];

      document.getElementById('metrics').innerHTML = values.map(([label, value]) =>
        `<div class="metric"><div class="metric-label">${label}</div><div class="metric-value">${value}</div></div>`
      ).join('');
    };

    paint(null);
    loadFundamentals(ticker).then(f => {
      if (typeof selected === 'function' && selected()?.ticker !== ticker) return;
      paint(f);
    }).catch(console.error);
  };
})();
