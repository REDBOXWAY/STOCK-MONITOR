(() => {
  const MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  let patched=false;

  function timeToDate(time){
    if(typeof time==='number'&&Number.isFinite(time)) return new Date(time*1000);
    if(typeof time==='string') return new Date(`${time}T00:00:00Z`);
    if(time&&typeof time==='object'&&Number.isFinite(time.year)&&Number.isFinite(time.month)&&Number.isFinite(time.day)){
      return new Date(Date.UTC(time.year,time.month-1,time.day));
    }
    return null;
  }

  function isCryptoSelected(){
    try{
      const item=typeof selected==='function'?selected():null;
      const type=String(item?.type||'').toUpperCase();
      const symbol=String(item?.yahoo||item?.ticker||'').toUpperCase();
      return type==='CRYPTO'||symbol==='BTC-USD'||symbol==='BTCUSD'||symbol==='ETH-USD';
    }catch(_){return false}
  }

  function crosshairText(time){
    const d=timeToDate(time);
    if(!d||Number.isNaN(d.getTime())) return '';

    const date=`${String(d.getUTCDate()).padStart(2,'0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    const range=typeof activeRange!=='undefined'?activeRange:'';

    if(range==='1D'){
      const hours=isCryptoSelected()?d.getHours():d.getUTCHours();
      const minutes=isCryptoSelected()?d.getMinutes():d.getUTCMinutes();
      return `${date} · ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
    }

    if(range==='5D'){
      return `${date} · ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
    }

    return date;
  }

  function install(){
    const LC=window.LightweightCharts;
    if(!LC||typeof LC.createChart!=='function') return false;
    if(LC.__stockMonitorCrosshairFullDate) return true;

    const originalCreateChart=LC.createChart.bind(LC);
    const wrappedCreateChart=function(container,options={}){
      return originalCreateChart(container,{
        ...options,
        localization:{
          ...(options.localization||{}),
          timeFormatter:crosshairText,
          dateFormat:'dd MMM yyyy'
        }
      });
    };

    try{
      LC.createChart=wrappedCreateChart;
      LC.__stockMonitorCrosshairFullDate=true;
    }catch(_){
      try{
        window.LightweightCharts={...LC,createChart:wrappedCreateChart,__stockMonitorCrosshairFullDate:true};
      }catch(__){return false}
    }

    patched=true;
    return true;
  }

  if(!install()){
    const originalAppend=document.head.appendChild.bind(document.head);
    document.head.appendChild=function(node){
      if(node&&node.tagName==='SCRIPT'&&String(node.src||'').includes('lightweight-charts')){
        node.addEventListener('load',install,{once:true});
      }
      return originalAppend(node);
    };

    let attempts=0;
    const timer=setInterval(()=>{
      attempts+=1;
      if(install()||attempts>=200) clearInterval(timer);
    },25);
  }
})();
