import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCount } from "@/lib/format"
import { SEX_LABEL } from "@/lib/labels"
import type { Dataset, Sex, TrendPoint } from "@baza-imion/shared"

export function TrendTable({
  dataset,
  points,
  sexes,
}: {
  dataset: Dataset
  points: TrendPoint[]
  /** The sexes to give a column to. */
  sexes: Sex[]
}) {
  const labels = SEX_LABEL[dataset]
  return (
    // Only the table scrolls; its container is the scroller so the header can stick.
    <div className="min-h-0 flex-1 *:data-[slot=table-container]:h-full *:data-[slot=table-container]:overflow-y-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-popover shadow-[0_1px_0_var(--border)]">
          <TableRow>
            <TableHead>Rok</TableHead>
            {sexes.map((sex) => (
              <TableHead key={sex} className="text-right">
                {labels[sex].many}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {points.map((point) => (
            <TableRow key={point.year}>
              <TableCell>{point.year}</TableCell>
              {sexes.map((sex) => (
                <TableCell key={sex} className="text-right tabular-nums">
                  {formatCount(point[sex])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
