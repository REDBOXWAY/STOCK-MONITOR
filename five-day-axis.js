(() => {
  const MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const originalRenderChart=renderChart;
  let axisToken=0;

  function removeFiveDayAxis(){
    document.getElementById('fiveDayAxisOverlay')?.remove();
  }

  function formatDay(timestamp){
    const d=new Date(timestamp*1000);
    return `${String(d.getUTCDate()).padStart(2,'0')} ${MONTHS[d.getUTCMonth()]}`;
  }

  async function getFiveDistinctDays(item){
    const symbol=encodeURIComponent(item?.yahoo||item?.ticker||'');
    if(!symbol) return [];
    const r=await fetch(`https://stock-monitor-umber.vercel.app/api/history?symbol=${symbol}&range=1mo&interval=1h&_=${Date.now()}`,{cache:'no-store',mode:'cors'});
    if(!r.ok) throw new Error(`5D AXIS ${r.status}`);
    const d=await r.json();
    const times=d?.chart?.result?.[0]?.timestamp||[];
    const unique=[];
    const seen=new Set();
    for(let i=times.length-1;i>=0;i--){
      const t=times[i];
      const z=new Date(t*1000);
      const key=`${z.getUTCFullYear()}-${z.getUTCMonth()}-${z.getUTCDate()}`;
      if(seen.has(key)) continue;
      seen.add(key);
      unique.push(t);
      if(unique.length===5) break;
    }
    return unique.reverse();
  }

  function drawFiveDayAxis(days){
    removeFiveDayAxis();
    const host=document.getElementById('chartHost');
    if(!host||!days.length) return;
    host.style.position='relative';

    const overlay=document.createElement('div');
    overlay.id='fiveDayAxisOverlay';
    Object.assign(overlay.style,{
      position:'absolute',left:'0',right:'0',bottom:'0',height:'36px',zIndex:'30',
      display:'grid',gridTemplateColumns:`repeat(${days.length},1fr)`,alignItems:'center',
      background:'#050b0e',borderTop:'1px solid #33444c',pointerEvents:'none',
      padding:'0 18px',boxSizing:'border-box'
    });

    for(const t of days){
      const label=document.createElement('div');
      label.textContent=formatDay(t);
      Object.assign(label.style,{
        textAlign:'center',whiteSpace:'nowrap',color:'#c8d0d4',
        font:'18px "Bebas Neue",sans-serif',letterSpacing:'.5px'
      });
      overlay.appendChild(label);
    }
    host.appendChild(overlay);
  }

  renderChart=async function(item){
    const token=++axisToken;
    removeFiveDayAxis();
    await originalRenderChart(item);
    if(token!==axisToken||activeRange!=='5D') return;
    try{
      const days=await getFiveDistinctDays(item);
      if(token!==axisToken||activeRange!=='5D') return;
      drawFiveDayAxis(days);
    }catch(e){
      console.error(e);
    }
  };
})();