// Gazetki Lidla prosto od Lidla, bez AI. Listę aktualnych gazetek daje serwer gazetek grupy Schwarz (ten sam, z którego korzysta
// lidl.pl), a każda gazetka ma PDF z prawdziwym tekstem. Z układu strony składamy produkty: nazwa (ok. 10 pt), opis pod nią (ok. 8 pt),
// duża cena (od 28 pt) i nagłówek z datami (ok. 19 pt, „Od poniedziałku, 12.10 do 17.10”). Ding.pl ma z Lidla prawie same alkohole.
// Źródło nieoficjalne: gdy się zmieni albo padnie, zostaje to, co daje ding.pl.
const OVERVIEW = 'https://endpoints.leaflets.schwarz/v4/overview?client_locale=' + encodeURIComponent('lidl/pl-PL');
const TTL = 6 * 3600 * 1000;
// (which leaflets: the weekly "Gazetka" with food; "Katalog" is clothes and tools, the alcohol catalogues come from ding.pl already,
//  and "Rewolucja cenowa" is laid out differently, the parser makes nonsense of it)
const WANT = f => f.pdfUrl && /^gazetka/i.test(f.name || '') && (f.fileSize || 0) < 80e6;
const { catFor } = require('./local-parse');
const parsed = new Map();   // flyer id → offers (a leaflet does not change, so it is read once)
let list = null;

const LETTERS = 'A-Za-z0-9ĄĆĘŁŃÓŚŹŻąćęłńóśźżÀÁÂÄÇÈÉÊËÌÍÎÏÑÒÓÔÖÙÚÛÜàáâäçèéêëìíîïñòôöùúûüß';
const CLEAN = new RegExp(`^[${LETTERS}\\s.,;:%&'’"„”()\\[\\]\\-–+/*®™°×=!?#]+$`);
// (lines that are part of the design, not of a product's name)
const DECOR = /^(aktywuj kupon|i zeskanuj|zeskanuj|przy zakupie|drugi,? tańszy|produkt$|taniej|to wychodzi|za sztukę|miksuj|dowolnie|gratis|za grosz|więcej na lidl|produkty (prezentowane|są)|sprawdziliśmy|super ?cena|nowość|tylko w|od (pon|wt|śr|czw|pt|sob|niedz)|do (pon|wt|śr|czw|pt|sob|niedz)|cena za|ryneczek|lidla$|w lidlu|r \d+\/\d+|(dwu|trój|cztero|sześcio|ośmio)(sztuk|pak)|\d+\s*x\s*\d)/i;
const DATE = /^(od|tylko|do)\b.*\d{1,2}\.\d{2}/i;
const PRICE = /^(\d{1,4})[,.](\d{2})\s*\*?$/;
const num = s => +String(s).replace(',', '.');

// "Od poniedziałku, 12.10 do 17.10", "Tylko w poniedziałek, 12.10", "Od czwartku, 15.10" → [from, until] as YYYY-MM-DD (until may be null)
function headerDates(t, year, startMonth) {
  const ds = [...t.matchAll(/(\d{1,2})\.(\d{2})\b/g)].map(m => { const mo = +m[2], y = mo < startMonth - 6 ? year + 1 : year; return `${y}-${String(mo).padStart(2, '0')}-${m[1].padStart(2, '0')}`; });
  if (!ds.length) return null;
  if (/^tylko/i.test(t)) return [ds[0], ds[0]];
  return [ds[0], /\bdo\b/i.test(t) && ds[1] ? ds[1] : null]; }

