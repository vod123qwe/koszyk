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
  [/^(kg|kilo|kilogram[a-ząćęłńóśźż]*)$/, 'kg'], [/^(dag|deko|dekagram[a-ząćęłńóśźż]*)$/, 'dag'], [/^(g|gram[a-ząćęłńóśźż]*)$/, 'g'],
  [/^(l|litr[a-ząćęłńóśźż]*)$/, 'l'], [/^(ml|mililitr[a-ząćęłńóśźż]*)$/, 'ml'], [/^(szt|sztuk[a-ząćęłńóśźż]*)$/, 'szt'],
  [/^(opakowa[a-ząćęłńóśźż]*|paczk[a-ząćęłńóśźż]*|paczek)$/, 'op'], [/^(puszk[a-ząćęłńóśźż]*|puszek)$/, 'puszki'], [/^(butel[a-ząćęłńóśźż]*)$/, 'butelki'], [/^(słoik[a-ząćęłńóśźż]*|sloik[a-ząćęłńóśźż]*)$/, 'słoiki'],
  [/^(karton[a-ząćęłńóśźż]*)$/, 'kartony'], [/^(zgrzewk[a-ząćęłńóśźż]*|zgrzewek)$/, 'zgrzewki'], [/^(bochen[a-ząćęłńóśźż]*|bochnk[a-ząćęłńóśźż]*)$/, 'bochenki'], [/^(kostk[a-ząćęłńóśźż]*|kostek)$/, 'kostki'], [/^(główk[a-ząćęłńóśźż]*|glowk[a-ząćęłńóśźż]*)$/, 'główki'], [/^(pęczk[a-ząćęłńóśźż]*|pęczek)$/, 'pęczki'],
];
const FILLER = /^(i|oraz|a|też|tez|jeszcze|potem|no|to|tego|tam|aha|ok|okej|dobra|eee|yyy|hmm|kup|kupić|kupic|weź|wez|trzeba|potrzebuję|potrzebuje|proszę|prosze|może|moze|chyba|coś|cos|jakieś|jakies|jakiś|jakis|jakąś|jakas|jakiegoś|jakichś|trochę|troche|już|juz|dodaj|dopisz|wpisz|zapisz|tak|więc|wiec|czyli|ee|eh)$/;

function bestIn(text) { const n = ' ' + text.toLowerCase() + ' '; let best = null, len = 0;
  for (const [cat, words] of Object.entries(catalog.keywords)) for (const w of words) { if (n.includes(' ' + w.toLowerCase()) && w.length > len) { best = cat; len = w.length; } }
  return { best, len }; }
// (the whole name first for set phrases like "płyn do naczyń"; then the head noun decides: "kawa ziarnista" is coffee, not grain)
// (also by brand: SilverCrest, Parkside, Esmara... sell gadgets and clothes, "Młynek do kawy SilverCrest" is not coffee)
const isNonFood = name => { const n = name.toLowerCase() + ' ', ws = n.split(/[\s.,]+/);
  return (catalog.nonfood || []).some(w => n.startsWith(w)) || (catalog.nonfoodBrands || []).some(b => ws.includes(b)) || ws.includes('led'); };   // ("Dynia LED")
function catFor(name) { if (isNonFood(name)) return 'dom'; const whole = bestIn(name), head = bestIn(name.split(/\s+/)[0]);
  if (whole.best === 'dziecko' && whole.len >= 6) return 'dziecko';   // ("Mleko Bebiko 2R" is for the baby, not the dairy aisle)
  // (what it is for decides: "Łopatka do żwirku" is for the cat, "Sól do zmywarki" for the dishwasher, "Pasztet dla psów" for the dog)
  const low = ' ' + name.toLowerCase() + ' ';
  for (const [cat, ws] of Object.entries(catalog.keywords)) if (ws.some(w => /^(do|dla) /.test(w) && low.includes(' ' + w.toLowerCase()))) return cat;
  // (a ready meal is not its meat: "Kotlet schabowy z purée", "Zapiekanka z pieczarkami", breaded fish)
  if (/\bz pur[eé]e\b|zapiekank|calzone|pizzerk|frusta|krokiet|gołąbk|pulpecik|panierowan|\bdanie\b/i.test(name)) return 'mrozonki';
  // (fruit or nuts in chocolate are sweets)
  if (/w czekoladzie|w polewie|w karmelu/i.test(name)) return 'sniadanie';
  const c = smartCat(name, whole, head);
  // (smoked, roasted, boiled or sliced meat is a cold cut: "Ćwiartka z kurczaka wędzona", "Filet pieczony z kurczaka", Pikok, Kabanos)
  return c === 'mieso' && /wędzon|wedzon|pieczon|gotowan|w plastrach|parzon|pikok|kabanos/i.test(name) ? 'wedliny' : c; }
