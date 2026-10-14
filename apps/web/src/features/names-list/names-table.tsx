import { useEffect, useRef } from "react"

import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { NamesTableRow } from "@/features/names-list/names-table-row"
import { SortButton } from "@/features/names-list/sort-button"
import { cn } from "@/lib/utils"
import type { Dataset, NameRow, SortKey, SortOrder } from "@baza-imion/shared"

interface NamesTableProps {
  dataset: Dataset
  rows: NameRow[] | undefined
  perPage: number
  loading: boolean
  sort: SortKey
  order: SortOrder
  onSort: (key: SortKey) => void
  onSelect: (name: string) => void
  onNewRows: () => void
  isFavorite: (name: string) => boolean
  onToggleFavorite: (name: string) => void
  /** What to say when there are no rows. */
  emptyText: string
}

export function NamesTable({
  dataset,
  rows,
  perPage,
  loading,
  sort,
  order,
  onSort,
  onSelect,
  onNewRows,
  isFavorite,
  onToggleFavorite,
  emptyText,
}: NamesTableProps) {
  const container = useRef<HTMLDivElement>(null)

  // A new page or filter starts from the top of the list. On phones it is the
  // page that scrolls, not the table, and the caller knows how far.
  useEffect(() => {
    container.current
      ?.querySelector("[data-slot=table-container]")
      ?.scrollTo({ top: 0 })
    if (window.scrollY > 0) onNewRows()
  }, [rows, onNewRows])

  const sortButton = (key: SortKey, label: string) => (
    <SortButton
      label={label}
      sorted={sort === key}
      order={order}
      onSort={() => onSort(key)}
    />
  )

  return (
    // From sm up only the rows scroll: the table container is the scroller, so
    // the header can stick to it. On phones the table runs edge to edge, the
    // page scrolls, and the header sticks under the fixed bar instead; nothing
    // on the way up may clip, or the header would stick to that instead.
    <div
      ref={container}
      className="-mx-4 flex min-h-0 flex-col border-t max-sm:*:data-[slot=table-container]:overflow-visible sm:mx-0 sm:overflow-hidden sm:rounded-lg sm:border sm:*:data-[slot=table-container]:min-h-0 sm:*:data-[slot=table-container]:overflow-y-auto"
    >
      <Table>
        <TableHeader className="sticky top-(--bar-h) z-10 bg-background shadow-[0_1px_0_var(--border)] sm:top-0">
          <TableRow>
            <TableHead className="w-16 pl-4 text-right sm:pl-2">
              <span className="sm:hidden">#</span>
              <span className="hidden sm:inline">Miejsce</span>
            </TableHead>
            <TableHead className="w-[38%] sm:w-[42%]">
              {sortButton("name", "Imię")}
            </TableHead>
            <TableHead className="text-right">
              {sortButton("count", "Liczba")}
            </TableHead>
            <TableHead className="text-center">Płeć</TableHead>
            <TableHead className="text-right">Udział</TableHead>
            <TableHead className="w-9 pr-3 pl-0 sm:pr-1">
              <span className="sr-only">Ulubione</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={cn(loading && rows && "opacity-50")}>
          {!rows &&
            Array.from({ length: perPage }, (_, index) => (
              <TableRow key={index}>
                <TableCell colSpan={6}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))}
          {rows?.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-24 px-4 text-center whitespace-normal text-muted-foreground"
              >
                {emptyText}
              </TableCell>
            </TableRow>
          )}
          {rows?.map((row) => (
            <NamesTableRow
              key={row.name}
              dataset={dataset}
              row={row}
              favorite={isFavorite(row.name)}
              onSelect={() => onSelect(row.name)}
              onToggleFavorite={() => onToggleFavorite(row.name)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
