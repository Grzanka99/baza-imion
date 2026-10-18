import type { MouseEvent } from "react"
import { Heart } from "lucide-react"

import { cn } from "@/lib/utils"

/** A heart that marks one name as a favourite. */
export function FavoriteButton({
  active,
  onToggle,
}: {
  active: boolean
  onToggle: () => void
}) {
  let label = "Dodaj do ulubionych"
  if (active) {
    label = "Usuń z ulubionych"
  }

  function handleOnClick(event: MouseEvent<HTMLButtonElement>) {
    // In the table the whole row is clickable; the heart is its own thing.
    event.stopPropagation()
    onToggle()
  }

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md align-middle text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      onClick={handleOnClick}
    >
      <Heart
        className={cn("size-4", active && "fill-rose-500 text-rose-500")}
      />
    </button>
  )
}
