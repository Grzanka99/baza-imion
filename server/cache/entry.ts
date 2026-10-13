const TTL_MS = 10 * 24 * 60 * 60 * 1000

export interface Cached<T> {
  value: T
  fetchedAt: number
}

export interface Entry extends Cached<unknown> {
  expiresAt: number
}

export function fresh(value: unknown): Entry {
  const fetchedAt = Date.now()
  return { value, fetchedAt, expiresAt: fetchedAt + TTL_MS }
}
