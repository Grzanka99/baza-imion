export type Sex = "M" | "K"
export type SexFilter = Sex | "all"
export type YearFilter = number | "all"
export type SortKey = "count" | "name"
export type SortOrder = "asc" | "desc"

/**
 * `children`: names given to newborns in a year.
 * `population`: names of everyone alive in the register, as a yearly snapshot.
 */
export type Dataset = "children" | "population"

export const DEFAULT_DATASET: Dataset = "population"
export const DATASETS: Dataset[] = ["population", "children"]

function range(first: number, last: number) {
  return Array.from({ length: last - first + 1 }, (_, i) => first + i)
}

export const DATASET_YEARS: Record<Dataset, number[]> = {
  children: range(2000, 2025),
  population: range(2019, 2026),
}

/** Births add up across years; population snapshots do not. */
export function defaultYear(dataset: Dataset): YearFilter {
  const years = DATASET_YEARS.population
  return dataset === "children" ? "all" : years[years.length - 1]
}

export interface NameRow {
  /** Position by count within the selected year(s) and sex; ties share a rank. */
  rank: number
  name: string
  /**
   * Who bears the name, the larger group first. With both sexes selected a
   * name shared by men and women is one row, and `count` is their sum.
   */
  sexes: { sex: Sex; count: number }[]
  count: number
  /** Fraction of all people in the selected year(s) and sex. */
  share: number
}

export interface NamesResponse {
  rows: NameRow[]
  /** The requested page, or the last one if the request went past the end. */
  page: number
  perPage: number
  /** Names matching the search. */
  matchedNames: number
  /** People with a name matching the search. */
  matchedCount: number
  /** Names and people in the selected year(s) and sex, ignoring the search. */
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
