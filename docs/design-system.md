# Koszyk DS

Apka stoi na małym design systemie. Zasada: **elementy są naczyniami połączonymi**. Każdy powtarzalny element ma jedną definicję, a zmiana w niej zmienia go wszędzie.

## Pliki

| Plik | Co jest w środku |
|---|---|
| `public/ds/tokens.css` | Wszystkie wartości: kolory (jasny i ciemny motyw), zaokrąglenia `--r-*`, odstępy `--s-*`, typografia `--fs-*` / `--fw-*`, wysokości kontrolek `--h-*`, cienie `--shadow-*`, ruch `--ease` / `--dur-*`. |
| `public/ds/components.css` | Komponenty zbudowane wyłącznie z tokenów: Button, Icon button, Chip, Badge, Card, Banner, Switch, Input. |
| `public/app.css` | Tylko układ widoków (gdzie co stoi). Bez własnych kolorów i rozmiarów kontrolek. |
| `public/ds.html` | Podgląd tokenów i komponentów (storybook). Ładuje te same pliki co apka. Adres: `/ds.html`. |

## Komponenty

| Komponent | Klasy | Gdzie w apce |
|---|---|---|
| Button | `btn` + `btn--primary` / `--secondary` / `--soft` / `--ghost` / `--danger`, rozmiary `--sm` / `--lg`, `--block` | Gazetki, Gotowe, W porządku, Doczytaj więcej, Wyczyść listę |
| Icon button | `ibtn` + te same warianty, rozmiary `--sm` / `--lg` / `--xl`, kropka `dot` | menu, mikrofon, wyślij, dodaj sklep |
| Chip | `chip`, stan `chip--on`, `chip--tile`, `chip--sm`, kropka sklepu `.dot`, flaga `.flag` | sklepy, działy w promocjach i gazetce, podpowiedzi |
| Badge | `badge` + `--promo` / `--warn` / `--info` / `--special` / `--neutral`, kształt `--pill` | rabat, warunki promocji, „najtaniej” |
| Banner | `banner` z `__icon`, `__text`, `__action` | „N produktów taniej” |
| Tile | `tile` + `--ink` / `--brand` / `--quiet`, części `__label`, `__title`, `__meta`, `__go` | kafle „Najtaniej dziś” i „Gazetka” |
| Offer | `offer` (+ `--flat`), części `__media`, `__name`, `__meta`, `__price`, `__action`; warunki w `.terms` | zamienniki, rozpiska sklepu, arkusz produktu |
| Card | `card` | grupowane powierzchnie |
| Switch | `switch` (po ukrytym checkboxie) | Moje sklepy |
| Input | `input` | dopisywanie, słownik |

## Zasady

- **Hierarchia akcji:** jedna akcja główna na ekranie (`primary`, zielona: mikrofon, Gotowe, W porządku). Pozostałe `secondary` (obrys): Gazetki, menu, dodaj sklep.
- **Wybrane = zieleń akcji:** aktywna pigułka (`chip--on`) ma tło `--cta`, jak mikrofon.
- **Kolor znaczy rolę:** zielony = promocja, żółty = warunek „kilka sztuk”, niebieski = karta lub aplikacja, fiolet = limit.
- **Nowy element:** najpierw komponent i wariant w `components.css` i w `ds.html`, potem użycie w widoku. W `app.css` nie definiujemy kolorów ani wymiarów kontrolek.
- **Każda informacja raz:** warunki promocji są w rzędzie etykiet pod nazwą; przy cenie stoi tylko rabat.
- **Dług projektowy** (do przeniesienia na komponenty): wiersz listy, panel promocji pod produktem, wiersze gazetki, arkusz (sheet), snackbar.
