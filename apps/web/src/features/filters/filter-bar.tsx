import type { ReactNode, RefObject } from "react"

import { Collapse } from "@/components/collapse"
import { OnlyFavoritesButton } from "@/features/favorites/only-favorites-button"
import { DatasetToggle } from "@/features/filters/dataset-toggle"
import { RandomNameButton } from "@/features/filters/random-name-button"
import { SearchInput } from "@/features/filters/search-input"
import { SexToggle } from "@/features/filters/sex-toggle"
import { YearSelect } from "@/features/filters/year-select"
import type { View } from "@/hooks/use-view"
import {
  defaultYear,
  type Dataset,
  type SexFilter,
  type YearFilter,
} from "@baza-imion/shared"

interface FilterBarProps {
  /** From `usePhoneBar`: the element it measures, and whether it is folded. */
  bar: RefObject<HTMLDivElement | null>
  collapsed: boolean
  view: View
  update: (changes: Partial<View>) => void
  /** Remounts the search box, which owns the typed text. */
  searchKey: number
  onDraw: (name: string) => void
  /** The line under the filters. */
  children: ReactNode
}

/**
 * The title and the filters. On phones a fixed bar that folds down to the sex
 * switch while the page scrolls; from sm up its parts are ordinary rows of
 * the page.
 */
export function FilterBar({
  bar,
  collapsed,
  view,
  update,
  searchKey,
  onDraw,
  children,
}: FilterBarProps) {
  const { dataset, search, sex, year } = view

  function handleOnSexChange(next: SexFilter) {
    update({ sex: next, page: 1 })
  }

  function handleOnDatasetChange(next: Dataset) {
    update({ dataset: next, year: defaultYear(next), page: 1, name: null })
  }

  function handleOnSearch(query: string) {
    update({ search: query, page: 1 })
  }

  function handleOnYearChange(next: YearFilter) {
    update({ year: next, page: 1 })
  }

  function handleOnFavoritesToggle() {
    update({ favorites: !view.favorites, page: 1 })
  }

  const sexToggle = (className: string) => (
    <SexToggle
      dataset={dataset}
      sex={sex}
      className={className}
      onChange={handleOnSexChange}
    />
  )

  return (
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
          <DatasetToggle dataset={dataset} onChange={handleOnDatasetChange} />
        </header>
      </Collapse>

      <Collapse open={!collapsed} className="pb-3">
        <div className="flex items-center gap-3 sm:flex-wrap">
          <SearchInput
            key={searchKey}
            initialValue={search}
            onSearch={handleOnSearch}
          />
          {sexToggle("hidden sm:flex")}
          <YearSelect
            dataset={dataset}
            year={year}
            onChange={handleOnYearChange}
          />
          <RandomNameButton
            dataset={dataset}
            year={year}
            sex={sex}
            onDraw={onDraw}
          />
          <OnlyFavoritesButton
            active={view.favorites}
            onToggle={handleOnFavoritesToggle}
          />
        </div>
      </Collapse>

      <div className="sm:hidden">{sexToggle("w-full")}</div>

      <Collapse open={!collapsed} className="pt-3">
        {children}
      </Collapse>
    </div>
  )
}
