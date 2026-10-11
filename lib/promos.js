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
// (the word to search by: the first noun, skipping a leading adjective — "Polski kurczak" → "kurczak", "Świeży filet" → "filet")
const term = name => { const ws = String(name).toLowerCase().replace(/[^a-ząćęłńóśźż\s-]/g, ' ').split(/\s+/).filter(w => w.length >= 3); return ws.find((w, i) => i < ws.length - 1 ? !/(sk[aiey]|ck[aiey]|ow[aey]|n[aeyi]|ży|ła|ły|ne)$/.test(w) : true) || ws[0] || ''; };
const flatName = s => String(s || '').toLowerCase().replace(/[^a-ząćęłńóśźż0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
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

// the whole current leaflet of a shop: every product ding has marked in the chain's active leaflets, also the ones starting
// in a day or two (a search for "*" missed those: on a Sunday Lidl showed only its alcohol catalogue); groceries and drugstore only
const LQ = page => `query L($f: LeafletPageModuleListFilters) { products(page: ${page}, limit: 100, filters: $f) {
  items { name price oldPrice description duration { begin end } } } }`;
const leafCache = new Map();
async function leaflet(storeId) {
  const store = catalog.stores.find(s => s.id === storeId); if (!store || !store.ding.length) return [];
  const hit = leafCache.get(storeId); if (hit && Date.now() - hit.t < TTL) return hit.v;
  const all = [];
  try { for (let page = 1; page <= 8; page++) {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 10000);
      try { const res = await fetch(ENDPOINT, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Origin: 'https://ding.pl', Referer: 'https://ding.pl/', 'User-Agent': 'Mozilla/5.0 (koszyk; lista zakupów)' },
          body: JSON.stringify({ query: LQ(page), variables: { f: { contractorIds: store.ding.map(String), activeOnly: true, withFuture: true } } }) });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const j = await res.json(); if (j.errors && !j.data) throw new Error(j.errors[0].message);
        const items = (j.data && j.data.products && j.data.products.items) || [];
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
// (words that mean the same thing on a shelf: "nogi z kurczaka" is sold as "podudzie", "udka", "ćwiartka"; "pierś" as "filet")
const SYN = [['noga', 'nogi', 'udko', 'udka', 'udziec', 'podudzie', 'podudzia', 'ćwiartka', 'ćwiartki', 'pałki'], ['pierś', 'piersi', 'filet', 'filety'],
  ['ziemniaki', 'kartofle', 'ziemniak'], ['ogórek', 'ogórki'], ['cukier', 'cukru'], ['jajka', 'jaja'], ['parówki', 'parówka'], ['bułki', 'bułka', 'kajzerki', 'kajzerka'],
  ['schab', 'schabowy', 'schabowe'], ['karkówka', 'karczek'], ['mielone', 'mielona', 'mielony'], ['twaróg', 'twarożek'], ['makaron', 'spaghetti', 'penne', 'świderki']];
const alts = w => { w = String(w).toLowerCase(); const g = SYN.find(g => g.some(x => stem(x) === stem(w))); return g ? [...new Set([w, ...g])] : [w]; };
// (an offer is told by its name, and by the exact product named in its description: "Kurczak Rzeźnik" is "Polski kurczak - mięso z nogi")
const fitsOffer = (o, t) => alts(t).some(a => fits(o.name, a) || (o.title && fits(o.title, a)));
// (the other words said decide the order: "sok tymbark" puts Tymbark first)
const extra = name => String(name).toLowerCase().replace(/[^a-ząćęłńóśźż\s-]/g, ' ').split(/\s+/).filter(w => w.length >= 3).slice(1).map(stem);

// names: product names to check; returns { [name]: [offers] } for the store (best offers first, only ones whose name fits)
async function promosFor(storeId, names) {
  const store = catalog.stores.find(s => s.id === storeId); if (!store || !store.ding.length) return {};
  const uniq = [...new Set(names.map(n => String(n)).filter(Boolean))].slice(0, 40), out = {}, leaf = await leaflet(storeId);
  for (let i = 0; i < uniq.length; i += 4) {
    await Promise.all(uniq.slice(i, i + 4).map(async name => {
      // (a product added straight from the leaflet carries the offer's own name: that offer is the answer)
      const exact = leaf.filter(o => [o.title, o.name].some(x => x && flatName(x) === flatName(name)));
      if (exact.length) { out[name] = exact; return; }
      const t = term(name); if (!t) return;
      const seen = new Set(), more = extra(name), offers = [...leaf.filter(o => fitsOffer(o, t)), ...(await search(t, store.ding)).filter(o => fitsOffer(o, t))].filter(o => !seen.has(o.name + o.price) && seen.add(o.name + o.price));
      // (found only through the description: then every other word said must be there too, "mięso mielone" is not "mięso z nogi")
      const rest = String(name).toLowerCase().split(/\s+/).slice(1).filter(w => w.replace(/[^\p{L}]/gu, '').length >= 3).map(w => alts(w.replace(/[^\p{L}]/gu, '')).map(stem));
      offers.splice(0, offers.length, ...offers.filter(o => alts(t).some(x => fits(o.name, x)) || rest.every(r => r.some(v => wordStarts(o.name + ' ' + (o.title || ''), v)))));
      const bonus = o => more.some(m => wordStarts(o.name + ' ' + (o.title || ''), m)) ? 1 : 0;
      const brands = String(name).split(/\s+/).slice(1).filter(w => w.length >= 3 && !isDescriptor(w)).map(w => alts(w.replace(/[^\p{L}]/gu, '')).map(stem));
      if (brands.length) offers.splice(0, offers.length, ...offers.filter(o => brands.some(b => b.some(v => wordStarts(o.name + ' ' + (o.title || '') + ' ' + (o.detail || ''), v)))));
      // (same aisle only: salt for the kitchen is not bath salt, "ser żółty" is not "serek")
      const ic = catFor(name), sameAisle = o => { const oc = o.cat || catFor(o.name); return ic === 'dom' || oc === 'dom' || ic === oc; };
      offers.splice(0, offers.length, ...offers.filter(sameAisle));
      if (offers.length) out[name] = offers.sort((a, b) => (bonus(b) - bonus(a)) || ((b.oldPrice ? 1 - b.price / b.oldPrice : 0) - (a.oldPrice ? 1 - a.price / a.oldPrice : 0)) || a.price - b.price).slice(0, 3); })); }
  return out;
}

module.exports = { promosFor, leaflet };
