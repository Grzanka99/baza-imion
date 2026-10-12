# Baza imion

Wyszukiwarka i ranking imion nadanych dzieciom w Polsce w latach 2000–2019,
na podstawie [danych z rejestru PESEL](https://api.dane.gov.pl/1.4/resources/21458,imiona-nadane-dzieciom-w-polsce-w-latach-2000-2019-imie-pierwsze)
udostępnianych przez dane.gov.pl.

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

Bez tych zmiennych używany jest lokalny plik `cache.sqlite`.

Wersja produkcyjna (jeden serwer na porcie `PORT`, domyślnie 8787):

```sh
bun run build
bun run start
```

## Jak to działa

- `src/` – interfejs (React, shadcn/ui na Radix).
- `server/` – pośrednik między interfejsem a dane.gov.pl. Pobiera dane
  rocznikami, liczy miejsca w rankingu, udziały i sumy, a odpowiedzi API
  trzyma przez 10 dni w bazie [Turso](https://turso.tech).
- `shared/` – typy wspólne dla obu części.

| Endpoint | Parametry |
|---|---|
| `GET /api/names` | `year` (2000–2019 lub `all`), `sex` (`all`, `M`, `K`), `q`, `sort` (`count`, `name`), `order` (`desc`, `asc`), `page`, `perPage` |
| `GET /api/trend` | `name` |
