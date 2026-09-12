(() => {
  const LWC_SRC = 'https://cdn.jsdelivr.net/npm/lightweight-charts@5.2.1/dist/lightweight-charts.standalone.production.js';
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

  async function fetchHistory(item){
    const key=item.yahoo||item.ticker;
    if(historyCache.has(key)) return historyCache.get(key);
    const task=(async()=>{
      const symbol=encodeURIComponent(key);
      const url=`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=max&interval=1d&includePrePost=false&events=div%2Csplits`;
      const r=await fetch(url,{cache:'no-store'});
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
    historyCache.set(key,task);
    try{return await task}catch(e){historyCache.delete(key);throw e}
  }

  function subtractYears(ts,years){
    const d=new Date(ts*1000);
    d.setUTCFullYear(d.getUTCFullYear()-years);
    return Math.floor(d.getTime()/1000);
  }

  function rangeData(all,range){
    if(!all.length) return all;
    const last=all[all.length-1].time;
    if(range==='ALL') return all;
    if(range==='1D') return all.slice(-2);
    if(range==='5D') return all.slice(-6);
    if(range==='1M') return all.slice(-23);
    if(range==='6M') return all.slice(-132);
    if(range==='12M') return all.filter(x=>x.time>=subtractYears(last,1));
    if(range==='60M') return all.filter(x=>x.time>=subtractYears(last,5));
    if(range==='120M') return all.filter(x=>x.time>=subtractYears(last,10));
    if(range==='YTD'){
      const y=new Date(last*1000).getUTCFullYear();
      const start=Date.UTC(y,0,1)/1000;
      return all.filter(x=>x.time>=start);
    }
    return all;
  }

  function destroyChart(){
    if(resizeObserver){resizeObserver.disconnect();resizeObserver=null}
    if(chartApi){try{chartApi.remove()}catch(_){}chartApi=null}
  }

  function addMeasureTool(container,series){
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

    const vLine=document.createElement('div');
    Object.assign(vLine.style,{
      position:'absolute',display:'none',zIndex:'16',pointerEvents:'none',width:'1px',
      background:'#2962ff'
    });
    container.appendChild(vLine);

    const label=document.createElement('div');
    Object.assign(label.style,{
      position:'absolute',display:'none',zIndex:'17',pointerEvents:'none',
      minWidth:'92px',padding:'6px 10px',borderRadius:'6px',textAlign:'center',
      background:'#2962ff',color:'#fff',font:'22px "Bebas Neue",sans-serif',
      letterSpacing:'1px',boxShadow:'0 2px 12px rgba(0,0,0,.35)'
    });
    container.appendChild(label);

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
      const x=Math.max(0,Math.min(r.width,e.clientX-r.left));
      const y=Math.max(0,Math.min(r.height,e.clientY-r.top));
      const price=series.coordinateToPrice(y);
      return {x,y,price};
    }

    function clearMeasure(){
      box.style.display='none';
      hLine.style.display='none';
      vLine.style.display='none';
      label.style.display='none';
    }

    function drawMeasure(a,b){
      if(!Number.isFinite(a?.price)||!Number.isFinite(b?.price)||a.price===0) return;
      const left=Math.min(a.x,b.x), right=Math.max(a.x,b.x);
      const top=Math.min(a.y,b.y), bottom=Math.max(a.y,b.y);
      const pct=(b.price/a.price-1)*100;

      box.style.display='block';
      box.style.left=`${left}px`;
      box.style.top=`${top}px`;
      box.style.width=`${Math.max(1,right-left)}px`;
      box.style.height=`${Math.max(1,bottom-top)}px`;

      hLine.style.display='block';
      hLine.style.left=`${left}px`;
      hLine.style.top=`${b.y}px`;
      hLine.style.width=`${Math.max(1,right-left)}px`;

      vLine.style.display='block';
      vLine.style.left=`${b.x}px`;
      vLine.style.top=`${top}px`;
      vLine.style.height=`${Math.max(1,bottom-top)}px`;

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
      const history=await fetchHistory(item);
      if(token!==renderToken) return;
      const data=rangeData(history,activeRange);
      if(data.length<2) throw new Error('NOT ENOUGH RANGE DATA');

      host.innerHTML='';
      const container=document.createElement('div');
      container.style.width='100%';
      container.style.height='100%';
      host.appendChild(container);

      const LC=window.LightweightCharts;
      chartApi=LC.createChart(container,{
        autoSize:true,
        layout:{
          background:{type:LC.ColorType.Solid,color:'#050b0e'},
          textColor:'#c8d0d4',
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
          timeVisible:false,
          secondsVisible:false,
          rightOffset:2,
          barSpacing:7,
          minBarSpacing:2,
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
        lineWidth:2,
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
      addMeasureTool(container,series);

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
