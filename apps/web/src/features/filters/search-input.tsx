import { useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cancelSettle, settle, track } from "@/lib/analytics"

const DEBOUNCE_MS = 250
const TRACK_AFTER_MS = 1000

/**
 * Keeps the typed text in its own state, so a keystroke re-renders only this
 * input; the parent hears about the query once typing pauses.
 */
export function SearchInput({
  initialValue,
  onSearch,
}: {
  initialValue: string
  onSearch: (query: string) => void
}) {
  const [text, setText] = useState(initialValue)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const input = useRef<HTMLInputElement>(null)

  // Resetting the filters remounts the box; a search still pending is dropped.
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      cancelSettle("search")
    },
    []
  )

  function change(value: string) {
    setText(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => onSearch(value.trim()), DEBOUNCE_MS)
    if (value.trim()) settle("search", TRACK_AFTER_MS, () => track("search"))
    else cancelSettle("search")
  }

  function clear() {
    setText("")
    clearTimeout(timer.current)
    cancelSettle("search")
    onSearch("")
    input.current?.focus()
  }

  return (
    <div className="relative min-w-0 flex-1 sm:min-w-40">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      {/* The browser's own clear button is hidden in favour of ours. */}
      <Input
        ref={input}
        type="search"
        aria-label="Szukaj imienia"
        placeholder="Szukaj imienia…"
        className="px-8 [&::-webkit-search-cancel-button]:appearance-none"
        value={text}
        onChange={(event) => change(event.target.value)}
      />
      {text !== "" && (
        <button
          type="button"
          aria-label="Wyczyść wyszukiwanie"
          className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          onClick={clear}
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
