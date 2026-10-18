import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { track } from "@/lib/analytics"
import type { Dataset } from "@baza-imion/shared"

export function DatasetToggle({
  dataset,
  onChange,
}: {
  dataset: Dataset
  onChange: (dataset: Dataset) => void
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label="Zbiór danych"
      value={dataset}
      onValueChange={(value) => {
        if (!value) return
        track("dataset-changed", { dataset: value })
        onChange(value as Dataset)
      }}
    >
      <ToggleGroupItem value="population">Cała populacja</ToggleGroupItem>
      <ToggleGroupItem value="children">Noworodki</ToggleGroupItem>
    </ToggleGroup>
  )
}
