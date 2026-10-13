import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Animates its content open and shut on phones. From `sm` up it disappears
 * from the layout, leaving the children where they would be without it.
 */
export function Collapse({
  open,
  className,
  children,
}: {
  open: boolean
  className: string
  children: ReactNode
}) {
  return (
    <div
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none sm:contents",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}
    >
      {/* Padding goes on the innermost box: on the clipped one it would keep
          the row from closing all the way. */}
      <div className="min-h-0 overflow-hidden sm:contents">
        <div className={cn("sm:contents", className)}>{children}</div>
      </div>
    </div>
  )
}
