(() => {
  const ranges = document.getElementById('ranges');
  const chartHost = document.getElementById('chartHost');
  if (!ranges || !chartHost) return;

  function relocateMeasureButton() {
    const candidates = [...chartHost.querySelectorAll('button')];
    const btn = candidates.find(b => (b.textContent || '').trim().toUpperCase() === 'MEASURE');
    if (!btn) return;

    ranges.querySelectorAll('.measure-range-btn').forEach(old => {
      if (old !== btn) old.remove();
    });

    btn.className = 'range-btn measure-range-btn';
    btn.style.position = 'static';
    btn.style.top = '';
    btn.style.right = '';
    btn.style.zIndex = '';
    btn.style.height = '35px';
    btn.style.minWidth = '92px';
    btn.style.padding = '0 12px';
    btn.style.marginLeft = '2px';
    btn.style.borderRadius = '8px';
    btn.style.font = '';
    btn.style.letterSpacing = '';
    btn.style.cursor = 'pointer';
    ranges.appendChild(btn);
  }

  const observer = new MutationObserver(() => relocateMeasureButton());
  observer.observe(chartHost, { childList: true, subtree: true });

  relocateMeasureButton();
})();
