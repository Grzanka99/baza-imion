import {
  DATASET_YEARS,
  type Dataset,
  type NameRow,
  type Gender,
  type GenderFilter,
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

/** Every name in one dataset, year selection and gender, ranked by count. */
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
  gender: GenderFilter
): Promise<Scope> {
  let years = DATASET_YEARS[dataset]
  if (year !== "all") {
    years = [year]
  }
  const slices = (
    await Promise.all(years.map((each) => loadYear(dataset, each, gender)))
  ).flat()

  const key = `${dataset}:${year}:${gender}`
  const signature = slices.map((slice) => slice.fetchedAt).join()
  const known = scopes.get(key)
  scopes.delete(key)
  if (known?.signature === signature) {
    scopes.set(key, known)
    return known
  }

  const scope = {
    signature,
    ...rank(slices, gender),
    fetchedAt: Math.min(...slices.map((slice) => slice.fetchedAt)),
  }
  scopes.set(key, scope)
  if (scopes.size > MAX_SCOPES) {
    scopes.delete(scopes.keys().next().value!)
  }
  return scope
}

function rank(slices: Slice[], gender: GenderFilter) {
  // One row per name: with both genders selected, men and women who share a
  // name are counted together.
  const byName = new Map<
    string,
    RankedRow & { byGender: Record<Gender, number> }
  >()
  for (const slice of slices) {
    slice.forEach((name, rowGender, count) => {
      if (gender !== "all" && rowGender !== gender) {
        return
      }
      let row = byName.get(name)
      if (!row) {
        row = {
          name,
          genders: [],
          byGender: { M: 0, K: 0 },
          count: 0,
          rank: 0,
          share: 0,
          folded: fold(name),
          nameOrder: 0,
        }
        byName.set(name, row)
      }
      row.count += count
      row.byGender[rowGender] += count
    })
  }

  const rows: RankedRow[] = [...byName.values()].map(
    ({ byGender, ...row }) => ({
      ...row,
      genders: (["M", "K"] as const)
        .filter((each) => byGender[each] > 0)
        .map((each) => ({ gender: each, count: byGender[each] }))
        .sort((a, b) => b.count - a.count),
    })
  )
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