// brand lines come in capitals ("PILOS", "VITASIA JAPANESE STYLE"); the name goes first, the brand after it, the way the list says it
const isBrand = t => /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(t) && t === t.toUpperCase() && t.replace(/[^A-Za-zĄĆĘŁŃÓŚŹŻ]/g, '').length >= 2;
const title = t => t.toLowerCase().replace(/(^|[\s&.-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
function nameOf(lines) {
  const brand = [], rest = []; lines.forEach(t => (isBrand(t) ? brand : rest).push(t));
  const n = (rest.length ? rest.join(' ') + (brand.length ? ' ' + title(brand.join(' ')) : '') : title(brand.join(' '))).replace(/\*+/g, '').replace(/\s+([,.])/g, '$1').replace(/\s+/g, ' ').trim();
  return n.charAt(0).toUpperCase() + n.slice(1); }
// (Lidl names a beer by its brand only, "Lech", "Harnaś Jasne Pełne"; the list says "piwo")
const beer = (name, desc) => !/piw/i.test(name) && /\b(pusz|but)\./i.test(desc) && /^(330|500|568) ?ml\b/i.test(desc) && !/wino|wódk|whisk|likier|gin\b|rum\b|prosecco|cydr|grzaniec|nalewk|brandy|koniak|napój|woda|sok/i.test(name)
  && (catFor(name) === 'alkohol' || /\b(jasne|ciemne|lager|pils|ipa|apa|stout|porter|pszeniczne|niepasteryzowan\w*|blanc|weizen|radler|\d+([,.]\d)?%)\b/i.test(name)) ? 'Piwo ' + name : name;

// one page: text items { t, s (size), x, y (from the bottom), w } → offers
function parsePage(items, flyer) {
  const year = +String(flyer.offerStartDate || flyer.startDate).slice(0, 4), startMonth = +String(flyer.offerStartDate || flyer.startDate).slice(5, 7);
  const its = items.filter(i => i.t && CLEAN.test(i.t));
  const heads = its.filter(i => i.s >= 14 && i.s < 28 && /^(od|tylko|do)\b/i.test(i.t) && /\d{1,2}\.\d{2}/.test(i.t)).map(h => ({ ...h, d: headerDates(h.t, year, startMonth) })).filter(h => h.d);
  const prices = its.filter(i => i.s >= 28 && PRICE.test(i.t));
  const names = its.filter(i => i.s >= 9.3 && i.s <= 11.4 && /\p{L}{3}/u.test(i.t) && !DECOR.test(i.t) && !PRICE.test(i.t)).sort((a, b) => b.y - a.y || a.x - b.x);
  const details = its.filter(i => i.s >= 5.5 && i.s < 9.3 && !DECOR.test(i.t));
  const badges = its.filter(i => !prices.includes(i) && !heads.includes(i) && i.s > 11.4 && !DATE.test(i.t));
  const smallDates = its.filter(i => i.s >= 6 && i.s < 14 && DATE.test(i.t));
  // (name lines one under another in the same column make a block; the small lines right under it are its description)
  const blocks = [];
  for (const n of names) { const b = blocks.find(b => Math.abs(b.x - n.x) <= 4 && b.bottom - n.y > 0 && b.bottom - n.y <= n.s * 1.7 && !b.details.length);
    if (b) { b.lines.push(n.t); b.bottom = n.y; } else blocks.push({ x: n.x, top: n.y + n.s, bottom: n.y, lines: [n.t], details: [] }); }
  for (const b of blocks) { let y = b.bottom;
    for (const d of details.filter(d => Math.abs(d.x - b.x) <= 4 && d.y < b.bottom).sort((a, c) => c.y - a.y)) { if (y - d.y > 16) break; b.details.push(d.t); y = d.y; }
    b.low = y; }
  // (each block and each price belongs under the nearest date header above it; a header splits the page into sections)
  const headOf = p => { let best = null, bd = Infinity; for (const h of heads) { if (h.y < p.y) continue; const out = Math.max(0, h.x - p.x - 40, p.x - (h.x + (h.w || 200)) - 40), d = (h.y - p.y) + out * 2; if (d < bd) { bd = d; best = h; } } return best; };
  blocks.forEach(b => { b.head = headOf({ x: b.x, y: b.top }); }); prices.forEach(p => { p.head = headOf(p); });
  // (what each side tells: the price before the discount printed small by the big one ("34,99*"), and the amounts in the description)
  const PRE = /(?:przed obniżką|poza promocją|cena regularna)[^:]*:\s*(1\s?(?:kg|l)\s?=\s?)?(\d+,\d{2})/i;
  for (const p of prices) { p.v = num(p.t.replace('*', '')); const s = its.filter(i => i.s >= 9 && i.s < 24 && PRICE.test(i.t) && i.x > p.x - 10 && i.x - p.x < 180 && i.y - p.y > -20 && i.y - p.y < 70 && num(i.t.replace('*', '')) > p.v).sort((a, c) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(c.x - p.x, c.y - p.y))[0];
    p.old = s ? num(s.t.replace('*', '')) : null; }
  for (const b of blocks) { const text = b.details.join(' '), said = text.match(PRE); b.nums = (text.match(/\d+,\d{2}/g) || []).map(num); b.said = said ? num(said[2]) : null;
    b.perKilo = /^1\s?(kg|l)\b/i.test(b.details[0] || '');
    // (the size and the price per kilo give the price itself: "500 g" and "1 kg = 19,98" make 9,99)
    const size = (b.details[0] || '').match(/^(\d+(?:[,.]\d+)?)\s?(g|kg|ml|l)\b(?!\s*[,=])/i), unit = text.match(/\b(1\s?kg|100\s?g|1\s?l|100\s?ml)\s?=\s?(\d+,\d{2})/i);
    if (size && unit && !b.perKilo) { const amt = num(size[1]) * (/^(kg|l)$/i.test(size[2]) ? 1000 : 1), per = /^100/.test(unit[1]) ? 100 : 1000; b.expect = num(unit[2]) * amt / per; } }
  // (pairs: first those whose small old price is written in the description too; they show which way prices sit on this page,
  //  under or over their names; then the rest by distance, the usual way first. A price never above the price "before")
  const geo = (b, p) => { const dy = p.y > b.top ? p.y - b.top : p.y < b.low ? b.low - p.y : 0; return { d: Math.hypot(Math.abs(p.x - b.x) * 1.2, dy), dir: p.y > b.top ? 1 : p.y < b.low ? -1 : 0 }; };
  const used = new Set(), out = [], take = [];
  const fitsUnit = (b, p) => b.expect && Math.abs(p.v - b.expect) <= Math.max(0.03, b.expect * 0.02);
  const anchored = []; for (const b of blocks) for (const p of prices) if (b.head === p.head && ((p.old && b.nums.includes(p.old)) || fitsUnit(b, p))) anchored.push([geo(b, p).d, b, p]);
  anchored.sort((a, c) => a[0] - c[0]).forEach(([d, b, p]) => { if (d <= 300 && !used.has(b) && !used.has(p)) { used.add(b); used.add(p); take.push([b, p]); } });
  const way = take.reduce((n, [b, p]) => n + geo(b, p).dir, 0);
  const rest = []; for (const b of blocks) for (const p of prices) { if (used.has(b) || used.has(p) || b.head !== p.head) continue;
    const g = geo(b, p); let d = g.d + (way && g.dir && Math.sign(way) !== g.dir ? 120 : 0);
    if (b.said && p.v >= b.said) d += 400; if (p.old && b.nums.length && !b.nums.includes(p.old)) d += 150; rest.push([d, b, p]); }
  rest.sort((a, c) => a[0] - c[0]).forEach(([d, b, p]) => { if (d <= 260 && !used.has(b) && !used.has(p)) { used.add(b); used.add(p); take.push([b, p]); } });
  for (const [b, p] of take) {
    const price = p.v, text = b.details.join(' ');
    // (the price before the discount: said in the description ("1 kg = 13,49" only for things sold by the kilo), or printed by the big one)
    const said = text.match(PRE), old = said ? (!said[1] || b.perKilo ? num(said[2]) : null) : p.old;
    const oldPrice = old && old > price && old < price * 4 ? old : null;
    const near = x => Math.hypot(x.x - p.x, x.y - p.y) < 150 || Math.hypot(x.x - b.x, x.y - b.low) < 120;
    const extra = badges.filter(near).map(x => x.t).join(' ');
    const app = /lidl plus|aktywuj kupon/i.test(text + ' ' + extra) ? ' Tylko z aplikacją.' : '';
    // (dates: the small "Od pon., 12.10" closest to the price, with the "do sob., 17.10" right under it, beats the header of the section)
    const od = smallDates.filter(x => /^(od|tylko)/i.test(x.t) && near(x)).sort((a, c) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(c.x - p.x, c.y - p.y))[0];
    const until = od && !/\bdo\b/i.test(od.t) ? smallDates.find(x => /^do\b/i.test(x.t) && Math.abs(x.x - od.x) < 8 && od.y - x.y > 0 && od.y - x.y < 20) : null;
    const dates = (od && headerDates(od.t + (until ? ' ' + until.t : ''), year, startMonth)) || (b.head ? b.head.d : null);
    const from = dates ? dates[0] : String(flyer.offerStartDate).slice(0, 10), to = dates && dates[1] ? dates[1] : String(flyer.offerEndDate).slice(0, 10);
    out.push({ name: beer(nameOf(b.lines), text), price, oldPrice, description: (text + ' ' + extra.replace(/(\d)\s*\+\s*(\d)/g, '$1+$2')).trim() + app, duration: { begin: from, end: to } }); }
  return out; }

async function readPdf(url, flyer) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 60000);
  let data; try { const res = await fetch(url, { signal: ctl.signal }); if (!res.ok) throw new Error('HTTP ' + res.status); data = new Uint8Array(await res.arrayBuffer()); } finally { clearTimeout(to); }
  const doc = await getDocument({ data, disableFontFace: true, isEvalSupported: false, verbosity: 0 }).promise, out = [];
  // (the cover repeats offers from inside, squeezed together, so it is skipped)
  try { for (let p = doc.numPages > 2 ? 2 : 1; p <= doc.numPages; p++) { const page = await doc.getPage(p), tc = await page.getTextContent();
      const items = tc.items.map(i => ({ t: i.str.trim(), s: Math.hypot(i.transform[2], i.transform[3]), x: i.transform[4], y: i.transform[5], w: i.width }));
      out.push(...parsePage(items, flyer).map(o => ({ ...o, page: p }))); page.cleanup(); } }
  finally { await doc.destroy(); }
  return out; }

// all offers from Lidl's current food leaflets (ding.pl shape: name, price, oldPrice, description, duration)
async function lidlOffers() {
  if (!list || Date.now() - list.t > TTL) {
    const res = await fetch(OVERVIEW, { headers: { 'User-Agent': 'Mozilla/5.0 (koszyk; lista zakupów)' } }); if (!res.ok) throw new Error('overview HTTP ' + res.status);
    const j = await res.json(), fl = []; for (const c of j.categories || []) for (const s of c.subcategories || []) fl.push(...(s.flyers || []));
    list = { t: Date.now(), v: fl.filter(WANT) }; }
  const out = [];
  for (const f of list.v) {   // (one after another: a leaflet is tens of MB)
    if (!parsed.has(f.id)) { try { const t0 = Date.now(), v = await readPdf(f.pdfUrl, f); parsed.set(f.id, v); console.log(`[koszyk] Lidl „${f.name} ${f.title || ''}”: ${v.length} ofert (${Date.now() - t0} ms)`); }
      catch (e) { console.warn('[koszyk] Lidl PDF', f.name, e.message); continue; } }
    out.push(...parsed.get(f.id)); }
  for (const id of parsed.keys()) if (!list.v.some(f => f.id === id)) parsed.delete(id);   // (old leaflets go)
  return out; }

module.exports = { lidlOffers, parsePage, headerDates, nameOf };
