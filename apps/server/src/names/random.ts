import type { RankedRow } from "./scope.ts"

// Every name has the same chance, however popular it is.
export function pickRandom(rows: RankedRow[]): RankedRow[] {
  if (rows.length === 0) {
    return []
  }
  return [rows[Math.floor(Math.random() * rows.length)]]
}
