// Rozumienie dyktowanej listy przez Claude: poprawia błędy rozpoznawania mowy, rozdziela produkty, wyciąga ilości, przypisuje
// kategorie z naszej listy i dopytuje tylko przy prawdziwych wątpliwościach. Wynik w ustalonym schemacie JSON (structured outputs).
let Anthropic = null;
try { Anthropic = require('@anthropic-ai/sdk'); Anthropic = Anthropic.default || Anthropic; } catch (e) { /* bez SDK = tylko parser lokalny */ }
const catalog = require('../public/catalog.json');

const client = (Anthropic && (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)) ? new Anthropic() : null;
const MODEL = process.env.KOSZYK_MODEL || 'claude-opus-5-5';
const CAT_IDS = catalog.categories.map(c => c.id);

const SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nazwa produktu po polsku, w mianowniku, tak jak na liście zakupów (np. "Ziemniaki", "Mleko 2%", "Masło").' },
          qty: { type: ['number', 'null'], description: 'Ilość, tylko jeśli padła w wypowiedzi.' },
          unit: { type: ['string', 'null'], description: 'Jednostka: kg, dag, g, l, ml, szt, op, puszki, butelki, słoiki, bochenki, kostki; null gdy brak.' },
          category: { type: 'string', enum: CAT_IDS },
          emoji: { type: ['string', 'null'], description: 'Jedno emoji przedstawiające ten produkt, gdy jest oczywiste (🥛 mleko, 🥖 bagietka, 🧻 papier toaletowy); null, gdy nie pasuje żadne.' },
          note: { type: ['string', 'null'], description: 'Krótki dopisek usłyszany przy produkcie (marka, rodzaj), inaczej null.' },
          question: { type: ['string', 'null'], description: 'Krótkie pytanie, tylko gdy produkt jest naprawdę niejasny lub słowo mogło zostać źle usłyszane.' },
          options: { type: 'array', items: { type: 'string' }, description: '2-3 krótkie odpowiedzi na pytanie (gotowe nazwy produktów); pusta tablica, gdy brak pytania.' },
        },
        required: ['name', 'qty', 'unit', 'category', 'emoji', 'note', 'question', 'options'],
        additionalProperties: false,
      },
    },
    remove: { type: 'array', items: { type: 'string' }, description: 'Nazwy produktów, które użytkownik każe usunąć z listy (np. "skreśl mleko").' },
  },
  required: ['items', 'remove'],
  additionalProperties: false,
};

const SYSTEM = `Jesteś modułem listy zakupów. Dostajesz surowy tekst z rozpoznawania mowy (po polsku), często bez przecinków i z błędami słuchu.
Zamień go na produkty do kupienia.

Zasady:
- Rozdziel produkty, nawet gdy padły jednym ciągiem ("mleko chleb dwa kilo ziemniaków" to trzy produkty).
- Popraw ewidentne błędy rozpoznawania mowy po brzmieniu i kontekście zakupów (np. "my dło" → "Mydło", "ser żółty" zamiast "ser żuty").
- Gdy mówiący się poprawia, zostaw tylko poprawioną wersję: "Soft tempera. Sok tymbark." to jeden produkt "Sok Tymbark" (pierwsza fraza brzmi podobnie i nie jest produktem). Tak samo "nie, jednak" lub "znaczy".
- Kategorię "dom" (Dom i inne) dawaj tylko w ostateczności, dla rzeczy naprawdę nieprzypisywalnych. Marki rozpoznawaj po tym, co sprzedają: Tymbark to napoje, Milka słodycze, Fairy chemia, Pampers dla dziecka.
- Obce nazwy i marki zapisuj poprawnie, nawet gdy przyszły fonetycznie ("łyski" → "Whisky", "keczup" → "Ketchup", "koka kola" → "Coca-Cola", "mocarella" → "Mozzarella").
- Nazwa w mianowniku, krótko, z wielkiej litery. Liczba mnoga, gdy naturalna ("Jajka", "Ziemniaki", "Banany").
- Ilość i jednostkę podawaj tylko, gdy padły ("dwa kilo" → 2, "kg"; "sześć jajek" → 6, "szt"; "pół kilo" → 0.5, "kg"). Nie wymyślaj ilości.
- Kategoria zawsze z podanej listy: dobierz tę, w której produkt zwykle leży w sklepie.
- Emoji: jedno, konkretne dla produktu (nie dla działu), tylko gdy dobrze pasuje.
- Pytanie zadawaj oszczędnie: tylko gdy słowo mogło znaczyć różne produkty albo zostało prawdopodobnie źle usłyszane. Wtedy dodaj produkt w najbardziej prawdopodobnej wersji, a w options daj 2-3 gotowe alternatywy (pierwsza = ta, którą wpisałeś).
- Polecenia usunięcia ("skreśl", "usuń", "jednak bez") wpisz do remove, nie do items.
- Nie dodawaj niczego, czego użytkownik nie powiedział. Słowa-wypełniacze ("eee", "jeszcze", "i coś") pomijaj.
- Jeśli produkt jest już na obecnej liście, nie dubluj go, chyba że użytkownik wyraźnie chce więcej.

Kategorie: ${catalog.categories.map(c => `${c.id} (${c.name})`).join(', ')}.`;

async function aiParse(text, ctx = {}) {
  if (!client) return null;
  const known = (ctx.known || []).slice(0, 80).join(', '), onList = (ctx.onList || []).slice(0, 80).join(', ');
  const user = `${known ? `Produkty, które ta rodzina zwykle kupuje (używaj tych nazw, gdy pasują): ${known}\n` : ''}${onList ? `Już na liście: ${onList}\n` : ''}Dyktowane: """${String(text).slice(0, 2000)}"""`;
  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',   // (gdy filtr bezpieczeństwa odmówi, API samo ponawia na zalecanym modelu)
    system: SYSTEM,
    messages: [{ role: 'user', content: user }],
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
  });
  if (res.stop_reason === 'refusal') return null;
  const txt = res.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const out = JSON.parse(txt);
  out.items = (out.items || []).filter(i => i && i.name && CAT_IDS.includes(i.category));
  out.source = 'ai';
  return out;
}

module.exports = { aiParse, aiOn: !!client };
