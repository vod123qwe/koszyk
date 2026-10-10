// Promocje z agregatora gazetek ding.pl (nieoficjalne API GraphQL, to samo, którego używa ich strona). Dla każdego produktu z listy
// pytamy o aktualne oferty w wybranej sieci. Wyniki trzymamy w pamięci 6 godzin, zapytania idą po kilka naraz, żeby nie obciążać serwisu.
// To źródło może się kiedyś zmienić; gdy padnie, apka po prostu nie pokazuje promocji.
const catalog = require('../public/catalog.json');
const { catFor, emojiFor, isDescriptor } = require('./local-parse');
const { promoCond, titleFrom } = require('./promo-cond');
// (what exactly and on what terms: the exact product ("Chleb orkiszowy z ziarnami"), size, "przy zakupie 2 szt.", "z kartą", several kinds)
const terms = (d, name) => { const c = promoCond(d), t = String(d || '').replace(/\*\*/g, '').trim(), title = titleFrom(name, d);
  if (title && / lub /.test(title) && !c.cond.includes('różne rodzaje')) c.cond.push('różne rodzaje');
  return { cond: c.cond, size: c.size, unit: c.unit, multi: c.multi, title, detail: t && t.length <= 90 ? t : null }; };
const ENDPOINT = 'https://api.ding.pl/graphql';
const TTL = 6 * 3600 * 1000, cache = new Map();

const QUERY = `query P($phrase: String!, $ids: [ID!]) { multiSearch(phrase: $phrase, page: 1, perPage: 12, limit: 12, order: DESC, orderBy: "created_at", filters: { contractorIds: $ids }) {
  products { items { id name price oldPrice description contractor { id name } duration { begin end } } } } }`;

// the word to search by: the first meaningful word of the product's name ("Mleko 2%" → "mleko")
const term = name => String(name).toLowerCase().replace(/[^a-ząćęłńóśźż\s-]/g, ' ').split(/\s+/).find(w => w.length >= 3) || '';
const stem = w => w.slice(0, Math.max(4, Math.min(6, w.length - 1)));

async function search(phrase, ids) {
  const key = phrase + '|' + ids.join(','), hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL) return hit.v;
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(ENDPOINT, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Origin: 'https://ding.pl', Referer: 'https://ding.pl/', 'User-Agent': 'Mozilla/5.0 (koszyk; lista zakupów)' },
      body: JSON.stringify({ query: QUERY, variables: { phrase, ids: ids.map(String) } }) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json(), items = (j.data && j.data.multiSearch && j.data.multiSearch.products && j.data.multiSearch.products.items) || [];
    const today = new Date().toISOString().slice(0, 10), soon = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
    const v = items.filter(p => p.price && p.duration && String(p.duration.end).slice(0, 10) >= today && String(p.duration.begin).slice(0, 10) <= soon)
      .map(p => ({ name: p.name, price: p.price, oldPrice: p.oldPrice || null, from: String(p.duration.begin).slice(0, 10), until: String(p.duration.end).slice(0, 10), shop: p.contractor && p.contractor.name, ...terms(p.description, p.name) }));
    cache.set(key, { t: Date.now(), v }); return v;
  } catch (e) { console.warn('[koszyk] promo', phrase, e.message); cache.set(key, { t: Date.now() - TTL + 600000, v: [] }); return []; }
  finally { clearTimeout(to); }
}

// the whole current leaflet of a shop ("*" lists everything ding has for it), groceries and drugstore only; cached like the searches
const LQ = page => `query L($ids: [ID!]) { multiSearch(phrase: "*", page: ${page}, perPage: 100, limit: 100, order: DESC, orderBy: "created_at", filters: { contractorIds: $ids }) {
  products { items { name price oldPrice description duration { begin end } } } } }`;
