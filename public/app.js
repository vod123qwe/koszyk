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
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  paper: '<path d="M5 4h11v15a2 2 0 0 0 2 2H7a2 2 0 0 1-2-2z"/><path d="M16 8h3v11a2 2 0 0 1-2 2M8.5 8h4.5M8.5 11.5h4.5M8.5 15h3"/>',
  swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
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
  try { const r = await api('/api/promos', { store: s.id, names }); if (r.store === store()) { PR = r.promos || {}; render(); if (!promoChecked) setTimeout(promoChanges, 700); else snapshotPromos(); } } catch { } }, 900); }
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
      ${own ? offerHtml(own, { flat: true }) : `<div class="offer offer--flat"><span class="offer__media" style="--tile:var(--t-${it.cat})">${esc(emojiOf(it) || '•')}</span><div class="offer__body"><b class="offer__name">${esc(it.name)}${qtyText(it) ? ` · ${esc(qtyText(it))}` : ''}</b><small class="offer__meta">bez promocji w tym sklepie</small></div></div>`}</div>
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
function suggestions() {
  const open = new Set(openItems().map(i => norm(i.name))), now = Date.now(), hs = Object.values(C.history).filter(h => !open.has(h.id) && looksLikeProduct(h));
  const promo = hs.map(h => ({ h, p: bestOffer(h.name) || leafHit(h.name, h.cat) })).filter(x => x.p).sort((a, b) => offPct(b.p) - offPct(a.p)).slice(0, 6);   // (on the list's promos or anywhere in this shop's leaflet)
  const due = hs.filter(h => h.count >= 2 && h.avg && (now - h.lastAt) / h.avg > .8 && !promo.some(x => x.h === h)).sort((a, b) => (now - b.lastAt) / b.avg - (now - a.lastAt) / a.avg).slice(0, 5);
  const freq = hs.filter(h => now - h.lastAt > 2 * 864e5 && !due.includes(h) && !promo.some(x => x.h === h)).sort((a, b) => b.count - a.count).slice(0, Math.max(0, 6 - due.length));
  return { promo, due, freq }; }

// ---------- adding: from the voice or the field ----------
const openItems = () => Object.values(C.items).filter(i => !i.deleted && !i.done);
let newIds = new Set(); const ticking = new Set(), lit = new Map();   // (lit: id -> when its highlight started)
function addItems(list, removes = []) {
  const added = [], dupes = []; const open = openItems();
  for (const it of list) { const ex = open.find(o => norm(o.name) === norm(it.name));
    if (ex) { if (it.qty != null) put('items', { ...ex, qty: it.qty, unit: it.unit }, true); dupes.push(ex.name); lit.set(ex.id, Date.now()); continue; }   // (already there: say so and light it up)
    const item = { id: uid(), name: it.name, qty: it.qty ?? null, unit: it.unit ?? null, cat: CATS[it.category || it.cat] ? (it.category || it.cat) : 'dom', emoji: it.emoji || null, note: it.note || null,
      q: it.question || null, opts: (it.options || []).slice(0, 3), done: false, deleted: false, createdAt: Date.now() };
    newIds.add(item.id); lit.set(item.id, Date.now()); put('items', item, true); added.push(item); }
  const gone = []; for (const r of removes) { const ex = open.find(o => !o.deleted && !gone.includes(o.name) && (norm(o.name).includes(norm(r)) || norm(r).includes(norm(o.name)))); if (ex) { put('items', { ...ex, deleted: true }, true); gone.push(ex.name); } }
  added.removed = gone; added.dupes = dupes;
  render(); promosSoon(); compareSoon(); setTimeout(() => newIds.clear(), 1200); setTimeout(() => { const t = Date.now(); lit.forEach((at, id) => t - at > 4400 && lit.delete(id)); }, 4500);
  const firstId = added[0] ? added[0].id : dupes.length ? (open.find(o => o.name === dupes[0]) || {}).id : null; if (firstId) { focusRow = { id: firstId, until: Date.now() + 2500 }; if (!adderOpen) showFocus(true); }
  return added; }
async function addText(text) {
  text = fixWords(text.trim()); if (!text) return;
  hear(text, 'think');
  try { const r = await api('/api/parse', { text }); const added = addItems(r.items || [], r.remove || []);
    hear(null); if (adderOpen) return added; const gone = added.removed || []; if (added.length) snack(added, text, 'Dodano', gone); else toast(gone.length ? `Usunięto: ${gone.join(', ')}` : added.dupes.length ? `Już jest na liście: ${added.dupes.join(', ')}` : (r.remove || []).length ? 'Tego nie ma na liście' : 'Nic nowego na liście'); return added; }
  catch (e) { hear(null); if (e.message !== 'auth') { const added = addItems(text.split(/[,;\n]+/).map(s => ({ name: s.trim().replace(/^./, c => c.toUpperCase()), category: 'dom' })).filter(i => i.name)); if (!adderOpen && added.length) snack(added, text, 'Bez sieci, dodano'); return added; } } }

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
function openAdder(prefill = '') { const el = adderEl(), q = $('#adQ'); if (!el) return;
  adderOpen = true; el.hidden = false; requestAnimationFrame(() => el.classList.add('show'));
  q.value = prefill; q.focus(); if (prefill) q.setSelectionRange(prefill.length, prefill.length);
  fitAdder(); adderRender(); }
