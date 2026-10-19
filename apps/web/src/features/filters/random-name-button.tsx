import { useState } from "react"
import { Dices } from "lucide-react"

import { watchAnswer } from "@/api-client/answer-source"
import { namesUrl } from "@/api-client/urls"
import { Button } from "@/components/ui/button"
import { NameLottery } from "@/features/filters/name-lottery"
import { cn } from "@/lib/utils"
import type {
  Dataset,
  NamesResponse,
  GenderFilter,
  YearFilter,
} from "@baza-imion/shared"

const REEL_LENGTH = 30

/** Draws a name at random from the current selection, on a spinning reel. */
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
  const [reel, setReel] = useState<string[] | null>(null)

  async function draw() {
    setDrawing(true)
    try {
      const url = namesUrl({
        dataset,
        year,
        gender,
        random: true,
        perPage: REEL_LENGTH,
      })
      const report = watchAnswer(url)
      const response = await fetch(url, { cache: "no-store" })
      const drawn: NamesResponse = await response.json()
      if (response.ok && drawn.rows.length > 0) {
        report(response)
        setReel(reelAround(drawn.rows.map((row) => row.name)))
      }
    } catch {
      // The search stays as it is; the button can simply be pressed again.
    } finally {
      setDrawing(false)
    }
  }

  function handleOnDone(name: string) {
    setReel(null)
    onDraw(name)
  }

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        aria-label="Wylosuj imię"
        title="Wylosuj imię"
        disabled={drawing || reel !== null}
        onClick={draw}
      >
        <Dices className={cn(drawing && "motion-safe:animate-spin")} />
      </Button>
      {reel && <NameLottery names={reel} onDone={handleOnDone} />}
    </>
  )
}

/**
 * Only the first name drawn has exactly the weighted odds, so it is the winner,
 * placed where the reel stops: last but one.
 */
function reelAround([winner, ...others]: string[]): string[] {
  if (others.length === 0) {
    return [winner]
  }
  return [...others.slice(0, -1), winner, ...others.slice(-1)]
}
