import {
  DATASETS,
  DATASET_YEARS,
  defaultYear,
  type Dataset,
  type YearFilter,
} from "../../shared/api.js"
import { BadRequest } from "./errors.js"

// Readers for query-string parameters. A missing parameter takes its default;
// a value outside what is allowed is a BadRequest.

const MAX_ONLY_NAMES = 500

/** One of `allowed`; the first is the default. */
export function oneOf<T extends string>(
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

export function integer(
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

export function dataset(params: URLSearchParams) {
  return oneOf<Dataset>(params, "dataset", DATASETS)
}

export function yearFilter(
  params: URLSearchParams,
  selected: Dataset
): YearFilter {
  const years = DATASET_YEARS[selected]
  const raw = params.get("year")
  if (raw === null) return defaultYear(selected)
  // Yearly population snapshots count the same people, so they are not summed.
  if (raw === "all" && selected === "children") return "all"
  return integer(params, "year", years[0], years[0], years[years.length - 1])
}

/** The `names` parameter: a comma-separated list; present but empty means none. */
export function onlyNames(params: URLSearchParams) {
  const raw = params.get("names")
  if (raw === null) return undefined
  const names = raw
    .split(",")
    .map((name) => name.trim().toUpperCase())
    .filter(Boolean)
  if (names.length > MAX_ONLY_NAMES) {
    throw new BadRequest(`names takes at most ${MAX_ONLY_NAMES} names`)
  }
  return names
}
