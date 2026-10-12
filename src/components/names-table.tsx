import { useEffect, useRef } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import { SexIcon } from "@/components/sex-icon"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { displayName, formatNumber, formatPercent } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { NameRow, SortKey, SortOrder } from "../../shared/api"

interface NamesTableProps {
  rows: NameRow[] | undefined
  perPage: number
  loading: boolean
  sort: SortKey
  order: SortOrder
  onSort: (key: SortKey) => void
  onSelect: (name: string) => void
}

export function NamesTable({
  rows,
  perPage,
  loading,
  sort,
  order,
  onSort,
  onSelect,
}: NamesTableProps) {
  const container = useRef<HTMLDivElement>(null)

  // A new page or filter starts from the top of the list.
  useEffect(() => {
    container.current
      ?.querySelector("[data-slot=table-container]")
      ?.scrollTo({ top: 0 })
  }, [rows])

  function sortButton(key: SortKey, label: string) {
    const Icon =
      sort !== key ? ArrowUpDown : order === "asc" ? ArrowUp : ArrowDown
    return (
      <Button
        variant="ghost"
        size="sm"
        className="-mx-2"
        onClick={() => onSort(key)}
      >
        {label}
        <Icon className={cn(sort !== key && "text-muted-foreground")} />
      </Button>
    )
  }

  return (
    // Only the rows scroll; the table container is the scroller so the header can stick.
    <div
      ref={container}
      className="flex min-h-0 flex-col overflow-hidden rounded-lg border *:data-[slot=table-container]:min-h-0 *:data-[slot=table-container]:overflow-y-auto"
    >
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_var(--border)]">
          <TableRow>
            <TableHead className="w-16 text-right">Miejsce</TableHead>
            <TableHead className="w-full">
              {sortButton("name", "Imię")}
            </TableHead>
            <TableHead className="w-12 text-center">Płeć</TableHead>
            <TableHead className="text-right">
              {sortButton("count", "Liczba")}
            </TableHead>
            <TableHead className="w-24 text-right">Udział</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className={cn(loading && rows && "opacity-50")}>
          {!rows &&
            Array.from({ length: perPage }, (_, index) => (
              <TableRow key={index}>
                <TableCell colSpan={5}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))}
          {rows?.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="h-24 text-center text-muted-foreground"
              >
                Brak imion pasujących do wyszukiwania.
              </TableCell>
            </TableRow>
          )}
          {rows?.map((row) => (
            <TableRow
              key={`${row.sex}:${row.name}`}
              className="cursor-pointer"
              onClick={() => onSelect(row.name)}
            >
              <TableCell className="text-right text-muted-foreground tabular-nums">
                {row.rank}
              </TableCell>
              <TableCell>
                {/* Keyboard access to the row; its click bubbles up to the row. */}
                <button
                  type="button"
                  className="cursor-pointer rounded-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {displayName(row.name)}
                </button>
              </TableCell>
              <TableCell className="text-center">
                <SexIcon sex={row.sex} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatNumber(row.count)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground tabular-nums">
                {formatPercent(row.share)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
