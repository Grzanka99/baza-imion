import { parseCsv } from "./csv.js"

// Everything comes from dane.gov.pl as whole CSV files: one request per file.
const fileUrl = (resourceId: number) =>
  `https://api.dane.gov.pl/resources/${resourceId}/csv`

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

/** Downloads one dane.gov.pl file and returns its rows, header first. */
export async function fetchCsv(resourceId: number): Promise<string[][]> {
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
