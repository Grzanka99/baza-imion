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
import { GENDER_COLOR, GENDER_LABEL } from "@/lib/labels"
import type { Dataset, Gender, TrendPoint } from "@baza-imion/shared"

export function TrendChart({
  dataset,
  points,
  genders,
}: {
  dataset: Dataset
  points: TrendPoint[]
  /** The genders to draw a line for. */
  genders: Gender[]
}) {
  const labels = GENDER_LABEL[dataset]
  const chartConfig = {
    M: { label: labels.M.many, color: GENDER_COLOR.M },
    K: { label: labels.K.many, color: GENDER_COLOR.K },
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
        {genders.length > 1 && (
          <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
        )}
        {genders.map((gender) => (
          <Line
            key={gender}
            dataKey={gender}
            type="linear"
            stroke={`var(--color-${gender})`}
            strokeWidth={2}
            dot={{
              r: 3,
              strokeWidth: 0,
              fill: `var(--color-${gender})`,
            }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}
