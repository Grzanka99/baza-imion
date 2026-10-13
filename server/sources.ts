import type { Dataset, Sex, SexFilter } from "../shared/api.js"
import { cached, prime } from "./cache.js"
import {
  fetchChildrenHistory,
  fetchNameCounts,
  type YearEntry,
} from "./upstream.js"

/** One cached upstream answer: a year of names for one sex or both. */
export interface Slice {
  fetchedAt: number
  forEach(visit: (name: string, sex: Sex, count: number) => void): void
}

// dane.gov.pl resource ids of the yearly first-name lists, one per sex.
// Children before 2020 come from a single file covering 2000-2019 instead.
const FILES: Record<Dataset, Record<number, Record<Sex, number>>> = {
  children: {
    2020: { M: 28020, K: 28021 },
    2021: { M: 36393, K: 36394 },
    2022: { M: 44825, K: 44824 },
    2023: { M: 54099, K: 54100 },
    2024: { M: 63900, K: 63899 },
    2025: { M: 1159536, K: 1159538 },
  },
  population: {
    2019: { M: 18606, K: 18608 },
    2020: { M: 21487, K: 21489 },
    2021: { M: 28104, K: 28103 },
    2022: { M: 42873, K: 42874 },
    2023: { M: 44834, K: 44838 },
    2024: { M: 54109, K: 54110 },
    2025: { M: 63929, K: 63924 },
    2026: { M: 1159669, K: 1159670 },
  },
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
      for (const [name, count] of value) visit(name, sex, count)
    },
  }
}

/** Loads one year of a dataset, skipping the other sex's file when filtered. */
export async function loadYear(
  dataset: Dataset,
  year: number,
  sex: SexFilter = "all"
): Promise<Slice[]> {
  const files = FILES[dataset][year]
  if (files) {
    const sexes: Sex[] = sex === "all" ? ["M", "K"] : [sex]
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
        for (const [name, rowSex, count] of value) visit(name, rowSex, count)
      },
    },
  ]
}