function smartCat(name, whole, head) {
  if (whole.best && whole.len > (head.len || 0) + 3 && /\s/.test(Object.values(catalog.keywords).flat().find(w => (' ' + name.toLowerCase()).includes(' ' + w.toLowerCase()) && w.length === whole.len) || '')) return whole.best;
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
  'coli': 'cola', 'fasoli': 'fasola', 'kukurydzy': 'kukurydza', 'groszku': 'groszek', 'ciecierzycy': 'ciecierzyca', 'ananasa': 'ananas', 'oliwek': 'oliwki', 'buraczków': 'buraczki', 'sardynek': 'sardynki', 'szprotek': 'szprotki', 'mleczka': 'mleczko', 'mleka kokosowego': 'mleko kokosowe', 'kapusty': 'kapusta', 'papryczek': 'papryczki', 'grzybków': 'grzybki', 'korniszonów': 'korniszony', 'mielonego': 'mielone', 'wołowego': 'wołowe', 'wieprzowego': 'wieprzowe', 'drobiowego': 'drobiowe', 'mielonej': 'mielona', 'wędzonego': 'wędzony', 'naturalnego': 'naturalny', 'greckiego': 'grecki', 'miodu': 'miód', 'dżemu': 'dżem', 'chusteczek': 'chusteczki', 'ręczników': 'ręczniki', 'worków': 'worki',
  'mąki': 'mąka', 'cukru': 'cukier', 'masła': 'masło', 'mleka': 'mleko', 'piw': 'piwo', 'jogurtów': 'jogurty', 'serków': 'serki', 'parówek': 'parówki', 'cytryn': 'cytryny', 'marchewek': 'marchewki', 'żółtego': 'żółty', 'zoltego': 'żółty' };
// (the adjectives among those forms: "wieprzowe", "wołowe" describe the product before them, they are not a new one)
const GEN_ADJ = new Set(Object.entries(GEN).filter(([k]) => /(ego|ej)$/.test(k)).map(([, v]) => v));
// ("1 kostka", "3 kostki", "5 kostek")
const UNIT_FORMS = { kostki: ['kostka', 'kostki', 'kostek'], 'słoiki': ['słoik', 'słoiki', 'słoików'], kartony: ['karton', 'kartony', 'kartonów'], zgrzewki: ['zgrzewka', 'zgrzewki', 'zgrzewek'], puszki: ['puszka', 'puszki', 'puszek'], butelki: ['butelka', 'butelki', 'butelek'], bochenki: ['bochenek', 'bochenki', 'bochenków'], 'główki': ['główka', 'główki', 'główek'], 'pęczki': ['pęczek', 'pęczki', 'pęczków'] };
const unitFor = (q, u) => { const f = UNIT_FORMS[u]; if (!f || q == null) return u; if (q === 1 || q % 1) return q === 1 ? f[0] : f[1]; const t = q % 10, h = q % 100; return t >= 2 && t <= 4 && (h < 12 || h > 14) ? f[1] : f[2]; };
// (after an amount the noun is in the genitive: "tuńczyka" → "tuńczyk" when the shorter form is a known product)
const nominative = (words, counted) => words.map((w, i) => i && /^(z|ze|w|we|bez|od|o|do|na|dla)$/i.test(words[i - 1]) ? w : GEN[w.toLowerCase()] || (counted && i === 0 && /[au]$/i.test(w) && exactKeyword(w.slice(0, -1)) ? w.slice(0, -1) : counted && i > 0 && /[a-ząćęłńóśźż]{3,}ych$/i.test(w) ? w.slice(0, -3) + 'e' : w));   // ("pomidorów krojonych" → "krojone")

