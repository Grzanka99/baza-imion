import type { Entry } from "./entry.ts"

// Entries this process has already read or written, so repeated requests
// do not make a round trip to the database.
const entries = new Map<string, Entry>()

/** The entry held for `key`, unless it has expired. */
export function recall(key: string): Entry | undefined {
  const entry = entries.get(key)
  if (entry && entry.expiresAt > Date.now()) {
    return entry
  }
  return undefined
}

export function remember(key: string, entry: Entry) {
  entries.set(key, entry)
}

export function forgetExpired() {
  const now = Date.now()
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) {
      entries.delete(key)
    }
  }
}
