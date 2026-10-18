import { SexIcons } from "@/components/sex-icon"
import { TableCell, TableRow } from "@/components/ui/table"
import { FavoriteButton } from "@/features/favorites/favorite-button"
import { displayName, formatNumber, formatPercent } from "@/lib/format"
import type { MouseEvent } from "react"

import { namePath, type Dataset, type NameRow } from "@baza-imion/shared"

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
  onSelect: (name: string) => void
  onToggleFavorite: (name: string) => void
}) {
  function handleOnClick() {
    onSelect(row.name)
  }

  /** A plain click opens the trend in place, through the row; Ctrl, Cmd or Shift opens the page as the browser would. */
  function handleOnLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      event.stopPropagation()
      return
    }
    event.preventDefault()
  }

  function handleOnToggleFavorite() {
    onToggleFavorite(row.name)
  }

  return (
    <TableRow className="cursor-pointer" onClick={handleOnClick}>
      <TableCell className="pl-4 text-right text-muted-foreground tabular-nums sm:pl-2">
        {row.rank}
      </TableCell>
      <TableCell>
        {/* Keyboard access to the row, and the page search engines follow. */}
        <a
          href={namePath(row.name)}
          className="cursor-pointer rounded-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={handleOnLinkClick}
        >
          {displayName(row.name)}
        </a>
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
        <FavoriteButton active={favorite} onToggle={handleOnToggleFavorite} />
      </TableCell>
    </TableRow>
  )
}
