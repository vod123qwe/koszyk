// Promocje z agregatora gazetek ding.pl (nieoficjalne API GraphQL, to samo, którego używa ich strona). Dla każdego produktu z listy
// pytamy o aktualne oferty w wybranej sieci. Wyniki trzymamy w pamięci 6 godzin, zapytania idą po kilka naraz, żeby nie obciążać serwisu.
// To źródło może się kiedyś zmienić; gdy padnie, apka po prostu nie pokazuje promocji.
const catalog = require('../public/catalog.json');
const ENDPOINT = 'https://api.ding.pl/graphql';
const TTL = 6 * 3600 * 1000, cache = new Map();

const QUERY = `query P($phrase: String!, $ids: [ID!]) { multiSearch(phrase: $phrase, page: 1, perPage: 12, limit: 12, order: DESC, orderBy: "created_at", filters: { contractorIds: $ids }) {
  products { items { id name price oldPrice contractor { id name } duration { begin end } } } } }`;

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
      .map(p => ({ name: p.name, price: p.price, oldPrice: p.oldPrice || null, from: String(p.duration.begin).slice(0, 10), until: String(p.duration.end).slice(0, 10), shop: p.contractor && p.contractor.name }));
    cache.set(key, { t: Date.now(), v }); return v;
  } catch (e) { console.warn('[koszyk] promo', phrase, e.message); cache.set(key, { t: Date.now() - TTL + 600000, v: [] }); return []; }
  finally { clearTimeout(to); }
}

// names: product names to check; returns { [name]: [offers] } for the store (best offers first, only ones whose name fits)
async function promosFor(storeId, names) {
  const store = catalog.stores.find(s => s.id === storeId); if (!store || !store.ding.length) return {};
  const uniq = [...new Set(names.map(n => String(n)).filter(Boolean))].slice(0, 30), out = {};
  for (let i = 0; i < uniq.length; i += 4) {
    await Promise.all(uniq.slice(i, i + 4).map(async name => { const t = term(name); if (!t) return;
      const offers = (await search(t, store.ding)).filter(o => o.name.toLowerCase().includes(stem(t)));
      if (offers.length) out[name] = offers.sort((a, b) => ((b.oldPrice ? 1 - b.price / b.oldPrice : 0) - (a.oldPrice ? 1 - a.price / a.oldPrice : 0)) || a.price - b.price).slice(0, 3); })); }
  return out;
}

module.exports = { promosFor };