function closeAdder() { const el = adderEl(); if (!el || !adderOpen) return; adderOpen = false; if (focusRow) { focusRow.until = Date.now() + 2500; setTimeout(() => showFocus(true), 380); } editFrom = null; $('#adQ').blur(); el.classList.remove('show'); setTimeout(() => { if (!adderOpen) el.hidden = true; }, 380); }
// (iOS keeps the layout height when the keyboard is up: follow the visible part of the screen instead)
function fitAdder() { const vv = window.visualViewport, el = adderEl(); if (!el) return; el.style.setProperty('--vvh', (vv ? vv.height : innerHeight) + 'px'); el.style.setProperty('--vvt', (vv ? vv.offsetTop : 0) + 'px'); }
if (window.visualViewport) { visualViewport.addEventListener('resize', () => adderOpen && fitAdder()); visualViewport.addEventListener('scroll', () => adderOpen && fitAdder()); }
function adderSay(t) { const m = $('.ad-msg'); if (!m) return; m.textContent = t; m.classList.add('show'); clearTimeout(adderMsgT); adderMsgT = setTimeout(() => m.classList.remove('show'), 2600); }
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
    (EP[store()] || []).filter(o => o.oldPrice && o.oldPrice > o.price).slice(0, 200).forEach(o => pick.length < 14 && add({ name: o.name, cat: o.cat, emoji: o.emoji }, 'offer'));
    const exact = pick.some(p => norm(p.name) === q);
    html = (exact ? '' : `<button class="adr raw" type="button" data-raw="1"><span class="em">${ic('plus', 2.2)}</span><span class="adn">Dodaj „${esc(raw)}”<small>${/\d/.test(raw) || raw.split(/\s+/).length > 2 ? 'rozdzielę produkty i ilości' : 'tak, jak wpisałeś'}</small></span></button>`)
      + pick.slice(0, 14).map(x => row(x, x.from === 'mine' ? 'z Twoich zakupów' : x.from === 'offer' ? `w promocji w ${IN[store()]}` : '')).join(''); }
  box.innerHTML = html; box.scrollTop = q ? box.scrollHeight : 0;
  box.querySelectorAll('[data-name]').forEach(b => b.onclick = () => { if (b.classList.contains('on')) { adderSay(`${b.dataset.name} już jest na liście`); return; }
    const added = addItems([{ name: b.dataset.name, category: b.dataset.cat || undefined }]); vib(8); if (added.length) adderSay(`Dodano: ${b.dataset.name}`);
    $('#adQ').value = ''; adderRender(); });
  const r = box.querySelector('[data-raw]'); if (r) r.onclick = () => submitText(raw); }
// (typed text goes through the same parser as the voice; the sheet stays open for the next one)
async function submitText(t) { t = t.trim(); if (!t) return; const learned = editFrom ? learnFromEdit(editFrom, t) : []; editFrom = null;
  $('#adQ').value = ''; adderRender();
  const added = await addText(t);
  if (adderOpen && added) adderSay(added.length ? `Dodano: ${added.map(i => i.name + (qtyText(i) ? ' ' + qtyText(i) : '')).join(', ')}` : (added.dupes || []).length ? `Już jest na liście: ${added.dupes.join(', ')}` : 'Nic nowego');
  if (learned.length) setTimeout(() => toast(`Zapamiętam: ${learned.map(([a, b]) => `„${a}” to ${b}`).join(', ')}`), adderOpen ? 2800 : 5300);
  if (adderOpen) adderRender(); }
// (the snackbar after adding: what landed on the list, and a way back: "Zmień" puts the words in the field, the bin takes them off)
let snackT = 0, editFrom = null;
function snack(added, text, lead = 'Dodano', gone = []) { const el = $('.snack'); if (!el) return; $('.toast')?.classList.remove('show');
  el.querySelector('.st').innerHTML = `<b>${lead}:</b> ${added.map(i => esc(i.name + (i.qty == null ? '' : i.unit ? ' ' + qtyText(i) : ' ×' + qtyText(i)))).join(', ')}${gone.length ? ` · <b>Usunięto:</b> ${gone.map(esc).join(', ')}` : ''}`;
  const hide = () => { el.classList.remove('show'); clearTimeout(snackT); };
  const drop = () => { added.forEach(a => { const cur = C.items[a.id]; if (cur && !cur.deleted) put('items', { ...cur, deleted: true }, true); lit.delete(a.id); }); render(); compareSoon(); hide(); };
  el.querySelector('[data-s=edit]').textContent = 'Zmień'; el.querySelector('[data-s=del]').hidden = false;
  el.querySelector('[data-s=edit]').onclick = () => { drop(); editFrom = text; openAdder(text); };
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
const IN = Object.fromEntries(CAT.stores.map(x => [x.id, x.in || x.name])), THRU = Object.fromEntries(CAT.stores.map(x => [x.id, x.thru || x.name]));
function rowEl(it) {
  const done = it.done || ticking.has(it.id), row = document.createElement('div');
  row.className = 'row' + (done ? ' on' : '') + (newIds.has(it.id) ? ' new' : '') + (lit.has(it.id) && !done ? ' lit' : ''); row.dataset.id = it.id;
  if (lit.has(it.id)) row.style.setProperty('--lt', `${lit.get(it.id) - Date.now()}ms`);   // (a re-render picks the glow up where it was)
  const p = !it.done && bestOffer(it.name), q = qtyText(it);
  row.innerHTML = `<div class="del">Usuń</div><div class="line"><div class="c">
    <span class="em${emojiOf(it) ? '' : ' none'}" style="--tile:var(--t-${it.cat})">${emojiOf(it) ? esc(emojiOf(it)) : ''}</span>
    <div class="txt"><div class="nm"><b>${esc(it.name)}</b>${q ? `<span class="qty">${esc(q)}</span>` : ''}<svg class="strike" viewBox="0 0 100 9" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="${pencil(it.id)}"/></svg></div>
      ${it.note ? `<div class="meta"><span>${esc(it.note)}</span></div>` : ''}${p ? `<button class="deal" type="button" data-promo aria-label="Promocja: ${esc(p.name)}">${pct(p) ? `<span class="badge badge--promo">${pct(p)}</span>` : ''}<span class="dn"><span class="dnn">${esc(p.title || p.name)}</span>${promoKinds(p).some(k => k.k !== 'plain') ? `<span class="badges">${kindBadges(p)}</span>` : ''}</span><span class="dp"><b>${zl(p.price)}</b>${p.oldPrice ? `<s>${zl(p.oldPrice)}</s>` : ''}</span></button>` : ''}
      ${(() => { const n = subsHint(it).length; return n ? `<button type="button" class="subs" data-subs>${ic('swap', 2)}${n} ${plural(n, 'zamiennik', 'zamienniki', 'zamienników')} w promocji</button>` : ''; })()}
      ${!it.done && it.q ? `<div class="ask"><span>${esc(it.q)}</span>${(it.opts || []).map(o => `<button type="button" data-opt="${esc(o)}">${esc(o)}</button>`).join('')}</div>` : ''}</div>
    <button class="chk" type="button" aria-pressed="${done}" aria-label="${done ? 'Przywróć' : 'Kupione'}: ${esc(it.name)}">${ic('check', 2.4)}</button></div></div>`;
  row.querySelector('.chk').onclick = () => tick(row, it);
  row.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => { put('items', { ...it, name: b.dataset.opt, q: null, opts: [] }); promosSoon(); });
  const pb = row.querySelector('[data-promo]'); if (pb) pb.onclick = () => offersSheet(it);
  const sb = row.querySelector('[data-subs]'); if (sb) sb.onclick = () => subsSheet(it);
  swipe(row, it); return row; }
