// Koszyk: lista zakupów. Dyktujesz (przytrzymaj mikrofon), serwer rozumie tekst (Claude albo prosty parser), produkty układają się
// po działach w kolejności Twojego sklepu; kolejność uczy się z tego, jak odhaczasz. Wspólna lista: zmiany idą na serwer i wracają do
// drugiego telefonu po kilku sekundach. Promocje produktów z listy w wybranej sieci, podpowiedzi „Może też?”.
const CAT = await (await fetch('/catalog.json')).json();
const CATS = Object.fromEntries(CAT.categories.map(c => [c.id, c]));
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
const norm = s => String(s || '').toLowerCase().replace(/[^a-ząćęłńóśźż0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const vib = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch { } };
const zl = n => n.toFixed(2).replace('.', ',') + ' zł';

// ---------- icons (line, 24px) ----------
const I = {
  leaf: '<path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14z"/><path d="M5 19l7-7"/>',
  bread: '<path d="M6 11a3.5 3.5 0 0 1 1-7h10a3.5 3.5 0 0 1 1 7v8a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z"/>',
  milk: '<path d="M8 3h8M9 3v3L6 10v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10l-3-4V3"/><path d="M6 13h12"/>',
  meat: '<path d="M14.5 4.5a5 5 0 0 1 5 5c0 4-6 9-9.5 9.5L6 21l-1.5-3L4 13c.5-3.5 6.5-8.5 10.5-8.5z"/><circle cx="14" cy="10" r="1.5"/>',
  cheese: '<path d="M3 18L12 6l9 4v8z"/><path d="M3 18h18M8 14h.01M15 13h.01M16 16h.01"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5"/>',
  grain: '<path d="M12 21V8M12 8c-3 0-4-3-4-5 2 0 4 1 4 5zM12 8c3 0 4-3 4-5-2 0-4 1-4 5zM12 14c-3 0-4-3-4-5 2 0 4 1 4 5zM12 14c3 0 4-3 4-5-2 0-4 1-4 5z"/>',
  jar: '<path d="M8 3h8v3H8zM7 6h10a1 1 0 0 1 1 1v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7a1 1 0 0 1 1-1zM6 11h12"/>',
  spice: '<path d="M9 3h6v4H9zM8 7h8l1 4v9a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-9z"/><path d="M10 14h4"/>',
  cookie: '<path d="M12 3a9 9 0 1 0 9 9 3 3 0 0 1-3-3 3 3 0 0 1-3-3 3 3 0 0 1-3-3z"/><path d="M9 10h.01M14 15h.01M9 15h.01"/>',
  cup: '<path d="M4 9h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6zM17 11h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3"/>',
  bottle: '<path d="M10 2h4v4l2 3v12a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9l2-3z"/><path d="M8 13h8"/>',
  wine: '<path d="M8 3h8l-.5 6a3.5 3.5 0 0 1-7 0zM12 12.5V20M8 21h8"/>',
  spray: '<path d="M9 8h6v13H9zM11 4h3v4h-3zM14 5h2M17 3l1.5-1M17 7l1.5 1M18 5h2"/>',
  drop: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  baby: '<circle cx="12" cy="9" r="5"/><path d="M7 21c1-3.5 3-5 5-5s4 1.5 5 5M10 8.5h.01M14 8.5h.01"/>',
  paw: '<circle cx="7" cy="10" r="1.8"/><circle cx="10.5" cy="6" r="1.8"/><circle cx="14.5" cy="6" r="1.8"/><circle cx="18" cy="10" r="1.8"/><path d="M8.5 17.5a4 4 0 0 1 8 0c0 1.8-1.8 2.8-4 2.8s-4-1-4-2.8z"/>',
  box: '<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', chev: '<path d="M9 6l6 6-6 6"/>', down: '<path d="M6 9l6 6 6-6"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>', plus: '<path d="M12 5v14M5 12h14"/>', more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><path d="M8 8h.01"/>', spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  grip: '<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" stroke-width="3"/>', moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7"/>',
  back: '<path d="M9 5h11v14H9l-6-7z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', out: '<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>', bag: '<path d="M5 8h14l-1.5 12h-11zM9 8V6a3 3 0 0 1 6 0v2"/>',
};
const ic = (n, w = 1.8) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || I.box}</svg>`;

// ---------- theme ----------
const theme = () => { let t = 'system'; try { t = localStorage.getItem('koszyk.theme') || 'system'; } catch { } return t; };
function applyTheme() { const t = theme(), dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark); document.querySelector('meta[name=theme-color]').content = dark ? '#111116' : '#ffffff'; }
applyTheme(); matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

// ---------- data and sync ----------
let token = localStorage.getItem('koszyk.token') || '';
let C = { items: {}, stores: {}, history: {}, settings: {} }, aiOn = false, online = true, syncing = false, syncT = 0;
let queue = []; try { queue = JSON.parse(localStorage.getItem('koszyk.queue') || '[]'); const c = JSON.parse(localStorage.getItem('koszyk.cache') || 'null'); if (c && c.items) C = c; } catch { }
const keep = () => { try { localStorage.setItem('koszyk.queue', JSON.stringify(queue)); localStorage.setItem('koszyk.cache', JSON.stringify(C)); } catch { } };
async function api(path, body) {
  const res = await fetch(path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401) { token = ''; localStorage.removeItem('koszyk.token'); render(); throw new Error('auth'); }
  if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); }
async function sync() {
  if (!token || syncing) return; syncing = true; $('.sync')?.classList.add('busy');
  const sent = queue.slice();
  try { const st = sent.length ? await api('/api/sync', { changes: sent }) : await api('/api/state');
    queue = queue.slice(sent.length); aiOn = st.ai;
    const next = st.collections; for (const ch of queue) next[ch.col][ch.item.id] = ch.item;   // (what is still waiting stays on top)
    const changed = JSON.stringify(next) !== JSON.stringify(C); C = next; online = true; keep(); if (changed) { render(); promosSoon(); compareSoon(); }
  } catch (e) { online = false; }
  syncing = false; $('.sync')?.classList.remove('busy'); $('.sync')?.classList.toggle('off', !online); }
function put(col, item, quiet) { item.updatedAt = Date.now(); C[col][item.id] = item; queue.push({ col, item }); keep(); clearTimeout(syncT); syncT = setTimeout(sync, 250); if (!quiet) render(); }
setInterval(() => { if (document.visibilityState === 'visible') sync(); }, 4000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); });

// ---------- the store and the order of its aisles (learned from the order you tick things off in it) ----------
const store = () => (C.settings.store && C.settings.store.value) || 'lidl';
// ---------- words dictation hears wrong: "łyski" means whisky; built-in ones from the catalog, the family's own in settings ----------
const myAliases = () => (C.settings.aliases && C.settings.aliases.value) || {};
let aliasRe = null, aliasKey = '';
function fixWords(text) { const map = { ...(CAT.aliases || {}), ...myAliases() }, keys = Object.keys(map).sort((a, b) => b.length - a.length);
  if (!keys.length) return text; const k = keys.join('|') + JSON.stringify(myAliases());
  if (k !== aliasKey) { aliasKey = k; aliasRe = new RegExp('(?<![\\p{L}\\d])(' + keys.map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')).join('|') + ')(?![\\p{L}\\d])', 'giu'); }
  const low = Object.fromEntries(Object.entries(map).map(([a, b]) => [a.toLowerCase(), b]));
  return text.replace(aliasRe, m => { const to = low[m.toLowerCase().replace(/\s+/g, ' ')] ?? m; return /^\p{Lu}/u.test(m) && /^\p{Ll}/u.test(to) ? to[0].toUpperCase() + to.slice(1) : to; }); }
function addAlias(from, to) { from = from.trim().toLowerCase(); to = to.trim(); if (!from || !to || from === to.toLowerCase()) return false;
  put('settings', { id: 'aliases', value: { ...myAliases(), [from]: to } }, true); return true; }
function dropAlias(from) { const v = { ...myAliases() }; delete v[from]; put('settings', { id: 'aliases', value: v }, true); }
// (after "Zmień": the words that changed between what was heard and what was sent are worth remembering)
function learnFromEdit(before, after) { const a = before.trim().split(/\s+/), b = after.trim().split(/\s+/), out = [];
  if (a.length !== b.length) return out; const diff = a.map((w, i) => [w, b[i]]).filter(([x, y]) => norm(x) !== norm(y));
  if (!diff.length || diff.length > 2) return out;
  for (const [x, y] of diff) { const from = x.replace(/[^\p{L}\d]/gu, ''), to = y.replace(/[,.;:!?]+$/, ''); if (from.length > 1 && to && addAlias(from, to)) out.push([from.toLowerCase(), to]); }
  return out; }
const storeOf = id => CAT.stores.find(s => s.id === id) || CAT.stores[0];
function orderFor(id) {
  const def = storeOf(id).order, st = C.stores[id] || {};
  if (st.custom) return [...st.custom, ...def.filter(c => !st.custom.includes(c))];
  const ses = (st.sessions || []).filter(s => s.cats && s.cats.length >= 3), n = def.length;
  const score = c => { let sum = def.indexOf(c) / (n - 1), w = 1; for (const s of ses) { const i = s.cats.indexOf(c); if (i >= 0) { sum += i / Math.max(1, s.cats.length - 1) * 1.5; w += 1.5; } } return sum / w; };
  return [...def].sort((a, b) => score(a) - score(b)); }
function learn(cat) {
  const id = store(); let s = null; try { s = JSON.parse(localStorage.getItem('koszyk.session') || 'null'); } catch { }
  if (!s || s.store !== id || Date.now() - s.t > 3 * 3600e3) s = { store: id, id: uid(), t: Date.now(), cats: [] };
  s.t = Date.now(); if (!s.cats.includes(cat)) { s.cats.push(cat);
    if (s.cats.length >= 3) { const st = { id, ...(C.stores[id] || {}) }, list = (st.sessions || []).filter(x => x.id !== s.id); list.push({ id: s.id, cats: s.cats.slice() }); st.sessions = list.slice(-8); put('stores', st, true); } }
  localStorage.setItem('koszyk.session', JSON.stringify(s)); }
function remember(it) {
  const k = norm(it.name), h = { id: k, name: it.name, cat: it.cat, count: 0, lastAt: 0, avg: null, ...(C.history[k] || {}) }, now = Date.now();
  if (!h.lastAt || now - h.lastAt > 6 * 3600e3) { if (h.lastAt) { const iv = now - h.lastAt; h.avg = h.avg ? h.avg * .6 + iv * .4 : iv; } h.count++; }
  h.lastAt = now; h.name = it.name; h.cat = it.cat; if (it.emoji) h.emoji = it.emoji; put('history', h, true); }

// ---------- promotions (for what is on the list, and for what you usually buy) ----------
let PR = {}, prKey = '', prT = 0;
function promosSoon() { clearTimeout(prT); prT = setTimeout(async () => {
  const s = storeOf(store()); if (!s.ding.length) { PR = {}; return; }
  const open = openItems().map(i => i.name), usual = Object.values(C.history).sort((a, b) => b.count - a.count).slice(0, 12).map(h => h.name);
  const names = [...new Set([...open, ...usual])], key = s.id + '|' + names.join('|'); if (key === prKey) return; prKey = key;
  try { const r = await api('/api/promos', { store: s.id, names }); if (r.store === store()) { PR = r.promos || {}; render(); } } catch { } }, 900); }
const bestOffer = name => (PR[name] || [])[0];
let CMP = {}, cmpKey = '', cmpT = 0;
function compareSoon() { clearTimeout(cmpT); cmpT = setTimeout(async () => {
  const names = [...new Set(openItems().map(i => i.name))], key = names.join('|'); if (key === cmpKey) return; cmpKey = key;
  if (!names.length) { CMP = {}; render(); return; }
  const out = {}; await Promise.all(CAT.stores.map(async s => { try { const r = await api('/api/promos', { store: s.id, names }); let save = 0, n = 0;
    for (const nm of names) { const o = (r.promos || {})[nm]; if (o && o[0]) { n++; if (o[0].oldPrice) save += o[0].oldPrice - o[0].price; } } out[s.id] = { save, n }; } catch { } }));
  CMP = out; render(); }, 1400); }

// ---------- suggestions: what is due again (from the rhythm you buy it in), what is on offer, what you buy most ----------
function suggestions() {
  const open = new Set(openItems().map(i => norm(i.name))), now = Date.now(), hs = Object.values(C.history).filter(h => !open.has(h.id) && looksLikeProduct(h));
  const promo = hs.filter(h => bestOffer(h.name)).slice(0, 4).map(h => ({ h, p: bestOffer(h.name) }));
  const due = hs.filter(h => h.count >= 2 && h.avg && (now - h.lastAt) / h.avg > .8 && !promo.some(x => x.h === h)).sort((a, b) => (now - b.lastAt) / b.avg - (now - a.lastAt) / a.avg).slice(0, 5);
  const freq = hs.filter(h => now - h.lastAt > 2 * 864e5 && !due.includes(h) && !promo.some(x => x.h === h)).sort((a, b) => b.count - a.count).slice(0, Math.max(0, 6 - due.length));
  return { promo, due, freq }; }

// ---------- adding: from the voice or the field ----------
const openItems = () => Object.values(C.items).filter(i => !i.deleted && !i.done);
let newIds = new Set(); const ticking = new Set(), lit = new Map();   // (lit: id -> when its highlight started)
function addItems(list, removes = []) {
  const added = []; const open = openItems();
  for (const it of list) { const ex = open.find(o => norm(o.name) === norm(it.name));
    if (ex) { if (it.qty != null) put('items', { ...ex, qty: it.qty, unit: it.unit }, true); continue; }
    const item = { id: uid(), name: it.name, qty: it.qty ?? null, unit: it.unit ?? null, cat: CATS[it.category || it.cat] ? (it.category || it.cat) : 'dom', emoji: it.emoji || null, note: it.note || null,
      q: it.question || null, opts: (it.options || []).slice(0, 3), done: false, deleted: false, createdAt: Date.now() };
    newIds.add(item.id); lit.set(item.id, Date.now()); put('items', item, true); added.push(item); }
  for (const r of removes) { const ex = open.find(o => norm(o.name).includes(norm(r)) || norm(r).includes(norm(o.name))); if (ex) put('items', { ...ex, deleted: true }, true); }
  render(); promosSoon(); compareSoon(); setTimeout(() => newIds.clear(), 1200); setTimeout(() => { const t = Date.now(); lit.forEach((at, id) => t - at > 4400 && lit.delete(id)); }, 4500);
  const first = added[0] && document.querySelector(`.row[data-id="${added[0].id}"]`); if (first) { const r = first.getBoundingClientRect(), dock = $('.dock')?.getBoundingClientRect().top ?? innerHeight; if (r.top < 70 || r.bottom > dock) first.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  return added; }
async function addText(text) {
  text = fixWords(text.trim()); if (!text) return;
  hear(text, 'think');
  try { const r = await api('/api/parse', { text }); const added = addItems(r.items || [], r.remove || []);
    hear(null); if (added.length) snack(added, text); else toast((r.remove || []).length ? 'Usunięto z listy' : 'Nic nowego na liście'); }
  catch (e) { hear(null); if (e.message !== 'auth') { const added = addItems(text.split(/[,;\n]+/).map(s => ({ name: s.trim().replace(/^./, c => c.toUpperCase()), category: 'dom' })).filter(i => i.name)); if (added.length) snack(added, text, 'Bez sieci, dodano'); } } }

// ---------- the voice: hold the button and speak; let go and it goes on the list ----------
// (the browser may end recognition by itself, after a pause or a hiccup: while the button is held it starts again;
//  once it is let go we finish with what was heard, even when the recogniser has already stopped or never answers)
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, heard = '', interim = '', held = false, finished = true, downAt = 0, finishT = 0;
function startVoice() {
  if (!SR) { toast('Ta przeglądarka nie dyktuje. Użyj mikrofonu z klawiatury.'); $('#q').focus(); return; }
  if (held) return;
  heard = ''; interim = ''; held = true; finished = false; downAt = Date.now(); clearTimeout(finishT);
  listen(); $('.mic').classList.add('rec'); hear(null, 'rec'); vib(10); }
function listen() {
  const r = new SR(); rec = r; r.lang = 'pl-PL'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
  r.onresult = e => { if (r !== rec) return; interim = ''; for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) heard += t + ' '; else interim += t; } hear(fixWords((heard + interim).trim()) || null, 'rec'); };
  r.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { toast('Zezwól na mikrofon w ustawieniach przeglądarki'); held = false; } };
  r.onend = () => { if (r !== rec) return; rec = null; if (interim) { heard += interim + ' '; interim = ''; }
    if (held && Date.now() - downAt < 90e3) { try { listen(); } catch { finish(); } } else finish(); };
  try { r.start(); } catch { } }
function stopVoice() { if (!held) return; held = false; $('.mic')?.classList.remove('rec');
  if (!rec) return finish();
  try { rec.stop(); } catch { }
  clearTimeout(finishT); finishT = setTimeout(() => { if (!rec) return; const r = rec; rec = null; try { r.abort(); } catch { } finish(); }, 1500); }
function finish() { if (finished) return; finished = true; clearTimeout(finishT); $('.mic')?.classList.remove('rec');
  const t = (heard + ' ' + interim).trim(); heard = ''; interim = '';
  if (t) addText(t); else { hear(null); if (Date.now() - downAt < 450) toast('Przytrzymaj i mów'); } }
function hear(text, mode) { const el = $('.hear'); if (!el) return;
  if (!mode) { el.classList.remove('show'); return; }
  el.classList.add('show'); el.classList.toggle('think', mode === 'think');
  el.querySelector('small .lbl').textContent = mode === 'think' ? 'Rozumiem…' : 'Słucham';
  const p = el.querySelector('p'); p.textContent = text || 'Mów, czego potrzebujesz…'; p.classList.toggle('ph', !text); }
// (the snackbar after adding: what landed on the list, and a way back: "Zmień" puts the words in the field, the bin takes them off)
let snackT = 0, editFrom = null;
function snack(added, text, lead = 'Dodano') { const el = $('.snack'); if (!el) return; $('.toast')?.classList.remove('show');
  el.querySelector('.st').innerHTML = `<b>${lead}:</b> ${added.map(i => esc(i.name + (i.qty == null ? '' : i.unit ? ' ' + qtyText(i) : ' ×' + qtyText(i)))).join(', ')}`;
  const hide = () => { el.classList.remove('show'); clearTimeout(snackT); };
  const drop = () => { added.forEach(a => { const cur = C.items[a.id]; if (cur && !cur.deleted) put('items', { ...cur, deleted: true }, true); lit.delete(a.id); }); render(); compareSoon(); hide(); };
  el.querySelector('[data-s=edit]').onclick = () => { drop(); editFrom = text; const q = $('#q'); q.value = text; $('#f').classList.add('has'); q.focus(); q.setSelectionRange(text.length, text.length); };
  const del = el.querySelector('[data-s=del]'); del.setAttribute('aria-label', added.length === 1 ? `Usuń: ${added[0].name}` : 'Usuń dodane');
  del.onclick = () => { drop(); vib(10); toast(added.length === 1 ? 'Usunięto z listy' : `Usunięto ${added.length}`); };
  const run = ms => { clearTimeout(snackT); snackT = setTimeout(hide, ms); };
  el.onpointerenter = () => clearTimeout(snackT); el.onpointerleave = () => run(2500); el.onfocusin = () => clearTimeout(snackT);
  el.classList.add('show'); run(5000); }
let toastT = 0; function toast(t) { $('.snack')?.classList.remove('show'); const el = $('.toast'); if (!el) return; el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200); }

// ---------- ticking off: the circle fills and a pencil line is drawn through the name; the item stays where it is ----------
const CAT_EMOJI = { warzywa: '🥦', pieczywo: '🥖', nabial: '🥛', mieso: '🥩', wedliny: '🧀', mrozonki: '🧊', suche: '🍝', konserwy: '🥫', przyprawy: '🧂', sniadanie: '🍪', kawa: '☕', napoje: '🥤', alkohol: '🍷', chemia: '🧽', higiena: '🧴', dziecko: '🍼', zwierzeta: '🐾', dom: '🏠' };
// ---------- emoji: from the AI or the catalog's stems; when nothing fits, the aisle's own (except "other") ----------
function emojiGuess(name) { if ((CAT.nonfood || []).some(w => (String(name || '').toLowerCase() + ' ').startsWith(w))) return null; const n = String(name || '').toLowerCase(), words = n.split(/[\s,-]+/).filter(Boolean), list = CAT.emoji || [];
  for (const [k, e] of list) if (k.includes(' ') ? (n + ' ').includes(k) : (words[0] || '').startsWith(k)) return e;
  for (const [k, e] of list) if (!k.includes(' ') && words.some(w => w.startsWith(k))) return e;
  return null; }
const emojiOf = it => it.emoji || emojiGuess(it.name) || (it.cat && it.cat !== 'dom' && looksLikeProduct(it) ? CAT_EMOJI[it.cat] : null);
function tick(row, it) {
  if (it.done) { put('items', { ...it, done: false, doneAt: null }); return; }   // (a second tap takes the line back off)
  if (row.classList.contains('on')) return; row.classList.add('on'); ticking.add(it.id); vib(12);
  setTimeout(() => { ticking.delete(it.id); remember(it); learn(it.cat); put('items', { ...it, done: true, doneAt: Date.now() }); }, 560); }
// (each line a touch its own: nearly straight, the slightest rise and dip, seeded by the item)
function pencil(id) { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const r = k => ((h >>> k) % 100) / 100;
  const y0 = 4.6 + r(1) * .9, y1 = 4 + r(5) * 1.4, y2 = 4.2 + r(9) * 1.2, y3 = 4.4 + r(13) * 1;
  return `M1 ${y0.toFixed(2)} C 28 ${y1.toFixed(2)}, 62 ${y2.toFixed(2)}, 99 ${y3.toFixed(2)}`; }

// ---------- swipe left to delete ----------
function swipe(row, it) {
  const line = row.querySelector('.line'); let x0 = 0, y0 = 0, dx = 0, on = false, dir = null;
  line.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; x0 = e.clientX; y0 = e.clientY; dx = 0; on = true; dir = null; });
  line.addEventListener('pointermove', e => { if (!on) return; const mx = e.clientX - x0, my = e.clientY - y0;
    if (!dir && Math.hypot(mx, my) > 8) { dir = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'; if (dir === 'x') { row.classList.add('swiping'); try { line.setPointerCapture(e.pointerId); } catch { } } }
    if (dir !== 'x') return; dx = Math.min(0, mx); const v = dx < -90 ? -90 + (dx + 90) * .45 : dx; line.style.transform = `translateX(${v}px)`; });
  const end = () => { if (!on) return; on = false; row.classList.remove('swiping'); if (dir === 'x' && dx < -110) { vib(15); put('items', { ...it, deleted: true }); } else line.style.transform = ''; };
  line.addEventListener('pointerup', end); line.addEventListener('pointercancel', end); }

// ---------- the list ----------
const qtyText = it => it.qty == null ? '' : `${String(it.qty).replace('.', ',')}${it.unit ? ' ' + it.unit : ''}`;
const plural = (n, one, few, many) => n === 1 ? one : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? few : many;
const pct = p => p.oldPrice ? `−${Math.round((1 - p.price / p.oldPrice) * 100)}%` : '';
const IN = { lidl: 'Lidlu', biedronka: 'Biedronce', kaufland: 'Kauflandzie' }, THRU = { lidl: 'Lidla', biedronka: 'Biedronkę', kaufland: 'Kauflanda' };
function rowEl(it) {
  const done = it.done || ticking.has(it.id), row = document.createElement('div');
  row.className = 'row' + (done ? ' on' : '') + (newIds.has(it.id) ? ' new' : '') + (lit.has(it.id) && !done ? ' lit' : ''); row.dataset.id = it.id;
  if (lit.has(it.id)) row.style.setProperty('--lt', `${lit.get(it.id) - Date.now()}ms`);   // (a re-render picks the glow up where it was)
  const p = !it.done && bestOffer(it.name), q = qtyText(it);
  row.innerHTML = `<div class="del">Usuń</div><div class="line"><div class="c">
    <span class="em${emojiOf(it) ? '' : ' none'}" style="--tile:var(--t-${it.cat})">${emojiOf(it) ? esc(emojiOf(it)) : ''}</span>
    <div class="txt"><div class="nm"><b>${esc(it.name)}</b>${q ? `<span class="qty">${esc(q)}</span>` : ''}<svg class="strike" viewBox="0 0 100 9" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="${pencil(it.id)}"/></svg></div>
      ${it.note ? `<div class="meta"><span>${esc(it.note)}</span></div>` : ''}${p ? `<button class="deal" type="button" data-promo aria-label="Promocja: ${esc(p.name)}">${pct(p) ? `<span class="pill">${pct(p)}</span>` : ''}<span class="dn">${esc(p.name)}</span><span class="dp"><b>${zl(p.price)}</b>${p.oldPrice ? `<s>${zl(p.oldPrice)}</s>` : ''}</span></button>` : ''}
      ${!it.done && it.q ? `<div class="ask"><span>${esc(it.q)}</span>${(it.opts || []).map(o => `<button type="button" data-opt="${esc(o)}">${esc(o)}</button>`).join('')}</div>` : ''}</div>
    <button class="chk" type="button" aria-pressed="${done}" aria-label="${done ? 'Przywróć' : 'Kupione'}: ${esc(it.name)}">${ic('check', 2.4)}</button></div></div>`;
  row.querySelector('.chk').onclick = () => tick(row, it);
  row.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => { put('items', { ...it, name: b.dataset.opt, q: null, opts: [] }); promosSoon(); });
  const pb = row.querySelector('[data-promo]'); if (pb) pb.onclick = () => offersSheet(it);
  swipe(row, it); return row; }
let seenCats = new Set(), chipsKey = '';
function renderList() {
  const wrap = $('#list'), id = store(), order = orderFor(id), all = Object.values(C.items).filter(i => !i.deleted), open = all.filter(i => !i.done), done = all.filter(i => i.done);
  const s = storeOf(id), np = open.filter(i => bestOffer(i.name)).length;
  wrap.innerHTML = '';
  if (np) wrap.insertAdjacentHTML('beforeend', `<div class="pband"><div class="c"><span class="pill">%</span>${np} ${plural(np, 'produkt', 'produkty', 'produktów')} z listy taniej w ${IN[s.id] || s.name}</div></div>`);
  if (!all.length) { renderEmpty(wrap); return; }
  for (const cat of order) { const its = all.filter(i => i.cat === cat).sort((a, b) => a.createdAt - b.createdAt); if (!its.length) continue; const c = CATS[cat], left = its.filter(i => !i.done).length;
    const sec = document.createElement('section'); sec.className = 'sec' + (seenCats.has(cat) ? '' : ' enter');
    sec.innerHTML = `<div class="h"><div class="c">${esc(c.name)}<span class="n">${left ? left : '✓'}</span></div></div>`;
    for (const it of its) sec.appendChild(rowEl(it)); wrap.appendChild(sec); }
  seenCats = new Set(all.map(i => i.cat));
  const cs = CAT.stores.filter(x => CMP[x.id]), best = cs.slice().sort((a, b) => CMP[b.id].save - CMP[a.id].save)[0];
  if (open.length && cs.length && best && CMP[best.id].save > 0) {
    wrap.insertAdjacentHTML('beforeend', `<section class="cmp"><div class="h"><div class="c">Gdzie dziś taniej</div></div>
      <div class="lead"><div class="c">W <mark>${IN[best.id]}</mark> dzięki promocjom zaoszczędzisz najwięcej: około ${zl(CMP[best.id].save)} na tej liście.</div></div>
      <div class="grid">${cs.map(x => `<div class="cell${x.id === best.id ? ' best' : ''}" style="--sc:${x.color}"><span class="s"><i></i>${x.name}</span><b>${CMP[x.id].save > 0 ? '−' + zl(CMP[x.id].save) : '0 zł'}</b><small>${CMP[x.id].n} ${plural(CMP[x.id].n, 'produkt', 'produkty', 'produktów')} w promocji</small></div>`).join('')}</div>
      <p class="note">Oszczędność z gazetek, dla produktów z listy. Pełnego kosztu zakupów nie liczymy, bo sklepy nie podają zwykłych cen.</p></section>`); }
  if (done.length) { wrap.insertAdjacentHTML('beforeend', `<div class="sum"><div class="c"><span>Kupione ${done.length} z ${all.length}</span><button type="button" id="clearDone">Usuń kupione z listy</button></div></div>`);
    $('#clearDone').onclick = () => { done.forEach(i => put('items', { ...i, deleted: true }, true)); render(); }; }
  renderShopPromos(wrap, open); }
// ---------- the empty list: a clear "nothing here yet", what you might want, and this week's offers in each shop ----------
const STAPLES = [['Mleko', 'nabial'], ['Chleb', 'pieczywo'], ['Jajka', 'nabial'], ['Masło', 'nabial'], ['Banany', 'warzywa'], ['Pomidory', 'warzywa'], ['Ser żółty', 'nabial'], ['Kawa', 'kawa'], ['Jogurt', 'nabial'], ['Makaron', 'suche'], ['Kurczak', 'mieso'], ['Jabłka', 'warzywa']];
let EP = {}, epAt = 0, epBusy = false;
const looksLikeProduct = h => h.name.length <= 32 && h.name.trim().split(/s+/).length <= 4;   // (dictated notes to the app live in history too)
function picksForEmpty() { const hs = Object.values(C.history).filter(looksLikeProduct).sort((a, b) => b.count - a.count || b.lastAt - a.lastAt).slice(0, 8).map(h => ({ name: h.name, cat: h.cat, emoji: h.emoji }));
  for (const [name, cat] of STAPLES) { if (hs.length >= 8) break; if (!hs.some(h => norm(h.name) === norm(name))) hs.push({ name, cat }); }
  return hs; }
async function loadShopPromos() { if (epBusy || Date.now() - epAt < 30 * 60e3) return; epBusy = true;
  const names = [...new Set([...Object.values(C.history).filter(looksLikeProduct).sort((a, b) => b.count - a.count).slice(0, 8).map(h => h.name), ...STAPLES.map(s => s[0])])].slice(0, 16);
  await Promise.all(CAT.stores.map(async s => { try { const r = await api('/api/promos', { store: s.id, names }), list = [];
    for (const n of names) { const o = (r.promos || {})[n]; if (o && o[0]) list.push({ term: n, o: o[0], cat: (STAPLES.find(x => x[0] === n) || [])[1] || (C.history[norm(n)] || {}).cat }); }
    const off = x => x.o.oldPrice ? 1 - x.o.price / x.o.oldPrice : 0; EP[s.id] = list.sort((a, b) => off(b) - off(a)).slice(0, 8); } catch { EP[s.id] = EP[s.id] || null; } }));
  epAt = Date.now(); epBusy = false; render(); }
const epRow = ({ term, o, cat }) => `<button class="ep" type="button" data-add="${esc(term)}" data-cat="${esc(cat || '')}" style="--tile:var(--t-${cat || 'dom'})"><span class="em">${esc(emojiGuess(o.name) || emojiGuess(term) || CAT_EMOJI[cat] || '🛒')}</span><span class="en">${esc(o.name)}</span><span class="dp">${pct(o) ? `<span class="pill">${pct(o)}</span>` : ''}<b>${zl(o.price)}</b>${o.oldPrice ? `<s>${zl(o.oldPrice)}</s>` : ''}</span><span class="pl" aria-hidden="true">${ic('plus', 2.2)}</span></button>`;
const wireAdds = root => root.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { const added = addItems([{ name: b.dataset.add, category: b.dataset.cat || undefined }]); vib(8); if (added.length) snack(added, b.dataset.add); });
// (under a list in progress: this shop's offers on things you usually buy, on grey, one tap to add)
function renderShopPromos(wrap, open) { const id = store(), l = EP[id]; loadShopPromos();
  const have = new Set(open.map(i => norm(i.name).split(' ')[0])), rows = (l || []).filter(x => !have.has(norm(x.term).split(' ')[0])).slice(0, 6);
  if (l && !rows.length) return;
  wrap.insertAdjacentHTML('beforeend', `<section class="shp"><div class="h"><div class="c"><span class="pill">%</span>Promocje w ${IN[id] || storeOf(id).name}<span class="n">${l ? rows.length : ''}</span></div></div>
    ${l === undefined ? '<div class="epw"><div class="orbs small"><i></i><i></i><i></i></div>Szukam w gazetce…</div>' : l === null ? '<div class="epw">Nie udało się pobrać promocji.</div>' : rows.map(epRow).join('')}
    <p class="note">Produkty, które zwykle kupujesz, teraz taniej. Dotknij, żeby dopisać do listy.</p></section>`);
  wireAdds(wrap.querySelector('.shp')); }
function renderEmpty(wrap) {
  const picks = picksForEmpty(), cur = store(), stores = [CAT.stores.find(s => s.id === cur), ...CAT.stores.filter(s => s.id !== cur)].filter(Boolean);
  const promoBlock = s => { const l = EP[s.id];
    const body = l === undefined ? `<div class="epw"><div class="orbs small"><i></i><i></i><i></i></div>Szukam w gazetce…</div>`
      : !l || !l.length ? `<div class="epw">${l === null ? 'Nie udało się pobrać promocji.' : 'Brak promocji na popularne produkty.'}</div>`
      : l.slice(0, 4).map(epRow).join('');
    return `<div class="eps" style="--sc:${s.color}"><div class="esh"><i></i>${esc(s.name)}</div>${body}</div>`; };
  wrap.insertAdjacentHTML('beforeend', `<div class="empty"><div class="c">
      <div class="eart" aria-hidden="true"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="58" class="ea-bg"/><path class="ea-ln" d="M30 50h60l-6 34a6 6 0 0 1-6 5H42a6 6 0 0 1-6-5z"/><path class="ea-ln" d="M46 50l10-18M74 50L64 32"/><path class="ea-ln ea-dash" d="M44 64h32M47 75h26"/><circle cx="90" cy="34" r="7" class="ea-dot"/></svg></div>
      <h2>Lista jest pusta</h2><p>Nie masz jeszcze żadnych produktów. Przytrzymaj zielony przycisk i powiedz, czego potrzebujesz.</p></div></div>
    <section class="sec ex"><div class="h"><div class="c">Może cię zainteresować</div></div><div class="c picks">${picks.map((p, i) => `<button class="chip" type="button" data-add="${esc(p.name)}" data-cat="${esc(p.cat || '')}" style="--i:${i};--tile:var(--t-${p.cat || 'dom'})"><span class="e">${esc(emojiGuess(p.name) || p.emoji || CAT_EMOJI[p.cat] || '•')}</span>${esc(p.name)}</button>`).join('')}</div></section>
    <section class="sec ex"><div class="h"><div class="c">Promocje w tym tygodniu</div></div>${stores.map(promoBlock).join('')}<p class="note">Z gazetek sieci (ding.pl). Dotknij, żeby dodać na listę.</p></section>`);
  wireAdds(wrap); loadShopPromos(); }
function clearAllSheet() { const all = Object.values(C.items).filter(i => !i.deleted), n = all.length; if (!n) return;
  const close = sheet(`<div class="warn"><span class="wi">${ic('trash', 2)}</span><h3>Wyczyścić całą listę?</h3>
      <p>Usuniesz wszystkie ${n} ${plural(n, 'pozycję', 'pozycje', 'pozycji')}, także te jeszcze niekupione. Lista zniknie też u pozostałych osób, z którymi ją dzielisz.</p>
      <div class="wb"><button type="button" class="ghost" data-a="keep">Zostaw</button><button type="button" class="danger" data-a="wipe">Wyczyść listę</button></div></div>`, sh => {
    sh.querySelector('[data-a=keep]').onclick = () => close();
    sh.querySelector('[data-a=wipe]').onclick = () => { all.forEach(i => put('items', { ...i, deleted: true }, true)); lit.clear(); vib(20); close(); render(); compareSoon(); toast(`Lista wyczyszczona: ${n} ${plural(n, 'pozycja', 'pozycje', 'pozycji')}`); };
    setTimeout(() => sh.querySelector('[data-a=keep]')?.focus(), 420); }); }
function renderChips() {
  const el = $('#chips'); if (!Object.values(C.items).some(i => !i.deleted)) { el.innerHTML = ''; el.hidden = true; chipsKey = ''; return; }
  const { promo, due, freq } = suggestions(); let i = 0;
  const key = [...promo.map(x => x.h.id + x.p.price), ...due.map(h => h.id), ...freq.map(h => h.id)].join('|'); if (key === chipsKey) return; chipsKey = key;
  if (!key) { el.innerHTML = ''; el.hidden = true; return; } el.hidden = false;
  const chip = (h, extra) => `<button class="chip" data-h="${esc(h.id)}" style="--i:${i++};--tile:var(--t-${h.cat})"><span class="e">${esc(h.emoji || emojiGuess(h.name) || CAT_EMOJI[h.cat] || '•')}</span>${esc(h.name)}${extra || ''}</button>`;
  el.innerHTML = '<span class="lbl">Może też</span>' + promo.map(({ h, p }) => chip(h, ` <span class="pill">${pct(p) || zl(p.price)}</span>`)).join('') + due.map(h => chip(h)).join('') + freq.map(h => chip(h)).join('');
  el.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { const h = C.history[b.dataset.h]; if (h) { const added = addItems([{ name: h.name, category: h.cat, emoji: h.emoji }]); vib(8); if (added.length) snack(added, h.name); } }); }

// ---------- sheets: the order of the aisles, the offers, the menu ----------
function sheet(html, mount) {
  const sc = $('.scrim'), sh = $('.sheet'); sh.innerHTML = '<div class="grab"></div>' + html; mount && mount(sh);
  sc.classList.add('show'); sh.classList.add('show'); const close = () => { sc.classList.remove('show'); sh.classList.remove('show'); }; sc.onclick = close; return close; }
function orderSheet() {
  const id = store(), st = C.stores[id] || {}, n = (st.sessions || []).length, name = storeOf(id).name;
  const close = sheet(`<h3>Działy w ${IN[id] || name}</h3><div class="list" id="ord">${orderFor(id).map(c => `<div class="ord" data-c="${c}"><span class="e">${CAT_EMOJI[c]}</span>${esc(CATS[c].name)}<span class="gr">${ic('grip')}</span></div>`).join('')}</div>
    <p class="hint">${st.custom ? 'Ułożone przez Ciebie.' : n ? `Ułożone z Twoich ${n} ${plural(n, 'wizyty', 'wizyt', 'wizyt')}: apka patrzy, w jakiej kolejności odhaczasz.` : 'Kolejność uczy się sama: odhaczaj w sklepie po drodze, a następnym razem lista ułoży się jak Twoja trasa. Możesz też przeciągnąć działy.'}</p>
    ${st.custom || n ? '<button class="link" id="reset">Przywróć domyślną kolejność</button>' : ''}`, sh => {
    const r = sh.querySelector('#reset'); if (r) r.onclick = () => { put('stores', { id, sessions: [], custom: null }); close(); };
    dragOrder(sh.querySelector('#ord'), list => put('stores', { id, ...(C.stores[id] || {}), custom: list })); }); }
function dragOrder(box, done) {   // (drag a row by its handle; the others make room)
  box.querySelectorAll('.gr').forEach(g => g.addEventListener('pointerdown', e => {
    const row = g.closest('.ord'), rows = [...box.children], h = row.offsetHeight, i0 = rows.indexOf(row), y0 = e.clientY; let to = i0;
    row.classList.add('lift'); g.setPointerCapture(e.pointerId); e.preventDefault();
    const move = ev => { const dy = ev.clientY - y0; row.style.transform = `translateY(${dy}px)`; to = Math.max(0, Math.min(rows.length - 1, i0 + Math.round(dy / h)));
      rows.forEach((r, k) => { if (r === row) return; const shift = (k > i0 && k <= to) ? -h : (k < i0 && k >= to) ? h : 0; r.style.transform = shift ? `translateY(${shift}px)` : ''; }); };
    const up = () => { g.removeEventListener('pointermove', move); g.removeEventListener('pointerup', up); rows.forEach(r => { r.style.transform = ''; }); row.classList.remove('lift');
      if (to !== i0) { rows.splice(i0, 1); rows.splice(to, 0, row); rows.forEach(r => box.appendChild(r)); done(rows.map(r => r.dataset.c)); vib(8); } };
    g.addEventListener('pointermove', move); g.addEventListener('pointerup', up); })); }
function offersSheet(it) { const s = storeOf(store()), offs = PR[it.name] || [], d = x => `${x.slice(8, 10)}.${x.slice(5, 7)}`;
  sheet(`<h3>${esc(it.name)} taniej</h3><div class="list">${offs.map(o => `<div class="off"><div>${esc(o.name)}<small>${s.name} · ${d(o.from)} – ${d(o.until)}</small></div><div class="r"><b>${zl(o.price)}</b>${o.oldPrice ? `<s>${zl(o.oldPrice)}</s>` : ''}</div></div>`).join('')}</div><p class="hint">Ceny z gazetek promocyjnych (ding.pl). Sprawdź warunki w sklepie, np. aplikację albo kupno kilku sztuk.</p>`); }
// ---------- the dictation dictionary: what I say → how it is written ----------
function wordsSheet() { const mine = Object.entries(myAliases()).sort((a, b) => a[0].localeCompare(b[0], 'pl')), n = Object.keys(CAT.aliases || {}).length;
  const close = sheet(`<h3>Słownik dyktowania</h3><p class="sub">Gdy powiesz słowo po lewej, na liście pojawi się to po prawej. Uczy się też samo: popraw dodany produkt przyciskiem „Zmień”.</p>
    <form class="wadd" id="wadd"><input name="a" placeholder="Mówię…" autocomplete="off" aria-label="Mówię"><span class="ar">→</span><input name="b" placeholder="Zapisz jako…" autocomplete="off" aria-label="Zapisz jako"><button type="submit" aria-label="Dodaj do słownika">${ic('plus', 2.2)}</button></form>
    <div class="wl">${mine.length ? mine.map(([a, b]) => `<div class="wr"><span class="wa">${esc(a)}</span><span class="ar">→</span><b>${esc(b)}</b><button type="button" data-w="${esc(a)}" aria-label="Usuń: ${esc(a)}">${ic('x', 2)}</button></div>`).join('') : '<p class="wnone">Jeszcze nic swojego. Dodaj parę powyżej albo popraw produkt po dyktowaniu.</p>'}</div>
    <p class="hint">Wbudowanych jest ${n} popularnych zapisów, np. łyski → whisky, keczup → ketchup, mocarella → mozzarella.</p>`, sh => {
    sh.querySelector('#wadd').onsubmit = e => { e.preventDefault(); const f = e.target; if (addAlias(f.a.value, f.b.value)) { vib(8); close(); setTimeout(wordsSheet, 380); } else f.a.focus(); };
    sh.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { dropAlias(b.dataset.w); b.closest('.wr').remove(); }); }); }
function menuSheet() { const t = theme();
  const close = sheet(`<h3>Koszyk</h3><div class="list">
    <button data-a="order">${ic('grip')}Kolejność działów w sklepie</button>
    <button data-a="words">${ic('book')}Słownik dyktowania</button>
    <button data-a="clear">${ic('check')}Usuń kupione z listy</button>
    ${Object.values(C.items).some(i => !i.deleted) ? `<button data-a="wipe" class="dz">${ic('trash')}Wyczyść całą listę</button>` : ''}
    <button data-a="theme">${ic('moon')}Motyw: ${t === 'dark' ? 'ciemny' : t === 'light' ? 'jasny' : 'jak w systemie'}</button>
    <button data-a="out">${ic('out')}Wyloguj to urządzenie</button></div><p class="hint">${aiOn ? 'Dyktowanie rozumie AI (Claude).' : 'AI wyłączone: dyktowanie dzieli prosty parser. Ustaw ANTHROPIC_API_KEY na serwerze, żeby rozumiało lepiej.'} Promocje z ding.pl.</p>`, sh => {
    sh.querySelector('[data-a=order]').onclick = () => { close(); setTimeout(orderSheet, 380); };
    sh.querySelector('[data-a=words]').onclick = () => { close(); setTimeout(wordsSheet, 380); };
    const wp = sh.querySelector('[data-a=wipe]'); if (wp) wp.onclick = () => { close(); setTimeout(clearAllSheet, 380); };
    sh.querySelector('[data-a=clear]').onclick = () => { Object.values(C.items).filter(i => i.done && !i.deleted).forEach(i => put('items', { ...i, deleted: true }, true)); render(); close(); };
    sh.querySelector('[data-a=theme]').onclick = () => { const n = t === 'system' ? 'dark' : t === 'dark' ? 'light' : 'system'; localStorage.setItem('koszyk.theme', n); applyTheme(); close(); setTimeout(menuSheet, 380); };
    sh.querySelector('[data-a=out]').onclick = () => { localStorage.removeItem('koszyk.token'); token = ''; close(); render(); }; }); }

// ---------- the mark: "koszyk", its o a ring with an aqua dot (something in the basket) ----------
// (the mark alone: a basket with the aqua dot; the name stays for screen readers)
const LOGO = '<span class="logo" role="img" aria-label="Koszyk"><svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="12" class="lg-bg"/><path class="lg-ln" d="M10.5 17h19l-1.9 10.6a2.2 2.2 0 0 1-2.2 1.9H14.6a2.2 2.2 0 0 1-2.2-1.9z"/><path class="lg-ln" d="M15.6 17l3.2-6M24.4 17l-3.2-6"/><circle cx="20" cy="23.2" r="2.5" class="lg-dot"/></svg></span>';

// ---------- the PIN ----------
function renderPin() {
  const app = $('#app'); let pin = '', busy = false;
  app.innerHTML = `<div class="pin">
    <header class="top"><div class="c">${LOGO}<span class="tag"><i></i><span>Lista<br>zakupów</span></span></div></header>
    <section class="hero"><div class="c"><h1>Wspólna lista<br><mark>zakupów</mark></h1><p class="lead">Wpisz PIN, żeby otworzyć listę rodziny.</p></div></section>
    <div class="cells" aria-live="polite" aria-label="Wpisane cyfry">${'<span><i></i></span>'.repeat(4)}</div>
    <div class="keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map((k, i) => k === '' ? '<span></span>' : `<button type="button" data-k="${k}" style="--i:${i}" aria-label="${k === 'del' ? 'Usuń cyfrę' : k}">${k === 'del' ? ic('back', 2) : k}</button>`).join('')}</div>
    <p class="pmsg" role="status"></p></div>`;
  const cells = app.querySelector('.cells'), msg = app.querySelector('.pmsg');
  const paint = () => cells.querySelectorAll('span').forEach((c, i) => c.classList.toggle('f', i < pin.length));
  const press = async k => { if (busy) return;
    if (k === 'del') pin = pin.slice(0, -1); else if (pin.length < 4) pin += k; else return;
    msg.textContent = ''; cells.classList.remove('err'); paint(); vib(5);
    if (pin.length < 4) return; busy = true;
    try { const r = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin, device: navigator.userAgent.slice(0, 60) }) }); const j = await r.json();
      if (r.ok && j.token) { cells.classList.add('ok'); vib(15); await new Promise(res => setTimeout(res, 520)); app.querySelector('.pin').classList.add('out'); await new Promise(res => setTimeout(res, 320));
        token = j.token; localStorage.setItem('koszyk.token', token); mounted = false; removeEventListener('keydown', onKey); render(); sync(); return; }
      msg.textContent = j.error || 'Błędny PIN. Spróbuj jeszcze raz.'; }
    catch { msg.textContent = 'Brak połączenia. Spróbuj za chwilę.'; }
    void cells.offsetWidth; cells.classList.add('err'); vib([20, 40, 20]);
    setTimeout(() => { pin = ''; paint(); busy = false; }, 380); };
  app.querySelectorAll('[data-k]').forEach(b => b.onclick = () => press(b.dataset.k));
  // (a keyboard works too: digits and backspace)
  const onKey = e => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('del'); };
  removeEventListener('keydown', window.__pinKey || (() => { })); window.__pinKey = onKey; addEventListener('keydown', onKey); }

// ---------- the page ----------
let mounted = false;
function mount() {
  $('#app').innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="graphite" x="-5%" y="-200%" width="110%" height="500%"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6"/></filter></svg>
    <header class="top"><div class="c">${LOGO}<span class="tag"><i></i><span>Lista<br>zakupów</span></span><span class="sp"></span>
      <button class="round" id="menuBtn" type="button" aria-label="Menu">${ic('more', 2.6)}</button></div></header>
    <section class="hero"><div class="c"><h1 id="h1"></h1><p id="lead"></p></div></section>
    <nav class="stores" aria-label="Sklep"><div class="c">${CAT.stores.map(s => `<button class="stb" type="button" data-s="${s.id}" style="--sc:${s.color}"><span class="d"></span>${s.name}</button>`).join('')}<button class="ordBtn" type="button" aria-label="Kolejność działów">${ic('grip')}</button></div></nav>
    <main id="list"></main>
    <div class="dock"><div class="chips" id="chips" hidden></div>
      <div class="c bar"><form class="field" id="f"><input id="q" placeholder="Dopisz produkt…" autocomplete="off" enterkeyhint="done"><button class="send" type="submit" aria-label="Dodaj">${ic('up', 2.2)}</button></form>
      <button class="mic" id="mic" type="button" aria-label="Przytrzymaj i mów">${ic('mic', 2)}</button></div></div>
    <div class="hear" aria-live="polite"><small><span class="wave"><b></b><b></b><b></b><b></b></span><span class="orbs small"><i></i><i></i><i></i></span><span class="lbl">Słucham</span></small><p class="ph"></p></div>
    <div class="toast" role="status"></div><div class="snack" role="status" aria-live="polite"><span class="st"></span><button type="button" data-s="edit">Zmień</button><button type="button" class="sx" data-s="del">${ic('trash', 1.8)}</button></div><div class="scrim"></div><div class="sheet" role="dialog" aria-modal="true"></div>`;
  $('#menuBtn').onclick = menuSheet; document.querySelector('.ordBtn').onclick = orderSheet;
  document.querySelectorAll('.stb').forEach(b => b.onclick = () => { if (b.dataset.s === store()) return; put('settings', { id: 'store', value: b.dataset.s }); PR = {}; prKey = ''; promosSoon(); vib(6); });
  const q = $('#q'), f = $('#f'); q.oninput = () => f.classList.toggle('has', !!q.value.trim());
  f.onsubmit = e => { e.preventDefault(); const t = q.value; q.value = ''; f.classList.remove('has');
    const learned = editFrom ? learnFromEdit(editFrom, t) : []; editFrom = null;
    addText(t).then(() => { if (learned.length) setTimeout(() => toast(`Zapamiętam: ${learned.map(([a, b]) => `„${a}” to ${b}`).join(', ')}`), 5300); }); };
  q.addEventListener('input', () => { if (!q.value.trim()) editFrom = null; });
  const mic = $('#mic'); mic.addEventListener('pointerdown', e => { e.preventDefault(); startVoice(); }); mic.addEventListener('contextmenu', e => e.preventDefault());
  mic.addEventListener('lostpointercapture', stopVoice); mic.addEventListener('pointerdown', e => { try { mic.setPointerCapture(e.pointerId); } catch { } });
  addEventListener('pointerup', stopVoice); addEventListener('pointercancel', stopVoice); addEventListener('blur', stopVoice);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopVoice(); }); $('.hear').addEventListener('click', stopVoice);   // (a tap on the panel ends it too)
  mounted = true; }
