import type { RankedRow } from "./scope.ts"

// A random pick skips the most popular names and the near one-offs, which are
// mostly rare spellings: what is left is uncommon but in real use.
const POPULAR_SHARE = 0.05
const MIN_RANDOM_COUNT = 5

export function pickRare(rows: RankedRow[]): RankedRow[] {
  if (rows.length === 0) {
    return []
  }
  // Rows are ordered by count, highest first.
  let low = Math.ceil(rows.length * POPULAR_SHARE)
  let high = rows.findIndex((row) => row.count < MIN_RANDOM_COUNT)
  if (high === -1) {
    high = rows.length
  }
  // A scope too small to have such a band offers everything it has.
  if (high <= low) {
    low = 0
    high = rows.length
  }
  return [rows[low + Math.floor(Math.random() * (high - low))]]
}
