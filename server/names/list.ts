import {
  naturalOrder,
  type Dataset,
  type NamesResponse,
  type SexFilter,
  type SortKey,
  type SortOrder,
  type YearFilter,
} from "../../shared/api.js"
import { fold } from "./fold.js"
import { pickRare } from "./random.js"
import { loadScope, type RankedRow } from "./scope.js"

interface NamesQuery {
  dataset: Dataset
  year: YearFilter
  sex: SexFilter
  search: string
  sort: SortKey
  order: SortOrder
  page: number
  perPage: number
  /** Answer with one random uncommon name instead of a page of the list. */
  random: boolean
  /** List only these names (the visitor's favourites). */
  only: string[] | undefined
}

export async function queryNames(query: NamesQuery): Promise<NamesResponse> {
  const scope = await loadScope(query.dataset, query.year, query.sex)
  let matched: RankedRow[]
  if (query.random) matched = pickRare(scope.rows)
  else matched = match(scope.rows, query)

  let matchedCount = scope.count
  if (matched !== scope.rows) {
    matchedCount = matched.reduce((sum, row) => sum + row.count, 0)
  }

  const pageCount = Math.max(1, Math.ceil(matched.length / query.perPage))
  const page = Math.min(query.page, pageCount)
  const start = (page - 1) * query.perPage
  return {
    rows: matched
      .slice(start, start + query.perPage)
      .map(({ rank, name, sexes, count, share }) => ({
        rank,
        name,
        sexes,
        count,
        share,
      })),
    page,
    perPage: query.perPage,
    matchedNames: matched.length,
    matchedCount,
    scopeNames: scope.rows.length,
    scopeCount: scope.count,
    fetchedAt: scope.fetchedAt,
  }
}

/**
 * The rows the query asks for, in its order. The scope's rows are shared
 * between requests, so they are never reordered in place.
 */
function match(rows: RankedRow[], query: NamesQuery): RankedRow[] {
  const needle = fold(query.search.trim())
  let matched = rows
  if (query.only) {
    const only = new Set(query.only)
    matched = matched.filter((row) => only.has(row.name))
  }
  if (needle) matched = matched.filter((row) => row.folded.includes(needle))
  if (query.sort === "name") {
    matched = [...matched].sort((a, b) => a.nameOrder - b.nameOrder)
  }
  if (query.order !== naturalOrder(query.sort)) {
    matched = [...matched].reverse()
  }

  // A name that is exactly what was typed leads the list, whatever the order.
  if (needle) {
    const exact = matched.filter((row) => row.folded === needle)
    if (exact.length > 0 && exact.length < matched.length) {
      matched = [...exact, ...matched.filter((row) => row.folded !== needle)]
    }
  }
  return matched
}
