// Prosty parser bez AI: dzieli dyktowany tekst na produkty, wyciąga ilość i jednostkę, przypisuje kategorię po słowach kluczowych.
// Działa zawsze (bez klucza API); AI robi to lepiej i wtedy ten parser jest tylko zapasem.
const catalog = require('../public/catalog.json');

const NUM_WORDS = {
  'pół': 0.5, 'pol': 0.5, 'półtora': 1.5, 'poltora': 1.5,
  'jeden': 1, 'jedna': 1, 'jedno': 1, 'jedną': 1, 'dwa': 2, 'dwie': 2, 'trzy': 3, 'cztery': 4, 'pięć': 5, 'piec': 5, 'pięc': 5,
  'sześć': 6, 'szesc': 6, 'siedem': 7, 'osiem': 8, 'dziewięć': 9, 'dziewiec': 9, 'dziesięć': 10, 'dziesiec': 10,
  'jedenaście': 11, 'dwanaście': 12, 'tuzin': 12, 'piętnaście': 15, 'dwadzieścia': 20, 'trzydzieści': 30,
  'dwóch': 2, 'dwoch': 2, 'trzech': 3, 'czterech': 4, 'pięciu': 5, 'sześciu': 6, 'półtorej': 1.5, 'poltorej': 1.5, 'jedną': 1, 'parę': 2, 'kilka': 3,
};
const UNITS = [
  [/^(kg|kilo|kilogram\w*)$/, 'kg'], [/^(dag|deko|dekagram\w*)$/, 'dag'], [/^(g|gram\w*)$/, 'g'],
  [/^(l|litr\w*)$/, 'l'], [/^(ml|mililitr\w*)$/, 'ml'], [/^(szt|sztuk\w*)$/, 'szt'],
  [/^(opakowa\w*|paczk\w*|paczek)$/, 'op'], [/^(puszk\w*|puszek)$/, 'puszki'], [/^(butel\w*)$/, 'butelki'], [/^(słoik\w*|sloik\w*)$/, 'słoiki'],
  [/^(karton\w*)$/, 'kartony'], [/^(zgrzewk\w*|zgrzewek)$/, 'zgrzewki'], [/^(bochen\w*|bochnk\w*)$/, 'bochenki'], [/^(kostk\w*|kostek)$/, 'kostki'], [/^(główk\w*|glowk\w*)$/, 'główki'], [/^(pęczk\w*|pęczek)$/, 'pęczki'],
];
const FILLER = /^(i|oraz|a|też|tez|jeszcze|potem|no|eee|yyy|kup|kupić|kupic|weź|wez|trzeba|potrzebuję|potrzebuje|proszę|prosze|może|moze|coś|cos|z|ze|do|na)$/;

function bestIn(text) { const n = ' ' + text.toLowerCase() + ' '; let best = null, len = 0;
  for (const [cat, words] of Object.entries(catalog.keywords)) for (const w of words) { if (n.includes(w.toLowerCase()) && w.length > len) { best = cat; len = w.length; } }
  return { best, len }; }
// (the whole name first for set phrases like "płyn do naczyń"; then the head noun decides: "kawa ziarnista" is coffee, not grain)
function catFor(name) { const whole = bestIn(name), head = bestIn(name.split(/\s+/)[0]);
  if (whole.best && whole.len > (head.len || 0) + 3 && /\s/.test(Object.values(catalog.keywords).flat().find(w => name.toLowerCase().includes(w.toLowerCase()) && w.length === whole.len) || '')) return whole.best;
  return head.best || whole.best || 'dom'; }
