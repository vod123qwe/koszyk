// Koszyk: lista zakupów. Dyktujesz (przytrzymaj mikrofon), serwer rozumie tekst (Claude albo prosty parser), produkty układają się
// po działach w kolejności Twojego sklepu; kolejność uczy się z tego, jak odhaczasz. Wspólna lista: zmiany idą na serwer i wracają do
// drugiego telefonu po kilku sekundach. Promocje produktów z listy w wybranej sieci, podpowiedzi „Może też?”.
import { switcher } from './ds/switcher.js?v=2';
const CAT = await (await fetch('/catalog.json')).json();
const CATS = Object.fromEntries(CAT.categories.map(c => [c.id, c]));
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
const norm = s => String(s || '').toLowerCase().replace(/[^a-ząćęłńóśźż0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const foldPL = s => String(s).toLowerCase().replace(/[ąćęłńóśźż]/g, c => 'acelnoszz'['ąćęłńóśźż'.indexOf(c)]);   // (no Polish marks: "maslo" = "masło")
const vib = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch { } };
// (an app, not a page: no pinch or double-tap zoom; iOS ignores user-scalable=no, so its pinch gesture is stopped here too)
['gesturestart', 'gesturechange'].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));
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
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-2.7 3.4M6.6 7.6C4 9.3 2.5 12 2.5 12S6 18 12 18c1.6 0 3-.4 4.2-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  paper: '<path d="M5 4h11v15a2 2 0 0 0 2 2H7a2 2 0 0 1-2-2z"/><path d="M16 8h3v11a2 2 0 0 1-2 2M8.5 8h4.5M8.5 11.5h4.5M8.5 15h3"/>',
  swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
  rows: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', out: '<path d="M10 4H5v16h5M14 8l4 4-4 4M18 12H9"/>', bag: '<path d="M5 8h14l-1.5 12h-11zM9 8V6a3 3 0 0 1 6 0v2"/>',
};
const ic = (n, w = 1.8) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || I.box}</svg>`;

// ---------- theme ----------
const theme = () => { let t = 'system'; try { t = localStorage.getItem('koszyk.theme') || 'system'; } catch { } return t; };
function applyTheme() { const t = theme(), dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark); document.querySelector('meta[name=theme-color]').content = dark ? '#111116' : '#ffffff'; }
const iconsOn = () => localStorage.getItem('koszyk.icons') !== 'off';
function applyIcons() { document.documentElement.classList.toggle('no-ic', !iconsOn()); }
applyIcons(); applyTheme(); matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

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
// ---------- your shops: picked from every chain with a leaflet, shared by the family; the first is where you are by default ----------
const DEFAULT_STORES = ['lidl', 'biedronka', 'kaufland'];
const myIds = () => { const v = C.settings.myStores && C.settings.myStores.value, ok = Array.isArray(v) ? v.filter(id => CAT.stores.some(s => s.id === id)) : []; return ok.length ? ok : DEFAULT_STORES; };
const MY = () => myIds().map(id => CAT.stores.find(s => s.id === id));
const store = () => { const v = C.settings.store && C.settings.store.value, ids = myIds(); return ids.includes(v) ? v : ids[0]; };
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
  // (alcohol always ends the list, whatever was learned; only an order set by hand moves it)
  return [...def].sort((a, b) => (a === 'alkohol') - (b === 'alkohol') || score(a) - score(b)); }
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
let PR = {}, prKey = '', prT = 0, prWait = '';   // (prWait: the shop whose deals are on their way; its rows show skeletons)
function promosSoon() { clearTimeout(prT); prT = setTimeout(async () => {
  const s = storeOf(store()); if (!s.ding.length) { PR = {}; if (prWait) { prWait = ''; render(); } return; }
  const open = openItems().map(i => i.name), usual = Object.values(C.history).sort((a, b) => b.count - a.count).slice(0, 12).map(h => h.name);
  const names = [...new Set([...open, ...usual])], key = s.id + '|' + names.join('|'); if (key === prKey) return; prKey = key;
  try { const r = await api('/api/promos', { store: s.id, names }); if (r.store === store()) { PR = r.promos || {}; if (prWait === s.id) prWait = ''; render(); if (!promoChecked) setTimeout(promoChanges, 700); else snapshotPromos(); } }
  catch { if (prWait === s.id) { prWait = ''; render(); } } }, 900); }
// (a new shop: its deals are fetched again, the rows wait under skeletons)
function resetPromos(id) { PR = {}; prKey = ''; prWait = id || store(); }
const bestOffer = name => (PR[name] || [])[0];
function promoKinds(o) { const c = (o.cond || []).join(' | '), out = []; let m;
  if ((m = c.match(/(\d\+\d) gratis/))) out.push({ t: m[1] + ' gratis', k: 'multi' });
  else if ((m = c.match(/2\. sztuka (−\d+%)/))) out.push({ t: '2. szt. ' + m[1], k: 'multi' });
  else if ((m = c.match(/przy zakupie (\d+) szt/))) out.push({ t: 'przy ' + m[1] + ' szt.', k: 'multi' });
  if (/tylko z aplikacją/.test(c)) out.push({ t: 'z aplikacją', k: 'card' }); else if (/z kartą/.test(c)) out.push({ t: 'z kartą', k: 'card' });
  if (/różne rodzaje/.test(c)) out.push({ t: 'różne rodzaje', k: 'plain' });
  if (!out.length && o.oldPrice && o.oldPrice > o.price) out.push({ t: 'obniżka', k: 'plain' });
  return out; }
const kindBadges = (o, max = 2) => promoKinds(o).slice(0, max).map(k => `<span class="badge badge--${{ multi: 'warn', card: 'info', plain: 'neutral' }[k.k]}">${esc(k.t)}</span>`).join('');
const termsHtml = o => { const t = [...(o.cond || []), ...(o.size ? [o.size] : [])]; return t.length ? `<span class="terms">${t.map(x => `<span class="badge badge--pill badge--${/przy zakupie|gratis|2\. sztuka/.test(x) ? 'warn' : /kart|aplikac/.test(x) ? 'info' : /limit|wybranych/.test(x) ? 'special' : 'neutral'}">${esc(x)}</span>`).join('')}</span>` : ''; };
const perUnit = o => o.unit ? ` / ${o.unit}` : '';
// (the Offer: media, the exact name, one row of terms, one price line; meta = shop and dates when it helps; action = a full-width button)
const priceLine = o => `<span class="offer__price">${pct(o) ? `<span class="badge badge--promo">${pct(o)}</span>` : ''}<b>${zl(o.price)}${perUnit(o) ? `<small>${perUnit(o)}</small>` : ''}</b>${o.oldPrice ? `<s>${zl(o.oldPrice)}</s>` : ''}</span>`;
const offerHtml = (o, { action = '', meta = '', flat = false } = {}) => `<div class="offer${flat ? ' offer--flat' : ''}"><span class="offer__media" style="--tile:var(--t-${o.cat || 'dom'})">${esc(o.emoji || emojiGuess(o.name) || CAT_EMOJI[o.cat] || '•')}</span>
  <div class="offer__body"><b class="offer__name">${esc(o.title || o.name)}</b>${meta ? `<small class="offer__meta">${meta}</small>` : ''}${termsHtml(o)}${priceLine(o)}</div>${action ? `<div class="offer__action">${action}</div>` : ''}</div>`;
// ---------- promotions that ended or began since the last visit: said once, when you come back ----------
// (each product on the list remembers the cut it had in this shop; nothing is removed unless you tap the cross)
let promoChecked = false;
const realDeal = name => (PR[name] || []).find(o => o.oldPrice && o.oldPrice > o.price);
function subsFor(it, sid = store()) { const head = norm(it.name).split(' ')[0]; if (!head || head.length < 3) return [];
  const own = realDeal(it.name), ownKey = own ? norm(own.title || own.name) : '', mine = norm(it.name);
  return (EP[sid] || []).filter(o => o.oldPrice && o.oldPrice > o.price && offerFits(o.name, head) && (!it.cat || it.cat === 'dom' || !o.cat || o.cat === it.cat)
    && norm(o.title || o.name) !== ownKey && norm(o.title || o.name) !== mine).sort((a, b) => offPct(b) - offPct(a)).slice(0, 12); }
// (worth pointing at when you named a particular product, or when yours is not on offer)
const subsHint = it => { if (it.done) return []; const subs = subsFor(it); return subs.length && (!realDeal(it.name) || it.name.trim().split(/\s+/).length > 1) ? subs : []; };
function subsSheet(it) { const own = realDeal(it.name), subs = subsFor(it), sid = store(), sh0 = storeOf(sid);
  const close = sheet(`<h3>Zamienniki w promocji</h3><p class="sub">Ten sam rodzaj produktu, taniej w ${esc(IN[sid] || sh0.name)}. Ilość na liście zostanie.</p>
    <div class="sbcur"><small>Na Twojej liście</small>
      ${own ? offerHtml({ ...own, title: it.name + (qtyText(it) ? ' · ' + qtyText(it) : ''), cat: it.cat, emoji: emojiOf(it) }, { flat: true, meta: `teraz w promocji: ${esc(own.title || own.name)}` }) : `<div class="offer offer--flat"><span class="offer__media" style="--tile:var(--t-${it.cat})">${esc(emojiOf(it) || '•')}</span><div class="offer__body"><b class="offer__name">${esc(it.name)}${qtyText(it) ? ` · ${esc(qtyText(it))}` : ''}</b><small class="offer__meta">bez promocji w tym sklepie</small></div></div>`}</div>
    <div class="offers">${subs.map((o, i) => offerHtml(o, { action: `<button type="button" class="btn btn--secondary btn--block" data-swap="${i}">${ic('swap', 2)}Zamień na ten produkt</button>` })).join('')}</div>`, sh => {
    sh.querySelectorAll('[data-swap]').forEach(b => b.onclick = () => { const o = subs[+b.dataset.swap], cur = C.items[it.id]; if (!o || !cur) return;
      const name = o.title || o.name; put('items', { ...cur, name, cat: o.cat || cur.cat, emoji: o.emoji || null, promo: null, q: null, opts: [] });
      focusRow = { id: it.id, until: Date.now() + 2500 }; lit.set(it.id, Date.now()); vib(10); close(); promosSoon(); compareSoon(); toast(`Zamieniono na: ${name}`); }); }); }
const promoSnap = (o, sid) => o ? { store: sid, name: o.name, price: o.price, oldPrice: o.oldPrice, until: o.until } : null;
function snapshotPromos() { const sid = store();
  for (const it of openItems()) { const now = promoSnap(realDeal(it.name), sid), was = it.promo && it.promo.store === sid ? it.promo : it.promo === null ? null : undefined;
    if (JSON.stringify(now) !== JSON.stringify(was === undefined ? '-' : was)) put('items', { ...C.items[it.id], promo: now }, true); } }
function promoChanges() { if (promoChecked || !mounted || !token) return; promoChecked = true;
  const sid = store(), ended = [], fresh = [];
  for (const it of openItems()) { const now = realDeal(it.name), was = it.promo && it.promo.store === sid ? it.promo : null;
    if (was && !now) ended.push({ it, was });
    else if (now && it.promo === null) fresh.push({ it, now }); }
  snapshotPromos();
  if (!ended.length && !fresh.length) return;
  const row = (it, o, tail) => `<div class="pcr" data-id="${it.id}"><span class="em" style="--tile:var(--t-${it.cat})">${esc(emojiOf(it) || '•')}</span><span class="pct"><b>${esc(it.name)}</b><small>${esc(o.title || o.name)}${o.size ? ' · ' + esc(o.size) : ''}</small></span>${tail}</div>`;
  const close = sheet(`<h3>Promocje się zmieniły</h3><p class="sub">Od ostatniej wizyty w ${IN[sid] || storeOf(sid).name}. Nic nie usuwamy sami, zdecyduj, co zostaje na liście.</p>
    ${ended.length ? `<div class="lh pchh">Skończyły się<span>${ended.length}</span></div>${ended.map(({ it, was }) => row(it, was, `<span class="pcp"><s>${zl(was.price)}</s><small>teraz bez promocji</small></span><button class="pcx" type="button" data-rm="${it.id}" aria-label="Usuń z listy: ${esc(it.name)}">${ic('x', 2)}</button>`)).join('')}` : ''}
    ${fresh.length ? `<div class="lh pchh">Nowe promocje<span>${fresh.length}</span></div>${fresh.map(({ it, now }) => row(it, now, `<span class="pcp"><span class="badges r">${pct(now) ? `<span class="badge badge--promo">${pct(now)}</span>` : ''}${kindBadges(now, 1)}</span><b>${zl(now.price)}</b></span>`)).join('')}` : ''}
    <div class="pcb"><button type="button" class="btn btn--primary btn--lg btn--block ok">W porządku</button></div>`, sh => {
    sh.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const r = b.closest('.pcr'), it = C.items[b.dataset.rm]; if (!it) return;
      const gone = r.classList.toggle('gone'); put('items', { ...it, deleted: gone }, true); b.innerHTML = gone ? ic('up', 2) : ic('x', 2); b.setAttribute('aria-label', (gone ? 'Przywróć: ' : 'Usuń z listy: ') + it.name); vib(8); render(); });
    sh.querySelector('.ok').onclick = () => close(); }); }
let CMP = {}, cmpKey = '', cmpT = 0;
function compareSoon() { clearTimeout(cmpT); cmpT = setTimeout(async () => {
  const names = [...new Set(openItems().map(i => i.name))], key = names.join('|') + '@' + myIds().join(','); if (key === cmpKey) return; cmpKey = key;
  if (!names.length) { CMP = {}; render(); return; }
  const out = {}; await Promise.all(MY().map(async s => { try { const r = await api('/api/promos', { store: s.id, names }); let save = 0, n = 0;
    const hits = []; for (const nm of names) { const o = ((r.promos || {})[nm] || []).find(x => x.oldPrice && x.oldPrice > x.price); if (o) { hits.push({ item: nm, o }); save += o.oldPrice - o.price; n++; } }
    out[s.id] = { save, n, hits }; } catch { } }));
  CMP = out; storesKey = ''; render(); }, 1400); }

// ---------- suggestions: what is due again (from the rhythm you buy it in), what is on offer, what you buy most ----------
// (what you are likely to need and don't have yet: bought often, due again by your rhythm, cheaper today; then popular things)
// ---------- tile art: flat shapes in the tile corner, cropped by its rounding (colours from tokens, via classes) ----------
const ART_TAG = `<span class="tile__artbox" aria-hidden="true"><svg class="tile__art" viewBox="0 0 120 120">
  <circle class="a-soft" cx="86" cy="40" r="34"/>
  <g transform="rotate(-24 62 62)"><path class="a-main" d="M44 26h36a8 8 0 0 1 8 8v48a8 8 0 0 1-2.6 5.9L67.4 104a8 8 0 0 1-10.8 0L38.6 87.9A8 8 0 0 1 36 82V34a8 8 0 0 1 8-8z"/>
    <circle class="a-hole" cx="62" cy="41" r="6"/><text class="a-mark" x="62" y="81" text-anchor="middle">%</text></g></svg></span>`;
const ART_LEAF = `<span class="tile__artbox" aria-hidden="true"><svg class="tile__art" viewBox="0 0 120 120">
  <g transform="rotate(14 60 60)"><rect class="a-soft" x="34" y="20" width="56" height="74" rx="8"/></g>
  <g transform="rotate(-6 60 60)"><rect class="a-paper" x="30" y="18" width="58" height="76" rx="8"/>
    <rect class="a-line" x="40" y="30" width="18" height="14" rx="3"/><rect class="a-line" x="64" y="30" width="14" height="4" rx="2"/><rect class="a-line" x="64" y="38" width="10" height="4" rx="2"/>
    <rect class="a-line" x="40" y="52" width="38" height="4" rx="2"/><rect class="a-line" x="40" y="60" width="28" height="4" rx="2"/></g>
  <circle class="a-main" cx="86" cy="82" r="18"/><text class="a-mark" x="86" y="89" text-anchor="middle">%</text></svg></span>`;
// (everything you buy, the most likely first: often, due again by your rhythm, on offer now, bought lately; then the common basics)
function freqAll() { const now = Date.now(), out = [], seen = new Set();
  const score = h => h.count + (h.count >= 2 && h.avg && (now - h.lastAt) / h.avg > .8 ? 3 : 0) + (leafHit(h.name, h.cat) && offPct(leafHit(h.name, h.cat)) > 0 ? 1.5 : 0) + Math.max(0, 1 - (now - h.lastAt) / (30 * 864e5));
  for (const h of Object.values(C.history).filter(looksLikeProduct).sort((a, b) => score(b) - score(a))) { const k = norm(h.name); if (!seen.has(k)) { seen.add(k); out.push({ name: h.name, cat: h.cat, emoji: h.emoji, h }); } }
  for (const [name, cat] of CAT.common || []) { const k = norm(name); if (!seen.has(k)) { seen.add(k); out.push({ name, cat }); } }
  return out; }
function freqPicks() { const onList = new Set(openItems().map(i => norm(i.name))); return freqAll().filter(p => !onList.has(norm(p.name))).slice(0, 18); }
function freqHtml() { const picks = freqPicks(); if (!picks.length) return '';
  return `<section class="freq" data-anchor="freq"><div class="h"><div class="c">Często kupujesz<button type="button" class="btn btn--ghost btn--sm fq-all" data-fqall>Zobacz wszystkie</button></div></div>${pillRows(picks)}</section>`; }
// (two rows packed by width, so there are no gaps between pills; the rows scroll sideways together)
function pillRows(picks) {
  const rows = [[], []], w = [0, 0]; picks.forEach((p, i) => { const r = w[0] <= w[1] ? 0 : 1; rows[r].push([p, i]); w[r] += p.name.length + 6; });
  const pill = ([p, i]) => { const o = leafHit(p.name, p.cat), deal = o && offPct(o) > 0;
    return `<button type="button" class="chip chip--tile frq__chip" data-add="${esc(p.name)}" data-cat="${esc(p.cat || '')}" style="--tile:var(--t-${p.cat || 'dom'});--i:${i}"><span class="e">${esc(emojiGuess(p.name) || p.emoji || CAT_EMOJI[p.cat] || '•')}</span>${esc(p.name)}${deal ? `<span class="badge badge--promo">${pct(o)}</span>` : ''}<span class="frq__plus" aria-hidden="true">${ic('plus', 2.2)}</span></button>`; };
  return `<div class="frq"><div class="frq__rows">${rows.map(r => `<div class="frq__row">${r.map(pill).join('')}</div>`).join('')}</div></div>`; }
function suggestions() {
  const open = new Set(openItems().map(i => norm(i.name))), now = Date.now(), hs = Object.values(C.history).filter(h => !open.has(h.id) && looksLikeProduct(h));
  const promo = hs.map(h => ({ h, p: bestOffer(h.name) || leafHit(h.name, h.cat) })).filter(x => x.p).sort((a, b) => offPct(b.p) - offPct(a.p)).slice(0, 6);   // (on the list's promos or anywhere in this shop's leaflet)
  const due = hs.filter(h => h.count >= 2 && h.avg && (now - h.lastAt) / h.avg > .8 && !promo.some(x => x.h === h)).sort((a, b) => (now - b.lastAt) / b.avg - (now - a.lastAt) / a.avg).slice(0, 5);
  const freq = hs.filter(h => now - h.lastAt > 2 * 864e5 && !due.includes(h) && !promo.some(x => x.h === h)).sort((a, b) => b.count - a.count).slice(0, Math.max(0, 6 - due.length));
  return { promo, due, freq }; }

// ---------- adding: from the voice or the field ----------
const openItems = () => Object.values(C.items).filter(i => !i.deleted && !i.done);
let newIds = new Set(); const ticking = new Set(), lit = new Map();   // (lit: id -> when its highlight started)
// (a product said again adds to what is on the list: "mleko" twice is 2; "2 mleka" on top of 1 is 3; in kilos or litres one more,
//  in grams, decagrams or millilitres the same amount again; a different unit replaces the old amount)
const SMALL_UNITS = ['g', 'dag', 'ml'];
// (the same product in another number counts too: "chleb" and "chleby", "bułka" and "bułki", "jajko" and "jajka"; "ser" is not "serek")
const END_ = ['', 'a', 'e', 'i', 'o', 'y', 'ów'];
const sameWord = (a, b) => { if (a === b) return true; let i = 0; while (i < a.length && a[i] === b[i]) i++; return i >= 3 && END_.includes(a.slice(i)) && END_.includes(b.slice(i)); };
const sameProduct = (a, b) => { const x = norm(a).split(' '), y = norm(b).split(' '); return x.length === y.length && x.every((w, i) => sameWord(w, y[i])); };
function moreOf(ex, it) { const u = ex.unit ?? null, r = n => Math.round(n * 100) / 100;
  if (it.qty != null) return (it.unit ?? null) === u ? { qty: r((ex.qty ?? 1) + it.qty), unit: u } : { qty: it.qty, unit: it.unit ?? null };
  return { qty: r((ex.qty ?? 1) + (SMALL_UNITS.includes(u) && ex.qty ? ex.qty : 1)), unit: u }; }
function addItems(list, removes = []) {
  const added = [], bumped = []; const open = openItems();
  for (const it of list) { const ex = open.find(o => sameProduct(o.name, it.name));
    if (ex) { const nx = { ...ex, ...moreOf(ex, it) }; put('items', nx, true); open[open.indexOf(ex)] = nx; bumped.push(nx); lit.set(ex.id, Date.now()); continue; }   // (already there: one more, lit up)
    const item = { id: uid(), name: it.name, qty: it.qty ?? null, unit: it.unit ?? null, cat: CATS[it.category || it.cat] ? (it.category || it.cat) : 'dom', emoji: it.emoji || null, note: it.note || null,
      q: it.question || null, opts: (it.options || []).slice(0, 3), done: false, deleted: false, createdAt: Date.now() };
    newIds.add(item.id); lit.set(item.id, Date.now()); put('items', item, true); added.push(item); }
  const gone = []; for (const r of removes) { const ex = open.find(o => !o.deleted && !gone.includes(o.name) && (norm(o.name).includes(norm(r)) || norm(r).includes(norm(o.name)))); if (ex) { put('items', { ...ex, deleted: true }, true); gone.push(ex.name); } }
  added.removed = gone; added.bumped = bumped;
  render(); promosSoon(); compareSoon(); setTimeout(() => newIds.clear(), 1200); setTimeout(() => { const t = Date.now(); lit.forEach((at, id) => t - at > 4400 && lit.delete(id)); }, 4500);
  const firstId = added[0] ? added[0].id : bumped.length ? bumped[0].id : null; if (firstId) { focusRow = { id: firstId, until: Date.now() + 2500 }; if (!adderOpen) showFocus(true); }
  return added; }
const moreMsg = items => `Dodano: ${items.map(i => `${i.name} (razem ${qtyText(i)})`).join(', ')}`;
async function addText(text) {
  text = fixWords(text.trim()); if (!text) return;
  hear(text, 'think');
  try { const r = await api('/api/parse', { text }); const added = addItems(r.items || [], r.remove || []);
    hear(null); const gone = added.removed || []; if (added.length) snack(added, text, 'Dodano', gone); else toast(gone.length ? `Usunięto: ${gone.join(', ')}` : added.bumped.length ? moreMsg(added.bumped) : (r.remove || []).length ? 'Tego nie ma na liście' : 'Nic nowego na liście'); return added; }
  catch (e) { hear(null); if (e.message !== 'auth') { const added = addItems(text.split(/[,;\n]+/).map(s => ({ name: s.trim().replace(/^./, c => c.toUpperCase()), category: 'dom' })).filter(i => i.name)); if (added.length) snack(added, text, 'Bez sieci, dodano'); return added; } } }

// ---------- the voice: hold the button and speak; let go and it goes on the list ----------
// (the browser may end recognition by itself, after a pause or a hiccup: while the button is held it starts again;
//  once it is let go we finish with what was heard, even when the recogniser has already stopped or never answers)
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, heard = '', interim = '', held = false, finished = true, downAt = 0, finishT = 0;
function startVoice() {
  if (!SR) { toast('Ta przeglądarka nie dyktuje. Użyj mikrofonu z klawiatury.'); openAdder(); return; }
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
// ---------- adding by typing: a tall sheet that stays open, the field right above the keyboard ----------
// (empty: what you bought lately and what's popular; typing: your history, popular products and this shop's offers that fit)
let adderOpen = false, adderMsgT = 0;
const adderEl = () => $('.adder');
// (full screen and opaque, so nothing shows through; the page underneath is pinned so iOS can't slide it; the rest of the app is
//  inert while you type, so the keyboard has no "next field" to jump to)
let adderY = 0, fitT = 0;
function pinPage(on) { const b = document.body;
  if (on) { adderY = scrollY; b.style.position = 'fixed'; b.style.top = -adderY + 'px'; b.style.left = '0'; b.style.right = '0'; }
  else { b.style.position = b.style.top = b.style.left = b.style.right = ''; scrollTo(0, adderY); } }
function inertRest(on) { document.querySelectorAll('#app > *').forEach(n => { if (!n.classList.contains('adder') && !n.classList.contains('toast') && !n.classList.contains('snack')) n.inert = on; }); }
function openAdder(prefill = '') { const el = adderEl(), q = $('#adQ'); if (!el) return;
  adderOpen = true; document.documentElement.classList.add('adding'); el.hidden = false; pinPage(true); inertRest(true); requestAnimationFrame(() => el.classList.add('show'));
  q.value = prefill; q.focus(); if (prefill) q.setSelectionRange(prefill.length, prefill.length);
  // (the keyboard slides in over ~half a second: follow it frame by frame for a moment)
  const t0 = performance.now(); cancelAnimationFrame(fitT); const follow = () => { fitAdder(); if (performance.now() - t0 < 900) fitT = requestAnimationFrame(follow); }; follow();
  adderRender(); }
function closeAdder() { const el = adderEl(); if (!el || !adderOpen) return; adderOpen = false; document.documentElement.classList.remove('adding'); inertRest(false); pinPage(false); if (focusRow) { focusRow.until = Date.now() + 2500; setTimeout(() => showFocus(true), 380); } editFrom = null; $('#adQ').blur(); el.classList.remove('show'); setTimeout(() => { if (!adderOpen) el.hidden = true; }, 380); }
// (iOS keeps the layout height when the keyboard is up: follow the visible part of the screen instead)
function fitAdder() { const vv = window.visualViewport, el = adderEl(); if (!el) return; el.style.setProperty('--vvh', (vv ? vv.height : innerHeight) + 'px'); el.style.setProperty('--vvt', (vv ? vv.offsetTop : 0) + 'px');
  const bar = el.querySelector('.ad-bar'); document.documentElement.style.setProperty('--adB', Math.max(0, innerHeight - (vv ? vv.offsetTop + vv.height : innerHeight)) + (bar ? bar.offsetHeight : 64) + 'px'); }
if (window.visualViewport) { visualViewport.addEventListener('resize', () => adderOpen && fitAdder()); visualViewport.addEventListener('scroll', () => adderOpen && fitAdder()); }
const hl = (name, q) => { if (!q) return esc(name); const i = norm(name).indexOf(q); return i < 0 ? esc(name) : esc(name.slice(0, i)) + '<mark>' + esc(name.slice(i, i + q.length)) + '</mark>' + esc(name.slice(i + q.length)); };
function adderRender() { const box = $('#adList'); if (!box) return; const raw = $('#adQ').value.trim(), q = norm(raw), onList = new Set(openItems().map(i => norm(i.name)));
  const hist = Object.values(C.history).filter(looksLikeProduct), common = (CAT.common || []).map(([name, cat]) => ({ name, cat }));
  const row = (x, tag) => { const on = onList.has(norm(x.name)), o = !on && leafHit(x.name, x.cat), deal = o && o.oldPrice && o.oldPrice > o.price;
    return `<button class="adr${on ? ' on' : ''}" type="button" data-name="${esc(x.name)}" data-cat="${esc(x.cat || '')}"><span class="em" style="--tile:var(--t-${x.cat || 'dom'})">${esc(x.emoji || emojiGuess(x.name) || CAT_EMOJI[x.cat] || '•')}</span>
      <span class="adn"><span class="adt">${hl(x.name, q)}</span>${tag ? `<small>${tag}</small>` : ''}</span>${deal ? `<span class="badge badge--promo">${pct(o)}</span>` : ''}<span class="ada" aria-hidden="true">${ic(on ? 'check' : 'plus', 2.2)}</span></button>`; };
  const sec = (title, list, tag) => list.length ? `<div class="adh">${title}</div>${list.map(x => row(x, tag && tag(x))).join('')}` : '';
  let html;
  if (!q) { const recent = hist.filter(h => !onList.has(norm(h.name))).sort((a, b) => b.lastAt - a.lastAt).slice(0, 10), seen = new Set(recent.map(h => norm(h.name)));
    const popular = common.filter(c => !onList.has(norm(c.name)) && !seen.has(norm(c.name))).slice(0, 24);
    html = sec('Ostatnio kupowane', recent, h => h.count > 1 ? `kupowane ${h.count} razy` : '') + sec('Popularne', popular);
    if (!html) html = '<p class="ad-empty">Wpisz, czego potrzebujesz. Możesz od razu z ilością, np. „mleko 2 litry”.</p>'; }
  else { const fits = n => { const w = norm(n); return w.startsWith(q) || w.includes(' ' + q); }, seen = new Set(), pick = [];
    const add = (x, from) => { const k = norm(x.name); if (seen.has(k) || !fits(x.name)) return; seen.add(k); pick.push({ ...x, from }); };
    hist.sort((a, b) => b.count - a.count).forEach(h => add(h, 'mine')); common.forEach(c => add(c, 'pop'));
    (EP[store()] || []).filter(o => o.oldPrice && o.oldPrice > o.price).slice(0, 200).forEach(o => pick.length < 14 && add({ name: !fits(o.name) && o.title && fits(o.title) ? o.title : o.name, cat: o.cat, emoji: o.emoji }, 'offer'));
    const exact = pick.some(p => norm(p.name) === q);
    html = (exact ? '' : `<button class="adr raw" type="button" data-raw="1"><span class="em">${ic('plus', 2.2)}</span><span class="adn">Dodaj „${esc(raw)}”<small>${/\d/.test(raw) || raw.split(/\s+/).length > 2 ? 'rozdzielę produkty i ilości' : 'tak, jak wpisałeś'}</small></span></button>`)
      + pick.slice(0, 14).map(x => row(x, x.from === 'mine' ? 'z Twoich zakupów' : x.from === 'offer' ? `w promocji w ${IN[store()]}` : '')).join(''); }
  box.innerHTML = html; box.scrollTop = q ? box.scrollHeight : 0;
  box.querySelectorAll('[data-name]').forEach(b => b.onclick = () => { if (b.classList.contains('on')) { toast(`${b.dataset.name} już jest na liście`); return; }
    const added = addItems([{ name: b.dataset.name, category: b.dataset.cat || undefined }]); vib(8); if (added.length) snack(added, b.dataset.name);
    $('#adQ').value = ''; adderRender(); });
  const r = box.querySelector('[data-raw]'); if (r) r.onclick = () => submitText(raw); }
// (typed text goes through the same parser as the voice; the sheet stays open for the next one)
async function submitText(t) { t = t.trim(); if (!t) return; const learned = editFrom ? learnFromEdit(editFrom, t) : []; editFrom = null;
  $('#adQ').value = ''; adderRender();
  const added = await addText(t);
  if (learned.length) setTimeout(() => toast(`Zapamiętam: ${learned.map(([a, b]) => `„${a}” to ${b}`).join(', ')}`), adderOpen ? 2800 : 5300);
  if (adderOpen) adderRender(); }
// (the snackbar after adding: what landed on the list, and a way back: "Zmień" puts the words in the field, the bin takes them off)
let snackT = 0, editFrom = null;
function snack(added, text, lead = 'Dodano', gone = []) { const el = $('.snack'); if (!el) return; $('.toast')?.classList.remove('show');
  el.querySelector('.st').innerHTML = `<b>${lead}:</b> ${added.map(i => esc(i.name + (i.qty == null ? '' : i.unit ? ' ' + qtyText(i) : ' ×' + qtyText(i)))).join(', ')}${gone.length ? ` · <b>Usunięto:</b> ${gone.map(esc).join(', ')}` : ''}`;
  const hide = () => { el.classList.remove('show'); clearTimeout(snackT); };
  const drop = () => { added.forEach(a => { const cur = C.items[a.id]; if (cur && !cur.deleted) put('items', { ...cur, deleted: true }, true); lit.delete(a.id); }); render(); compareSoon(); hide(); if (adderOpen) adderRender(); };
  el.querySelector('[data-s=edit]').textContent = 'Zmień'; el.querySelector('[data-s=del]').hidden = false;
  el.querySelector('[data-s=edit]').onclick = () => { drop(); editFrom = text; if (!adderOpen) return openAdder(text); const q = $('#adQ'); q.value = text; q.focus(); q.setSelectionRange(text.length, text.length); adderRender(); };
  const del = el.querySelector('[data-s=del]'); del.setAttribute('aria-label', added.length === 1 ? `Usuń: ${added[0].name}` : 'Usuń dodane');
  del.onclick = () => { drop(); vib(10); toast(added.length === 1 ? 'Usunięto z listy' : `Usunięto ${added.length}`); };
  const run = ms => { clearTimeout(snackT); snackT = setTimeout(hide, ms); };
  el.onpointerenter = () => clearTimeout(snackT); el.onpointerleave = () => run(2500); el.onfocusin = () => clearTimeout(snackT);
  el.classList.add('show'); run(5000); }
// (after something big, like wiping the list: a few seconds to take it back)
function undoBar(html, undo) { const el = $('.snack'); if (!el) return; $('.toast')?.classList.remove('show');
  el.querySelector('.st').innerHTML = html; const b = el.querySelector('[data-s=edit]'); b.textContent = 'Cofnij'; el.querySelector('[data-s=del]').hidden = true;
  b.onclick = () => { undo(); el.classList.remove('show'); clearTimeout(snackT); vib(10); };
  el.onpointerenter = () => clearTimeout(snackT); el.onpointerleave = () => { clearTimeout(snackT); snackT = setTimeout(() => el.classList.remove('show'), 3000); };
  el.classList.add('show'); clearTimeout(snackT); snackT = setTimeout(() => el.classList.remove('show'), 7000); }
let toastT = 0; function toast(t) { $('.snack')?.classList.remove('show'); const el = $('.toast'); if (!el) return; el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200); }

// ---------- ticking off: the circle fills and a pencil line is drawn through the name; the item stays where it is ----------
const CAT_EMOJI = { warzywa: '🥦', pieczywo: '🥖', nabial: '🥛', mieso: '🥩', wedliny: '🧀', mrozonki: '🧊', suche: '🍝', konserwy: '🥫', przyprawy: '🧂', sniadanie: '🍪', kawa: '☕', napoje: '🥤', alkohol: '🍷', chemia: '🧽', higiena: '🧴', dziecko: '🍼', zwierzeta: '🐾', dom: '🏠' };
// ---------- emoji: from the AI or the catalog's stems; when nothing fits, the aisle's own (except "other") ----------
// (the same as the server's emojiFor: without Polish marks; things that are not food take theirs from their own list: flowers 💐, candles 🕯️)
const EMO_ = (CAT.emoji || []).map(([k, e]) => [foldPL(k), e]), EMO_DOM_ = (CAT.emojiDom || []).map(([k, e]) => [foldPL(k), e]);
const emojiIn_ = (n, words, list) => { for (const [k, e] of list) if (k.includes(' ') ? (n + ' ').includes(k) : (words[0] || '').startsWith(k)) return e;
  for (const [k, e] of list) if (!k.includes(' ') && words.some(w => w.startsWith(k))) return e; return null; };
function emojiGuess(name) { const n = foldPL(name || ''), words = n.split(/[\s,-]+/).filter(Boolean), nonFood = (CAT.nonfood || []).some(w => (String(name || '').toLowerCase() + ' ').startsWith(w));
  return nonFood ? emojiIn_(n, words, EMO_DOM_) : emojiIn_(n, words, EMO_) || emojiIn_(n, words, EMO_DOM_); }
const emojiOf = it => it.emoji || emojiGuess(it.name) || (it.cat && it.cat !== 'dom' && looksLikeProduct(it) ? CAT_EMOJI[it.cat] : null);
function tick(row, it) { if (row.classList.contains('gone')) return;
  if (it.done) { leave(row, () => { arrived = it.id; put('items', { ...it, done: false, doneAt: null }); }); return; }   // (a second tap takes the line back off)
  if (row.classList.contains('on')) return; row.classList.add('on'); ticking.add(it.id); vib(12);
  setTimeout(() => leave(row, () => { ticking.delete(it.id); remember(it); learn(it.cat); arrived = it.id; put('items', { ...it, done: true, doneAt: Date.now() }); }), 560); }
// (after the pencil line the item fades out where it stands; then the list rolls up into its place)
function leave(row, then) { let once = false; const go = () => { if (!once) { once = true; then(); } };
  if (calm.matches || !row.isConnected) return go();
  row.classList.add('gone'); row.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease-out', fill: 'forwards' }).onfinish = go;
  setTimeout(go, 400); }
// (each line a touch its own: nearly straight, the slightest rise and dip, seeded by the item)
function pencil(id) { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const r = k => ((h >>> k) % 100) / 100;
  const y0 = 4.6 + r(1) * .9, y1 = 4 + r(5) * 1.4, y2 = 4.2 + r(9) * 1.2, y3 = 4.4 + r(13) * 1;
  return `M1 ${y0.toFixed(2)} C 28 ${y1.toFixed(2)}, 62 ${y2.toFixed(2)}, 99 ${y3.toFixed(2)}`; }

// ---------- swipe left to delete ----------
function swipe(row, it) {
  const line = row.querySelector('.line'); let x0 = 0, y0 = 0, dx = 0, on = false, dir = null;
  line.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; x0 = e.clientX; y0 = e.clientY; dx = 0; on = true; dir = null; });
  line.addEventListener('pointermove', e => { if (!on) return; const mx = e.clientX - x0, my = e.clientY - y0;
    if (!dir && Math.hypot(mx, my) > 8) { dir = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'; if (dir === 'x') { row.classList.add('swiping', 'sw'); try { line.setPointerCapture(e.pointerId); } catch { } } }
    if (dir !== 'x') return; dx = Math.min(0, mx); const v = dx < -90 ? -90 + (dx + 90) * .45 : dx; line.style.transform = `translateX(${v}px)`; });
  const end = () => { if (!on) return; on = false; row.classList.remove('swiping'); if (dir === 'x' && dx < -110) { vib(15); put('items', { ...it, deleted: true }); } else { line.style.transform = ''; setTimeout(() => row.classList.remove('sw'), 360); } };
  line.addEventListener('pointerup', end); line.addEventListener('pointercancel', end); }

// ---------- the list ----------
const qtyText = it => it.qty == null ? '' : `${String(it.qty).replace('.', ',')}${it.unit ? ' ' + it.unit : ''}`;
const plural = (n, one, few, many) => n === 1 ? one : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? few : many;
const pct = p => p.oldPrice ? `−${Math.round((1 - p.price / p.oldPrice) * 100)}%` : '';
const IN = Object.fromEntries(CAT.stores.map(x => [x.id, x.in || x.name])), THRU = Object.fromEntries(CAT.stores.map(x => [x.id, x.thru || x.name]));
function rowEl(it) {
  const done = it.done || ticking.has(it.id), row = document.createElement('div');
  row.className = 'row' + (done ? ' on' : '') + (newIds.has(it.id) ? ' new' : '') + (lit.has(it.id) && !done ? ' lit' : ''); row.dataset.id = it.id;
  if (lit.has(it.id)) row.style.setProperty('--lt', `${lit.get(it.id) - Date.now()}ms`);   // (a re-render picks the glow up where it was)
  const p = !it.done && bestOffer(it.name), q = qtyText(it);
  row.innerHTML = `<div class="del">Usuń</div><div class="line"><div class="c">
    <span class="em${emojiOf(it) ? '' : ' none'}" style="--tile:var(--t-${it.cat})">${emojiOf(it) ? esc(emojiOf(it)) : ''}</span>
    <div class="txt"><div class="nm" role="button" tabindex="0" aria-label="Edytuj: ${esc(it.name)}"><b>${esc(it.name)}</b>${q ? `<span class="qty">${esc(q)}</span>` : ''}<svg class="strike" viewBox="0 0 100 9" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="${pencil(it.id)}"/></svg></div>
      ${it.note ? `<div class="meta"><span>${esc(it.note)}</span></div>` : ''}${p && (norm(p.title || p.name) !== norm(it.name) || promoKinds(p).some(k => k.k !== 'plain')) ? `<div class="dsub">${norm(p.title || p.name) === norm(it.name) ? '' : `<span class="dsub__name">${esc(p.title || p.name)}</span>`}${promoKinds(p).filter(k => k.k !== 'plain').map(k => `<span class="badge badge--${{ multi: 'warn', card: 'info' }[k.k]}">${esc(k.t)}</span>`).join('')}</div>` : ''}
      ${(() => { const n = subsHint(it).length; return n ? `<button type="button" class="subs" data-subs>${ic('swap', 2)}${n} ${plural(n, 'zamiennik', 'zamienniki', 'zamienników')} w promocji</button>` : ''; })()}
      ${!it.done && it.q ? `<div class="ask"><span>${esc(it.q)}</span>${(it.opts || []).map(o => `<button type="button" data-opt="${esc(o)}">${esc(o)}</button>`).join('')}</div>` : ''}</div>
    ${p ? `<button class="dprice" type="button" data-promo aria-label="Promocja: ${esc(p.title || p.name)}, ${zl(p.price)}">${pct(p) ? `<span class="badge badge--promo">${pct(p)}</span>` : ''}<b>${zl(p.price)}</b>${p.oldPrice ? `<s>${zl(p.oldPrice)}</s>` : ''}</button>` : !it.done && prWait === store() ? '<span class="skel skel--price rskel" aria-hidden="true"></span>' : ''}
    <button class="chk" type="button" aria-pressed="${done}" aria-label="${done ? 'Przywróć' : 'Kupione'}: ${esc(it.name)}">${ic('check', 2.4)}</button></div></div>`;
  row.querySelector('.chk').onclick = () => tick(row, it);
  row.querySelector('.txt').onclick = e => { if (!e.target.closest('button')) editSheet(it); };
  row.querySelector('.nm').onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); editSheet(it); } };
  row.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => { put('items', { ...it, name: b.dataset.opt, q: null, opts: [] }); promosSoon(); });
  const pb = row.querySelector('[data-promo]'); if (pb) pb.onclick = () => offersSheet(it);
  const sb = row.querySelector('[data-subs]'); if (sb) sb.onclick = () => subsSheet(it);
  swipe(row, it); return row; }
let seenCats = new Set(), chipsKey = '';
// ---------- moving lines: the rest of the list rolls up (or down) into place with a little spring, one line after another (FLIP across the rebuild) ----------
// (positions in page coordinates, so keeping the scroll still between the two measurements does not count as movement)
let arrived = null; const calm = matchMedia('(prefers-reduced-motion: reduce)');
const flipKey = el => el.dataset.flip || 'r:' + el.dataset.id, flipY = el => el.getBoundingClientRect().top + scrollY;
function flipSnap(wrap) { const at = new Map(); if (!calm.matches) wrap.querySelectorAll('.row[data-id], [data-flip]').forEach(el => { if (!el.classList.contains('gone')) at.set(flipKey(el), flipY(el)); }); return at; }
function flipPlay(wrap, was) { const got = 'r:' + arrived; arrived = null; if (!was.size) return; let n = 0;
  wrap.querySelectorAll('.row[data-id], [data-flip]').forEach(el => { const k = flipKey(el), y = was.get(k);
    // (a header or line that just appeared, and the ticked item in its new section, fade in)
    if (y == null || k === got) { if (!el.classList.contains('new')) el.animate([{ opacity: 0, transform: 'scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: k === got ? 180 : 0, easing: 'ease-out', fill: 'backwards' }); return; }
    const dy = y - flipY(el); if (Math.abs(dy) < 1) return;
    el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 520, delay: Math.min(n++ * 16, 160), easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'backwards' }); }); }
// ---------- keeping the page still: a rebuilt list keeps its height and scroll; the row you just added stays in view ----------
let focusRow = null;
// (adding never moves the page: Jarek keeps his place; the new row only lights up where it lands)
function showFocus(smooth) { focusRow = null; return;
  if (!focusRow || Date.now() > focusRow.until) { focusRow = null; return; }
  const row = document.querySelector(`.row[data-id="${focusRow.id}"]`); if (!row) return;
  const r = row.getBoundingClientRect(), dock = $('.dock') ? $('.dock').getBoundingClientRect().top : innerHeight;
  if (r.top >= 16 && r.bottom <= dock - 8) return;   // (already visible: leave the page alone)
  scrollTo({ top: Math.max(0, r.top + scrollY - (dock - r.height) / 2), behavior: smooth ? 'smooth' : 'auto' }); }
function renderList() { const wrap = $('#list'), y = scrollY, was = flipSnap(wrap); wrap.style.minHeight = wrap.offsetHeight + 'px';
  try { buildList(); } finally { wrap.style.minHeight = ''; }
  if (Math.abs(scrollY - y) > 1) scrollTo(0, y); holdPin(); flipPlay(wrap, was);
  if (focusRow) showFocus(false); }
let browsing = false, exShown = false, freqShown = false;   // (set when the list was shown empty; lasts until the app is opened again)
function buildList() {
  const wrap = $('#list'), id = store(), order = orderFor(id), all = Object.values(C.items).filter(i => !i.deleted), open = all.filter(i => !i.done), done = all.filter(i => i.done);
  wrap.innerHTML = '';
  if (!all.length) { browsing = true; renderEmpty(wrap); return; }
  // (what you often buy, on top: one tap puts it on the list; it stands in for "Może cię zainteresować" while browsing too)
  wrap.insertAdjacentHTML('beforeend', freqHtml()); const fq = wrap.querySelector('.freq'); if (fq) { wireAdds(fq); fq.querySelector('[data-fqall]').onclick = openFreqAll; fq.classList.toggle('still', freqShown); freqShown = true; }   // (the pills rise in once, not on every rebuild)
  // (the aisles hold only what is still missing; bought items go to the very bottom, in the order they went into the cart)
  for (const cat of order) { const its = open.filter(i => i.cat === cat).sort((a, b) => a.createdAt - b.createdAt); if (!its.length) continue; const c = CATS[cat];
    const sec = document.createElement('section'); sec.className = 'sec' + (seenCats.has(cat) ? '' : ' enter');
    sec.innerHTML = `<div class="h" data-flip="h:${cat}"><div class="c"><span class="hic" aria-hidden="true">${CAT_EMOJI[cat] || ''}</span>${esc(c.name)}<span class="n">${its.length}</span></div></div>`;
    for (const it of its) sec.appendChild(rowEl(it)); wrap.appendChild(sec); }
  if (done.length) { const sec = document.createElement('section'); sec.className = 'sec bought';
    sec.innerHTML = `<div class="h" data-flip="h:bought"><div class="c"><span class="hic" aria-hidden="true">🛒</span>W koszyku<span class="n">${done.length}</span></div></div>`;
    for (const it of done.slice().sort((a, b) => (a.doneAt || a.updatedAt) - (b.doneAt || b.updatedAt))) sec.appendChild(rowEl(it)); wrap.appendChild(sec); }
  seenCats = new Set(all.map(i => i.cat));
  // (the bottom: two square tiles side by side. Left, dark: where your list is cheapest today → the comparison.
  //  Right, our green: this shop's leaflet → a full-screen mini leaflet. The list itself stays about your products.)
  const cs = MY().filter(x => CMP[x.id] && CMP[x.id].n).sort((a, b) => CMP[b.id].save - CMP[a.id].save), best = cs[0], total = open.length, sid = store(), L0 = EP[sid];
  const leafN = L0 ? new Set(L0.map(o => norm(o.name))).size : 0, leafTop = L0 && L0.length ? Math.max(...L0.map(o => Math.round(offPct(o) * 100))) : 0;
  if (done.length) { wrap.insertAdjacentHTML('beforeend', `<div class="sum"><div class="c"><span>Kupione ${done.length} z ${all.length}</span><button type="button" id="clearDone">Usuń kupione z listy</button></div></div>`);
    $('#clearDone').onclick = () => { done.forEach(i => put('items', { ...i, deleted: true }, true)); render(); }; }
  // (a firm band parts your list from everything else; browsing, the leaflet below is enough, no tiles)
  wrap.insertAdjacentHTML('beforeend', '<div class="brk" aria-hidden="true"></div>');
  if (browsing) renderEmpty(wrap);
  if (!browsing) { wrap.insertAdjacentHTML('beforeend', `<div class="tiles"><div class="c">
    ${total && best ? `<button type="button" class="tile tile--line tile--save" id="tCheap"><span class="tile__label">Najtaniej dziś</span><span class="tile__title">${esc(storeOf(best.id).name)}</span><span class="tile__meta">−${zl(CMP[best.id].save)}<small>na ${CMP[best.id].n} z ${total} ${plural(total, 'produktu', 'produktów', 'produktów')} z listy</small></span><span class="tile__go">${cs.length > 1 ? 'Porównaj' : 'Zobacz'}${ic('chev', 2)}</span></button>`
      : `<div class="tile tile--line tile--quiet"><span class="tile__label">Najtaniej dziś</span><span class="tile__title">—</span><span class="tile__meta"><small>${total ? 'Na Twoje produkty nie ma dziś obniżek w Twoich sklepach.' : 'Dodaj produkty, a porównamy sklepy.'}</small></span></div>`}
    <button type="button" class="tile tile--line" id="tLeaf"${L0 === null ? ' disabled' : ''}><span class="tile__label">Gazetka</span><span class="tile__title">${esc(storeOf(sid).name)}</span><span class="tile__meta">${L0 === undefined ? '<span class="skel skel--price"></span><span class="skel skel--line"></span>' : L0 === null ? '<small>Nie udało się pobrać</small>' : `${leafN}<small>${plural(leafN, 'promocja', 'promocje', 'promocji')}${leafTop ? ` · do −${leafTop}%` : ''}</small>`}</span><span class="tile__go">Przeglądaj${ic('chev', 2)}</span></button></div></div>`);
  const tc = $('#tCheap'); if (tc) tc.onclick = () => cs.length > 1 ? compareSheet() : dealsSheet(best.id);
  $('#tLeaf').onclick = openCover; }
  loadShopPromos();
}
// ---------- offers: each shop's whole current leaflet (groceries and drugstore), what you usually buy first ----------
const STAPLES = [['Mleko', 'nabial'], ['Chleb', 'pieczywo'], ['Jajka', 'nabial'], ['Masło', 'nabial'], ['Banany', 'warzywa'], ['Pomidory', 'warzywa'], ['Ser żółty', 'wedliny'], ['Kawa', 'kawa'], ['Jogurt', 'nabial'], ['Makaron', 'suche'], ['Kurczak', 'mieso'], ['Jabłka', 'warzywa'], ['Ziemniaki', 'warzywa'], ['Woda', 'napoje'], ['Papier toaletowy', 'higiena'], ['Płyn do naczyń', 'chemia']];
let EP = {}, epAt = 0, epBusy = false;
const looksLikeProduct = h => h.name.length <= 32 && h.name.trim().split(/\s+/).length <= 4;   // (dictated notes to the app live in history too)
const stemOf = w => w.slice(0, Math.max(4, Math.min(6, w.length - 1)));
// (does this offer fit that product? The same rules as the server (lib/promos.js): any form of the product's word, without Polish
//  marks too; not a word made from it ("pomidorowy"), not an ingredient ("z mozzarellą", "w czekoladzie"), not said later in a name
//  about something else ("Ser salami", "Parówki z szynki"), not a lookalike ("cukierki" for "cukier"); "sok" is not "Sokołów")
const ADJ_END = /(owy|owa|owe|owym|owej|owych|owego|ny|na|ne|nym|nej|nych|nego|ski|ska|skie|skim|cki|cka|ckie)$/, INSTR = /(ą|em|ami|mi)$/;
const LEAD_ = new Set('polski polska polskie swiezy swieza swieze wszystkie wybrane mlode mlody mloda mrozone mrozony mrozona wloskie wloski wloska dziki dzika dzikie bio eko nowy nowa nowe wiejski wiejska wiejskie puszysty puszyste premium protein proteinowy miks mix zestaw lub i oraz'.split(' '));
const CUT_ = /^(filet|piers|cwiart|mies|udk|uda|udo|nog|podud|skrzyd|poledwic|tusz|porcj|kostk|stek|kawal|plat|mostek|golonk|gulasz|schab|karkow|lopatk|zeberk)/;
const OTHER_ = { cukier: ['cukierk'], oliwa: ['oliwk'], smietana: ['smietank'], olej: ['olejek', 'olejk'], makaron: ['makaronik'], salata: ['salatk'], czekolada: ['czekoladk'], cebula: ['cebulk'], kawa: ['kawal'] };
const headOf_ = (raw, i) => { let s = 0; for (let k = 0; k < i; k++) if (/,$/.test(raw[k]) || /^[–-]$/.test(raw[k])) s = k + 1;
  for (let j = s; j < raw.length; j++) { const w = raw[j].replace(/[^\p{L}\d]/gu, ''); if (w.length <= 2 || /\d/.test(w) || w === w.toUpperCase() || LEAD_.has(foldPL(w))) continue; return j; } return -1; };
function offerFits(offerName, product) { const tf = foldPL(product).split(/[\s-]+/).map(w => w.replace(/[^a-z0-9]/g, '')).find(w => w.length >= 3); if (!tf) return false;
  const raw = String(offerName).split(/\s+/), st = stemOf(tf), it = foldPL(product);
  for (let i = 0; i < raw.length; i++) { const w0 = raw[i].replace(/[^\p{L}\d-]/gu, ''); if (!w0) continue; const capital = i > 0 && w0[0] !== w0[0].toLowerCase();
    for (const part of w0.split('-').filter(Boolean)) { const p = foldPL(part), brand = capital && tf.length >= 4 && p === tf;
      const hit = capital ? brand : tf.length <= 3 ? new RegExp('^' + tf + '[a-z]?$').test(p) : p.startsWith(st) && !(p.length - st.length >= 3 && ADJ_END.test(p));
      if (!hit || (OTHER_[tf] || []).some(o => p.startsWith(o))) continue;
      const prev = (raw[i - 1] || '').toLowerCase().replace(/[^\p{L}]/gu, ''), zBefore = raw.slice(Math.max(0, i - 4), i).some(x => /^(z|ze)$/i.test(x));
      if (/^(w|we|do|dla|o|na|od|po|pod|bez|smaku)$/.test(prev) || (zBefore && (INSTR.test(part) || INSTR.test(prev)))) continue;
      const h = headOf_(raw, i); if (!brand && h >= 0 && h < i) { const hw = foldPL(raw[h].replace(/[^\p{L}]/gu, '')); if (!CUT_.test(hw) && !it.includes(hw.slice(0, 4))) continue; }
      return true; } }
  return false; }
const mine = () => Object.values(C.history).filter(looksLikeProduct).sort((a, b) => b.count - a.count || b.lastAt - a.lastAt);
const leafHit = (name, cat) => (EP[store()] || []).find(o => offerFits(o.name, name) && (!cat || cat === 'dom' || !o.cat || o.cat === 'dom' || o.cat === cat));
const offPct = o => o.oldPrice ? 1 - o.price / o.oldPrice : 0;
// (the order: what you buy, then the deepest cuts, then plain leaflet prices)
function rankLeaf(list) { const my = mine().slice(0, 30);
  const score = o => (my.some(h => offerFits(o.name, h.name) && (!h.cat || h.cat === 'dom' || !o.cat || o.cat === h.cat)) ? 2 : 0) + (STAPLES.some(s => offerFits(o.name, s[0])) ? .6 : 0) + offPct(o) + (o.oldPrice ? .2 : 0);
  // (alcohol waits at the very end, after every other offer)
  const seen = new Set(), sorted = list.filter(o => !seen.has(o.name) && seen.add(o.name)).sort((a, b) => (a.cat === 'alkohol') - (b.cat === 'alkohol') || score(b) - score(a));
  // (variety up top: at most two from one aisle in a row, the rest wait their turn)
  const top = [], later = [], per = {}; for (const o of sorted) { if (o.cat !== 'alkohol' && (per[o.cat] || 0) < 2 && top.length < 12) { top.push(o); per[o.cat] = (per[o.cat] || 0) + 1; } else later.push(o); }
  return [...top, ...later]; }
function picksForEmpty() { const hs = mine().slice(0, 10).map(h => ({ name: h.name, cat: h.cat, emoji: h.emoji }));
  for (const [name, cat] of STAPLES) { if (hs.length >= 12) break; if (!hs.some(h => norm(h.name) === norm(name))) hs.push({ name, cat }); }
  return hs; }
async function loadShopPromos() { const need = MY().filter(x => EP[x.id] === undefined); if (epBusy || (!need.length && Date.now() - epAt < 30 * 60e3)) return; epBusy = true;
  await Promise.all((need.length && Date.now() - epAt < 30 * 60e3 ? need : MY()).map(async s => { try { const r = await api('/api/leaflet', { store: s.id }), best = {};
    // (one row per product name: the deeper cut wins)
    for (const o of r.items || []) { const k = norm(o.name); if (!best[k] || offPct(o) > offPct(best[k]) || (offPct(o) === offPct(best[k]) && o.price < best[k].price)) best[k] = o; }
    EP[s.id] = Object.values(best); } catch { EP[s.id] = EP[s.id] || null; } }));
  epAt = Date.now(); epBusy = false; chipsKey = ''; render(); }
const epRow = o => `<button class="ep" type="button" data-add="${esc(o.title || o.name)}" data-cat="${esc(o.cat || '')}" style="--tile:var(--t-${o.cat || 'dom'})"><span class="em">${esc(o.emoji || emojiGuess(o.name) || CAT_EMOJI[o.cat] || '🛒')}</span><span class="en"><span class="enn">${esc(o.title || o.name)}</span>${termsHtml(o)}</span><span class="dp">${pct(o) ? `<span class="badge badge--promo">${pct(o)}</span>` : ''}<b>${zl(o.price)}</b>${o.oldPrice ? `<s>${zl(o.oldPrice)}</s>` : ''}</span><span class="pl" aria-hidden="true">${ic('plus', 2.2)}</span></button>`;
// (what you tapped stays under your finger while the list above it grows or shrinks; the page itself is never scrolled away)
let pin = null;
function keepPlace(b, fn) { if (b.closest('.cover')) return fn();
  const key = b.dataset.add, sel = `[data-add="${CSS.escape(key)}"]`, box = b.closest('[data-anchor]');
  pin = { sel, i: [...document.querySelectorAll(sel)].indexOf(b), t0: b.getBoundingClientRect().top, bsel: box && `[data-anchor="${box.dataset.anchor}"]`, b0: box && box.getBoundingClientRect().top, until: Date.now() + 3000 };
  fn(); holdPin(); }
// (every rebuild in the next few seconds, like the deal's price arriving, keeps that spot too; your own scrolling lets go)
function holdPin() { if (!pin || Date.now() > pin.until || coverOpen) { pin = null; return; }
  const n = document.querySelectorAll(pin.sel)[pin.i], nb = pin.bsel && document.querySelector(pin.bsel);
  const d = n ? n.getBoundingClientRect().top - pin.t0 : nb ? nb.getBoundingClientRect().top - pin.b0 : 0; if (Math.abs(d) > 1) scrollBy(0, d); }
['wheel', 'touchmove', 'keydown'].forEach(t => addEventListener(t, () => { pin = null; }, { passive: true }));
const wireAdds = (roots, keep, toggle) => (roots instanceof Element ? [roots] : [...roots]).forEach(root => root.querySelectorAll('[data-add]').forEach(b => b.onclick = () => keepPlace(b, () => {
  const name = b.dataset.add, cur = toggle && Object.values(C.items).find(i => !i.deleted && norm(i.name) === norm(name)), shop = !cur && b.closest('.eps[data-store]')?.dataset.store;
  if (shop && shop !== store()) setStore(shop);
  if (cur) { put('items', { ...cur, deleted: true }); vib(6); return; }
  const added = addItems([{ name, category: b.dataset.cat || undefined }]); vib(8);
  if (keep) { b.classList.add('in', 'is-in'); const pl = b.querySelector('.pl, .offer__add'); if (pl) pl.innerHTML = ic('check', 2.4); toast(added.bumped.length ? moreMsg(added.bumped) : `Dodano: ${name}`); } else if (added.length) snack(added, name); else if (added.bumped.length) toast(moreMsg(added.bumped)); })));
const allBtn = (id, n) => `<button type="button" class="seeall" data-all="${id}">Zobacz całą gazetkę <b>${n}</b>${ic('chev', 2)}</button>`;
// (the whole leaflet in a sheet, by aisle in this shop's order; adding keeps it open)
const dm = d => d ? d.slice(8, 10) + '.' + d.slice(5, 7) : '';
// (when the leaflet runs: the most common last day, and the earliest start)
function leafDates(l) { if (!l || !l.length) return ''; const c = {}; l.forEach(o => c[o.until] = (c[o.until] || 0) + 1);
  const until = Object.keys(c).sort((a, b) => c[b] - c[a])[0], from = l.map(o => o.from).sort()[0];
  return from && from > new Date().toISOString().slice(0, 10) ? `od ${dm(from)} do ${dm(until)}` : `do ${dm(until)}`; }
// ---------- the leaflet: full screen, one shop at a time (tabs on top), aisles as the only filter, tiles or a list ----------
// (tiles by default; the choice stays on this phone. Photos when the leaflet has them, else the aisle's tile with its icon)
let coverOpen = false, cvStore = '', cvCat = 'all', cvQ = '', cvSearch = false, cvHeadKey = '', cvBodyKey = '';
const cvView = () => { try { return localStorage.getItem('koszyk.leafView') === 'list' ? 'list' : 'grid'; } catch { return 'grid'; } };
const offerEm = o => o.emoji || emojiGuess(o.name) || CAT_EMOJI[o.cat] || '🛒';
function offerCard(o, on, row) { const nm = o.title || o.name, badge = pct(o) ? `<span class="badge badge--promo">${pct(o)}</span>` : '';
  const media = `<span class="offer__media${o.image ? ' offer__media--photo' : ''}" style="--tile:var(--t-${o.cat || 'dom'})" data-em="${esc(offerEm(o))}">${o.image ? `<img src="${esc(o.image)}" alt="" loading="lazy" decoding="async">` : esc(offerEm(o))}${row ? '' : badge}</span>`;
  const add = `<span class="offer__add" aria-hidden="true">${on ? ic('check', 2.4) : ic('plus', 2.2)}</span>`, old = o.oldPrice ? `<s>${zl(o.oldPrice)}</s>` : '';
  const attrs = `type="button" data-add="${esc(nm)}" data-cat="${esc(o.cat || '')}" aria-label="${esc(`${on ? 'Na liście' : 'Dodaj'}: ${nm}, ${zl(o.price)}`)}"`;
  return row ? `<button class="offer offer--row${on ? ' is-in' : ''}" ${attrs}>${media}<span class="offer__body"><b class="offer__name">${esc(nm)}</b>${termsHtml(o)}</span><span class="offer__side">${badge}<b>${zl(o.price)}</b>${old}</span>${add}</button>`
    : `<button class="offer offer--card${on ? ' is-in' : ''}" ${attrs}>${media}${add}<span class="offer__price"><b>${zl(o.price)}</b>${old}</span><b class="offer__name">${esc(nm)}</b>${termsHtml(o)}</button>`; }
// (skeletons: the shape of what is coming)
const SKEL_CARD = '<div class="offer offer--card is-loading"><span class="skel skel--block"></span><span class="skel skel--price"></span><span class="skel skel--text"></span><span class="skel skel--line"></span></div>';
const SKEL_ROW = '<div class="offer offer--row is-loading"><span class="skel skel--block"></span><span class="offer__body"><span class="skel skel--text"></span><span class="skel skel--line"></span></span><span class="skel skel--price"></span></div>';
const skelCards = n => `<div class="offers offers--grid" aria-hidden="true">${SKEL_CARD.repeat(n)}</div>`;
const skelRows = n => `<div class="offers offers--rows" aria-hidden="true">${SKEL_ROW.repeat(n)}</div>`;
// (the aisles of a leaflet: what you usually buy first, then the shop's order, alcohol last)
function cvGroups(id) { const ranked = rankLeaf(EP[id] || []), my = mine().slice(0, 30);
  // ("for you" only when every word of what you buy is there: "Płyn do naczyń" is not "Płyn do płukania")
  const every = (on, name) => norm(name).split(' ').filter(w => w.length >= 3).every(w => (' ' + norm(on)).includes(' ' + stemOf(w)));
  const forMe = ranked.filter(o => my.some(h => offerFits(o.name, h.name) && every(o.title || o.name, h.name) && (!h.cat || h.cat === 'dom' || !o.cat || o.cat === h.cat))).slice(0, 8), by = {};
  for (const o of ranked) if (!forMe.includes(o)) (by[o.cat] = by[o.cat] || []).push(o);
  return [...(forMe.length ? [{ id: 'mine', title: 'Dla Ciebie', emoji: '★', items: forMe }] : []), ...[...orderFor(id).filter(c => by[c] && c !== 'alkohol'), ...(by.alkohol ? ['alkohol'] : [])].map(c => ({ id: c, title: CATS[c].name, emoji: CAT_EMOJI[c], items: by[c] }))]; }
// ---------- "Często kupujesz": the whole list, with a search; a tap puts a product on the list (or one more of it) ----------
let fqOpen = false, fqQ = '';
function openFreqAll() { const el = $('.fqv'); if (!el) return; fqOpen = true; fqQ = ''; $('#fqQ').value = ''; el.hidden = false; renderFreqAll(); $('.fq-body').scrollTop = 0;
  requestAnimationFrame(() => el.classList.add('show')); document.documentElement.classList.add('locked'); }
function closeFreqAll() { const el = $('.fqv'); if (!el || !fqOpen) return; fqOpen = false; el.classList.remove('show'); $('#fqQ').blur();
  if (!coverOpen) document.documentElement.classList.remove('locked'); setTimeout(() => { if (!fqOpen) el.hidden = true; }, 420); }
function renderFreqAll() { const body = $('.fq-body'); if (!body || !fqOpen) return;
  const all = freqAll(), typed = fqQ.trim(), q = foldPL(typed), open = openItems();
  const hits = q ? all.filter(p => foldPL(p.name).includes(q)) : all;
  $('.fq-sub').textContent = `${all.length} ${plural(all.length, 'produkt', 'produkty', 'produktów')}`;
  const row = p => { const cur = open.find(o => sameProduct(o.name, p.name)), o = leafHit(p.name, p.cat), deal = o && offPct(o) > 0, h = p.h;
    const meta = [cur ? `na liście${cur.qty != null ? ': ' + qtyText(cur) : ''}` : '', h && h.count ? `kupione ${h.count}×` : '', h && h.count >= 2 && h.avg ? `co ~${Math.max(1, Math.round(h.avg / 864e5))} dni` : ''].filter(Boolean).join(' · ');
    return `<button class="offer offer--row${cur ? ' is-in' : ''}" type="button" data-fq="${esc(p.name)}" data-cat="${esc(p.cat || '')}" aria-label="${esc(`Dodaj: ${p.name}`)}"><span class="offer__media" style="--tile:var(--t-${p.cat || 'dom'})">${esc(emojiGuess(p.name) || p.emoji || CAT_EMOJI[p.cat] || '•')}</span><span class="offer__body"><b class="offer__name">${esc(p.name)}</b>${meta ? `<span class="offer__meta">${esc(meta)}</span>` : ''}</span><span class="offer__side">${deal ? `<span class="badge badge--promo">${pct(o)}</span><b>${zl(o.price)}</b>` : ''}</span><span class="offer__add" aria-hidden="true">${cur ? ic('check', 2.4) : ic('plus', 2.2)}</span></button>`; };
  // (what you typed and is not on the list yet can go straight on it)
  const fresh = typed && !all.some(p => sameProduct(p.name, typed));
  body.innerHTML = `<div class="cv-in">${fresh ? `<button class="btn btn--secondary btn--block fq-new" type="button" data-new>${ic('plus', 2.2)}<span>Dodaj „${esc(typed)}”</span></button>` : ''}${hits.length ? `<div class="offers offers--rows">${hits.map(row).join('')}</div>` : fresh ? '' : '<div class="cv-empty"><p>Nic takiego jeszcze nie kupowałeś.</p></div>'}</div>`;
  body.querySelectorAll('[data-fq]').forEach(b => b.onclick = () => { const added = addItems([{ name: b.dataset.fq, category: b.dataset.cat || undefined }]); vib(8); toast(added.bumped.length ? moreMsg(added.bumped) : `Dodano: ${b.dataset.fq}`); });
  const nb = body.querySelector('[data-new]'); if (nb) nb.onclick = () => { vib(8); addText(typed); fqQ = ''; $('#fqQ').value = ''; renderFreqAll(); }; }
function openCover(id) { const el = $('.cover'); if (!el) return;
  cvStore = typeof id === 'string' && MY().some(s => s.id === id) ? id : store(); cvCat = 'all'; cvQ = ''; cvSearch = false; cvHeadKey = cvBodyKey = '';
  coverOpen = true; el.hidden = false; loadShopPromos(); renderCover(true); requestAnimationFrame(() => el.classList.add('show')); document.documentElement.classList.add('locked'); }
function closeCover() { const el = $('.cover'); if (!el || !coverOpen) return; coverOpen = false; el.classList.remove('show'); document.documentElement.classList.remove('locked'); setTimeout(() => { if (!coverOpen) el.hidden = true; }, 420); }
function renderCover(top) { const head = $('.cv-head'), body = $('.cv-body'); if (!body || !coverOpen) return;
  if (!MY().some(s => s.id === cvStore)) cvStore = store();
  const id = cvStore, l = EP[id], view = cvView(), groups = l ? cvGroups(id) : [], total = l ? new Set(l.map(o => norm(o.name))).size : 0;
  if (cvCat !== 'all' && !groups.some(g => g.id === cvCat)) cvCat = 'all';
  // (the top: shops, search, aisles; rebuilt only when they change, so typing keeps its field)
  $('.cv-sub').innerHTML = l === undefined ? '<span class="skel skel--line"></span>' : l && l.length ? esc(`${total} ${plural(total, 'promocja', 'promocje', 'promocji')} · ${leafDates(l)}`) : '';
  $('#cvFind').setAttribute('aria-pressed', cvSearch);
  $('#cvView').innerHTML = [['grid', 'grid', 'Kafle'], ['list', 'rows', 'Lista']].map(([v, i, t]) => `<button type="button" data-view="${v}" aria-pressed="${v === view}" aria-label="${t}">${ic(i, 1.9)}</button>`).join('');
  const hk = [id, cvCat, cvSearch, l === undefined ? 'u' : l === null ? 'n' : groups.map(g => g.id + g.items.length).join(), MY().map(s => s.id + (EP[s.id] ? EP[s.id].length : '-')).join()].join('§');
  if (hk !== cvHeadKey) { cvHeadKey = hk;
    head.innerHTML = `${MY().length > 1 ? `<div class="seg seg--block" role="tablist" aria-label="Sklep">${MY().map(s => `<button type="button" role="tab" data-shop="${s.id}" aria-selected="${s.id === id}" style="--sc:${s.color}"><i class="dot"></i><span>${esc(s.name)}</span></button>`).join('')}</div>` : ''}
      ${cvSearch ? `<label class="cv-find">${ic('search', 2)}<input class="cv-q" type="search" placeholder="Szukaj w gazetce" autocomplete="off" enterkeyhint="search" aria-label="Szukaj w gazetce" value="${esc(cvQ)}"></label>` : ''}
      <div class="cv-chips" role="tablist" aria-label="Kategorie">${l === undefined ? '<span class="skel skel--chip"></span>'.repeat(5)
        : groups.length ? [{ id: 'all', title: 'Wszystko', items: { length: total } }, ...groups].map(g => `<button type="button" role="tab" class="chip chip--sm${g.id === cvCat ? ' chip--on' : ''}" data-cat="${g.id}" aria-selected="${g.id === cvCat}">${g.emoji ? esc(g.emoji) + ' ' : ''}${esc(g.title)} <small>${g.items.length}</small></button>`).join('') : ''}</div>`;
    head.querySelectorAll('[data-shop]').forEach(b => b.onclick = () => { if (b.dataset.shop === cvStore) return; cvStore = b.dataset.shop; cvCat = 'all'; vib(6); loadShopPromos(); renderCover(true); });
    head.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { cvCat = b.dataset.cat; vib(4); renderCover(true); });
    const q = head.querySelector('.cv-q'); if (q) { q.oninput = () => { cvQ = q.value; renderCover(true); }; if (!cvQ) q.focus(); }
    const on = head.querySelector('.chip--on'); if (on) on.scrollIntoView({ inline: 'nearest', block: 'nearest' }); }
  // (the offers: by aisle when everything is shown, one aisle when picked; searching narrows both)
  const onList = new Set(Object.values(C.items).filter(i => !i.deleted).map(i => norm(i.name))), qn = norm(cvQ).trim();
  const bk = [id, cvCat, view, qn, l === undefined ? 'u' : l === null ? 'n' : l.length + ':' + epAt, [...onList].sort().join('|')].join('§');
  if (bk === cvBodyKey && !top) return; cvBodyKey = bk; const y = top ? 0 : body.scrollTop;
  const fits = o => !qn || qn.split(/\s+/).every(w => norm(o.title || o.name).includes(w)), card = o => offerCard(o, onList.has(norm(o.title || o.name)), view === 'list');
  const box = items => `<div class="offers ${view === 'list' ? 'offers--rows' : 'offers--grid'}">${items.map(card).join('')}</div>`;
  let html;
  if (l === undefined) html = view === 'list' ? skelRows(8) : skelCards(6);
  else if (l === null) html = '<div class="cv-empty"><p>Nie udało się pobrać gazetki.</p><button class="btn btn--secondary" type="button" id="cvRetry">Spróbuj jeszcze raz</button></div>';
  else if (!l.length) html = '<div class="cv-empty"><p>W tym tygodniu brak promocji spożywczych.</p></div>';
  else { const shown = (cvCat === 'all' ? groups : groups.filter(g => g.id === cvCat)).map(g => ({ ...g, items: g.items.filter(fits) })).filter(g => g.items.length);
    html = !shown.length ? '<div class="cv-empty"><p>Nic takiego w tej gazetce.</p></div>'
      : cvCat === 'all' ? shown.map(g => `<section class="cvg"><h3 class="cvh">${esc(g.title)}<span>${g.items.length}</span></h3>${box(g.items)}</section>`).join('') : box(shown[0].items);
    html += '<p class="cv-note">Ceny z gazetek sieci. Dotknij, żeby dopisać do listy.</p>'; }
  body.innerHTML = `<div class="cv-in">${html}</div>`; body.scrollTop = y;
  wireAdds(body, true, true);
  const rt = body.querySelector('#cvRetry'); if (rt) rt.onclick = () => { EP[id] = undefined; epAt = 0; loadShopPromos(); renderCover(true); }; }
// (a photo that will not load gives way to the aisle's icon)
function coverImgFallback(e) { const img = e.target; if (img.tagName !== 'IMG') return; const m = img.closest('.offer__media'); if (!m) return; m.classList.remove('offer__media--photo'); img.replaceWith(document.createTextNode(m.dataset.em || '🛒')); }
const wireAll = root => root.querySelectorAll('[data-all]').forEach(b => b.onclick = () => openCover(b.dataset.all));

function renderEmpty(wrap) {
  const onList = new Set(Object.values(C.items).filter(i => !i.deleted).map(i => norm(i.name))), has = n => onList.has(norm(n));
  const picks = picksForEmpty().filter(p => !has(p.name)), cur = store(), stores = [MY().find(s => s.id === cur), ...MY().filter(s => s.id !== cur)].filter(Boolean);
  const promoBlock = s => { const l = EP[s.id];
    const body = l === undefined ? `<div class="epskel">${skelRows(3)}</div>`
      : !l || !l.length ? `<div class="epw">${l === null ? 'Nie udało się pobrać promocji.' : 'W tym tygodniu brak promocji spożywczych.'}</div>`
      // (alcohol never fills the preview; it waits at the end of the whole leaflet)
      : !l.some(o => o.cat !== 'alkohol') ? `<div class="epw">W tym tygodniu brak promocji spożywczych.</div>${allBtn(s.id, l.length)}`
      : rankLeaf(l).filter(o => o.cat !== 'alkohol').slice(0, 5).map(o => { const r = epRow(o); return has(o.title || o.name) ? r.replace('class="ep"', 'class="ep in"').replace(/<span class="pl"[^>]*>[\s\S]*?<\/span>/, m => m.replace(/<svg[\s\S]*<\/svg>/, ic('check', 2.4))) : r; }).join('') + allBtn(s.id, l.length);
    return `<div class="eps" data-store="${s.id}" style="--sc:${s.color}"><div class="esh"><i></i>${esc(s.name)}</div>${body}</div>`; };
  wrap.insertAdjacentHTML('beforeend', `${picks.length && !onList.size ? `<section class="sec ex${exShown ? ' still' : ''}" data-anchor="picks"><div class="h"><div class="c">Może cię zainteresować</div></div>${pillRows(picks)}</section>` : ''}
    <section class="sec ex${exShown ? ' still' : ''}" data-anchor="promos"><div class="h"><div class="c">Promocje w tym tygodniu</div></div>${(() => { const picked = stores.filter(x => (EP[x.id] || []).some(o => has(o.title || o.name))); return (picked.length ? [picked.find(x => x.id === cur) || picked[0]] : stores).map(promoBlock).join(''); })()}<p class="note">Z gazetek sieci (ding.pl). Dotknij, żeby dodać na listę.</p></section>`);
  exShown = true; wireAdds(wrap.querySelectorAll('.ex'), false, true); wireAll(wrap); loadShopPromos(); }
function clearAllSheet() { const all = Object.values(C.items).filter(i => !i.deleted), n = all.length; if (!n) return;
  const close = sheet(`<div class="warn"><span class="wi">${ic('trash', 2)}</span><h3>Wyczyścić całą listę?</h3>
      <p>Usuniesz wszystkie ${n} ${plural(n, 'pozycję', 'pozycje', 'pozycji')}, także te jeszcze niekupione. Lista zniknie też u pozostałych osób, z którymi ją dzielisz.</p>
      <div class="wb"><button type="button" class="btn btn--soft btn--lg" data-a="keep">Zostaw</button><button type="button" class="btn btn--danger btn--lg" data-a="wipe">Wyczyść listę</button></div></div>`, sh => {
    sh.querySelector('[data-a=keep]').onclick = () => close();
    sh.querySelector('[data-a=wipe]').onclick = () => { all.forEach(i => put('items', { ...i, deleted: true }, true)); lit.clear(); vib(20); close(); render(); compareSoon();
      undoBar(`<b>Wyczyszczono:</b> ${n} ${plural(n, 'pozycja', 'pozycje', 'pozycji')}`, () => { all.forEach(i => { const cur = C.items[i.id]; if (cur) put('items', { ...cur, deleted: false }, true); }); render(); compareSoon(); toast('Lista wróciła'); }); };
    setTimeout(() => sh.querySelector('[data-a=keep]')?.focus(), 420); }); }
function renderChips() { const el0 = $('#chips'); if (el0) { el0.innerHTML = ''; el0.hidden = true; } return;
  const el = $('#chips'); if (!Object.values(C.items).some(i => !i.deleted)) { el.innerHTML = ''; el.hidden = true; chipsKey = ''; return; }
  const { promo, due, freq } = suggestions(); let i = 0;
  const key = [...promo.map(x => x.h.id + x.p.price), ...due.map(h => h.id), ...freq.map(h => h.id)].join('|'); if (key === chipsKey) return; chipsKey = key;
  if (!key) { el.innerHTML = ''; el.hidden = true; return; } el.hidden = false;
  const chip = (h, extra) => `<button class="chip chip--sm chip--tile" data-h="${esc(h.id)}" style="--i:${i++};--tile:var(--t-${h.cat})"><span class="e">${esc(h.emoji || emojiGuess(h.name) || CAT_EMOJI[h.cat] || '•')}</span>${esc(h.name)}${extra || ''}</button>`;
  el.innerHTML = '<span class="lbl">Może też</span>' + promo.map(({ h, p }) => chip(h, ` <span class="badge badge--promo">${pct(p) || zl(p.price)}</span>`)).join('') + due.map(h => chip(h)).join('') + freq.map(h => chip(h)).join('');
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
// (the comparison: your shops, the cheapest first; a shop opens its breakdown)
function compareSheet() { const total = openItems().length, ms = MY(), hit = ms.filter(x => CMP[x.id] && CMP[x.id].n).sort((a, b) => CMP[b.id].save - CMP[a.id].save), none = ms.filter(x => !(CMP[x.id] && CMP[x.id].n));
  sheet(`<h3>Gdzie dziś taniej</h3><p class="sub">Obniżki z gazetek na to, co masz jeszcze do kupienia. Dotknij sklepu, żeby zobaczyć produkty i warunki.</p>
    <div class="cmpl">${hit.map((x, i) => `<button type="button" class="cmpr" data-cmp="${x.id}" style="--sc:${x.color}"><i></i><span class="cmpn"><b>${esc(x.name)}${i === 0 ? ' <span class="badge badge--promo badge--pill">najtaniej</span>' : ''}</b><small>${CMP[x.id].n} z ${total} ${plural(total, 'produktu', 'produktów', 'produktów')} w promocji</small></span><span class="cmps">−${zl(CMP[x.id].save)}</span>${ic('chev', 2)}</button>`).join('')}
    ${none.map(x => `<div class="cmpr off" style="--sc:${x.color}"><i></i><span class="cmpn"><b>${esc(x.name)}</b><small>brak obniżek na Twoje produkty</small></span></div>`).join('')}</div>
    <p class="hint">Liczymy tylko obniżki z przekreśloną ceną. Pełnego kosztu zakupów nie podajemy, bo sklepy nie publikują zwykłych cen.</p>`, sh => sh.querySelectorAll('[data-cmp]').forEach(b => b.onclick = () => dealsSheet(b.dataset.cmp))); }
function dealsSheet(id) { const D = CMP[id]; if (!D || !D.n) return; const total = openItems().length, sh0 = storeOf(id);
  const close = sheet(`<h3>Taniej w ${esc(IN[id] || sh0.name)}</h3><p class="sub">${D.n} z ${total} ${plural(total, 'produktu', 'produktów', 'produktów')} z Twojej listy w promocji. Razem około ${zl(D.save)} mniej.</p>
    <div class="offers">${D.hits.map(({ item, o }) => `<div class="dl"><div class="dl__for">Za <b>${esc(item)}</b> z Twojej listy · oszczędzasz ${zl(o.oldPrice - o.price)}${o.multi > 1 ? ' na sztuce' : ''} · do ${dm(o.until)}</div>
      ${offerHtml(o, { flat: true })}${o.multi > 1 ? `<p class="dlw">Cena promocyjna przy zakupie ${o.multi} szt. Za jedną sztukę zapłacisz zwykłą cenę.</p>` : ''}</div>`).join('')}</div>
    ${id !== store() ? `<div class="pcb"><button type="button" class="btn btn--primary btn--lg btn--block ok" data-go>Ułóż listę pod ${esc(sh0.thru || sh0.name)}</button></div>` : ''}`, sh => {
    const g = sh.querySelector('[data-go]'); if (g) g.onclick = () => { resetPromos(id); put('settings', { id: 'store', value: id }); promosSoon(); close(); vib(6); }; }); }
function offersSheet(it) { const s = storeOf(store()), offs = PR[it.name] || [];
  sheet(`<h3>${esc(it.name)} taniej</h3><p class="sub">Promocje w ${esc(IN[s.id] || s.name)}, które pasują do tego produktu.</p>
    <div class="offers">${offs.map(o => offerHtml(o, { meta: `${esc(s.name)} · ${dm(o.from)} – ${dm(o.until)}` })).join('')}</div>
    <p class="hint">Ceny z gazetek promocyjnych (ding.pl). Warunki podajemy, gdy są w opisie oferty.</p>`); }

// ---------- the dictation dictionary: what I say → how it is written ----------
function wordsSheet() { const mine = Object.entries(myAliases()).sort((a, b) => a[0].localeCompare(b[0], 'pl')), n = Object.keys(CAT.aliases || {}).length;
  const close = sheet(`<h3>Słownik dyktowania</h3><p class="sub">Gdy powiesz słowo po lewej, na liście pojawi się to po prawej. Uczy się też samo: popraw dodany produkt przyciskiem „Zmień”.</p>
    <form class="wadd" id="wadd"><input class="input" name="a" placeholder="Mówię…" autocomplete="off" aria-label="Mówię"><span class="ar">→</span><input class="input" name="b" placeholder="Zapisz jako…" autocomplete="off" aria-label="Zapisz jako"><button type="submit" aria-label="Dodaj do słownika">${ic('plus', 2.2)}</button></form>
    <div class="wl">${mine.length ? mine.map(([a, b]) => `<div class="wr"><span class="wa">${esc(a)}</span><span class="ar">→</span><b>${esc(b)}</b><button type="button" data-w="${esc(a)}" aria-label="Usuń: ${esc(a)}">${ic('x', 2)}</button></div>`).join('') : '<p class="wnone">Jeszcze nic swojego. Dodaj parę powyżej albo popraw produkt po dyktowaniu.</p>'}</div>
    <p class="hint">Wbudowanych jest ${n} popularnych zapisów, np. łyski → whisky, keczup → ketchup, mocarella → mozzarella.</p>`, sh => {
    sh.querySelector('#wadd').onsubmit = e => { e.preventDefault(); const f = e.target; if (addAlias(f.a.value, f.b.value)) { vib(8); close(); setTimeout(wordsSheet, 380); } else f.a.focus(); };
    sh.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { dropAlias(b.dataset.w); b.closest('.wr').remove(); }); }); }
// (editing a product: its name, how much and in what, and the aisle; the deal is looked up again for a new name)
const EDIT_UNITS = ['szt', 'kg', 'g', 'l', 'ml', 'op'];
function editSheet(it0) { const it = C.items[it0.id] || it0; let unit = it.unit || null, cat = it.cat || 'dom';
  const units = [...EDIT_UNITS, ...(unit && !EDIT_UNITS.includes(unit) ? [unit] : [])], cats = [...new Set([...orderFor(store()), ...Object.keys(CATS)])].filter(c => CATS[c]);
  const stepOf = () => unit === 'kg' || unit === 'l' ? .5 : unit === 'g' || unit === 'ml' ? 100 : 1;
  const close = sheet(`<h3>Edytuj produkt</h3><form class="edf" id="edF" autocomplete="off">
    <label class="edl" for="edN">Nazwa</label><input class="input" id="edN" name="n" value="${esc(it.name)}" autocapitalize="sentences" enterkeyhint="done">
    <span class="edl" id="edQl">Ilość</span><div class="edq" role="group" aria-labelledby="edQl"><button class="ibtn ibtn--secondary ibtn--lg" type="button" data-d="-1" aria-label="Mniej">−</button>
      <input class="input edn" id="edQ" name="q" inputmode="decimal" value="${it.qty == null ? '' : String(it.qty).replace('.', ',')}" placeholder="—" aria-label="Ilość">
      <button class="ibtn ibtn--secondary ibtn--lg" type="button" data-d="1" aria-label="Więcej">${ic('plus', 2.2)}</button></div>
    <div class="edch" role="radiogroup" aria-label="Jednostka">${units.map(u => `<button type="button" role="radio" class="chip chip--sm${u === unit ? ' chip--on' : ''}" aria-checked="${u === unit}" data-u="${esc(u)}">${esc(u)}</button>`).join('')}</div>
    <span class="edl">Dział</span><div class="edch" role="radiogroup" aria-label="Dział">${cats.map(c => `<button type="button" role="radio" class="chip chip--sm${c === cat ? ' chip--on' : ''}" aria-checked="${c === cat}" data-c="${c}">${CAT_EMOJI[c] || ''} ${esc(CATS[c].name)}</button>`).join('')}</div>
    <button class="btn btn--primary btn--lg btn--block" type="submit">Zapisz</button>
    <button class="btn btn--ghost btn--lg btn--block eddel" type="button" data-del>${ic('trash')}Usuń z listy</button></form>`, sh => {
    const f = sh.querySelector('#edF'), q = f.q, num = () => { const v = parseFloat(String(q.value).replace(',', '.')); return isFinite(v) && v > 0 ? v : null; };
    const pick = (attr, set) => sh.querySelectorAll(`[data-${attr}]`).forEach(b => b.onclick = () => { const on = set(b.dataset[attr]);
      sh.querySelectorAll(`[data-${attr}]`).forEach(x => { const me = x === b && on; x.classList.toggle('chip--on', me); x.setAttribute('aria-checked', String(me)); }); vib(5); });
    // (a unit can be tapped off again: then it is just a count)
    pick('u', u => { unit = unit === u ? null : u; return unit === u; }); pick('c', c => { cat = c; return true; });
    sh.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const st = stepOf(), v = Math.round(((num() || 0) + st * +b.dataset.d) * 100) / 100; q.value = v > 0 ? String(v).replace('.', ',') : ''; vib(5); });
    f.onsubmit = e => { e.preventDefault(); const cur = C.items[it.id] || it, name = f.n.value.trim().replace(/^./, c => c.toUpperCase()); if (!name) { f.n.focus(); return; }
      const qty = num(), renamed = norm(name) !== norm(cur.name);
      // (an aisle picked by hand stays: the server's tidy-up of unknown products never moves it)
      put('items', { ...cur, name, qty, unit: qty == null ? null : unit, cat, ...(cat !== cur.cat ? { catBy: 'user' } : {}), ...(renamed ? { emoji: null, q: null, opts: [] } : {}) }); vib(8); close();
      if (renamed) { promosSoon(); compareSoon(); } };
    sh.querySelector('[data-del]').onclick = () => { const cur = C.items[it.id] || it; put('items', { ...cur, deleted: true }); vib(10); close(); toast('Usunięto z listy'); };
  }); }
function menuSheet() { const t = theme();
  const close = sheet(`<h3>Koszyk</h3><div class="list">
    <button data-a="order">${ic('grip')}Kolejność działów w sklepie</button>
    <button data-a="shops">${ic('bag')}Moje sklepy</button>
    <button data-a="ds">${ic('grid')}Design system</button>
    <button data-a="words">${ic('book')}Słownik dyktowania</button>
    <button data-a="clear">${ic('check')}Usuń kupione z listy</button>
    ${Object.values(C.items).some(i => !i.deleted) ? `<button data-a="wipe" class="dz">${ic('trash')}Wyczyść całą listę</button>` : ''}
    <button data-a="icons">${ic('cookie')}Ikony produktów: ${iconsOn() ? 'przy każdym' : 'tylko przy działach'}</button>
    <button data-a="theme">${ic('moon')}Motyw: ${t === 'dark' ? 'ciemny' : t === 'light' ? 'jasny' : 'jak w systemie'}</button>
    <button data-a="out">${ic('out')}Wyloguj to urządzenie</button></div><p class="hint">${aiOn ? 'Dyktowanie rozumie AI (Claude).' : 'AI wyłączone: dyktowanie dzieli prosty parser. Ustaw ANTHROPIC_API_KEY na serwerze, żeby rozumiało lepiej.'} Promocje z ding.pl.</p>`, sh => {
    sh.querySelector('[data-a=order]').onclick = () => { close(); setTimeout(orderSheet, 380); };
    sh.querySelector('[data-a=words]').onclick = () => { close(); setTimeout(wordsSheet, 380); };
    sh.querySelector('[data-a=shops]').onclick = () => { close(); setTimeout(storesSheet, 380); };
    sh.querySelector('[data-a=ds]').onclick = () => { close(); window.open('/ds.html', '_blank'); };
    const wp = sh.querySelector('[data-a=wipe]'); if (wp) wp.onclick = () => { close(); setTimeout(clearAllSheet, 380); };
    sh.querySelector('[data-a=clear]').onclick = () => { Object.values(C.items).filter(i => i.done && !i.deleted).forEach(i => put('items', { ...i, deleted: true }, true)); render(); close(); };
    sh.querySelector('[data-a=theme]').onclick = () => { const n = t === 'system' ? 'dark' : t === 'dark' ? 'light' : 'system'; localStorage.setItem('koszyk.theme', n); applyTheme(); close(); setTimeout(menuSheet, 380); };
    sh.querySelector('[data-a=icons]').onclick = () => { localStorage.setItem('koszyk.icons', iconsOn() ? 'off' : 'on'); applyIcons(); close(); setTimeout(menuSheet, 380); };
    sh.querySelector('[data-a=out]').onclick = () => { localStorage.removeItem('koszyk.token'); token = ''; close(); render(); }; }); }

// ---------- the mark: "koszyk", its o a ring with an aqua dot (something in the basket) ----------
// (the mark alone: a basket with the aqua dot; the name stays for screen readers)
const LOGO = '<span class="logo" role="img" aria-label="Koszyk"><svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="12" class="lg-bg"/><path class="lg-ln" d="M10.5 17h19l-1.9 10.6a2.2 2.2 0 0 1-2.2 1.9H14.6a2.2 2.2 0 0 1-2.2-1.9z"/><path class="lg-ln" d="M15.6 17l3.2-6M24.4 17l-3.2-6"/><circle cx="20" cy="23.2" r="2.5" class="lg-dot"/></svg></span>';

// ---------- the PIN ----------
function renderPin() {
  const app = $('#app'); let pin = '', busy = false;
  // (white, centred and calm: the mark, a big heading, room for the code, round soft keys)
  app.innerHTML = `<div class="pin"><div class="pc">
    <h1>Wpisz PIN</h1><p class="psub">Czterocyfrowy kod do wspólnej listy zakupów.</p>
    <div class="cells" aria-live="polite" aria-label="Wpisane cyfry">${'<span><i></i></span>'.repeat(4)}</div>
    <p class="pmsg" role="status"></p>
    <div class="keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map((k, i) => k === '' ? '<span></span>' : `<button type="button" data-k="${k}" style="--i:${i}" aria-label="${k === 'del' ? 'Usuń cyfrę' : k}">${k === 'del' ? ic('back', 1.8) : k}</button>`).join('')}</div></div></div>`;
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
let storesKey = '';
// (the shop, on top of the header: a tap on the name opens your shops, a swipe steps through them)
let storeSw = null;
const cheapest = () => { const cs = MY().filter(x => CMP[x.id] && CMP[x.id].n && CMP[x.id].save > 0).sort((a, b) => CMP[b.id].save - CMP[a.id].save); return cs[0] ? cs[0].id : null; };
function setStore(id) { if (id === store()) return; resetPromos(id); put('settings', { id: 'store', value: id }); promosSoon(); vib(6); }
function renderStores() { const cur = storeOf(store()), best = cheapest(), el = $('#swName'); if (!el) return;
  const key = myIds().join(',') + '|' + cur.id + '|' + best; if (key === storesKey) return; storesKey = key;
  el.style.setProperty('--sc', cur.color); el.innerHTML = `<i class="dot"></i><span class="ah-n">${esc(cur.name)}</span>${ic('down', 2.2)}`;
  if (storeSw) return;
  storeSw = switcher($('#storeSw'), { name: el,
    onStep: d => { const ids = myIds(), i = ids.indexOf(store()); setStore(ids[(i + d + ids.length) % ids.length]); },
    items: () => { const b0 = cheapest(); return MY().map(x => ({ id: x.id, selected: x.id === store(), html: `<span class="sw-o" style="--sc:${x.color}"><i class="dot"></i>${esc(x.name)}${x.id === b0 ? ' <span class="badge badge--promo badge--pill">najtaniej</span>' : ''}</span>${CMP[x.id] && CMP[x.id].save > 0 ? `<small>−${zl(CMP[x.id].save)}</small>` : ''}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>` })); },
    onPick: id => setStore(id),
    footer: { html: `<span class="sw-o">${ic('plus', 2)}Moje sklepy…</span>`, onClick: () => storesSheet() } }); }
