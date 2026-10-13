import { useState } from "react"
import { Dices } from "lucide-react"

import { namesUrl } from "@/api-client/urls"
import { Button } from "@/components/ui/button"
import type {
  Dataset,
  NamesResponse,
  SexFilter,
  YearFilter,
} from "../../../shared/api"

/** Draws an uncommon name at random from the current selection. */
export function RandomNameButton({
  dataset,
  year,
  sex,
  onDraw,
}: {
  dataset: Dataset
  year: YearFilter
  sex: SexFilter
  onDraw: (name: string) => void
}) {
  const [drawing, setDrawing] = useState(false)

  async function draw() {
    setDrawing(true)
    try {
      const response = await fetch(
        namesUrl({ dataset, year, sex, random: true }),
        { cache: "no-store" }
      )
      const drawn: NamesResponse = await response.json()
      if (response.ok && drawn.rows[0]) onDraw(drawn.rows[0].name)
    } catch {
      // Nothing opens; the button can simply be pressed again.
    } finally {
      setDrawing(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Wylosuj rzadkie imię"
      title="Wylosuj rzadkie imię"
      disabled={drawing}
      onClick={draw}
    >
      <Dices />
    </Button>
  )
}
