// Oferty z gazetek z blix.pl: lista aktualnych gazetek sieci i produkty z każdej (nazwa, cena, zdjęcie, daty, strona).
// Blix rozpisuje gazetkę prawie w całości (Biedronka: kilkaset produktów zamiast kilkudziesięciu z ding.pl), ale bez ceny sprzed
// obniżki i bez warunków; te dokłada ding.pl, gdy ma ten sam produkt. Źródło nieoficjalne (strona www): gdy się zmieni, zostaje ding.pl.
const BASE = 'https://blix.pl/sklep/';
const SLUG = { centrum: 'delikatesy-centrum', leclerc: 'leclerc' };   // (blix names a few shops differently)
const HEAD = { 'User-Agent': 'Mozilla/5.0 (koszyk; lista zakupów)', 'Accept-Language': 'pl-PL' };
const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
const day = s => { const m = String(s).match(/([a-z]+)\s+(\d{1,2}),\s*(\d{4})/i); return m && MONTHS[m[1].toLowerCase()] ? `${m[3]}-${String(MONTHS[m[1].toLowerCase()]).padStart(2, '0')}-${m[2].padStart(2, '0')}` : null; };
const attrs = s => { const a = {}; for (const m of s.matchAll(/data-([a-z-]+)="([^"]*)"/g)) a[m[1]] = m[2]; return a; };
const unesc = s => String(s).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');

async function page(url) {
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 20000);
  try { const res = await fetch(url, { headers: HEAD, signal: ctl.signal }); if (!res.ok) throw new Error('HTTP ' + res.status); return await res.text(); } finally { clearTimeout(to); } }

// "… od piątku 09.10 do poniedziałku 12.10" in a link's title (some leaflets are listed only as links); the year from today
function titleDates(t, today) {
  const y0 = +today.slice(0, 4), m0 = +today.slice(5, 7), iso = (d, m) => { const y = m < m0 - 6 ? y0 + 1 : m > m0 + 6 ? y0 - 1 : y0; return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`; };
  const f = t.match(/\bod\s+(?:\p{L}+\s+)?(\d{1,2})\.(\d{2})/u), u = t.match(/\bdo\s+(?:\p{L}+\s+)?(\d{1,2})\.(\d{2})/u);
  return f ? [iso(f[1], f[2]), u ? iso(u[1], u[2]) : null] : null; }

// the shop's leaflets on now or within a few days: [{ id, name, from, until }] (newest first, at most 12)
function leafletsIn(html, slug, today, soon) {
  const out = new Map(), old = new Date(Date.parse(today) - 21 * 864e5).toISOString().slice(0, 10);
  for (const m of html.matchAll(/<div class="leaflet section-n__item"([^>]*)>/g)) { const a = attrs(m[1]), from = day(a['date-start']), until = day(a['date-end']);
    if (a['leaflet-id'] && a['brand-slug'] === slug && from && until && until >= today && from <= soon) out.set(a['leaflet-id'], { id: a['leaflet-id'], name: unesc(a['leaflet-name'] || ''), from, until }); }
  // (a leaflet without an end date counts while it is under three weeks old; its products carry their own dates anyway)
  for (const m of html.matchAll(/href="https:\/\/blix\.pl\/sklep\/([a-z-]+)\/gazetka\/(\d+)\/[^"]*"[^>]*title="([^"]*)"/g)) { if (m[1] !== slug || out.has(m[2])) continue;
    const t = unesc(m[3]).replace(/^.*gazetka promocyjna /, ''), d = titleDates(t, today);
    if (d && d[0] <= soon && (d[1] ? d[1] >= today : d[0] >= old)) out.set(m[2], { id: m[2], name: t, from: d[0], until: d[1] }); }
  return [...out.values()].sort((a, b) => b.id - a.id).slice(0, 12); }

// the products of one leaflet page, in the ding.pl shape (name, price, duration) plus image and page
function offersIn(html, today, soon = '9999') {
  const out = [];
  for (const m of html.matchAll(/<div class="offer section-n__item[^"]*"([^>]*)>([\s\S]*?)<span class="offer__name">/g)) {
    const a = attrs(m[1]), price = +a.price / 100, from = day(a['date-start']), until = day(a['date-end']);
    if (!a.name || !price || !from || !until || until < today || from > soon) continue;
    const img = (m[2].match(/data-src="(https:\/\/imgproxy\.blix\.pl\/product_occurrence[^"]+)"/) || [])[1];
    out.push({ name: unesc(a.name).trim(), price, oldPrice: null, description: '', duration: { begin: from, end: until }, image: img ? unesc(img) : null, page: +a['page-number'] || null, leaflet: a['leaflet-id'] }); }
  return out; }

const cache = new Map(), TTL = 6 * 3600 * 1000;
async function blixOffers(storeId) {
  const hit = cache.get(storeId); if (hit && Date.now() - hit.t < TTL) return hit.v;
  const slug = SLUG[storeId] || storeId, today = new Date().toISOString().slice(0, 10), soon = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  const list = leafletsIn(await page(BASE + slug + '/'), slug, today, soon), out = [];
  for (const l of list) {   // (one after another, gently: a leaflet page is a few MB)
    try { out.push(...offersIn(await page(`${BASE}${slug}/gazetka/${l.id}/`), today, soon)); } catch (e) { console.warn('[koszyk] blix', slug, l.id, e.message); } }
  console.log(`[koszyk] blix ${slug}: ${list.length} gazetek, ${out.length} ofert`);
  cache.set(storeId, { t: Date.now(), v: out }); return out; }

module.exports = { blixOffers, leafletsIn, offersIn, day };
