import { ANALYTICS, track } from "@/lib/analytics"

const TIMING_WAIT_MS = 5000

const endpointOf = (url: string) => new URL(url, window.location.href).pathname

export function reportLocalAnswer(url: string) {
  if (!ANALYTICS) return
  track("api-answer", { source: "local", endpoint: endpointOf(url) })
}

/**
 * Call just before fetching `url`; call the result with the response to
 * report which cache answered it, as far as the browser can tell.
 */
export function watchAnswer(url: string) {
  if (!ANALYTICS) return () => {}
  const timing = nextTiming(url)
  return (response: Response) => {
    const cdn = response.headers.get("x-vercel-cache")
    void timing.then((entry) => {
      let source = "server"
      if (entry?.transferSize === 0) source = "browser"
      else if (cdn === "HIT" || cdn === "STALE") source = "cdn"
      track("api-answer", { source, endpoint: endpointOf(url) })
    })
  }
}

/** The timing of the next request to `url`; observers see it even when the timing buffer is full. */
function nextTiming(url: string) {
  const name = new URL(url, window.location.href).href
  const after = performance.now()
  return new Promise<PerformanceResourceTiming | undefined>((resolve) => {
    const observer = new PerformanceObserver((list) => {
      const entry = list
        .getEntriesByName(name)
        .find((candidate) => candidate.startTime >= after)
      if (entry) done(entry as PerformanceResourceTiming)
    })
    const timer = setTimeout(done, TIMING_WAIT_MS)
    function done(entry?: PerformanceResourceTiming) {
      clearTimeout(timer)
      observer.disconnect()
      resolve(entry)
    }
    observer.observe({ type: "resource" })
  })
}
