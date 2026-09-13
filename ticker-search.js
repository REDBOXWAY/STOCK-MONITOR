(() => {
  const input = document.getElementById('symbolInput');
  const addBtn = document.getElementById('addBtn');
  const box = input?.closest('.search-box');
  if (!input || !addBtn || !box) return;

  const dropdown = document.createElement('div');
  dropdown.className = 'ticker-suggestions';
  dropdown.setAttribute('role','listbox');
  box.appendChild(dropdown);

  let results = [];
  let activeIndex = -1;
  let selectedCandidate = null;
  let debounceTimer = null;
  let requestId = 0;
  let searchController = null;

  function queryText(value){
    return String(value || '').trim();
  }

  function cleanSymbol(value){
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9.^=\-]/g,'');
  }

  function esc(value){
    return String(value ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  function normalizeExchange(q){
    const raw = String(q.exchDisp || q.exchange || '').toUpperCase();
    if (raw.includes('NASDAQ') || ['NMS','NGM','NCM'].includes(raw)) return 'NASDAQ';
    if (raw.includes('NYSE ARCA') || raw.includes('NYSEARCA') || raw === 'PCX') return 'NYSE ARCA';
    if (raw.includes('NYSE') || raw === 'NYQ') return 'NYSE';
    if (raw.includes('AMEX') || raw === 'ASE') return 'AMEX';
    return q.exchDisp || q.exchange || '—';
  }

  function tvExchange(exchange){
    const e = String(exchange || '').toUpperCase();
    if (e.includes('NASDAQ')) return 'NASDAQ';
    if (e.includes('NYSE ARCA')) return 'AMEX';
    if (e.includes('NYSE')) return 'NYSE';
    if (e.includes('AMEX')) return 'AMEX';
    return 'NASDAQ';
  }

  function normalizeQuote(q){
    const symbol = cleanSymbol(q.symbol);
    if (!symbol) return null;
    const exchange = normalizeExchange(q);
    const name = q.longname || q.shortname || q.displayName || symbol;
    const type = q.typeDisp || q.quoteType || '';
    return {
      ticker: symbol,
      yahoo: symbol,
      name,
      exchange,
      type,
      sector: q.sectorDisp || q.sector || '—',
      industry: q.industryDisp || q.industry || '—',
      tv: `${tvExchange(exchange)}:${symbol}`,
      domain: ''
    };
  }

  function closeDropdown(){
    dropdown.classList.remove('open');
    activeIndex = -1;
  }

  function setCandidate(item){
    selectedCandidate = item || null;
    if (item) input.value = item.ticker;
    closeDropdown();
    input.focus();
  }

  function showMessage(message){
    results = [];
    activeIndex = -1;
    dropdown.innerHTML = `<div class="ticker-suggestions-empty">${esc(message)}</div>`;
    dropdown.classList.add('open');
  }

  function renderResults(items){
    results = items;
    activeIndex = results.length ? 0 : -1;

    if (!results.length){
      showMessage('NO MATCHING TICKERS');
      return;
    }

    dropdown.innerHTML = results.map((item,i) => `
      <div class="ticker-suggestion ${i===activeIndex?'active':''}" role="option" data-index="${i}">
        <div class="ts-symbol">${esc(item.ticker)}</div>
        <div class="ts-name">${esc(item.name)}</div>
        <div class="ts-exchange">${esc(item.exchange)}${item.type ? ` · ${esc(item.type)}` : ''}</div>
      </div>`).join('');
    dropdown.classList.add('open');

    dropdown.querySelectorAll('.ticker-suggestion').forEach(el => {
      el.addEventListener('mousedown', e => {
        e.preventDefault();
        const item = results[Number(el.dataset.index)];
        if (item) setCandidate(item);
      });
    });
  }

  async function searchYahoo(query){
    const q = queryText(query);
    if (!q) return [];

    if (searchController) searchController.abort();
    searchController = new AbortController();
    const signal = searchController.signal;
    const params = new URLSearchParams({
      q,
      quotesCount: '12',
      newsCount: '0',
      listsCount: '0',
      enableFuzzyQuery: 'true',
      quotesQueryId: 'tss_match_phrase_query',
      multiQuoteQueryId: 'multi_quote_single_token_query',
      enableCb: 'false',
      enableNavLinks: 'false',
      enableEnhancedTrivialQuery: 'true',
      _: String(Date.now())
    });

    const urls = [
      `https://query2.finance.yahoo.com/v1/finance/search?${params}`,
      `https://query1.finance.yahoo.com/v1/finance/search?${params}`
    ];

    let lastError = null;
    for (const url of urls){
      try{
        const response = await fetch(url,{cache:'no-store',signal});
        if (!response.ok) throw new Error(`SEARCH ${response.status}`);
        const data = await response.json();
        const seen = new Set();
        const items = (data?.quotes || [])
          .map(normalizeQuote)
          .filter(Boolean)
          .filter(item => {
            if (seen.has(item.ticker)) return false;
            seen.add(item.ticker);
            return true;
          });

        const exact = cleanSymbol(q);
        items.sort((a,b) => {
          const ar = a.ticker === exact ? 0 : a.ticker.startsWith(exact) ? 1 : 2;
          const br = b.ticker === exact ? 0 : b.ticker.startsWith(exact) ? 1 : 2;
          return ar - br || a.ticker.localeCompare(b.ticker);
        });
        return items.slice(0,10);
      }catch(error){
        if (error?.name === 'AbortError') throw error;
        lastError = error;
      }
    }
    throw lastError || new Error('YAHOO SEARCH FAILED');
  }

  async function runSearch(){
    const q = queryText(input.value);
    const id = ++requestId;
    selectedCandidate = null;

    if (!q){
      dropdown.innerHTML = '';
      closeDropdown();
      return;
    }

    showMessage('SEARCHING...');
    try{
      const items = await searchYahoo(q);
      if (id !== requestId) return;
      renderResults(items);
    }catch(error){
      if (error?.name === 'AbortError') return;
      if (id !== requestId) return;
      console.error('YAHOO SYMBOL SEARCH FAILED',error);
      showMessage('SEARCH UNAVAILABLE');
    }
  }

  function scheduleSearch(){
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runSearch,220);
  }

  function refreshActive(){
    dropdown.querySelectorAll('.ticker-suggestion').forEach((el,i) => {
      el.classList.toggle('active', i === activeIndex);
      if (i === activeIndex) el.scrollIntoView({block:'nearest'});
    });
  }

  input.addEventListener('input', scheduleSearch);

  input.addEventListener('focus', () => {
    if (queryText(input.value)) scheduleSearch();
  });

  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' && results.length){
      event.preventDefault();
      activeIndex = (activeIndex + 1) % results.length;
      refreshActive();
      return;
    }
    if (event.key === 'ArrowUp' && results.length){
      event.preventDefault();
      activeIndex = (activeIndex - 1 + results.length) % results.length;
      refreshActive();
      return;
    }
    if (event.key === 'Enter'){
      event.preventDefault();
      event.stopImmediatePropagation();
      if (dropdown.classList.contains('open') && results.length){
        setCandidate(results[Math.max(0,activeIndex)]);
      }
      return;
    }
    if (event.key === 'Escape') closeDropdown();
  },true);

  document.addEventListener('mousedown', event => {
    if (!box.contains(event.target)) closeDropdown();
  });

  addBtn.addEventListener('click', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const raw = cleanSymbol(input.value);
    if (!raw) return;

    let candidate = selectedCandidate?.ticker === raw ? selectedCandidate : null;
    if (!candidate){
      showMessage('VERIFYING...');
      try{
        const items = await searchYahoo(raw);
        candidate = items.find(x => x.ticker === raw) || null;
      }catch(error){
        if (error?.name !== 'AbortError') console.error('YAHOO SYMBOL VERIFY FAILED',error);
      }
    }

    if (!candidate){
      showMessage('TICKER NOT FOUND');
      return;
    }

    if (watchlist.some(x => x.ticker === raw)){
      selectedTicker = raw;
      input.value = '';
      selectedCandidate = null;
      closeDropdown();
      renderAll();
      return;
    }

    watchlist.unshift({
      ticker: candidate.ticker,
      yahoo: candidate.yahoo || candidate.ticker,
      tv: candidate.tv,
      name: candidate.name || candidate.ticker,
      exchange: candidate.exchange || '—',
      sector: candidate.sector || '—',
      industry: candidate.industry || '—',
      domain: candidate.domain || '',
      last: null,
      change: null,
      pct: null
    });

    selectedTicker = candidate.ticker;
    persist();
    input.value = '';
    selectedCandidate = null;
    closeDropdown();
    renderAll();
  },true);
})();
