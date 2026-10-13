import { namesUrl } from "@/api-client/urls"
import { useApi } from "@/api-client/use-api"
import type { View } from "@/hooks/use-view"
import type { NamesResponse } from "../../../shared/api"

export const PER_PAGE = 25

/**
 * Fetches the page of names the view asks for, and works out what the table
 * and the pager show while it loads, fails or comes back empty.
 */
export function useNamesList(view: View, favoriteNames: string[]) {
  let onlyNames: string[] | undefined
  if (view.favorites) onlyNames = favoriteNames
  const { data, error, loading } = useApi<NamesResponse>(
    namesUrl({
      dataset: view.dataset,
      year: view.year,
      sex: view.sex,
      search: view.search,
      sort: view.sort,
      order: view.order,
      page: view.page,
      perPage: PER_PAGE,
      names: onlyNames,
    })
  )

  const pageCount = Math.ceil((data?.matchedNames ?? 0) / PER_PAGE) || 1
  // The server answers with the last page when the URL asks for one past it.
  let shownPage = view.page
  if (data && !loading) shownPage = data.page

  let rows = data?.rows
  if (error) rows = []
  let emptyText = "Brak imion pasujących do wyszukiwania."
  if (view.favorites && favoriteNames.length === 0) {
    emptyText =
      "Nie masz jeszcze ulubionych imion. Dodaj je serduszkiem przy imieniu."
  }

  return { data, error, loading, rows, pageCount, shownPage, emptyText }
}
