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
    s = str(value).strip().replace('$', '').replace(',', '')
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


def fetch_rows(ticker, assetclass):
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=800)
    params = urllib.parse.urlencode({
        'assetclass': assetclass,
        'fromdate': start.strftime('%Y-%m-%d'),
        'todate': now.strftime('%Y-%m-%d'),
        'limit': 800,
    })
    symbol = urllib.parse.quote(ticker)
    url = f'https://api.nasdaq.com/api/quote/{symbol}/historical?{params}'
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode('utf-8'))
    rows = data.get('data', {}).get('tradesTable', {}).get('rows') or []
    if not rows:
        raise RuntimeError('Nasdaq returned no historical rows')
    return rows


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
        (OUT / f'{ticker}.json').write_text(json.dumps(data, separators=(',', ':')), encoding='utf-8')
        print(f'updated {ticker}: {len(data["chart"]["result"][0]["timestamp"])} rows')
    except Exception as e:
        print(f'FAILED {ticker}: {e}')
    time.sleep(0.35)
