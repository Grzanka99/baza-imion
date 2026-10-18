import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Dataset } from "@baza-imion/shared"

export function DatasetToggle({
  dataset,
  onChange,
}: {
  dataset: Dataset
  onChange: (dataset: Dataset) => void
}) {
  function handleOnValueChange(value: string) {
    if (value) {
      onChange(value as Dataset)
    }
  }

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      aria-label="Zbiór danych"
      value={dataset}
      onValueChange={handleOnValueChange}
    >
      <ToggleGroupItem value="population">Cała populacja</ToggleGroupItem>
      <ToggleGroupItem value="children">Noworodki</ToggleGroupItem>
    </ToggleGroup>
  )
}
