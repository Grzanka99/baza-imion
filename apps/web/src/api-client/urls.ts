import type {
  Dataset,
  GenderFilter,
  SortKey,
  SortOrder,
  YearFilter,
} from "@baza-imion/shared"

/** The parameters of `GET /api/names`; the server has a default for each one left out. */
interface NamesRequest {
  dataset: Dataset
  year: YearFilter
  gender: GenderFilter
  search?: string
  sort?: SortKey
  order?: SortOrder
  page?: number
  perPage?: number
  /** Ask for one random name instead of a page of the list. */
  random?: boolean
  /** Ask only about these names. */
  names?: string[]
}

export function namesUrl(request: NamesRequest) {
  const params = new URLSearchParams({
    dataset: request.dataset,
    year: String(request.year),
    gender: request.gender,
  })
  if (request.search !== undefined) {
    params.set("q", request.search)
  }
  if (request.sort !== undefined) {
    params.set("sort", request.sort)
  }
  if (request.order !== undefined) {
    params.set("order", request.order)
  }
  if (request.page !== undefined) {
    params.set("page", String(request.page))
  }
  if (request.perPage !== undefined) {
    params.set("perPage", String(request.perPage))
  }
  if (request.random) {
    params.set("random", "1")
  }
  if (request.names !== undefined) {
    params.set("names", request.names.join(","))
  }
  return `/api/names?${params}`
}

export function trendUrl(dataset: Dataset, name: string) {
  return `/api/trend?dataset=${dataset}&name=${encodeURIComponent(name)}`
}
