import { useState } from "react"

import { namesUrl } from "@/api-client/urls"
import { useApi } from "@/api-client/use-api"
import { Collapse } from "@/components/collapse"
import { FavoritesPanel } from "@/features/favorites/favorites-panel"
import { OnlyFavoritesButton } from "@/features/favorites/only-favorites-button"
import { useFavorites } from "@/features/favorites/use-favorites"
import { DatasetToggle } from "@/features/filters/dataset-toggle"
import { RandomNameButton } from "@/features/filters/random-name-button"
import { SearchInput } from "@/features/filters/search-input"
import { SexToggle } from "@/features/filters/sex-toggle"
import { YearSelect } from "@/features/filters/year-select"
import { NameTrend } from "@/features/name-trend/name-trend"
import { NamesTable } from "@/features/names-list/names-table"
import { Pagination } from "@/features/names-list/pagination"
import { ResultSummary } from "@/features/names-list/result-summary"
import { usePhoneBar } from "@/hooks/use-phone-bar"
import { naturalOrder, useView } from "@/hooks/use-view"
import { displayName } from "@/lib/format"
import { cn } from "@/lib/utils"
import { defaultYear, type NamesResponse, type SortKey } from "../shared/api"

const PER_PAGE = 25

export function App() {
  const [view, update] = useView()
  const { dataset, search, sex, year, sort, order, page } = view
  // Remounts the search box, which owns the typed text.
  const [resetCount, setResetCount] = useState(0)
  const { bar, collapsed, scrollToList } = usePhoneBar()
  const favorites = useFavorites()

  const { data, error, loading } = useApi<NamesResponse>(
    namesUrl({
      dataset,
      year,
      sex,
      search,
      sort,
      order,
      page,
      perPage: PER_PAGE,
      names: view.favorites ? favorites.names : undefined,
    })
  )

  const filtered =
    search !== "" ||
    sex !== "all" ||
    year !== defaultYear(dataset) ||
    sort !== "count" ||
    order !== "desc" ||
    view.favorites

  function resetFilters() {
    update({
      search: "",
      sex: "all",
      year: defaultYear(dataset),
      sort: "count",
      order: "desc",
      page: 1,
      favorites: false,
    })
    setResetCount((count) => count + 1)
  }

  function changeSort(key: SortKey) {
    const flipped = order === "asc" ? "desc" : "asc"
    update({
      sort: key,
      order: key === sort ? flipped : naturalOrder(key),
      page: 1,
    })
  }

  /** Searches for the name the dice came up with. */
  function searchFor(name: string) {
    update({ search: displayName(name), page: 1 })
    setResetCount((count) => count + 1)
  }

  const pageCount = data ? Math.ceil(data.matchedNames / PER_PAGE) || 1 : 1
  // The server answers with the last page when the URL asks for one past it.
  const shownPage = data && !loading ? data.page : page

  const sexToggle = (className: string) => (
    <SexToggle
      dataset={dataset}
      sex={sex}
      className={className}
      onChange={(next) => update({ sex: next, page: 1 })}
    />
  )

  return (
    // From lg up, favourites get a column of their own beside the list.
    <div
      className={cn(
        "mx-auto flex min-h-svh max-w-3xl sm:h-svh sm:p-6 lg:gap-8",
        favorites.names.length > 0 && "lg:max-w-6xl"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-4 px-4 pt-[var(--bar-full,12rem)] pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:min-h-0 sm:gap-6 sm:p-0">
        {/* On phones a fixed bar that folds down to the sex switch while the
            page scrolls; from sm up its parts are ordinary rows of the page. */}
        <div
          ref={bar}
          data-collapsed={collapsed}
          className="fixed inset-x-0 top-0 z-20 bg-background px-4 pt-4 pb-3 sm:contents"
        >
          <Collapse open={!collapsed} className="pb-3">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Baza imion
              </h1>
              <DatasetToggle
                dataset={dataset}
                onChange={(next) =>
                  update({
                    dataset: next,
                    year: defaultYear(next),
                    page: 1,
                    name: null,
                  })
                }
              />
            </header>
          </Collapse>

          <Collapse open={!collapsed} className="pb-3">
            <div className="flex items-center gap-3 sm:flex-wrap">
              <SearchInput
                key={resetCount}
                initialValue={search}
                onSearch={(query) => update({ search: query, page: 1 })}
              />
              {sexToggle("hidden sm:flex")}
              <YearSelect
                dataset={dataset}
                year={year}
                onChange={(next) => update({ year: next, page: 1 })}
              />
              <RandomNameButton
                dataset={dataset}
                year={year}
                sex={sex}
                onDraw={searchFor}
              />
              <OnlyFavoritesButton
                active={view.favorites}
                onToggle={() => update({ favorites: !view.favorites, page: 1 })}
              />
            </div>
          </Collapse>

          <div className="sm:hidden">{sexToggle("w-full")}</div>

          <Collapse open={!collapsed} className="pt-3">
            <ResultSummary
              dataset={dataset}
              data={data}
              error={error}
              filtered={filtered}
              onReset={resetFilters}
            />
          </Collapse>
        </div>

        <NamesTable
          dataset={dataset}
          rows={error ? [] : data?.rows}
          perPage={PER_PAGE}
          loading={loading}
          sort={sort}
          order={order}
          onSort={changeSort}
          onSelect={(name) => update({ name })}
          onNewRows={scrollToList}
          isFavorite={favorites.has}
          onToggleFavorite={favorites.toggle}
          emptyText={
            view.favorites && favorites.names.length === 0
              ? "Nie masz jeszcze ulubionych imion. Dodaj je serduszkiem przy imieniu."
              : "Brak imion pasujących do wyszukiwania."
          }
        />

        <Pagination
          page={shownPage}
          pageCount={pageCount}
          disabled={loading}
          onPage={(next) => update({ page: next })}
        />
      </div>

      {favorites.names.length > 0 && (
        <FavoritesPanel
          dataset={dataset}
          year={year}
          sex={sex}
          names={favorites.names}
          onSelect={(name) => update({ name })}
          onToggle={favorites.toggle}
        />
      )}

      <NameTrend
        dataset={dataset}
        name={view.name}
        onClose={() => update({ name: null })}
        favorite={view.name !== null && favorites.has(view.name)}
        onToggleFavorite={() => view.name && favorites.toggle(view.name)}
      />
    </div>
  )
}

export default App
