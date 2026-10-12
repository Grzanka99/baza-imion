import type { Sex } from "../shared/api.js"

// Names given to children in 2000-2019, one row per year, name and sex.
const DATA_URL = "https://api.dane.gov.pl/1.4/resources/21458/data"
const FIRST_YEAR = 2000
const LAST_YEAR = 2019
const PAGE_SIZE = 100
const MAX_CONCURRENT = 4
const ATTEMPTS = 3

export interface UpstreamRow {
  year: number
  name: string
  count: number
  sex: Sex
}

interface Cell<T> {
  val: T
}

// Some pages come back with numeric cells as strings ("31" instead of 31.0).
type NumberCell = Cell<number | string>

interface RowAttributes {
  col1: NumberCell
  col2: Cell<string>
  col3: NumberCell
  col4: Cell<string>
}

interface DataPage {
  meta: { count: number }
  data: { attributes: RowAttributes }[]
}

function toInteger(cell: NumberCell | undefined) {
  const raw = cell?.val
  const value =
    typeof raw === "number" || (typeof raw === "string" && raw.trim() !== "")
      ? Number(raw)
      : NaN
  if (!Number.isInteger(value)) {
    throw new Error(`dane.gov.pl: expected an integer, got ${raw}`)
  }
  return value
}

// Anything unexpected fails the whole fetch, so bad rows are never cached.
function toRow(attributes: RowAttributes): UpstreamRow {
  const year = toInteger(attributes?.col1)
  const count = toInteger(attributes?.col3)
  const name = attributes?.col2?.val
  const sex = attributes?.col4?.val
  if (
    year < FIRST_YEAR ||
    year > LAST_YEAR ||
    count < 1 ||
    typeof name !== "string" ||
    name.trim() === "" ||
    (sex !== "M" && sex !== "K")
  ) {
    throw new Error("dane.gov.pl: unexpected row")
  }
  return { year, name, count, sex }
}

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

async function withRetries<T>(task: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt))
    }
    try {
      // The slot is held until the body has arrived, not just the headers.
      return await withSlot(task)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

function fetchPage(q: string, page: number): Promise<DataPage> {
  const url = new URL(DATA_URL)
  url.searchParams.set("q", q)
  // A total order, so pages never overlap or skip rows.
  url.searchParams.set("sort", "col1,col2,col4")
  url.searchParams.set("per_page", String(PAGE_SIZE))
  url.searchParams.set("page", String(page))

  return withRetries(async () => {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
    if (!response.ok) throw new Error(`dane.gov.pl: HTTP ${response.status}`)
    const body = (await response.json()) as DataPage
    if (
      !Number.isInteger(body?.meta?.count) ||
      body.meta.count < 0 ||
      !Array.isArray(body.data)
    ) {
      throw new Error("dane.gov.pl: unexpected response")
    }
    return body
  })
}

/** Fetches every row matching an Elasticsearch query string, across all pages. */
export async function fetchRows(q: string): Promise<UpstreamRow[]> {
  const first = await fetchPage(q, 1)
  const pageCount = Math.ceil(first.meta.count / PAGE_SIZE)
  const rest = await Promise.all(
    Array.from({ length: Math.max(pageCount - 1, 0) }, (_, i) =>
      fetchPage(q, i + 2)
    )
  )

  const rows = [first, ...rest].flatMap((page) =>
    page.data.map((row) => toRow(row?.attributes))
  )
  if (rows.length !== first.meta.count) {
    throw new Error(
      `dane.gov.pl: expected ${first.meta.count} rows, got ${rows.length}`
    )
  }
  return rows
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
 * Fetches a whole one-sex list of names and counts as CSV. These lists run to
 * tens of thousands of rows, past what the paged API can reach (row 10,000).
 * Columns are name, optionally sex, then count; header wording varies by year.
 */
export async function fetchNameCounts(
  resourceId: number,
  sex: Sex
): Promise<[name: string, count: number][]> {
  const text = await withRetries(async () => {
    const response = await fetch(
      `https://api.dane.gov.pl/resources/${resourceId}/csv`,
      { signal: AbortSignal.timeout(60_000) }
    )
    if (!response.ok) throw new Error(`dane.gov.pl: HTTP ${response.status}`)
    return response.text()
  })

  const [header, ...lines] = parseCsv(text.replace(/^\uFEFF/, ""))
  const width = header?.length
  if (width !== 2 && width !== 3) {
    throw new Error(`dane.gov.pl: unexpected columns in resource ${resourceId}`)
  }

  const counts = new Map<string, number>()
  for (const line of lines) {
    if (line.length === 1 && line[0].trim() === "") continue
    const name = line[0].trim().toUpperCase()
    const count = Number(line[width - 1])
    if (
      line.length !== width ||
      line[width - 1].trim() === "" ||
      !Number.isInteger(count) ||
      count < 1 ||
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
