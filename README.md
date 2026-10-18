# Baza imion

Wyszukiwarka i ranking imion w Polsce na podstawie danych z rejestru PESEL
udostępnianych przez dane.gov.pl:

- **Cała populacja** – imiona wszystkich żyjących osób, stan na styczeń
  każdego roku od 2020 i na lipiec 2019
  ([zbiór 1667](https://dane.gov.pl/pl/dataset/1667)).
- **Noworodki** – imiona nadane dzieciom w latach 2000–2025
  ([zbiór 219](https://dane.gov.pl/pl/dataset/219)).

## Uruchomienie

Wymaga [Vite+](https://viteplus.dev) (`vp`).

```sh
vp install
vp run dev       # interfejs: http://localhost:5173, API: http://localhost:8787
```

Pamięć podręczna trafia do bazy Turso wskazanej w pliku `.env`:

```sh
TURSO_URL=libsql://…
TURSO_TOKEN=…
```

Bez tych zmiennych pamięć podręczna działa tylko w pamięci procesu i znika
po jego restarcie.

Wersja produkcyjna (jeden serwer na porcie `PORT`, domyślnie 8787):

```sh
vp run build
vp run start
```

Formatowanie, lint i typy sprawdza `vp check`.

Hak pre-commit (`.vite-hooks/pre-commit`, instalowany przez `vp install`)
odrzuca dodane do commita pliki większe niż 5000 tokenów (20 000 bajtów).
Pomija pliki oznaczone `linguist-generated` w `.gitattributes`.

## Wdrożenie na Vercel

Repozytorium jest gotowe do importu w Vercel (`vercel.json`): interfejs jest
budowany jako statyczna strona, a `api/names.js` i `api/trend.js` działają
jako funkcje Node.js (wywołują zbudowany `apps/server`).

1. Zaimportuj repozytorium w Vercel.
2. W ustawieniach projektu dodaj zmienne środowiskowe `TURSO_URL`
   i `TURSO_TOKEN` (Production i Preview).
3. Opcjonalnie: statystyki Umami (bez ciasteczek) – zmienna
   `VITE_UMAMI_WEBSITE_ID` tylko dla Production. Bez niej statystyki są
   wyłączone.
4. Wdróż.

Bez Turso każda nowo uruchomiona instancja funkcji pobierałaby dane
z dane.gov.pl od zera.

## Jak to działa

Monorepo Vite+ (pnpm workspace):

- `apps/web/` – interfejs (React, shadcn/ui na Radix).
- `apps/server/` – pośrednik między interfejsem a dane.gov.pl. Pobiera dane
  całymi plikami CSV, liczy miejsca w rankingu, udziały i sumy.
- `packages/shared/` – typy wspólne dla obu części.
- `api/` – punkty wejścia funkcji Vercel; korzystają ze zbudowanego
  `apps/server`. Vercel szuka funkcji tylko w `api/` w katalogu głównym.
- `vite.config.ts` – formatowanie i lint dla całego repozytorium.

```
apps/server/src/
  index.ts      samodzielny serwer Node (lokalnie i `vp run start`)
  http/         obsługa zapytań: odczyt parametrów, odpowiedzi JSON, błędy
  names/        dane o imionach: wczytywanie roczników, ranking, lista, trend
  upstream/     pobieranie i czytanie plików CSV z dane.gov.pl
  cache/        pamięć podręczna: pamięć procesu i baza Turso

apps/web/src/
  App.tsx       układ strony; łączy stan widoku z komponentami
  api-client/   zapytania do serwera i pamięć odpowiedzi w przeglądarce
  features/
    filters/      zbiór danych, wyszukiwarka, płeć, rok, losowanie imienia
    names-list/   tabela imion, podsumowanie, stronicowanie
    name-trend/   panel imienia: wykres i tabela rok po roku
    favorites/    ulubione imiona
  components/   elementy wspólne; `ui/` to komponenty shadcn/ui
  hooks/        stan widoku w adresie strony, pasek na telefonie
  lib/          formatowanie liczb i imion, etykiety
```

Żeby ograniczyć liczbę zapytań, odpowiedzi są zapamiętywane na każdym etapie:

| Gdzie                         | Na jak długo                         | Co oszczędza             |
| ----------------------------- | ------------------------------------ | ------------------------ |
| przeglądarka (`localStorage`) | 7 dni, do następnej wersji aplikacji | zapytania do serwera     |
| CDN Vercel                    | 7 dni, do następnego wdrożenia       | uruchomienia funkcji     |
| pamięć procesu serwera        | 10 dni albo do restartu              | zapytania do bazy        |
| baza Turso                    | 10 dni                               | zapytania do dane.gov.pl |

| Endpoint         | Parametry                                                                                                                                                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/names` | `dataset` (`population`, `children`), `year` (rok lub `all` dla noworodków), `sex` (`all`, `M`, `K`), `q`, `sort` (`count`, `name`), `order` (`desc`, `asc`), `page`, `perPage`, `random=1` (jedno losowe, rzadkie imię), `names` (tylko podane imiona, po przecinku) |
| `GET /api/trend` | `dataset`, `name`                                                                                                                                                                                                                                                     |

Nowy rocznik danych wymaga dopisania identyfikatorów plików w
`apps/server/src/upstream/resource-ids.ts` i roku w
`packages/shared/src/index.ts`.
