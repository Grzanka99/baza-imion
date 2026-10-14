import { useState } from "react"

import { FavoritesPanel } from "@/features/favorites/favorites-panel"
import { useFavorites } from "@/features/favorites/use-favorites"
import { FilterBar } from "@/features/filters/filter-bar"
import { NameTrend } from "@/features/name-trend/name-trend"
import { NamesTable } from "@/features/names-list/names-table"
import { Pagination } from "@/features/names-list/pagination"
import { ResultSummary } from "@/features/names-list/result-summary"
import { PER_PAGE, useNamesList } from "@/features/names-list/use-names-list"
import { usePhoneBar } from "@/hooks/use-phone-bar"
import { useView } from "@/hooks/use-view"
import { displayName } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  defaultYear,
  naturalOrder,
  oppositeOrder,
  type SortKey,
} from "../shared/api"

export default function App() {
  const [view, update] = useView()
  const { dataset, search, sex, year, sort, order } = view
  // Remounts the search box, which owns the typed text.
  const [resetCount, setResetCount] = useState(0)
  const { bar, collapsed, scrollToList } = usePhoneBar()
  const favorites = useFavorites()

  const list = useNamesList(view, favorites.names)
  const { data, error, loading } = list

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

  /** Pressing the sorted column again flips it; another column starts in its natural order. */
  function changeSort(key: SortKey) {
    let next = naturalOrder(key)
    if (key === sort) next = oppositeOrder(order)
    update({ sort: key, order: next, page: 1 })
  }

  /** Searches for the name the dice came up with. */
  function searchFor(name: string) {
    update({ search: displayName(name), page: 1 })
    setResetCount((count) => count + 1)
  }

  return (
    // From lg up, favourites get a column of their own beside the list.
    <div
      className={cn(
        "mx-auto flex min-h-svh max-w-3xl sm:h-svh sm:p-6 lg:gap-8",
        favorites.names.length > 0 && "lg:max-w-6xl"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-4 px-4 pt-[var(--bar-full,12rem)] pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:min-h-0 sm:gap-6 sm:p-0">
        <FilterBar
          bar={bar}
          collapsed={collapsed}
          view={view}
          update={update}
          searchKey={resetCount}
          onDraw={searchFor}
        >
          <ResultSummary
            dataset={dataset}
            data={data}
            error={error}
            filtered={filtered}
            onReset={resetFilters}
          />
        </FilterBar>

        <NamesTable
          dataset={dataset}
          rows={list.rows}
          perPage={PER_PAGE}
          loading={loading}
          sort={sort}
          order={order}
          onSort={changeSort}
          onSelect={(name) => update({ name })}
          onNewRows={scrollToList}
          isFavorite={favorites.has}
          onToggleFavorite={favorites.toggle}
          emptyText={list.emptyText}
        />

        <Pagination
          page={list.shownPage}
          pageCount={list.pageCount}
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
