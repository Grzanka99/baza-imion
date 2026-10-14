import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface PaginationProps {
  page: number
  pageCount: number
  disabled: boolean
  onPage: (page: number) => void
}

export function Pagination({
  page,
  pageCount,
  disabled,
  onPage,
}: PaginationProps) {
  return (
    // On phones the pager is fixed to the bottom of the screen.
    <div className="fixed inset-x-0 bottom-0 z-10 flex shrink-0 items-center justify-between gap-3 border-t bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:static sm:border-0 sm:bg-transparent sm:p-0">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || page <= 1}
        onClick={() => onPage(page - 1)}
      >
        <ChevronLeft className="sm:hidden" />
        <span className="sr-only sm:not-sr-only">Poprzednia</span>
      </Button>
      <div className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
        Strona
        {/* Keyed by page, so the box shows the new number after every move. */}
        <PageInput
          key={page}
          page={page}
          pageCount={pageCount}
          disabled={disabled}
          onPage={onPage}
        />
        z {pageCount}
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || page >= pageCount}
        onClick={() => onPage(page + 1)}
      >
        <span className="sr-only sm:not-sr-only">Następna</span>
        <ChevronRight className="sm:hidden" />
      </Button>
    </div>
  )
}

function PageInput({ page, pageCount, disabled, onPage }: PaginationProps) {
  const [text, setText] = useState(String(page))

  function commit() {
    const typed = Number(text)
    let target = page
    if (Number.isInteger(typed)) {
      target = Math.min(Math.max(typed, 1), pageCount)
    }
    setText(String(target))
    if (target !== page) onPage(target)
  }

  return (
    <Input
      inputMode="numeric"
      aria-label="Numer strony"
      className="h-7 w-16 text-center text-foreground"
      disabled={disabled}
      value={text}
      onChange={(event) => setText(event.target.value.replace(/\D/g, ""))}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit()
      }}
    />
  )
}
