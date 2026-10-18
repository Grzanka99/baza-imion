import { useEffect } from "react"

import { trendUrl } from "@/api-client/urls"
import { useApi } from "@/api-client/use-api"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { FavoriteButton } from "@/features/favorites/favorite-button"
import { TrendChart } from "@/features/name-trend/trend-chart"
import { TrendTable } from "@/features/name-trend/trend-table"
import { trackName } from "@/lib/analytics"
import { displayName, formatCount, formatNumber } from "@/lib/format"
import { SEX_LABEL } from "@/lib/labels"
import type { Dataset, Sex, TrendResponse } from "@baza-imion/shared"

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
  onToggleFavorite: (name: string) => void
}

/** The sheet that opens for one name: its counts year by year, as a chart and a table. */
export function NameTrend({
  dataset,
  name,
  onClose,
  favorite,
  onToggleFavorite,
}: NameTrendProps) {
  const { data, error, loading } = useApi<TrendResponse>(
    name && trendUrl(dataset, name)
  )
  let trend = data
  if (loading || error) {
    trend = undefined
  }
  const shown = trend?.name

  // Reported once the server has confirmed the name, not on the click.
  useEffect(() => {
    if (name && shown) {
      trackName("trend-opened", shown)
    }
  }, [name, shown])

  const totals = trend?.totals ?? { M: 0, K: 0 }
  const sexes = SEXES.filter((sex) => totals[sex] > 0)

  let description = error ?? "Pobieram dane…"
  if (trend) {
    description = headline(dataset, trend, sexes)
  }

  function handleOnOpenChange(open: boolean) {
    if (!open) {
      onClose()
    }
  }

  function handleOnToggleFavorite() {
    if (name) {
      onToggleFavorite(name)
    }
  }

  return (
    <Sheet open={name !== null} onOpenChange={handleOnOpenChange}>
      <SheetContent className="data-[side=right]:sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-1 pr-8 text-xl">
            {displayName(name ?? trend?.name ?? "")}
            {name && (
              <FavoriteButton
                active={favorite}
                onToggle={handleOnToggleFavorite}
              />
            )}
          </SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 px-4 pb-6">
          {!trend && !error && <Skeleton className="h-56 w-full" />}
          {trend && (
            <>
              <TrendChart
                dataset={dataset}
                points={trend.points}
                sexes={sexes}
              />
              <TrendTable
                dataset={dataset}
                points={trend.points}
                sexes={sexes}
              />
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
    (sex) => `${labels[sex].many}: ${formatCount(last[sex], "brak danych")}`
  )
  return `${latest.join(" · ")} w ${last.year} r.`
}
