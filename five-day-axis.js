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

  // One shared 5D calendar for every instrument.
  // Example on 13 Sep: 08 SEP · 09 SEP · 10 SEP · 11 SEP · 12 SEP.
  function getFiveCalendarDays(){
    const now=new Date();
    const todayUtc=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())/1000;
    const day=24*60*60;
    return [5,4,3,2,1].map(n=>todayUtc-n*day);
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
    drawFiveDayAxis(getFiveCalendarDays());
  };
})();