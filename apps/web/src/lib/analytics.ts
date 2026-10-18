// Umami, cookieless. Never send personal data.

const WEBSITE_ID = import.meta.env.VITE_UMAMI_WEBSITE_ID?.trim()
const SCRIPT_URL = "https://cloud.umami.is/script.js"
export const ANALYTICS = import.meta.env.PROD && !!WEBSITE_ID

type EventData = Record<string, string>

const settling = new Map<string, ReturnType<typeof setTimeout>>()
// Names the server has answered with; anything else, e.g. text from the
// URL, is never sent.
const knownNames = new Set<string>()
// Events waiting for the script, or for the server to confirm their name.
// A repeat of a name event replaces the one still waiting.
const pending = new Map<string, { name?: string; send: () => void }>()
let nextKey = 0

export function loadAnalytics() {
  if (!ANALYTICS || !WEBSITE_ID) {
    return
  }
  const script = document.createElement("script")
  script.defer = true
  script.src = SCRIPT_URL
  script.dataset.websiteId = WEBSITE_ID
  // The query holds filters and search text; the hash is anyone's to edit.
  script.dataset.excludeSearch = "true"
  script.dataset.excludeHash = "true"
  script.addEventListener("load", flush)
  document.head.append(script)
}

function flush() {
  if (!window.umami) {
    return
  }
  for (const [key, event] of pending) {
    if (event.name === undefined || knownNames.has(event.name)) {
      pending.delete(key)
      event.send()
    }
  }
}

export function track(event: string, data?: EventData) {
  if (!ANALYTICS) {
    return
  }
  pending.set(String(nextKey++), {
    send: () => window.umami?.track(event, data),
  })
  flush()
}

// The same form the server gives names in.
const canonical = (name: string) => name.trim().toUpperCase()

/** Sends `event` with `name` once the server has confirmed the name, if `wanted` still agrees then. */
export function trackName(event: string, name: string, wanted = () => true) {
  if (!ANALYTICS) {
    return
  }
  const confirmed = canonical(name)
  function send() {
    if (wanted()) {
      window.umami?.track(event, { name: confirmed })
    }
  }
  pending.set(`${event}:${confirmed}`, { name: confirmed, send })
  flush()
}

/** Records the names in an API answer as safe to send. */
export function learnNames(answer: unknown) {
  if (!ANALYTICS || !answer || typeof answer !== "object") {
    return
  }
  const { name, rows } = answer as { name?: unknown; rows?: unknown }
  if (typeof name === "string") {
    knownNames.add(canonical(name))
  }
  if (Array.isArray(rows)) {
    for (const row of rows) {
      if (typeof row?.name === "string") {
        knownNames.add(canonical(row.name))
      }
    }
  }
  flush()
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
