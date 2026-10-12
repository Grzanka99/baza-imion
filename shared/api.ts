export type Sex = "M" | "K"
export type SexFilter = Sex | "all"
export type YearFilter = number | "all"
export type SortKey = "count" | "name"
export type SortOrder = "asc" | "desc"

export const FIRST_YEAR = 2000
export const LAST_YEAR = 2019
export const YEARS = Array.from(
  { length: LAST_YEAR - FIRST_YEAR + 1 },
  (_, i) => FIRST_YEAR + i
)

export interface NameRow {
  /** Position by count within the selected year(s) and sex; ties share a rank. */
  rank: number
  name: string
  sex: Sex
  count: number
  /** Fraction of all children in the selected year(s) and sex. */
  share: number
}

export interface NamesResponse {
  rows: NameRow[]
  page: number
  perPage: number
  /** Names matching the search. */
  matchedNames: number
  /** Children with a name matching the search. */
  matchedCount: number
  /** Names and children in the selected year(s) and sex, ignoring the search. */
  scopeNames: number
  scopeCount: number
  /** Oldest upstream fetch used for this answer (ms since epoch). */
  fetchedAt: number
}

export interface TrendPoint {
  year: number
  M: number
  K: number
}

export interface TrendResponse {
  name: string
  points: TrendPoint[]
  totals: Record<Sex, number>
  fetchedAt: number
}

export interface ApiError {
  error: string
}
