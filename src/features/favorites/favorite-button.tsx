import { Heart } from "lucide-react"

import { cn } from "@/lib/utils"

/** A heart that marks one name as a favourite. */
export function FavoriteButton({
  active,
  className,
  onToggle,
}: {
  active: boolean
  className?: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
      title={active ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
      className={cn(
        "inline-flex size-7 cursor-pointer items-center justify-center rounded-md align-middle text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      onClick={(event) => {
        // In the table the whole row is clickable; the heart is its own thing.
        event.stopPropagation()
        onToggle()
      }}
    >
      <Heart
        className={cn("size-4", active && "fill-rose-500 text-rose-500")}
      />
    </button>
  )
}
