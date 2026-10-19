import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCount } from "@/lib/format"
import { GENDER_LABEL } from "@/lib/labels"
import type { Dataset, Gender, TrendPoint } from "@baza-imion/shared"

export function TrendTable({
  dataset,
  points,
  genders,
}: {
  dataset: Dataset
  points: TrendPoint[]
  /** The genders to give a column to. */
  genders: Gender[]
}) {
  const labels = GENDER_LABEL[dataset]
  return (
    // Only the table scrolls; its container is the scroller so the header can stick.
    <div className="min-h-0 flex-1 *:data-[slot=table-container]:h-full *:data-[slot=table-container]:overflow-y-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-popover shadow-[0_1px_0_var(--border)]">
          <TableRow>
            <TableHead>Rok</TableHead>
            {genders.map((gender) => (
              <TableHead key={gender} className="text-right">
                {labels[gender].many}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {points.map((point) => (
            <TableRow key={point.year}>
              <TableCell>{point.year}</TableCell>
              {genders.map((gender) => (
                <TableCell key={gender} className="text-right tabular-nums">
                  {formatCount(point[gender])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
