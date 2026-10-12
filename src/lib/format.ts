import type { Sex } from "../../shared/api"

const numberFormat = new Intl.NumberFormat("pl-PL")
const percentFormat = new Intl.NumberFormat("pl-PL", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" })

export const formatNumber = (value: number) => numberFormat.format(value)
export const formatPercent = (value: number) => percentFormat.format(value)
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

export const SEX_LABEL: Record<Sex, { one: string; many: string }> = {
  M: { one: "chłopiec", many: "Chłopcy" },
  K: { one: "dziewczynka", many: "Dziewczynki" },
}

export const SEX_COLOR: Record<Sex, string> = {
  M: "var(--series-m)",
  K: "var(--series-k)",
}
