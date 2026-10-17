// Kopia bieżących gazetek (ding.pl) dla klikalnej wersji demo, która działa bez serwera i nie może sama pytać ding.pl.
// Zapisuje demo/leaflets.json: { at, stores: { lidl: [...], biedronka: [...], kaufland: [...] } } w tym samym kształcie co /api/leaflet.
const fs = require('fs');
const path = require('path');
const catalog = require('../public/catalog.json');
const { leaflet } = require('../lib/promos');

(async () => {
  const out = { at: new Date().toISOString(), stores: {} };
  for (const s of catalog.stores) out.stores[s.id] = await leaflet(s.id);
  const file = path.join(__dirname, '..', 'demo', 'leaflets.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(out));
  console.log(Object.entries(out.stores).map(([id, v]) => `${id}: ${v.length}`).join(', '));
  if (!Object.values(out.stores).some(v => v.length)) process.exit(1);
})();
