(() => {
  const LWC_SRC = 'https://cdn.jsdelivr.net/npm/lightweight-charts@5.2.1/dist/lightweight-charts.standalone.production.js';
  const VERCEL_PROXY = 'https://stock-monitor-umber.vercel.app';
  const historyCache = new Map();
  let chartApi = null;
  let resizeObserver = null;
  let renderToken = 0;

  function loadLightweightCharts(){
    if(window.LightweightCharts) return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(s=>s.src===LWC_SRC);
      if(existing){
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',reject,{once:true});
        return;
      }
      const s=document.createElement('script');
      s.src=LWC_SRC;
      s.onload=resolve;
      s.onerror=reject;
      document.head.appendChild(s);
    });
  }

  function historyConfig(range){
    if(range==='1D') return {range:'5d',interval:'1h',intraday:true};
    if(range==='5D') return {range:'1mo',interval:'1h',intraday:true};
    if(range==='1M') return {range:'1mo',interval:'1d',intraday:false};
    if(range==='6M') return {range:'6mo',interval:'1d',intraday:false};
    if(range==='YTD') return {range:'ytd',interval:'1d',intraday:false};
    if(range==='12M') return {range:'1y',interval:'1d',intraday:false};
    if(range==='60M') return {range:'5y',interval:'1wk',intraday:false};
    if(range==='120M') return {range:'10y',interval:'1wk',intraday:false};
    return {range:'max',interval:'1mo',intraday:false};
  }

  async function fetchHistory(item, range){
    const key=item.yahoo||item.ticker;
    const cfg=historyConfig(range);
    const cacheKey=`${key}|${cfg.range}|${cfg.interval}`;
    if(historyCache.has(cacheKey)) return historyCache.get(cacheKey);

    const task=(async()=>{
      const symbol=encodeURIComponent(key);
      const url=`${VERCEL_PROXY}/api/history?symbol=${symbol}&range=${encodeURIComponent(cfg.range)}&interval=${encodeURIComponent(cfg.interval)}&_=${Date.now()}`;
      const r=await fetch(url,{cache:'no-store',mode:'cors'});
      if(!r.ok) throw new Error(`MARKET DATA ${r.status}`);
      const d=await r.json();
      const res=d?.chart?.result?.[0];
      const q=res?.indicators?.quote?.[0];
      if(!res||!q) throw new Error('NO MARKET DATA');

      const rows=[];
      (res.timestamp||[]).forEach((t,i)=>{
        const close=q.close?.[i];
        if(Number.isFinite(close)) rows.push({time:t,value:close});
      });

      if(rows.length<2) throw new Error('NOT ENOUGH HISTORY');
      return rows;
    })();

    historyCache.set(cacheKey,task);
    try{return await task}catch(e){historyCache.delete(cacheKey);throw e}
  }

  function aggregate4H(rows){
    if(!Array.isArray(rows)||!rows.length) return [];
    const bucketSeconds=4*60*60;
    const out=[];
    let bucket=null;
    let last=null;

    for(const row of rows){
      const nextBucket=Math.floor(row.time/bucketSeconds)*bucketSeconds;
      if(bucket!==null && nextBucket!==bucket && last) out.push({time:last.time,value:last.value});
      bucket=nextBucket;
      last=row;
    }
    if(last) out.push({time:last.time,value:last.value});
    return out;
  }

  function rangeData(all,range){
    if(!Array.isArray(all)||!all.length) return [];
    const last=all[all.length-1].time;
    if(range==='1D'){
      const rows=all.filter(x=>x.time>=last-24*60*60);
      const hourly=[];
      for(const row of rows){
        const wholeHour=Math.floor(row.time/3600)*3600;
        const prev=hourly[hourly.length-1];
        if(prev&&prev.time===wholeHour) prev.value=row.value;
        else hourly.push({time:wholeHour,value:row.value});
      }
      return hourly;
    }
    if(range==='5D'){
      const now=new Date();
      const start=new Date(now.getFullYear(),now.getMonth(),now.getDate()-4,0,0,0,0).getTime()/1000;
      const end=Date.now()/1000;
      return aggregate4H(all.filter(x=>x.time>=start&&x.time<=end));
    }
    return all;
  }

  function destroyChart(){
    if(resizeObserver){resizeObserver.disconnect();resizeObserver=null}
    if(chartApi){try{chartApi.remove()}catch(_){}chartApi=null}
  }

  function timeToDate(time){
    if(typeof time==='number'&&Number.isFinite(time)) return new Date(time*1000);
    if(typeof time==='string') return new Date(`${time}T00:00:00Z`);
    if(time&&typeof time==='object'&&Number.isFinite(time.year)&&Number.isFinite(time.month)&&Number.isFinite(time.day)){
      return new Date(Date.UTC(time.year,time.month-1,time.day));
    }
    return null;
  }

  function oneDayTickText(time){
    const d=timeToDate(time);
    if(!d||Number.isNaN(d.getTime())) return '';
    return `${String(d.getUTCHours()).padStart(2,'0')}:00`;
  }

  function oneMonthTickText(time){
    const d=timeToDate(time);
    if(!d||Number.isNaN(d.getTime())) return '';
    const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return `${String(d.getUTCDate()).padStart(2,'0')} ${months[d.getUTCMonth()]}`;
  }

  function measureDateText(time){
    const d=timeToDate(time);
    if(!d||Number.isNaN(d.getTime())) return '—';

    if(typeof activeRange!=='undefined' && activeRange==='1D'){
      return `${String(d.getUTCHours()).padStart(2,'0')}:00`;
    }

    const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    if(typeof activeRange!=='undefined' && activeRange==='5D'){
      return `${String(d.getUTCDate()).padStart(2,'0')} ${months[d.getUTCMonth()]} · ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
    }
    return `${String(d.getUTCDate()).padStart(2,'0')} ${months[d.getUTCMonth()]} '${String(d.getUTCFullYear()).slice(-2)}`;
  }

  function addMeasureTool(container,series,data){
    let enabled=false;
    let dragging=false;
    let start=null;

    container.style.position='relative';

    const button=document.createElement('button');
    button.type='button';
    button.textContent='MEASURE';
    Object.assign(button.style,{
      position:'absolute',top:'10px',right:'10px',zIndex:'20',
      height:'32px',padding:'0 12px',border:'1px solid #3a505b',borderRadius:'7px',
      background:'rgba(5,11,14,.92)',color:'#c8d0d4',font:'18px "Bebas Neue",sans-serif',
      letterSpacing:'1px',cursor:'pointer'
    });
    container.appendChild(button);

    const box=document.createElement('div');
    Object.assign(box.style,{
      position:'absolute',display:'none',zIndex:'15',pointerEvents:'none',
      border:'1px solid rgba(41,98,255,.95)',background:'rgba(41,98,255,.18)'
    });
    container.appendChild(box);

    const hLine=document.createElement('div');
    Object.assign(hLine.style,{
      position:'absolute',display:'none',zIndex:'16',pointerEvents:'none',height:'1px',
      background:'#2962ff'
    });
    container.appendChild(hLine);

    const startVLine=document.createElement('div');
    Object.assign(startVLine.style,{
      position:'absolute',display:'none',zIndex:'16',pointerEvents:'none',width:'1px',
      borderLeft:'1px dashed rgba(41,98,255,.9)',top:'0',bottom:'28px'
    });
    container.appendChild(startVLine);

    const endVLine=document.createElement('div');
    Object.assign(endVLine.style,{
      position:'absolute',display:'none',zIndex:'16',pointerEvents:'none',width:'1px',
      borderLeft:'1px dashed rgba(41,98,255,.9)',top:'0',bottom:'28px'
    });
    container.appendChild(endVLine);

    const label=document.createElement('div');
    Object.assign(label.style,{
      position:'absolute',display:'none',zIndex:'17',pointerEvents:'none',
      minWidth:'92px',padding:'6px 10px',borderRadius:'6px',textAlign:'center',
      background:'#2962ff',color:'#fff',font:'22px "Bebas Neue",sans-serif',
      letterSpacing:'1px',boxShadow:'0 2px 12px rgba(0,0,0,.35)'
    });
    container.appendChild(label);

    function makeDateLabel(){
      const el=document.createElement('div');
      Object.assign(el.style,{
        position:'absolute',display:'none',zIndex:'19',pointerEvents:'none',bottom:'0',
        padding:'5px 9px',borderRadius:'4px',whiteSpace:'nowrap',
        background:'#2962ff',color:'#fff',font:'18px "Bebas Neue",sans-serif',
        letterSpacing:'.5px',boxShadow:'0 2px 10px rgba(0,0,0,.35)'
      });
      container.appendChild(el);
      return el;
    }

    const startDateLabel=makeDateLabel();
    const endDateLabel=makeDateLabel();

    function setMeasureMode(on){
      enabled=on;
      button.style.borderColor=on?'#00e6b3':'#3a505b';
      button.style.color=on?'#00e6b3':'#c8d0d4';
      button.style.background=on?'rgba(0,230,179,.08)':'rgba(5,11,14,.92)';
      container.style.cursor=on?'crosshair':'';
      chartApi?.applyOptions({handleScroll:{mouseWheel:true,pressedMouseMove:!on,horzTouchDrag:true,vertTouchDrag:false}});
      if(!on){dragging=false;}
    }

    function pointFromEvent(e){
      const r=container.getBoundingClientRect();
      const rawX=Math.max(0,Math.min(r.width,e.clientX-r.left));
      const y=Math.max(0,Math.min(r.height,e.clientY-r.top));
      const price=series.coordinateToPrice(y);
      let x=rawX;
      let time=chartApi?.timeScale().coordinateToTime(rawX) ?? null;

      const logical=chartApi?.timeScale().coordinateToLogical(rawX);
      if(Number.isFinite(logical)&&Array.isArray(data)&&data.length){
        const index=Math.max(0,Math.min(data.length-1,Math.round(logical)));
        const row=data[index];
        if(row){
          time=row.time;
          const snapped=chartApi?.timeScale().timeToCoordinate(row.time);
          if(Number.isFinite(snapped)) x=snapped;
        }
      }
      return {x,y,price,time};
    }

    function positionDateLabel(el,point,prefix){
      if(!point||point.time==null){el.style.display='none';return;}
      el.textContent=`${prefix} · ${measureDateText(point.time)}`;
      el.style.display='block';
      const w=el.offsetWidth||92;
      const x=Math.min(container.clientWidth-w-3,Math.max(3,point.x-w/2));
      el.style.left=`${x}px`;
    }

    function showStartAnchor(point){
      if(!point) return;
      startVLine.style.display='block';
      startVLine.style.left=`${point.x}px`;
      positionDateLabel(startDateLabel,point,'A');
    }

    function clearMeasure(){
      box.style.display='none';
      hLine.style.display='none';
      startVLine.style.display='none';
      endVLine.style.display='none';
      label.style.display='none';
      startDateLabel.style.display='none';
      endDateLabel.style.display='none';
    }

    function drawMeasure(a,b){
      if(!Number.isFinite(a?.price)||!Number.isFinite(b?.price)||a.price===0) return;
      const left=Math.min(a.x,b.x), right=Math.max(a.x,b.x);
      const top=Math.min(a.y,b.y), bottom=Math.max(a.y,b.y);
      const pct=(b.price/a.price-1)*100;

      showStartAnchor(a);
      endVLine.style.display='block';
      endVLine.style.left=`${b.x}px`;
      positionDateLabel(endDateLabel,b,'B');

      box.style.display='block';
      box.style.left=`${left}px`;
      box.style.top=`${top}px`;
      box.style.width=`${Math.max(1,right-left)}px`;
      box.style.height=`${Math.max(1,bottom-top)}px`;

      hLine.style.display='block';
      hLine.style.left=`${left}px`;
      hLine.style.top=`${b.y}px`;
      hLine.style.width=`${Math.max(1,right-left)}px`;

      label.style.display='block';
      label.textContent=`${pct>=0?'+':''}${pct.toFixed(2)}%`;
      label.style.background=pct>=0?'#087f63':'#b4233a';
      const labelX=Math.min(container.clientWidth-105,Math.max(6,(left+right)/2-46));
      const labelY=Math.max(6,top-40);
      label.style.left=`${labelX}px`;
      label.style.top=`${labelY}px`;
    }

    button.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      setMeasureMode(!enabled);
      if(!enabled) clearMeasure();
    });

    container.addEventListener('pointerdown',e=>{
      if(!enabled||e.button!==0) return;
      e.preventDefault();
      e.stopPropagation();
      clearMeasure();
      start=pointFromEvent(e);
      showStartAnchor(start);
      dragging=true;
      container.setPointerCapture?.(e.pointerId);
    },true);

    container.addEventListener('pointermove',e=>{
      if(!enabled||!dragging||!start) return;
      e.preventDefault();
      e.stopPropagation();
      drawMeasure(start,pointFromEvent(e));
    },true);

    container.addEventListener('pointerup',e=>{
      if(!enabled||!dragging||!start) return;
      e.preventDefault();
      e.stopPropagation();
      drawMeasure(start,pointFromEvent(e));
      dragging=false;
      try{container.releasePointerCapture?.(e.pointerId)}catch(_){}
    },true);

    container.addEventListener('pointercancel',()=>{dragging=false},true);

    window.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&enabled){
        clearMeasure();
        setMeasureMode(false);
      }
    },{once:false});
  }

  renderChart = async function(item){
    if(!item) return;
    const token=++renderToken;
    const host=document.getElementById('chartHost');
    destroyChart();
    host.innerHTML='<div class="empty-note">LOADING CHART…</div>';

    try{
      await loadLightweightCharts();
      const history=await fetchHistory(item,activeRange);
      if(token!==renderToken) return;
      const data=rangeData(history,activeRange);
      if(data.length<2) throw new Error('NOT ENOUGH RANGE DATA');

      host.innerHTML='';
      const container=document.createElement('div');
      container.style.width='100%';
      container.style.height='100%';
      host.appendChild(container);

      const LC=window.LightweightCharts;
      const showTime=activeRange==='1D';

      chartApi=LC.createChart(container,{
        autoSize:true,
        layout:{
          background:{type:LC.ColorType.Solid,color:'#050b0e'},
          textColor:'#c8d0d4',
          fontFamily:'Trebuchet MS',
          fontSize:18,
          attributionLogo:false
        },
        grid:{
          vertLines:{color:'rgba(120,145,155,.08)'},
          horzLines:{color:'rgba(120,145,155,.10)'}
        },
        rightPriceScale:{
          visible:true,
          borderVisible:true,
          borderColor:'#33444c',
          scaleMargins:{top:.08,bottom:.08}
        },
        leftPriceScale:{visible:false},
        timeScale:{
          borderVisible:true,
          borderColor:'#33444c',
          timeVisible:showTime,
          secondsVisible:false,
          tickMarkFormatter:activeRange==='1D'?((time)=>oneDayTickText(time)):activeRange==='1M'?((time)=>oneMonthTickText(time)):undefined,
          rightOffset:2,
          barSpacing:activeRange==='1D'?28:activeRange==='5D'?22:7,
          minBarSpacing:activeRange==='1D'?12:activeRange==='5D'?10:2,
          fixLeftEdge:true,
          fixRightEdge:true
        },
        crosshair:{
          mode:LC.CrosshairMode.Normal,
          vertLine:{color:'rgba(210,220,225,.25)',width:1,style:LC.LineStyle.Dashed,labelBackgroundColor:'#2962ff'},
          horzLine:{color:'rgba(210,220,225,.25)',width:1,style:LC.LineStyle.Dashed,labelBackgroundColor:'#2962ff'}
        },
        handleScroll:{mouseWheel:true,pressedMouseMove:true,horzTouchDrag:true,vertTouchDrag:false},
        handleScale:{axisPressedMouseMove:true,mouseWheel:true,pinch:true}
      });

      const series=chartApi.addSeries(LC.AreaSeries,{
        lineColor:'#2962ff',
        lineWidth:4,
        topColor:'rgba(41,98,255,.28)',
        bottomColor:'rgba(41,98,255,.02)',
        priceLineVisible:true,
        priceLineColor:'#2962ff',
        priceLineWidth:1,
        lastValueVisible:true,
        crosshairMarkerVisible:true,
        crosshairMarkerRadius:4,
        priceFormat:{type:'price',precision:2,minMove:.01}
      });

      series.setData(data);
      chartApi.timeScale().fitContent();
      addMeasureTool(container,series,data);

      resizeObserver=new ResizeObserver(()=>{
        if(chartApi) chartApi.applyOptions({width:container.clientWidth,height:container.clientHeight});
      });
      resizeObserver.observe(container);
    }catch(e){
      if(token!==renderToken) return;
      destroyChart();
      host.innerHTML='<div class="empty-note">CHART DATA UNAVAILABLE</div>';
      console.error(e);
    }
  };

  renderChart(selected());
})();