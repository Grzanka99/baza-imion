import { useCallback, useMemo, useSyncExternalStore } from "react"

import {
  DATASETS,
  DATASET_YEARS,
  DEFAULT_DATASET,
  defaultYear,
  type Dataset,
  type SexFilter,
  type SortKey,
  type SortOrder,
  type YearFilter,
} from "../../shared/api"

/** Everything the user has chosen; it lives in the URL's query string. */
export interface View {
  dataset: Dataset
  search: string
  sex: SexFilter
  year: YearFilter
  sort: SortKey
  order: SortOrder
  page: number
  /** The name whose trend sheet is open. */
  name: string | null
}

const CHANGE_EVENT = "viewchange"

export function naturalOrder(sort: SortKey): SortOrder {
  return sort === "name" ? "asc" : "desc"
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[]) {
  return allowed.includes(value as T) ? (value as T) : allowed[0]
}

function parse(query: string): View {
  const params = new URLSearchParams(query)
  // The default dataset comes first in DATASETS.
  const dataset = oneOf<Dataset>(params.get("dataset"), DATASETS)
  const sort = oneOf<SortKey>(params.get("sort"), ["count", "name"])
  const natural = naturalOrder(sort)

  const rawYear = params.get("year")
  let year = defaultYear(dataset)
  if (rawYear === "all" && dataset === "children") year = "all"
  else if (DATASET_YEARS[dataset].includes(Number(rawYear))) {
    year = Number(rawYear)
  }

  const page = Number(params.get("page"))
  return {
    dataset,
    search: params.get("q") ?? "",
    sex: oneOf<SexFilter>(params.get("sex"), ["all", "M", "K"]),
    year,
    sort,
    order: oneOf<SortOrder>(params.get("order"), [
      natural,
      natural === "asc" ? "desc" : "asc",
    ]),
    page: Number.isInteger(page) && page > 0 ? page : 1,
    name: params.get("name") || null,
  }
}

/** Defaults are left out, so a fresh view has a clean URL. */
function serialize(view: View) {
  const params = new URLSearchParams()
  if (view.dataset !== DEFAULT_DATASET) params.set("dataset", view.dataset)
  if (view.search) params.set("q", view.search)
  if (view.sex !== "all") params.set("sex", view.sex)
  if (view.year !== defaultYear(view.dataset)) {
    params.set("year", String(view.year))
  }
  if (view.sort !== "count") params.set("sort", view.sort)
  if (view.order !== naturalOrder(view.sort)) params.set("order", view.order)
  if (view.page > 1) params.set("page", String(view.page))
  if (view.name) params.set("name", view.name)
  return params.toString()
}

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener("popstate", onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

export function useView() {
  const query = useSyncExternalStore(subscribe, () => window.location.search)
  const view = useMemo(() => parse(query), [query])

  const update = useCallback((changes: Partial<View>) => {
    const next = serialize({ ...parse(window.location.search), ...changes })
    window.history.replaceState(
      null,
      "",
      next ? `?${next}` : window.location.pathname
    )
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  return [view, update] as const
}
