(() => {
  try{
    if(typeof chartLoadToken!=='undefined') chartLoadToken+=1;
  }catch(_){}

  try{
    const legacy=[...document.scripts].find(s=>s.src==='https://s3.tradingview.com/tv.js');
    if(legacy&&typeof legacy.onload==='function'){
      const resolve=legacy.onload;
      legacy.onerror=()=>{
        try{resolve.call(legacy)}catch(_){}
      };
    }
  }catch(_){}
})();
