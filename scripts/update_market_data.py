import json
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'app.js').read_text(encoding='utf-8')
TICKERS = sorted(set(re.findall(r"ticker:'([A-Z0-9.\-]+)'", APP)))
OUT = ROOT / 'market-data'
OUT.mkdir(exist_ok=True)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://www.nasdaq.com',
    'Referer': 'https://www.nasdaq.com/',
}

ETF_SYMBOLS = {'GLD'}


def num(value):
    if value is None:
        return None
    s = str(value).strip().replace('$', '').replace(',', '').replace('%', '')
    if not s or s.upper() in {'N/A', 'NA', '--'}:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def parse_date(value):
    for fmt in ('%m/%d/%Y', '%Y-%m-%d'):
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    raise ValueError(f'Unknown date format: {value}')


def fetch_json(url, timeout=30):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode('utf-8'))


def fetch_rows(ticker, assetclass):
    now = datetime.now(timezone.utc)
    # About 20 years of daily history so WEEK and MONTH calculations can use
    # long moving averages such as SMA/EMA 100 and 200.
    start = now - timedelta(days=7305)
    params = urllib.parse.urlencode({
        'assetclass': assetclass,
        'fromdate': start.strftime('%Y-%m-%d'),
        'todate': now.strftime('%Y-%m-%d'),
        'limit': 5000,
    })
    symbol = urllib.parse.quote(ticker)
    url = f'https://api.nasdaq.com/api/quote/{symbol}/historical?{params}'
    data = fetch_json(url, timeout=45)
    rows = data.get('data', {}).get('tradesTable', {}).get('rows') or []
    if not rows:
        raise RuntimeError('Nasdaq returned no historical rows')
    return rows


def fetch_fundamentals(ticker, assetclass, latest_close):
    symbol = urllib.parse.quote(ticker)
    result = {
        'marketCap': None,
        'peRatio': None,
        'epsTTM': None,
        'source': 'NASDAQ',
    }

    try:
        summary_url = f'https://api.nasdaq.com/api/quote/{symbol}/summary?assetclass={assetclass}'
        summary = fetch_json(summary_url).get('data', {}).get('summaryData', {}) or {}
        for key in ('MarketCap', 'MarketCapitalization', 'NetAssets'):
            value = num((summary.get(key) or {}).get('value'))
            if value is not None:
                result['marketCap'] = value
                break
    except Exception as e:
        print(f'fundamentals summary failed {ticker}: {e}')

    if assetclass == 'stocks':
        try:
            eps_url = f'https://api.nasdaq.com/api/quote/{symbol}/eps?assetclass=stocks'
            eps_data = fetch_json(eps_url).get('data', {}).get('earningsPerShare', []) or []
            previous = [num(x.get('earnings')) for x in eps_data if x.get('type') == 'PreviousQuarter']
            previous = [x for x in previous if x is not None]
            if len(previous) >= 4:
                eps_ttm = sum(previous[-4:])
                result['epsTTM'] = eps_ttm
                if eps_ttm > 0 and latest_close is not None:
                    result['peRatio'] = latest_close / eps_ttm
        except Exception as e:
            print(f'fundamentals eps failed {ticker}: {e}')

    return result


def to_yahoo_shape(rows):
    candles = []
    for row in rows:
        try:
            dt = parse_date(row.get('date', ''))
        except Exception:
            continue
        o = num(row.get('open'))
        h = num(row.get('high'))
        l = num(row.get('low'))
        c = num(row.get('close') or row.get('close/last'))
        v = num(row.get('volume')) or 0
        if None in (o, h, l, c):
            continue
        candles.append((dt, o, h, l, c, v))

    candles.sort(key=lambda x: x[0])
    if len(candles) < 220:
        raise RuntimeError(f'Not enough usable rows: {len(candles)}')

    return {
        'chart': {
            'result': [{
                'timestamp': [int(x[0].timestamp()) for x in candles],
                'indicators': {
                    'quote': [{
                        'open': [x[1] for x in candles],
                        'high': [x[2] for x in candles],
                        'low': [x[3] for x in candles],
                        'close': [x[4] for x in candles],
                        'volume': [x[5] for x in candles],
                    }]
                }
            }],
            'error': None
        }
    }


for ticker in TICKERS:
    assetclass = 'etf' if ticker in ETF_SYMBOLS else 'stocks'
    try:
        rows = fetch_rows(ticker, assetclass)
        data = to_yahoo_shape(rows)
        closes = data['chart']['result'][0]['indicators']['quote'][0]['close']
        latest_close = closes[-1] if closes else None
        data['fundamentals'] = fetch_fundamentals(ticker, assetclass, latest_close)
        (OUT / f'{ticker}.json').write_text(json.dumps(data, separators=(',', ':')), encoding='utf-8')
        f = data['fundamentals']
        print(
            f'updated {ticker}: {len(data["chart"]["result"][0]["timestamp"])} rows '
            f'marketCap={f.get("marketCap")} pe={f.get("peRatio")}'
        )
    except Exception as e:
        print(f'FAILED {ticker}: {e}')
    time.sleep(0.5)
