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
} from "../shared/api.js"
import { queryNames, queryTrend } from "./names.js"

// The HTTP handlers, shared by the Bun server (server/index.ts) and the
// Vercel functions (api/*.ts). Relative imports on this side carry a .js
// extension because Vercel runs these files as plain Node ES modules.

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
  return integer(params, "year", years[0], years[0], years[years.length - 1])
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

export const handleNames = api((params) => {
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
    random: params.get("random") === "1",
  })
})

export const handleTrend = api(async (params) => {
  const name = params.get("name")?.trim().toUpperCase()
  if (!name || name.length > 100) throw new BadRequest("name is required")
  const trend = await queryTrend(dataset(params), name)
  if (!trend) throw new NotFound("Nie ma takiego imienia")
  return trend
})
