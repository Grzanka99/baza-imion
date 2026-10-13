// API answers already fetched, kept in local storage so they survive a reload
// and are shared between tabs. Going back to a page, a filter or a name seen
// before shows it at once, without another request.

// Keyed by build, so answers from before a new version of the app are never
// mixed with it.
const FAMILY = "api-cache:"
const PREFIX = `${FAMILY}${__BUILD_ID__}:`
/**
 * How long an answer is used without asking again. The source is updated once
 * a year, and the server itself refreshes its copy every ten days.
 */
const FRESH_MS = 7 * 24 * 60 * 60 * 1000
const MAX_ENTRIES = 300

export interface Answer {
  data: unknown
  /** When it was fetched (ms since epoch). */
  at: number
}

// Answers parsed during this visit, so local storage is read once per URL.
const memory = new Map<string, Answer>()

// Stored as "<fetched at>|<json>", so the age can be read without parsing.
const fetchedAt = (stored: string) =>
  Number(stored.slice(0, stored.indexOf("|")))

/** The answer kept for `url`, however old; see `isFresh`. */
export function recall(url: string): Answer | undefined {
  const held = memory.get(url)
  if (held) return held
  try {
    const stored = localStorage.getItem(PREFIX + url)
    if (!stored) return undefined
    const answer = {
      at: fetchedAt(stored),
      data: JSON.parse(stored.slice(stored.indexOf("|") + 1)),
    }
    memory.set(url, answer)
    return answer
  } catch {
    // Storage blocked or the entry unreadable: as good as not cached.
    return undefined
  }
}

export function isFresh(answer: Answer) {
  return Date.now() - answer.at < FRESH_MS
}

/**
 * Drops answers left by earlier builds, then the oldest of this build's until
 * at most `limit` are left.
 */
function trim(limit: number) {
  const entries: [key: string, at: number][] = []
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(PREFIX)) {
      entries.push([key, fetchedAt(localStorage.getItem(key) ?? "0|")])
    } else if (key.startsWith(FAMILY)) {
      localStorage.removeItem(key)
    }
  }
  entries
    .sort((a, b) => b[1] - a[1])
    .slice(limit)
    .forEach(([key]) => localStorage.removeItem(key))
}

export function remember(url: string, data: unknown) {
  const answer = { data, at: Date.now() }
  memory.set(url, answer)
  const stored = `${answer.at}|${JSON.stringify(data)}`
  try {
    localStorage.setItem(PREFIX + url, stored)
    trim(MAX_ENTRIES)
  } catch {
    // Most likely the storage is full: make room and try once more. If that
    // fails too, the answer still serves this visit from memory.
    try {
      trim(Math.floor(MAX_ENTRIES / 2))
      localStorage.setItem(PREFIX + url, stored)
    } catch {
      return
    }
  }
}