let seenCats = new Set(), chipsKey = '';
// ---------- keeping the page still: a rebuilt list keeps its height and scroll; the row you just added stays in view ----------
let focusRow = null;
function showFocus(smooth) { if (!focusRow || Date.now() > focusRow.until) { focusRow = null; return; }
  const row = document.querySelector(`.row[data-id="${focusRow.id}"]`); if (!row) return;
  const r = row.getBoundingClientRect(), dock = $('.dock') ? $('.dock').getBoundingClientRect().top : innerHeight;
  if (r.top >= 16 && r.bottom <= dock - 8) return;   // (already visible: leave the page alone)
  scrollTo({ top: Math.max(0, r.top + scrollY - (dock - r.height) / 2), behavior: smooth ? 'smooth' : 'auto' }); }
function renderList() { const wrap = $('#list'), y = scrollY; wrap.style.minHeight = wrap.offsetHeight + 'px';
  try { buildList(); } finally { wrap.style.minHeight = ''; }
  if (Math.abs(scrollY - y) > 1) scrollTo(0, y);
  if (focusRow) showFocus(false); }
function buildList() {
  const wrap = $('#list'), id = store(), order = orderFor(id), all = Object.values(C.items).filter(i => !i.deleted), open = all.filter(i => !i.done), done = all.filter(i => i.done);
  const s = storeOf(id), np = open.filter(i => bestOffer(i.name)).length;
  wrap.innerHTML = '';
  if (np) wrap.insertAdjacentHTML('beforeend', `<div class="pband"><div class="c"><div class="banner"><span class="badge badge--promo">%</span>${np} ${plural(np, 'produkt', 'produkty', 'produktów')} z listy taniej w ${IN[s.id] || s.name}</div></div></div>`);
  if (!all.length) { renderEmpty(wrap); return; }
  for (const cat of order) { const its = all.filter(i => i.cat === cat).sort((a, b) => a.createdAt - b.createdAt); if (!its.length) continue; const c = CATS[cat], left = its.filter(i => !i.done).length;
    const sec = document.createElement('section'); sec.className = 'sec' + (seenCats.has(cat) ? '' : ' enter');
    sec.innerHTML = `<div class="h"><div class="c">${esc(c.name)}<span class="n">${left ? left : '✓'}</span></div></div>`;
    for (const it of its) sec.appendChild(rowEl(it)); wrap.appendChild(sec); }
  seenCats = new Set(all.map(i => i.cat));
  // (the bottom: two square tiles side by side. Left, dark: where your list is cheapest today → the comparison.
  //  Right, our green: this shop's leaflet → a full-screen mini leaflet. The list itself stays about your products.)
  const cs = MY().filter(x => CMP[x.id] && CMP[x.id].n).sort((a, b) => CMP[b.id].save - CMP[a.id].save), best = cs[0], total = open.length, sid = store(), L0 = EP[sid];
  const leafN = L0 ? new Set(L0.map(o => norm(o.name))).size : 0, leafTop = L0 && L0.length ? Math.max(...L0.map(o => Math.round(offPct(o) * 100))) : 0;
  wrap.insertAdjacentHTML('beforeend', `<div class="tiles"><div class="c">
    ${total && best ? `<button type="button" class="tile tile--ink" id="tCheap"><span class="tile__label">Najtaniej dziś</span><span class="tile__title">${esc(storeOf(best.id).name)}</span><span class="tile__meta">−${zl(CMP[best.id].save)}<small>na ${CMP[best.id].n} z ${total} ${plural(total, 'produktu', 'produktów', 'produktów')} z listy</small></span><span class="tile__go">${cs.length > 1 ? 'Porównaj sklepy' : 'Zobacz produkty'}${ic('chev', 2)}</span></button>`
      : `<div class="tile tile--quiet"><span class="tile__label">Najtaniej dziś</span><span class="tile__title">—</span><span class="tile__meta"><small>${total ? 'Na Twoje produkty nie ma dziś obniżek w Twoich sklepach.' : 'Dodaj produkty, a porównamy sklepy.'}</small></span></div>`}
    <button type="button" class="tile tile--brand" id="tLeaf"${L0 === null ? ' disabled' : ''}><span class="tile__label">Gazetka</span><span class="tile__title">${esc(storeOf(sid).name)}</span><span class="tile__meta">${L0 === undefined ? '<small>Wczytuję promocje…</small>' : L0 === null ? '<small>Nie udało się pobrać</small>' : `${leafN}<small>${plural(leafN, 'promocja', 'promocje', 'promocji')}${leafTop ? ` · do −${leafTop}%` : ''}</small>`}</span><span class="tile__go">Przeglądaj${ic('chev', 2)}</span></button></div></div>`);
  loadShopPromos();
  const tc = $('#tCheap'); if (tc) tc.onclick = () => cs.length > 1 ? compareSheet() : dealsSheet(best.id);
  $('#tLeaf').onclick = openCover;
  if (done.length) { wrap.insertAdjacentHTML('beforeend', `<div class="sum"><div class="c"><span>Kupione ${done.length} z ${all.length}</span><button type="button" id="clearDone">Usuń kupione z listy</button></div></div>`);
    $('#clearDone').onclick = () => { done.forEach(i => put('items', { ...i, deleted: true }, true)); render(); }; } }
