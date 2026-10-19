import { open, stat } from "node:fs/promises"
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http"
import { extname, join, normalize } from "node:path"
import { pipeline } from "node:stream"

import { NAME_PATH } from "@baza-imion/shared"
import type { ApiError } from "@baza-imion/shared"
import {
  handleNames,
  handleRobots,
  handleSitemap,
  handleTrend,
  namePageHandler,
} from "./http/handlers.ts"

// The standalone server: `vp run dev` and `vp run start`.
// On Vercel the frontend is static and api/*.js serve the same handlers.

// The web app's build, reached the same way from src/ and from dist/.
const DIST = join(import.meta.dirname, "..", "..", "web", "dist")
const PORT = Number(process.env.PORT ?? 8787)

const ROUTES: Record<string, (request: Request) => Promise<Response>> = {
  "/api/names": handleNames,
  "/api/trend": handleTrend,
  "/api/page": namePageHandler(join(DIST, "index.html")),
  "/api/sitemap": handleSitemap,
  "/api/robots": handleRobots,
}

/** The rewrites in vercel.json, so both servers answer the same paths. */
function rewrite(url: URL) {
  if (url.pathname.startsWith(NAME_PATH)) {
    url.searchParams.set("name", url.pathname.slice(NAME_PATH.length))
    url.pathname = "/api/page"
  } else if (url.pathname === "/sitemap.xml") {
    url.pathname = "/api/sitemap"
  } else if (url.pathname === "/robots.txt") {
    url.pathname = "/api/robots"
  }
}

const CONTENT_TYPE: Record<string, string> = {
  ".html": "text/html;charset=utf-8",
  ".js": "text/javascript;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
}

async function sendApi(url: URL, method: string, res: ServerResponse) {
  let response = Response.json({ error: "Not found" } satisfies ApiError, {
    status: 404,
  })
  const handler = ROUTES[url.pathname]
  if (handler && (method === "GET" || method === "HEAD")) {
    response = await handler(new Request(url))
  }
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  res.end(Buffer.from(await response.arrayBuffer()))
}

/** The file at `path`, opened for reading, when there is one. */
async function openFile(path: string) {
  const info = await stat(path).catch(() => undefined)
  if (!info?.isFile()) {
    return undefined
  }
  return { path, size: info.size, handle: await open(path) }
}

// Serves the built frontend; in development Vite does this instead.
async function sendFile(pathname: string, res: ServerResponse) {
  let path: string
  try {
    path = join(DIST, normalize(decodeURIComponent(pathname)))
  } catch {
    res.writeHead(400).end("Bad request")
    return
  }
  const file =
    (await openFile(path)) ?? (await openFile(join(DIST, "index.html")))
  if (!file) {
    res.writeHead(404).end("Run `vp run build` first.")
    return
  }
  res.setHeader(
    "Content-Type",
    CONTENT_TYPE[extname(file.path)] ?? "application/octet-stream"
  )
  res.setHeader("Content-Length", file.size)
  // Closes the file when the visitor leaves early or the read fails.
  pipeline(file.handle.createReadStream(), res, () => {})
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  try {
    // The host makes the canonical links on name pages.
    const url = new URL(
      req.url ?? "/",
      `http://${req.headers.host ?? "localhost"}`
    )
    rewrite(url)
    if (url.pathname.startsWith("/api/")) {
      await sendApi(url, req.method ?? "GET", res)
    } else {
      await sendFile(url.pathname, res)
    }
  } catch (error) {
    console.error(error)
    res.writeHead(500).end("Internal server error")
  }
}

createServer(handle).listen(PORT, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${PORT}/`)
})
