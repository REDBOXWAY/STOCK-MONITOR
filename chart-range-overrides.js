(() => {
  renderRanges = function(){
    const h=document.getElementById('ranges');
    if(!h) return;
    h.innerHTML='';
    RANGE_MAP
      .filter(([label])=>label!=='ALL')
      .forEach(([label,range])=>{
        const b=document.createElement('button');
        b.className=`range-btn ${range===activeRange?'active':''}`;
        b.textContent=label;
        b.onclick=()=>{
          activeRange=range;
          renderRanges();
          renderChart(selected());
        };
        h.appendChild(b);
      });
  };

  if(typeof activeRange!=='undefined' && activeRange==='ALL') activeRange='6M';
  renderRanges();
})();
