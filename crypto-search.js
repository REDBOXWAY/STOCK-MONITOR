(() => {
  const input = document.getElementById('symbolInput');
  const box = input?.closest('.search-box');
  if (!input || !box) return;

  const CRYPTO = [
    { ticker:'BTC-USD', name:'Bitcoin USD', exchange:'CRYPTO', type:'CRYPTO' },
    { ticker:'ETH-USD', name:'Ethereum USD', exchange:'CRYPTO', type:'CRYPTO' }
  ];

  const ALIASES = {
    'BTC':'BTC-USD',
    'BTCUSD':'BTC-USD',
    'BTC-USD':'BTC-USD',
    'BITCOIN':'BTC-USD',
    'ETH':'ETH-USD',
    'ETHUSD':'ETH-USD',
    'ETH-USD':'ETH-USD',
    'ETHEREUM':'ETH-USD'
  };

  function esc(value){
    return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function matches(item, query){
    const q = String(query || '').trim().toUpperCase();
    if (!q) return false;
    const symbol = item.ticker.toUpperCase();
    const base = symbol.split('-')[0];
    const name = item.name.toUpperCase();
    return symbol.startsWith(q) || base.startsWith(q) || name.startsWith(q) || name.includes(q);
  }

  function injectCryptoResults(){
    const query = input.value;
    const matchesNow = CRYPTO.filter(item => matches(item, query));
    if (!matchesNow.length) return;

    const dropdown = box.querySelector('.ticker-suggestions');
    if (!dropdown) return;

    dropdown.querySelectorAll('[data-crypto-search="1"]').forEach(el => el.remove());

    matchesNow.reverse().forEach(item => {
      if ([...dropdown.querySelectorAll('.ts-symbol')].some(el => el.textContent.trim().toUpperCase() === item.ticker)) return;
      const row = document.createElement('div');
      row.className = 'ticker-suggestion';
      row.dataset.cryptoSearch = '1';
      row.setAttribute('role','option');
      row.innerHTML = `<div class="ts-symbol">${esc(item.ticker)}</div><div class="ts-name">${esc(item.name)}</div><div class="ts-exchange">${esc(item.exchange)} · ${esc(item.type)}</div>`;
      row.addEventListener('mousedown', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        input.value = item.ticker;
        dropdown.classList.remove('open');
        input.focus();
      }, true);
      dropdown.prepend(row);
    });

    dropdown.classList.add('open');
  }

  function repairCryptoWatchlist(){
    if (typeof watchlist === 'undefined' || !Array.isArray(watchlist)) return;
    let changed = false;

    watchlist.forEach(item => {
      const tickerKey = String(item?.ticker || '').toUpperCase().replace(/[^A-Z0-9-]/g,'');
      const yahooKey = String(item?.yahoo || '').toUpperCase().replace(/[^A-Z0-9-]/g,'');
      const yahoo = ALIASES[tickerKey] || ALIASES[yahooKey];
      if (!yahoo) return;

      const isBTC = yahoo === 'BTC-USD';
      const desired = {
        yahoo,
        name:isBTC ? 'Bitcoin USD' : 'Ethereum USD',
        exchange:'CRYPTO',
        type:'CRYPTO',
        sector:'CRYPTO',
        industry:'CRYPTO',
        tv:isBTC ? 'BITSTAMP:BTCUSD' : 'COINBASE:ETHUSD'
      };

      Object.entries(desired).forEach(([key,value]) => {
        if (item[key] !== value) {
          item[key] = value;
          changed = true;
        }
      });
    });

    if (!changed) return;

    try { persist(); } catch (_) {}
    setTimeout(() => {
      try { renderAll(); } catch (_) {}
      try { window.refreshLiveQuotesNow?.(); } catch (_) {}
    }, 0);
  }

  input.addEventListener('input', () => {
    setTimeout(injectCryptoResults, 30);
    setTimeout(injectCryptoResults, 250);
  });
  input.addEventListener('focus', () => setTimeout(injectCryptoResults, 30));

  const rows = document.getElementById('watchRows');
  if (rows && window.MutationObserver) {
    new MutationObserver(() => setTimeout(repairCryptoWatchlist, 0)).observe(rows, { childList:true });
  }

  repairCryptoWatchlist();
  window.addEventListener('load', () => {
    repairCryptoWatchlist();
    setTimeout(() => {
      try { window.refreshLiveQuotesNow?.(); } catch (_) {}
    }, 200);
  }, { once:true });
})();
