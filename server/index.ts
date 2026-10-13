import { createReadStream, existsSync, statSync } from "node:fs"
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http"
import { extname, join, normalize } from "node:path"

import type { ApiError } from "../shared/api.js"
import { handleNames, handleTrend } from "./http/handlers.js"

// The standalone server: `vp run dev` and `vp run start`.
// On Vercel the frontend is static and api/*.ts serve the same handlers.

const DIST = join(import.meta.dirname, "..", "dist")
const PORT = Number(process.env.PORT ?? 8787)

const ROUTES: Record<string, (request: Request) => Promise<Response>> = {
  "/api/names": handleNames,
  "/api/trend": handleTrend,
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
  if (handler && method === "GET") response = await handler(new Request(url))
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  res.end(Buffer.from(await response.arrayBuffer()))
}

const isFile = (path: string) => existsSync(path) && statSync(path).isFile()

// Serves the built frontend; in development Vite does this instead.
function sendFile(pathname: string, res: ServerResponse) {
  let file: string
  try {
    file = join(DIST, normalize(decodeURIComponent(pathname)))
  } catch {
    res.writeHead(400).end("Bad request")
    return
  }
  if (!isFile(file)) file = join(DIST, "index.html")
  if (!isFile(file)) {
    res.writeHead(404).end("Run `vp build` first.")
    return
  }
  res.setHeader(
    "Content-Type",
    CONTENT_TYPE[extname(file)] ?? "application/octet-stream"
  )
  createReadStream(file).pipe(res)
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url ?? "/", "http://localhost")
    if (url.pathname.startsWith("/api/")) {
      await sendApi(url, req.method ?? "GET", res)
    } else {
      sendFile(url.pathname, res)
    }
  } catch (error) {
    console.error(error)
    res.writeHead(500).end("Internal server error")
  }
}

createServer(handle).listen(PORT, "0.0.0.0", () => {
  console.log(`API listening on http://0.0.0.0:${PORT}/`)
})