const isKeywordStart = tok => { const t = tok.toLowerCase(); return Object.values(catalog.keywords).some(ws => ws.some(w => { w = w.toLowerCase(); return w.includes(' ') ? w.split(' ')[0].length >= 3 && t === w.split(' ')[0] : w.length >= 3 && t.startsWith(w); })); };
const exactKeyword = tok => { const t = tok.toLowerCase(); return Object.values(catalog.keywords).some(ws => ws.some(w => w.toLowerCase() === t)) || Object.values(GEN).includes(t); };
const isBrand = tok => (catalog.brands || []).some(b => tok.toLowerCase().startsWith(b));
const numOf = tok => { const t = tok.toLowerCase().replace(',', '.'); if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t); return NUM_WORDS[t] ?? null; };
const unitOf = tok => { const t = tok.toLowerCase().replace(/\.$/, ''); for (const [re, u] of UNITS) if (re.test(t)) return u; return null; };
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const ADJ = /(ist[aeyi]|n[aeyi]|ow[aeyi]|sk[aeiy]|ck[aeiy]|ego|ej|ym|cz[aey]|t[aey]|l[aey]|w[aey])$/i;   // (przymiotniki: "kawa ziarnista", "mleko owsiane")
// (po liczebniku mówi się w dopełniaczu: "dwa kilo ziemniaków" → "Ziemniaki"; kilka częstych form, resztę naprawia AI)
const GEN = { 'ziemniaków': 'ziemniaki', 'jajek': 'jajka', 'jabłek': 'jabłka', 'bułek': 'bułki', 'pomidorów': 'pomidory', 'ogórków': 'ogórki', 'bananów': 'banany', 'cebul': 'cebula', 'sera': 'ser',
  'makaronu': 'makaron', 'ryżu': 'ryż', 'chleba': 'chleb', 'soku': 'sok', 'soków': 'soki', 'piwa': 'piwo', 'wina': 'wino', 'wody': 'woda', 'kawy': 'kawa', 'herbaty': 'herbata', 'kaszy': 'kasza', 'oleju': 'olej',
  'płatków': 'płatki', 'chipsów': 'chipsy', 'sosu': 'sos', 'sosów': 'sosy', 'cebuli': 'cebula', 'marchwi': 'marchew', 'papryki': 'papryka', 'papryk': 'papryki', 'śmietany': 'śmietana', 'kefiru': 'kefir', 'kefirów': 'kefiry',
  'twarogu': 'twaróg', 'szynki': 'szynka', 'kiełbasy': 'kiełbasa', 'mięsa': 'mięso', 'kurczaka': 'kurczak', 'ryby': 'ryba', 'soli': 'sól', 'pieprzu': 'pieprz', 'koncentratu': 'koncentrat', 'jogurtu': 'jogurt',
  'mlek': 'mleka', 'kabanosów': 'kabanosy', 'pieczarek': 'pieczarki', 'truskawek': 'truskawki', 'gruszek': 'gruszki', 'śliwek': 'śliwki', 'brzoskwiń': 'brzoskwinie', 'mandarynek': 'mandarynki', 'pomarańczy': 'pomarańcze', 'ogórka': 'ogórek',
  'miodu': 'miód', 'dżemu': 'dżem', 'chusteczek': 'chusteczki', 'ręczników': 'ręczniki', 'worków': 'worki',
  'mąki': 'mąka', 'cukru': 'cukier', 'masła': 'masło', 'mleka': 'mleko', 'piw': 'piwo', 'jogurtów': 'jogurty', 'serków': 'serki', 'parówek': 'parówki', 'cytryn': 'cytryny', 'marchewek': 'marchewki', 'żółtego': 'żółty', 'zoltego': 'żółty' };
// ("1 kostka", "3 kostki", "5 kostek")
const UNIT_FORMS = { kostki: ['kostka', 'kostki', 'kostek'], 'słoiki': ['słoik', 'słoiki', 'słoików'], kartony: ['karton', 'kartony', 'kartonów'], zgrzewki: ['zgrzewka', 'zgrzewki', 'zgrzewek'], puszki: ['puszka', 'puszki', 'puszek'], butelki: ['butelka', 'butelki', 'butelek'], bochenki: ['bochenek', 'bochenki', 'bochenków'], 'główki': ['główka', 'główki', 'główek'], 'pęczki': ['pęczek', 'pęczki', 'pęczków'] };
const unitFor = (q, u) => { const f = UNIT_FORMS[u]; if (!f || q == null) return u; if (q === 1 || q % 1) return q === 1 ? f[0] : f[1]; const t = q % 10, h = q % 100; return t >= 2 && t <= 4 && (h < 12 || h > 14) ? f[1] : f[2]; };
// (after an amount the noun is in the genitive: "tuńczyka" → "tuńczyk" when the shorter form is a known product)
const nominative = (words, counted) => words.map((w, i) => GEN[w.toLowerCase()] || (counted && i === 0 && /[au]$/i.test(w) && exactKeyword(w.slice(0, -1)) ? w.slice(0, -1) : w));

