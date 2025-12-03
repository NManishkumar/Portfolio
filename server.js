// Minimal local server to accept form submissions and persist them to data/submissions.json
// Run with: node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
// sqlite3 for lightweight local DB storage
let sqlite3;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (e) {
  sqlite3 = null;
}

const DATA_DIR = path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'submissions.json');
const PORT = process.env.PORT || 3000;

// SQLite DB file (optional). If sqlite3 module is available, we'll use it.
const DB_FILE = path.join(DATA_DIR, 'submissions.db');
let db = null;

function initSqlite() {
  if (!sqlite3) return;
  db = new sqlite3.Database(DB_FILE);
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      message TEXT,
      timestamp TEXT
    )`);
  });
}

// ensure data dir and file exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '[]', 'utf8');

// initialize sqlite if available
initSqlite();

function readAll() {
  try {
    const raw = fs.readFileSync(FILE, 'utf8') || '[]';
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function writeAll(arr) {
  fs.writeFileSync(FILE, JSON.stringify(arr, null, 2), 'utf8');
}

function insertToDb(obj) {
  if (!db) return;
  try {
    const stmt = db.prepare('INSERT INTO submissions (name,email,message,timestamp) VALUES (?,?,?,?)');
    stmt.run(obj.name || '', obj.email || '', obj.message || '', obj.timestamp || new Date().toISOString());
    stmt.finalize();
  } catch (e) {
    console.warn('DB insert failed', e);
  }
}

function getAllFromDb(cb) {
  if (!db) return cb([]);
  db.all('SELECT id,name,email,message,timestamp FROM submissions ORDER BY id DESC', (err, rows) => {
    if (err) return cb([]);
    cb(rows);
  });
}

const server = http.createServer((req, res) => {
  // Basic CORS headers for local testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method === 'GET' && req.url === '/api/submissions') {
    // Return JSON backup and DB rows if available
    const all = readAll();
    if (db) {
      return getAllFromDb((rows) => {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        return res.end(JSON.stringify({ backup: all, db: rows }));
      });
    }
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    return res.end(JSON.stringify({ backup: all }));
  }

  if (req.method === 'POST' && req.url === '/api/submit') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const obj = JSON.parse(body);
        const all = readAll();
        all.push(obj);
        writeAll(all);
        // also persist to sqlite if available
        insertToDb(obj);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok', saved: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON' }));
      }
    });
    return;
  }

  // admin HTML view to browse DB submissions quickly
  if (req.method === 'GET' && req.url === '/admin/submissions') {
    if (!db) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end('<p>SQLite not available. Install sqlite3 and restart the server to enable DB viewer.</p>');
    }
    return getAllFromDb((rows) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      let html = '<!doctype html><html><head><meta charset="utf-8"><title>Submissions</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #ddd}th{background:#f4f4f4}</style></head><body>';
      html += '<h1>Visitor Submissions</h1>';
      html += '<p><a href="/">Back</a></p>';
      html += '<table><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Message</th><th>Timestamp</th></tr></thead><tbody>';
      for (const r of rows) {
        html += `<tr><td>${r.id}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.email)}</td><td>${escapeHtml(r.message)}</td><td>${r.timestamp}</td></tr>`;
      }
      html += '</tbody></table></body></html>';
      return res.end(html);
    });
  }

  // helper for escaping
  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  // default: small status
  if (req.method === 'GET' && req.url === '/') {
    res.setHeader('Content-Type', 'text/plain');
    res.writeHead(200);
    return res.end('Submission server running. POST to /api/submit');
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
