import { useEffect, useEffectEvent, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { displayName } from "@/lib/format"
import { cn } from "@/lib/utils"

const SPIN_MS = 2800
const SPIN_EASING = "cubic-bezier(0.12, 0.9, 0.25, 1.03)"
const SHOW_WINNER_MS = 1100
// Rows are h-12: 3rem each.
const ROW_REM = 3

/**
 * Spins through the drawn names and stops on the last but one. A click or key
 * skips to the winner, then to the search.
 */
export function NameLottery({
  names,
  onDone,
}: {
  names: string[]
  onDone: (name: string) => void
}) {
  const winner = Math.max(0, names.length - 2)
  const [landed, setLanded] = useState(false)
  const strip = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDivElement>(null)

  function skip() {
    if (landed) {
      onDone(names[winner])
    } else {
      for (const animation of strip.current?.getAnimations() ?? []) {
        animation.finish()
      }
    }
  }

  const skipOnKey = useEffectEvent(skip)
  const showWinner = useEffectEvent(() => onDone(names[winner]))

  useEffect(() => {
    dialog.current?.focus()
    let duration = SPIN_MS
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      duration = 0
    }
    const reel = strip.current!
    const end = `translateY(-${winner * ROW_REM}rem)`
    const spin = reel.animate(
      [{ transform: "translateY(0)" }, { transform: end }],
      { duration, easing: SPIN_EASING, fill: "forwards" }
    )
    const blur = reel.animate(
      [{ filter: "blur(2px)" }, { filter: "blur(0)" }],
      { duration, easing: "ease-in", fill: "forwards" }
    )
    spin.finished
      .then(() => setLanded(true))
      // Unmounting cancels the spin, which rejects `finished`.
      .catch(() => {})

    function handleOnKeyDown(event: KeyboardEvent) {
      event.preventDefault()
      skipOnKey()
    }
    window.addEventListener("keydown", handleOnKeyDown)
    return () => {
      window.removeEventListener("keydown", handleOnKeyDown)
      spin.cancel()
      blur.cancel()
    }
  }, [winner])

  useEffect(() => {
    if (!landed) {
      return
    }
    const timer = setTimeout(showWinner, SHOW_WINNER_MS)
    return () => clearTimeout(timer)
  }, [landed])

  function handleOnClick() {
    skip()
  }

  return createPortal(
    <div
      ref={dialog}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Losowanie imienia"
      className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-background/70 backdrop-blur-sm outline-none fade-in motion-reduce:animate-none"
      onClick={handleOnClick}
    >
      <div className="w-72 animate-in rounded-xl border bg-card p-4 text-center shadow-lg zoom-in-95 motion-reduce:animate-none">
        <p className="sr-only" aria-live="polite">
          {landed && `Wylosowane imię: ${displayName(names[winner])}`}
        </p>
        <div className="relative h-36 overflow-hidden rounded-lg bg-muted/50 [mask-image:linear-gradient(transparent,black_30%,black_70%,transparent)]">
          <div
            className={cn(
              "pointer-events-none absolute inset-x-2 top-12 h-12 rounded-md border-2 border-primary/40 transition-colors",
              landed && "border-primary bg-primary/10"
            )}
          />
          {/* Starts a row down, so the first name sits in the middle slot. */}
          <div ref={strip} className="pt-12">
            {names.map((name, index) => (
              <div
                key={name}
                aria-hidden
                className={cn(
                  "flex h-12 items-center justify-center text-2xl font-semibold transition-transform duration-300 motion-reduce:transition-none",
                  landed && index === winner && "scale-110 text-primary"
                )}
              >
                {displayName(name)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
