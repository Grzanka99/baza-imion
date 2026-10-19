import type { Dataset, Gender, GenderFilter } from "@baza-imion/shared"
import { cached, prime } from "../cache/cache.ts"
import {
  fetchChildrenHistory,
  type YearEntry,
} from "../upstream/children-history.ts"
import { YEARLY_LISTS } from "../upstream/resource-ids.ts"
import { fetchNameCounts } from "../upstream/yearly-list.ts"

/** One cached upstream answer: a year of names for one gender or both. */
export interface Slice {
  fetchedAt: number
  forEach(visit: (name: string, gender: Gender, count: number) => void): void
}

const historyKey = (year: number) => `year:${year}`

// Shared by the years being loaded at the same moment.
let history: ReturnType<typeof fetchChildrenHistory> | undefined

function fetchHistory() {
  history ??= fetchChildrenHistory().finally(() => (history = undefined))
  return history
}

async function loadFile(resourceId: number, gender: Gender): Promise<Slice> {
  const { value, fetchedAt } = await cached(`file:${resourceId}`, () =>
    fetchNameCounts(resourceId, gender)
  )
  return {
    fetchedAt,
    forEach: (visit) => {
      for (const [name, count] of value) {
        visit(name, gender, count)
      }
    },
  }
}

/** Loads one year of a dataset, skipping the other gender's file when filtered. */
export async function loadYear(
  dataset: Dataset,
  year: number,
  gender: GenderFilter = "all"
): Promise<Slice[]> {
  const files = YEARLY_LISTS[dataset][year]
  if (files) {
    let genders: Gender[] = ["M", "K"]
    if (gender !== "all") {
      genders = [gender]
    }
    return Promise.all(genders.map((each) => loadFile(files[each], each)))
  }

  const { value, fetchedAt } = await cached<YearEntry[]>(
    historyKey(year),
    async () => {
      // One file holds all twenty years, so the others are stored with it.
      const years = await fetchHistory()
      await Promise.all(
        [...years]
          .filter(([other]) => other !== year)
          .map(([other, entries]) => prime(historyKey(other), entries))
      )
      return years.get(year)!
    }
  )
  return [
    {
      fetchedAt,
      forEach: (visit) => {
        for (const [name, rowGender, count] of value) {
          visit(name, rowGender, count)
        }
      },
    },
  ]
}