const leafCache = new Map();
async function leaflet(storeId) {
  const store = catalog.stores.find(s => s.id === storeId); if (!store || !store.ding.length) return [];
  const hit = leafCache.get(storeId); if (hit && Date.now() - hit.t < TTL) return hit.v;
  const all = [];
  try { for (let page = 1; page <= 8; page++) {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 10000);
      try { const res = await fetch(ENDPOINT, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Origin: 'https://ding.pl', Referer: 'https://ding.pl/', 'User-Agent': 'Mozilla/5.0 (koszyk; lista zakupów)' },
          body: JSON.stringify({ query: LQ(page), variables: { ids: store.ding.map(String) } }) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const j = await res.json(), items = (j.data && j.data.multiSearch && j.data.multiSearch.products && j.data.multiSearch.products.items) || [];
        all.push(...items); if (items.length < 100) break; } finally { clearTimeout(to); } }
  } catch (e) { console.warn('[koszyk] leaflet', storeId, e.message); if (!all.length) { leafCache.set(storeId, { t: Date.now() - TTL + 600000, v: hit ? hit.v : [] }); return hit ? hit.v : []; } }
  const today = new Date().toISOString().slice(0, 10), soon = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10), seen = new Set();
  const v = all.filter(p => p.price && p.duration && String(p.duration.end).slice(0, 10) >= today && String(p.duration.begin).slice(0, 10) <= soon)
    .map(p => ({ name: p.name, price: p.price, oldPrice: p.oldPrice || null, from: String(p.duration.begin).slice(0, 10), until: String(p.duration.end).slice(0, 10), cat: catFor(p.name), emoji: emojiFor(p.name), ...terms(p.description, p.name) }))
    .filter(p => p.cat !== 'dom' && !seen.has(p.name + p.price) && seen.add(p.name + p.price));
  leafCache.set(storeId, { t: Date.now(), v }); return v;
}
const wordStarts = (name, st) => (' ' + name.toLowerCase()).includes(' ' + st);
// (a short word must be the word itself, give or take one letter: "sok" finds "Sok", "Soki", not "Sokołów"; "ser" not "Serek")
const L = 'a-ząćęłńóśźż';
const fits = (name, t) => { const words = String(name).split(/\s+/), ok = (w, i) => i === 0 || w[0] === w[0].toLowerCase();
  if (t.length <= 3) { const re = new RegExp('^' + t + '[' + L + ']?$', 'i'); return words.some((w, i) => ok(w, i) && re.test(w.replace(/[^\p{L}]/gu, ''))); }
  const st = stem(t); return words.some((w, i) => ok(w, i) && w.toLowerCase().startsWith(st)); };
// (the other words said decide the order: "sok tymbark" puts Tymbark first)
const extra = name => String(name).toLowerCase().replace(/[^a-ząćęłńóśźż\s-]/g, ' ').split(/\s+/).filter(w => w.length >= 3).slice(1).map(stem);

// names: product names to check; returns { [name]: [offers] } for the store (best offers first, only ones whose name fits)
async function promosFor(storeId, names) {
  const store = catalog.stores.find(s => s.id === storeId); if (!store || !store.ding.length) return {};
  const uniq = [...new Set(names.map(n => String(n)).filter(Boolean))].slice(0, 40), out = {}, leaf = await leaflet(storeId);
  for (let i = 0; i < uniq.length; i += 4) {
    await Promise.all(uniq.slice(i, i + 4).map(async name => { const t = term(name); if (!t) return;
      const seen = new Set(), more = extra(name), offers = [...leaf.filter(o => fits(o.name, t)), ...(await search(t, store.ding)).filter(o => fits(o.name, t))].filter(o => !seen.has(o.name + o.price) && seen.add(o.name + o.price));
      const bonus = o => more.some(m => wordStarts(o.name, m)) ? 1 : 0;
      const brands = String(name).split(/\s+/).slice(1).filter(w => w.length >= 3 && !isDescriptor(w)).map(w => stem(w.toLowerCase().replace(/[^\p{L}]/gu, '')));
      if (brands.length) offers.splice(0, offers.length, ...offers.filter(o => brands.some(b => wordStarts(o.name + ' ' + (o.title || '') + ' ' + (o.detail || ''), b))));
      // (same aisle only: salt for the kitchen is not bath salt, "ser żółty" is not "serek")
      const ic = catFor(name), sameAisle = o => { const oc = o.cat || catFor(o.name); return ic === 'dom' || oc === 'dom' || ic === oc; };
      offers.splice(0, offers.length, ...offers.filter(sameAisle));
      if (offers.length) out[name] = offers.sort((a, b) => (bonus(b) - bonus(a)) || ((b.oldPrice ? 1 - b.price / b.oldPrice : 0) - (a.oldPrice ? 1 - a.price / a.oldPrice : 0)) || a.price - b.price).slice(0, 3); })); }
  return out;
}

module.exports = { promosFor, leaflet };