// ---------- offers: each shop's whole current leaflet (groceries and drugstore), what you usually buy first ----------
const STAPLES = [['Mleko', 'nabial'], ['Chleb', 'pieczywo'], ['Jajka', 'nabial'], ['Masło', 'nabial'], ['Banany', 'warzywa'], ['Pomidory', 'warzywa'], ['Ser żółty', 'wedliny'], ['Kawa', 'kawa'], ['Jogurt', 'nabial'], ['Makaron', 'suche'], ['Kurczak', 'mieso'], ['Jabłka', 'warzywa'], ['Ziemniaki', 'warzywa'], ['Woda', 'napoje'], ['Papier toaletowy', 'higiena'], ['Płyn do naczyń', 'chemia']];
let EP = {}, epAt = 0, epBusy = false;
const looksLikeProduct = h => h.name.length <= 32 && h.name.trim().split(/\s+/).length <= 4;   // (dictated notes to the app live in history too)
const L_ = 'a-ząćęłńóśźż', stemOf = w => w.slice(0, Math.max(4, Math.min(6, w.length - 1)));
// (does this offer fit that product? a short word must be the word itself: "sok" is not "Sokołów")
function offerFits(offerName, product) { const t = norm(product).split(' ').find(w => w.length >= 3); if (!t) return false;
  return t.length <= 3 ? new RegExp('(^|[^' + L_ + '])' + t + '[' + L_ + ']?([^' + L_ + ']|$)', 'i').test(offerName) : (' ' + offerName.toLowerCase()).includes(' ' + stemOf(t)); }
const mine = () => Object.values(C.history).filter(looksLikeProduct).sort((a, b) => b.count - a.count || b.lastAt - a.lastAt);
const leafHit = (name, cat) => (EP[store()] || []).find(o => offerFits(o.name, name) && (!cat || cat === 'dom' || !o.cat || o.cat === 'dom' || o.cat === cat));
const offPct = o => o.oldPrice ? 1 - o.price / o.oldPrice : 0;
// (the order: what you buy, then the deepest cuts, then plain leaflet prices)
function rankLeaf(list) { const my = mine().slice(0, 30);
  const score = o => (my.some(h => offerFits(o.name, h.name) && (!h.cat || h.cat === 'dom' || !o.cat || o.cat === h.cat)) ? 2 : 0) + (STAPLES.some(s => offerFits(o.name, s[0])) ? .6 : 0) + offPct(o) + (o.oldPrice ? .2 : 0);
  const seen = new Set(), sorted = list.filter(o => !seen.has(o.name) && seen.add(o.name)).sort((a, b) => score(b) - score(a));
  // (variety up top: at most two from one aisle in a row, the rest wait their turn)
  const top = [], later = [], per = {}; for (const o of sorted) { if ((per[o.cat] || 0) < 2 && top.length < 12) { top.push(o); per[o.cat] = (per[o.cat] || 0) + 1; } else later.push(o); }
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
const wireAdds = (root, keep) => root.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { const added = addItems([{ name: b.dataset.add, category: b.dataset.cat || undefined }]); vib(8);
  if (keep) { b.classList.add('in'); b.querySelector('.pl').innerHTML = ic('check', 2.4); toast(`Dodano: ${b.dataset.add}`); } else if (added.length) snack(added, b.dataset.add); });
const allBtn = (id, n) => `<button type="button" class="seeall" data-all="${id}">Zobacz całą gazetkę <b>${n}</b>${ic('chev', 2)}</button>`;
// (the whole leaflet in a sheet, by aisle in this shop's order; adding keeps it open)
const dm = d => d ? d.slice(8, 10) + '.' + d.slice(5, 7) : '';
// (when the leaflet runs: the most common last day, and the earliest start)
function leafDates(l) { if (!l || !l.length) return ''; const c = {}; l.forEach(o => c[o.until] = (c[o.until] || 0) + 1);
  const until = Object.keys(c).sort((a, b) => c[b] - c[a])[0], from = l.map(o => o.from).sort()[0];
  return from && from > new Date().toISOString().slice(0, 10) ? `od ${dm(from)} do ${dm(until)}` : `do ${dm(until)}`; }
// (the leaflets of all three shops: pick one to open)
function leafletsSheet() { loadShopPromos();
  const row = st => { const l = EP[st.id], best = l && l.length ? Math.max(...l.map(o => Math.round(offPct(o) * 100))) : 0;
    return `<button class="lrow" type="button" data-open="${st.id}" style="--sc:${st.color}" ${l && l.length ? '' : 'disabled'}><i></i><span class="ln"><b>${esc(st.name)}</b><small>${l === undefined ? 'Wczytuję…' : !l ? 'Nie udało się pobrać' : !l.length ? 'Brak promocji spożywczych' : `${l.length} ${plural(l.length, 'promocja', 'promocje', 'promocji')} · ${leafDates(l)}`}</small></span>${best ? `<span class="badge badge--promo">do −${best}%</span>` : ''}${ic('chev', 2)}</button>`; };
  const close = sheet(`<h3>Gazetki</h3><p class="sub">Promocje spożywcze i drogeryjne z gazetek sieci w tym tygodniu. Wybierz sklep, żeby przejrzeć całą listę po działach.</p>
    <div class="lrows">${MY().map(row).join('')}</div>`, sh => sh.querySelectorAll('[data-open]').forEach(b => b.onclick = () => leafletSheet(b.dataset.open)));
  if (MY().some(st => EP[st.id] === undefined)) setTimeout(() => { if ($('.sheet.show .lrows')) leafletsSheet(); }, 1500); }
