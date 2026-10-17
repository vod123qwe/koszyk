// Promocje z agregatora gazetek ding.pl (nieoficjalne API GraphQL, to samo, którego używa ich strona). Dla każdego produktu z listy
// pytamy o aktualne oferty w wybranej sieci. Wyniki trzymamy w pamięci 6 godzin, zapytania idą po kilka naraz, żeby nie obciążać serwisu.
// To źródło może się kiedyś zmienić; gdy padnie, apka po prostu nie pokazuje promocji.
const catalog = require('../public/catalog.json');
const { catFor, emojiFor } = require('./local-parse');
const { promoCond, titleFrom } = require('./promo-cond');
const { lidlOffers } = require('./lidl');
const { blixOffers } = require('./blix');
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
const term = name => { const ws = String(name).toLowerCase().replace(/[^a-ząćęłńóśźż\s-]/g, ' ').split(/\s+/).filter(w => w.length >= 3); return ws.find((w, i) => i < ws.length - 1 ? !/(sk[aiey]|ck[aiey]|ow[aey]|n[aeyi]|ży|ła|ły|ne|[oó][lł]?ty)$/.test(w) : true) || ws[0] || ''; };
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
  items { name image price oldPrice description duration { begin end } } } }`;
// (one offer, many sources: the same price and nearly the same words make one product; "Masło ekstra Pilos 83%" is "Masło ekstra 83% Pilos")
const words = n => new Set(flatName(n).split(' ').filter(w => w.length >= 3 || /\d/.test(w)).map(w => w.slice(0, 5)));
function merge(lists) {
  const out = [], byCent = new Map();
  for (const o of lists.flat()) { if (!o || !o.price || !o.name) continue;
    const c = Math.round(o.price * 100), ws = words(o.name), same = (byCent.get(c) || []).find(x => { let n = 0; for (const w of ws) if (x.ws.has(w)) n++; return n && n / Math.min(ws.size, x.ws.size) >= 0.75; });
    if (same) { const t = same.o; if (!t.oldPrice && o.oldPrice) t.oldPrice = o.oldPrice; if (!t.description && o.description) t.description = o.description; if (!t.image && o.image) t.image = o.image; continue; }
    const t = { ...o }; out.push(t); if (!byCent.has(c)) byCent.set(c, []); byCent.get(c).push({ o: t, ws }); }
  return out; }
const leafCache = new Map(), leafBusy = new Map();
// (one load at a time per shop: the start-up warm-up and the first visitor would otherwise both fetch Lidl's PDF)
const leaflet = storeId => leafBusy.get(storeId) || (() => { const p = loadLeaflet(storeId).finally(() => leafBusy.delete(storeId)); leafBusy.set(storeId, p); return p; })();
async function loadLeaflet(storeId) {
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
  } catch (e) { console.warn('[koszyk] leaflet', storeId, e.message); }
  // (more sources, best first: Lidl straight from its own leaflet PDF (ding.pl has almost only alcohol from it), then ding.pl with
  //  its prices "before" and terms, then blix.pl with nearly the whole leaflet and photos)
  let own = [], bx = [];
  if (storeId === 'lidl') try { own = await lidlOffers(); } catch (e) { console.warn('[koszyk] Lidl', e.message); }
  try { bx = await blixOffers(storeId); } catch (e) { console.warn('[koszyk] blix', storeId, e.message); }
  const today = new Date().toISOString().slice(0, 10), soon = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  // (0,01 zł is "the third one for a grosz", not the product's price)
  const live = p => p.price >= 0.1 && p.duration && String(p.duration.end).slice(0, 10) >= today && String(p.duration.begin).slice(0, 10) <= soon;
  const merged = merge([own.filter(live), all.filter(live), bx.filter(live)]);
  if (!merged.length) { leafCache.set(storeId, { t: Date.now() - TTL + 600000, v: hit ? hit.v : [] }); return hit ? hit.v : []; }
  const v = merged.map(p => ({ name: p.name, price: p.price, oldPrice: p.oldPrice && p.oldPrice > p.price ? p.oldPrice : null, from: String(p.duration.begin).slice(0, 10), until: String(p.duration.end).slice(0, 10),
      cat: catFor(p.name), emoji: emojiFor(p.name), image: p.image || null, ...terms(p.description, p.name) }))
    .filter(p => p.cat !== 'dom');
  leafCache.set(storeId, { t: Date.now(), v }); return v;
}
// (letters without Polish marks, so "maslo" finds "Masło" and "zolty ser" finds "Ser żółty"; a hyphen splits words: "Coca-Cola")
const PL = 'ąćęłńóśźż', fold = s => String(s).toLowerCase().replace(/[ąćęłńóśźż]/g, c => 'acelnoszz'[PL.indexOf(c)]);
const wordStarts = (name, st) => (' ' + fold(name).replace(/[-–/,.()]/g, ' ')).includes(' ' + fold(st));
// does this name say that product? One of its words must be the product's word in any form ("kurczaka", "pomidorami"), but
//  not a word made from it ("pomidorowy", "czekoladowe", "śmietankowy"), not an ingredient ("z mozzarellą", "w czekoladzie",
//  "o smaku jabłka", "do spaghetti", "dla kota"), not the second word of another product ("Ser salami", "Kotlet schabowy"),
//  not a brand inside the name (a capital after the first word), unless the brand is the word itself ("Coca-Cola" for "cola").
//  A short word must be the word itself, give or take one letter: "sok" finds "Soki", not "Sokołów"; "ser" not "Serek".
const ADJ_END = /(owy|owa|owe|owym|owej|owych|owego|ny|na|ne|nym|nej|nych|nego|ski|ska|skie|skim|cki|cka|ckie)$/;
const INSTR = w => /(ą|em|ami|mi)$/.test(String(w).replace(/[^\p{L}]/gu, ''));
// (the word the offer is about: its first word, past the adjectives in front ("Polski", "Świeży", "Puszysty") and capital-letter brands)
const LEAD = new Set('polski polska polskie swiezy swieza swieze wszystkie wybrane mlode mlody mloda mrozone mrozony mrozona wloskie wloski wloska dziki dzika dzikie bio eko nowy nowa nowe duzy duza duze maly mala male wiejski wiejska wiejskie domowy domowa domowe chrupiace chrupiacy kruche kruchy delikatny delikatna puszysty puszysta puszyste mega super wielkopolski wielkopolska gorski gorska tradycyjny tradycyjna klasyczny klasyczna naturalny naturalna swojski swojska slaski slaska krakowski francuski francuska hiszpanski grecki grecka wedzony wedzona pieczony pieczona zielone zielony czerwone czerwony bialy biale czarny czarne protein proteinowy proteinowa premium extra ekstra lub i oraz miks mix zestaw'.split(' '));
// (cuts of meat name what they are cut from: "Filet z piersi kurczaka" is chicken, "Parówki z szynki" are not ham)
const CUT = /^(filet|piers|cwiart|mies|udk|uda|udo|nog|podud|skrzyd|poledwic|tusz|porcj|kostk|stek|kawal|plat|mostek|golonk|gulasz|ligaw|rostbef|antrykot|karkow|lopatk|schab|zeberk)/;
// (a word that looks like the product but is another one: sweets are not sugar, olives not olive oil, a salad not lettuce)
const OTHER = { cukier: ['cukierk'], oliwa: ['oliwk'], smietana: ['smietank'], olej: ['olejek', 'olejk'], makaron: ['makaronik'], salata: ['salatk'], czekolada: ['czekoladk'], cebula: ['cebulk'], sol: ['solon', 'solo'], kawa: ['kawal'] };
// (a comma or a dash starts the name over: "Crema e Gusto, kawa mielona Lavazza" is coffee)
const headAt = (raw, i) => { let s = 0; for (let k = 0; k < i; k++) if (/,$/.test(raw[k])) s = k + 1; else if (/^[–-]$/.test(raw[k])) s = k + 1;
  for (let j = s; j < raw.length; j++) { const w = raw[j].replace(/[^\p{L}\d]/gu, ''); if (w.length <= 2 || /\d/.test(w) || w === w.toUpperCase() || LEAD.has(fold(w))) continue; return j; } return -1; };
const fits = (name, t, item = '') => { const raw = String(name).split(/\s+/), tf = fold(t), st = stem(tf), it = fold(item);
  for (let i = 0; i < raw.length; i++) { const w0 = raw[i].replace(/[^\p{L}\d-]/gu, ''); if (!w0) continue;
    const capital = i > 0 && w0[0] !== w0[0].toLowerCase();
    for (const part of w0.split('-').filter(Boolean)) { const p = fold(part);
      const brand = capital && tf.length >= 4 && p === tf;
      const hit = capital ? brand : tf.length <= 3 ? new RegExp('^' + tf + '[a-z]?$').test(p) : p.startsWith(st) && !(p.length - st.length >= 3 && ADJ_END.test(p) && !ADJ_END.test(tf));
      if (!hit || (OTHER[tf] || []).some(o => p.startsWith(o))) continue;
      const prev = (raw[i - 1] || '').toLowerCase().replace(/[^\p{L}]/gu, '');
      const zBefore = raw.slice(Math.max(0, i - 4), i).some(x => /^(z|ze)$/i.test(x));
      if (/^(w|we|do|dla|o|na|od|po|pod|bez|smaku)$/.test(prev) || (zBefore && (INSTR(part) || INSTR(prev)))) continue;
      // (said later in a name about something else: "Ser salami", "Parówki z szynki", "Herbatka … jabłko", "Woda … 20% soku")
      const h = headAt(raw, i);
      if (!brand && h >= 0 && h < i) { const hw = fold(raw[h].replace(/[^\p{L}]/gu, '')); if (!CUT.test(hw) && !it.includes(hw.slice(0, 4))) continue; }
      return true; } }
  return false; };
// (words that mean the same thing on a shelf: "nogi z kurczaka" is sold as "podudzie", "udka", "ćwiartka"; "pierś" as "filet")
const SYN = [['noga', 'nogi', 'udko', 'udka', 'udziec', 'podudzie', 'podudzia', 'ćwiartka', 'ćwiartki', 'pałki'], ['pierś', 'piersi', 'filet', 'filety'],
  ['ziemniaki', 'kartofle', 'ziemniak'], ['ogórek', 'ogórki'], ['cukier', 'cukru'], ['jajka', 'jaja'], ['parówki', 'parówka'], ['bułki', 'bułka', 'kajzerki', 'kajzerka'],
  ['schab', 'schabowy', 'schabowe'], ['karkówka', 'karczek'], ['mielone', 'mielona', 'mielony'], ['twaróg', 'twarożek'], ['makaron', 'spaghetti', 'penne', 'świderki']];
const alts = w => { w = String(w).toLowerCase(); const g = SYN.find(g => g.some(x => stem(fold(x)) === stem(fold(w)))); return g ? [...new Set([w, ...g])] : [w]; };
// (an offer is told by its name, and by the exact product named in its description: "Kurczak Rzeźnik" is "Polski kurczak - mięso z nogi")
// (a name of two or more words found whole in the offer is that offer: "red bull", "ptasie mleczko"; where the offer's name
//  starts, or as a brand in capitals, never further on: "Precle oblane czekoladą mleczną" are not "czekolada mleczna")
const phrase = (o, item) => { if (!item || !/\s/.test(item.trim())) return false;
  const raw = String(o.name).split(/\s+/), ws = raw.map(w => fold(w).replace(/[^a-z0-9]+/g, '')), want = fold(item).replace(/[^a-z0-9]+/g, ' ').trim().split(' ');
  for (let i = 0; i + want.length <= ws.length; i++) if (want.every((w, k) => ws[i + k] === w)) { const h = headAt(raw, i), first = raw[i].replace(/[^\p{L}]/gu, '');
    if (i <= Math.max(0, h) || (i > 0 && first && first[0] !== first[0].toLowerCase())) return true; }
  return false; };
const fitsOffer = (o, t, item) => phrase(o, item) || alts(t).some(a => fits(o.name, a, item) || (o.title && fits(o.title, a, item)));
// (every other word said must be in the offer too: "mleko owsiane" is not cow's milk, "ser feta" not gouda, "woda gazowana" not still;
//  except glue, sizes and freshness; a few words have shelf synonyms: "extra" = "ekstra", a yellow cheese is gouda, edam, salami…)
const SKIP_Q = /^(z|ze|w|we|bez|od|o|do|na|dla|pod|i|lub|oraz|swiezy|swieze|swieza|duzy|duze|duza|maly|male|mala|polski|polskie|polska|puszce|puszka|puszek|sloiku|sloik|butelce|butelka|kartonie|opakowanie|paczka|mrozona|mrozony|mrozone|mrozonki)$/;
const QUAL = { extra: ['ekstra'], ekstra: ['extra'], caly: ['tuszka'], cala: ['tuszka'], zolty: ['gouda', 'edam', 'salami', 'krolewski', 'podlaski', 'tylzycki', 'cheddar', 'emmentaler', 'maasdam', 'morski', 'radamer', 'zamojski', 'gazdowski', 'zolty'] };
const qstem = w => w.length <= 3 ? (w.length === 3 ? w.slice(0, 2) : w) : w.slice(0, Math.max(3, Math.min(6, w.length - 1)));
const quals = (name, t) => { const tf = fold(t), out = [];
  for (const w of fold(name).replace(/[^a-z0-9%,\s-]/g, ' ').split(/[\s-]+/)) if (w && w !== tf && !SKIP_Q.test(w) && !/\d/.test(w) && w.length >= 2 && !(stem(w) === stem(tf))) out.push(w);
  return out; };
// (a short word stays short: "psa" is "psy", "psów", never "pstrąg")
// (a synonym that is the product itself does not count: in "filet z piersi" the "piersi" must be there, a fish fillet is not it)
const qualOk = (o, q, t) => { const hay = o.name + ' ' + (o.title || '') + ' ' + (o.detail || ''), toks = fold(hay).replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
  const syn = alts(q).map(fold).filter(v => !alts(t).map(fold).includes(v));
  return [q, ...(QUAL[q] || []), ...syn].some(v => v.length <= 3 ? toks.some(x => x.startsWith(v.slice(0, 2)) && x.length <= v.length + 2) : wordStarts(hay, qstem(v))); };
// (what people say for short or tenderly: "mielone" is minced meat, "masełko" butter, "energetyk" an energy drink)
const SAY = [[/^mielon[aey]?(go)?\b/, 'Mięso mielone'], [/^maselk[oa]\b/, 'Masło'], [/^jajecz?k[ai]\b/, 'Jajka'], [/^bulecz?k[ai]\b/, 'Bułki'], [/^energetyk\w*/, 'Napój energetyczny'], [/^chlebek\b/, 'Chleb']];
const sayAs = name => { const f = fold(name).trim().replace(/-/g, ' '); for (const [re, to] of SAY) if (re.test(f)) return (to + ' ' + f.replace(re, '')).trim(); return String(name).replace(/-/g, ' '); };
// (the other words said decide the order: "sok tymbark" puts Tymbark first)
const extra = name => String(name).toLowerCase().replace(/[^a-ząćęłńóśźż\s-]/g, ' ').split(/\s+/).filter(w => w.length >= 3).slice(1).map(stem);

// the offers that fit one product, best first, at most 3 (no network: the leaflet and the search results are given)
function pick(name, leaf, found = []) {
  // (a product added straight from the leaflet carries the offer's own name: that offer is the answer)
  const exact = leaf.filter(o => [o.title, o.name].some(x => x && flatName(x) === flatName(name)));
  if (exact.length) return exact;
  const said = sayAs(name), t = term(said); if (!t) return [];
  const seen = new Set(), more = extra(said);
  let offers = [...leaf, ...found].filter(o => fitsOffer(o, t, said)).filter(o => !seen.has(o.name + o.price) && seen.add(o.name + o.price));
  const bonus = o => more.some(m => wordStarts(o.name + ' ' + (o.title || ''), m)) ? 1 : 0;
  // (plain "mleko" is not chocolate milk: a flavour only when one was asked for)
  const qs = quals(said, t); offers = offers.filter(o => qs.length ? qs.every(q => qualOk(o, q, t)) : !/\bo smaku\b/i.test(o.name));
  // (same aisle only: salt for the kitchen is not salt for the dishwasher, raw pork is not sliced ham, food is never a gadget)
  const ic = catFor(said); offers = offers.filter(o => { const oc = o.cat || catFor(o.name); return ic === 'dom' || (oc !== 'dom' && oc === ic); });
  return offers.sort((a, b) => (bonus(b) - bonus(a)) || ((b.oldPrice ? 1 - b.price / b.oldPrice : 0) - (a.oldPrice ? 1 - a.price / a.oldPrice : 0)) || a.price - b.price).slice(0, 3); }

// names: product names to check; returns { [name]: [offers] } for the store (best offers first, only ones whose name fits)
async function promosFor(storeId, names) {
  const store = catalog.stores.find(s => s.id === storeId); if (!store || !store.ding.length) return {};
  const uniq = [...new Set(names.map(n => String(n)).filter(Boolean))].slice(0, 40), out = {}, leaf = await leaflet(storeId);
  for (let i = 0; i < uniq.length; i += 4) {
    await Promise.all(uniq.slice(i, i + 4).map(async name => {
      const t = term(sayAs(name)), found = t && !leaf.some(o => [o.title, o.name].some(x => x && flatName(x) === flatName(name))) ? await search(t, store.ding) : [];
      const r = pick(name, leaf, found); if (r.length) out[name] = r; })); }
  return out;
}

module.exports = { promosFor, leaflet, pick };
