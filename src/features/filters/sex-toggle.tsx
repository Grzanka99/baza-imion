import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { SEX_LABEL } from "@/lib/labels"
import type { Dataset, SexFilter } from "../../../shared/api"

export function SexToggle({
  dataset,
  sex,
  className,
  onChange,
}: {
  dataset: Dataset
  sex: SexFilter
  className: string
  onChange: (sex: SexFilter) => void
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label="Płeć"
      className={className}
      value={sex}
      onValueChange={(value) => {
        if (value) onChange(value as SexFilter)
      }}
    >
      <ToggleGroupItem value="all" className="flex-1 sm:flex-none">
        Wszyscy
      </ToggleGroupItem>
      <ToggleGroupItem value="M" className="flex-1 sm:flex-none">
        {SEX_LABEL[dataset].M.many}
      </ToggleGroupItem>
      <ToggleGroupItem value="K" className="flex-1 sm:flex-none">
        {SEX_LABEL[dataset].K.many}
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