// (words that only glue a phrase together: "pierś z kurczaka", "ser żółty w plastrach", "mleko bez laktozy" stay one product)
const PREP = /^(z|ze|w|we|bez|od|o)$/;
// (a purpose after a product is a note, not a product: "jabłka do szarlotki", "mięso na obiad"; unless it is a name: "płyn do naczyń", "karma dla kota")
const PURPOSE = /^(do|na|dla)$/;
// (a cut after a fish or meat is still that product: "dorsz filet", "łosoś tuszka")
const CUTS = /^(filet|filety|fileta|tuszka|tuszki|porcje|plastry|płaty|polędwica)$/i;
const phraseGoesOn = p => { p = p.toLowerCase() + ' '; return Object.values(catalog.keywords).some(ws => ws.some(w => w.toLowerCase().startsWith(p))) || (catalog.emoji || []).some(([k]) => k.startsWith(p)); };
const knownPhrase = p => { p = p.toLowerCase(); return Object.values(catalog.keywords).some(ws => ws.some(w => { w = w.toLowerCase(); return w === p || w.startsWith(p + ' '); })); };
const isVariety = (head, tok) => { const v = (catalog.varieties || {})[(GEN[head.toLowerCase()] || head).toLowerCase()]; const t = tok.toLowerCase(); return !!v && v.some(w => t.startsWith(w.slice(0, Math.max(4, w.length - 2)))); };
const catalogWord = tok => { const t = tok.toLowerCase(); return Object.values(catalog.keywords).some(ws => ws.some(w => w.toLowerCase() === t)); };

