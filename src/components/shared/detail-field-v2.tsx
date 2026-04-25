/**
 * DetailField (v2) — swap `<Input readOnly>` → `<p class="ui-type-value">` (risolve OSS-09).
 * Nuova versione che convive con DetailField esistente in detail-section-card.tsx.
 * Vedi spec `outputs/04_spec/shared/detail-field.md`.
 */
import * as React from "react"

import { cn } from "@/lib/utils"

type DetailFieldProps = {
  label: string
  value: React.ReactNode
  multiline?: boolean
  className?: string
  labelClassName?: string
  valueClassName?: string
}

const EMPTY_FALLBACK = "—"

export function DetailField({
  label,
  value,
  multiline = false,
  className,
  labelClassName,
  valueClassName,
}: DetailFieldProps) {
  const isPrimitive =
    typeof value === "string" || typeof value === "number" || typeof value === "bigint"

  const isEmpty =
    value === null || value === undefined || value === "" || value === "-"

  return (
    <div className={cn("space-y-1", className)}>
      <p className={cn("ui-type-label", labelClassName)}>{label}</p>
      {isEmpty ? (
        <p className={cn("ui-type-value text-muted-foreground", valueClassName)}>
          {EMPTY_FALLBACK}
        </p>
      ) : isPrimitive ? (
        <p
          className={cn(
            "ui-type-value",
            multiline && "whitespace-pre-wrap",
            valueClassName,
          )}
        >
          {String(value)}
        </p>
      ) : (
        <div className={cn("ui-type-value", valueClassName)}>{value}</div>
      )}
    </div>
  )
}

type DetailFieldControlProps = {
  label: string
  children: React.ReactNode
  hint?: React.ReactNode
  className?: string
  labelClassName?: string
}

export function DetailFieldControl({
  label,
  children,
  hint,
  className,
  labelClassName,
}: DetailFieldControlProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline gap-2">
        <p className={cn("ui-type-label", labelClassName)}>{label}</p>
        {hint ? (
          <span className="ui-type-meta text-[11px] text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  )
}
