import * as React from "react"

import { cn } from "@/lib/utils"

type DayCountOption = {
  label: string
  value: string
}

type DayCountSelectorProps = {
  options: DayCountOption[]
  value: string[]
  onChange?: (values: string[]) => void
  disabled?: boolean
  readOnly?: boolean
}

function extractDayCount(label: string) {
  const match = label.match(/(\d+)/)
  return match ? match[1] : label
}

export function DayCountSelector({
  options,
  value,
  onChange,
  disabled = false,
  readOnly = false,
}: DayCountSelectorProps) {
  const selected = React.useMemo(() => new Set(value), [value])

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = selected.has(option.label)
        const content = (
          <React.Fragment>
            <span
              className={cn(
              "size-2 rounded-full border border-current/10 bg-current/20",
                isActive && "bg-current"
              )}
            />
            <span className="text-xs font-medium">{extractDayCount(option.label)}g</span>
          </React.Fragment>
        )

        if (readOnly) {
          return (
            <span
              key={option.value}
              title={option.label}
              className={cn(
                "inline-flex h-8 min-w-11 items-center justify-center gap-2 rounded-md border px-2",
                isActive
                  ? "border-primary/20 bg-primary/10 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground"
              )}
            >
              {content}
            </span>
          )
        }

        return (
          <button
            key={option.value}
            type="button"
            title={option.label}
            disabled={disabled}
            onClick={() => {
              const next = isActive
                ? value.filter((item) => item !== option.label)
                : [...value, option.label]
              onChange?.(next)
            }}
            className={cn(
              "inline-flex h-8 min-w-11 items-center justify-center gap-2 rounded-md border px-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              isActive
                ? "border-primary/20 bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-muted/60"
            )}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}
