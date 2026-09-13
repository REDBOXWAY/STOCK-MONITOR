(() => {
  const MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  let installed=false;

  function asDate(time){
    if(typeof time==='number'&&Number.isFinite(time)) return new Date(time*1000);
    if(typeof time==='string') return new Date(`${time}T00:00:00Z`);
    if(time&&typeof time==='object'&&Number.isFinite(time.year)&&Number.isFinite(time.month)&&Number.isFinite(time.day)){
      return new Date(Date.UTC(time.year,time.month-1,time.day));
    }
    return null;
  }

  function isCalendarRange(){
    return typeof activeRange!=='undefined'&&(activeRange==='6M'||activeRange==='YTD');
  }

  function install(){
    if(installed) return true;
    const LC=window.LightweightCharts;
    if(!LC||typeof LC.createChart!=='function') return false;
    if(LC.__stockMonitorSixMonthCustomAxis) return true;

    const originalCreateChart=LC.createChart.bind(LC);

    const wrappedCreateChart=function(container,options={}){
      if(!isCalendarRange()){
        return originalCreateChart(container,options);
      }

      container.style.position='relative';

      const api=originalCreateChart(container,{
        ...options,
        timeScale:{
          ...(options.timeScale||{}),
          tickMarkFormatter:()=>''
        }
      });

      let data=[];
      let drawQueued=false;
      let crosshairX=null;

      const overlay=document.createElement('div');
      Object.assign(overlay.style,{
        position:'absolute',
        left:'0',right:'0',bottom:'0',height:'32px',
        zIndex:'8',pointerEvents:'none',overflow:'hidden'
      });
      container.appendChild(overlay);

      function formatDate(row){
        const d=asDate(row?.time);
        if(!d||Number.isNaN(d.getTime())) return '';
        return `${String(d.getUTCDate()).padStart(2,'0')} ${MONTHS[d.getUTCMonth()]}`;
      }

      function addLabel(text,x){
        if(!text||!Number.isFinite(x)) return;
        const el=document.createElement('div');
        el.textContent=text;
        el.dataset.axisX=String(x);
        Object.assign(el.style,{
          position:'absolute',top:'5px',left:`${x}px`,transform:'translateX(-50%)',
          whiteSpace:'nowrap',color:'#c8d0d4',font:'600 18px Trebuchet MS, sans-serif',
          lineHeight:'22px'
        });
        overlay.appendChild(el);
      }

      function hideNearCrosshair(){
        for(const el of overlay.children){
          const x=Number(el.dataset.axisX);
          el.style.visibility=Number.isFinite(crosshairX)&&Math.abs(x-crosshairX)<75?'hidden':'visible';
        }
      }

      function monthLabels(startIndex,endIndex){
        const groups=[];
        let current=null;
        for(let i=startIndex;i<=endIndex;i++){
          const d=asDate(data[i]?.time);
          if(!d) continue;
          const key=`${d.getUTCFullYear()}-${d.getUTCMonth()}`;
          if(!current||current.key!==key){
            current={key,month:d.getUTCMonth(),indices:[i]};
            groups.push(current);
          }else current.indices.push(i);
        }
        for(const g of groups){
          const idx=g.indices[Math.floor(g.indices.length/2)];
          const x=api.timeScale().timeToCoordinate(data[idx].time);
          addLabel(MONTHS[g.month],x);
        }
      }

      function dateLabels(startIndex,endIndex,step){
        const candidates=[];
        for(let i=startIndex;i<=endIndex;i+=step) candidates.push(i);
        if(candidates[candidates.length-1]!==endIndex) candidates.push(endIndex);

        let lastX=-Infinity;
        for(const idx of candidates){
          const x=api.timeScale().timeToCoordinate(data[idx]?.time);
          if(!Number.isFinite(x)||x-lastX<62) continue;
          addLabel(formatDate(data[idx]),x);
          lastX=x;
        }
      }

      function draw(){
        drawQueued=false;
        overlay.innerHTML='';
        if(!Array.isArray(data)||!data.length) return;

        let range=null;
        try{range=api.timeScale().getVisibleLogicalRange()}catch(_){}
        if(!range||!Number.isFinite(range.from)||!Number.isFinite(range.to)) return;

        const startIndex=Math.max(0,Math.floor(range.from));
        const endIndex=Math.min(data.length-1,Math.ceil(range.to));
        if(endIndex<startIndex) return;

        const visibleBars=Math.max(1,range.to-range.from);

        if(visibleBars>90){
          monthLabels(startIndex,endIndex);
        }else if(visibleBars>45){
          dateLabels(startIndex,endIndex,10);
        }else if(visibleBars>20){
          dateLabels(startIndex,endIndex,5);
        }else{
          dateLabels(startIndex,endIndex,1);
        }

        hideNearCrosshair();
      }

      function queueDraw(){
        if(drawQueued) return;
        drawQueued=true;
        requestAnimationFrame(draw);
      }

      const originalAddSeries=api.addSeries.bind(api);
      api.addSeries=function(){
        const series=originalAddSeries(...arguments);
        if(series&&typeof series.setData==='function'){
          const originalSetData=series.setData.bind(series);
          series.setData=function(rows){
            data=Array.isArray(rows)?rows.slice():[];
            const result=originalSetData(rows);
            queueDraw();
            return result;
          };
        }
        return series;
      };

      try{api.timeScale().subscribeVisibleLogicalRangeChange(queueDraw)}catch(_){}
      try{
        api.subscribeCrosshairMove(param=>{
          crosshairX=param?.point&&Number.isFinite(param.point.x)?param.point.x:null;
          hideNearCrosshair();
        });
      }catch(_){}

      try{
        const ro=new ResizeObserver(queueDraw);
        ro.observe(container);
      }catch(_){}

      setTimeout(queueDraw,0);
      return api;
    };

    let applied=false;
    try{
      LC.createChart=wrappedCreateChart;
      applied=LC.createChart===wrappedCreateChart;
    }catch(_){}

    if(!applied){
      try{
        window.LightweightCharts={
          ...LC,
          createChart:wrappedCreateChart,
          __stockMonitorSixMonthCustomAxis:true
        };
        applied=window.LightweightCharts.createChart===wrappedCreateChart;
      }catch(_){}
    }else{
      try{LC.__stockMonitorSixMonthCustomAxis=true}catch(_){}
    }

    installed=applied;
    return applied;
  }

  if(!install()){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      if(install()||attempts>=200) clearInterval(timer);
    },25);
  }
})();
