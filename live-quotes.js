(() => {
  const REFRESH_MS = 5000;
  let busy = false;
  let timer = null;

  function finite(v){
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  async function fetchProxyQuote(item){
    const symbol = encodeURIComponent(item.yahoo || item.ticker);
    const response = await fetch(`/api/quote?symbol=${symbol}&_=${Date.now()}`, { cache:'no-store' });
    if(!response.ok) throw new Error(`PROXY ${response.status}`);
    const data = await response.json();
    const price = finite(data.price);
    if(price == null) throw new Error('PROXY NO PRICE');
    return { price, change:finite(data.change), pct:finite(data.pct) };
  }

  async function fetchDirectYahoo(item){
    const symbol = encodeURIComponent(item.yahoo || item.ticker);
    let lastError = null;
    for(const base of ['https://query2.finance.yahoo.com','https://query1.finance.yahoo.com']){
      try{
        const response = await fetch(`${base}/v8/finance/chart/${symbol}?range=1d&interval=1m&includePrePost=true&stockMonitorLive=1&_=${Date.now()}`, { cache:'no-store' });
        if(!response.ok) throw new Error(`YAHOO ${response.status}`);
        const data = await response.json();
        const result = data?.chart?.result?.[0];
        if(!result) throw new Error('NO RESULT');
        const meta = result.meta || {};
        const closes = result?.indicators?.quote?.[0]?.close || [];
        let last = null;
        for(let i=closes.length-1;i>=0;i--){ if(Number.isFinite(closes[i])){ last = closes[i]; break; } }
        const price = finite(meta.regularMarketPrice) ?? finite(last);
        const prev = finite(meta.chartPreviousClose) ?? finite(meta.previousClose);
        if(price == null) throw new Error('NO PRICE');
        const change = prev != null ? price-prev : null;
        const pct = prev != null && prev !== 0 ? change/prev*100 : null;
        return {price,change,pct};
      }catch(error){ lastError = error; }
    }
    throw lastError || new Error('DIRECT QUOTE FAILED');
  }

  async function fetchLiveQuote(item){
    try{
      return await fetchProxyQuote(item);
    }catch(proxyError){
      return await fetchDirectYahoo(item);
    }
  }

  async function refreshLiveQuotes(){
    if(busy || document.hidden || !Array.isArray(watchlist) || !watchlist.length) return;
    busy = true;
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
    } finally {
      busy = false;
    }
  }

  function start(){
    refreshLiveQuotes();
    if(timer) clearInterval(timer);
    timer = setInterval(refreshLiveQuotes, REFRESH_MS);
  }

  window.refreshLiveQuotesNow = refreshLiveQuotes;

  document.addEventListener('visibilitychange', () => {
    if(!document.hidden) refreshLiveQuotes();
  });

  const rows = document.getElementById('watchRows');
  if(rows && window.MutationObserver){
    let t = null;
    new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(refreshLiveQuotes,100);
    }).observe(rows,{childList:true});
  }

  start();
})();
