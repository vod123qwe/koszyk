// Koszyk: wspólna lista zakupów (PWA). Node bez frameworka, dane w data/db.json + opcjonalnie w Gist (na Render dysk jest ulotny).
// Logowanie PIN-em (token na urządzenie), synchronizacja per pozycja (updatedAt, ostatni wygrywa), dyktowanie rozumiane przez Claude
// (bez klucza: prosty parser lokalny), promocje sieci z ding.pl.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { localParse } = require('./lib/local-parse');
const { aiParse, aiOn } = require('./lib/ai');
const { promosFor } = require('./lib/promos');

const PORT = process.env.PORT || 8820;
const PIN = process.env.KOSZYK_PIN || '1234';
const GIST_ID = process.env.GIST_ID || '';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GIST_FILE = 'koszyk-db.json';
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
if (PIN === '1234') console.warn('[koszyk] UWAGA: domyślny PIN 1234 (ustaw KOSZYK_PIN w env)');

// ---------- dane ----------
const COLLECTIONS = ['items', 'stores', 'history', 'settings'];
function emptyDb() { const db = { rev: 0, collections: {}, tokens: [] }; for (const c of COLLECTIONS) db.collections[c] = {};
  db.collections.settings.store = { id: 'store', value: 'lidl', updatedAt: 1 }; return db; }
let db = emptyDb(), gistTimer = null;
function loadLocal() { try { const p = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); if (p && p.collections) return p; } catch (e) { } return null; }
async function loadGist() {
  if (!GIST_ID || !GITHUB_TOKEN) return null;
  try { const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'koszyk-app' } });
    if (!res.ok) return null; const g = await res.json(), f = g.files && g.files[GIST_FILE]; if (!f) return null;
    let content = f.content; if (f.truncated && f.raw_url) content = await (await fetch(f.raw_url)).text();
    const p = JSON.parse(content); if (p && p.collections) return p; } catch (e) { console.error('[koszyk] gist load:', e.message); }
  return null; }
function saveLocal() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(DB_FILE, JSON.stringify(db)); } catch (e) { console.error('[koszyk] save:', e.message); } }
function scheduleGist() { if (!GIST_ID || !GITHUB_TOKEN) return; clearTimeout(gistTimer);
  gistTimer = setTimeout(async () => { try { const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, { method: 'PATCH', headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'koszyk-app', 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: { [GIST_FILE]: { content: JSON.stringify(db) } } }) }); if (!res.ok) console.error('[koszyk] gist save HTTP', res.status); } catch (e) { console.error('[koszyk] gist save:', e.message); } }, 3000); }
function persist() { saveLocal(); scheduleGist(); }

// ---------- logowanie ----------
const attempts = new Map();
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');
const clientIp = req => { const f = req.headers['x-forwarded-for']; return (f ? String(f).split(',')[0].trim() : req.socket.remoteAddress) || '?'; };
function checkToken(req) { const a = req.headers.authorization || '', t = a.startsWith('Bearer ') ? a.slice(7) : ''; if (!t) return false; const h = sha256(t); return db.tokens.some(x => x.hash === h); }

// ---------- synchronizacja ----------
function applyChanges(changes) { let n = 0;
  for (const ch of changes) { if (!ch || !COLLECTIONS.includes(ch.col) || !ch.item || typeof ch.item.id !== 'string') continue;
    const coll = db.collections[ch.col], ex = coll[ch.item.id];
    if (!ex || (ch.item.updatedAt || 0) >= (ex.updatedAt || 0)) { coll[ch.item.id] = ch.item; n++; } }
  // (sprzątanie: skreślone dawniej niż 2 dni i usunięte dawniej niż 7 dni wypadają z bazy)
  const now = Date.now(); for (const [id, it] of Object.entries(db.collections.items)) if ((it.deleted && now - it.updatedAt > 7 * 864e5) || (it.done && now - (it.doneAt || it.updatedAt) > 2 * 864e5)) { delete db.collections.items[id]; n++; }
  if (n) { db.rev++; persist(); } return n; }
const state = () => ({ rev: db.rev, collections: db.collections, ai: aiOn });

