import type { Sex } from "@baza-imion/shared"
import { isBlank, toCount } from "./csv.ts"
import { fetchCsv } from "./download.ts"

/** Names given to children in 2000-2019: one file, one row per year, name and sex. */
const HISTORY_RESOURCE = 21458
const HISTORY_FIRST_YEAR = 2000
const HISTORY_LAST_YEAR = 2019

export type YearEntry = [name: string, sex: Sex, count: number]

/**
 * Fetches the 2000-2019 children's names in one request and splits them by
 * year. Anything unexpected fails the whole fetch, so bad rows are never
 * cached.
 */
export async function fetchChildrenHistory(): Promise<
  Map<number, YearEntry[]>
> {
  const [header, ...lines] = await fetchCsv(HISTORY_RESOURCE)
  if (header?.length !== 4) {
    throw new Error("dane.gov.pl: unexpected columns in the 2000-2019 file")
  }

  const years = new Map<number, YearEntry[]>()
  for (const line of lines) {
    if (isBlank(line)) {
      continue
    }
    const year = toCount(line[0])
    const name = line[1]?.trim().toUpperCase()
    const count = toCount(line[2])
    const sex = line[3]?.trim()
    if (
      line.length !== 4 ||
      !(year >= HISTORY_FIRST_YEAR && year <= HISTORY_LAST_YEAR) ||
      !name ||
      !(count >= 1) ||
      (sex !== "M" && sex !== "K")
    ) {
      throw new Error("dane.gov.pl: unexpected row in the 2000-2019 file")
    }
    const entries = years.get(year) ?? []
    entries.push([name, sex, count])
    years.set(year, entries)
  }
  for (let year = HISTORY_FIRST_YEAR; year <= HISTORY_LAST_YEAR; year++) {
    if (!years.has(year)) {
      throw new Error(`dane.gov.pl: no rows for ${year} in the 2000-2019 file`)
    }
  }
  return years
}
