// Dopasowanie promocji do produktów z listy: prawdziwe nazwy ofert z gazetek z 11–12.10.2026 i pułapki znalezione w teście
// obciążeniowym (ponad 250 sposobów wpisania produktu w 3 sklepach). Bez sieci. Uruchom: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { pick } = require('../lib/promos');
const { catFor } = require('../lib/local-parse');

const of = (name, price, oldPrice = null) => ({ name, price, oldPrice, cat: catFor(name), cond: [] });
const LEAF = [
  of('Mleko zambrowskie UHT 3,2%', 1.99, 3.99), of('Mleko UHT Łaciate o smaku czekoladowym', 2.49), of('Napój owsiany Barista Vemondo', 7.99),
  of('Masło ekstra 83% Pilos', 2.49, 4.99), of('Ser gouda w kawałku Pilos', 14.99, 29.99), of('Ser salami w plastrach, XXL Mlekovita', 19.99, 30.99),
  of('Puszysty serek twarogowy Almette śmietankowy', 3.24), of('Śmietanka UHT Mleczna Dolina 30%', 15.99),
  of('Polski kurczak z chowu bez antybiotyków – filety z piersi Nasze Fermy', 29.49, 36.99), of('Polski kurczak tuszka', 7.99),
  of('Filet pieczony z kurczaka Duda', 5.99, 9.49), of('Żołądki z polskiego kurczaka', 6.99), of('Parówki z szynki Kraina Wędlin', 6.69),
  of('Szynka wędzona na wiśniowo Kraina Wędlin', 4.99), of('Schab lub szynka, XXL Pikok', 7.99, 13.89), of('Mintaj, filet bez skóry, XXL', 3.79, 4.99),
  of('Minicalzone margherita z mozzarellą i pomidorami', 5.49), of('Pomidory rzymskie mini', 6.99),
  of('Trufle czekoladowe J.D. Gross', 11.39), of('Czekolada mleczna Milka', 6.99), of('Precle oblane czekoladą mleczną Alpen Gold', 9.99), of('Cukierki Skittles Fruits', 4.99),
  of('Oliwki zielone gordal El Toro Rojo', 16.99), of('Oliwa z oliwek extra virgin Olitalia', 29.99),
  of('Woda mineralna niegazowana Nałęczowianka', 1.99), of('Woda mineralna lekko gazowana Cisowianka', 1.79), of('Woda mineralna 20% soku Jurajska', 2.99),
  of('Sok pomarańczowy Hortex 100%', 4.99), of('Napój gazowany Coca-Cola Zero Cukru', 5.99), of('Napój energetyzujący Red Bull 4-pak', 19.99),
  of('Łopatka do żwirku', 4.99), of('Łopatka wieprzowa Rzeźnik', 9.99, 13.49), of('Sól do zmywarki Finish', 9.99), of('Płyn do mycia naczyń Pur', 9.99),
  of('Karma dla psów Pedigree', 9.99), of('Karma dla kotów pstrąg Pet Republic', 3.49), of('Herbatka owocowa Saga truskawka i jabłko', 4.99),
  of('Jabłka polskie Szampion', 2.49), of('Mięso mielone wołowe Stoisko Mięsne', 19.99), of('Proszek do prania Vizir', 34.99)];
const names = item => pick(item, LEAF).map(o => o.name);

test('dokładnie te oferty', () => {
  const CASES = [
    ['mleko', ['Mleko zambrowskie UHT 3,2%']],                                  // nie mleko czekoladowe
    ['maslo', ['Masło ekstra 83% Pilos']],                                      // bez polskich znaków
    ['masło extra', ['Masło ekstra 83% Pilos']],                                // extra = ekstra
    ['zolty ser', ['Ser gouda w kawałku Pilos', 'Ser salami w plastrach, XXL Mlekovita']],   // gouda i salami to sery żółte
    ['pomidory', ['Pomidory rzymskie mini']],                                   // nie calzone z pomidorami
    ['czekolada mleczna', ['Czekolada mleczna Milka']],                         // nie precle oblane czekoladą
    ['oliwa', ['Oliwa z oliwek extra virgin Olitalia']],                        // nie oliwki
    ['woda gazowana', ['Woda mineralna lekko gazowana Cisowianka']],            // nie niegazowana
    ['cola', ['Napój gazowany Coca-Cola Zero Cukru']], ['red bull', ['Napój energetyzujący Red Bull 4-pak']],
    ['łopatka', ['Łopatka wieprzowa Rzeźnik']],                                 // nie łopatka do żwirku
    ['płyn do naczyń', ['Płyn do mycia naczyń Pur']], ['karma dla psa', ['Karma dla psów Pedigree']],   // „psa” to nie „pstrąg”
    ['jabłka', ['Jabłka polskie Szampion']],                                    // nie herbatka z jabłkiem
    ['kurczak cały', ['Polski kurczak tuszka']], ['mielone wołowe', ['Mięso mielone wołowe Stoisko Mięsne']], ['proszek vizir', ['Proszek do prania Vizir']]];
  for (const [item, want] of CASES) assert.deepEqual(names(item), want, item);
});

test('nic, gdy nie ma tego produktu', () => {
  for (const item of ['mleko owsiane', 'ser feta', 'śmietana', 'mozzarella', 'cukier', 'sól', 'masło orzechowe', 'jogurt naturalny'])
    assert.deepEqual(names(item), [], item);
});

test('to, a nie podobne', () => {
  const has = (item, yes, no) => { const n = names(item); for (const y of yes) assert.ok(n.includes(y), `${item} ma ${y}: ${n}`); for (const x of no) assert.ok(!n.includes(x), `${item} bez ${x}: ${n}`); };
  has('kurczak', ['Polski kurczak tuszka'], ['Filet pieczony z kurczaka Duda', 'Żołądki z polskiego kurczaka']);   // wędlina i podroby to nie kurczak
  has('szynka', ['Szynka wędzona na wiśniowo Kraina Wędlin'], ['Parówki z szynki Kraina Wędlin']);
  has('filet z piersi', ['Polski kurczak z chowu bez antybiotyków – filety z piersi Nasze Fermy'], ['Mintaj, filet bez skóry, XXL']);
  has('czekolada', ['Czekolada mleczna Milka'], ['Trufle czekoladowe J.D. Gross', 'Precle oblane czekoladą mleczną Alpen Gold']);
  has('sok', ['Sok pomarańczowy Hortex 100%'], ['Woda mineralna 20% soku Jurajska']);
});
