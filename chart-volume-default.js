(() => {
  renderChart = async function(item){
    if(!item)return;
    const token=++chartLoadToken;
    const h=document.getElementById('chartHost');
    h.innerHTML='<div class="empty-note">LOADING CHART…</div>';
    try{
      await loadScript('https://s3.tradingview.com/tv.js');
      if(token!==chartLoadToken)return;
      const cfg=RANGE_MAP.find(x=>x[1]===activeRange)||RANGE_MAP[3];
      h.innerHTML='<div id="tvChart" style="height:100%;width:100%"></div>';
      new TradingView.widget({
        autosize:true,
        symbol:item.tv,
        interval:cfg[2],
        range:cfg[1],
        timezone:'Etc/UTC',
        theme:'dark',
        style:'3',
        locale:'en',
        enable_publishing:false,
        hide_top_toolbar:true,
        hide_legend:false,
        hide_volume:true,
        save_image:false,
        backgroundColor:'#050b0e',
        gridColor:'rgba(120,145,155,.10)',
        overrides:{
          'scalesProperties.fontSize':18
        },
        container_id:'tvChart'
      });
    }catch{
      h.innerHTML='<div class="empty-note">TRADINGVIEW CHART COULD NOT BE LOADED.</div>';
    }
  };

  renderChart(selected());
})();
