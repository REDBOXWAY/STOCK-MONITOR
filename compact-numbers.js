(() => {
  function compactNumber(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';

    const abs = Math.abs(n);
    const format = (divisor, suffix) => {
      const scaled = n / divisor;
      const decimals = Math.abs(scaled) < 100 && Math.abs(scaled % 1) > 0.0001 ? 1 : 0;
      return `${scaled.toFixed(decimals)} ${suffix}`;
    };

    if (abs >= 1_000_000_000) return format(1_000_000_000, 'BLN');
    if (abs >= 1_000_000) return format(1_000_000, 'MLN');
    if (abs >= 1_000) return format(1_000, 'K');
    return Math.round(n).toLocaleString('en-US');
  }

  window.compactNumber = compactNumber;

  const originalRenderMetrics = window.renderMetricsFromCandles;
  window.renderMetricsFromCandles = function(candles) {
    if (!candles?.length) {
      if (typeof originalRenderMetrics === 'function') return originalRenderMetrics(candles);
      return;
    }

    const last = candles[candles.length - 1];
    const last252 = candles.slice(-252);
    const high52 = Math.max(...last252.map(x => x.high));
    const low52 = Math.min(...last252.map(x => x.low));

    const values = [
      ['OPEN', fmtPrice(last.open)],
      ['HIGH', fmtPrice(last.high)],
      ['LOW', fmtPrice(last.low)],
      ['VOLUME', compactNumber(last.volume)],
      ['MARKET CAP', '—'],
      ['P/E', '—'],
      ['52W HIGH', fmtPrice(high52)],
      ['52W LOW', fmtPrice(low52)]
    ];

    document.getElementById('metrics').innerHTML = values.map(([label, value]) =>
      `<div class="metric"><div class="metric-label">${label}</div><div class="metric-value">${value}</div></div>`
    ).join('');
  };
})();
