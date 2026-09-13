(() => {
  const nativeFetch = window.fetch.bind(window);
  const yahooPattern = /https:\/\/query1\.finance\.yahoo\.com\/v8\/finance\/chart\/([^?]+)/i;

  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input?.url || '';

    // Live quote requests must go directly to Yahoo instead of the local daily cache.
    if (url.includes('stockMonitorLive=1')) return nativeFetch(input, init);

    const match = url.match(yahooPattern);
    if (!match) return nativeFetch(input, init);

    const symbol = decodeURIComponent(match[1]).toUpperCase();
    const localUrl = new URL(`./market-data/${encodeURIComponent(symbol)}.json?v=${Date.now()}`, window.location.href);

    try {
      const local = await nativeFetch(localUrl, { cache: 'no-store' });
      if (local.ok) return local;
    } catch (_) {}

    return nativeFetch(input, init);
  };
})();
