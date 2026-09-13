(() => {
  const nativeFetch = window.fetch.bind(window);
  const yahooPattern = /https:\/\/query1\.finance\.yahoo\.com\/v8\/finance\/chart\/([^?]+)/i;
  const VERCEL_PROXY = 'https://stock-monitor-umber.vercel.app';

  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';

    // Live quote requests use the dedicated live quote logic.
    if (url.includes('stockMonitorLive=1')) return nativeFetch(input, init);

    const match = url.match(yahooPattern);
    if (!match) return nativeFetch(input, init);

    const symbol = decodeURIComponent(match[1]).toUpperCase();
    const localUrl = new URL(`./market-data/${encodeURIComponent(symbol)}.json?v=${Date.now()}`, window.location.href);

    // Use generated local history first when it exists.
    try {
      const local = await nativeFetch(localUrl, { cache: 'no-store' });
      if (local.ok) return local;
    } catch (_) {}

    // If the symbol is not in the local cache (for example GDX), route the
    // Yahoo history request through Vercel so browser CORS cannot block it.
    try {
      const original = new URL(url);
      const range = original.searchParams.get('range') || 'max';
      const interval = original.searchParams.get('interval') || '1d';
      const proxyUrl = `${VERCEL_PROXY}/api/history?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}&_=${Date.now()}`;
      const proxied = await nativeFetch(proxyUrl, { cache: 'no-store', mode: 'cors' });
      if (proxied.ok) return proxied;
    } catch (_) {}

    // Last-resort compatibility fallback.
    return nativeFetch(input, init);
  };
})();
