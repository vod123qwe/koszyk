// Gazetka Lidla z PDF: układy stron przepisane z prawdziwej gazetki z 12.10.2026 (pozycje i rozmiary tekstu z PDF.js). Uruchom: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePage, headerDates, nameOf } = require('../lib/lidl');

const FLYER = { offerStartDate: '2026-10-12', offerEndDate: '2026-10-14' };
const it = (s, x, y, t) => ({ s, x, y, t, w: t.length * s * 0.45 });
const short = o => [o.name, o.price, o.oldPrice, o.duration.begin, o.duration.end];

test('daty z nagłówków', () => {
  assert.deepEqual(headerDates('Od poniedziałku, 12.10 do 17.10', 2026, 10), ['2026-10-12', '2026-10-17']);
  assert.deepEqual(headerDates('Tylko w poniedziałek, 12.10', 2026, 10), ['2026-10-12', '2026-10-12']);
  assert.deepEqual(headerDates('Od czwartku, 15.10', 2026, 10), ['2026-10-15', null]);
  assert.deepEqual(headerDates('Od pon., 29.12 do sob., 03.01', 2026, 12), ['2026-12-29', '2027-01-03']);
});

test('nazwa: najpierw produkt, marka na końcu', () => {
  assert.equal(nameOf(['PILOS', 'Masło ekstra 83%']), 'Masło ekstra 83% Pilos');
  assert.equal(nameOf(['J.D. GROSS', 'Trufle czekoladowe']), 'Trufle czekoladowe J.D. Gross');
  assert.equal(nameOf(['Praliny*', 'FERRERO ROCHER']), 'Praliny Ferrero Rocher');
  assert.equal(nameOf(['Kiwi Gold']), 'Kiwi Gold');
});

// str. 11: dwa produkty jeden pod drugim, każdy pod własnym nagłówkiem z datami, cena pod nazwą, kupon Lidl Plus
test('cena pod nazwą, osobne nagłówki', () => {
  const page = [
    it(19, 119, 763, 'Tylko w poniedziałek, 12.10'),
    it(10, 15, 690, 'PILOS'), it(10, 14, 678, 'Masło ekstra 83%'), it(8, 14, 668, '200 g'), it(8, 14, 658, '100 g = 1,25'),
    it(8, 14, 648, 'Cena przed obniżką/cena poza promocją:'), it(8, 14, 638, '4,99/opak., 100 g = 2,50'), it(8, 14, 628, '* cena za 1 opak. przy zakupie 3 opak.'),
    it(8, 14, 618, 'Limit: 3 opak. na kupon.'), it(8, 14, 608, 'Szczegóły promocji dostępne w aplikacji Lidl Plus.'),
    it(11, 19, 588, 'Aktywuj kupon'), it(48, 19, 536, '-50%'), it(16, 19, 514, 'przy zakupie 3'), it(80, 14, 441, '2,49*'), it(16, 133, 486, '4,99'),
    it(19, 102, 388, 'Od poniedziałku, 12.10 do 17.10'),
    it(10, 14, 310, 'Mleko zambrowskie UHT 3,2%'), it(8, 14, 300, '1 L'), it(8, 14, 290, 'Najniższa cena z 30 dni przed obniżką/'), it(8, 14, 280, 'cena poza promocją: 3,99/opak.'),
    it(8, 14, 270, '* cena za 1 opak. przy zakupie 6 opak.'), it(11, 19, 220, 'Aktywuj kupon'), it(48, 19, 169, '-50%'), it(16, 19, 146, 'przy zakupie 6'),
    it(80, 14, 74, '1,99*'), it(16, 129, 118, '3,99'), it(6, 14, 22, 'Produkty prezentowane w materiale reklamowym znajdują się w sprzedaży')];
  const out = parsePage(page, FLYER).map(short);
  assert.deepEqual(out.sort(), [['Masło ekstra 83% Pilos', 2.49, 4.99, '2026-10-12', '2026-10-12'], ['Mleko zambrowskie UHT 3,2%', 1.99, 3.99, '2026-10-12', '2026-10-17']].sort());
  assert.match(parsePage(page, FLYER).find(o => /Masło/.test(o.name)).description, /przy zakupie 3.*Tylko z aplikacją/);
});

