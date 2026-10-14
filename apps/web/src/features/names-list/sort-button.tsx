import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { SortOrder } from "@baza-imion/shared"

function SortArrow({ sorted, order }: { sorted: boolean; order: SortOrder }) {
  if (!sorted) return <ArrowUpDown className="text-muted-foreground" />
  if (order === "asc") return <ArrowUp />
  return <ArrowDown />
}

/** A column heading that sorts the list by its column; the arrow shows the order. */
export function SortButton({
  label,
  sorted,
  order,
  onSort,
}: {
  label: string
  /** Whether the list is sorted by this column. */
  sorted: boolean
  order: SortOrder
  onSort: () => void
}) {
  return (
    <Button variant="ghost" size="sm" className="-mx-2" onClick={onSort}>
      {label}
      <SortArrow sorted={sorted} order={order} />
    </Button>
  )
}
