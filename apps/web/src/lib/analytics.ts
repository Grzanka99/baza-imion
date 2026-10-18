// Umami, cookieless. Never send personal data.

const WEBSITE_ID = import.meta.env.VITE_UMAMI_WEBSITE_ID?.trim()
const SCRIPT_URL = "https://cloud.umami.is/script.js"
export const ANALYTICS = import.meta.env.PROD && !!WEBSITE_ID

type EventData = Record<string, string>

const queue: [event: string, data?: EventData][] = []
const settling = new Map<string, ReturnType<typeof setTimeout>>()
// Names the server has answered with; anything else, e.g. text from the
// URL, is never sent.
const knownNames = new Set<string>()

export function loadAnalytics() {
  if (!ANALYTICS || !WEBSITE_ID) {
    return
  }
  const script = document.createElement("script")
  script.defer = true
  script.src = SCRIPT_URL
  script.dataset.websiteId = WEBSITE_ID
  // The query holds filters and search text.
  script.dataset.excludeSearch = "true"
  script.addEventListener("load", () => {
    for (const [event, data] of queue.splice(0)) {
      window.umami?.track(event, data)
    }
  })
  document.head.append(script)
}

export function track(event: string, data?: EventData) {
  if (!ANALYTICS) {
    return
  }
  if (window.umami) {
    window.umami.track(event, data)
  } else {
    queue.push([event, data])
  }
}

export function trackName(event: string, name: string) {
  if (ANALYTICS && knownNames.has(name)) {
    track(event, { name })
  }
}

/** Records the names in an API answer as safe to send. */
export function learnNames(answer: unknown) {
  if (!ANALYTICS || !answer || typeof answer !== "object") {
    return
  }
  const { name, rows } = answer as { name?: unknown; rows?: unknown }
  if (typeof name === "string") {
    knownNames.add(name)
  }
  if (!Array.isArray(rows)) {
    return
  }
  for (const row of rows) {
    if (typeof row?.name === "string") {
      knownNames.add(row.name)
    }
  }
}

/** Runs `report` once `key` has gone `ms` without another call or a cancel. */
export function settle(key: string, ms: number, report: () => void) {
  if (!ANALYTICS) {
    return
  }
  cancelSettle(key)
  settling.set(
    key,
    setTimeout(() => {
      settling.delete(key)
      report()
    }, ms)
  )
}

export function cancelSettle(key: string) {
  if (!ANALYTICS) {
    return
  }
  clearTimeout(settling.get(key))
  settling.delete(key)
}
