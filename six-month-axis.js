(() => {
  const months=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  let done=false;
  function asDate(t){
    if(typeof t==='number') return new Date(t*1000);
    if(typeof t==='string') return new Date(t+'T00:00:00Z');
    if(t&&t.year) return new Date(Date.UTC(t.year,t.month-1,t.day));
    return null;
  }
  function install(){
    if(done||!window.LightweightCharts?.createChart) return false;
    const LC=window.LightweightCharts;
    const original=LC.createChart.bind(LC);
    LC.createChart=(container,options={})=>{
      if(typeof activeRange==='undefined'||activeRange!=='6M') return original(container,options);
      let api=null;
      const formatter=(time)=>{
        const d=asDate(time);
        if(!d) return '';
        let span=999;
        try{const r=api?.timeScale().getVisibleLogicalRange();if(r)span=r.to-r.from}catch(_){}
        if(span>90) return months[d.getUTCMonth()];
        return String(d.getUTCDate()).padStart(2,'0')+' '+months[d.getUTCMonth()];
      };
      api=original(container,{...options,timeScale:{...(options.timeScale||{}),tickMarkFormatter:formatter}});
      return api;
    };
    done=true;
    if(typeof activeRange!=='undefined'&&activeRange==='6M'&&typeof renderChart==='function'&&typeof selected==='function') setTimeout(()=>renderChart(selected()),0);
    return true;
  }
  let count=0;
  const timer=setInterval(()=>{count++;if(install()||count>200)clearInterval(timer)},25);
})();
