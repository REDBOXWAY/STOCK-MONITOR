(() => {
  const MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  let timer=null;

  function textFromStamp(s){
    const d=new Date(s*86400000);
    return `${String(d.getUTCDate()).padStart(2,'0')} ${MONTHS[d.getUTCMonth()]}`;
  }

  function supportedRange(){
    return typeof activeRange!=='undefined'&&(
      activeRange==='6M'||activeRange==='YTD'||activeRange==='12M'||activeRange==='60M'||activeRange==='120M'
    );
  }

  function fill(){
    timer=null;
    if(!supportedRange()) return;
    const host=document.getElementById('chartHost');
    if(!host) return;

    const parents=new Set([...host.querySelectorAll('[data-axis-day]')].map(el=>el.parentElement).filter(Boolean));
    for(const parent of parents){
      for(const old of [...parent.querySelectorAll('[data-calendar-fill="1"]')]) old.remove();

      const labels=[...parent.children]
        .filter(el=>el.dataset?.axisX&&el.dataset?.axisDay&&el.dataset.calendarFill!=='1')
        .sort((a,b)=>Number(a.dataset.axisX)-Number(b.dataset.axisX));

      for(let i=0;i<labels.length-1;i++){
        const a=labels[i],b=labels[i+1];
        const sa=Number(a.dataset.axisDay),sb=Number(b.dataset.axisDay);
        const xa=Number(a.dataset.axisX),xb=Number(b.dataset.axisX);
        const gap=sb-sa;
        if(!Number.isFinite(sa)||!Number.isFinite(sb)||!Number.isFinite(xa)||!Number.isFinite(xb)||gap<=1) continue;

        const pixelsPerDay=(xb-xa)/gap;
        if(pixelsPerDay<62) continue;

        for(let n=1;n<gap;n++){
          const stamp=sa+n;
          const x=xa+(xb-xa)*(n/gap);
          const el=a.cloneNode(false);
          el.textContent=textFromStamp(stamp);
          el.dataset.axisX=String(x);
          el.dataset.axisDay=String(stamp);
          el.dataset.calendarFill='1';
          el.style.left=`${x}px`;
          parent.appendChild(el);
        }
      }
    }
  }

  function schedule(){
    clearTimeout(timer);
    timer=setTimeout(fill,40);
  }

  const observer=new MutationObserver(schedule);
  const start=()=>{
    const host=document.getElementById('chartHost');
    if(host){observer.observe(host,{childList:true,subtree:true});schedule();}
    else setTimeout(start,100);
  };
  start();
})();
