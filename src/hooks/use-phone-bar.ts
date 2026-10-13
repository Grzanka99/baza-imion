import { useCallback, useEffect, useRef, useState } from "react"

/** How far the page must move before the bar reacts, so it does not flicker. */
const THRESHOLD = 12

/**
 * Drives the phone layout's fixed top bar: it collapses when the page scrolls
 * down and comes back on any scroll up. The bar's current and full heights are
 * published as --bar-h and --bar-full, for the sticky table header and for the
 * space the page keeps free under the bar.
 *
 * From the `sm` breakpoint up the page itself never scrolls, so the bar never
 * collapses and the variables go unused.
 */
export function usePhoneBar() {
  const bar = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  // Set when the page is about to be scrolled by code rather than by hand.
  const ownScroll = useRef(false)

  useEffect(() => {
    let last = window.scrollY
    function onScroll() {
      const y = window.scrollY
      if (ownScroll.current) {
        // Our own jump back to the list leaves the bar as it was, unless it
        // landed at the very top, where a folded bar would leave a gap.
        ownScroll.current = false
        last = y
        if (y < THRESHOLD) setCollapsed(false)
        return
      }
      if (y < THRESHOLD) setCollapsed(false)
      else if (y - last > THRESHOLD) setCollapsed(true)
      else if (last - y > THRESHOLD) setCollapsed(false)
      else return
      last = y
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const element = bar.current
    if (!element) return
    const root = document.documentElement
    // The full height is only read while the bar is open and at rest, so the
    // space reserved for it stays put during the animation.
    let animating = false
    const measure = () => {
      root.style.setProperty("--bar-h", `${element.offsetHeight}px`)
      if (!animating && element.dataset.collapsed === "false") {
        root.style.setProperty("--bar-full", `${element.offsetHeight}px`)
      }
    }
    const onStart = () => {
      animating = true
    }
    const onEnd = () => {
      animating = false
      measure()
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    element.addEventListener("transitionstart", onStart)
    element.addEventListener("transitionend", onEnd)
    element.addEventListener("transitioncancel", onEnd)
    return () => {
      observer.disconnect()
      element.removeEventListener("transitionstart", onStart)
      element.removeEventListener("transitionend", onEnd)
      element.removeEventListener("transitioncancel", onEnd)
    }
  }, [])

  /** Brings the start of the list back under the bar, folded or not. */
  const scrollToList = useCallback(() => {
    const element = bar.current
    if (!element) return
    const full = parseFloat(
      document.documentElement.style.getPropertyValue("--bar-full")
    )
    // The page keeps room for the full bar; a folded one needs that much less.
    const target = Math.max((full || 0) - element.offsetHeight, 0)
    if (Math.abs(window.scrollY - target) < 1) return
    ownScroll.current = true
    window.scrollTo({ top: target })
  }, [])

  return { bar, collapsed, scrollToList }
}
