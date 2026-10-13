import { Mars, Venus } from "lucide-react"

import { SEX_COLOR } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Sex } from "../../shared/api"

const ICON = { M: Mars, K: Venus }

export function SexIcon({
  sex,
  label,
  faint = false,
}: {
  sex: Sex
  label: string
  /** For a sex that barely figures among the bearers of a name. */
  faint?: boolean
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
