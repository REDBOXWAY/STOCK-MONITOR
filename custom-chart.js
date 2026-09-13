(() => {
  const TV_WIDGET_SRC = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  let renderToken = 0;

  function tradingViewSymbol(item) {
    const ticker = String(item?.ticker || '').trim().toUpperCase();

    // Keep the user-facing Bitcoin ticker BTCUSD, but use a real BTC/USD
    // market inside TradingView.
    if (ticker === 'BTCUSD') return 'BITSTAMP:BTCUSD';
    if (ticker === 'ETHUSD') return 'BITSTAMP:ETHUSD';

    const explicit = String(item?.tv || '').trim();
    if (explicit && !/NASDAQ:BTCUSD/i.test(explicit)) return explicit;

    const exchange = String(item?.exchange || '').trim().toUpperCase();
    if (exchange.includes('NASDAQ')) return `NASDAQ:${ticker}`;
    if (exchange === 'NYSE' || exchange.includes('NEW YORK')) return `NYSE:${ticker}`;
    if (exchange.includes('AMEX') || exchange.includes('ARCA')) return `AMEX:${ticker}`;
    if (exchange.includes('LSE')) return `LSE:${ticker}`;
    if (exchange.includes('TSX')) return `TSX:${ticker}`;

    return ticker;
  }

  function hideLocalRangeControls() {
    const ranges = document.getElementById('ranges');
    if (!ranges) return;
    ranges.innerHTML = '';
    ranges.style.display = 'none';
  }

  function renderTradingViewChart(item) {
    if (!item) return;

    const host = document.getElementById('chartHost');
    if (!host) return;

    const token = ++renderToken;
    hideLocalRangeControls();
    host.innerHTML = '<div class="empty-note">LOADING TRADINGVIEW CHART…</div>';

    const symbol = tradingViewSymbol(item);

    // Re-create the official TradingView widget whenever the selected symbol changes.
    requestAnimationFrame(() => {
      if (token !== renderToken) return;

      host.innerHTML = '';

      const container = document.createElement('div');
      container.className = 'tradingview-widget-container';
      container.style.height = '100%';
      container.style.width = '100%';

      const widget = document.createElement('div');
      widget.className = 'tradingview-widget-container__widget';
      widget.style.height = 'calc(100% - 22px)';
      widget.style.width = '100%';
      container.appendChild(widget);

      const copyright = document.createElement('div');
      copyright.className = 'tradingview-widget-copyright';
      copyright.style.height = '22px';
      copyright.style.display = 'flex';
      copyright.style.alignItems = 'center';
      copyright.style.justifyContent = 'flex-end';
      copyright.style.font = '10px Arial,sans-serif';
      copyright.style.color = '#71848d';
      copyright.innerHTML = '<a href="https://www.tradingview.com/" target="_blank" rel="noopener nofollow" style="color:#71848d;text-decoration:none;">Chart by TradingView</a>';
      container.appendChild(copyright);

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = TV_WIDGET_SRC;
      script.async = true;
      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol,
        interval: 'D',
        timezone: 'exchange',
        theme: 'dark',
        backgroundColor: '#050b0e',
        gridColor: 'rgba(120,145,155,0.10)',
        style: '3',
        locale: 'en',
        hide_top_toolbar: true,
        hide_side_toolbar: false,
        hide_legend: false,
        hide_volume: true,
        withdateranges: true,
        allow_symbol_change: false,
        save_image: false,
        calendar: false,
        support_host: 'https://www.tradingview.com'
      });
      container.appendChild(script);
      host.appendChild(container);
    });
  }

  // Replace the locally calculated Lightweight Charts graph with TradingView's
  // own market chart and timeframe engine for every instrument.
  window.renderChart = renderTradingViewChart;

  hideLocalRangeControls();
  try {
    const item = typeof selected === 'function' ? selected() : null;
    if (item) renderTradingViewChart(item);
  } catch (_) {}
})();
