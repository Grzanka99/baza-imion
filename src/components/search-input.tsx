import { useEffect, useRef, useState } from "react"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"

const DEBOUNCE_MS = 250

/**
 * Keeps the typed text in its own state, so a keystroke re-renders only this
 * input; the parent hears about the query once typing pauses.
 */
export function SearchInput({
  onSearch,
}: {
  onSearch: (query: string) => void
}) {
  const [text, setText] = useState("")
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  function change(value: string) {
    setText(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onSearch(value.trim()), DEBOUNCE_MS)
  }

  return (
    <div className="relative min-w-48 flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label="Szukaj imienia"
        placeholder="Szukaj imienia…"
        className="pl-8"
        value={text}
        onChange={(event) => change(event.target.value)}
      />
    </div>
  )
}
