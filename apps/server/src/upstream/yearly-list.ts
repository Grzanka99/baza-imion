import type { Gender } from "@baza-imion/shared"
import { isBlank, toCount } from "./csv.ts"
import { fetchCsv } from "./download.ts"

/**
 * Fetches a whole one-gender list of names and counts. Columns are name,
 * optionally gender, then count; header wording varies by year.
 */
export async function fetchNameCounts(
  resourceId: number,
  gender: Gender
): Promise<[name: string, count: number][]> {
  const [header, ...lines] = await fetchCsv(resourceId)
  const width = header?.length
  if (width !== 2 && width !== 3) {
    throw new Error(`dane.gov.pl: unexpected columns in resource ${resourceId}`)
  }

  const counts = new Map<string, number>()
  for (const line of lines) {
    if (isBlank(line)) {
      continue
    }
    const name = line[0].trim().toUpperCase()
    const count = toCount(line[width - 1])
    if (
      line.length !== width ||
      !(count >= 1) ||
      (width === 3 && !line[1].trim().toUpperCase().startsWith(gender))
    ) {
      throw new Error(`dane.gov.pl: unexpected row in resource ${resourceId}`)
    }
    // A few files carry a row with a blank name.
    if (name !== "") {
      counts.set(name, (counts.get(name) ?? 0) + count)
    }
  }
  if (counts.size === 0) {
    throw new Error(`dane.gov.pl: no rows in resource ${resourceId}`)
  }
  return [...counts]
}