function leafletSheet(id) { const l = rankLeaf(EP[id] || []), order = orderFor(id), by = {};
  for (const o of l) (by[o.cat] = by[o.cat] || []).push(o);
  const cats = order.filter(c => by[c]);
  sheet(`<div class="ltabs" role="tablist">${MY().map(st => `<button type="button" role="tab" data-tab="${st.id}" aria-selected="${st.id === id}" style="--sc:${st.color}"><i></i>${esc(st.name)}<small>${(EP[st.id] || []).length || ''}</small></button>`).join('')}</div>
    <h3>Gazetka ${esc(storeOf(id).name)}</h3><p class="sub">${l.length} ${plural(l.length, 'produkt', 'produkty', 'produktów')} ${leafDates(l)}. Dotknij, żeby dopisać do listy.</p>
    <div class="lcats">${cats.map(c => `<button type="button" class="chip chip--sm chip--tile" data-jump="${c}" style="--tile:var(--t-${c})">${esc(CAT_EMOJI[c] || '')} ${esc(CATS[c].name)} <small>${by[c].length}</small></button>`).join('')}</div>
    <label class="lsearch">${ic('search', 2)}<input type="search" placeholder="Szukaj w gazetce…" autocomplete="off" aria-label="Szukaj w gazetce"></label>
    <div class="leaf">${cats.map(c => `<section class="lg" data-cat="${c}"><div class="lh">${esc(CATS[c].name)}<span>${by[c].length}</span></div>${by[c].map(epRow).join('')}</section>`).join('')}<p class="wnone lnone" hidden>Nic takiego w tej gazetce.</p></div>`, sh => { wireAdds(sh, true);
    sh.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { if (b.dataset.tab !== id) leafletSheet(b.dataset.tab); });
    sh.querySelectorAll('[data-jump]').forEach(b => b.onclick = () => { const g = sh.querySelector(`.lg[data-cat="${b.dataset.jump}"]`); if (g) sh.scrollTo({ top: g.offsetTop - 8, behavior: 'smooth' }); });
    // (filter as you type; empty aisles fold away)
    const inp = sh.querySelector('.lsearch input'); inp.oninput = () => { const q = norm(inp.value); let any = 0;
      sh.querySelectorAll('.lg').forEach(g => { let n = 0; g.querySelectorAll('.ep').forEach(b => { const on = !q || norm(b.dataset.add).includes(q); b.hidden = !on; n += on; }); g.hidden = !n; any += n; });
      sh.querySelector('.lnone').hidden = !!any; }; }); }
const wireAll = root => root.querySelectorAll('[data-all]').forEach(b => b.onclick = () => leafletSheet(b.dataset.all));
// (under a list in progress: this shop's offers on grey, by aisle; the header and the aisle pills stick to the top,
//  a pill takes you to its aisle, "Doczytaj więcej" brings the next ones)
let shpShown = 14, shpStore = '';
function shpGroups(id, open) { const ranked = rankLeaf(EP[id] || []).filter(o => !open.some(i => offerFits(o.name, i.name) || norm(i.name) === norm(o.name)));
  const my = mine().slice(0, 30), mineFits = o => my.some(h => offerFits(o.name, h.name) && (!h.cat || h.cat === 'dom' || !o.cat || o.cat === h.cat)), forMe = ranked.filter(mineFits).slice(0, 6), rest = ranked.filter(o => !forMe.includes(o)), by = {};
  for (const o of rest) (by[o.cat] = by[o.cat] || []).push(o);
  return [...(forMe.length ? [{ id: 'mine', title: 'Dla Ciebie', emoji: '★', items: forMe }] : []), ...orderFor(id).filter(c => by[c]).map(c => ({ id: c, title: CATS[c].name, emoji: CAT_EMOJI[c], items: by[c] }))]; }
let coverOpen = false, coverRaf = 0;
function openCover() { const el = $('.cover'); if (!el) return; coverOpen = true; el.hidden = false; renderCover(true); requestAnimationFrame(() => el.classList.add('show')); document.documentElement.classList.add('locked'); }
function closeCover() { const el = $('.cover'); if (!el || !coverOpen) return; coverOpen = false; el.classList.remove('show'); document.documentElement.classList.remove('locked'); setTimeout(() => { if (!coverOpen) el.hidden = true; }, 420); }
function renderCover(top) { const body = $('.cv-body'); if (!body || !coverOpen) return; const y = top ? 0 : body.scrollTop;
  $('.cv-title').textContent = 'Gazetka ' + storeOf(store()).name; body.innerHTML = ''; renderShopPromos(body, openItems()); body.scrollTop = y; shpSpy(); }
