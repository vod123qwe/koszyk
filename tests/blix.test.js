// Gazetki z blix.pl: lista gazetek sieci i produkty z gazetki (fragmenty prawdziwego HTML z 11.10.2026). Uruchom: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { leafletsIn, offersIn, day } = require('../lib/blix');

test('daty blix', () => {
  assert.equal(day('October 8, 2026 00:00'), '2026-10-08');
  assert.equal(day('December 31, 2026 23:59'), '2026-12-31');
  assert.equal(day(''), null);
});

const STORE = `
<div class="leaflet section-n__item" data-brand-name="Biedronka" data-brand-id="23" data-brand-slug="biedronka" data-leaflet-id="528570" data-leaflet-name="Od czwartku" data-date-start="October 8, 2026 00:00" data-date-end="October 14, 2026 23:59" data-page-number="1">
<a href="https://blix.pl/sklep/biedronka/gazetka/528621/" class="leaflet__link" title="Biedronka - gazetka promocyjna Zakupowe Inspiracje w Biedronce od piątku 09.10 do poniedziałku 12.10">
<a href="https://blix.pl/sklep/biedronka/gazetka/527160/" class="leaflet__link" title="Biedronka - gazetka promocyjna Od czwartku od czwartku 01.10 do środy 07.10">
<a href="https://blix.pl/sklep/biedronka/gazetka/527556/" class="leaflet__link" title="Biedronka - gazetka promocyjna Zakupowe Inspiracje w Biedronce od wtorku 06.10 ">
<div class="leaflet section-n__item" data-brand-name="Lidl" data-brand-id="9" data-brand-slug="lidl" data-leaflet-id="528603" data-leaflet-name="Od poniedziałku" data-date-start="October 12, 2026 00:00" data-date-end="October 14, 2026 23:59" data-page-number="1">
<a href="https://blix.pl/sklep/carrefour/gazetka/528579/" class="leaflet__link" title="Carrefour - gazetka promocyjna Gazetka Carrefour od poniedziałku 12.10 do soboty 17.10">`;

test('gazetki sieci: aktualne, tylko tej sieci, także z samych linków', () => {
  const ids = leafletsIn(STORE, 'biedronka', '2026-10-11', '2026-10-14').map(l => l.id).sort();
  // 528570 (karta z datami), 528621 (link do 12.10), 527556 (link bez końca, świeży); 527160 skończona, Lidl i Carrefour to inne sieci
  assert.deepEqual(ids, ['527556', '528570', '528621']);
});

const LEAF = `
<div class="offer section-n__item" data-name="Piwo Okocim" data-price="329" data-leaflet-id="528573" data-page-number="13" data-date-start="October 8, 2026 00:00" data-date-end="October 14, 2026 23:59">     <div class="offer__img-wrapper"> <img src="/placeholder.png" data-src="https://imgproxy.blix.pl/product_occurrence//f9db6ad9.jpg?bucket=400" alt="Piwo Okocim promocja w Biedronka" class="offer__img lazyload"> </div> <span class="offer__name">Piwo Okocim</span>
<div class="offer section-n__item offer--archival" data-name="Kawa ziarnista Classic Dallmayr" data-price="1999" data-leaflet-id="528573" data-page-number="1" data-date-start="October 8, 2026 00:00" data-date-end="October 10, 2026 23:59"> <img data-src="https://imgproxy.blix.pl/product_occurrence//262ec887.jpg?bucket=400"> <span class="offer__name">Kawa ziarnista Classic Dallmayr</span>
<div class="offer section-n__item" data-name="Produkty Cif i Domestos" data-price="" data-leaflet-id="528573" data-page-number="14" data-date-start="October 8, 2026 00:00" data-date-end="October 14, 2026 23:59"> <span class="offer__name">Produkty Cif i Domestos</span>
<div class="offer section-n__item" data-name="Ser Gouda &amp; Edam" data-price="1299" data-leaflet-id="528573" data-page-number="20" data-date-start="October 12, 2026 00:00" data-date-end="October 14, 2026 23:59"> <span class="offer__name">Ser Gouda &amp; Edam</span>`;

test('produkty z gazetki: z ceną, aktualne, ze zdjęciem', () => {
  const out = offersIn(LEAF, '2026-10-11', '2026-10-14');
  assert.deepEqual(out.map(o => [o.name, o.price, o.duration.begin, o.duration.end, !!o.image]), [
    ['Piwo Okocim', 3.29, '2026-10-08', '2026-10-14', true],
    ['Ser Gouda & Edam', 12.99, '2026-10-12', '2026-10-14', false]]);
  assert.equal(out[0].image, 'https://imgproxy.blix.pl/product_occurrence//f9db6ad9.jpg?bucket=400');
});