// one chunk ("2 kilo ziemniaków") → item; a chunk without separators may hold several products: a new number or a new known product starts the next one
function chunkItems(chunk) {
  const toks = chunk.split(/\s+/).filter(Boolean), out = [];
  let cur = null;
  // (a bare amount after the product belongs to it: "mleko dwa litry")
  const flush = () => { if (cur && cur.words.length) out.push(cur); else if (cur && cur.qty != null && out.length && out[out.length - 1].qty == null) Object.assign(out[out.length - 1], { qty: cur.qty, unit: cur.unit }); cur = null; };
  for (const tok of toks) {
    const clean = tok.replace(/[.!?]+$/, '');
    if (FILLER.test(clean.toLowerCase()) && !(cur && cur.words.length && /^(z|ze|do|na)$/.test(clean.toLowerCase()))) { if (cur && cur.words.length && /^(i|oraz|a)$/.test(clean.toLowerCase())) flush(); continue; }
    const n = numOf(clean);
    if (n !== null) { flush(); cur = { qty: n, unit: null, words: [] }; continue; }
    const u = unitOf(clean);
    if (u && cur && !cur.words.length) { cur.unit = u; continue; }
    if (u) { flush(); cur = { qty: 1, unit: u, words: [] }; continue; }   // ("kilogram jabłek", "litr mleka": the unit alone means one)
    if (cur && !cur.words.length && cur.qty != null && cur.unit && out.length && out[out.length - 1].qty == null && !GEN[clean.toLowerCase()] && exactKeyword(clean)) flush();   // ("mleko dwa litry chleb": the amount was for the milk)
    if (cur && cur.words.length && (!ADJ.test(clean) || exactKeyword(clean)) && !isBrand(clean) && isKeywordStart(clean) && isKeywordStart(cur.words[0])) flush();   // ("mleko chleb masło" said in one breath)
    if (!cur) cur = { qty: null, unit: null, words: [] };
    cur.words.push(clean);
  }
  flush();
  return out;
}

// (when someone corrects themselves, "Soft tempera. Sok tymbark.", the first, unrecognised try sounds like the next one: drop it)
const flat = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]/g, '');
function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length]; }
const soundsLike = (a, b) => { a = flat(a); b = flat(b); if (!a || !b) return false; const sim = 1 - lev(a, b) / Math.max(a.length, b.length); return sim >= .55 || (a[0] === b[0] && sim >= .4); };
function dropRetries(items) { return items.filter((it, i) => { const nx = items[i + 1]; return !(nx && it.category === 'dom' && !it.emoji && it.qty == null && (nx.category !== 'dom' || nx.emoji) && soundsLike(it.name, nx.name)); }); }

function localParse(text) {
  const chunks = String(text || '').split(/[,;\n]+|\s+(?:i|oraz|a także|a takze)\s+|\.\s+/i).map(s => s.trim()).filter(Boolean);
  const items = [];
  for (const ch of chunks) for (const it of chunkItems(ch)) {
    const name = cap(nominative(it.words, it.qty != null).join(' ').trim()); if (!name) continue;
    items.push({ name, qty: it.qty, unit: it.qty != null ? (unitFor(it.qty, it.unit) || null) : null, category: catFor(name), emoji: emojiFor(name), note: null, question: null, options: [] });
  }
  return { items: dropRetries(items), remove: [], source: 'local' };
}

// (emoji from the stems in the catalog, shared with the app; the first word decides first, then any word in the name)
function emojiFor(name) { const n = String(name || '').toLowerCase(), words = n.split(/[\s,-]+/).filter(Boolean), list = catalog.emoji || [];
  for (const [k, e] of list) if (k.includes(' ') ? (n + ' ').includes(k) : (words[0] || '').startsWith(k)) return e;
  for (const [k, e] of list) if (!k.includes(' ') && words.some(w => w.startsWith(k))) return e;
  return null; }

module.exports = { localParse, catFor, emojiFor };
