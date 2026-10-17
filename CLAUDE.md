# Koszyk: jak pracujemy

- **Zmiany idą od razu na produkcję** (decyzja właściciela z 17.10.2026). Gałąź `claude/…` → pull request do `main` → od razu scal; Render wdraża `main` sam w 1–3 min. Przed scaleniem: `npm test` i sprawdzenie zmiany w przeglądarce.
- Zmiana plików w `public/` = podbij `?v=` w `public/index.html`, żeby telefony nie trzymały starych plików.
- Po każdej zmianie apki przebuduj demo (`node demo/build.mjs`) i opublikuj `demo/dist/koszyk-demo.html` pod tym samym linkiem: https://claude.ai/artifact/VpK7wD2wyP9VwoXNdakwkC. Kopię gazetek odświeża workflow „Demo leaflets snapshot” (Actions → Run workflow).
- Decyzje projektowe: `docs/plan.md`. Design system: `docs/design-system.md` (nowe elementy najpierw w `public/ds/`).
