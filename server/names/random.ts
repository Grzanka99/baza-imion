import type { RankedRow } from "./scope.js"

// A random pick skips the most popular names and the near one-offs, which are
// mostly rare spellings: what is left is uncommon but in real use.
const POPULAR_SHARE = 0.05
const MIN_RANDOM_COUNT = 5

export function pickRare(rows: RankedRow[]): RankedRow[] {
  if (rows.length === 0) return []
  // Rows are ordered by count, highest first.
  const from = Math.ceil(rows.length * POPULAR_SHARE)
  const firstTooRare = rows.findIndex((row) => row.count < MIN_RANDOM_COUNT)
  const to = firstTooRare === -1 ? rows.length : firstTooRare
  // A scope too small to have such a band offers everything it has.
  const [low, high] = to > from ? [from, to] : [0, rows.length]
  return [rows[low + Math.floor(Math.random() * (high - low))]]
}
