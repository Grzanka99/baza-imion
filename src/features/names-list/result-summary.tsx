import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatNumber, formatPercent, plural } from "@/lib/format"
import { PEOPLE_NOUN } from "@/lib/labels"
import type { Dataset, NamesResponse } from "../../../shared/api"

interface ResultSummaryProps {
  dataset: Dataset
  data: NamesResponse | undefined
  error: string | undefined
  /** Whether anything narrows or reorders the list. */
  filtered: boolean
  onReset: () => void
}

/** One line on what the list holds, with the way back to the unfiltered list. */
export function ResultSummary({
  dataset,
  data,
  error,
  filtered,
  onReset,
}: ResultSummaryProps) {
  return (
    <div className="flex min-h-7 shrink-0 items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {error ??
          (data
            ? summary(dataset, data)
            : "Pobieram dane z dane.gov.pl, to może chwilę potrwać…")}
      </p>
      {filtered && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <X />
          Wyczyść filtry
        </Button>
      )}
    </div>
  )
}

function summary(dataset: Dataset, data: NamesResponse) {
  const names = `${formatNumber(data.matchedNames)} ${plural(data.matchedNames, "imię", "imiona", "imion")}`
  const people = `${formatNumber(data.matchedCount)} ${plural(data.matchedCount, ...PEOPLE_NOUN[dataset])}`
  if (data.matchedNames === data.scopeNames) return `${names} · ${people}`
  const share = data.scopeCount ? data.matchedCount / data.scopeCount : 0
  return `${names} · ${people} · ${formatPercent(share)} wszystkich`
}
