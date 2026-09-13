(() => {
  const MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const originalRenderChart=renderChart;
  let axisToken=0;
  let oneDayClockTimer=null;

  function removeFiveDayAxis(){
    document.getElementById('fiveDayAxisOverlay')?.remove();
  }

  function removeOneMonthAxis(){
    document.getElementById('oneMonthAxisOverlay')?.remove();
  }

  function removeOneDayAxis(){
    document.getElementById('oneDayLocalAxisOverlay')?.remove();
    if(oneDayClockTimer){
      clearInterval(oneDayClockTimer);
      oneDayClockTimer=null;
    }
  }

  function formatDay(timestamp){
    const d=new Date(timestamp*1000);
    return `${String(d.getUTCDate()).padStart(2,'0')} ${MONTHS[d.getUTCMonth()]}`;
  }

  // 5D includes today plus the previous four calendar days.
  // Example on 13 Sep: 09 SEP · 10 SEP · 11 SEP · 12 SEP · 13 SEP.
  function getFiveCalendarDays(){
    const now=new Date();
    const todayUtc=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())/1000;
    const day=24*60*60;
    return [4,3,2,1,0].map(n=>todayUtc-n*day);
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
        font:'18px "Trebuchet MS",sans-serif',fontWeight:'700'
      });
      overlay.appendChild(label);
    }
    host.appendChild(overlay);
  }

  function getOneMonthLabels(){
    const now=new Date();
    const end=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const start=new Date(end);
    start.setMonth(start.getMonth()-1);

    const labels=[];
    const cursor=new Date(start);
    while(cursor<=end){
      labels.push(Date.UTC(cursor.getFullYear(),cursor.getMonth(),cursor.getDate())/1000);
      cursor.setDate(cursor.getDate()+3);
    }

    const endUtc=Date.UTC(end.getFullYear(),end.getMonth(),end.getDate())/1000;
    if(labels[labels.length-1]!==endUtc) labels.push(endUtc);
    return labels;
  }

  function drawOneMonthAxis(days){
    removeOneMonthAxis();
    const host=document.getElementById('chartHost');
    if(!host||!days.length) return;
    host.style.position='relative';

    const overlay=document.createElement('div');
    overlay.id='oneMonthAxisOverlay';
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
        font:'18px "Trebuchet MS",sans-serif',fontWeight:'700'
      });
      overlay.appendChild(label);
    }
    host.appendChild(overlay);
  }

  function isCrypto(item){
    const type=String(item?.type||'').toUpperCase();
    const symbol=String(item?.yahoo||item?.ticker||'').toUpperCase();
    return type==='CRYPTO'||symbol==='BTC-USD'||symbol==='BTCUSD'||symbol==='ETH-USD';
  }

  function oneDayHourLabels(){
    const now=new Date();
    now.setMinutes(0,0,0);
    const labels=[];
    for(let hoursAgo=24;hoursAgo>=0;hoursAgo-=3){
      const d=new Date(now.getTime()-hoursAgo*60*60*1000);
      labels.push(`${String(d.getHours()).padStart(2,'0')}:00`);
    }
    return labels;
  }

  function drawOneDayCryptoAxis(){
    removeOneDayAxis();
    const item=typeof selected==='function'?selected():null;
    if(activeRange!=='1D'||!isCrypto(item)) return;

    const host=document.getElementById('chartHost');
    if(!host) return;
    host.style.position='relative';

    const labels=oneDayHourLabels();
    const overlay=document.createElement('div');
    overlay.id='oneDayLocalAxisOverlay';
    Object.assign(overlay.style,{
      position:'absolute',left:'0',right:'0',bottom:'0',height:'36px',zIndex:'31',
      display:'grid',gridTemplateColumns:`repeat(${labels.length},1fr)`,alignItems:'center',
      background:'#050b0e',borderTop:'1px solid #33444c',pointerEvents:'none',
      padding:'0 66px 0 26px',boxSizing:'border-box'
    });

    labels.forEach(text=>{
      const label=document.createElement('div');
      label.textContent=text;
      Object.assign(label.style,{
        textAlign:'center',whiteSpace:'nowrap',color:'#c8d0d4',
        font:'18px "Trebuchet MS",sans-serif',fontWeight:'700'
      });
      overlay.appendChild(label);
    });

    host.appendChild(overlay);
    oneDayClockTimer=setInterval(()=>{
      if(activeRange!=='1D'||!isCrypto(typeof selected==='function'?selected():null)){
        removeOneDayAxis();
        return;
      }
      const next=oneDayHourLabels();
      const cells=overlay.children;
      for(let i=0;i<cells.length&&i<next.length;i++) cells[i].textContent=next[i];
    },60000);
  }

  renderChart=async function(item){
    const token=++axisToken;
    removeFiveDayAxis();
    removeOneMonthAxis();
    removeOneDayAxis();
    await originalRenderChart(item);
    if(token!==axisToken) return;

    if(activeRange==='5D'){
      drawFiveDayAxis(getFiveCalendarDays());
      return;
    }

    if(activeRange==='1M'){
      drawOneMonthAxis(getOneMonthLabels());
      return;
    }

    if(activeRange==='1D'&&isCrypto(item)){
      drawOneDayCryptoAxis();
    }
  };
})();