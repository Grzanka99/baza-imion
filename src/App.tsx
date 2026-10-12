import { useState } from "react"
import { X } from "lucide-react"

import { NameTrend } from "@/components/name-trend"
import { NamesTable } from "@/components/names-table"
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
import {
  SEX_LABEL,
  formatDate,
  formatNumber,
  formatPercent,
  plural,
} from "@/lib/format"
import {
  YEARS,
  type NamesResponse,
  type SexFilter,
  type SortKey,
  type SortOrder,
} from "../shared/api"

const PER_PAGE = 25
const YEAR_OPTIONS = [...YEARS].reverse()

export function App() {
  const [search, setSearch] = useState("")
  const [sex, setSex] = useState<SexFilter>("all")
  const [year, setYear] = useState("all")
  const [sort, setSort] = useState<SortKey>("count")
  const [order, setOrder] = useState<SortOrder>("desc")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string | null>(null)
  // Remounts the search box, which owns the typed text.
  const [resetCount, setResetCount] = useState(0)

  const filtered =
    search !== "" ||
    sex !== "all" ||
    year !== "all" ||
    sort !== "count" ||
    order !== "desc"

  function resetFilters() {
    setSearch("")
    setSex("all")
    setYear("all")
    setSort("count")
    setOrder("desc")
    setPage(1)
    setResetCount(resetCount + 1)
  }

  const params = new URLSearchParams({
    year,
    sex,
    q: search,
    sort,
    order,
    page: String(page),
    perPage: String(PER_PAGE),
  })
  const { data, error, loading } = useApi<NamesResponse>(`/api/names?${params}`)

  function changeSort(key: SortKey) {
    if (key === sort) {
      setOrder(order === "asc" ? "desc" : "asc")
    } else {
      setSort(key)
      setOrder(key === "name" ? "asc" : "desc")
    }
    setPage(1)
  }

  const pageCount = data ? Math.ceil(data.matchedNames / PER_PAGE) || 1 : 1

  return (
    <div className="mx-auto flex h-svh max-w-3xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Baza imion</h1>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          key={resetCount}
          onSearch={(query) => {
            setSearch(query)
            setPage(1)
          }}
        />
        <ToggleGroup
          type="single"
          variant="outline"
          aria-label="Płeć"
          value={sex}
          onValueChange={(value) => {
            if (!value) return
            setSex(value as SexFilter)
            setPage(1)
          }}
        >
          <ToggleGroupItem value="all">Wszyscy</ToggleGroupItem>
          <ToggleGroupItem value="M">{SEX_LABEL.M.many}</ToggleGroupItem>
          <ToggleGroupItem value="K">{SEX_LABEL.K.many}</ToggleGroupItem>
        </ToggleGroup>
        <Select
          value={year}
          onValueChange={(value) => {
            setYear(value)
            setPage(1)
          }}
        >
          <SelectTrigger aria-label="Rok" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="start" className="max-h-72">
            <SelectItem value="all">Wszystkie lata</SelectItem>
            {YEAR_OPTIONS.map((option) => (
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
              ? summary(data)
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
        rows={error ? [] : data?.rows}
        perPage={PER_PAGE}
        loading={loading}
        sort={sort}
        order={order}
        onSort={changeSort}
        onSelect={setSelected}
      />

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={loading || page <= 1}
          onClick={() => setPage(page - 1)}
        >
          Poprzednia
        </Button>
        <span className="text-sm text-muted-foreground tabular-nums">
          Strona {page} z {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={loading || page >= pageCount}
          onClick={() => setPage(page + 1)}
        >
          Następna
        </Button>
      </div>

      <footer className="mt-auto shrink-0 text-xs text-muted-foreground">
        Źródło: rejestr PESEL, dane.gov.pl
        {data && ` · pobrano ${formatDate(data.fetchedAt)}`}
      </footer>

      <NameTrend name={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function summary(data: NamesResponse) {
  const names = `${formatNumber(data.matchedNames)} ${plural(data.matchedNames, "imię", "imiona", "imion")}`
  const children = `${formatNumber(data.matchedCount)} ${plural(data.matchedCount, "dziecko", "dzieci", "dzieci")}`
  if (data.matchedNames === data.scopeNames) return `${names} · ${children}`
  const share = data.scopeCount ? data.matchedCount / data.scopeCount : 0
  return `${names} · ${children} · ${formatPercent(share)} wszystkich`
}

export default App
