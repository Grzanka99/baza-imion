import type { Dataset, Sex } from "../../shared/api"

const numberFormat = new Intl.NumberFormat("pl-PL")
const percentFormat = new Intl.NumberFormat("pl-PL", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" })

export const formatNumber = (value: number) => numberFormat.format(value)
/** Shares too small to show as 0,01% say so, instead of reading as zero. */
export function formatPercent(value: number) {
  return value > 0 && value < 0.00005
    ? `<${percentFormat.format(0.0001)}`
    : percentFormat.format(value)
}
export const formatDate = (timestamp: number) => dateFormat.format(timestamp)

/** Picks the Polish plural form: 1 imię, 2 imiona, 5 imion. */
export function plural(count: number, one: string, few: string, many: string) {
  const lastTwo = count % 100
  const last = count % 10
  if (count === 1) return one
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few
  return many
}

/** The source spells names in capitals: "ANNA MARIA" becomes "Anna Maria". */
export function displayName(name: string) {
  return name
    .toLocaleLowerCase("pl")
    .replace(/(^|[\s'-])(\p{L})/gu, (_, before: string, letter: string) => {
      return before + letter.toLocaleUpperCase("pl")
    })
}

export const SEX_LABEL: Record<
  Dataset,
  Record<Sex, { one: string; many: string }>
> = {
  children: {
    M: { one: "chłopiec", many: "Chłopcy" },
    K: { one: "dziewczynka", many: "Dziewczynki" },
  },
  population: {
    M: { one: "mężczyzna", many: "Mężczyźni" },
    K: { one: "kobieta", many: "Kobiety" },
  },
}

/** Forms of the counted noun for `plural`: 1 dziecko, 2 dzieci, 5 dzieci. */
export const PEOPLE_NOUN: Record<Dataset, [string, string, string]> = {
  children: ["dziecko", "dzieci", "dzieci"],
  population: ["osoba", "osoby", "osób"],
}

export const SEX_COLOR: Record<Sex, string> = {
  M: "var(--series-m)",
  K: "var(--series-k)",
}
