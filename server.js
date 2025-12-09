// Minimal local server to accept form submissions and persist them to data/submissions.json
// Run with: node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
// sqlite3 for lightweight local DB storage (optional)
let sqlite3 = null;
let hasSQLite = false;
try {
  sqlite3 = require('sqlite3').verbose();
  hasSQLite = true;
} catch (e) {
  sqlite3 = null;
  hasSQLite = false;
}

// optional MySQL support via mysql2
let mysql = null;
let hasMySQL = false;
let mysqlPool = null;
try {
  mysql = require('mysql2/promise');
  hasMySQL = true;
} catch (e) {
  mysql = null;
  hasMySQL = false;
}

const DATA_DIR = path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'submissions.json');
const PORT = process.env.PORT || 3000;

// SQLite DB file (optional). If sqlite3 module is available, we'll use it.
const DB_FILE = path.join(DATA_DIR, 'submissions.db');
let db = null;

function initSqlite() {
  if (!hasSQLite) return;
  try {
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
  } catch (err) {
    console.warn('Failed to initialize sqlite3:', err && err.message);
    db = null;
    hasSQLite = false;
  }
}

async function initMySQL() {
  if (!hasMySQL) return;
  try {
    const host = process.env.MYSQL_HOST || 'db';
    const user = process.env.MYSQL_USER || 'root';
    const password = process.env.MYSQL_PASSWORD || process.env.MYSQL_PASS || '';
    const database = process.env.MYSQL_DATABASE || process.env.MYSQL_DB || 'portfolio';
    const port = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306;
    mysqlPool = mysql.createPool({ host, user, password, database, port, waitForConnections: true, connectionLimit: 10 });
    // ensure database/table exists (create table if not exists)
    await mysqlPool.query(`CREATE TABLE IF NOT EXISTS submissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name TEXT,
      email TEXT,
      message TEXT,
      timestamp TEXT
    )`);
    console.log('MySQL pool initialized');
  } catch (err) {
    console.warn('Failed to initialize MySQL:', err && err.message);
    mysqlPool = null;
    hasMySQL = false;
  }
}

// ensure data dir and file exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '[]', 'utf8');

// initialize sqlite if available
initSqlite();
// initialize MySQL if available
initMySQL();

// Admin credentials (use env vars in production). Default: admin / changeme
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'changeme';

function sendUnauthorized(res) {
  res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Admin Area"', 'Content-Type': 'text/plain' });
  res.end('Unauthorized');
}

function checkAdminAuth(req, res) {
  try {
    const header = req.headers && req.headers.authorization;
    if (!header) {
      sendUnauthorized(res);
      return false;
    }
    const m = header.match(/^Basic\s+(.*)$/i);
    if (!m) {
      sendUnauthorized(res);
      return false;
    }
    const creds = Buffer.from(m[1], 'base64').toString('utf8');
    const idx = creds.indexOf(':');
    if (idx < 0) {
      sendUnauthorized(res);
      return false;
    }
    const user = creds.slice(0, idx);
    const pass = creds.slice(idx + 1);
    if (user === ADMIN_USER && pass === ADMIN_PASS) return true;
    sendUnauthorized(res);
    return false;
  } catch (e) {
    sendUnauthorized(res);
    return false;
  }
}

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
  // Prefer MySQL if available
  if (hasMySQL && mysqlPool) {
    try {
      mysqlPool.query('INSERT INTO submissions (name,email,message,timestamp) VALUES (?,?,?,?)', [obj.name || '', obj.email || '', obj.message || '', obj.timestamp || new Date().toISOString()])
        .catch(err => console.warn('MySQL insert error:', err && err.message));
      return;
    } catch (e) {
      console.warn('MySQL insert failed', e && e.message);
    }
  }
  // Fallback to sqlite
  if (!hasSQLite || !db) return;
  try {
    const stmt = db.prepare('INSERT INTO submissions (name,email,message,timestamp) VALUES (?,?,?,?)');
    stmt.run(obj.name || '', obj.email || '', obj.message || '', obj.timestamp || new Date().toISOString(), (err) => {
      if (err) console.warn('DB insert error:', err && err.message);
    });
    stmt.finalize();
  } catch (e) {
    console.warn('DB insert failed', e && e.message);
  }
}

function getAllFromDb(cb) {
  // Prefer MySQL
  if (hasMySQL && mysqlPool) {
    try {
      mysqlPool.query('SELECT id,name,email,message,timestamp FROM submissions ORDER BY id DESC')
        .then(([rows]) => cb(rows || []))
        .catch(err => {
          console.warn('MySQL read error:', err && err.message);
          cb([]);
        });
      return;
    } catch (e) {
      console.warn('MySQL read failed', e && e.message);
      return cb([]);
    }
  }
  // Fallback to sqlite
  if (!hasSQLite || !db) return cb([]);
  try {
    db.all('SELECT id,name,email,message,timestamp FROM submissions ORDER BY id DESC', (err, rows) => {
      if (err) {
        console.warn('DB read error:', err && err.message);
        return cb([]);
      }
      cb(rows || []);
    });
  } catch (e) {
    console.warn('DB read failed', e && e.message);
    cb([]);
  }
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
    if (!checkAdminAuth(req, res)) return; // require Basic auth
    // Admin HTML viewer: use SQLite if available, else read JSON backup
    if (hasSQLite && db) {
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

    // Fallback to JSON backup
    const all = readAll().slice().reverse();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    let html = '<!doctype html><html><head><meta charset="utf-8"><title>Submissions</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #ddd}th{background:#f4f4f4}</style></head><body>';
    html += '<h1>Visitor Submissions (JSON backup)</h1>';
    html += '<p><a href="/">Back</a></p>';
    html += '<table><thead><tr><th>#</th><th>Name</th><th>Email</th><th>Message</th><th>Timestamp</th></tr></thead><tbody>';
    let i = 1;
    for (const r of all) {
      html += `<tr><td>${i++}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.email)}</td><td>${escapeHtml(r.message)}</td><td>${escapeHtml(r.timestamp)}</td></tr>`;
    }
    html += '</tbody></table></body></html>';
    return res.end(html);
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
