// The HTTP-only client: no native module, so it also runs on Vercel.
import { createClient } from "@libsql/client/web"

const TTL_MS = 10 * 24 * 60 * 60 * 1000

// Without TURSO_URL the cache lives in memory only and is lost on restart.
const client = process.env.TURSO_URL
  ? createClient({
      url: process.env.TURSO_URL,
      authToken: process.env.TURSO_TOKEN,
    })
  : undefined

let tableReady: Promise<unknown> | undefined

/**
 * The database once its table exists, or `undefined` when none is configured.
 * Table creation is retried on the next use if the database was unreachable.
 */
function database() {
  if (!client) return undefined
  tableReady ??= client
    .execute(
      `CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        fetched_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )`
    )
    .catch((error) => {
      tableReady = undefined
      throw error
    })
  return tableReady.then(() => client)
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

async function purgeExpired() {
  const now = Date.now()
  for (const [key, entry] of memory) {
    if (entry.expiresAt <= now) memory.delete(key)
  }
  await (
    await database()
  )?.execute({
    sql: "DELETE FROM cache WHERE expires_at <= ?",
    args: [now],
  })
}

function purgeInBackground() {
  purgeExpired().catch((error) => logFailure("purge", error))
}

purgeInBackground()
setInterval(purgeInBackground, 60 * 60 * 1000).unref()

async function readEntry(key: string): Promise<Entry | undefined> {
  const result = await (
    await database()
  )?.execute({
    sql: "SELECT value, fetched_at, expires_at FROM cache WHERE key = ? AND expires_at > ?",
    args: [key, Date.now()],
  })
  const row = result?.rows[0]
  if (!row) return undefined
  return {
    value: JSON.parse(String(row.value)),
    fetchedAt: Number(row.fetched_at),
    expiresAt: Number(row.expires_at),
  }
}

async function writeEntry(key: string, entry: Entry) {
  await (
    await database()
  )?.execute({
    sql: "INSERT OR REPLACE INTO cache (key, value, fetched_at, expires_at) VALUES (?, ?, ?, ?)",
    args: [key, JSON.stringify(entry.value), entry.fetchedAt, entry.expiresAt],
  })
}

async function resolve<T>(
  key: string,
  load: () => Promise<T>
): Promise<Cached<T>> {
  // A database outage costs extra upstream calls, not failed requests.
  let entry = await readEntry(key).catch((error) => {
    logFailure("read", error)
    return undefined
  })
  if (!entry) {
    const value = await load()
    const fetchedAt = Date.now()
    entry = { value, fetchedAt, expiresAt: fetchedAt + TTL_MS }
    await writeEntry(key, entry).catch((error) => logFailure("write", error))
  }
  memory.set(key, entry)
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
