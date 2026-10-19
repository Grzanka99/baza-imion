import type { RankedRow } from "./scope.ts"

// Names borne by up to FLAT_BELOW people weigh 1; above that the weight grows
// with the log of the count, up to TOP_WEIGHT for the most popular name.
const FLAT_BELOW = 100
const TOP_WEIGHT = 15

export function pickRandom(rows: RankedRow[], count: number): RankedRow[] {
  if (rows.length === 0) {
    return []
  }
  // Rows are ordered by count, highest first.
  const topCount = rows[0].count
  let total = 0
  const ends = rows.map((row) => {
    total += weight(row.count, topCount)
    return total
  })

  const picked = new Set<number>()
  const wanted = Math.min(count, rows.length)
  while (picked.size < wanted) {
    picked.add(rowAt(ends, Math.random() * total))
  }
  return [...picked].map((index) => rows[index])
}

function weight(count: number, topCount: number): number {
  if (count <= FLAT_BELOW || topCount <= FLAT_BELOW) {
    return 1
  }
  const popularity =
    Math.log(count / FLAT_BELOW) / Math.log(topCount / FLAT_BELOW)
  return 1 + (TOP_WEIGHT - 1) * popularity
}

function rowAt(ends: number[], target: number): number {
  let low = 0
  let high = ends.length - 1
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (ends[middle] > target) {
      high = middle
    } else {
      low = middle + 1
    }
  }
  return low
}
