import {
  DATASET_YEARS,
  type Dataset,
  type NameRow,
  type Sex,
  type SexFilter,
  type YearFilter,
} from "@baza-imion/shared"
import { fold } from "./fold.ts"
import { loadYear, type Slice } from "./years.ts"

const collator = new Intl.Collator("pl")

export interface RankedRow extends NameRow {
  folded: string
  /** Position in alphabetical order, so sorting by name compares integers. */
  nameOrder: number
}

/** Every name in one dataset, year selection and sex, ranked by count. */
interface Scope {
  signature: string
  rows: RankedRow[]
  count: number
  fetchedAt: number
}

// Ranking tens of thousands of names takes a while, so recent scopes are kept.
const MAX_SCOPES = 12
const scopes = new Map<string, Scope>()

export async function loadScope(
  dataset: Dataset,
  year: YearFilter,
  sex: SexFilter
): Promise<Scope> {
  let years = DATASET_YEARS[dataset]
  if (year !== "all") {
    years = [year]
  }
  const slices = (
    await Promise.all(years.map((each) => loadYear(dataset, each, sex)))
  ).flat()

  const key = `${dataset}:${year}:${sex}`
  const signature = slices.map((slice) => slice.fetchedAt).join()
  const known = scopes.get(key)
  scopes.delete(key)
  if (known?.signature === signature) {
    scopes.set(key, known)
    return known
  }

  const scope = {
    signature,
    ...rank(slices, sex),
    fetchedAt: Math.min(...slices.map((slice) => slice.fetchedAt)),
  }
  scopes.set(key, scope)
  if (scopes.size > MAX_SCOPES) {
    scopes.delete(scopes.keys().next().value!)
  }
  return scope
}

function rank(slices: Slice[], sex: SexFilter) {
  // One row per name: with both sexes selected, men and women who share a
  // name are counted together.
  const byName = new Map<string, RankedRow & { bySex: Record<Sex, number> }>()
  for (const slice of slices) {
    slice.forEach((name, rowSex, count) => {
      if (sex !== "all" && rowSex !== sex) {
        return
      }
      let row = byName.get(name)
      if (!row) {
        row = {
          name,
          sexes: [],
          bySex: { M: 0, K: 0 },
          count: 0,
          rank: 0,
          share: 0,
          folded: fold(name),
          nameOrder: 0,
        }
        byName.set(name, row)
      }
      row.count += count
      row.bySex[rowSex] += count
    })
  }

  const rows: RankedRow[] = [...byName.values()].map(({ bySex, ...row }) => ({
    ...row,
    sexes: (["M", "K"] as const)
      .filter((each) => bySex[each] > 0)
      .map((each) => ({ sex: each, count: bySex[each] }))
      .sort((a, b) => b.count - a.count),
  }))
  rows
    .sort((a, b) => collator.compare(a.name, b.name))
    .forEach((row, index) => (row.nameOrder = index))
  rows.sort((a, b) => b.count - a.count || a.nameOrder - b.nameOrder)

  const count = rows.reduce((sum, row) => sum + row.count, 0)
  rows.forEach((row, index) => {
    const previous = rows[index - 1]
    row.rank = index + 1
    if (previous?.count === row.count) {
      row.rank = previous.rank
    }
    row.share = row.count / count
  })

  return { rows, count }
}
