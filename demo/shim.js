// Koszyk demo: the server's API answered in the browser. The list lives in this browser's localStorage, dictation goes through the
// local parser (lib/local-parse.js), promotions are picked from a saved copy of the leaflets by the server's own pick() (lib/promos.js).
(() => {
  const CATALOG = __CATALOG__;
  const LEAF = __LEAFLETS__;
  // (the server's modules, CommonJS as they are; the network parts get stubs, the leaflets come from LEAF)
  const SRC = __MODULES__;
  const STUBS = { '../public/catalog.json': CATALOG, './lidl': { lidlOffers: async () => [] }, './blix': { blixOffers: async () => [] } };
  const mods = {}; const load = name => { if (STUBS[name]) return STUBS[name]; if (mods[name]) return mods[name].exports;
    const module = mods[name] = { exports: {} }; SRC[name](module, module.exports, load); return module.exports; };
  const parser = load('./local-parse'), { pick } = load('./promos');

  // (the artifact frame refuses the microphone; without SpeechRecognition the app points to the keyboard's own dictation)
  for (const k of ['SpeechRecognition', 'webkitSpeechRecognition']) try { Object.defineProperty(window, k, { value: undefined, configurable: true }); } catch { }
  try { if (!localStorage.getItem('koszyk.token')) localStorage.setItem('koszyk.token', 'demo'); } catch { }

  // ---------- the list (same rules as server.js applyChanges) ----------
  const COLLECTIONS = ['items', 'stores', 'history', 'settings'], KEY = 'koszyk.demo.db';
  const SAMPLE = 'dwa litry mleka, chleb, masło, kilo bananów, sześć jajek, ser żółty, kawa ziarnista, makaron, pomidory, płyn do naczyń';
  function emptyDb() { const db = { rev: 0, collections: {} }; for (const c of COLLECTIONS) db.collections[c] = {};
    db.collections.settings.store = { id: 'store', value: 'lidl', updatedAt: 1 };
    const now = Date.now(); parser.localParse(SAMPLE).items.forEach((it, i) => { const id = 'demo-' + i;
      db.collections.items[id] = { id, name: it.name, qty: it.qty ?? null, unit: it.unit ?? null, cat: it.category, emoji: it.emoji || null, note: it.note || null,
        q: null, opts: [], done: false, deleted: false, createdAt: now - 20 + i, updatedAt: now - 20 + i }; });
    return db; }
  let db = null; try { db = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { }
  if (!db || !db.collections) db = emptyDb();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { } };
  function applyChanges(changes) { let n = 0;
    for (const ch of changes) { if (!ch || !COLLECTIONS.includes(ch.col) || !ch.item || typeof ch.item.id !== 'string') continue;
      const coll = db.collections[ch.col], ex = coll[ch.item.id];
      if (!ex || (ch.item.updatedAt || 0) >= (ex.updatedAt || 0)) { coll[ch.item.id] = ch.item; n++; } }
    const now = Date.now(); for (const [id, it] of Object.entries(db.collections.items)) if ((it.deleted && now - it.updatedAt > 7 * 864e5) || (it.done && now - (it.doneAt || it.updatedAt) > 2 * 864e5)) { delete db.collections.items[id]; n++; }
    if (n) { db.rev++; save(); } }
  const state = () => ({ rev: db.rev, collections: JSON.parse(JSON.stringify(db.collections)), ai: false });

  // ---------- promotions from the saved leaflets ----------
  const leaflet = id => LEAF.stores[id] || [];
  function promosFor(storeId, names) { const leaf = leaflet(storeId), out = {}; if (!leaf.length) return out;
    for (const name of [...new Set(names.map(n => String(n)).filter(Boolean))].slice(0, 40)) { const r = pick(name, leaf); if (r.length) out[name] = r; }
    return out; }

  // ---------- the API ----------
  const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const path = typeof input === 'string' ? input : '';
    if (path === '/catalog.json') return reply(CATALOG);
    if (!path.startsWith('/api/')) return realFetch(input, init);
    let b = {}; try { b = init.body ? JSON.parse(init.body) : {}; } catch { }
    switch (path) {
      case '/api/auth': await wait(200); return /^\d{4}$/.test(String(b.pin || '')) ? reply({ token: 'demo' }) : reply({ error: 'Błędny PIN.' }, 401);
      case '/api/state': return reply(state());
      case '/api/sync': applyChanges(Array.isArray(b.changes) ? b.changes : []); return reply(state());
      case '/api/parse': { await wait(250); const text = String(b.text || '').trim(); return reply(text ? parser.localParse(text) : { items: [], remove: [] }); }
      case '/api/leaflet': await wait(150); return reply({ store: b.store, items: leaflet(String(b.store || '')) });
      case '/api/promos': await wait(150); return reply({ store: b.store, promos: promosFor(String(b.store || ''), Array.isArray(b.names) ? b.names : []) });
    }
    return reply({ error: 'not found' }, 404);
  };
})();
