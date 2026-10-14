import { Mars, Venus } from "lucide-react"

import { formatNumber } from "@/lib/format"
import { SEX_COLOR, SEX_LABEL } from "@/lib/labels"
import { cn } from "@/lib/utils"
import type { Dataset, NameRow, Sex } from "@baza-imion/shared"

const ICON = { M: Mars, K: Venus }

// Below this share of a name's bearers, a sex is drawn faintly: three women
// named Piotr should not read as "a name for both".
const MINOR_SHARE = 0.01

function SexIcon({
  sex,
  label,
  faint,
}: {
  sex: Sex
  label: string
  faint: boolean
}) {
  const Icon = ICON[sex]
  return (
    <span
      title={label}
      className={cn("inline-flex align-middle", faint && "opacity-35")}
    >
      <Icon
        role="img"
        aria-label={label}
        className="size-4"
        style={{ color: SEX_COLOR[sex] }}
      />
    </span>
  )
}

/** The icons for who bears a name, the larger group first. */
export function SexIcons({ dataset, row }: { dataset: Dataset; row: NameRow }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {row.sexes.map(({ sex, count }) => (
        <SexIcon
          key={sex}
          sex={sex}
          label={`${SEX_LABEL[dataset][sex].one}: ${formatNumber(count)}`}
          faint={count < row.count * MINOR_SHARE}
        />
      ))}
    </span>
  )
}