function renderShopPromos(wrap, open) { const id = store(), l = EP[id]; loadShopPromos();
  if (l && !l.length) return;
  if (shpStore !== id) { shpStore = id; shpShown = 14; }
  const groups = l ? shpGroups(id, open) : [], total = groups.reduce((n, g) => n + g.items.length, 0);
  let left = shpShown; const shown = groups.map(g => { const take = Math.max(0, Math.min(g.items.length, left)); left -= take; return { ...g, show: g.items.slice(0, take) }; }).filter(g => g.show.length);
  wrap.insertAdjacentHTML('beforeend', `<section class="shp" id="shp"><div class="shs"><div class="c shh"><span class="badge badge--promo">%</span>Promocje w ${IN[id] || storeOf(id).name}<span class="n">${l ? total : ''}</span>${l ? `<button type="button" class="shall" data-all="${id}">Gazetka ${ic('chev', 2)}</button>` : ''}</div>
      ${groups.length ? `<div class="shpills" role="tablist">${groups.map(g => `<button type="button" role="tab" class="chip chip--sm" data-go="${g.id}" style="--tile:var(--t-${g.id === 'mine' ? 'warzywa' : g.id})">${esc(g.emoji || '')} ${esc(g.title)} <small>${g.items.length}</small></button>`).join('')}</div>` : ''}</div>
    ${l === undefined ? '<div class="epw"><div class="orbs small"><i></i><i></i><i></i></div>Szukam w gazetce…</div>' : l === null ? '<div class="epw">Nie udało się pobrać promocji.</div>'
      : shown.map(g => `<div class="shg" data-g="${g.id}"><div class="c shgh">${esc(g.title)}<span>${g.items.length}</span></div>${g.show.map(epRow).join('')}</div>`).join('')
        + (shpShown < total ? `<button type="button" class="btn btn--secondary btn--lg btn--block shmore">Doczytaj więcej <b>${Math.min(12, total - shpShown)}</b><small>z ${total - shpShown}</small></button>` : '')}
    <p class="note">Najpierw to, co zwykle kupujesz, potem działy w kolejności sklepu. Dotknij, żeby dopisać do listy.</p></section>`);
  const sec = wrap.querySelector('.shp'); wireAdds(sec, true); wireAll(sec);
  const more = sec.querySelector('.shmore'); if (more) more.onclick = () => { shpShown += 12; render(); };
  sec.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { const g = b.dataset.go;
    // (an aisle not loaded yet comes in first, then we go there)
    if (!sec.querySelector(`.shg[data-g="${g}"]`)) { let n = 0; for (const x of groups) { if (x.id === g) { shpShown = Math.max(shpShown, n + x.items.length + 4); break; } n += x.items.length; } render(); }
    const t = $(`#shp .shg[data-g="${g}"]`), bar = $('#shp .shs'), sc = $('.cv-body'); if (t && sc) { const y = t.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - (bar ? bar.offsetHeight : 0) + 1; sc.scrollTo({ top: y, behavior: Math.abs(y - sc.scrollTop) > 2500 ? 'auto' : 'smooth' }); } });   // (a long way: jump, a short one: glide)
  shpSpy(); }
// (the pill of the aisle you are looking at lights up)
let shpRaf = 0;
function shpSpy() { const sec = $('#shp'); if (!sec) return; const bar = sec.querySelector('.shs'), top = bar ? bar.getBoundingClientRect().bottom : 0;
  let cur = null; sec.querySelectorAll('.shg').forEach(g => { if (g.getBoundingClientRect().top <= top + 12) cur = g.dataset.g; });
  sec.classList.toggle('stuck', !!bar && bar.getBoundingClientRect().top <= 0.5 && sec.getBoundingClientRect().top < 0);
  sec.querySelectorAll('[data-go]').forEach(b => { const on = b.dataset.go === cur; if (on !== b.classList.contains('chip--on')) { b.classList.toggle('chip--on', on); b.setAttribute('aria-selected', on); if (on) b.scrollIntoView({ inline: 'nearest', block: 'nearest' }); } }); }

function renderEmpty(wrap) {
  const picks = picksForEmpty(), cur = store(), stores = [MY().find(s => s.id === cur), ...MY().filter(s => s.id !== cur)].filter(Boolean);
  const promoBlock = s => { const l = EP[s.id];
    const body = l === undefined ? `<div class="epw"><div class="orbs small"><i></i><i></i><i></i></div>Szukam w gazetce…</div>`
      : !l || !l.length ? `<div class="epw">${l === null ? 'Nie udało się pobrać promocji.' : 'W tym tygodniu brak promocji spożywczych.'}</div>`
      : rankLeaf(l).slice(0, 5).map(epRow).join('') + allBtn(s.id, l.length);
    return `<div class="eps" style="--sc:${s.color}"><div class="esh"><i></i>${esc(s.name)}</div>${body}</div>`; };
  wrap.insertAdjacentHTML('beforeend', `<div class="empty"><div class="c">
      <div class="eart" aria-hidden="true"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="58" class="ea-bg"/><path class="ea-ln" d="M30 50h60l-6 34a6 6 0 0 1-6 5H42a6 6 0 0 1-6-5z"/><path class="ea-ln" d="M46 50l10-18M74 50L64 32"/><path class="ea-ln ea-dash" d="M44 64h32M47 75h26"/><circle cx="90" cy="34" r="7" class="ea-dot"/></svg></div>
      <h2>Lista jest pusta</h2><p>Nie masz jeszcze żadnych produktów. Przytrzymaj zielony przycisk i powiedz, czego potrzebujesz.</p></div></div>
    <section class="sec ex"><div class="h"><div class="c">Może cię zainteresować</div></div><div class="c picks">${picks.map((p, i) => { const o = leafHit(p.name, p.cat); return `<button class="chip chip--sm chip--tile" type="button" data-add="${esc(p.name)}" data-cat="${esc(p.cat || '')}" style="--i:${i};--tile:var(--t-${p.cat || 'dom'})"><span class="e">${esc(emojiGuess(p.name) || p.emoji || CAT_EMOJI[p.cat] || '•')}</span>${esc(p.name)}${o && pct(o) ? ` <span class="badge badge--promo">${pct(o)}</span>` : ''}</button>`; }).join('')}</div></section>
    <section class="sec ex"><div class="h"><div class="c">Promocje w tym tygodniu</div></div>${stores.map(promoBlock).join('')}<p class="note">Z gazetek sieci (ding.pl). Dotknij, żeby dodać na listę.</p></section>`);
  wireAdds(wrap); wireAll(wrap); loadShopPromos(); }