let heroKey = '';
function render() {
  if (!token) { mounted = false; return renderPin(); }
  if (!mounted) { mount(); heroKey = ''; }
  const s = storeOf(store()), all = Object.values(C.items).filter(i => !i.deleted), n = all.filter(i => !i.done).length;
  document.querySelectorAll('.stb').forEach(b => b.classList.toggle('on', b.dataset.s === s.id));
  $('#menuBtn').classList.toggle('off', !online);
  const day = ['w niedzielę', 'w poniedziałek', 'we wtorek', 'w środę', 'w czwartek', 'w piątek', 'w sobotę'][new Date().getDay()];
  const h1 = !all.length ? `Co kupujemy<br><mark>${day}?</mark>` : n ? `Do kupienia<br><mark>${n} ${plural(n, 'rzecz', 'rzeczy', 'rzeczy')}</mark>` : 'Wszystko<br><mark>w koszyku</mark>';
  if (h1 !== heroKey) { heroKey = h1; $('#h1').innerHTML = h1; }
  $('#lead').textContent = !all.length ? 'Przytrzymaj zielony przycisk i mów. Ułożymy listę tak, jak idziesz przez sklep.' : n ? `Ułożone po kolei, jak idziesz przez ${THRU[s.id] || s.name}.` : 'Lista na dziś odhaczona.';
  renderList(); renderChips(); }

render(); if (token) { sync(); promosSoon(); compareSoon(); }
if ('serviceWorker' in navigator && !/^(localhost|127\.)/.test(location.hostname)) navigator.serviceWorker.register('/sw.js').catch(() => { });
window.KOSZYK = { get C() { return C; }, addItems, addText, sync, get PR() { return PR; } };
