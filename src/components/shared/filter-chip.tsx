/**
 * FilterChip — chip singolo di filtro attivo.
 * Vedi spec `outputs/04_spec/shared/filter-chip.md`.
 */
import type { LucideIcon } from "lucide-react"
import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type FilterChipProps = {
  icon: LucideIcon
  label: string
  value: string
  onRemove: () => void
  className?: string
}

export function FilterChip({
  icon: Icon,
  label,
  value,
  onRemove,
  className,
}: FilterChipProps) {
  return (
    <div
      className={cn(
        "inline-flex h-[26px] items-center gap-1.5 rounded-md border border-border bg-background px-1.5 text-[12px]",
        "transition-colors hover:bg-muted",
        className,
      )}
    >
      <Icon className="size-3 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Rimuovi filtro ${label}`}
        onClick={onRemove}
        className="h-4 w-4 rounded-[3px]"
      >
        <XIcon className="size-3" />
      </Button>
    </div>
  )
}