function clearAllSheet() { const all = Object.values(C.items).filter(i => !i.deleted), n = all.length; if (!n) return;
  const close = sheet(`<div class="warn"><span class="wi">${ic('trash', 2)}</span><h3>Wyczyścić całą listę?</h3>
      <p>Usuniesz wszystkie ${n} ${plural(n, 'pozycję', 'pozycje', 'pozycji')}, także te jeszcze niekupione. Lista zniknie też u pozostałych osób, z którymi ją dzielisz.</p>
      <div class="wb"><button type="button" class="btn btn--soft btn--lg" data-a="keep">Zostaw</button><button type="button" class="btn btn--danger btn--lg" data-a="wipe">Wyczyść listę</button></div></div>`, sh => {
    sh.querySelector('[data-a=keep]').onclick = () => close();
    sh.querySelector('[data-a=wipe]').onclick = () => { all.forEach(i => put('items', { ...i, deleted: true }, true)); lit.clear(); vib(20); close(); render(); compareSoon();
      undoBar(`<b>Wyczyszczono:</b> ${n} ${plural(n, 'pozycja', 'pozycje', 'pozycji')}`, () => { all.forEach(i => { const cur = C.items[i.id]; if (cur) put('items', { ...cur, deleted: false }, true); }); render(); compareSoon(); toast('Lista wróciła'); }); };
    setTimeout(() => sh.querySelector('[data-a=keep]')?.focus(), 420); }); }
