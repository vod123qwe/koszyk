// Parser dyktowania bez AI: jak mówimy w sklepie → co ląduje na liście. Uruchom: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { localParse, catFor, emojiFor } = require('../lib/local-parse');

// "Nazwa [ilość jednostka] @kategoria", pozycje rozdzielone " | "
const show = text => localParse(text).items.map(i => i.name + (i.qty != null ? ` [${i.qty}${i.unit ? ' ' + i.unit : ''}]` : '') + ' @' + i.category).join(' | ');

const CASES = [
  // jednym ciągiem, z ilościami i wagą
  ['cztery mleka, dwa kilo ziemniaków, sos pomidorowy, koncentrat pomidorowy', 'Mleko [4] @nabial | Ziemniaki [2 kg] @warzywa | Sos pomidorowy @przyprawy | Koncentrat pomidorowy @konserwy'],
  ['cztery mleka dwa kilo ziemniaków sos pomidorowy koncentrat pomidorowy', 'Mleko [4] @nabial | Ziemniaki [2 kg] @warzywa | Sos pomidorowy @przyprawy | Koncentrat pomidorowy @konserwy'],
  ['dwa kilo ziemniaków dwa litry mleka', 'Ziemniaki [2 kg] @warzywa | Mleko [2 l] @nabial'],
  ['mleko chleb masło', 'Mleko @nabial | Chleb @pieczywo | Masło @nabial'],
  ['mleko dwa litry chleb masło', 'Mleko [2 l] @nabial | Chleb @pieczywo | Masło @nabial'],
  ['sześć jajek kilogram jabłek dwie paczki makaronu', 'Jajka [6] @nabial | Jabłka [1 kg] @warzywa | Makaron [2 op] @suche'],
  ['pół kilo sera żółtego trzy jogurty chleb i masło', 'Ser żółty [0.5 kg] @wedliny | Jogurty [3] @nabial | Chleb @pieczywo | Masło @nabial'],
  ['litr śmietany dziesięć deko szynki ryż', 'Śmietana [1 l] @nabial | Szynka [10 dag] @wedliny | Ryż @suche'],
  ['dwa kartony mleka zgrzewka wody', 'Mleko [2 kartony] @nabial | Woda [1 zgrzewka] @napoje'],
  ['kostka masła i słoik miodu', 'Masło [1 kostka] @nabial | Miód [1 słoik] @konserwy'],
  ['pięć puszek tuńczyka dwie butelki wina', 'Tuńczyk [5 puszek] @mieso | Wino [2 butelki] @alkohol'],
  ['papier toaletowy płyn do naczyń i kawa ziarnista', 'Papier toaletowy @higiena | Płyn do naczyń @chemia | Kawa ziarnista @kawa'],
  ['mleko owsiane kawa ziarnista woda gazowana', 'Mleko owsiane @nabial | Kawa ziarnista @kawa | Woda gazowana @napoje'],
  // marki zostają przy produkcie
  ['masło pilos jogurt fruvita kawa jacobs', 'Masło pilos @nabial | Jogurt fruvita @nabial | Kawa jacobs @kawa'],
  ['sok tymbark', 'Sok tymbark @napoje'],
  // samopoprawki
  ['Soft tempera. Sok tymbark.', 'Sok tymbark @napoje'],
  ['Mleko. Chleb.', 'Mleko @nabial | Chleb @pieczywo'],
  ['Fanta. Fasola.', 'Fanta @napoje | Fasola @konserwy'],
  // ułamki, cyfry sklejone z jednostką, wtrącenia
  ['2 kg ziemniaków 1,5 litra coli', 'Ziemniaki [2 kg] @warzywa | Cola [1.5 l] @napoje'],
  ['2kg ziemniaków', 'Ziemniaki [2 kg] @warzywa'],
  ['mleko 3,2%', 'Mleko 3,2% @nabial'],
  ['yyy no to jeszcze mleko i może jakieś banany', 'Mleko @nabial | Banany @warzywa'],
  ['kup chleb aha i masło', 'Chleb @pieczywo | Masło @nabial'],
  ['dwa razy masło', 'Masło [2] @nabial'],
  ['2 x masło', 'Masło [2] @nabial'],
  ['masło x2', 'Masło [2] @nabial'],
  ['mąka pszenna typ 450', 'Mąka pszenna typ 450 @suche'],
  // przyimki trzymają nazwę razem, cel to notatka
  ['pierś z kurczaka', 'Pierś z kurczaka @mieso'],
  ['ser żółty w plastrach', 'Ser żółty w plastrach @wedliny'],
  ['mleko bez laktozy', 'Mleko bez laktozy @nabial'],
  ['płyn do naczyń', 'Płyn do naczyń @chemia'],
  ['karma dla kota', 'Karma dla kota @zwierzeta'],
  ['coś na obiad', ''],
  // puszka i słoik zmieniają produkt; kilogramy, kartony i butelki to zwykła ilość
  ['jedną puszkę pomidorów', 'Pomidory w puszce [1 szt] @konserwy'],
  ['pół kilo pomidorów i puszka pomidorów', 'Pomidory [0.5 kg] @warzywa | Pomidory w puszce [1 szt] @konserwy'],
  ['słoik ogórków', 'Ogórki w słoiku [1 szt] @konserwy'],
  ['suszone pomidory', 'Suszone pomidory @konserwy'],
  ['ogórki kiszone', 'Ogórki kiszone @warzywa'],
  ['puszka kukurydzy', 'Kukurydza [1 puszka] @konserwy'],
  ['słoik miodu', 'Miód [1 słoik] @konserwy'],
  ['dwie puszki fasoli', 'Fasola [2 puszki] @konserwy'],
  // odmiana po ogólnej nazwie zostaje w jednej pozycji
  ['makaron penne ryż basmati', 'Makaron penne @suche | Ryż basmati @suche'],
  ['ser mozzarella pomidory', 'Ser mozzarella @wedliny | Pomidory @warzywa'],
  ['mleko jogurt', 'Mleko @nabial | Jogurt @nabial'],
];
// "Nazwa (notatka)" i to, co schodzi z listy
const full = text => { const r = localParse(text); return r.items.map(i => i.name + (i.note ? ` (${i.note})` : '')).join(' | ') + (r.remove.length ? ' −' + r.remove.join(', −') : ''); };
const MORE = [
  ['ser feta do sałatki', 'Ser feta (do sałatki)'],
  ['trzy kilo jabłek do szarlotki dwa litry mleka', 'Jabłka (do szarlotki) | Mleko'],
  ['mięso mielone na obiad i ziemniaki', 'Mięso mielone (na obiad) | Ziemniaki'],
  ['usuń mleko', ' −Mleko'],
  ['wykreśl chleb i masło', ' −Chleb, −Masło'],
  ['już nie potrzebuję chleba', ' −Chleb'],
  ['usuń mleko z listy. Dodaj masło', 'Masło −Mleko'],
];
for (const [text, want] of MORE) test(text, () => assert.equal(full(text), want));