// one chunk ("2 kilo ziemniaków") → item; a chunk without separators may hold several products: a new number or a new known product starts the next one
function chunkItems(chunk) {
  const toks = chunk.split(/\s+/).filter(Boolean), out = [];
  let cur = null, prev = '';
  // (a bare amount after the product belongs to it: "mleko dwa litry")
  const flush = () => { if (cur && cur.words.length) out.push(cur); else if (cur && cur.qty != null && out.length && out[out.length - 1].qty == null) Object.assign(out[out.length - 1], { qty: cur.qty, unit: cur.unit }); cur = null; };
  for (const tok of toks) {
    const clean = tok.replace(/[.!?]+$/, ''), low = clean.toLowerCase(), p = prev; prev = low;
    const n = /^(typ|nr|numer)$/.test(p) ? null : numOf(clean);
    // the note runs until a new amount starts the next product
    if (cur && cur.note != null && n === null && (cur.noteN++ === 0 || !isKeywordStart(clean) || ADJ.test(clean) && !exactKeyword(clean))) { if (!FILLER.test(low)) cur.note += ' ' + clean; continue; }
    if (cur && cur.note != null && n === null) { const was = cur; flush(); if (!was.words.length) cur = null; }
    if (FILLER.test(low)) { if (cur && cur.words.length && /^(i|oraz|a)$/.test(low)) flush(); continue; }
    if (PURPOSE.test(low) && !(cur && cur.words.length)) { flush(); cur = { qty: null, unit: null, words: [], note: low, noteN: 0 }; continue; }
    if (PURPOSE.test(low)) { if (cur && cur.words.length && !phraseGoesOn(cur.words.join(' ') + ' ' + low)) { cur.note = low; cur.noteN = 0; } else if (cur && cur.words.length) cur.words.push(clean); continue; }
    // "dwa razy masło", "2 x masło", "masło x2"
    if (/^(x|×|razy)$/.test(low) && cur && cur.qty != null && !cur.words.length) continue;
    const times = low.match(/^[x×](\d+)$/); if (times && cur && cur.words.length) { cur.qty = +times[1]; continue; }
    if (n !== null) { flush(); cur = { qty: n, unit: null, words: [] }; continue; }
    const u = unitOf(clean);
    if (u && cur && !cur.words.length) { cur.unit = u; continue; }
    if (u && !PREP.test(p) && !(clean.length === 1 && cur && cur.words.length)) { flush(); cur = { qty: 1, unit: u, words: [] }; continue; }   // ("kilogram jabłek", "litr mleka": the unit alone means one; "jajka L" is a size)
    if (cur && !cur.words.length && cur.qty != null && cur.unit && out.length && out[out.length - 1].qty == null && !GEN[low] && exactKeyword(clean)) flush();   // ("mleko dwa litry chleb": the amount was for the milk)
    if (cur && cur.words.length && !PREP.test(p) && !PURPOSE.test(p) && !isVariety(cur.words[cur.words.length - 1], clean) && !knownPhrase(cur.words.join(' ') + ' ' + low) && (!ADJ.test(clean) || (exactKeyword(clean) && !GEN_ADJ.has(low)) || phraseGoesOn(low)) && !isBrand(clean) && !CUTS.test(clean) && isKeywordStart(clean) && isKeywordStart(cur.words[0])) flush();   // ("mleko chleb masło" said in one breath; "mielone wieprzowe", "dorsz filet", "proszek vizir" stay one)
    if (!cur) cur = { qty: null, unit: null, words: [] };
    if (PREP.test(low) && !cur.words.length) continue;
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

// ("usuń mleko", "wykreśl chleb i masło", "już mam jajka": the rest of that sentence comes off the list)
const REMOVE = /^\s*(usuń|usun|wykreśl|wykresl|skreśl|skresl|wyrzuć|wyrzuc|wywal|bez|nie kupuj|już nie potrzebuję|juz nie potrzebuje|nie potrzebuję|nie potrzebuje|już mam|juz mam|mam już|mam juz)(?=[\s,:]|$)[\s,:]*/i;
const chunksOf = s => s.split(/(?<!\d),(?!\d)|[;\n]+|\s+(?:i|oraz|a także|a takze)\s+/i).map(x => x.trim()).filter(Boolean);
function localParse(text) {
  text = String(text || '').replace(/(\d)(kg|dag|g|ml|l|szt)\b/gi, '$1 $2');   // ("2kg" → "2 kg")
  const items = [], remove = [];
  for (const sentence of text.split(/[.!?]+(?:\s+|$)/)) {
    const rm = sentence.match(REMOVE), body = rm ? sentence.slice(rm[0].length).replace(/\s+z listy\s*$/i, '') : sentence;
    for (const ch of chunksOf(body)) for (const it of chunkItems(ch)) {
      let name = cap(nominative(it.words, it.qty != null).join(' ').trim()); if (!name) continue;
      if (rm) { remove.push(name); continue; }
      // (a can or a jar is a different product than the fresh one: "puszka pomidorów" → "Pomidory w puszce", "słoik ogórków" → "Ogórki w słoiku";
      //  things that only come canned or jarred keep their name: tuńczyk, kukurydza, miód, dżem)
      let unit = it.unit, canned = false;
      if ((unit === 'puszki' || unit === 'słoiki') && !/puszk|puszce|słoik|sloik/i.test(name)) {
        const c = catFor(name), jar = unit === 'słoiki';
        if (jar ? c === 'warzywa' : !['konserwy', 'przyprawy', 'napoje', 'alkohol', 'zwierzeta'].includes(c) && !/^(tuńczyk|sardyn|szprot|paprykarz|pasztet|mielonk)/i.test(name)) { name = name + (jar ? ' w słoiku' : ' w puszce'); unit = 'szt'; canned = true; }
      }
      items.push({ name, qty: it.qty, unit: it.qty != null ? (unitFor(it.qty, unit) || null) : null, category: canned ? 'konserwy' : catFor(name), emoji: emojiFor(name), note: it.note || null, question: null, options: [] });
    }
  }
  return { items: dropRetries(items), remove, source: 'local' };
}

// (emoji from the stems in the catalog, shared with the app; the first word decides first, then any word in the name)
function emojiFor(name) { if (isNonFood(String(name || ''))) return null; const n = String(name || '').toLowerCase(), words = n.split(/[\s,-]+/).filter(Boolean), list = catalog.emoji || [];
  for (const [k, e] of list) if (k.includes(' ') ? (n + ' ').includes(k) : (words[0] || '').startsWith(k)) return e;
  for (const [k, e] of list) if (!k.includes(' ') && words.some(w => w.startsWith(k))) return e;
  return null; }

// (a word that describes rather than names a brand: "żółty", "ziarnista", "500g"; brands always count as names)
const isDescriptor = w => !isBrand(w) && (ADJ.test(w) || exactKeyword(w) || /\d/.test(w) || PREP.test(w.toLowerCase()));
module.exports = { localParse, catFor, emojiFor, isNonFood, isDescriptor };
