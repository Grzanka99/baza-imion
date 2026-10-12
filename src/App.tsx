import { useState } from "react"
import { X } from "lucide-react"

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
import { naturalOrder, useView } from "@/hooks/use-view"
import {
  PEOPLE_NOUN,
  SEX_LABEL,
  formatDate,
  formatNumber,
  formatPercent,
  plural,
} from "@/lib/format"
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

  const filtered =
    search !== "" ||
    sex !== "all" ||
    year !== defaultYear(dataset) ||
    sort !== "count" ||
    order !== "desc"

  function resetFilters() {
    update({
      search: "",
      sex: "all",
      year: defaultYear(dataset),
      sort: "count",
      order: "desc",
      page: 1,
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
  const { data, error, loading } = useApi<NamesResponse>(`/api/names?${params}`)

  function changeSort(key: SortKey) {
    const flipped = order === "asc" ? "desc" : "asc"
    update({
      sort: key,
      order: key === sort ? flipped : naturalOrder(key),
      page: 1,
    })
  }

  const pageCount = data ? Math.ceil(data.matchedNames / PER_PAGE) || 1 : 1
  // The server answers with the last page when the URL asks for one past it.
  const shownPage = data && !loading ? data.page : page

  return (
    <div className="mx-auto flex h-svh max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Baza imion</h1>
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
          <ToggleGroupItem value="population">Cała populacja</ToggleGroupItem>
          <ToggleGroupItem value="children">Noworodki</ToggleGroupItem>
        </ToggleGroup>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          key={resetCount}
          initialValue={search}
          onSearch={(query) => update({ search: query, page: 1 })}
        />
        <ToggleGroup
          type="single"
          variant="outline"
          aria-label="Płeć"
          value={sex}
          onValueChange={(value) => {
            if (value) update({ sex: value as SexFilter, page: 1 })
          }}
        >
          <ToggleGroupItem value="all">Wszyscy</ToggleGroupItem>
          <ToggleGroupItem value="M">
            {SEX_LABEL[dataset].M.many}
          </ToggleGroupItem>
          <ToggleGroupItem value="K">
            {SEX_LABEL[dataset].K.many}
          </ToggleGroupItem>
        </ToggleGroup>
        <Select
          value={String(year)}
          onValueChange={(value) =>
            update({ year: value === "all" ? "all" : Number(value), page: 1 })
          }
        >
          <SelectTrigger aria-label="Rok" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="start" className="max-h-72">
            {dataset === "children" && (
              <SelectItem value="all">Wszystkie lata</SelectItem>
            )}
            {DATASET_YEARS[dataset].toReversed().map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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

      <NamesTable
        dataset={dataset}
        rows={error ? [] : data?.rows}
        perPage={PER_PAGE}
        loading={loading}
        sort={sort}
        order={order}
        onSort={changeSort}
        onSelect={(name) => update({ name })}
      />

      <Pagination
        page={shownPage}
        pageCount={pageCount}
        disabled={loading}
        onPage={(next) => update({ page: next })}
      />

      <footer className="mt-auto shrink-0 text-xs text-muted-foreground">
        Źródło: rejestr PESEL, dane.gov.pl
        {data && ` · pobrano ${formatDate(data.fetchedAt)}`}
      </footer>

      <NameTrend
        dataset={dataset}
        name={view.name}
        onClose={() => update({ name: null })}
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
