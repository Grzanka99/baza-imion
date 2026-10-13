import { namesUrl } from "@/api-client/urls"
import { useApi } from "@/api-client/use-api"
import { SexIcons } from "@/components/sex-icon"
import { FavoriteButton } from "@/features/favorites/favorite-button"
import { displayName, formatNumber, formatPercent } from "@/lib/format"
import type {
  Dataset,
  NamesResponse,
  SexFilter,
  YearFilter,
} from "../../../shared/api"

// The most rows the API returns at once; favourites beyond that are still
// listed, just without figures.
const MAX_WITH_FIGURES = 100

interface FavoritesPanelProps {
  dataset: Dataset
  year: YearFilter
  sex: SexFilter
  /** Favourite names, alphabetically. */
  names: string[]
  onSelect: (name: string) => void
  onToggle: (name: string) => void
}

/** The desktop side column: every favourite, with its figures in the current view. */
export function FavoritesPanel({
  dataset,
  year,
  sex,
  names,
  onSelect,
  onToggle,
}: FavoritesPanelProps) {
  const { data } = useApi<NamesResponse>(
    namesUrl({ dataset, year, sex, names, perPage: MAX_WITH_FIGURES })
  )

  // Names with figures come first, most common on top; the rest (absent from
  // this dataset, year or sex) follow alphabetically.
  const rows = new Map(data?.rows.map((row) => [row.name, row]))
  const listed = [
    ...(data?.rows.map((row) => row.name) ?? []).filter((name) =>
      names.includes(name)
    ),
    ...names.filter((name) => !rows.has(name)),
  ]

  return (
    <aside className="hidden min-h-0 w-[30%] shrink-0 flex-col gap-6 lg:flex">
      <h2 className="flex h-8 shrink-0 items-center gap-2 text-lg font-semibold tracking-tight">
        Ulubione
        <span className="text-sm font-normal text-muted-foreground tabular-nums">
          {names.length}
        </span>
      </h2>
      {/* The list scrolls on its own once it is taller than the window. */}
      <ul className="min-h-0 overflow-y-auto rounded-lg border">
        {listed.map((name) => {
          const row = rows.get(name)
          return (
            <li
              key={name}
              className="grid grid-cols-[minmax(0,1fr)_auto_2.25rem_3.25rem_1.75rem] items-center gap-x-2 border-b py-1 pr-1 pl-3 text-sm last:border-0 hover:bg-muted/50"
            >
              <button
                type="button"
                className="cursor-pointer truncate rounded-sm py-1 text-left font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onSelect(name)}
              >
                {displayName(name)}
              </button>
              <span className="text-right tabular-nums">
                {row ? formatNumber(row.count) : "–"}
              </span>
              <span className="text-center">
                {row && <SexIcons dataset={dataset} row={row} />}
              </span>
              <span className="text-right text-muted-foreground tabular-nums">
                {row && formatPercent(row.share)}
              </span>
              <FavoriteButton active onToggle={() => onToggle(name)} />
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
