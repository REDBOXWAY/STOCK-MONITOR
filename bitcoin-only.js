(() => {
  const input = document.getElementById('symbolInput');
  const addBtn = document.getElementById('addBtn');
  const box = input?.closest('.search-box');
  if (!input || !addBtn || !box) return;

  const BLOCKED_SYMBOLS = new Set([
    'BTC','BTC-USD','BITO','IBIT','FBTC','ARKB','GBTC','BITB','HODL','BRRR','EZBC','BTCW','BTCO'
  ]);

  function key(value){
    return String(value || '').trim().toUpperCase();
  }

  function bitcoinSearchQuery(){
    const q = key(input.value);
    return q === 'BTC' || q === 'BTC-' || q === 'BTC-USD' || q === 'BTCUSD' || q.includes('BITCOIN');
  }

  function isBitcoinRelated(symbol, name){
    const s = key(symbol);
    const n = key(name);
    if (s === 'BTCUSD') return false;
    return BLOCKED_SYMBOLS.has(s) || n.includes('BITCOIN');
  }

  function filterDropdown(){
    const dropdown = box.querySelector('.ticker-suggestions');
    if (!dropdown) return;

    const strictBitcoin = bitcoinSearchQuery();
    dropdown.querySelectorAll('.ticker-suggestion').forEach(row => {
      const symbol = key(row.querySelector('.ts-symbol')?.textContent);
      const name = key(row.querySelector('.ts-name')?.textContent);

      if (symbol === 'BTCUSD') return;
      if (strictBitcoin || isBitcoinRelated(symbol,name)) row.remove();
    });
  }

  function cleanWatchlist(){
    if (typeof watchlist === 'undefined' || !Array.isArray(watchlist)) return;
    const before = watchlist.length;

    watchlist = watchlist.filter(item => {
      const ticker = key(item?.ticker);
      const name = key(item?.name);
      if (ticker === 'BTCUSD') return true;
      return !isBitcoinRelated(ticker,name);
    });

    if (watchlist.length === before) return;

    if (!watchlist.some(x => x.ticker === selectedTicker)) {
      selectedTicker = watchlist[0]?.ticker || '';
    }

    try { persist(); } catch (_) {}
    try { renderAll(); } catch (_) {}
  }

  input.addEventListener('input', () => {
    setTimeout(filterDropdown, 20);
    setTimeout(filterDropdown, 220);
    setTimeout(filterDropdown, 500);
  });

  input.addEventListener('focus', () => setTimeout(filterDropdown, 20));

  const dropdownObserver = new MutationObserver(filterDropdown);
  const dropdown = box.querySelector('.ticker-suggestions');
  if (dropdown) dropdownObserver.observe(dropdown,{childList:true,subtree:true});

  document.addEventListener('click', event => {
    if (event.target !== addBtn && !addBtn.contains(event.target)) return;
    const raw = key(input.value);

    if (raw === 'BTC' || raw === 'BTC-USD' || raw === 'BITCOIN') {
      input.value = 'BTCUSD';
      return;
    }

    if (BLOCKED_SYMBOLS.has(raw)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      input.value = 'BTCUSD';
      input.dispatchEvent(new Event('input',{bubbles:true}));
    }
  }, true);

  cleanWatchlist();
  window.addEventListener('load', () => {
    cleanWatchlist();
    setTimeout(filterDropdown,50);
  }, {once:true});
})();
