import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DATASET_YEARS,
  type Dataset,
  type YearFilter,
} from "../../../shared/api"

export function YearSelect({
  dataset,
  year,
  onChange,
}: {
  dataset: Dataset
  year: YearFilter
  onChange: (year: YearFilter) => void
}) {
  return (
    <Select
      value={String(year)}
      onValueChange={(value) => {
        if (value === "all") onChange("all")
        else onChange(Number(value))
      }}
    >
      <SelectTrigger aria-label="Rok" className="w-auto sm:w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start" className="max-h-72">
        {dataset === "children" && (
          <SelectItem value="all">
            Wszystkie<span className="hidden sm:inline"> lata</span>
          </SelectItem>
        )}
        {DATASET_YEARS[dataset].toReversed().map((option) => (
          <SelectItem key={option} value={String(option)}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
