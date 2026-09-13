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
    if(LC.__stockMonitorSixMonthAxis) return true;

    const originalCreateChart=LC.createChart.bind(LC);

    const wrappedCreateChart=function(container,options={}){
      if(typeof activeRange==='undefined'||activeRange!=='6M'){
        return originalCreateChart(container,options);
      }

      let api=null;
      const formatter=(time)=>{
        const d=asDate(time);
        if(!d||Number.isNaN(d.getTime())) return '';

        let visibleBars=999;
        try{
          const range=api?.timeScale().getVisibleLogicalRange();
          if(range&&Number.isFinite(range.from)&&Number.isFinite(range.to)) visibleBars=range.to-range.from;
        }catch(_){}

        if(visibleBars>90) return MONTHS[d.getUTCMonth()];
        return `${String(d.getUTCDate()).padStart(2,'0')} ${MONTHS[d.getUTCMonth()]}`;
      };

      api=originalCreateChart(container,{
        ...options,
        timeScale:{
          ...(options.timeScale||{}),
          tickMarkFormatter:formatter
        }
      });

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
          __stockMonitorSixMonthAxis:true
        };
        applied=window.LightweightCharts.createChart===wrappedCreateChart;
      }catch(_){}
    }else{
      try{LC.__stockMonitorSixMonthAxis=true}catch(_){}
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
