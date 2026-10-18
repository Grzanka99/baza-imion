export { displayName, plural } from "@baza-imion/shared"

const numberFormat = new Intl.NumberFormat("pl-PL")
const percentFormat = new Intl.NumberFormat("pl-PL", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const compactFormat = new Intl.NumberFormat("pl-PL", { notation: "compact" })

export const formatNumber = (value: number) => numberFormat.format(value)

/** A count where there may be none: `missing` stands in for no count or zero. */
export function formatCount(value: number | undefined, missing = "–") {
  if (!value) {
    return missing
  }
  return formatNumber(value)
}

/** Short form for chart axes: 1 mln, 250 tys. */
export const formatCompact = (value: number) => compactFormat.format(value)

/** Shares too small to show as 0,01% say so, instead of reading as zero. */
export function formatPercent(value: number) {
  if (value > 0 && value < 0.00005) {
    return `<${percentFormat.format(0.0001)}`
  }
  return percentFormat.format(value)
}
