// dane.gov.pl never changes a published file: each new year arrives under a
// new resource id (see resource-ids.ts). So a stored file never goes stale,
// and it is kept for good: the server could not fetch it again anyway, as
// dane.gov.pl only answers connections from Poland (see fill-cache.ts).
const NEVER = Number.MAX_SAFE_INTEGER

export interface Cached<T> {
  value: T
  fetchedAt: number
}

export interface Entry extends Cached<unknown> {
  expiresAt: number
}

export function fresh(value: unknown): Entry {
  return { value, fetchedAt: Date.now(), expiresAt: NEVER }
}
