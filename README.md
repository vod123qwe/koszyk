# Koszyk

Wspólna lista zakupów (PWA). Dyktujesz, a produkty same układają się w kolejności sklepu. Do tego promocje z gazetek Lidla, Biedronki i Kauflandu.

Decyzje projektowe: `docs/plan.md`.

## Lokalnie

```
npm install
node server.js        # http://localhost:8820, PIN dev 1234
```

Dane lokalnie: `data/db.json` (poza repo).

Testy parsera dyktowania: `npm test`.

## Produkcja (Render)

Repo ma `render.yaml` (Blueprint). Pierwsze uruchomienie:

1. Render → **New → Blueprint** → wybierz repo `vod123qwe/koszyk`.
2. Uzupełnij zmienne, o które poprosi:
   - `KOSZYK_PIN` — PIN do listy (np. `1234`).
   - `GITHUB_TOKEN` — token GitHuba z uprawnieniem **gist** (github.com/settings/tokens). Bez niego dane znikną przy restarcie, bo dysk Rendera jest ulotny.
   - `ANTHROPIC_API_KEY` — opcjonalnie. Puste = dyktowanie dzieli lokalny parser. Z kluczem rozumie Claude.
   - `GIST_ID` — ID prywatnego Gista z plikiem `koszyk-db.json` (dane listy). Nie trzymamy go w repo, bo repo jest publiczne.

Każdy push na `main` wdraża się sam (1–3 min). Darmowy plan usypia serwer po bezczynności: pierwsze wejście po przerwie trwa kilkanaście sekund.

## Struktura

- `server.js` — Node bez frameworka: PIN + token, synchronizacja per pozycja, `/api/parse`, `/api/promos`.
- `lib/local-parse.js` — parser dyktowania bez AI. `lib/ai.js` — parser z Claude.
- `lib/promos.js` — promocje z ding.pl (nieoficjalne API, może się zmienić).
- `public/` — apka (vanilla JS, bez buildu). `public/catalog.json` — działy, sklepy, słowa kluczowe, marki, emoji, słownik dyktowania.
