(() => {
  const MODES=['LINE','CANDLES'];
  const UP_COLOR='#00E6B3';
  const DOWN_COLOR='#FF4058';
  const PRICE_LINE_COLOR='#2962FF';
  let chartMode=localStorage.getItem('stock-monitor-chart-mode')||'LINE';
  if(!MODES.includes(chartMode)) chartMode='LINE';

  let latestHistory=[];
  let installed=false;

  function requestUrl(input){
    if(typeof input==='string') return input;
    if(input&&typeof input.url==='string') return input.url;
    return '';
  }

  function captureHistory(data){
    const res=data?.chart?.result?.[0];
    const q=res?.indicators?.quote?.[0];
    if(!res||!q) return;

    const rows=[];
    (res.timestamp||[]).forEach((time,i)=>{
      const open=q.open?.[i];
      const high=q.high?.[i];
      const low=q.low?.[i];
      const close=q.close?.[i];
      if([open,high,low,close].every(Number.isFinite)){
        rows.push({time,open,high,low,close});
      }else if(Number.isFinite(close)){
        rows.push({time,open:close,high:close,low:close,close});
      }
    });
    if(rows.length) latestHistory=rows;
  }

  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    const response=await originalFetch(input,init);
    const url=requestUrl(input);
    if(url.includes('/api/history?')&&response.ok){
      try{
        const data=await response.clone().json();
        captureHistory(data);
      }catch(_){}
    }
    return response;
  };

  function currentRange(){
    try{return typeof activeRange!=='undefined'?activeRange:''}catch(_){return ''}
  }

  function synthetic(row){
    const v=Number(row?.value);
    if(!Number.isFinite(v)) return null;
    return {time:row.time,open:v,high:v,low:v,close:v};
  }

  function aggregateBuckets(targetRows,bucketSeconds){
    const wanted=new Set(targetRows.map(row=>Math.floor(Number(row.time)/bucketSeconds)));
    const buckets=new Map();

    for(const row of latestHistory){
      const key=Math.floor(Number(row.time)/bucketSeconds);
      if(!wanted.has(key)) continue;
      const current=buckets.get(key);
      if(!current){
        buckets.set(key,{open:row.open,high:row.high,low:row.low,close:row.close});
      }else{
        current.high=Math.max(current.high,row.high);
        current.low=Math.min(current.low,row.low);
        current.close=row.close;
      }
    }

    return targetRows.map(row=>{
      const key=Math.floor(Number(row.time)/bucketSeconds);
      const candle=buckets.get(key);
      return candle?{time:row.time,...candle}:synthetic(row);
    }).filter(Boolean);
  }

  function candleRows(lineRows){
    if(!Array.isArray(lineRows)||!lineRows.length) return [];
    const range=currentRange();

    if(range==='1D') return aggregateBuckets(lineRows,60*60);
    if(range==='5D') return aggregateBuckets(lineRows,4*60*60);

    const byTime=new Map(latestHistory.map(row=>[Number(row.time),row]));
    return lineRows.map(row=>{
      const raw=byTime.get(Number(row.time));
      if(raw){
        return {time:row.time,open:raw.open,high:raw.high,low:raw.low,close:raw.close};
      }
      return synthetic(row);
    }).filter(Boolean);
  }

  function installChartWrapper(){
    if(installed) return true;
    const LC=window.LightweightCharts;
    if(!LC||typeof LC.createChart!=='function') return false;
    if(LC.__stockMonitorChartTypeMode) return true;

    const originalCreateChart=LC.createChart.bind(LC);

    const wrappedCreateChart=function(container,options){
      const api=originalCreateChart(container,options);
      const originalAddSeries=api.addSeries.bind(api);

      api.addSeries=function(seriesDefinition,seriesOptions){
        const useCandles=chartMode==='CANDLES'&&seriesDefinition===LC.AreaSeries;
        if(!useCandles) return originalAddSeries(seriesDefinition,seriesOptions);

        const series=originalAddSeries(LC.CandlestickSeries,{
          upColor:UP_COLOR,
          downColor:DOWN_COLOR,
          borderUpColor:UP_COLOR,
          borderDownColor:DOWN_COLOR,
          wickUpColor:UP_COLOR,
          wickDownColor:DOWN_COLOR,
          priceLineVisible:true,
          priceLineColor:PRICE_LINE_COLOR,
          priceLineWidth:1,
          lastValueVisible:true,
          priceFormat:seriesOptions?.priceFormat||{type:'price',precision:2,minMove:.01}
        });

        if(series&&typeof series.setData==='function'){
          const originalSetData=series.setData.bind(series);
          series.setData=function(rows){
            return originalSetData(candleRows(rows));
          };
        }
        return series;
      };

      return api;
    };

    let applied=false;
    try{
      LC.createChart=wrappedCreateChart;
      applied=LC.createChart===wrappedCreateChart;
    }catch(_){}

    if(!applied){
      try{
        window.LightweightCharts={...LC,createChart:wrappedCreateChart,__stockMonitorChartTypeMode:true};
        applied=window.LightweightCharts.createChart===wrappedCreateChart;
      }catch(_){}
    }else{
      try{LC.__stockMonitorChartTypeMode=true}catch(_){}
    }

    installed=applied;
    return applied;
  }

  if(!installChartWrapper()){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      if(installChartWrapper()||attempts>=200) clearInterval(timer);
    },25);
  }

  function setActiveButtons(group){
    group.querySelectorAll('[data-chart-mode]').forEach(btn=>{
      const active=btn.dataset.chartMode===chartMode;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-pressed',active?'true':'false');
    });
  }

  function ensureToggle(){
    const ranges=document.getElementById('ranges');
    if(!ranges) return;

    let group=ranges.querySelector('.chart-type-switch');
    if(!group){
      group=document.createElement('div');
      group.className='chart-type-switch';
      Object.assign(group.style,{display:'inline-flex',alignItems:'center',gap:'4px',marginLeft:'4px'});

      for(const mode of MODES){
        const btn=document.createElement('button');
        btn.type='button';
        btn.className='range-btn chart-type-btn';
        btn.dataset.chartMode=mode;
        btn.textContent=mode;
        btn.setAttribute('aria-label',`${mode} CHART`);
        btn.addEventListener('click',()=>{
          if(chartMode===mode) return;
          chartMode=mode;
          localStorage.setItem('stock-monitor-chart-mode',chartMode);
          setActiveButtons(group);
          try{
            const item=typeof selected==='function'?selected():null;
            if(item&&typeof renderChart==='function') renderChart(item);
          }catch(_){}
        });
        group.appendChild(btn);
      }
      ranges.appendChild(group);
    }
    setActiveButtons(group);
  }

  const startToggle=()=>{
    const ranges=document.getElementById('ranges');
    if(!ranges){setTimeout(startToggle,100);return;}
    const observer=new MutationObserver(()=>ensureToggle());
    observer.observe(ranges,{childList:true});
    ensureToggle();
  };

  startToggle();
})();