(() => {
  const REFRESH_MS = 5000;
  let liveRefreshBusy = false;
  let liveRefreshTimer = null;

  function finite(value){
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function parseNumber(value){
    if(value == null) return null;
    const cleaned = String(value).replace(/[$,%\s]/g,'').replace(/,/g,'');
    if(!cleaned || cleaned === '—' || cleaned === '--' || /^N\/?A$/i.test(cleaned)) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  function latestFinite(values){
    if(!Array.isArray(values)) return null;
    for(let i=values.length-1;i>=0;i--){
      const n = finite(values[i]);
      if(n != null) return n;
    }
    return null;
  }

  function previousFinite(values){
    if(!Array.isArray(values)) return null;
    let seen = 0;
    for(let i=values.length-1;i>=0;i--){
      const n = finite(values[i]);
      if(n == null) continue;
      seen++;
      if(seen === 2) return n;
    }
    return null;
  }

  function buildQuote(price, change, pct, previousClose, source='LIVE'){
    const p = finite(price);
    let c = finite(change);
    let pc = finite(pct);
    const prev = finite(previousClose);
    if(p == null) return null;
    if(c == null && prev != null) c = p - prev;
    if(pc == null && c != null && prev != null && prev !== 0) pc = 100 * c / prev;
    return {price:p,change:c,pct:pc,source};
  }

  function isETF(item){
    return String(item?.type || item?.sector || '').toUpperCase().includes('ETF');
  }

  async function fetchFromNasdaq(item){
    const symbol = encodeURIComponent(String(item.yahoo || item.ticker || '').trim().toUpperCase());
    if(!symbol) throw new Error('NO SYMBOL');
    const assetClasses = isETF(item) ? ['etf','stocks'] : ['stocks','etf'];
    let lastError = null;

    for(const assetclass of assetClasses){
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4200);
      try{
        const url = `https://api.nasdaq.com/api/quote/${symbol}/info?assetclass=${assetclass}&_=${Date.now()}`;
        const response = await fetch(url,{
          cache:'no-store',
          signal:controller.signal,
          headers:{'Accept':'application/json, text/plain, */*'}
        });
        if(!response.ok) throw new Error(`NASDAQ QUOTE ${response.status}`);
        const data = await response.json();
        const primary = data?.data?.primaryData;
        if(!primary) throw new Error('NASDAQ HAS NO PRIMARY DATA');

        const price = parseNumber(primary.lastSalePrice);
        const change = parseNumber(primary.netChange);
        const pct = parseNumber(primary.percentageChange);
        const quote = buildQuote(price,change,pct,null,'NASDAQ');
        if(quote) return quote;
        throw new Error('NASDAQ HAS NO PRICE');
      }catch(error){
        lastError = error;
      }finally{
        clearTimeout(timeout);
      }
    }
    throw lastError || new Error('NASDAQ QUOTE FAILED');
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
          quote.regularMarketPreviousClose ?? quote.previousClose,
          'YAHOO'
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
        const closes = result?.indicators?.quote?.[0]?.close || [];
        const latestClose = latestFinite(closes);
        const quote = buildQuote(
          Number.isFinite(meta.regularMarketPrice) ? meta.regularMarketPrice : latestClose,
          null,
          null,
          Number.isFinite(meta.chartPreviousClose) ? meta.chartPreviousClose : meta.previousClose,
          'YAHOO'
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

  async function fetchFromLocal(item){
    const raw = String(item.yahoo || item.ticker || '').trim().toUpperCase();
    if(!raw) throw new Error('NO SYMBOL');
    const url = new URL(`./market-data/${encodeURIComponent(raw)}.json?v=${Date.now()}`,window.location.href);
    const response = await fetch(url,{cache:'no-store'});
    if(!response.ok) throw new Error(`LOCAL QUOTE ${response.status}`);
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    const closes = result?.indicators?.quote?.[0]?.close || [];
    const price = latestFinite(closes);
    const prev = previousFinite(closes);
    const quote = buildQuote(price,null,null,prev,'DELAYED');
    if(!quote) throw new Error('LOCAL HAS NO PRICE');
    return quote;
  }

  async function fetchLiveQuote(item){
    const attempts = [fetchFromNasdaq,fetchFromSearch,fetchFromChart,fetchFromLocal];
    let lastError = null;
    for(const fn of attempts){
      try{
        const quote = await fn(item);
        if(quote) return quote;
      }catch(error){
        lastError = error;
      }
    }
    throw lastError || new Error('ALL QUOTE SOURCES FAILED');
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
        item.quoteSource = q.source || '';
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
