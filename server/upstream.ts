import { FIRST_YEAR, LAST_YEAR, type Sex } from "../shared/api"

const DATA_URL = "https://api.dane.gov.pl/1.4/resources/21458/data"
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

async function fetchPage(q: string, page: number): Promise<DataPage> {
  const url = new URL(DATA_URL)
  url.searchParams.set("q", q)
  // A total order, so pages never overlap or skip rows.
  url.searchParams.set("sort", "col1,col2,col4")
  url.searchParams.set("per_page", String(PAGE_SIZE))
  url.searchParams.set("page", String(page))

  let lastError: unknown
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    if (attempt > 0) await Bun.sleep(500 * 2 ** attempt)
    try {
      // The slot is held until the body has arrived, not just the headers.
      return await withSlot(async () => {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(20_000),
        })
        if (!response.ok) {
          throw new Error(`dane.gov.pl: HTTP ${response.status}`)
        }
        const page = (await response.json()) as DataPage
        if (
          !Number.isInteger(page?.meta?.count) ||
          page.meta.count < 0 ||
          !Array.isArray(page.data)
        ) {
          throw new Error("dane.gov.pl: unexpected response")
        }
        return page
      })
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
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
