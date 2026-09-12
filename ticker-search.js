(() => {
  const input = document.getElementById('symbolInput');
  const addBtn = document.getElementById('addBtn');
  const box = input?.closest('.search-box');
  if (!input || !addBtn || !box) return;

  const CATALOG = [
    {ticker:'AAPL',name:'Apple Inc.',exchange:'NASDAQ',tv:'NASDAQ:AAPL',domain:'apple.com'},
    {ticker:'AMD',name:'Advanced Micro Devices, Inc.',exchange:'NASDAQ',tv:'NASDAQ:AMD',domain:'amd.com'},
    {ticker:'AMAT',name:'Applied Materials, Inc.',exchange:'NASDAQ',tv:'NASDAQ:AMAT',domain:'appliedmaterials.com'},
    {ticker:'AMZN',name:'Amazon.com, Inc.',exchange:'NASDAQ',tv:'NASDAQ:AMZN',domain:'amazon.com'},
    {ticker:'ANET',name:'Arista Networks, Inc.',exchange:'NYSE',tv:'NYSE:ANET',domain:'arista.com'},
    {ticker:'ARM',name:'Arm Holdings plc',exchange:'NASDAQ',tv:'NASDAQ:ARM',domain:'arm.com'},
    {ticker:'ASML',name:'ASML Holding N.V.',exchange:'NASDAQ',tv:'NASDAQ:ASML',domain:'asml.com'},
    {ticker:'AVGO',name:'Broadcom Inc.',exchange:'NASDAQ',tv:'NASDAQ:AVGO',domain:'broadcom.com'},
    {ticker:'CAT',name:'Caterpillar Inc.',exchange:'NYSE',tv:'NYSE:CAT',domain:'caterpillar.com'},
    {ticker:'CBOE',name:'Cboe Global Markets, Inc.',exchange:'CBOE',tv:'CBOE:CBOE',domain:'cboe.com'},
    {ticker:'CEG',name:'Constellation Energy Corporation',exchange:'NASDAQ',tv:'NASDAQ:CEG',domain:'constellationenergy.com'},
    {ticker:'CME',name:'CME Group Inc.',exchange:'NASDAQ',tv:'NASDAQ:CME',domain:'cmegroup.com'},
    {ticker:'DUK',name:'Duke Energy Corporation',exchange:'NYSE',tv:'NYSE:DUK',domain:'duke-energy.com'},
    {ticker:'GLD',name:'SPDR Gold Shares',exchange:'AMEX',tv:'AMEX:GLD',domain:'ssga.com'},
    {ticker:'GOOGL',name:'Alphabet Inc.',exchange:'NASDAQ',tv:'NASDAQ:GOOGL',domain:'google.com'},
    {ticker:'IAU',name:'iShares Gold Trust',exchange:'AMEX',tv:'AMEX:IAU',domain:'ishares.com'},
    {ticker:'ICE',name:'Intercontinental Exchange, Inc.',exchange:'NYSE',tv:'NYSE:ICE',domain:'ice.com'},
    {ticker:'KLAC',name:'KLA Corporation',exchange:'NASDAQ',tv:'NASDAQ:KLAC',domain:'kla.com'},
    {ticker:'LRCX',name:'Lam Research Corporation',exchange:'NASDAQ',tv:'NASDAQ:LRCX',domain:'lamresearch.com'},
    {ticker:'META',name:'Meta Platforms, Inc.',exchange:'NASDAQ',tv:'NASDAQ:META',domain:'meta.com'},
    {ticker:'MSFT',name:'Microsoft Corporation',exchange:'NASDAQ',tv:'NASDAQ:MSFT',domain:'microsoft.com'},
    {ticker:'MSTR',name:'Strategy Inc.',exchange:'NASDAQ',tv:'NASDAQ:MSTR',domain:'strategy.com'},
    {ticker:'MU',name:'Micron Technology, Inc.',exchange:'NASDAQ',tv:'NASDAQ:MU',domain:'micron.com'},
    {ticker:'NEE',name:'NextEra Energy, Inc.',exchange:'NYSE',tv:'NYSE:NEE',domain:'nexteraenergy.com'},
    {ticker:'NVDA',name:'NVIDIA Corporation',exchange:'NASDAQ',tv:'NASDAQ:NVDA',domain:'nvidia.com'},
    {ticker:'PLTR',name:'Palantir Technologies Inc.',exchange:'NASDAQ',tv:'NASDAQ:PLTR',domain:'palantir.com'},
    {ticker:'QQQ',name:'Invesco QQQ Trust',exchange:'NASDAQ',tv:'NASDAQ:QQQ',domain:'invesco.com'},
    {ticker:'RTX',name:'RTX Corporation',exchange:'NYSE',tv:'NYSE:RTX',domain:'rtx.com'},
    {ticker:'SOXX',name:'iShares Semiconductor ETF',exchange:'NASDAQ',tv:'NASDAQ:SOXX',domain:'ishares.com'},
    {ticker:'TQQQ',name:'ProShares UltraPro QQQ',exchange:'NASDAQ',tv:'NASDAQ:TQQQ',domain:'proshares.com'},
    {ticker:'TSLA',name:'Tesla, Inc.',exchange:'NASDAQ',tv:'NASDAQ:TSLA',domain:'tesla.com'},
    {ticker:'TSM',name:'Taiwan Semiconductor Manufacturing Co.',exchange:'NYSE',tv:'NYSE:TSM',domain:'tsmc.com'},
    {ticker:'VST',name:'Vistra Corp.',exchange:'NYSE',tv:'NYSE:VST',domain:'vistracorp.com'},
    {ticker:'VTI',name:'Vanguard Total Stock Market ETF',exchange:'AMEX',tv:'AMEX:VTI',domain:'vanguard.com'},
    {ticker:'XLU',name:'Utilities Select Sector SPDR Fund',exchange:'AMEX',tv:'AMEX:XLU',domain:'ssga.com'}
  ];

  const dropdown = document.createElement('div');
  dropdown.className = 'ticker-suggestions';
  dropdown.setAttribute('role','listbox');
  box.appendChild(dropdown);

  let results = [];
  let activeIndex = -1;
  let selectedCandidate = null;

  function clean(value){
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9.\-]/g,'');
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

  function findResults(query){
    const q = clean(query);
    if (!q) return [];
    const ranked = CATALOG
      .map(item => {
        const ticker = item.ticker.toUpperCase();
        const name = item.name.toUpperCase();
        let rank = 99;
        if (ticker === q) rank = 0;
        else if (ticker.startsWith(q)) rank = 1;
        else if (ticker.includes(q)) rank = 2;
        else if (name.startsWith(q)) rank = 3;
        else if (name.includes(q)) rank = 4;
        return {item,rank};
      })
      .filter(x => x.rank < 99)
      .sort((a,b) => a.rank-b.rank || a.item.ticker.localeCompare(b.item.ticker))
      .slice(0,10)
      .map(x => x.item);

    if (!ranked.some(x => x.ticker === q) && /^[A-Z][A-Z0-9.\-]{0,9}$/.test(q)) {
      ranked.unshift({ticker:q,name:`USE SYMBOL ${q}`,exchange:'MANUAL',tv:`NASDAQ:${q}`,domain:''});
    }
    return ranked.slice(0,10);
  }

  function renderDropdown(){
    results = findResults(input.value);
    activeIndex = results.length ? 0 : -1;
    if (!clean(input.value)) {
      closeDropdown();
      dropdown.innerHTML = '';
      return;
    }
    if (!results.length) {
      dropdown.innerHTML = '<div class="ticker-suggestions-empty">NO MATCHING TICKERS</div>';
      dropdown.classList.add('open');
      return;
    }
    dropdown.innerHTML = results.map((item,i) => `
      <div class="ticker-suggestion ${i===activeIndex?'active':''}" role="option" data-index="${i}">
        <div class="ts-symbol">${item.ticker}</div>
        <div class="ts-name">${item.name}</div>
        <div class="ts-exchange">${item.exchange}</div>
      </div>`).join('');
    dropdown.classList.add('open');
    dropdown.querySelectorAll('.ticker-suggestion').forEach(el => {
      el.addEventListener('mousedown', e => {
        e.preventDefault();
        const item = results[Number(el.dataset.index)];
        setCandidate(item);
      });
    });
  }

  function refreshActive(){
    dropdown.querySelectorAll('.ticker-suggestion').forEach((el,i) => {
      el.classList.toggle('active', i === activeIndex);
      if (i === activeIndex) el.scrollIntoView({block:'nearest'});
    });
  }

  input.addEventListener('input', () => {
    selectedCandidate = null;
    renderDropdown();
  });

  input.addEventListener('focus', () => {
    if (clean(input.value)) renderDropdown();
  });

  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      activeIndex = (activeIndex + 1) % results.length;
      refreshActive();
      return;
    }
    if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      activeIndex = (activeIndex - 1 + results.length) % results.length;
      refreshActive();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (dropdown.classList.contains('open') && results.length) {
        setCandidate(results[Math.max(0,activeIndex)]);
      }
      return;
    }
    if (event.key === 'Escape') closeDropdown();
  }, true);

  document.addEventListener('mousedown', event => {
    if (!box.contains(event.target)) closeDropdown();
  });

  addBtn.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const raw = clean(input.value);
    if (!raw) return;
    const candidate = (selectedCandidate && selectedCandidate.ticker === raw)
      ? selectedCandidate
      : CATALOG.find(x => x.ticker === raw) || null;

    if (watchlist.some(x => x.ticker === raw)) {
      selectedTicker = raw;
      input.value = '';
      selectedCandidate = null;
      closeDropdown();
      renderAll();
      return;
    }

    watchlist.unshift({
      ticker: raw,
      tv: candidate?.tv || `NASDAQ:${raw}`,
      name: candidate?.name && !candidate.name.startsWith('USE SYMBOL ') ? candidate.name : raw,
      exchange: candidate?.exchange && candidate.exchange !== 'MANUAL' ? candidate.exchange : 'NASDAQ',
      sector: '—',
      industry: '—',
      domain: candidate?.domain || '',
      last: null,
      change: null,
      pct: null
    });
    selectedTicker = raw;
    persist();
    input.value = '';
    selectedCandidate = null;
    closeDropdown();
    renderAll();
  }, true);
})();
