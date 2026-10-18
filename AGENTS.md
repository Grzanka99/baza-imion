# Baza imion

Baza imion lets people search and rank first names given in Poland, using
PESEL registry data from dane.gov.pl: names of the whole living population,
and names given to newborns since 2000.

`apps/server` downloads the CSV files from dane.gov.pl, ranks the names, and
answers `/api/names` and `/api/trend`. It caches answers in process memory and
in Turso. `apps/web` is the React page: a filtered, sortable name table, a
random rare name, each name's trend year by year, and favorites.
`packages/shared` holds the types both sides share. On Vercel, the functions
in `api/` call the built server.

Code here branches with `if`/`else`, never the ternary operator, and every
`if`, `else`, `for` and `while` body sits in `{}`; lint enforces both. Text is
handled with string methods (`split`, `startsWith`, `includes`, `slice`) in
place of regex, which stays only where nothing else fits.

Vite+ (`vp`) runs install, dev, build, and `vp check` (format, lint, types).
At each commit, `vp staged` stops any staged file over 5,000 tokens (bytes / 4)
and explains how to split it. It skips files marked `linguist-generated` in
`.gitattributes`: the lockfile and the shadcn components in
`apps/web/src/components/ui`.
