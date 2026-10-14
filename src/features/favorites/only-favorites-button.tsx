import { Heart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Narrows the list to the favourite names; wide screens show them in a column instead. */
export function OnlyFavoritesButton({
  active,
  onToggle,
}: {
  active: boolean
  onToggle: () => void
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      aria-pressed={active}
      aria-label="Pokaż tylko ulubione"
      title="Pokaż tylko ulubione"
      className={cn("lg:hidden", active && "bg-muted")}
      onClick={onToggle}
    >
      <Heart className={cn(active && "fill-rose-500 text-rose-500")} />
    </Button>
  )
}
