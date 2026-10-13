import { useState } from "react"
import { Dices, Heart, X } from "lucide-react"

import { Collapse } from "@/components/collapse"
import { FavoritesPanel } from "@/components/favorites-panel"
import { NameTrend } from "@/components/name-trend"
import { NamesTable } from "@/components/names-table"
import { Pagination } from "@/components/pagination"
import { SearchInput } from "@/components/search-input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useApi } from "@/hooks/use-api"
import { useFavorites } from "@/hooks/use-favorites"
import { usePhoneBar } from "@/hooks/use-phone-bar"
import { naturalOrder, useView } from "@/hooks/use-view"
import {
  PEOPLE_NOUN,
  SEX_LABEL,
  displayName,
  formatNumber,
  formatPercent,
  plural,
} from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  DATASET_YEARS,
  defaultYear,
  type Dataset,
  type NamesResponse,
  type SexFilter,
  type SortKey,
} from "../shared/api"

const PER_PAGE = 25

export function App() {
  const [view, update] = useView()
  const { dataset, search, sex, year, sort, order, page } = view
  // Remounts the search box, which owns the typed text.
  const [resetCount, setResetCount] = useState(0)
  const { bar, collapsed, scrollToList } = usePhoneBar()
  const favorites = useFavorites()

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
    setResetCount(resetCount + 1)
  }

  const params = new URLSearchParams({
    dataset,
    year: String(year),
    sex,
    q: search,
    sort,
    order,
    page: String(page),
    perPage: String(PER_PAGE),
  })
  if (view.favorites) params.set("names", favorites.names.join(","))
  const { data, error, loading } = useApi<NamesResponse>(`/api/names?${params}`)

  function changeSort(key: SortKey) {
    const flipped = order === "asc" ? "desc" : "asc"
    update({
      sort: key,
      order: key === sort ? flipped : naturalOrder(key),
      page: 1,
    })
  }

  const [drawing, setDrawing] = useState(false)

  /** Searches for an uncommon name drawn at random from the current selection. */
  async function drawName() {
    setDrawing(true)
    try {
      const query = new URLSearchParams({
        dataset,
        year: String(year),
        sex,
        random: "1",
      })
      const response = await fetch(`/api/names?${query}`, { cache: "no-store" })
      const drawn: NamesResponse = await response.json()
      if (response.ok && drawn.rows[0]) {
        update({ search: displayName(drawn.rows[0].name), page: 1 })
        // The search box owns its text, so it is remounted to show the name.
        setResetCount((count) => count + 1)
      }
    } catch {
      // Nothing opens; the button can simply be pressed again.
    } finally {
      setDrawing(false)
    }
  }

  const pageCount = data ? Math.ceil(data.matchedNames / PER_PAGE) || 1 : 1
  // The server answers with the last page when the URL asks for one past it.
  const shownPage = data && !loading ? data.page : page

  const sexToggle = (className: string) => (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label="Płeć"
      className={className}
      value={sex}
      onValueChange={(value) => {
        if (value) update({ sex: value as SexFilter, page: 1 })
      }}
    >
      <ToggleGroupItem value="all" className="flex-1 sm:flex-none">
        Wszyscy
      </ToggleGroupItem>
      <ToggleGroupItem value="M" className="flex-1 sm:flex-none">
        {SEX_LABEL[dataset].M.many}
      </ToggleGroupItem>
      <ToggleGroupItem value="K" className="flex-1 sm:flex-none">
        {SEX_LABEL[dataset].K.many}
      </ToggleGroupItem>
    </ToggleGroup>
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
              <ToggleGroup
                type="single"
                variant="outline"
                aria-label="Zbiór danych"
                value={dataset}
                onValueChange={(value) => {
                  if (!value) return
                  const next = value as Dataset
                  update({
                    dataset: next,
                    year: defaultYear(next),
                    page: 1,
                    name: null,
                  })
                }}
              >
                <ToggleGroupItem value="population">
                  Cała populacja
                </ToggleGroupItem>
                <ToggleGroupItem value="children">Noworodki</ToggleGroupItem>
              </ToggleGroup>
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
              <Select
                value={String(year)}
                onValueChange={(value) =>
                  update({
                    year: value === "all" ? "all" : Number(value),
                    page: 1,
                  })
                }
              >
                <SelectTrigger aria-label="Rok" className="w-auto sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  align="start"
                  className="max-h-72"
                >
                  {dataset === "children" && (
                    <SelectItem value="all">
                      Wszystkie<span className="hidden sm:inline"> lata</span>
                    </SelectItem>
                  )}
                  {DATASET_YEARS[dataset].toReversed().map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                aria-label="Wylosuj rzadkie imię"
                title="Wylosuj rzadkie imię"
                disabled={drawing}
                onClick={drawName}
              >
                <Dices />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-pressed={view.favorites}
                aria-label="Pokaż tylko ulubione"
                title="Pokaż tylko ulubione"
                className={cn("lg:hidden", view.favorites && "bg-muted")}
                onClick={() => update({ favorites: !view.favorites, page: 1 })}
              >
                <Heart
                  className={cn(
                    view.favorites && "fill-rose-500 text-rose-500"
                  )}
                />
              </Button>
            </div>
          </Collapse>

          <div className="sm:hidden">{sexToggle("w-full")}</div>

          <Collapse open={!collapsed} className="pt-3">
            <div className="flex min-h-7 shrink-0 items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                {error ??
                  (data
                    ? summary(dataset, data)
                    : "Pobieram dane z dane.gov.pl, to może chwilę potrwać…")}
              </p>
              {filtered && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <X />
                  Wyczyść filtry
                </Button>
              )}
            </div>
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

function summary(dataset: Dataset, data: NamesResponse) {
  const names = `${formatNumber(data.matchedNames)} ${plural(data.matchedNames, "imię", "imiona", "imion")}`
  const people = `${formatNumber(data.matchedCount)} ${plural(data.matchedCount, ...PEOPLE_NOUN[dataset])}`
  if (data.matchedNames === data.scopeNames) return `${names} · ${people}`
  const share = data.scopeCount ? data.matchedCount / data.scopeCount : 0
  return `${names} · ${people} · ${formatPercent(share)} wszystkich`
}

export default App
