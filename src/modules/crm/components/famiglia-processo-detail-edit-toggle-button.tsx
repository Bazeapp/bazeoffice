import { CheckIcon, PencilIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

type FamigliaProcessoDetailEditToggleButtonProps = {
  active: boolean
  onToggle: () => void
  labels: { on: string; off: string }
  variant?: "ghost" | "outline-ghost"
}

export function FamigliaProcessoDetailEditToggleButton({
  active,
  onToggle,
  labels,
  variant = "ghost",
}: FamigliaProcessoDetailEditToggleButtonProps) {
  const resolvedVariant =
    variant === "outline-ghost" ? (active ? "outline" : "ghost") : "ghost"

  return (
    <Button
      type="button"
      variant={resolvedVariant}
      size="icon-sm"
      aria-label={active ? labels.on : labels.off}
      title={active ? labels.on : labels.off}
      onClick={onToggle}
    >
      {variant === "outline-ghost" ? (
        active ? (
          <CheckIcon />
        ) : (
          <PencilIcon />
        )
      ) : (
        <PencilIcon />
      )}
    </Button>
  )
}
