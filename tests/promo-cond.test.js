// Warunki promocji z opisów ding.pl (prawdziwe opisy z gazetek, 10.10.2026). Uruchom: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { promoCond } = require('../lib/promo-cond');

const CASES = [
  ['Parówki z szynki Kraina Wędlin Mega Paka 500 g teraz w promocji za 6,69 zł przy zakupie dwóch sztuk, zamiast wcześniejszych 10,99 zł. • CENA: 6,69 zł za sztukę przy zakupie 2 sztuk • CENA PRZED OBNIŻKĄ: 10,99 zł • RABAT: drugi produkt 78% taniej • WAGA: 500 g • CENA ZA KG: 13,38 zł • LIMIT: 6 sztuk dziennie na kartę • WARUNEK: z kartą lub aplikacją.',
    { cond: ['przy zakupie 2 szt.', '2. sztuka −78%', 'z kartą lub aplikacją', 'limit 6 szt. dziennie'], size: '500 g', multi: 2 }],
  ['Brokuł, opakowanie 500 g • CENA: 2,99 zł • WAGA: 500 g • PROMOCJA: 1+1 GRATIS • CENA PRZED OBNIŻKĄ: 5,99 zł. Pamiętaj, że oferta dotyczy każdego drugiego opakowania w parze.',
    { cond: ['1+1 gratis'], size: '500 g', multi: 2 }],
  ['Filet z piersi kurczaka Kraina Mięs • CENA: 14,99 zł/kg • CENA PRZED OBNIŻKĄ: 24,90 zł • WARUNEK: tylko z aplikacją • LIMIT: 3 kg na konto w okresie promocji',
    { cond: ['tylko z aplikacją', 'limit 3 kg na konto'], size: null, multi: 0 }],
  ['Napój gazowany Coca-Cola Zero Cukru 2 l • CENA: 6,99 zł przy zakupie 4 sztuk • CENA REGULARNA: 10,95 zł • POJEMNOŚĆ: 2 l',
    { cond: ['przy zakupie 4 szt.'], size: '2 l', multi: 4 }],
  ['Mango • CENA: 5,99 zł • CENA PRZED OBNIŻKĄ: 9,99 zł • RABAT: 40%', { cond: [], size: null, multi: 0 }],
  ['PILOS Masło ekstra 83% 200 g', { cond: [], size: '200 g', multi: 0 }],
  ['KUJAWSKI Olej rzepakowy 3L', { cond: [], size: '3 l', multi: 0 }],
  ['Kawa rozpuszczalna Eduscho - Cena z kartą lub aplikacją: **19,99 zł** - Cena regularna: **29,99 zł** - Waga: **200 g** Pamiętaj o dziennym limicie **4 sztuk** na jedną kartę.',
    { cond: ['z kartą lub aplikacją', 'limit 4 szt.'], size: '200 g', multi: 0 }],
  ['Łosoś pieczony Marinero • CENA: 9,90 zł / 100 g • CENA PRZED OBNIŻKĄ: 13,49 zł • CENA BEZ KARTY: 13,49 zł / 100 g • WARUNEK: z kartą lub aplikacją.',
    { cond: ['z kartą lub aplikacją'], size: null, multi: 0, unit: '100 g' }],
];
for (const [desc, want] of CASES) test(desc.slice(0, 60), () => {
  const got = promoCond(desc);
  assert.deepEqual(got.cond, want.cond); assert.equal(got.size, want.size); assert.equal(got.multi, want.multi);
  if (want.unit) assert.equal(got.unit, want.unit);
});
