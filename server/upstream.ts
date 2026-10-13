import type { Sex } from "../shared/api.js"

// Everything comes from dane.gov.pl as whole CSV files: one request per file.
// (Its paged row API would need hundreds of requests for the same data, and
// cannot reach past row 10,000.)
const fileUrl = (resourceId: number) =>
  `https://api.dane.gov.pl/resources/${resourceId}/csv`

/** Names given to children in 2000-2019: one file, one row per year, name and sex. */
const HISTORY_RESOURCE = 21458
const HISTORY_FIRST_YEAR = 2000
const HISTORY_LAST_YEAR = 2019

const MAX_CONCURRENT = 4
const ATTEMPTS = 3

let active = 0
const waiting: (() => void)[] = []

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiting.push(resolve))
  } else {
    active++
  }
  try {
    return await task()
  } finally {
    const next = waiting.shift()
    if (next) next()
    else active--
  }
}

async function fetchCsv(resourceId: number): Promise<string[][]> {
  let lastError: unknown
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt))
    }
    try {
      // The slot is held until the body has arrived, not just the headers.
      const text = await withSlot(async () => {
        const response = await fetch(fileUrl(resourceId), {
          signal: AbortSignal.timeout(60_000),
        })
        if (!response.ok) {
          throw new Error(`dane.gov.pl: HTTP ${response.status}`)
        }
        return response.text()
      })
      return parseCsv(text.replace(/^\uFEFF/, ""))
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

/** A whole number in a CSV cell, or NaN. */
function toCount(cell: string | undefined) {
  const value = cell?.trim() ? Number(cell) : NaN
  return Number.isInteger(value) ? value : NaN
}

const isBlank = (line: string[]) => line.length === 1 && line[0].trim() === ""

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
    if (isBlank(line)) continue
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

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char !== '"') field += char
      else if (text[i + 1] === '"') field += text[i++]
      else quoted = false
    } else if (char === '"') {
      quoted = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else if (char !== "\r") {
      field += char
    }
  }
  if (field !== "" || row.length > 0) rows.push([...row, field])
  return rows
}

/**
 * Fetches a whole one-sex list of names and counts. Columns are name,
 * optionally sex, then count; header wording varies by year.
 */
export async function fetchNameCounts(
  resourceId: number,
  sex: Sex
): Promise<[name: string, count: number][]> {
  const [header, ...lines] = await fetchCsv(resourceId)
  const width = header?.length
  if (width !== 2 && width !== 3) {
    throw new Error(`dane.gov.pl: unexpected columns in resource ${resourceId}`)
  }

  const counts = new Map<string, number>()
  for (const line of lines) {
    if (isBlank(line)) continue
    const name = line[0].trim().toUpperCase()
    const count = toCount(line[width - 1])
    if (
      line.length !== width ||
      !(count >= 1) ||
      (width === 3 && !line[1].trim().toUpperCase().startsWith(sex))
    ) {
      throw new Error(`dane.gov.pl: unexpected row in resource ${resourceId}`)
    }
    // A few files carry a row with a blank name.
    if (name !== "") counts.set(name, (counts.get(name) ?? 0) + count)
  }
  if (counts.size === 0) {
    throw new Error(`dane.gov.pl: no rows in resource ${resourceId}`)
  }
  return [...counts]
}
