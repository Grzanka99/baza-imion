import {
  DATASET_YEARS,
  type Dataset,
  type TrendResponse,
} from "@baza-imion/shared"
import { loadYear } from "./years.ts"

/**
 * One name's counts in every year of the dataset, read from the same cached
 * years as the list. Unknown names give `undefined`.
 */
export async function queryTrend(
  dataset: Dataset,
  name: string
): Promise<TrendResponse | undefined> {
  const years = DATASET_YEARS[dataset]
  const loaded = await Promise.all(years.map((year) => loadYear(dataset, year)))

  const points = years.map((year) => ({ year, M: 0, K: 0 }))
  const totals = { M: 0, K: 0 }
  loaded.forEach((slices, index) => {
    for (const slice of slices) {
      slice.forEach((rowName, sex, count) => {
        if (rowName !== name) {
          return
        }
        points[index][sex] += count
        totals[sex] += count
      })
    }
  })
  if (totals.M + totals.K === 0) {
    return undefined
  }

  return {
    name,
    points,
    totals,
    fetchedAt: Math.min(...loaded.flat().map((slice) => slice.fetchedAt)),
  }
}
