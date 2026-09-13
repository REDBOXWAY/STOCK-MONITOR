(() => {
  const input = document.getElementById('symbolInput');
  const addBtn = document.getElementById('addBtn');
  const box = input?.closest('.search-box');
  if (!input || !addBtn || !box) return;

  const dropdown = document.createElement('div');
  dropdown.className = 'ticker-suggestions';
  dropdown.setAttribute('role','listbox');
  box.appendChild(dropdown);

  const LOCAL = [
    ['SPY','SPDR S&P 500 ETF Trust','NYSE ARCA','ETF'],
    ['VOO','Vanguard S&P 500 ETF','NYSE ARCA','ETF'],
    ['IVV','iShares Core S&P 500 ETF','NYSE ARCA','ETF'],
    ['SPLG','SPDR Portfolio S&P 500 ETF','NYSE ARCA','ETF'],
    ['QQQ','Invesco QQQ Trust','NASDAQ','ETF'],
    ['QQQM','Invesco NASDAQ 100 ETF','NASDAQ','ETF'],
    ['VTI','Vanguard Total Stock Market ETF','NYSE ARCA','ETF'],
    ['VT','Vanguard Total World Stock ETF','NYSE ARCA','ETF'],
    ['VXUS','Vanguard Total International Stock ETF','NASDAQ','ETF'],
    ['VEA','Vanguard FTSE Developed Markets ETF','NYSE ARCA','ETF'],
    ['VWO','Vanguard FTSE Emerging Markets ETF','NYSE ARCA','ETF'],
    ['EFA','iShares MSCI EAFE ETF','NYSE ARCA','ETF'],
    ['EEM','iShares MSCI Emerging Markets ETF','NYSE ARCA','ETF'],
    ['IWM','iShares Russell 2000 ETF','NYSE ARCA','ETF'],
    ['DIA','SPDR Dow Jones Industrial Average ETF Trust','NYSE ARCA','ETF'],
    ['SCHD','Schwab U.S. Dividend Equity ETF','NYSE ARCA','ETF'],
    ['VIG','Vanguard Dividend Appreciation ETF','NYSE ARCA','ETF'],
    ['VYM','Vanguard High Dividend Yield ETF','NYSE ARCA','ETF'],
    ['DGRO','iShares Core Dividend Growth ETF','NYSE ARCA','ETF'],
    ['JEPI','JPMorgan Equity Premium Income ETF','NYSE ARCA','ETF'],
    ['JEPQ','JPMorgan Nasdaq Equity Premium Income ETF','NASDAQ','ETF'],
    ['VUG','Vanguard Growth ETF','NYSE ARCA','ETF'],
    ['VTV','Vanguard Value ETF','NYSE ARCA','ETF'],
    ['IWF','iShares Russell 1000 Growth ETF','NYSE ARCA','ETF'],
    ['IWD','iShares Russell 1000 Value ETF','NYSE ARCA','ETF'],
    ['XLK','Technology Select Sector SPDR Fund','NYSE ARCA','ETF'],
    ['XLF','Financial Select Sector SPDR Fund','NYSE ARCA','ETF'],
    ['XLE','Energy Select Sector SPDR Fund','NYSE ARCA','ETF'],
    ['XLV','Health Care Select Sector SPDR Fund','NYSE ARCA','ETF'],
    ['XLI','Industrial Select Sector SPDR Fund','NYSE ARCA','ETF'],
    ['XLY','Consumer Discretionary Select Sector SPDR Fund','NYSE ARCA','ETF'],
    ['XLP','Consumer Staples Select Sector SPDR Fund','NYSE ARCA','ETF'],
    ['XLU','Utilities Select Sector SPDR Fund','NYSE ARCA','ETF'],
    ['XLB','Materials Select Sector SPDR Fund','NYSE ARCA','ETF'],
    ['XLRE','Real Estate Select Sector SPDR Fund','NYSE ARCA','ETF'],
    ['XLC','Communication Services Select Sector SPDR Fund','NYSE ARCA','ETF'],
    ['SOXX','iShares Semiconductor ETF','NASDAQ','ETF'],
    ['SMH','VanEck Semiconductor ETF','NASDAQ','ETF'],
    ['XSD','SPDR S&P Semiconductor ETF','NYSE ARCA','ETF'],
    ['IGV','iShares Expanded Tech-Software Sector ETF','CBOE','ETF'],
    ['ARKK','ARK Innovation ETF','NYSE ARCA','ETF'],
    ['ARKQ','ARK Autonomous Technology & Robotics ETF','CBOE','ETF'],
    ['ARKG','ARK Genomic Revolution ETF','CBOE','ETF'],
    ['ARKF','ARK Fintech Innovation ETF','NYSE ARCA','ETF'],
    ['XBI','SPDR S&P Biotech ETF','NYSE ARCA','ETF'],
    ['IBB','iShares Biotechnology ETF','NASDAQ','ETF'],
    ['KRE','SPDR S&P Regional Banking ETF','NYSE ARCA','ETF'],
    ['KWEB','KraneShares CSI China Internet ETF','NYSE ARCA','ETF'],
    ['GLD','SPDR Gold Shares','NYSE ARCA','ETF'],
    ['IAU','iShares Gold Trust','NYSE ARCA','ETF'],
    ['SLV','iShares Silver Trust','NYSE ARCA','ETF'],
    ['GDX','VanEck Gold Miners ETF','NYSE ARCA','ETF'],
    ['GDXJ','VanEck Junior Gold Miners ETF','NYSE ARCA','ETF'],
    ['USO','United States Oil Fund','NYSE ARCA','ETF'],
    ['UNG','United States Natural Gas Fund','NYSE ARCA','ETF'],
    ['TLT','iShares 20+ Year Treasury Bond ETF','NASDAQ','ETF'],
    ['IEF','iShares 7-10 Year Treasury Bond ETF','NASDAQ','ETF'],
    ['SHY','iShares 1-3 Year Treasury Bond ETF','NASDAQ','ETF'],
    ['BND','Vanguard Total Bond Market ETF','NASDAQ','ETF'],
    ['AGG','iShares Core U.S. Aggregate Bond ETF','NYSE ARCA','ETF'],
    ['LQD','iShares iBoxx $ Investment Grade Corporate Bond ETF','NYSE ARCA','ETF'],
    ['HYG','iShares iBoxx $ High Yield Corporate Bond ETF','NYSE ARCA','ETF'],
    ['TIP','iShares TIPS Bond ETF','NYSE ARCA','ETF'],
    ['TQQQ','ProShares UltraPro QQQ','NASDAQ','ETF'],
    ['SQQQ','ProShares UltraPro Short QQQ','NASDAQ','ETF'],
    ['UPRO','ProShares UltraPro S&P500','NYSE ARCA','ETF'],
    ['SPXL','Direxion Daily S&P 500 Bull 3X Shares','NYSE ARCA','ETF'],
    ['SPXS','Direxion Daily S&P 500 Bear 3X Shares','NYSE ARCA','ETF'],
    ['SOXL','Direxion Daily Semiconductor Bull 3X Shares','NYSE ARCA','ETF'],
    ['SOXS','Direxion Daily Semiconductor Bear 3X Shares','NYSE ARCA','ETF'],
    ['BITO','ProShares Bitcoin ETF','NYSE ARCA','ETF'],
    ['IBIT','iShares Bitcoin Trust ETF','NASDAQ','ETF'],
    ['FBTC','Fidelity Wise Origin Bitcoin Fund','CBOE','ETF'],
    ['ARKB','ARK 21Shares Bitcoin ETF','CBOE','ETF'],
    ['GBTC','Grayscale Bitcoin Trust ETF','NYSE ARCA','ETF'],
    ['ETHA','iShares Ethereum Trust ETF','NASDAQ','ETF'],
    ['ETHE','Grayscale Ethereum Trust ETF','NYSE ARCA','ETF'],
    ['AAPL','Apple Inc.','NASDAQ','STOCK'],
    ['MSFT','Microsoft Corporation','NASDAQ','STOCK'],
    ['NVDA','NVIDIA Corporation','NASDAQ','STOCK'],
    ['GOOGL','Alphabet Inc.','NASDAQ','STOCK'],
    ['AMZN','Amazon.com, Inc.','NASDAQ','STOCK'],
    ['META','Meta Platforms, Inc.','NASDAQ','STOCK'],
    ['TSLA','Tesla, Inc.','NASDAQ','STOCK'],
    ['AMD','Advanced Micro Devices, Inc.','NASDAQ','STOCK'],
    ['AVGO','Broadcom Inc.','NASDAQ','STOCK'],
    ['MU','Micron Technology, Inc.','NASDAQ','STOCK'],
    ['ASML','ASML Holding N.V.','NASDAQ','STOCK'],
    ['LRCX','Lam Research Corporation','NASDAQ','STOCK'],
    ['AMAT','Applied Materials, Inc.','NASDAQ','STOCK'],
    ['KLAC','KLA Corporation','NASDAQ','STOCK'],
    ['PLTR','Palantir Technologies Inc.','NASDAQ','STOCK'],
    ['MSTR','Strategy Inc.','NASDAQ','STOCK'],
    ['ANET','Arista Networks, Inc.','NYSE','STOCK'],
    ['CAT','Caterpillar Inc.','NYSE','STOCK'],
    ['RTX','RTX Corporation','NYSE','STOCK'],
    ['CME','CME Group Inc.','NASDAQ','STOCK'],
    ['ICE','Intercontinental Exchange, Inc.','NYSE','STOCK'],
    ['CBOE','Cboe Global Markets, Inc.','CBOE','STOCK']
  ].map(([ticker,name,exchange,type]) => ({
    ticker,
    yahoo:ticker,
    name,
    exchange,
    type,
    sector:type === 'ETF' ? 'ETF' : '—',
    industry:'—',
    tv:`${tvExchange(exchange)}:${ticker}`,
    domain:''
  }));

  let results = [];
  let activeIndex = -1;
  let selectedCandidate = null;
  let debounceTimer = null;
  let requestId = 0;
  let searchController = null;

  function queryText(value){ return String(value || '').trim(); }
  function cleanSymbol(value){ return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9.^=\-]/g,''); }
  function esc(value){
    return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function normalizeExchange(q){
    const raw = String(q.exchDisp || q.fullExchangeName || q.exchangeName || q.exchange || '').toUpperCase();
    if (raw.includes('NASDAQ') || ['NMS','NGM','NCM'].includes(raw)) return 'NASDAQ';
    if (raw.includes('NYSE ARCA') || raw.includes('NYSEARCA') || raw === 'PCX') return 'NYSE ARCA';
    if (raw.includes('NYSE') || raw === 'NYQ') return 'NYSE';
    if (raw.includes('AMEX') || raw === 'ASE') return 'AMEX';
    if (raw.includes('CBOE')) return 'CBOE';
    return q.exchDisp || q.fullExchangeName || q.exchangeName || q.exchange || '—';
  }
  function tvExchange(exchange){
    const e = String(exchange || '').toUpperCase();
    if (e.includes('NASDAQ')) return 'NASDAQ';
    if (e.includes('NYSE ARCA')) return 'AMEX';
    if (e.includes('NYSE')) return 'NYSE';
    if (e.includes('AMEX')) return 'AMEX';
    if (e.includes('CBOE')) return 'CBOE';
    return 'NASDAQ';
  }
  function normalizeType(value){
    const raw = String(value || '').toUpperCase();
    if (raw === 'ETF' || raw.includes('ETF')) return 'ETF';
    if (raw === 'EQUITY' || raw.includes('EQUITY') || raw.includes('STOCK')) return 'STOCK';
    if (raw.includes('MUTUAL')) return 'MUTUAL FUND';
    if (raw.includes('INDEX')) return 'INDEX';
    if (raw.includes('CRYPTO')) return 'CRYPTO';
    if (raw.includes('FUTURE')) return 'FUTURE';
    if (raw.includes('CURRENCY')) return 'CURRENCY';
    return value || '';
  }
  function normalizeQuote(q){
    const symbol = cleanSymbol(q.symbol);
    if (!symbol) return null;
    const exchange = normalizeExchange(q);
    const name = q.longname || q.shortname || q.displayName || q.longName || q.shortName || symbol;
    const type = normalizeType(q.typeDisp || q.quoteType || q.instrumentType || '');
    return {ticker:symbol,yahoo:symbol,name,exchange,type,sector:q.sectorDisp || q.sector || (type === 'ETF' ? 'ETF' : '—'),industry:q.industryDisp || q.industry || '—',tv:`${tvExchange(exchange)}:${symbol}`,domain:''};
  }
  function localSearch(query){
    const q = queryText(query).toUpperCase();
    const symbolQ = cleanSymbol(q);
    if (!q) return [];
    return LOCAL.map(item => {
      const ticker = item.ticker.toUpperCase();
      const name = item.name.toUpperCase();
      let rank = 99;
      if (ticker === symbolQ) rank = 0;
      else if (ticker.startsWith(symbolQ)) rank = 1;
      else if (ticker.includes(symbolQ)) rank = 2;
      else if (name.startsWith(q)) rank = 3;
      else if (name.includes(q)) rank = 4;
      return {item,rank};
    }).filter(x=>x.rank<99).sort((a,b)=>a.rank-b.rank || a.item.ticker.localeCompare(b.item.ticker)).map(x=>x.item);
  }
  function closeDropdown(){ dropdown.classList.remove('open'); activeIndex = -1; }
  function setCandidate(item){ selectedCandidate = item || null; if (item) input.value = item.ticker; closeDropdown(); input.focus(); }
  function showMessage(message){ results=[]; activeIndex=-1; dropdown.innerHTML=`<div class="ticker-suggestions-empty">${esc(message)}</div>`; dropdown.classList.add('open'); }
  function renderResults(items){
    results = items.slice(0,20);
    activeIndex = results.length ? 0 : -1;
    if (!results.length){ showMessage('NO MATCHING TICKERS'); return; }
    dropdown.innerHTML = results.map((item,i)=>`<div class="ticker-suggestion ${i===activeIndex?'active':''}" role="option" data-index="${i}"><div class="ts-symbol">${esc(item.ticker)}</div><div class="ts-name">${esc(item.name)}</div><div class="ts-exchange">${esc(item.exchange)}${item.type?` · ${esc(item.type)}`:''}</div></div>`).join('');
    dropdown.classList.add('open');
    dropdown.querySelectorAll('.ticker-suggestion').forEach(el=>el.addEventListener('mousedown',e=>{e.preventDefault();const item=results[Number(el.dataset.index)];if(item)setCandidate(item);}));
  }
  async function directLookupYahoo(symbol, signal){
    const clean = cleanSymbol(symbol);
    if (!clean || !/^[A-Z0-9.^=\-]{1,15}$/.test(clean)) return null;
    const path = `/v8/finance/chart/${encodeURIComponent(clean)}?range=1d&interval=1d&includePrePost=true&events=div%2Csplits&_=${Date.now()}`;
    for (const base of ['https://query2.finance.yahoo.com','https://query1.finance.yahoo.com']){
      try{
        const response = await fetch(`${base}${path}`,{cache:'no-store',signal});
        if(!response.ok) continue;
        const data = await response.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if(!meta?.symbol) continue;
        return normalizeQuote({symbol:meta.symbol,longName:meta.longName,shortName:meta.shortName,exchangeName:meta.exchangeName,fullExchangeName:meta.fullExchangeName,instrumentType:meta.instrumentType});
      }catch(error){ if(error?.name==='AbortError') throw error; }
    }
    return null;
  }
  async function yahooSearch(query){
    if (searchController) searchController.abort();
    searchController = new AbortController();
    const signal = searchController.signal;
    const params = new URLSearchParams({q:queryText(query),quotesCount:'50',newsCount:'0',listsCount:'0',enableFuzzyQuery:'true',enableNavLinks:'false',_:String(Date.now())});
    for (const base of ['https://query2.finance.yahoo.com','https://query1.finance.yahoo.com']){
      try{
        const response = await fetch(`${base}/v1/finance/search?${params}`,{cache:'no-store',signal});
        if(!response.ok) continue;
        const data = await response.json();
        return (data?.quotes || []).map(normalizeQuote).filter(Boolean);
      }catch(error){ if(error?.name==='AbortError') throw error; }
    }
    return [];
  }
  function mergeResults(local,remote,query){
    const exact = cleanSymbol(query);
    const all = [...local,...remote];
    const seen = new Set();
    const unique = all.filter(item=>{const key=`${item.ticker}|${item.exchange}`;if(seen.has(key))return false;seen.add(key);return true;});
    unique.sort((a,b)=>{
      const rank = item => item.ticker===exact?0:item.ticker.startsWith(exact)?1:item.type==='ETF'?2:3;
      return rank(a)-rank(b) || a.ticker.localeCompare(b.ticker);
    });
    if(exact && /^[A-Z0-9.^=\-]{1,15}$/.test(exact) && !unique.some(x=>x.ticker===exact)){
      unique.unshift({ticker:exact,yahoo:exact,name:`USE SYMBOL ${exact}`,exchange:'AUTO',type:'SYMBOL',sector:'—',industry:'—',tv:`NASDAQ:${exact}`,domain:''});
    }
    return unique.slice(0,20);
  }
  async function runSearch(){
    const q = queryText(input.value);
    const id = ++requestId;
    selectedCandidate = null;
    if(!q){dropdown.innerHTML='';closeDropdown();return;}
    const local = localSearch(q);
    if(local.length) renderResults(local);
    else showMessage('SEARCHING...');
    try{
      const remote = await yahooSearch(q);
      if(id!==requestId) return;
      renderResults(mergeResults(local,remote,q));
    }catch(error){
      if(error?.name==='AbortError'||id!==requestId) return;
      renderResults(mergeResults(local,[],q));
    }
  }
  function scheduleSearch(){ clearTimeout(debounceTimer); debounceTimer=setTimeout(runSearch,180); }
  function refreshActive(){ dropdown.querySelectorAll('.ticker-suggestion').forEach((el,i)=>{el.classList.toggle('active',i===activeIndex);if(i===activeIndex)el.scrollIntoView({block:'nearest'});}); }
  input.addEventListener('input',scheduleSearch);
  input.addEventListener('focus',()=>{if(queryText(input.value))scheduleSearch();});
  input.addEventListener('keydown',event=>{
    if(event.key==='ArrowDown'&&results.length){event.preventDefault();activeIndex=(activeIndex+1)%results.length;refreshActive();return;}
    if(event.key==='ArrowUp'&&results.length){event.preventDefault();activeIndex=(activeIndex-1+results.length)%results.length;refreshActive();return;}
    if(event.key==='Enter'){event.preventDefault();event.stopImmediatePropagation();if(dropdown.classList.contains('open')&&results.length)setCandidate(results[Math.max(0,activeIndex)]);return;}
    if(event.key==='Escape') closeDropdown();
  },true);
  document.addEventListener('mousedown',event=>{if(!box.contains(event.target))closeDropdown();});
  addBtn.addEventListener('click',async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    const raw=cleanSymbol(input.value);if(!raw)return;
    let candidate=selectedCandidate?.ticker===raw?selectedCandidate:LOCAL.find(x=>x.ticker===raw)||null;
    if(!candidate){
      showMessage('VERIFYING...');
      try{candidate=await directLookupYahoo(raw,new AbortController().signal);}catch(_){}
    }
    if(!candidate){
      candidate={ticker:raw,yahoo:raw,name:raw,exchange:'AUTO',type:'SYMBOL',sector:'—',industry:'—',tv:`NASDAQ:${raw}`,domain:''};
    }
    if(watchlist.some(x=>x.ticker===raw)){
      selectedTicker=raw;input.value='';selectedCandidate=null;closeDropdown();renderAll();return;
    }
    watchlist.unshift({ticker:candidate.ticker,yahoo:candidate.yahoo||candidate.ticker,tv:candidate.tv,name:candidate.name||candidate.ticker,exchange:candidate.exchange||'—',sector:candidate.sector||(candidate.type==='ETF'?'ETF':'—'),industry:candidate.industry||'—',type:candidate.type||'',domain:candidate.domain||'',last:null,change:null,pct:null});
    selectedTicker=candidate.ticker;persist();input.value='';selectedCandidate=null;closeDropdown();renderAll();
  },true);
})();
