import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatCompact } from "@/lib/format"
import { SEX_COLOR, SEX_LABEL } from "@/lib/labels"
import type { Dataset, Sex, TrendPoint } from "@baza-imion/shared"

export function TrendChart({
  dataset,
  points,
  sexes,
}: {
  dataset: Dataset
  points: TrendPoint[]
  /** The sexes to draw a line for. */
  sexes: Sex[]
}) {
  const labels = SEX_LABEL[dataset]
  const chartConfig = {
    M: { label: labels.M.many, color: SEX_COLOR.M },
    K: { label: labels.K.many, color: SEX_COLOR.K },
  } satisfies ChartConfig
  // Years below the reporting threshold are gaps in the line, not zeros.
  const chartData = points.map((point) => ({
    year: point.year,
    M: point.M || null,
    K: point.K || null,
  }))

  return (
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
          <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
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
  )
}
