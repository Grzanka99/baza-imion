import type { Dataset, Gender } from "@baza-imion/shared"

export const GENDER_LABEL: Record<
  Dataset,
  Record<Gender, { one: string; many: string }>
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

export const GENDER_COLOR: Record<Gender, string> = {
  M: "var(--series-m)",
  K: "var(--series-k)",
}
