import { join, normalize } from "node:path"

import type { ApiError } from "../shared/api.js"
import { handleNames, handleTrend } from "./routes.js"

// The standalone server for local use: `bun run dev` and `bun run start`.
// On Vercel the frontend is static and api/*.ts serve the same handlers.

const DIST = join(import.meta.dir, "..", "dist")

const server = Bun.serve({
  hostname: "0.0.0.0",
  port: Number(process.env.PORT ?? 8787),
  // Bun's error page shows source code and file paths.
  development: false,
  // A cold cache needs a few hundred upstream calls before the first answer;
  // 255 seconds is the most Bun allows.
  idleTimeout: 255,
  routes: {
    "/api/names": { GET: handleNames },
    "/api/trend": { GET: handleTrend },
    "/api/*": () =>
      Response.json({ error: "Not found" } satisfies ApiError, { status: 404 }),
  },
  // Serves the built frontend; in development Vite does this instead.
  async fetch(request) {
    let path: string
    try {
      path = normalize(decodeURIComponent(new URL(request.url).pathname))
    } catch {
      return new Response("Bad request", { status: 400 })
    }
    const file = Bun.file(join(DIST, path))
    if (path !== "/" && (await file.exists())) return new Response(file)
    const index = Bun.file(join(DIST, "index.html"))
    if (await index.exists()) return new Response(index)
    return new Response("Run `bun run build` first.", { status: 404 })
  },
  error(error) {
    console.error(error.message)
    return new Response("Internal server error", { status: 500 })
  },
})

console.log(`API listening on ${server.url}`)
