(() => {
  const input = document.getElementById('symbolInput');
  const box = input?.closest('.search-box');
  if (!input || !box) return;

  // Display only BTCUSD in STOCK MONITOR. Upstream data still uses Yahoo's BTC-USD.
  const BTC = { ticker:'BTCUSD', yahoo:'BTC-USD', name:'Bitcoin USD', exchange:'CRYPTO', type:'CRYPTO' };
  const ETH = { ticker:'ETH-USD', yahoo:'ETH-USD', name:'Ethereum USD', exchange:'CRYPTO', type:'CRYPTO' };
  const CRYPTO = [BTC, ETH];

  const BTC_ALIASES = new Set(['BTC','BTCUSD','BTC-USD','BITCOIN']);
  const ETH_ALIASES = new Set(['ETH','ETHUSD','ETH-USD','ETHEREUM']);

  function esc(value){
    return String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function normalizeKey(value){
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g,'');
  }

  function isBitcoinKey(value){ return BTC_ALIASES.has(normalizeKey(value)); }
  function isEthereumKey(value){ return ETH_ALIASES.has(normalizeKey(value)); }

  function matches(item, query){
    const q = String(query || '').trim().toUpperCase();
    if (!q) return false;
    if (item === BTC) {
      return 'BTCUSD'.startsWith(q) || 'BTC'.startsWith(q) || 'BITCOIN'.startsWith(q) || 'BITCOIN'.includes(q);
    }
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

    // For Bitcoin searches remove every BTC/BTC-USD variant from Yahoo results.
    // STOCK MONITOR must show only BTCUSD.
    if (matches(BTC, query)) {
      dropdown.querySelectorAll('.ticker-suggestion').forEach(row => {
        const symbol = row.querySelector('.ts-symbol')?.textContent?.trim().toUpperCase();
        if (symbol && (symbol === 'BTC' || symbol === 'BTC-USD' || symbol === 'BTCUSD')) row.remove();
      });
    }

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

    // First normalize all existing Bitcoin entries to one display ticker: BTCUSD.
    watchlist.forEach(item => {
      const tickerKey = normalizeKey(item?.ticker);
      const yahooKey = normalizeKey(item?.yahoo);

      if (isBitcoinKey(tickerKey) || isBitcoinKey(yahooKey)) {
        const oldTicker = item.ticker;
        const desired = {
          ticker:'BTCUSD',
          yahoo:'BTC-USD',
          name:'Bitcoin USD',
          exchange:'CRYPTO',
          type:'CRYPTO',
          sector:'CRYPTO',
          industry:'CRYPTO',
          tv:'BITSTAMP:BTCUSD'
        };
        Object.entries(desired).forEach(([key,value]) => {
          if (item[key] !== value) {
            item[key] = value;
            changed = true;
          }
        });
        try {
          if (typeof selectedTicker !== 'undefined' && selectedTicker === oldTicker) selectedTicker = 'BTCUSD';
        } catch (_) {}
        return;
      }

      if (isEthereumKey(tickerKey) || isEthereumKey(yahooKey)) {
        const desired = {
          yahoo:'ETH-USD',
          name:'Ethereum USD',
          exchange:'CRYPTO',
          type:'CRYPTO',
          sector:'CRYPTO',
          industry:'CRYPTO',
          tv:'COINBASE:ETHUSD'
        };
        Object.entries(desired).forEach(([key,value]) => {
          if (item[key] !== value) {
            item[key] = value;
            changed = true;
          }
        });
      }
    });

    // If old variants created duplicates, keep just one Bitcoin row.
    let seenBTC = false;
    for (let i = watchlist.length - 1; i >= 0; i--) {
      const item = watchlist[i];
      if (item?.ticker !== 'BTCUSD') continue;
      if (!seenBTC) {
        seenBTC = true;
      } else {
        watchlist.splice(i, 1);
        changed = true;
      }
    }

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
