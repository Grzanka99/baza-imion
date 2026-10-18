import { readEntry, writeEntry } from "./database.ts"
import { fresh, type Cached, type Entry } from "./entry.ts"
import { forgetExpired, recall, remember } from "./memory.ts"

// Upstream answers are kept in two places: this process's memory, and a
// database that outlives it (see connection.ts).

const inFlight = new Map<string, Promise<Cached<unknown>>>()

/** Keeps an entry in both places; resolves once the database has it. */
function store(key: string, entry: Entry): Promise<void> {
  forgetExpired()
  remember(key, entry)
  return writeEntry(key, entry)
}

async function resolve<T>(
  key: string,
  load: () => Promise<T>
): Promise<Cached<T>> {
  let entry = await readEntry(key)
  if (entry) {
    remember(key, entry)
  } else {
    // Something else may have stored it while the database was asked.
    entry = recall(key)
  }
  if (!entry) {
    entry = fresh(await load())
    // The request waits for the write: a serverless function may be frozen
    // as soon as it has answered.
    await store(key, entry)
  }
  return { value: entry.value as T, fetchedAt: entry.fetchedAt }
}

/** Returns the cached value for `key`, calling `load` only on a miss or after expiry. */
export function cached<T>(
  key: string,
  load: () => Promise<T>
): Promise<Cached<T>> {
  const remembered = recall(key)
  if (remembered) {
    return Promise.resolve({
      value: remembered.value as T,
      fetchedAt: remembered.fetchedAt,
    })
  }

  const pending = inFlight.get(key)
  if (pending) {
    return pending as Promise<Cached<T>>
  }

  const promise = resolve(key, load).finally(() => inFlight.delete(key))
  inFlight.set(key, promise)
  return promise
}

/**
 * Stores a value that came along with another fetch, unless a current one is
 * already held. Resolves once it has been written.
 */
export function prime(key: string, value: unknown): Promise<void> {
  if (recall(key)) {
    return Promise.resolve()
  }
  return store(key, fresh(value))
}
