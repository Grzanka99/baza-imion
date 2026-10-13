const numberFormat = new Intl.NumberFormat("pl-PL")
const percentFormat = new Intl.NumberFormat("pl-PL", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const compactFormat = new Intl.NumberFormat("pl-PL", { notation: "compact" })

export const formatNumber = (value: number) => numberFormat.format(value)

/** Short form for chart axes: 1 mln, 250 tys. */
export const formatCompact = (value: number) => compactFormat.format(value)

/** Shares too small to show as 0,01% say so, instead of reading as zero. */
export function formatPercent(value: number) {
  return value > 0 && value < 0.00005
    ? `<${percentFormat.format(0.0001)}`
    : percentFormat.format(value)
}

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
