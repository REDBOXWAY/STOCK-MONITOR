(() => {
  const REFRESH_MS = 5000;
  let liveRefreshBusy = false;
  let liveRefreshTimer = null;

  function finite(value){
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function latestFinite(values){
    if(!Array.isArray(values)) return null;
    for(let i=values.length-1;i>=0;i--){
      if(Number.isFinite(values[i])) return values[i];
    }
    return null;
  }

  function buildQuote(price, change, pct, previousClose){
    const p = finite(price);
    let c = finite(change);
    let pc = finite(pct);
    const prev = finite(previousClose);
    if(p == null) return null;
    if(c == null && prev != null) c = p - prev;
    if(pc == null && c != null && prev != null && prev !== 0) pc = 100 * c / prev;
    return {price:p,change:c,pct:pc};
  }

  async function fetchFromSearch(item){
    const raw = String(item.yahoo || item.ticker || '').trim().toUpperCase();
    if(!raw) throw new Error('NO SYMBOL');
    const params = new URLSearchParams({
      q: raw,
      quotesCount: '20',
      newsCount: '0',
      listsCount: '0',
      enableFuzzyQuery: 'false',
      enableNavLinks: 'false',
      _: String(Date.now())
    });
    let lastError = null;
    for(const base of ['https://query2.finance.yahoo.com','https://query1.finance.yahoo.com']){
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4200);
      try{
        const response = await fetch(`${base}/v1/finance/search?${params}`,{cache:'no-store',signal:controller.signal});
        if(!response.ok) throw new Error(`SEARCH QUOTE ${response.status}`);
        const data = await response.json();
        const quote = (data?.quotes || []).find(q => String(q?.symbol || '').toUpperCase() === raw);
        if(!quote) throw new Error('SYMBOL NOT IN SEARCH');
        const result = buildQuote(
          quote.regularMarketPrice,
          quote.regularMarketChange,
          quote.regularMarketChangePercent,
          quote.regularMarketPreviousClose ?? quote.previousClose
        );
        if(result) return result;
        throw new Error('SEARCH HAS NO PRICE');
      }catch(error){
        lastError = error;
      }finally{
        clearTimeout(timeout);
      }
    }
    throw lastError || new Error('SEARCH QUOTE FAILED');
  }

  async function fetchFromChart(item){
    const symbol = encodeURIComponent(item.yahoo || item.ticker);
    const stamp = Date.now();
    const path = `/v8/finance/chart/${symbol}?range=1d&interval=1m&includePrePost=true&events=div%2Csplits&stockMonitorLive=1&_=${stamp}`;
    let lastError = null;
    for(const base of ['https://query2.finance.yahoo.com','https://query1.finance.yahoo.com']){
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4200);
      try{
        const response = await fetch(`${base}${path}`,{cache:'no-store',signal:controller.signal});
        if(!response.ok) throw new Error(`LIVE QUOTE ${response.status}`);
        const data = await response.json();
        const result = data?.chart?.result?.[0];
        if(!result) throw new Error('NO LIVE QUOTE');
        const meta = result.meta || {};
        const latestClose = latestFinite(result?.indicators?.quote?.[0]?.close || []);
        const quote = buildQuote(
          Number.isFinite(meta.regularMarketPrice) ? meta.regularMarketPrice : latestClose,
          null,
          null,
          Number.isFinite(meta.chartPreviousClose) ? meta.chartPreviousClose : meta.previousClose
        );
        if(quote) return quote;
        throw new Error('NO LIVE PRICE');
      }catch(error){
        lastError = error;
      }finally{
        clearTimeout(timeout);
      }
    }
    throw lastError || new Error('CHART QUOTE FAILED');
  }

  async function fetchLiveQuote(item){
    try{
      return await fetchFromSearch(item);
    }catch(searchError){
      try{
        return await fetchFromChart(item);
      }catch(chartError){
        throw chartError || searchError;
      }
    }
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

  window.refreshLiveQuotesNow = refreshLiveQuotes;

  document.addEventListener('visibilitychange',() => {
    if(!document.hidden) refreshLiveQuotes();
  });

  const rows = document.getElementById('watchRows');
  if(rows && window.MutationObserver){
    let mutationTimer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(mutationTimer);
      mutationTimer = setTimeout(refreshLiveQuotes,80);
    });
    observer.observe(rows,{childList:true,subtree:false});
  }

  startLiveQuotes();
})();
