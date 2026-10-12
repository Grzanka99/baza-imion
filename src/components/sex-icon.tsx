import { Mars, Venus } from "lucide-react"

import { SEX_COLOR } from "@/lib/format"
import type { Sex } from "../../shared/api"

const ICON = { M: Mars, K: Venus }

export function SexIcon({ sex, label }: { sex: Sex; label: string }) {
  const Icon = ICON[sex]
  return (
    <span title={label} className="inline-flex align-middle">
      <Icon
        role="img"
        aria-label={label}
        className="size-4"
        style={{ color: SEX_COLOR[sex] }}
      />
    </span>
  )
}