// str. 77: cena poprzedniego produktu wypada tuż nad nazwą następnego; kotwicą jest mała cena „przed” powtórzona w opisie
test('cena pod nazwą, sąsiad tuż nad nazwą', () => {
  const page = [
    it(10, 14, 473, 'SMAKMAK'), it(10, 14, 462, 'Flaki cielęce'), it(8, 14, 450, '500 g'), it(8, 14, 440, '1 kg = 19,98'),
    it(8, 14, 430, '* cena przed obniżką/ cena poza promocją:'), it(8, 14, 420, '11,99/opak., 1 kg = 23,98'),
    it(13, 17, 380, 'Od pon., 12.10'), it(13, 17, 367, 'do śr., 14.10'), it(30, 17, 335, '-16'), it(10, 85, 320, '11,99*'), it(50, 14, 292, '9,99'),
    it(10, 14, 245, 'RZEŹNIK'), it(10, 14, 234, 'Polski królik –'), it(10, 14, 222, 'tuszka z podrobami'), it(8, 14, 211, '1 kg'),
    it(8, 14, 201, '* cena przed obniżką/ cena poza promocją:'), it(8, 14, 191, '1 kg = 34,99'),
    it(13, 17, 150, 'Od pon., 12.10'), it(13, 17, 137, 'do sob., 17.10'), it(30, 17, 106, '-14'), it(10, 108, 90, '34,99*'), it(50, 14, 62, '29,90')];
  assert.deepEqual(parsePage(page, FLYER).map(short).sort(), [
    ['Flaki cielęce Smakmak', 9.99, 11.99, '2026-10-12', '2026-10-14'],
    ['Polski królik – tuszka z podrobami Rzeźnik', 29.9, 34.99, '2026-10-12', '2026-10-17']].sort());
});

// str. 53: cena nad nazwą, obok „to wychodzi za sztukę” przy 1+1; mango z ceną obok
test('cena nad nazwą, 1+1 gratis', () => {
  const page = [
    it(19, 101, 763, 'Od poniedziałku, 12.10 do 14.10'),
    it(50, 23, 628, '1 + 1'), it(25, 118, 628, 'gratis'), it(12, 125, 603, 'To wychodzi'), it(12, 125, 591, 'za sztukę'),
    it(50, 14, 552, '5,99'), it(48, 125, 552, '2,99'), it(10, 14, 528, 'Awokado zielone'), it(8, 14, 516, '1 szt.'), it(8, 14, 506, 'Cena poza promocją: 5,99/szt.'),
    it(50, 23, 214, '1 + 1'), it(25, 118, 214, 'gratis'), it(50, 14, 138, '3,49'), it(48, 125, 138, '1,74'),
    it(10, 360, 134, 'Mango, luzem'), it(8, 360, 122, '1 kg'), it(8, 360, 112, '* cena przed obniżką/ cena poza promocją: 1 kg = 12,99'),
    it(10, 14, 114, 'Kiwi Gold'), it(8, 14, 102, '1 szt.'), it(8, 14, 92, 'Cena poza promocją: 3,49/szt.'), it(30, 251, 108, '-30'), it(10, 319, 90, '12,99*'), it(50, 248, 62, '8,99')];
  const out = parsePage(page, FLYER);
  const by = n => out.find(o => o.name === n);
  assert.equal(by('Mango, luzem').price, 8.99); assert.equal(by('Mango, luzem').oldPrice, 12.99);
  assert.ok([5.99, 2.99].includes(by('Awokado zielone').price)); assert.match(by('Awokado zielone').description, /1\+1 gratis/);
  assert.ok([3.49, 1.74].includes(by('Kiwi Gold').price));
});

test('piwo po marce', () => {
  const page = [it(10, 14, 400, 'Lech'), it(8, 14, 390, '500 ml'), it(8, 14, 380, 'Cena poza promocją: 4,89/pusz., + kaucja 0,50 zł'), it(50, 14, 330, '4,19')];
  assert.equal(parsePage(page, FLYER)[0].name, 'Piwo Lech');
});
