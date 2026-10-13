import type {
  Dataset,
  NamesResponse,
  SexFilter,
  SortKey,
  SortOrder,
  YearFilter,
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
  const matched = query.random ? pickRare(scope.rows) : match(scope.rows, query)

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
    matchedCount:
      matched === scope.rows
        ? scope.count
        : matched.reduce((sum, row) => sum + row.count, 0),
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
  if (query.order !== (query.sort === "name" ? "asc" : "desc")) {
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
