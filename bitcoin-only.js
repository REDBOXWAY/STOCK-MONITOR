(() => {
  const input = document.getElementById('symbolInput');
  const addBtn = document.getElementById('addBtn');
  const box = input?.closest('.search-box');
  if (!input || !addBtn || !box) return;

  // Only direct Bitcoin aliases are suppressed. Bitcoin ETFs stay available.
  const DIRECT_BTC_ALIASES = new Set(['BTC','BTC-USD']);

  function key(value){
    return String(value || '').trim().toUpperCase();
  }

  function filterDropdown(){
    const dropdown = box.querySelector('.ticker-suggestions');
    if (!dropdown) return;

    dropdown.querySelectorAll('.ticker-suggestion').forEach(row => {
      const symbol = key(row.querySelector('.ts-symbol')?.textContent);
      if (DIRECT_BTC_ALIASES.has(symbol)) row.remove();
    });
  }

  function cleanWatchlist(){
    if (typeof watchlist === 'undefined' || !Array.isArray(watchlist)) return;
    let changed = false;

    watchlist = watchlist.filter(item => {
      const ticker = key(item?.ticker);
      if (ticker === 'BTCUSD') return true;
      if (DIRECT_BTC_ALIASES.has(ticker)) {
        changed = true;
        return false;
      }
      return true;
    });

    if (!changed) return;

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
    }
  }, true);

  cleanWatchlist();
  window.addEventListener('load', () => {
    cleanWatchlist();
    setTimeout(filterDropdown,50);
  }, {once:true});
})();
