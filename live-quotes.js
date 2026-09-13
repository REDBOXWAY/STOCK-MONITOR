(() => {
  const REFRESH_MS = 5000;
  let liveRefreshBusy = false;
  let liveRefreshTimer = null;

  function latestFinite(values){
    if(!Array.isArray(values)) return null;
    for(let i=values.length-1;i>=0;i--){
      if(Number.isFinite(values[i])) return values[i];
    }
    return null;
  }

  async function fetchLiveQuote(item){
    const symbol = encodeURIComponent(item.yahoo || item.ticker);
    const stamp = Date.now();
    const path = `/v8/finance/chart/${symbol}?range=1d&interval=1m&includePrePost=true&events=div%2Csplits&stockMonitorLive=1&_=${stamp}`;
    const urls = [
      `https://query2.finance.yahoo.com${path}`,
      `https://query1.finance.yahoo.com${path}`
    ];

    let lastError = null;
    for(const url of urls){
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4200);
      try{
        const response = await fetch(url,{cache:'no-store',signal:controller.signal});
        if(!response.ok) throw new Error(`LIVE QUOTE ${response.status}`);
        const data = await response.json();
        const result = data?.chart?.result?.[0];
        if(!result) throw new Error('NO LIVE QUOTE');

        const meta = result.meta || {};
        const closes = result?.indicators?.quote?.[0]?.close || [];
        const latestClose = latestFinite(closes);
        const price = Number.isFinite(meta.regularMarketPrice) ? meta.regularMarketPrice : latestClose;
        const previousClose = Number.isFinite(meta.chartPreviousClose) ? meta.chartPreviousClose :
          Number.isFinite(meta.previousClose) ? meta.previousClose : null;

        if(!Number.isFinite(price)) throw new Error('NO LIVE PRICE');
        const change = Number.isFinite(previousClose) ? price - previousClose : null;
        const pct = Number.isFinite(previousClose) && previousClose !== 0 ? 100 * change / previousClose : null;
        return {price,change,pct};
      }catch(error){
        lastError = error;
      }finally{
        clearTimeout(timeout);
      }
    }
    throw lastError || new Error('LIVE QUOTE FAILED');
  }

  async function refreshLiveQuotes(){
    if(liveRefreshBusy || document.hidden || !Array.isArray(watchlist) || !watchlist.length) return;
    liveRefreshBusy = true;
    try{
      const snapshot = [...watchlist];
      const results = await Promise.allSettled(snapshot.map(fetchLiveQuote));
      let changed = false;

      results.forEach((result,index) => {
        if(result.status !== 'fulfilled') return;
        const source = snapshot[index];
        const item = watchlist.find(x => x.ticker === source.ticker);
        if(!item) return;
        const q = result.value;
        item.last = q.price;
        if(Number.isFinite(q.change)) item.change = q.change;
        if(Number.isFinite(q.pct)) item.pct = q.pct;
        changed = true;
      });

      if(changed){
        persist();
        renderWatchlist();
        const current = selected();
        if(current) renderHero(current);
      }
    }catch(error){
      console.warn('LIVE QUOTE REFRESH FAILED',error);
    }finally{
      liveRefreshBusy = false;
    }
  }

  function startLiveQuotes(){
    if(liveRefreshTimer) clearInterval(liveRefreshTimer);
    refreshLiveQuotes();
    liveRefreshTimer = setInterval(refreshLiveQuotes,REFRESH_MS);
  }

  document.addEventListener('visibilitychange',() => {
    if(!document.hidden) refreshLiveQuotes();
  });

  startLiveQuotes();
})();
