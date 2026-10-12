import type { Dataset, Sex, SexFilter } from "../shared/api.js"
import { cached } from "./cache.js"
import { fetchNameCounts, fetchRows } from "./upstream.js"

/** One cached upstream answer: a year of names for one sex or both. */
export interface Slice {
  fetchedAt: number
  forEach(visit: (name: string, sex: Sex, count: number) => void): void
}

type YearEntry = [name: string, sex: Sex, count: number]

// dane.gov.pl resource ids of the yearly first-name lists, one per sex.
// Children before 2020 come from a single resource queried by year instead.
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
    `year:${year}`,
    async () => {
      const rows = await fetchRows(`col1:${year}`)
      return rows.map((row) => [row.name, row.sex, row.count])
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
