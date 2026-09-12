import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / 'app.js').read_text(encoding='utf-8')
TICKERS = sorted(set(re.findall(r"ticker:'([A-Z0-9.\-]+)'", APP)))
OUT = ROOT / 'market-data'
OUT.mkdir(exist_ok=True)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
    'Accept': 'application/json,text/plain,*/*',
}

for ticker in TICKERS:
    symbol = urllib.parse.quote(ticker)
    url = f'https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=2y&interval=1d&includePrePost=false&events=div%2Csplits'
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            payload = r.read().decode('utf-8')
        data = json.loads(payload)
        if not data.get('chart', {}).get('result'):
            raise RuntimeError('Yahoo returned no chart result')
        (OUT / f'{ticker}.json').write_text(json.dumps(data, separators=(',', ':')), encoding='utf-8')
        print(f'updated {ticker}')
    except Exception as e:
        print(f'FAILED {ticker}: {e}')
    time.sleep(0.35)
