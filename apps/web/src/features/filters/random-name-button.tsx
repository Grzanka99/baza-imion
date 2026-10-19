import { useState } from "react"
import { Dices } from "lucide-react"

import { watchAnswer } from "@/api-client/answer-source"
import { namesUrl } from "@/api-client/urls"
import { Button } from "@/components/ui/button"
import type {
  Dataset,
  NamesResponse,
  GenderFilter,
  YearFilter,
} from "@baza-imion/shared"

/** Draws a name at random from the current selection. */
export function RandomNameButton({
  dataset,
  year,
  gender,
  onDraw,
}: {
  dataset: Dataset
  year: YearFilter
  gender: GenderFilter
  onDraw: (name: string) => void
}) {
  const [drawing, setDrawing] = useState(false)

  async function draw() {
    setDrawing(true)
    try {
      const url = namesUrl({ dataset, year, gender, random: true })
      const report = watchAnswer(url)
      const response = await fetch(url, { cache: "no-store" })
      const drawn: NamesResponse = await response.json()
      if (response.ok && drawn.rows[0]) {
        report(response)
        onDraw(drawn.rows[0].name)
      }
    } catch {
      // The search stays as it is; the button can simply be pressed again.
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
