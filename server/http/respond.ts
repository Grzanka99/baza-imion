import type { ApiError } from "../../shared/api.js"
import { BadRequest, NotFound } from "./errors.js"

// The data changes once a year. Vercel's CDN may answer a repeated request
// itself for a week, and for ten days hand out its copy while fetching a new
// one, so most requests never reach this code; a browser reuses an answer for
// an hour (the app keeps its own copy for longer, see
// src/api-client/answer-cache.ts). A random pick must differ every time.
const CACHEABLE =
  "public, max-age=3600, s-maxage=604800, stale-while-revalidate=864000"

/** Turns a function of the query string into a handler that answers in JSON. */
export function api<T>(handler: (params: URLSearchParams) => Promise<T>) {
  return async (request: Request) => {
    try {
      const params = new URL(request.url).searchParams
      return Response.json(await handler(params), {
        headers: {
          "Cache-Control":
            params.get("random") === "1" ? "no-store" : CACHEABLE,
        },
      })
    } catch (error) {
      if (error instanceof BadRequest || error instanceof NotFound) {
        return Response.json({ error: error.message } satisfies ApiError, {
          status: error instanceof BadRequest ? 400 : 404,
        })
      }
      console.error(error instanceof Error ? error.message : error)
      return Response.json(
        {
          error: "Nie udało się pobrać danych z dane.gov.pl",
        } satisfies ApiError,
        { status: 502 }
      )
    }
  }
}
