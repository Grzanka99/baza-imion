import { useCallback, useMemo, useSyncExternalStore } from "react"

import {
  DATASETS,
  DATASET_YEARS,
  DEFAULT_DATASET,
  defaultYear,
  nameFromPath,
  namePath,
  naturalOrder,
  oppositeOrder,
  type Dataset,
  type GenderFilter,
  type SortKey,
  type SortOrder,
  type YearFilter,
} from "@baza-imion/shared"

/**
 * Everything the user has chosen. It lives in the URL: the open name in the
 * path (/imie/zofia), the rest in the query string.
 */
export interface View {
  dataset: Dataset
  search: string
  gender: GenderFilter
  year: YearFilter
  sort: SortKey
  order: SortOrder
  page: number
  /** The name whose trend sheet is open. */
  name: string | null
  /** Show only the favourite names. */
  favorites: boolean
}

const CHANGE_EVENT = "viewchange"

function oneOf<T extends string>(value: string | null, allowed: readonly T[]) {
  if (allowed.includes(value as T)) {
    return value as T
  }
  return allowed[0]
}

/** Reads the path and query string of `url`. */
function parse(url: string): View {
  const { pathname, searchParams: params } = new URL(url, window.location.href)
  // The default dataset comes first in DATASETS.
  const dataset = oneOf<Dataset>(params.get("dataset"), DATASETS)
  const sort = oneOf<SortKey>(params.get("sort"), ["count", "name"])
  const natural = naturalOrder(sort)

  const rawYear = params.get("year")
  let year = defaultYear(dataset)
  if (rawYear === "all" && dataset === "children") {
    year = "all"
  } else if (DATASET_YEARS[dataset].includes(Number(rawYear))) {
    year = Number(rawYear)
  }

  let page = Number(params.get("page"))
  if (!Number.isInteger(page) || page < 1) {
    page = 1
  }
  return {
    dataset,
    search: params.get("q") ?? "",
    gender: oneOf<GenderFilter>(params.get("gender"), ["all", "M", "K"]),
    year,
    sort,
    order: oneOf<SortOrder>(params.get("order"), [
      natural,
      oppositeOrder(natural),
    ]),
    page,
    // Links from before name pages had paths: ?name=ZOFIA.
    name: nameFromPath(pathname) ?? (params.get("name") || null),
    favorites: params.get("fav") === "1",
  }
}

/** Defaults are left out, so a fresh view has a clean URL. */
function serialize(view: View) {
  let path = "/"
  if (view.name) {
    path = namePath(view.name)
  }
  const params = new URLSearchParams()
  if (view.dataset !== DEFAULT_DATASET) {
    params.set("dataset", view.dataset)
  }
  if (view.search) {
    params.set("q", view.search)
  }
  if (view.gender !== "all") {
    params.set("gender", view.gender)
  }
  if (view.year !== defaultYear(view.dataset)) {
    params.set("year", String(view.year))
  }
  if (view.sort !== "count") {
    params.set("sort", view.sort)
  }
  if (view.order !== naturalOrder(view.sort)) {
    params.set("order", view.order)
  }
  if (view.page > 1) {
    params.set("page", String(view.page))
  }
  if (view.favorites) {
    params.set("fav", "1")
  }
  const query = params.toString()
  if (query) {
    return `${path}?${query}`
  }
  return path
}

const currentUrl = () => window.location.pathname + window.location.search

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener("popstate", onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

export function useView() {
  const url = useSyncExternalStore(subscribe, currentUrl)
  const view = useMemo(() => parse(url), [url])

  const update = useCallback((changes: Partial<View>) => {
    const next = serialize({ ...parse(currentUrl()), ...changes })
    window.history.replaceState(null, "", next)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  return [view, update] as const
}
