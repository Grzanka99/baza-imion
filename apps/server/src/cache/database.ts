import { hasDatabase, logFailure, run, type Statement } from "./connection.ts"
import type { Entry } from "./entry.ts"

/** Most keys asked for in one query, to keep each answer a sensible size. */
const READ_CHUNK = 16

// Reads and writes asked for in the same tick travel together: loading every
// year of a dataset is a few queries, not one per year.
type Waiter = (entry: Entry | undefined) => void
let pendingReads: Map<string, Waiter[]> | undefined
let pendingWrites: Map<string, Entry> | undefined

async function flushReads() {
  const waiting = pendingReads!
  pendingReads = undefined
  const keys = [...waiting.keys()]
  const found = new Map<string, Entry>()
  try {
    const now = Date.now()
    const queries: Statement[] = []
    for (let start = 0; start < keys.length; start += READ_CHUNK) {
      const chunk = keys.slice(start, start + READ_CHUNK)
      queries.push({
        sql: `SELECT key, value, fetched_at, expires_at FROM cache
              WHERE expires_at > ? AND key IN (${chunk.map(() => "?").join()})`,
        args: [now, ...chunk],
      })
    }
    // Chunks go one after another, each a separate, smaller answer.
    for (const query of queries) {
      const [result] = await run([query])
      for (const row of result?.rows ?? []) {
        found.set(String(row.key), {
          value: JSON.parse(String(row.value)),
          fetchedAt: Number(row.fetched_at),
          expiresAt: Number(row.expires_at),
        })
      }
    }
  } catch (error) {
    // A database outage costs extra upstream calls, not failed requests.
    logFailure("read", error)
  }
  for (const [key, waiters] of waiting) {
    for (const waiter of waiters) {
      waiter(found.get(key))
    }
  }
}

/** The unexpired entry the database holds for `key`, if any. */
export function readEntry(key: string): Promise<Entry | undefined> {
  if (!hasDatabase) {
    return Promise.resolve(undefined)
  }
  return new Promise((resolve) => {
    if (!pendingReads) {
      pendingReads = new Map()
      queueMicrotask(flushReads)
    }
    const waiters = pendingReads.get(key) ?? []
    waiters.push(resolve)
    pendingReads.set(key, waiters)
  })
}

async function flushWrites() {
  const entries = pendingWrites!
  pendingWrites = undefined
  try {
    await run([
      // New data arrives only as old data expires: the moment to clear it out.
      { sql: "DELETE FROM cache WHERE expires_at <= ?", args: [Date.now()] },
      ...[...entries].map(([key, entry]) => ({
        sql: "INSERT OR REPLACE INTO cache (key, value, fetched_at, expires_at) VALUES (?, ?, ?, ?)",
        args: [
          key,
          JSON.stringify(entry.value),
          entry.fetchedAt,
          entry.expiresAt,
        ],
      })),
    ])
  } catch (error) {
    logFailure("write", error)
  }
}

let writing: Promise<void> | undefined

/** Stores an entry; resolves once the batch it joined has been written. */
export function writeEntry(key: string, entry: Entry): Promise<void> {
  if (!hasDatabase) {
    return Promise.resolve()
  }
  if (!pendingWrites) {
    pendingWrites = new Map()
    writing = new Promise((resolve) => {
      queueMicrotask(() => flushWrites().then(resolve))
    })
  }
  pendingWrites.set(key, entry)
  return writing!
}
