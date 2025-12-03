#!/usr/bin/env python3
import json
from html import escape
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / 'data' / 'submissions.json'
OUT = Path(__file__).resolve().parents[1] / 'data' / 'submissions.html'

if not DATA.exists():
    print('No submissions.json found at', DATA)
    raise SystemExit(1)

with DATA.open('r', encoding='utf8') as f:
    arr = json.load(f)

rows = []
for i, s in enumerate(reversed(arr), 1):
    name = escape(s.get('name',''))
    email = escape(s.get('email',''))
    message = escape(s.get('message',''))
    timestamp = escape(s.get('timestamp',''))
    rows.append(f'<tr><td>{i}</td><td>{name}</td><td>{email}</td><td>{message}</td><td>{timestamp}</td></tr>')

html = f'''<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Submissions</title>
<style>body{{font-family:Arial,Helvetica,sans-serif;padding:20px}}table{{width:100%;border-collapse:collapse}}th,td{{padding:8px;border:1px solid #ddd}}th{{background:#f4f4f4}}</style>
</head>
<body>
<h1>Visitor Submissions</h1>
<p><a href="../index.html">Back to site</a></p>
<table>
<thead><tr><th>#</th><th>Name</th><th>Email</th><th>Message</th><th>Timestamp</th></tr></thead>
<tbody>
{''.join(rows)}
</tbody>
</table>
</body>
</html>'''

with OUT.open('w', encoding='utf8') as f:
    f.write(html)

print('Wrote', OUT)
