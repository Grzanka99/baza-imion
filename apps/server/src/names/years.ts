import type { Dataset, Sex, SexFilter } from "@baza-imion/shared"
import { cached, prime } from "../cache/cache.ts"
import {
  fetchChildrenHistory,
  type YearEntry,
} from "../upstream/children-history.ts"
import { YEARLY_LISTS } from "../upstream/resource-ids.ts"
import { fetchNameCounts } from "../upstream/yearly-list.ts"

/** One cached upstream answer: a year of names for one sex or both. */
export interface Slice {
  fetchedAt: number
  forEach(visit: (name: string, sex: Sex, count: number) => void): void
}

const historyKey = (year: number) => `year:${year}`

// Shared by the years being loaded at the same moment.
let history: ReturnType<typeof fetchChildrenHistory> | undefined

function fetchHistory() {
  history ??= fetchChildrenHistory().finally(() => (history = undefined))
  return history
}

async function loadFile(resourceId: number, sex: Sex): Promise<Slice> {
  const { value, fetchedAt } = await cached(`file:${resourceId}`, () =>
    fetchNameCounts(resourceId, sex)
  )
  return {
    fetchedAt,
    forEach: (visit) => {
      for (const [name, count] of value) {
        visit(name, sex, count)
      }
    },
  }
}

/** Loads one year of a dataset, skipping the other sex's file when filtered. */
export async function loadYear(
  dataset: Dataset,
  year: number,
  sex: SexFilter = "all"
): Promise<Slice[]> {
  const files = YEARLY_LISTS[dataset][year]
  if (files) {
    let sexes: Sex[] = ["M", "K"]
    if (sex !== "all") {
      sexes = [sex]
    }
    return Promise.all(sexes.map((each) => loadFile(files[each], each)))
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
        for (const [name, rowSex, count] of value) {
          visit(name, rowSex, count)
        }
      },
    },
  ]
}