function renderChips() {
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
    const g = sh.querySelector('[data-go]'); if (g) g.onclick = () => { put('settings', { id: 'store', value: id }); PR = {}; prKey = ''; promosSoon(); close(); vib(6); }; }); }
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
function menuSheet() { const t = theme();
  const close = sheet(`<h3>Koszyk</h3><div class="list">
    <button data-a="order">${ic('grip')}Kolejność działów w sklepie</button>
    <button data-a="shops">${ic('bag')}Moje sklepy</button>
    <button data-a="words">${ic('book')}Słownik dyktowania</button>
    <button data-a="clear">${ic('check')}Usuń kupione z listy</button>
    ${Object.values(C.items).some(i => !i.deleted) ? `<button data-a="wipe" class="dz">${ic('trash')}Wyczyść całą listę</button>` : ''}
    <button data-a="theme">${ic('moon')}Motyw: ${t === 'dark' ? 'ciemny' : t === 'light' ? 'jasny' : 'jak w systemie'}</button>
    <button data-a="out">${ic('out')}Wyloguj to urządzenie</button></div><p class="hint">${aiOn ? 'Dyktowanie rozumie AI (Claude).' : 'AI wyłączone: dyktowanie dzieli prosty parser. Ustaw ANTHROPIC_API_KEY na serwerze, żeby rozumiało lepiej.'} Promocje z ding.pl.</p>`, sh => {
    sh.querySelector('[data-a=order]').onclick = () => { close(); setTimeout(orderSheet, 380); };
    sh.querySelector('[data-a=words]').onclick = () => { close(); setTimeout(wordsSheet, 380); };
    sh.querySelector('[data-a=shops]').onclick = () => { close(); setTimeout(storesSheet, 380); };
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
  // (white, centred and calm: the mark, a big heading, room for the code, round soft keys)
  app.innerHTML = `<div class="pin"><div class="pc">
    <div class="pmark">${LOGO}</div>
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
function renderStores() { const cur = store(), cs = MY().filter(x => CMP[x.id] && CMP[x.id].n), best = cs.sort((a, b) => CMP[b.id].save - CMP[a.id].save)[0];
  const key = myIds().join(',') + '|' + cur + '|' + (best ? best.id + CMP[best.id].save : ''); if (key === storesKey) return; storesKey = key;
  const el = $('#stbs'); el.innerHTML = MY().map(x => `<button class="chip stb${x.id === cur ? ' chip--on' : ''}" type="button" data-s="${x.id}" style="--sc:${x.color}" aria-pressed="${x.id === cur}"><span class="dot"></span>${esc(x.name)}${best && best.id === x.id && CMP[x.id].save > 0 ? '<span class="badge badge--promo badge--pill flag">najtaniej</span>' : ''}</button>`).join('') + `<button class="ibtn ibtn--secondary ibtn--lg addSt" type="button" aria-label="Moje sklepy">${ic('plus', 2)}</button>`;
  el.querySelector('.addSt').onclick = storesSheet;
  el.querySelectorAll('.stb').forEach(b => b.onclick = () => { if (b.dataset.s === store()) return; put('settings', { id: 'store', value: b.dataset.s }); PR = {}; prKey = ''; promosSoon(); vib(6); });
  const on = el.querySelector('.stb.chip--on'); if (on && el.scrollWidth > el.clientWidth) on.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  const edge = () => el.classList.toggle('more', el.scrollLeft + el.clientWidth < el.scrollWidth - 4); el.onscroll = edge; edge(); }
// (pick your shops; the family sees the same ones)
function storesSheet() { const mine = myIds(), all = [...mine.map(id => storeOf(id)), ...CAT.stores.filter(x => !mine.includes(x.id))];
  const close = sheet(`<h3>Moje sklepy</h3><p class="sub">Wybierz sieci, w których robisz zakupy. Ich gazetki trafią do promocji i porównania. Ustawienie jest wspólne dla całej rodziny.</p>
    <div class="slist">${all.map(x => `<label class="srow" style="--sc:${x.color}"><i></i><span>${esc(x.name)}</span><input type="checkbox" data-id="${x.id}" ${mine.includes(x.id) ? 'checked' : ''}><b class="switch" aria-hidden="true"></b></label>`).join('')}</div>
    <p class="hint">Gazetki pochodzą z ding.pl. Kolejność działów ustawisz osobno dla każdego sklepu.</p>`, sh => sh.querySelectorAll('[data-id]').forEach(cb => cb.onchange = () => {
      const now = [...sh.querySelectorAll('[data-id]:checked')].map(x => x.dataset.id);
      if (!now.length) { cb.checked = true; toast('Zostaw przynajmniej jeden sklep'); return; }
      const keep = myIds().filter(id => now.includes(id)), added = now.filter(id => !keep.includes(id));
      put('settings', { id: 'myStores', value: [...keep, ...added] }, true); PR = {}; prKey = ''; storesKey = ''; render(); promosSoon(); compareSoon(); loadShopPromos(); vib(6); })); }
let mounted = false;   // (the cover's own scroll drives the aisle pills)
function mount() {
  $('#app').innerHTML = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="graphite" x="-5%" y="-200%" width="110%" height="500%"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6"/></filter></svg>
    <section class="hero"><div class="c"><div class="hrow"><h1 id="h1"></h1><div class="acts">
      <button class="btn btn--secondary gzb" id="leafBtn" type="button">${ic('paper', 1.9)}<span>Gazetki</span></button>
      <button class="ibtn ibtn--secondary" id="menuBtn" type="button" aria-label="Menu">${ic('more', 2.6)}</button></div></div><p id="lead"></p></div></section>
    <nav class="stores" aria-label="Sklep"><div class="c"><div class="stbs" id="stbs"></div></div></nav>
    <main id="list"></main>
    <div class="dock"><div class="pblur" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="chips" id="chips" hidden></div>
      <div class="c bar"><button class="field opener" id="f" type="button" aria-haspopup="dialog">${ic('plus', 2)}<span>Dopisz produkt…</span></button>
      <button class="ibtn ibtn--primary ibtn--xl mic" id="mic" type="button" aria-label="Przytrzymaj i mów">${ic('mic', 2)}</button></div></div>
    <div class="hear" aria-live="polite"><small><span class="wave"><b></b><b></b><b></b><b></b></span><span class="orbs small"><i></i><i></i><i></i></span><span class="lbl">Słucham</span></small><p class="ph"></p></div>
    <div class="cover" role="dialog" aria-modal="true" aria-label="Gazetka" hidden><div class="cv-top"><button class="ibtn ibtn--secondary" type="button" id="cvClose" aria-label="Zamknij">${ic('x', 2)}</button><span class="cv-title">Gazetka</span><button class="btn btn--primary btn--sm" type="button" id="cvDone">Wróć do listy</button></div><div class="cv-body"></div></div><div class="adder" role="dialog" aria-modal="true" aria-label="Dopisz produkty" hidden><div class="ad-in"><div class="ad-top"><span class="grab"></span><h3>Dopisz</h3><span class="ad-msg" role="status"></span><button class="btn btn--primary btn--sm ad-done" type="button">Gotowe</button></div><div class="ad-list" id="adList"></div><form class="ad-bar" id="adF"><input class="input" id="adQ" placeholder="Wpisz produkt, np. mleko 2 litry" autocomplete="off" autocapitalize="sentences" enterkeyhint="send" aria-label="Produkt"><button class="ibtn ibtn--primary ibtn--lg ad-send" type="submit" aria-label="Dodaj">${ic('up', 2.2)}</button></form></div></div><div class="toast" role="status"></div><div class="snack" role="status" aria-live="polite"><span class="st"></span><button type="button" data-s="edit">Zmień</button><button type="button" class="sx" data-s="del">${ic('trash', 1.8)}</button></div><div class="scrim"></div><div class="sheet" role="dialog" aria-modal="true"></div>`;
  addEventListener('scroll', () => $('.top') && $('.top').classList.toggle('lined', scrollY > 6), { passive: true });
  $('#menuBtn').onclick = menuSheet; $('#leafBtn').onclick = leafletsSheet;
  $('#f').onclick = () => openAdder();
  const aq = $('#adQ'); aq.oninput = () => { if (!aq.value.trim()) editFrom = null; adderRender(); };
  $('#adF').onsubmit = e => { e.preventDefault(); submitText(aq.value); };
  $('.ad-done').onclick = closeAdder; $('#cvClose').onclick = closeCover; $('#cvDone').onclick = closeCover;
  $('.cv-body').addEventListener('scroll', () => { cancelAnimationFrame(coverRaf); coverRaf = requestAnimationFrame(shpSpy); }, { passive: true }); $('.adder').addEventListener('click', e => { if (e.target === e.currentTarget) closeAdder(); });
  $('#adList').addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); });   // (keep the keyboard up while tapping suggestions)
  addEventListener('keydown', e => { if (e.key === 'Escape' && adderOpen) closeAdder(); else if (e.key === 'Escape' && coverOpen && !$('.sheet.show')) closeCover(); });
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
  renderStores();
  $('#menuBtn').classList.toggle('dot', !online);
  const day = ['w niedzielę', 'w poniedziałek', 'we wtorek', 'w środę', 'w czwartek', 'w piątek', 'w sobotę'][new Date().getDay()];
  const h1 = !all.length ? `Co kupujemy<br><mark>${day}?</mark>` : n ? `Do kupienia<br><mark>${n} ${plural(n, 'rzecz', 'rzeczy', 'rzeczy')}</mark>` : 'Wszystko<br><mark>w koszyku</mark>';
  if (h1 !== heroKey) { heroKey = h1; $('#h1').innerHTML = h1; }
  $('#lead').textContent = !all.length ? 'Przytrzymaj zielony przycisk i mów. Ułożymy listę tak, jak idziesz przez sklep.' : n ? `Ułożone po kolei, jak idziesz przez ${THRU[s.id] || s.name}.` : 'Lista na dziś odhaczona.';
  renderList(); renderChips(); if (coverOpen) renderCover(); }

render(); if (token) { sync(); promosSoon(); compareSoon(); }
if ('serviceWorker' in navigator && !/^(localhost|127\.)/.test(location.hostname)) navigator.serviceWorker.register('/sw.js').catch(() => { });
window.KOSZYK = { get C() { return C; }, addItems, addText, sync, get PR() { return PR; } };
