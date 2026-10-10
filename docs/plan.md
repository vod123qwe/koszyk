# Koszyk: decyzje (10.10.2026)

Wspólna lista zakupów dla rodziny: szybkie dyktowanie, lista ułożona jak w sklepie, promocje i podpowiedzi.

| Temat | Decyzja |
|---|---|
| Forma | Osobna lekka PWA (nie moduł Pot). Mobile-first, działa też na desktopie. |
| Użytkownicy | Rodzina, kilka telefonów, jedna wspólna lista. PIN + token na urządzenie (jak Pot). |
| Hosting | Node bez frameworka na Render; dane w `data/db.json` + kopia w Gist (`GIST_ID`, `GITHUB_TOKEN`), bo dysk Render jest ulotny. Sync co 4 s, per pozycja, ostatni zapis wygrywa. |
| Dyktowanie | Przytrzymaj mikrofon i mów (Web Speech API, `pl-PL`); puszczasz, tekst idzie na serwer. Pole tekstowe jako zapas (i dla mikrofonu z klawiatury). |
| Rozumienie | Claude (`claude-opus-5-5`, effort `low`, structured outputs, `fallbacks: "default"`): rozdziela produkty, poprawia błędy słuchu, ilości tylko gdy padły, kategoria z ustalonej listy. Bez klucza: prosty parser lokalny (`lib/local-parse.js`). |
| Niejasności | AI poprawia samo; przy prawdziwej wątpliwości dodaje produkt z pytaniem i 2-3 odpowiedziami do kliknięcia. |
| Sklepy | Tylko Lidl, Biedronka, Kaufland (decyzja Jarka). |
| Kolejność działów | Startowa kolejność per sieć + nauka z odhaczania: każda wizyta (≥3 działy w 3 h) zapisuje kolejność; lista sortuje się wg średniej pozycji. Można też przeciągnąć działy ręcznie albo wrócić do domyślnej. |
| Ilości | Tylko gdy powiesz („2 kilo ziemniaków”). |
| Promocje | Automatycznie z ding.pl (nieoficjalne GraphQL `api.ding.pl/graphql`, filtr `contractorIds`: Lidl 130, Biedronka 79, Kaufland 138). Szukamy po pierwszym słowie nazwy, cache 6 h, po 4 zapytania naraz. Może się zepsuć przy zmianie ich API: wtedy apka po prostu nie pokazuje promocji. |
| Podpowiedzi | Chipsy „Może też?”: z promocji (produkty, które kupujecie, a są taniej), z rytmu kupowania (dawno nie było mleka), najczęstsze. |
| Styl | Jak w labie: minimalizm, ikonki kategorii w tintach, duże pola klikalne, jasny i ciemny motyw; animacje użyteczne (skreślenie: kółko + przekreślenie + mały wybuch, potem pozycja odpływa do „W koszyku”). |

## Uruchomienie

```
cd koszyk
npm install
node server.js            # http://localhost:8820, PIN 1234
```

Env: `KOSZYK_PIN` (4 cyfry), `ANTHROPIC_API_KEY` (AI), `GIST_ID` + `GITHUB_TOKEN` (trwałe dane na Render), `PORT`.

## Decyzje z 10.10.2026 (v3)

| Temat | Decyzja |
|---|---|
| Dyktowanie bez AI | Parser lokalny dzieli mowę ciągiem: ilości i jednostki (też „kilogram jabłek”, „1,5 litra”, „2kg”, „x2”), dopełniacz → mianownik, odmiany przy nazwie („ser feta”, „makaron penne”), przyimki trzymają nazwę („pierś z kurczaka”), cel to notatka („jabłka do szarlotki”), samopoprawki („Soft tempera. Sok tymbark.” → sok), usuwanie głosem („usuń / wykreśl / już mam …”). Testy: `npm test`. |
| Słownik dyktowania | Wbudowane zapisy fonetyczne (łyski → whisky) w `catalog.aliases` + słownik rodziny w ustawieniach; uczy się z przycisku „Zmień”. |
| Baza produktów | `catalog.json`: słowa kluczowe od początku wyrazu, marki (`brands`), rzeczy spoza spożywki (`nonfood`), odmiany (`varieties`), ~590 emoji. Sprawdzone na ~370 nazwach z gazetek. |
| Promocje | Cała bieżąca gazetka sieci (ding.pl, fraza `*`), tylko spożywka i drogeria; ładowana przy starcie serwera i co 6 h. Ranking: to, co kupujesz → największe obniżki, najwyżej 2 z działu na górze. Cała gazetka w arkuszu z wyszukiwarką. |
| Nasłuch | Póki przycisk trzymany, rozpoznawanie wznawia się po pauzie; po puszczeniu kończy się zawsze (awaryjnie po 1,5 s). |
| Bezpieczeństwo listy | „Wyczyść całą listę” z potykaczem i „Cofnij” przez kilka sekund. |
| Repo | Publiczne `vod123qwe/koszyk`; `GIST_ID` tylko w env, nie w repo. |

## Dalej

- Render (Blueprint) i test na prawdziwych telefonach (Android Chrome, iPhone Safari).
- Klucz `ANTHROPIC_API_KEY` (opcjonalnie), gdy parser lokalny okaże się za słaby.
- V2: skład dań z Pot jako podpowiedzi, „zwykłe zakupy” jednym kliknięciem, kilka list.