// (pick your shops; the family sees the same ones)
function storesSheet() { const mine = myIds(), all = [...mine.map(id => storeOf(id)), ...CAT.stores.filter(x => !mine.includes(x.id))];
  const close = sheet(`<h3>Moje sklepy</h3><p class="sub">Wybierz sieci, w których robisz zakupy. Ich gazetki trafią do promocji i porównania. Ustawienie jest wspólne dla całej rodziny.</p>
    <div class="slist">${all.map(x => `<label class="srow" style="--sc:${x.color}"><i></i><span>${esc(x.name)}</span><input type="checkbox" data-id="${x.id}" ${mine.includes(x.id) ? 'checked' : ''}><b class="switch" aria-hidden="true"></b></label>`).join('')}</div>
    <p class="hint">Gazetki pochodzą z ding.pl. Kolejność działów ustawisz osobno dla każdego sklepu.</p>`, sh => sh.querySelectorAll('[data-id]').forEach(cb => cb.onchange = () => {
      const now = [...sh.querySelectorAll('[data-id]:checked')].map(x => x.dataset.id);
      if (!now.length) { cb.checked = true; toast('Zostaw przynajmniej jeden sklep'); return; }
      const keep = myIds().filter(id => now.includes(id)), added = now.filter(id => !keep.includes(id));
      put('settings', { id: 'myStores', value: [...keep, ...added] }, true); resetPromos(); storesKey = ''; render(); promosSoon(); compareSoon(); loadShopPromos(); vib(6); })); }
