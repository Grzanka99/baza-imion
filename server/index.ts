import { join, normalize } from "node:path"

import {
  DATASETS,
  DATASET_YEARS,
  defaultYear,
  type ApiError,
  type Dataset,
  type SexFilter,
  type SortKey,
  type SortOrder,
  type YearFilter,
} from "../shared/api"
import { queryNames, queryTrend } from "./names"

const DIST = join(import.meta.dir, "..", "dist")
const MAX_PER_PAGE = 100

class BadRequest extends Error {}
class NotFound extends Error {}

function oneOf<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[]
): T {
  const value = params.get(key) ?? allowed[0]
  if (!allowed.includes(value as T)) {
    throw new BadRequest(`${key} must be one of: ${allowed.join(", ")}`)
  }
  return value as T
}

function integer(
  params: URLSearchParams,
  key: string,
  fallback: number,
  min: number,
  max: number
) {
  const raw = params.get(key)
  const value = raw === null ? fallback : Number(raw)
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new BadRequest(`${key} must be an integer from ${min} to ${max}`)
  }
  return value
}

function dataset(params: URLSearchParams) {
  return oneOf<Dataset>(params, "dataset", DATASETS)
}

function yearFilter(params: URLSearchParams, selected: Dataset): YearFilter {
  const years = DATASET_YEARS[selected]
  const raw = params.get("year")
  if (raw === null) return defaultYear(selected)
  // Yearly population snapshots count the same people, so they are not summed.
  if (raw === "all" && selected === "children") return "all"
  return integer(params, "year", years[0], years[0], years.at(-1)!)
}

function api<T>(handler: (params: URLSearchParams) => Promise<T>) {
  return async (request: Request) => {
    try {
      return Response.json(await handler(new URL(request.url).searchParams))
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

const server = Bun.serve({
  hostname: "0.0.0.0",
  port: Number(process.env.PORT ?? 8787),
  // Bun's error page shows source code and file paths.
  development: false,
  // A cold cache needs a few hundred upstream calls before the first answer;
  // 255 seconds is the most Bun allows.
  idleTimeout: 255,
  routes: {
    "/api/names": {
      GET: api((params) => {
        const selected = dataset(params)
        return queryNames({
          dataset: selected,
          year: yearFilter(params, selected),
          sex: oneOf<SexFilter>(params, "sex", ["all", "M", "K"]),
          search: params.get("q") ?? "",
          sort: oneOf<SortKey>(params, "sort", ["count", "name"]),
          order: oneOf<SortOrder>(params, "order", ["desc", "asc"]),
          page: integer(params, "page", 1, 1, Number.MAX_SAFE_INTEGER),
          perPage: integer(params, "perPage", 25, 1, MAX_PER_PAGE),
        })
      }),
    },
    "/api/trend": {
      GET: api(async (params) => {
        const name = params.get("name")?.trim().toUpperCase()
        if (!name || name.length > 100) throw new BadRequest("name is required")
        const trend = await queryTrend(dataset(params), name)
        if (!trend) throw new NotFound("Nie ma takiego imienia")
        return trend
      }),
    },
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
