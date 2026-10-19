import type { Dataset, Gender } from "@baza-imion/shared"

// dane.gov.pl resource ids of the yearly first-name lists, one per gender.
// Children before 2020 come from a single file covering 2000-2019 instead
// (see children-history.ts).
export const YEARLY_LISTS: Record<
  Dataset,
  Record<number, Record<Gender, number>>
> = {
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
