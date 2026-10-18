import {
  DATASET_YEARS,
  plural,
  type Dataset,
  type NameRow,
  type Sex,
  type TrendResponse,
} from "@baza-imion/shared"
import { formatNumber, table } from "./html.ts"

// The sentences and tables of a name's page, in Polish.

/** What a dataset says about one name: its trend, and its row in the default year. */
export interface Figures {
  trend: TrendResponse
  /** Missing when the name is absent from the latest population snapshot; births always have one. */
  row: NameRow | undefined
}

const SEXES: Sex[] = ["M", "K"]

const SEX_LABEL: Record<Dataset, Record<Sex, string>> = {
  children: { M: "chłopcy", K: "dziewczynki" },
  population: { M: "mężczyźni", K: "kobiety" },
}

const POPULATION_YEAR = DATASET_YEARS.population.at(-1)!
const CHILDREN_YEARS = DATASET_YEARS.children
const CHILDREN_SPAN = `${CHILDREN_YEARS[0]}–${CHILDREN_YEARS.at(-1)}`

export const FOOTNOTE =
  "Źródło: rejestr PESEL, dane.gov.pl. Rejestr nie wykazuje imion noszonych przez jedną osobę ani imion nadanych w danym roku mniej niż 5 razy (od 2013 r. mniej niż 2 razy), dlatego „–” nie oznacza zera."

/** "(kobiety: 120, mężczyźni: 3)" for a name both sexes bear, else nothing. */
function sexSplit(dataset: Dataset, row: NameRow) {
  if (row.sexes.length < 2) {
    return ""
  }
  const parts = row.sexes.map(
    ({ sex, count }) => `${SEX_LABEL[dataset][sex]}: ${formatNumber(count)}`
  )
  return ` (${parts.join(", ")})`
}

export function populationSentence(shown: string, row: NameRow) {
  const count = row.count
  const lives = plural(count, "żyje", "żyją", "żyje")
  const people = plural(count, "osoba", "osoby", "osób")
  return (
    `Według rejestru PESEL w Polsce ${lives} ${formatNumber(count)} ${people} ` +
    `o imieniu ${shown}${sexSplit("population", row)}, stan na styczeń ` +
    `${POPULATION_YEAR} r. Imię zajmuje ${row.rank}. miejsce w rankingu.`
  )
}

export function childrenSentence(
  shown: string,
  row: NameRow,
  trend: TrendResponse
) {
  const given = `${formatNumber(row.count)} ${plural(row.count, "dziecku", "dzieciom", "dzieciom")}`
  const text =
    `W latach ${CHILDREN_SPAN} imię ${shown} nadano ${given}${sexSplit("children", row)}. ` +
    `Zajmuje ${row.rank}. miejsce wśród imion nadanych w tym czasie`
  const best = trend.points.reduce((top, point) => {
    if (point.M + point.K > top.M + top.K) {
      return point
    }
    return top
  })
  return `${text}; najczęściej wybierano je w ${best.year} r.`
}

/** Under 160 characters or so, for the search result snippet. */
export function description(
  shown: string,
  population: NameRow | undefined,
  children: NameRow | undefined
) {
  const parts: string[] = []
  if (population) {
    parts.push(
      `${shown}: ${formatNumber(population.count)} ${plural(population.count, "osoba", "osoby", "osób")} w Polsce (${POPULATION_YEAR} r.), ${population.rank}. miejsce w rankingu imion.`
    )
  }
  if (children) {
    let subject = "je"
    if (parts.length === 0) {
      subject = `imię ${shown}`
    }
    parts.push(
      `W latach ${CHILDREN_SPAN} nadano ${subject} ${formatNumber(children.count)} ${plural(children.count, "dziecku", "dzieciom", "dzieciom")}.`
    )
  }
  parts.push("Liczby rok po roku z rejestru PESEL.")
  return parts.join(" ")
}

const capitalize = (text: string) =>
  text.slice(0, 1).toUpperCase() + text.slice(1)

/** One row per year, a column for each sex that bears the name, the larger group first. */
export function trendTable(
  dataset: Dataset,
  caption: string,
  trend: TrendResponse
) {
  const sexes = SEXES.filter((sex) => trend.totals[sex] > 0).sort(
    (a, b) => trend.totals[b] - trend.totals[a]
  )
  const header = [
    "Rok",
    ...sexes.map((sex) => capitalize(SEX_LABEL[dataset][sex])),
  ]
  const rows = trend.points.map((point) => [
    String(point.year),
    ...sexes.map((sex) => {
      if (point[sex] === 0) {
        return "–"
      }
      return formatNumber(point[sex])
    }),
  ])
  return table(caption, header, rows)
}
