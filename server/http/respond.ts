import type { ApiError } from "../../shared/api.js"
import { BadRequest, NotFound } from "./errors.js"

// The data changes once a year. Vercel's CDN may answer a repeated request
// itself for a week, and for ten days hand out its copy while fetching a new
// one, so most requests never reach this code; a browser reuses an answer for
// an hour (the app keeps its own copy for longer, see
// src/api-client/answer-cache.ts). A random pick must differ every time.
const CACHEABLE =
  "public, max-age=3600, s-maxage=604800, stale-while-revalidate=864000"

function cacheControl(params: URLSearchParams) {
  if (params.get("random") === "1") return "no-store"
  return CACHEABLE
}

function failure(status: number, message: string) {
  return Response.json({ error: message } satisfies ApiError, { status })
}

/** Turns a function of the query string into a handler that answers in JSON. */
export function api<T>(handler: (params: URLSearchParams) => Promise<T>) {
  return async (request: Request) => {
    try {
      const params = new URL(request.url).searchParams
      return Response.json(await handler(params), {
        headers: { "Cache-Control": cacheControl(params) },
      })
    } catch (error) {
      if (error instanceof BadRequest) return failure(400, error.message)
      if (error instanceof NotFound) return failure(404, error.message)
      let detail = error
      if (error instanceof Error) detail = error.message
      console.error(detail)
      return failure(502, "Nie udało się pobrać danych z dane.gov.pl")
    }
  }
}
