import {
  DATASET_YEARS,
  type Dataset,
  type NameRow,
  type NamesResponse,
  type Sex,
  type SexFilter,
  type SortKey,
  type SortOrder,
  type TrendResponse,
  type YearFilter,
} from "../shared/api.js"
import { loadYear } from "./sources.js"

const collator = new Intl.Collator("pl")

/** Uppercases and strips diacritics, so "lukasz" finds "ŁUKASZ". */
function fold(text: string) {
  return text
    .toUpperCase()
    .replaceAll("Ł", "L")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
}

interface RankedRow extends NameRow {
  folded: string
  /** Position in alphabetical order, so sorting by name compares integers. */
  nameOrder: number
}

/** Every name in one dataset, year selection and sex, ranked by count. */
interface Scope {
  signature: string
  rows: RankedRow[]
  count: number
  fetchedAt: number
}

// Ranking tens of thousands of names takes a while, so recent scopes are kept.
const MAX_SCOPES = 12
const scopes = new Map<string, Scope>()

async function loadScope(
  dataset: Dataset,
  year: YearFilter,
  sex: SexFilter
): Promise<Scope> {
  const years = year === "all" ? DATASET_YEARS[dataset] : [year]
  const slices = (
    await Promise.all(years.map((each) => loadYear(dataset, each, sex)))
  ).flat()

  const key = `${dataset}:${year}:${sex}`
  const signature = slices.map((slice) => slice.fetchedAt).join()
  const known = scopes.get(key)
  scopes.delete(key)
  if (known?.signature === signature) {
    scopes.set(key, known)
    return known
  }

  // One row per name: with both sexes selected, men and women who share a
  // name are counted together.
  const byName = new Map<string, RankedRow & { bySex: Record<Sex, number> }>()
  for (const slice of slices) {
    slice.forEach((name, rowSex, count) => {
      if (sex !== "all" && rowSex !== sex) return
      let row = byName.get(name)
      if (!row) {
        row = {
          name,
          sexes: [],
          bySex: { M: 0, K: 0 },
          count: 0,
          rank: 0,
          share: 0,
          folded: fold(name),
          nameOrder: 0,
        }
        byName.set(name, row)
      }
      row.count += count
      row.bySex[rowSex] += count
    })
  }

  const rows: RankedRow[] = [...byName.values()].map(({ bySex, ...row }) => ({
    ...row,
    sexes: (["M", "K"] as const)
      .filter((each) => bySex[each] > 0)
      .map((each) => ({ sex: each, count: bySex[each] }))
      .sort((a, b) => b.count - a.count),
  }))
  rows
    .sort((a, b) => collator.compare(a.name, b.name))
    .forEach((row, index) => (row.nameOrder = index))
  rows.sort((a, b) => b.count - a.count || a.nameOrder - b.nameOrder)

  const count = rows.reduce((sum, row) => sum + row.count, 0)
  rows.forEach((row, index) => {
    const previous = rows[index - 1]
    row.rank = previous?.count === row.count ? previous.rank : index + 1
    row.share = count ? row.count / count : 0
  })

  const scope = {
    signature,
    rows,
    count,
    fetchedAt: Math.min(...slices.map((slice) => slice.fetchedAt)),
  }
  scopes.set(key, scope)
  if (scopes.size > MAX_SCOPES) scopes.delete(scopes.keys().next().value!)
  return scope
}

// A random pick skips the most popular names and the near one-offs, which are
// mostly rare spellings: what is left is uncommon but in real use.
const POPULAR_SHARE = 0.05
const MIN_RANDOM_COUNT = 5

function pickRare(rows: RankedRow[]): RankedRow[] {
  if (rows.length === 0) return []
  // Rows are ordered by count, highest first.
  const from = Math.ceil(rows.length * POPULAR_SHARE)
  const firstTooRare = rows.findIndex((row) => row.count < MIN_RANDOM_COUNT)
  const to = firstTooRare === -1 ? rows.length : firstTooRare
  // A scope too small to have such a band offers everything it has.
  const [low, high] = to > from ? [from, to] : [0, rows.length]
  return [rows[low + Math.floor(Math.random() * (high - low))]]
}

export interface NamesQuery {
  dataset: Dataset
  year: YearFilter
  sex: SexFilter
  search: string
  sort: SortKey
  order: SortOrder
  page: number
  perPage: number
  /** Answer with one random uncommon name instead of a page of the list. */
  random?: boolean
  /** List only these names (the visitor's favourites). */
  only?: string[]
}

export async function queryNames(query: NamesQuery): Promise<NamesResponse> {
  const scope = await loadScope(query.dataset, query.year, query.sex)

  // The scope's rows are shared between requests, so they are never reordered
  // in place.
  const needle = query.random ? "" : fold(query.search.trim())
  let matched = scope.rows
  if (query.only && !query.random) {
    const only = new Set(query.only)
    matched = matched.filter((row) => only.has(row.name))
  }
  if (needle) matched = matched.filter((row) => row.folded.includes(needle))
  if (query.random) {
    matched = pickRare(scope.rows)
  } else if (query.sort === "name") {
    matched = [...matched].sort((a, b) => a.nameOrder - b.nameOrder)
  }
  if (
    !query.random &&
    query.order !== (query.sort === "name" ? "asc" : "desc")
  ) {
    matched = [...matched].reverse()
  }

  // A name that is exactly what was typed leads the list, whatever the order.
  if (needle) {
    const exact = matched.filter((row) => row.folded === needle)
    if (exact.length > 0 && exact.length < matched.length) {
      matched = [...exact, ...matched.filter((row) => row.folded !== needle)]
    }
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
 * Built from the cached years, so asking about a name never adds upstream
 * calls or cache entries of its own. Unknown names give `undefined`.
 */
export async function queryTrend(
  dataset: Dataset,
  name: string
): Promise<TrendResponse | undefined> {
  const years = DATASET_YEARS[dataset]
  const loaded = await Promise.all(years.map((year) => loadYear(dataset, year)))

  const points = years.map((year) => ({ year, M: 0, K: 0 }))
  const totals = { M: 0, K: 0 }
  loaded.forEach((slices, index) => {
    for (const slice of slices) {
      slice.forEach((rowName, sex, count) => {
        if (rowName !== name) return
        points[index][sex] += count
        totals[sex] += count
      })
    }
  })
  if (totals.M + totals.K === 0) return undefined

  return {
    name,
    points,
    totals,
    fetchedAt: Math.min(...loaded.flat().map((slice) => slice.fetchedAt)),
  }
}
