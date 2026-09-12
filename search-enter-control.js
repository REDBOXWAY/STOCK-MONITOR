(() => {
  const input = document.getElementById('symbolInput');
  if (!input) return;

  // ENTER is only for confirming/searching the typed symbol.
  // A ticker is added to WATCHLIST only by clicking + ADD.
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
})();
