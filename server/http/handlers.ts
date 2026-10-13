import type { SexFilter, SortKey, SortOrder } from "../../shared/api.js"
import { queryNames } from "../names/list.js"
import { queryTrend } from "../names/trend.js"
import { BadRequest, NotFound } from "./errors.js"
import { dataset, integer, oneOf, onlyNames, yearFilter } from "./params.js"
import { api } from "./respond.js"

// The HTTP handlers, shared by the Bun server (server/index.ts) and the
// Vercel functions (api/*.ts). Relative imports on this side carry a .js
// extension because Vercel runs these files as plain Node ES modules.

const MAX_PER_PAGE = 100

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
    only: onlyNames(params),
  })
})

export const handleTrend = api(async (params) => {
  const name = params.get("name")?.trim().toUpperCase()
  if (!name || name.length > 100) throw new BadRequest("name is required")
  const trend = await queryTrend(dataset(params), name)
  if (!trend) throw new NotFound("Nie ma takiego imienia")
  return trend
})
