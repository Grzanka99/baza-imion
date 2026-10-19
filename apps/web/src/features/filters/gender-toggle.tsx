import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { track } from "@/lib/analytics"
import { GENDER_LABEL } from "@/lib/labels"
import type { Dataset, GenderFilter } from "@baza-imion/shared"

export function GenderToggle({
  dataset,
  gender,
  className,
  onChange,
}: {
  dataset: Dataset
  gender: GenderFilter
  className: string
  onChange: (gender: GenderFilter) => void
}) {
  function handleOnValueChange(value: string) {
    if (value) {
      track("gender-changed", { gender: value })
      onChange(value as GenderFilter)
    }
  }

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label="Płeć"
      className={className}
      value={gender}
      onValueChange={handleOnValueChange}
    >
      <ToggleGroupItem value="all" className="flex-1 sm:flex-none">
        Wszyscy
      </ToggleGroupItem>
      <ToggleGroupItem value="M" className="flex-1 sm:flex-none">
        {GENDER_LABEL[dataset].M.many}
      </ToggleGroupItem>
      <ToggleGroupItem value="K" className="flex-1 sm:flex-none">
        {GENDER_LABEL[dataset].K.many}
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
