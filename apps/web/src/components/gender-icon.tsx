import { Mars, Venus } from "lucide-react"

import { formatNumber } from "@/lib/format"
import { GENDER_COLOR, GENDER_LABEL } from "@/lib/labels"
import { cn } from "@/lib/utils"
import type { Dataset, NameRow, Gender } from "@baza-imion/shared"

const ICON = { M: Mars, K: Venus }

// Below this share of a name's bearers, a gender is drawn faintly: three women
// named Piotr should not read as "a name for both".
const MINOR_SHARE = 0.01

function GenderIcon({
  gender,
  label,
  faint,
}: {
  gender: Gender
  label: string
  faint: boolean
}) {
  const Icon = ICON[gender]
  return (
    <span
      title={label}
      className={cn("inline-flex align-middle", faint && "opacity-35")}
    >
      <Icon
        role="img"
        aria-label={label}
        className="size-4"
        style={{ color: GENDER_COLOR[gender] }}
      />
    </span>
  )
}

/** The icons for who bears a name, the larger group first. */
export function GenderIcons({
  dataset,
  row,
}: {
  dataset: Dataset
  row: NameRow
}) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {row.genders.map(({ gender, count }) => (
        <GenderIcon
          key={gender}
          gender={gender}
          label={`${GENDER_LABEL[dataset][gender].one}: ${formatNumber(count)}`}
          faint={count < row.count * MINOR_SHARE}
        />
      ))}
    </span>
  )
}
