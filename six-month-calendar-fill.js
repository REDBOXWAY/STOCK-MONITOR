(() => {
  const MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const MONTH_INDEX=Object.fromEntries(MONTHS.map((m,i)=>[m,i]));
  let timer=null;

  function parseLabel(text){
    const m=String(text||'').trim().match(/^(\d{2})\s+([A-Z]{3})$/);
    if(!m||MONTH_INDEX[m[2]]==null) return null;
    const now=new Date();
    const month=MONTH_INDEX[m[2]];
    const year=month<=now.getUTCMonth()?now.getUTCFullYear():now.getUTCFullYear()-1;
    return {day:Number(m[1]),month,year};
  }

  function stamp(p){
    return Date.UTC(p.year,p.month,p.day)/86400000;
  }

  function textFromStamp(s){
    const d=new Date(s*86400000);
    return `${String(d.getUTCDate()).padStart(2,'0')} ${MONTHS[d.getUTCMonth()]}`;
  }

  function fill(){
    timer=null;
    if(typeof activeRange==='undefined'||activeRange!=='6M') return;
    const host=document.getElementById('chartHost');
    if(!host) return;

    const parents=new Set([...host.querySelectorAll('[data-axis-x]')].map(el=>el.parentElement).filter(Boolean));
    for(const parent of parents){
      for(const old of [...parent.querySelectorAll('[data-calendar-fill="1"]')]) old.remove();

      const labels=[...parent.children]
        .filter(el=>el.dataset?.axisX && el.dataset.calendarFill!=='1' && parseLabel(el.textContent))
        .sort((a,b)=>Number(a.dataset.axisX)-Number(b.dataset.axisX));

      for(let i=0;i<labels.length-1;i++){
        const a=labels[i], b=labels[i+1];
        const pa=parseLabel(a.textContent), pb=parseLabel(b.textContent);
        if(!pa||!pb) continue;
        const sa=stamp(pa), sb=stamp(pb);
        const gap=sb-sa;
        const xa=Number(a.dataset.axisX), xb=Number(b.dataset.axisX);
        if(!Number.isFinite(xa)||!Number.isFinite(xb)||gap<=1) continue;

        const pixelsPerDay=(xb-xa)/gap;
        if(pixelsPerDay<62) continue;

        for(let n=1;n<gap;n++){
          const x=xa+(xb-xa)*(n/gap);
          const el=a.cloneNode(false);
          el.textContent=textFromStamp(sa+n);
          el.dataset.axisX=String(x);
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
