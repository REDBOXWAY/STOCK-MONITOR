(() => {
  const MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  let patched=false;
  let attempts=0;

  function timeToDate(time){
    if(typeof time==='number'&&Number.isFinite(time)) return new Date(time*1000);
    if(typeof time==='string') return new Date(`${time}T00:00:00Z`);
    if(time&&typeof time==='object'&&Number.isFinite(time.year)&&Number.isFinite(time.month)&&Number.isFinite(time.day)){
      return new Date(Date.UTC(time.year,time.month-1,time.day));
    }
    return null;
  }

  function fullDate(time){
    const d=timeToDate(time);
    if(!d||Number.isNaN(d.getTime())) return '';
    return `${String(d.getUTCDate()).padStart(2,'0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }

  function install(){
    const LC=window.LightweightCharts;
    if(!LC||typeof LC.createChart!=='function') return false;
    if(patched) return true;

    const originalCreateChart=LC.createChart.bind(LC);
    LC.createChart=function(container,options={}){
      const next={...options};
      if(typeof activeRange!=='undefined'&&activeRange==='1M'){
        next.localization={...(options.localization||{}),timeFormatter:fullDate};
      }
      return originalCreateChart(container,next);
    };

    patched=true;
    return true;
  }

  function ensure(){
    attempts+=1;
    if(install()){
      if(typeof renderChart==='function'&&typeof selected==='function'){
        try{renderChart(selected())}catch(_){}
      }
      return;
    }
    if(attempts<100) setTimeout(ensure,50);
  }

  ensure();
})();
