// Builds the clickable Koszyk demo as one self-contained page for an Artifact: the app's CSS and JS inlined (with the DS files),
// the API answered in the browser (shim.js), the catalog, the server's parsing/matching modules and the leaflet snapshot embedded.
// Usage: node demo/build.mjs [out.html]   (default: demo/dist/koszyk-demo.html; then publish that file as the Artifact)
import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname), repo = path.join(here, '..');
const out = process.argv[2] || path.join(here, 'dist', 'koszyk-demo.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
const read = p => fs.readFileSync(path.join(repo, p), 'utf8');
const safe = s => s.replace(/<\/(script|style)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');   // (nothing may close the inline tag early)

// (offer photos come from shops' servers, which an artifact may not load: without them the app draws the aisle's tile)
const leaf = JSON.parse(read('demo/leaflets.json'));
for (const id of Object.keys(leaf.stores)) leaf.stores[id] = leaf.stores[id].map(({ image, ...o }) => o);
const day = new Date(leaf.at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Warsaw' });

const modules = '{' + ['local-parse', 'promo-cond', 'promos'].map(m => `\n'./${m}': function (module, exports, require) {\n${read(`lib/${m}.js`)}\n}`).join(',') + '}';
const shim = fs.readFileSync(path.join(here, 'shim.js'), 'utf8')
  .replace('__CATALOG__', () => JSON.stringify(JSON.parse(read('public/catalog.json'))))
  .replace('__LEAFLETS__', () => JSON.stringify(leaf))
  .replace('__MODULES__', () => modules);

// (the DS switcher is an ES module import: inline it into the app's own module)
const switcherSrc = read('public/ds/switcher.js').replace(/^export function/m, 'function');
let app = read('public/app.js');
const imp = /^import \{ switcher \} from '\.\/ds\/switcher\.js[^']*';\n/m;
if (!imp.test(app)) throw new Error('switcher import not found in app.js');
app = app.replace(imp, () => switcherSrc + '\n')
  .replace(/\nif \('serviceWorker' in navigator[^\n]*/, '');   // (no service workers inside an artifact)

const icon = 'data:image/svg+xml,' + encodeURIComponent(read('public/icon.svg'));
const css = ['public/ds/tokens.css', 'public/ds/components.css', 'public/app.css'].map(read).join('\n');

const page = `<title>Koszyk</title>
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="${icon}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Onest:wght@400..800&display=swap" rel="stylesheet">
<style>
${safe(css)}
/* demo */
:root.dark { color-scheme: dark; }
body { font-size: 16px; }
.demo-note { background: var(--soft); border-bottom: 1px solid var(--line); color: var(--muted); font-size: 12.5px; line-height: 1.45; }
.demo-note .c { padding-block: 8px; }
.demo-note b { color: var(--ink); font-weight: 600; }
</style>
<div class="demo-note"><div class="c"><b>Wersja demo.</b> Lista zapisuje się tylko w tej przeglądarce, na start ma kilka przykładowych produktów. Promocje to kopia gazetek z ${day}. Mikrofon tu nie działa, więc wpisuj produkty w pole na dole (na telefonie zadziała dyktowanie z klawiatury).</div></div>
<div id="app"></div>
<script>
${safe(shim)}
</script>
<script type="module">
${safe(app)}
</script>
`;
fs.writeFileSync(out, page);
console.log(out, (page.length / 1024).toFixed(0) + ' KB', 'leaflets:', day, Object.entries(leaf.stores).map(([k, v]) => `${k} ${v.length}`).join(', '));
