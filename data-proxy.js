(() => {
  const nativeFetch = window.fetch.bind(window);
  const yahooPattern = /https:\/\/query1\.finance\.yahoo\.com\/v8\/finance\/chart\/([^?]+)/i;
  const VERCEL_PROXY = 'https://stock-monitor-umber.vercel.app';

  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';

    if (url.includes('stockMonitorLive=1')) return nativeFetch(input, init);

    const match = url.match(yahooPattern);
    if (!match) return nativeFetch(input, init);

    const symbol = decodeURIComponent(match[1]).toUpperCase();
    const localUrl = new URL(`./market-data/${encodeURIComponent(symbol)}.json?v=${Date.now()}`, window.location.href);

    try {
      const local = await nativeFetch(localUrl, { cache: 'no-store' });
      if (local.ok) return local;
    } catch (_) {}

    try {
      const original = new URL(url);
      const requestedRange = original.searchParams.get('range') || 'max';
      const interval = original.searchParams.get('interval') || '1d';
      const range = requestedRange === '2y' && interval === '1d' ? 'max' : requestedRange;
      const proxyUrl = `${VERCEL_PROXY}/api/history?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}&_=${Date.now()}`;
      const proxied = await nativeFetch(proxyUrl, { cache: 'no-store', mode: 'cors' });
      if (proxied.ok) return proxied;
    } catch (_) {}

    return nativeFetch(input, init);
  };
})();
