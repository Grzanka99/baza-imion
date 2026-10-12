# Baza imion

Wyszukiwarka i ranking imion w Polsce na podstawie danych z rejestru PESEL
udostępnianych przez dane.gov.pl:

- **Cała populacja** – imiona wszystkich żyjących osób, stan na styczeń
  każdego roku od 2019 ([zbiór 1667](https://dane.gov.pl/pl/dataset/1667)).
- **Noworodki** – imiona nadane dzieciom w latach 2000–2025
  ([zbiór 219](https://dane.gov.pl/pl/dataset/219)).

## Uruchomienie

Wymaga [Bun](https://bun.sh).

```sh
bun install
bun run dev      # interfejs: http://localhost:5173, API: http://localhost:8787
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
bun run build
bun run start
```

## Wdrożenie na Vercel

Repozytorium jest gotowe do importu w Vercel (`vercel.json`): interfejs jest
budowany jako statyczna strona, a `api/names.ts` i `api/trend.ts` działają
jako funkcje Node.js.

1. Zaimportuj repozytorium w Vercel (framework: Vite, wykryje się sam).
2. W ustawieniach projektu dodaj zmienne środowiskowe `TURSO_URL`
   i `TURSO_TOKEN` (Production i Preview).
3. Wdróż.

Bez Turso każda nowo uruchomiona instancja funkcji pobierałaby dane
z dane.gov.pl od zera.

## Jak to działa

- `src/` – interfejs (React, shadcn/ui na Radix).
- `api/` – punkty wejścia funkcji Vercel; korzystają z kodu w `server/`.
- `server/` – pośrednik między interfejsem a dane.gov.pl. Pobiera dane
  rocznikami, liczy miejsca w rankingu, udziały i sumy, a odpowiedzi API
  trzyma przez 10 dni w bazie [Turso](https://turso.tech).
- `shared/` – typy wspólne dla obu części.

| Endpoint | Parametry |
|---|---|
| `GET /api/names` | `dataset` (`population`, `children`), `year` (rok lub `all` dla noworodków), `sex` (`all`, `M`, `K`), `q`, `sort` (`count`, `name`), `order` (`desc`, `asc`), `page`, `perPage` |
| `GET /api/trend` | `dataset`, `name` |

Nowy rocznik danych wymaga dopisania identyfikatorów plików w
`server/sources.ts` i roku w `shared/api.ts`.