let mounted = false;   // (the cover's own scroll drives the aisle pills)
function mount() {
  $('#app').innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="graphite" x="-5%" y="-200%" width="110%" height="500%"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6"/></filter></svg>
    <header class="top apphead"><div class="c"><div class="ah-store"><div class="ah-sw" id="storeSw"><span class="sw-name ah-name" id="swName"></span></div><small class="ah-sub" id="ahSub"></small></div>
      <div class="acts"><button class="btn btn--secondary gzb" id="leafBtn" type="button">${ic('paper', 1.9)}<span>Gazetki</span></button>
      <button class="ibtn ibtn--secondary" id="menuBtn" type="button" aria-label="Menu">${ic('more', 2.6)}</button></div></div></header>
    <main id="list"></main>
    <div class="dock"><div class="pblur" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="chips" id="chips" hidden></div>
      <div class="c bar"><button class="field opener" id="f" type="button" aria-haspopup="dialog">${ic('plus', 2)}<span>Dopisz produkt…</span></button>
      <button class="ibtn ibtn--primary ibtn--xl mic" id="mic" type="button" aria-label="Przytrzymaj i mów">${ic('mic', 2)}</button></div></div>
    <div class="hear" aria-live="polite"><small><span class="wave"><b></b><b></b><b></b><b></b></span><span class="orbs small"><i></i><i></i><i></i></span><span class="lbl">Słucham</span></small><p class="ph"></p></div>
    <div class="cover" role="dialog" aria-modal="true" aria-label="Gazetka" hidden><div class="cv-top"><div class="cv-bar"><button class="ibtn ibtn--secondary" type="button" id="cvClose" aria-label="Zamknij">${ic('x', 2)}</button><div class="cv-t"><b>Gazetka</b><small class="cv-sub"></small></div><button class="ibtn ibtn--secondary" type="button" id="cvFind" aria-label="Szukaj" aria-pressed="false">${ic('search', 2)}</button><div class="seg seg--icons" id="cvView" role="group" aria-label="Widok"></div></div><div class="cv-head"></div></div><div class="cv-body"></div></div>
    <div class="cover fqv" role="dialog" aria-modal="true" aria-label="Często kupujesz" hidden><div class="cv-top"><div class="cv-bar"><button class="ibtn ibtn--secondary" type="button" id="fqClose" aria-label="Zamknij">${ic('x', 2)}</button><div class="cv-t"><b>Często kupujesz</b><small class="fq-sub"></small></div></div><div class="cv-head"><label class="cv-find">${ic('search', 2)}<input id="fqQ" type="search" placeholder="Szukaj produktu" autocomplete="off" enterkeyhint="search" aria-label="Szukaj produktu"></label></div></div><div class="cv-body fq-body"></div></div><div class="adder" role="dialog" aria-modal="true" aria-label="Dopisz produkty" hidden><div class="ad-in"><div class="ad-top"><span class="grab"></span><h3>Dopisz</h3><span class="ad-msg" role="status"></span><button class="btn btn--primary btn--sm ad-done" type="button">Gotowe</button></div><div class="ad-list" id="adList"></div><form class="ad-bar" id="adF"><input class="input" id="adQ" placeholder="Wpisz produkt, np. mleko 2 litry" autocomplete="off" autocapitalize="sentences" enterkeyhint="send" aria-label="Produkt"><button class="ibtn ibtn--primary ibtn--lg ad-send" type="submit" aria-label="Dodaj">${ic('up', 2.2)}</button></form></div></div><div class="toast" role="status"></div><div class="snack" role="status" aria-live="polite"><span class="st"></span><button type="button" data-s="edit">Zmień</button><button type="button" class="sx" data-s="del">${ic('trash', 1.8)}</button></div><div class="scrim"></div><div class="sheet" role="dialog" aria-modal="true"></div>`;
  addEventListener('scroll', () => $('.top') && $('.top').classList.toggle('lined', scrollY > 6), { passive: true });
  $('#menuBtn').onclick = menuSheet; $('#leafBtn').onclick = openCover;
  $('#f').onclick = () => openAdder();
  const aq = $('#adQ'); aq.oninput = () => { if (!aq.value.trim()) editFrom = null; adderRender(); };
  $('#adF').onsubmit = e => { e.preventDefault(); submitText(aq.value); };
  $('.ad-done').onclick = closeAdder; $('#cvClose').onclick = closeCover;
  $('#fqClose').onclick = closeFreqAll; $('#fqQ').oninput = e => { fqQ = e.target.value; renderFreqAll(); };
  $('#cvFind').onclick = () => { cvSearch = !cvSearch; if (!cvSearch) cvQ = ''; renderCover(true); };
  $('#cvView').onclick = e => { const b = e.target.closest('[data-view]'); if (!b) return; try { localStorage.setItem('koszyk.leafView', b.dataset.view); } catch { } vib(4); renderCover(true); };
  $('.cv-body').addEventListener('error', coverImgFallback, true); $('.adder').addEventListener('click', e => { if (e.target === e.currentTarget) closeAdder(); });
  $('#adList').addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); });   // (keep the keyboard up while tapping suggestions)
  addEventListener('keydown', e => { if (e.key === 'Escape' && fqOpen && !$('.sheet.show')) closeFreqAll(); else if (e.key === 'Escape' && adderOpen) closeAdder(); else if (e.key === 'Escape' && coverOpen && !$('.sheet.show')) closeCover(); });
  const mic = $('#mic'); mic.addEventListener('pointerdown', e => { e.preventDefault(); startVoice(); }); mic.addEventListener('contextmenu', e => e.preventDefault());
  mic.addEventListener('lostpointercapture', stopVoice); mic.addEventListener('pointerdown', e => { try { mic.setPointerCapture(e.pointerId); } catch { } });
  addEventListener('pointerup', stopVoice); addEventListener('pointercancel', stopVoice); addEventListener('blur', stopVoice);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopVoice(); }); $('.hear').addEventListener('click', stopVoice);   // (a tap on the panel ends it too)
  mounted = true; }
// (under the shop's name, small: how many things on your list are on offer here; or what to do with an empty list)
function renderHead() { const all = Object.values(C.items).filter(i => !i.deleted), open = all.filter(i => !i.done), sid = store();
  const np = open.filter(i => bestOffer(i.name)).length, here = np && cheapest() === sid ? ' · tu dziś najtaniej' : '';
  $('#ahSub').innerHTML = !all.length ? 'Przytrzymaj mikrofon i powiedz, co kupić' : !open.length ? 'Wszystko z listy jest w koszyku'
    : prWait === sid ? '<span class="skel skel--text" aria-label="Sprawdzam promocje"></span>'
    : np ? `<b>${np} ${plural(np, 'produkt', 'produkty', 'produktów')}</b> z listy w promocji${here}` : 'Nic z listy nie jest dziś w promocji'; }
function render() {
  if (!token) { mounted = false; return renderPin(); }
  if (!mounted) mount();
  renderStores(); renderHead();
  $('#menuBtn').classList.toggle('dot', !online);
  renderList(); renderChips(); if (coverOpen) renderCover(); if (fqOpen) renderFreqAll(); }

if (token) prWait = store(); render(); if (token) { sync(); promosSoon(); compareSoon(); }
if ('serviceWorker' in navigator && !/^(localhost|127\.)/.test(location.hostname)) navigator.serviceWorker.register('/sw.js').catch(() => { });
window.KOSZYK = { get C() { return C; }, addItems, addText, sync, get PR() { return PR; } };
