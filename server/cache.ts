// The HTTP-only client: no native module, so it also runs on Vercel.
import { createClient, type InStatement } from "@libsql/client/web"

const TTL_MS = 10 * 24 * 60 * 60 * 1000
/** Most keys asked for in one query, to keep each answer a sensible size. */
const READ_CHUNK = 16

// Without TURSO_URL the cache lives in memory only and is lost on restart.
const client = process.env.TURSO_URL
  ? createClient({
      url: process.env.TURSO_URL,
      authToken: process.env.TURSO_TOKEN,
    })
  : undefined

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
)`

/**
 * Runs statements as one round trip. The table is only created when the
 * database turns out not to have it, so a normal start costs no extra call.
 */
async function run(statements: InStatement[]) {
  if (!client) return []
  try {
    return await client.batch(statements)
  } catch (error) {
    if (!(error instanceof Error) || !/no such table/i.test(error.message)) {
      throw error
    }
    return client
      .batch([CREATE_TABLE, ...statements])
      .then(([, ...rest]) => rest)
  }
}

// Database errors can carry the connection URL, so only their kind is logged.
function logFailure(action: string, error: unknown) {
  const kind =
    error instanceof Error
      ? ("code" in error && String(error.code)) || error.name
      : "unknown error"
  console.error(`cache ${action} failed: ${kind}`)
}

export interface Cached<T> {
  value: T
  fetchedAt: number
}

interface Entry extends Cached<unknown> {
  expiresAt: number
}

// Entries this process has already read or written, so repeated requests
// do not make a round trip to the database.
const memory = new Map<string, Entry>()
const inFlight = new Map<string, Promise<Cached<unknown>>>()

// Reads and writes asked for in the same tick travel together: loading
// twenty-odd years is one query, not one per year.
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
    const queries: InStatement[] = []
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
    for (const waiter of waiters) waiter(found.get(key))
  }
}

function readEntry(key: string): Promise<Entry | undefined> {
  if (!client) return Promise.resolve(undefined)
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
  const now = Date.now()
  for (const [key, entry] of memory) {
    if (entry.expiresAt <= now) memory.delete(key)
  }
  try {
    await run([
      // New data arrives only as old data expires: the moment to clear it out.
      { sql: "DELETE FROM cache WHERE expires_at <= ?", args: [now] },
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
function writeEntry(key: string, entry: Entry): Promise<void> {
  memory.set(key, entry)
  if (!client) return Promise.resolve()
  if (!pendingWrites) {
    pendingWrites = new Map()
    writing = new Promise((resolve) => {
      queueMicrotask(() => flushWrites().then(resolve))
    })
  }
  pendingWrites.set(key, entry)
  return writing!
}

function fresh(value: unknown): Entry {
  const fetchedAt = Date.now()
  return { value, fetchedAt, expiresAt: fetchedAt + TTL_MS }
}

async function resolve<T>(
  key: string,
  load: () => Promise<T>
): Promise<Cached<T>> {
  let entry = await readEntry(key)
  if (entry) {
    memory.set(key, entry)
  } else {
    // Something else may have stored it while the database was asked.
    const primed = memory.get(key)
    entry = primed && primed.expiresAt > Date.now() ? primed : undefined
  }
  if (!entry) {
    entry = fresh(await load())
    // The request waits for the write: a serverless function may be frozen
    // as soon as it has answered.
    await writeEntry(key, entry)
  }
  return { value: entry.value as T, fetchedAt: entry.fetchedAt }
}

/** Returns the cached value for `key`, calling `load` only on a miss or after expiry. */
export function cached<T>(
  key: string,
  load: () => Promise<T>
): Promise<Cached<T>> {
  const remembered = memory.get(key)
  if (remembered && remembered.expiresAt > Date.now()) {
    return Promise.resolve({
      value: remembered.value as T,
      fetchedAt: remembered.fetchedAt,
    })
  }

  const pending = inFlight.get(key)
  if (pending) return pending as Promise<Cached<T>>

  const promise = resolve(key, load).finally(() => inFlight.delete(key))
  inFlight.set(key, promise)
  return promise
}

/**
 * Stores a value that came along with another fetch, unless a current one is
 * already held. Resolves once it has been written.
 */
export function prime(key: string, value: unknown): Promise<void> {
  const remembered = memory.get(key)
  if (remembered && remembered.expiresAt > Date.now()) return Promise.resolve()
  return writeEntry(key, fresh(value))
}