// ---------- http ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
function send(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(typeof data === 'string' ? data : JSON.stringify(data)); }
function readBody(req) { return new Promise((ok, no) => { let d = ''; req.on('data', c => { d += c; if (d.length > 1e6) req.destroy(); }); req.on('end', () => { try { ok(d ? JSON.parse(d) : {}); } catch (e) { no(new Error('bad json')); } }); req.on('error', no); }); }
function serveStatic(res, p) { let file = p === '/' ? '/index.html' : p; file = path.normalize(file).replace(/^([.]{2}[/\\])+/, '');
  const full = path.join(PUBLIC_DIR, file); if (!full.startsWith(PUBLIC_DIR)) return send(res, 403, { error: 'forbidden' });
  fs.readFile(full, (err, buf) => { if (err) { if (!path.extname(file)) return fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, b2) => { if (e2) return send(res, 404, { error: 'not found' }); res.writeHead(200, { 'Content-Type': MIME['.html'] }); res.end(b2); }); return send(res, 404, { error: 'not found' }); }
    const ext = path.extname(full).toLowerCase(); res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ['.png', '.svg', '.ico'].includes(ext) ? 'public, max-age=86400' : 'no-cache' }); res.end(buf); }); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'), p = url.pathname;
  if (!p.startsWith('/api/')) return serveStatic(res, p);
  try {
    if (p === '/api/auth' && req.method === 'POST') {
      const ip = clientIp(req), att = attempts.get(ip) || { fails: 0, until: 0 };
      if (Date.now() < att.until) return send(res, 429, { error: 'Za dużo prób. Spróbuj za kilkanaście minut.' });
      const body = await readBody(req);
      if (String(body.pin || '') !== PIN) { att.fails++; if (att.fails >= 5) { att.until = Date.now() + 15 * 60 * 1000; att.fails = 0; } attempts.set(ip, att); return send(res, 401, { error: 'Błędny PIN.' }); }
      attempts.delete(ip); const token = crypto.randomBytes(24).toString('hex');
      db.tokens.push({ hash: sha256(token), createdAt: Date.now(), device: String(body.device || '').slice(0, 80) }); if (db.tokens.length > 20) db.tokens = db.tokens.slice(-20); persist();
      return send(res, 200, { token }); }
    if (!checkToken(req)) return send(res, 401, { error: 'unauthorized' });
    if (p === '/api/state' && req.method === 'GET') return send(res, 200, state());
    if (p === '/api/sync' && req.method === 'POST') { const b = await readBody(req); applyChanges(Array.isArray(b.changes) ? b.changes : []); return send(res, 200, state()); }
    if (p === '/api/parse' && req.method === 'POST') {   // tekst z dyktowania → produkty
      const b = await readBody(req), text = String(b.text || '').trim(); if (!text) return send(res, 200, { items: [], remove: [] });
      const known = Object.values(db.collections.history).sort((a, c) => (c.count || 0) - (a.count || 0)).map(h => h.name);
      const onList = Object.values(db.collections.items).filter(i => !i.deleted && !i.done).map(i => i.name);
      let out = null; try { out = await aiParse(text, { known, onList }); } catch (e) { console.error('[koszyk] ai:', e.message); }
      return send(res, 200, out || localParse(text)); }
    if (p === '/api/promos' && req.method === 'POST') {   // promocje dla nazw produktów w wybranej sieci
      const b = await readBody(req); return send(res, 200, { store: b.store, promos: await promosFor(String(b.store || ''), Array.isArray(b.names) ? b.names : []) }); }
    return send(res, 404, { error: 'not found' });
  } catch (e) { console.error('[koszyk]', p, e); return send(res, 500, { error: 'server error' }); }
});

(async function boot() {
  const g = await loadGist(), l = loadLocal();
  db = g && l ? (g.rev >= l.rev ? g : l) : (g || l || emptyDb());
  if (!db.tokens) db.tokens = []; for (const c of COLLECTIONS) if (!db.collections[c]) db.collections[c] = {};
  saveLocal();
  server.listen(PORT, () => console.log(`[koszyk] http://localhost:${PORT}  (gist: ${GIST_ID ? 'ON' : 'off'}, AI: ${aiOn ? 'ON' : 'off'})`));
})();
