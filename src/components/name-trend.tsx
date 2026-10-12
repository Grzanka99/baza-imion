import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useApi } from "@/hooks/use-api"
import { SEX_COLOR, SEX_LABEL, displayName, formatNumber } from "@/lib/format"
import {
  FIRST_YEAR,
  LAST_YEAR,
  type Sex,
  type TrendResponse,
} from "../../shared/api"

const chartConfig = {
  M: { label: SEX_LABEL.M.many, color: SEX_COLOR.M },
  K: { label: SEX_LABEL.K.many, color: SEX_COLOR.K },
} satisfies ChartConfig

const SEXES: Sex[] = ["M", "K"]

interface NameTrendProps {
  name: string | null
  onClose: () => void
}

export function NameTrend({ name, onClose }: NameTrendProps) {
  const { data, error, loading } = useApi<TrendResponse>(
    name && `/api/trend?name=${encodeURIComponent(name)}`
  )
  const trend = loading || error ? undefined : data
  const sexes = trend ? SEXES.filter((sex) => trend.totals[sex] > 0) : []
  // Years below the reporting threshold are gaps in the line, not zeros.
  const chartData = trend?.points.map((point) => ({
    year: point.year,
    M: point.M || null,
    K: point.K || null,
  }))

  return (
    <Sheet open={name !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="data-[side=right]:sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-xl">
            {displayName(name ?? trend?.name ?? "")}
          </SheetTitle>
          <SheetDescription>
            {trend
              ? sexes
                  .map(
                    (sex) =>
                      `${SEX_LABEL[sex].many}: ${formatNumber(trend.totals[sex])}`
                  )
                  .join(" · ") + ` w latach ${FIRST_YEAR}–${LAST_YEAR}`
              : (error ?? "Pobieram dane…")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 px-4 pb-6">
          {!trend && !error && <Skeleton className="h-56 w-full" />}
          {trend && (
            <>
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-56 w-full shrink-0"
              >
                <LineChart data={chartData} margin={{ left: 0, right: 20 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="year"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={24}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    allowDecimals={false}
                    tickFormatter={formatNumber}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {sexes.length > 1 && (
                    <ChartLegend
                      content={<ChartLegendContent />}
                      itemSorter={null}
                    />
                  )}
                  {sexes.map((sex) => (
                    <Line
                      key={sex}
                      dataKey={sex}
                      type="linear"
                      stroke={`var(--color-${sex})`}
                      strokeWidth={2}
                      dot={{
                        r: 3,
                        strokeWidth: 0,
                        fill: `var(--color-${sex})`,
                      }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ChartContainer>

              {/* Only the table scrolls; its container is the scroller so the header can stick. */}
              <div className="min-h-0 flex-1 *:data-[slot=table-container]:h-full *:data-[slot=table-container]:overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-popover shadow-[0_1px_0_var(--border)]">
                    <TableRow>
                      <TableHead>Rok</TableHead>
                      {sexes.map((sex) => (
                        <TableHead key={sex} className="text-right">
                          {SEX_LABEL[sex].many}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trend.points.map((point) => (
                      <TableRow key={point.year}>
                        <TableCell>{point.year}</TableCell>
                        {sexes.map((sex) => (
                          <TableCell
                            key={sex}
                            className="text-right tabular-nums"
                          >
                            {point[sex] ? formatNumber(point[sex]) : "–"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <p className="shrink-0 text-xs text-muted-foreground">
                Rejestr nie wykazuje imion nadanych w danym roku mniej niż 5
                razy (od 2013 r. mniej niż 2 razy), dlatego brak danych nie
                oznacza zera.
              </p>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