for (const [text, want] of CASES) test(text, () => assert.equal(show(text), want));

test('kategorie: prawie nic nie wpada do „Dom i inne”', () => {
  const T = ['Sok Tymbark', 'Kinder Bueno', 'Actimel', 'Jacobs Kronung', 'Żubr', 'Pampers', 'Fairy', 'Persil', 'Colgate', 'Hummus', 'Tofu', 'Nachos', 'Guacamole', 'Tonik', 'Baileys', 'Pizza', 'Pieluchy', 'Red Bull', 'Wafelki', 'Płatki owsiane', 'Whiskey Jim Beam', 'Grzaniec', 'Pstrąg', 'Halibut', 'Figi', 'Flora'];
  assert.deepEqual(T.filter(t => catFor(t) === 'dom'), []);
});
test('kategorie: rzeczy spoza spożywki nie udają jedzenia', () => {
  const T = ['Pierścionek', 'Bokserki męskie Champion', 'Rękawiczki rowerowe', 'Konsola Blow', 'Sofa Ruby', 'Kamizelka Esmara', 'Czajnik elektryczny', 'Toster', 'Figi damskie Esmara', 'Podkaszarka Nac'];
  assert.deepEqual(T.filter(t => catFor(t) !== 'dom'), []);
});
test('emoji: popularne produkty i marki mają emoji', () => {
  const T = ['Mleko', 'Chleb', 'Buraki', 'Serwetki', 'Whisky', 'Kasza manna', 'Masło', 'Milka', 'Persil', 'Żubr', 'Pampers', 'Kapary', 'Sok pomarańczowy', 'Papier toaletowy'];
  assert.deepEqual(T.filter(t => !emojiFor(t)), []);
});

test('duże zakupy jednym tchem: 30 pozycji, nic się nie skleja', () => {
  const t = 'no to tak dwa mleka chleb żytni pół kilo sera żółtego sześć jajek masło dwie kostki jogurt naturalny kilogram jabłek banany trzy cytryny cebula czosnek pomidory malinowe ogórki kiszone pierś z kurczaka kilo mięsa mielonego na obiad ryż basmati makaron penne sos pomidorowy koncentrat pomidorowy kawa ziarnista herbata zielona sok tymbark zgrzewka wody papier toaletowy płyn do naczyń kapsułki do prania pasta do zębów karma dla kota żwirek i jeszcze czekolada milka oraz chipsy';
  assert.equal(full(t), 'Mleko | Chleb żytni | Ser żółty | Jajka | Masło | Jogurt naturalny | Jabłka | Banany | Cytryny | Cebula | Czosnek | Pomidory malinowe | Ogórki kiszone | Pierś z kurczaka | Mięso mielone (na obiad) | Ryż basmati | Makaron penne | Sos pomidorowy | Koncentrat pomidorowy | Kawa ziarnista | Herbata zielona | Sok tymbark | Woda | Papier toaletowy | Płyn do naczyń | Kapsułki do prania | Pasta do zębów | Karma dla kota | Żwirek | Czekolada milka | Chipsy');
});
