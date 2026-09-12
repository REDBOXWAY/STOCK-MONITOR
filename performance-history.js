(() => {
  function percentChange(from, to) {
    if (!Number.isFinite(from) || !Number.isFinite(to) || from === 0) return null;
    return 100 * (to / from - 1);
  }

  function candleNearYearsAgo(candles, years) {
    if (!candles?.length) return null;
    const last = candles[candles.length - 1];
    const lastDate = new Date(last.time * 1000);
    const target = new Date(Date.UTC(
      lastDate.getUTCFullYear() - years,
      lastDate.getUTCMonth(),
      lastDate.getUTCDate()
    ));
    const targetTs = Math.floor(target.getTime() / 1000);

    // If the available history does not reach this period, do not invent a value.
    const firstTs = candles[0].time;
    if (firstTs > targetTs + 45 * 86400) return null;

    let best = candles[0];
    let bestDistance = Math.abs(best.time - targetTs);
    for (const candle of candles) {
      const distance = Math.abs(candle.time - targetTs);
      if (distance < bestDistance) {
        best = candle;
        bestDistance = distance;
      }
      if (candle.time > targetTs && distance > bestDistance) break;
    }
    return best;
  }

  window.renderPerformance = function(candles) {
    if (!candles?.length) return;

    const last = candles[candles.length - 1];
    const lastClose = last.close;
    const pctBySessions = n => {
      if (candles.length <= n) return null;
      return percentChange(candles[candles.length - 1 - n].close, lastClose);
    };

    const lastYear = new Date(last.time * 1000).getUTCFullYear();
    const ytdStart = candles.find(c => new Date(c.time * 1000).getUTCFullYear() === lastYear);
    const c5 = candleNearYearsAgo(candles, 5);
    const c10 = candleNearYearsAgo(candles, 10);
    const first = candles[0];

    const values = [
      ['1 DAY', pctBySessions(1)],
      ['5 DAYS', pctBySessions(5)],
      ['1 MONTH', pctBySessions(21)],
      ['6 MONTHS', pctBySessions(126)],
      ['YEAR TO DATE', ytdStart ? percentChange(ytdStart.close, lastClose) : null],
      ['1 YEAR', pctBySessions(252)],
      ['5 YEARS', c5 ? percentChange(c5.close, lastClose) : null],
      ['10 YEARS', c10 ? percentChange(c10.close, lastClose) : null],
      ['ALL TIME', first ? percentChange(first.close, lastClose) : null]
    ];

    const host = document.getElementById('performanceRows');
    if (!host) return;
    host.innerHTML = values.map(([label, value]) =>
      `<div class="perf-row"><span>${label}</span><strong class="${value == null ? 'muted' : value >= 0 ? 'up' : 'down'}">${value == null ? '—' : `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`}</strong></div>`
    ).join('');
  };
})();
