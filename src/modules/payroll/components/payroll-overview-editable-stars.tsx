import { StarIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export function PayrollOverviewEditableStars({
  value,
  onChange,
  readOnly = false,
}: {
  value: number | null | undefined
  onChange?: (value: number) => void
  readOnly?: boolean
}) {
  const rating = typeof value === "number" ? Math.max(0, Math.min(5, Math.round(value))) : 0

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const nextValue = index + 1
        return (
          <button
            key={nextValue}
            type="button"
            className={readOnly ? "cursor-default" : "cursor-pointer"}
            disabled={readOnly}
            onClick={() => onChange?.(nextValue)}
            aria-label={`Imposta rating ${nextValue}`}
          >
            <StarIcon
              className={cn(
                "size-4",
                index < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
