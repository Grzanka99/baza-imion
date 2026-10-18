// A name's page (/imie/:name, rewritten here in vercel.json). vercel.json
// also ships the built index.html with the function, at the same path it has
// in the repository.
import { join } from "node:path"

import { namePageHandler } from "@baza-imion/server/handlers"

export const GET = namePageHandler(
  join(process.cwd(), "apps/web/dist/index.html")
)
