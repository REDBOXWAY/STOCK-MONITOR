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

  function install(){
    if(installed) return true;
    const LC=window.LightweightCharts;
    if(!LC||typeof LC.createChart!=='function') return false;
    if(LC.__stockMonitorSixMonthAxisV2) return true;

    const originalCreateChart=LC.createChart.bind(LC);

    const wrappedCreateChart=function(container,options={}){
      if(typeof activeRange==='undefined'||activeRange!=='6M'){
        return originalCreateChart(container,options);
      }

      let mode='MONTH';

      const monthFormatter=(time)=>{
        const d=asDate(time);
        if(!d||Number.isNaN(d.getTime())) return '';
        return MONTHS[d.getUTCMonth()];
      };

      const dateFormatter=(time)=>{
        const d=asDate(time);
        if(!d||Number.isNaN(d.getTime())) return '';
        return `${String(d.getUTCDate()).padStart(2,'0')} ${MONTHS[d.getUTCMonth()]}`;
      };

      const api=originalCreateChart(container,{
        ...options,
        timeScale:{
          ...(options.timeScale||{}),
          tickMarkFormatter:monthFormatter
        }
      });

      const updateAxisMode=()=>{
        let visibleBars=999;
        try{
          const range=api.timeScale().getVisibleLogicalRange();
          if(range&&Number.isFinite(range.from)&&Number.isFinite(range.to)) visibleBars=range.to-range.from;
        }catch(_){}

        const nextMode=visibleBars>90?'MONTH':'DATE';
        if(nextMode===mode) return;
        mode=nextMode;

        try{
          api.timeScale().applyOptions({
            tickMarkFormatter:mode==='MONTH'?monthFormatter:dateFormatter
          });
        }catch(_){}
      };

      try{
        api.timeScale().subscribeVisibleLogicalRangeChange(updateAxisMode);
      }catch(_){}

      setTimeout(updateAxisMode,0);
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
          __stockMonitorSixMonthAxisV2:true
        };
        applied=window.LightweightCharts.createChart===wrappedCreateChart;
      }catch(_){}
    }else{
      try{LC.__stockMonitorSixMonthAxisV2=true}catch(_){}
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
