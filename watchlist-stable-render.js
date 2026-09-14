(() => {
  if(typeof renderWatchlist!=='function') return;
  const originalRenderWatchlist=renderWatchlist;

  function rowsHost(){
    return document.getElementById('watchRows');
  }

  function annotate(){
    const host=rowsHost();
    if(!host||!Array.isArray(watchlist)) return;
    const rows=[...host.querySelectorAll('.watch-row')];
    rows.forEach((row,index)=>{
      const item=watchlist[index];
      if(item) row.dataset.ticker=item.ticker||'';
    });
  }

  function sameStructure(){
    const host=rowsHost();
    if(!host||!Array.isArray(watchlist)) return false;
    const rows=[...host.querySelectorAll('.watch-row')];
    if(rows.length!==watchlist.length) return false;
    return rows.every((row,index)=>row.dataset.ticker===(watchlist[index]?.ticker||''));
  }

  renderWatchlist=function(){
    const host=rowsHost();
    if(!host||!Array.isArray(watchlist)) return originalRenderWatchlist();

    if(!sameStructure()){
      originalRenderWatchlist();
      annotate();
      return;
    }

    const count=document.getElementById('watchCount');
    if(count) count.textContent=watchlist.length;

    const rows=[...host.querySelectorAll('.watch-row')];
    rows.forEach((row,index)=>{
      const item=watchlist[index];
      if(!item) return;

      row.className=`watch-row ${item.ticker===selectedTicker?'active':''}`;

      const symbol=row.querySelector('.symbol-cell span');
      if(symbol) symbol.textContent=item.ticker;
      const img=row.querySelector('.symbol-cell img');
      if(img){
        const next=logoUrl(item);
        if(img.src!==next) img.src=next;
      }

      const nums=row.querySelectorAll('.num');
      if(nums[0]) nums[0].textContent=fmtPrice(item.last);
      if(nums[1]){
        nums[1].className=`num ${item.change>=0?'up':'down'}`;
        nums[1].textContent=fmtSigned(item.change);
      }
      if(nums[2]){
        nums[2].className=`num ${item.pct>=0?'up':'down'}`;
        nums[2].textContent=`${fmtSigned(item.pct)}%`;
      }

      const del=row.querySelector('.delete-btn');
      if(del){
        del.title=`DELETE ${item.ticker}`;
        del.setAttribute('aria-label',`DELETE ${item.ticker}`);
      }
    });
  };

  annotate();
})();
