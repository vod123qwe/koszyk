// Warunki promocji z opisu oferty w ding.pl: „przy zakupie 2 sztuk”, „z kartą lub aplikacją”, „1+1 gratis”, limit, waga.
// Opisy bywają marketingowe i niejednolite, więc wyciągamy tylko to, co da się rozpoznać pewnie; reszta zostaje pusta.
const WORDNUM = { dwóch: 2, dwu: 2, dwie: 2, dwa: 2, trzech: 3, trzy: 3, czterech: 4, cztery: 4, pięciu: 5, sześciu: 6 };
const num = s => WORDNUM[String(s).toLowerCase()] || parseInt(s, 10);
const clean = d => String(d || '').replace(/\*\*/g, '').replace(/\s+/g, ' ');

function promoCond(desc) {
  const d = clean(desc), low = d.toLowerCase(), out = { cond: [], size: null, unit: null, multi: 0 };
  if (!d) return out;
  // "1+1 gratis", "2+1"
  const plus = low.match(/(\d)\s*\+\s*(\d)(?:\s*gratis)?/);
  if (plus && /gratis|\d\s*\+\s*\d\s*(gratis|za darmo)/.test(low)) { out.cond.push(`${plus[1]}+${plus[2]} gratis`); out.multi = +plus[1] + +plus[2]; }
  // "przy zakupie 2 sztuk / dwóch opakowań / 4 sztuk"
  const buy = low.match(/przy zakupie\s+\**(\d+|dwóch|dwu|trzech|czterech|pięciu|sześciu)\**\s*(szt|sztuk|opakowa|puszek|bochenk|butelek)?/);
  if (buy && !out.multi) { const n = num(buy[1]); if (n > 1) { out.cond.push(`przy zakupie ${n} szt.`); out.multi = n; } }
  else if (!out.multi && /każdej drugiej sztuki|każdego drugiego|parzystej liczby/.test(low)) { out.cond.push('przy zakupie 2 szt.'); out.multi = 2; }
  // "drugi produkt 78% taniej", "44% na drugą sztukę"
  const second = low.match(/drug[iaą]\s+(?:produkt\s+|sztuk[aę]\s+)?\**(\d+)\s*%\s*taniej/) || low.match(/(\d+)\s*%\s*(?:taniej\s+)?na drugą/);
  if (second) out.cond.push(`2. sztuka −${second[1]}%`);
  // card or app
  if (/tylko z aplikacją/.test(low)) out.cond.push('tylko z aplikacją');
  else if (/z kartą lub aplikacją|z kartą lub z aplikacją|cena z kartą|cena bez karty|kartą lub aplikacji/.test(low)) out.cond.push('z kartą lub aplikacją');
  // limit
  const lim = low.match(/limit[^:]*:\s*\**(\d+)\s*(szt|kg|op)/) || low.match(/limicie\s+\**(\d+)\s*(sztuk|szt)/);
  if (lim) { const when = low.slice(lim.index, lim.index + 70).match(/dziennie|na konto|na kartę/); out.cond.push(`limit ${lim[1]} ${lim[2].startsWith('szt') ? 'szt.' : lim[2]}${when ? ' ' + when[0] : ''}`); }
  if (/tylko w wybranych sklepach/.test(low)) out.cond.push('w wybranych sklepach');
  // (several kinds under one price: then it is not just the one product in the name)
  if (/różne rodzaje|różnych rodzajach|do wyboru|wybrane rodzaje|można mieszać|dowolnie warianty|dowolnego mieszania|w wariantach|kilku wersjach|różnych wersjach/.test(low)) out.cond.push('różne rodzaje');
  // size: WAGA / POJEMNOŚĆ, or a trailing "200 g" / "3L"
  const ds = d.replace(/limit[^•.]*/gi, ''), sz = ds.match(/(?:WAGA|POJEMNOŚĆ|ZAWARTOŚĆ|Waga|Pojemność)\s*:?\s*\**\s*([\d,.]+\s*(?:kg|g|ml|l|L|szt|kapsułek))\b/) || ds.match(/(?<!\/\s?)\b(\d+(?:[,.]\d+)?\s?(?:kg|g|ml|l|L))\b(?!\s*\/)/);
  if (sz) out.size = sz[1].replace(/\s+/g, '').replace(/^([\d,.]+)(.+)$/, '$1 $2').replace(/L$/, 'l');
  // price per what: "/100 g", "/kg", "za kilogram"
  const per = low.match(/cena:?\s*\**[\d,]+\s*zł\s*\/\s*(100\s*g|kg)/) || low.match(/[\d,]+\s*zł\s*za\s*(kilogram)/);
  if (per) out.unit = per[1].replace(/\s+/, ' ') === 'kilogram' ? 'kg' : per[1].replace(/\s+/, ' ');
  return out;
}

// (the exact product from the description: "Chleb" → "Chleb orkiszowy z ziarnami"; Lidl writes "PILOS Masło ekstra 83% 200 g")
const cap = w => w.charAt(0) + w.slice(1).toLowerCase();
function titleFrom(name, desc) {
  let d = clean(desc).split(/\s•\s|\s-\s(?=[A-ZŁŚŻŹĆ]{2}|Cena|Pojemność|Waga)|\.\s/)[0].trim(); if (!d) return null;
  let brand = '';
  const caps = d.match(/^((?:[A-ZĄĆĘŁŃÓŚŹŻ0-9&'.]{2,}\s)+)(?=[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż])/);   // ("PILOS ", "TARG RYBNY LIDLA ")
  if (caps) { brand = caps[1].trim().split(/\s+/).map(cap).join(' '); d = d.slice(caps[1].length); }
  d = d.split(/\s(?:to|w promocji|teraz|za \d|kupisz|w cenie|zamiast|od producenta|w wariantach|występuj|z linii|sprawdzi|pochodzi|wyróżnia|jest|na wagę|z naturalnych|produkt polski|w dużym|charakteryzuje|świetnie|idealn)(?=[\s,.]|$)|,\s(?:któr|to |opakowanie|sztuka|luzem|\d)|\s\(/i)[0];
  d = d.replace(/,?\s*\d+(?:[,.]\d+)?\s?(?:kg|g|ml|l|L|szt\.?)\b.*$/, '').replace(/[,;:\s]+$/, '').trim();
  if (brand && !new RegExp(brand.split(' ')[0], 'i').test(d)) d += ' ' + brand;
  const n = String(name).toLowerCase(), t = d.toLowerCase(), head = n.split(/\s+/)[0].slice(0, 4);
  if (d.length < 4 || d.length > 64 || t === n || n.startsWith(t) || !t.split(/[\s-]+/).some(w => w.startsWith(head))) return null;
  return d.charAt(0).toUpperCase() + d.slice(1);
}

module.exports = { promoCond, titleFrom };
