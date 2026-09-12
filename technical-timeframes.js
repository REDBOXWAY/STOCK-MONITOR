(() => {
  const TECH_TIMEFRAMES = ['DAY','WEEK','MONTH'];
  let technicalTimeframeMode = localStorage.getItem('stock-monitor-tech-timeframe') || 'DAY';
  if (!TECH_TIMEFRAMES.includes(technicalTimeframeMode)) technicalTimeframeMode = 'DAY';

  function aggregateCandles(candles,timeframe){
    if(timeframe === 'DAY') return candles;
    const groups = new Map();
    candles.forEach(c => {
      const d = new Date(c.time * 1000);
      let key;
      if(timeframe === 'WEEK'){
        const day = (d.getUTCDay() + 6) % 7;
        const monday = new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-day));
        key = monday.toISOString().slice(0,10);
      } else {
        key = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
      }
      let g = groups.get(key);
      if(!g){
        g = {time:c.time,open:c.open,high:c.high,low:c.low,close:c.close,volume:c.volume||0};
        groups.set(key,g);
      } else {
        g.high = Math.max(g.high,c.high);
        g.low = Math.min(g.low,c.low);
        g.close = c.close;
        g.volume += c.volume || 0;
        g.time = c.time;
      }
    });
    return [...groups.values()].sort((a,b) => a.time - b.time);
  }

  renderGauge = function(result){
    const host = document.getElementById('techHost');
    const angle = -90 + ((Math.max(-100,Math.min(100,result.score))+100)/200)*180;
    const center = {x:360,y:240};
    const needle = polar(center.x,center.y,145,angle);
    const BUY_COLOR = '#00E6B3';
    const STRONG_BUY_COLOR = '#006B4F';
    const SELL_COLOR = '#FF9E32';
    const STRONG_SELL_COLOR = '#FF4058';
    const NEUTRAL_COLOR = '#76848B';
    const segs = [
      [-90,-54,STRONG_SELL_COLOR],
      [-54,-18,SELL_COLOR],
      [-18,18,NEUTRAL_COLOR],
      [18,54,BUY_COLOR],
      [54,90,STRONG_BUY_COLOR]
    ];
    const ratingColor = result.rating === 'STRONG BUY' ? STRONG_BUY_COLOR :
      result.rating === 'BUY' ? BUY_COLOR :
      result.rating === 'STRONG SELL' ? STRONG_SELL_COLOR :
      result.rating === 'SELL' ? SELL_COLOR : '#D2D9DC';
    const cls = name => `gauge-label${result.rating===name?' active':''}`;
    const tfButtons = TECH_TIMEFRAMES.map(tf => `<button class="tf-btn ${technicalTimeframeMode===tf?'active':''}" type="button" data-tf="${tf}">${tf}</button>`).join('');

    host.innerHTML = `<div class="technical-panel">
      <div class="technical-toolbar">
        <div class="tf-switch">${tfButtons}</div>
        <div class="technical-status">NET SCORE ${result.score>=0?'+':''}${result.score.toFixed(0)}</div>
      </div>
      <div class="gauge-wrap">
        <svg class="gauge-svg" viewBox="0 0 720 370" role="img" aria-label="${result.rating}">
          ${segs.map(([a,b,c])=>`<path d="${arcPath(center.x,center.y,154,a,b)}" fill="none" stroke="${c}" stroke-width="28" stroke-linecap="round"/>`).join('')}
          <text x="72" y="183" text-anchor="middle" class="${cls('STRONG SELL')}"><tspan x="72" dy="0">STRONG</tspan><tspan x="72" dy="34">SELL</tspan></text>
          <text x="205" y="96" text-anchor="middle" class="${cls('SELL')}">SELL</text>
          <text x="360" y="46" text-anchor="middle" class="${cls('NEUTRAL')}">NEUTRAL</text>
          <text x="515" y="96" text-anchor="middle" class="${cls('BUY')}">BUY</text>
          <text x="648" y="183" text-anchor="middle" class="${cls('STRONG BUY')}"><tspan x="648" dy="0">STRONG</tspan><tspan x="648" dy="34">BUY</tspan></text>
          <line x1="${center.x}" y1="${center.y}" x2="${needle.x}" y2="${needle.y}" stroke="${ratingColor}" stroke-width="6" stroke-linecap="round"/>
          <circle cx="${center.x}" cy="${center.y}" r="12" fill="#fff"/>
        </svg>
      </div>
      <div class="gauge-counts">
        <div class="gauge-count sell"><span>SELL</span><strong>${result.sell}</strong></div>
        <div class="gauge-count neutral"><span>NEUTRAL</span><strong>${result.neutral}</strong></div>
        <div class="gauge-count buy"><span>BUY</span><strong>${result.buy}</strong></div>
      </div>
    </div>`;

    host.querySelectorAll('.tf-btn').forEach(btn => {
      btn.addEventListener('click',() => {
        const next = btn.dataset.tf;
        if(!TECH_TIMEFRAMES.includes(next) || next === technicalTimeframeMode) return;
        technicalTimeframeMode = next;
        localStorage.setItem('stock-monitor-tech-timeframe',technicalTimeframeMode);
        renderTechnicals(selected());
      });
    });
  };

  renderTechnicals = async function(item){
    if(!item) return;
    const token = ++techLoadToken;
    const host = document.getElementById('techHost');
    host.innerHTML = '<div class="empty-note">CALCULATING TECHNICALS…</div>';
    try{
      const daily = await fetchDailyCandles(item);
      if(token !== techLoadToken) return;
      const z = daily.at(-1), p = daily.at(-2);
      item.last = z.close;
      item.change = z.close - p.close;
      item.pct = 100 * item.change / p.close;
      renderWatchlist();
      renderHero(item);
      renderMetricsFromCandles(daily);
      renderPerformance(daily);
      const technicalCandles = aggregateCandles(daily,technicalTimeframeMode);
      renderGauge(calculateTechnicalRating(technicalCandles));
      document.getElementById('lastUpdate').textContent = `CHART BY TRADINGVIEW · TECHNICALS: ${technicalTimeframeMode}`;
    }catch(e){
      if(token !== techLoadToken) return;
      host.innerHTML = '<div class="empty-note">TECHNICAL DATA UNAVAILABLE<br><span class="muted">CHECK MARKET DATA CONNECTION</span></div>';
      console.error(e);
    }
  };

  marketDataCache.clear();
  renderTechnicals(selected());
})();