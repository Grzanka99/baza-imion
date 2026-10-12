import { useState } from "react"

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
    <div className="flex shrink-0 items-center justify-between gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Poprzednia
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
        Następna
      </Button>
    </div>
  )
}

function PageInput({ page, pageCount, disabled, onPage }: PaginationProps) {
  const [text, setText] = useState(String(page))

  function commit() {
    const typed = Number(text)
    const target = Number.isInteger(typed)
      ? Math.min(Math.max(typed, 1), pageCount)
      : page
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
