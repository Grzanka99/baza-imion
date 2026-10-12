import {
  YEARS,
  type NameRow,
  type NamesResponse,
  type Sex,
  type SexFilter,
  type SortKey,
  type SortOrder,
  type TrendResponse,
  type YearFilter,
} from "../shared/api"
import { cached } from "./cache"
import { fetchRows } from "./upstream"

type YearEntry = [name: string, sex: Sex, count: number]

const collator = new Intl.Collator("pl")

/** Uppercases and strips diacritics, so "lukasz" finds "ŁUKASZ". */
function fold(text: string) {
  return text
    .toUpperCase()
    .replaceAll("Ł", "L")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
}

function loadYear(year: number) {
  return cached<YearEntry[]>(`year:${year}`, async () => {
    const rows = await fetchRows(`col1:${year}`)
    return rows.map((row) => [row.name, row.sex, row.count])
  })
}

export interface NamesQuery {
  year: YearFilter
  sex: SexFilter
  search: string
  sort: SortKey
  order: SortOrder
  page: number
  perPage: number
}

export async function queryNames(query: NamesQuery): Promise<NamesResponse> {
  const years = query.year === "all" ? YEARS : [query.year]
  const loaded = await Promise.all(years.map(loadYear))

  const counts = new Map<string, Omit<NameRow, "rank" | "share">>()
  for (const { value } of loaded) {
    for (const [name, sex, count] of value) {
      if (query.sex !== "all" && sex !== query.sex) continue
      const key = `${sex}:${name}`
      const entry = counts.get(key)
      if (entry) entry.count += count
      else counts.set(key, { name, sex, count })
    }
  }

  const byCount = [...counts.values()].sort(
    (a, b) => b.count - a.count || collator.compare(a.name, b.name)
  )
  const scopeCount = byCount.reduce((sum, row) => sum + row.count, 0)
  const ranked: NameRow[] = []
  byCount.forEach((row, index) => {
    const previous = ranked[index - 1]
    ranked.push({
      ...row,
      rank: previous?.count === row.count ? previous.rank : index + 1,
      share: scopeCount ? row.count / scopeCount : 0,
    })
  })

  const needle = fold(query.search.trim())
  const matched = needle
    ? ranked.filter((row) => fold(row.name).includes(needle))
    : ranked
  if (query.sort === "name") {
    matched.sort(
      (a, b) => collator.compare(a.name, b.name) || a.sex.localeCompare(b.sex)
    )
  }
  if (query.order !== (query.sort === "name" ? "asc" : "desc")) {
    matched.reverse()
  }

  const start = (query.page - 1) * query.perPage
  return {
    rows: matched.slice(start, start + query.perPage),
    page: query.page,
    perPage: query.perPage,
    matchedNames: matched.length,
    matchedCount: matched.reduce((sum, row) => sum + row.count, 0),
    scopeNames: ranked.length,
    scopeCount,
    fetchedAt: Math.min(...loaded.map((entry) => entry.fetchedAt)),
  }
}

/**
 * Built from the cached years, so asking about a name never adds upstream
 * calls or cache entries of its own. Unknown names give `undefined`.
 */
export async function queryTrend(
  name: string
): Promise<TrendResponse | undefined> {
  const loaded = await Promise.all(YEARS.map(loadYear))

  const points = YEARS.map((year) => ({ year, M: 0, K: 0 }))
  const totals = { M: 0, K: 0 }
  loaded.forEach(({ value }, index) => {
    for (const [rowName, sex, count] of value) {
      if (rowName !== name) continue
      points[index][sex] += count
      totals[sex] += count
    }
  })
  if (totals.M + totals.K === 0) return undefined

  return {
    name,
    points,
    totals,
    fetchedAt: Math.min(...loaded.map((entry) => entry.fetchedAt)),
  }
}
