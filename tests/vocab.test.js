// Słownik: produkty wpisane tak, jak trafiają na listę → dział i ikona. Fragment testu na 587 produktach z 12.10.2026
// (wtedy 100% działów i ikon). Uruchom: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { localParse, catFor, emojiFor } = require('../lib/local-parse');

const AISLE = {
  warzywa: ['Włoszczyzna', 'Botwina', 'Kalarepa', 'Brukselka', 'Szalotka', 'Kurki', 'Wiśnie', 'Czereśnie', 'Agrest', 'Morele', 'Natka pietruszki', 'Papryczka chili', 'Grejpfrut', 'jablka'],
  pieczywo: ['Obwarzanek', 'Precel', 'Sucharki', 'Ciabatta', 'Chałka', 'Pieczywo chrupkie'],
  nabial: ['Twarożek', 'Ser biały', 'Zsiadłe mleko', 'Mascarpone', 'maslo'],
  mieso: ['Cielęcina', 'Gulasz', 'Szaszłyki', 'Kalmary', 'Owoce morza', 'Korpus'],
  wedliny: ['Kaszanka', 'Salceson', 'Baleron', 'Oscypek', 'Smalec', 'Chorizo'],
  mrozonki: ['Uszka', 'Pyzy', 'Naleśniki', 'Szpinak mrożony', 'Owoce mrożone', 'Lód w kostkach'],
  suche: ['Świderki', 'Nitki', 'Kokardki', 'Bulgur', 'Pęczak', 'Żelatyna', 'Cukier puder'],
  konserwy: ['Zakwas', 'Żurek', 'Barszcz', 'Buraczki', 'Ćwikła', 'Mielonka', 'Mleko kokosowe', 'Ananas w puszce'],
  przyprawy: ['Majeranek', 'Kurkuma', 'Kminek', 'Kostka rosołowa', 'Sos sojowy', 'Czosnek granulowany'],
  sniadanie: ['Masło orzechowe', 'Lizaki', 'Guma do żucia', 'Tort', 'Nerkowce'],
  kawa: ['Rumianek', 'Melisa', 'Inka'],
  napoje: ['Kwas chlebowy', 'Tonik', 'Oranżada'],
  chemia: ['Nabłyszczacz', 'Kostka do wc', 'Ręczniki papierowe', 'Mleczko do czyszczenia', 'Rękawice gumowe'],
  higiena: ['Nić dentystyczna', 'Płyn do płukania ust', 'Płatki kosmetyczne', 'Farba do włosów', 'Wkładki'],
  dziecko: ['Słoiczki', 'Deserek dla dzieci'],
  zwierzeta: ['Przysmaki dla psa', 'Saszetki dla kota', 'Gryzaki'],
  dom: ['Kwiaty', 'Tulipany', 'Znicze', 'Serwetki', 'Balony'],
};

test('dział', () => {
  for (const [want, names] of Object.entries(AISLE)) for (const n of names) {
    const items = localParse(n).items; assert.equal(items.length, 1, `${n} rozpadł się: ${items.map(i => i.name)}`);
    assert.equal(catFor(items[0].name), want, `${n} → ${items[0].name}`); }
});

test('ikona dla każdego, także dla rzeczy niespożywczych', () => {
  for (const names of Object.values(AISLE)) for (const n of names) assert.ok(emojiFor(localParse(n).items[0].name), n);
  assert.equal(emojiFor('Kwiaty'), '💐'); assert.equal(emojiFor('Znicz'), '🕯️');
  assert.equal(emojiFor('Młynek do kawy SilverCrest'), null);   // (sprzęt to nie kawa)
});

test('kostka: ilość albo nazwa', () => {
  const one = t => { const i = localParse(t).items[0]; return [i.name, i.qty, i.unit]; };
  assert.deepEqual(one('kostka masła'), ['Masło', 1, 'kostka']);
  assert.deepEqual(one('kostka rosołowa'), ['Kostka rosołowa', null, null]);
  assert.deepEqual(one('2 kostki rosołowe'), ['Kostki rosołowe', 2, null]);
  assert.equal(localParse('zakwas na barszcz biały').items[0].note, 'na barszcz biały');   // (cel to notatka, chyba że nazywa produkt)
  assert.equal(localParse('przysmaki dla psa').items[0].name, 'Przysmaki dla psa');
});
