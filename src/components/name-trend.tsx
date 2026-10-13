import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { FavoriteButton } from "@/components/favorite-button"
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
import {
  SEX_COLOR,
  SEX_LABEL,
  displayName,
  formatCompact,
  formatNumber,
} from "@/lib/format"
import type { Dataset, Sex, TrendResponse } from "../../shared/api"

const SEXES: Sex[] = ["M", "K"]

const FOOTNOTE: Record<Dataset, string> = {
  children:
    "Rejestr nie wykazuje imion nadanych w danym roku mniej niż 5 razy (od 2013 r. mniej niż 2 razy), dlatego brak danych nie oznacza zera.",
  population:
    "Liczba żyjących osób o tym imieniu według stanu rejestru na styczeń danego roku (w 2019 r. na lipiec). Imiona noszone przez jedną osobę nie są wykazywane, dlatego brak danych nie oznacza zera.",
}

interface NameTrendProps {
  dataset: Dataset
  name: string | null
  onClose: () => void
  favorite: boolean
  onToggleFavorite: () => void
}

export function NameTrend({
  dataset,
  name,
  onClose,
  favorite,
  onToggleFavorite,
}: NameTrendProps) {
  const { data, error, loading } = useApi<TrendResponse>(
    name && `/api/trend?dataset=${dataset}&name=${encodeURIComponent(name)}`
  )
  const trend = loading || error ? undefined : data
  const labels = SEX_LABEL[dataset]
  const chartConfig = {
    M: { label: labels.M.many, color: SEX_COLOR.M },
    K: { label: labels.K.many, color: SEX_COLOR.K },
  } satisfies ChartConfig
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
          <SheetTitle className="flex items-center gap-1 pr-8 text-xl">
            {displayName(name ?? trend?.name ?? "")}
            {name && (
              <FavoriteButton active={favorite} onToggle={onToggleFavorite} />
            )}
          </SheetTitle>
          <SheetDescription>
            {trend
              ? headline(dataset, trend, sexes)
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
                    width={64}
                    allowDecimals={false}
                    tickFormatter={formatCompact}
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
                          {labels[sex].many}
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
                {FOOTNOTE[dataset]}
              </p>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Births add up over the years; a population is read off the latest snapshot. */
function headline(dataset: Dataset, trend: TrendResponse, sexes: Sex[]) {
  const labels = SEX_LABEL[dataset]
  const first = trend.points[0]
  const last = trend.points.at(-1)!
  if (dataset === "children") {
    const totals = sexes.map(
      (sex) => `${labels[sex].many}: ${formatNumber(trend.totals[sex])}`
    )
    return `${totals.join(" · ")} w latach ${first.year}–${last.year}`
  }
  const latest = sexes.map(
    (sex) =>
      `${labels[sex].many}: ${last[sex] ? formatNumber(last[sex]) : "brak danych"}`
  )
  return `${latest.join(" · ")} w ${last.year} r.`
}
