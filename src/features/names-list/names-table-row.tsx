import { SexIcons } from "@/components/sex-icon"
import { TableCell, TableRow } from "@/components/ui/table"
import { FavoriteButton } from "@/features/favorites/favorite-button"
import { displayName, formatNumber, formatPercent } from "@/lib/format"
import type { Dataset, NameRow } from "../../../shared/api"

export function NamesTableRow({
  dataset,
  row,
  favorite,
  onSelect,
  onToggleFavorite,
}: {
  dataset: Dataset
  row: NameRow
  favorite: boolean
  onSelect: () => void
  onToggleFavorite: () => void
}) {
  return (
    <TableRow className="cursor-pointer" onClick={onSelect}>
      <TableCell className="pl-4 text-right text-muted-foreground tabular-nums sm:pl-2">
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
      <TableCell className="text-right tabular-nums">
        {formatNumber(row.count)}
      </TableCell>
      <TableCell className="text-center">
        <SexIcons dataset={dataset} row={row} />
      </TableCell>
      <TableCell className="text-right text-muted-foreground tabular-nums">
        {formatPercent(row.share)}
      </TableCell>
      <TableCell className="py-0 pr-3 pl-0 sm:pr-1">
        <FavoriteButton active={favorite} onToggle={onToggleFavorite} />
      </TableCell>
    </TableRow>
  )
}
