import { CheckIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getTagClassName, resolveLookupColor, type LookupOption } from "@/features/lavoratori/lib/lookup-utils"
import { cn } from "@/lib/utils"

export type SkillsChoiceMatrixRow = {
  field: string
  label: string
  domain: string
  value: string
  options: LookupOption[]
}

type SkillsChoiceMatrixProps = {
  title?: string
  isEditing: boolean
  isUpdating: boolean
  rows: SkillsChoiceMatrixRow[]
  lookupColorsByDomain: Map<string, string>
  onFieldChange: (field: string, value: string) => void
}

function getChoiceIcon(value: string) {
  if (value === "Accetta" || value === "Consigliata") {
    return <CheckIcon className="size-3.5" />
  }

  if (value === "Non accetta" || value === "Sconsigliata") {
    return <XIcon className="size-3.5" />
  }

  return null
}

export function SkillsChoiceMatrix({
  title,
  isEditing,
  isUpdating,
  rows,
  lookupColorsByDomain,
  onFieldChange,
}: SkillsChoiceMatrixProps) {
  const columns = rows[0]?.options ?? []

  if (rows.length === 0 || columns.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      {title ? (
        <p className="text-muted-foreground text-xs font-medium tracking-wide">{title}</p>
      ) : null}
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.field}
            className="bg-muted/35 rounded-lg border border-border/60 px-3 py-3"
            data-empty={!row.value}
          >
            <div className={cn(
              "flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between",
              !row.value && !isEditing && "opacity-80"
            )}>
              <p className="min-w-0 text-sm leading-snug font-medium">{row.label}</p>
              <div className="flex flex-wrap gap-2">
                {columns.map((option) => {
                  const isSelected = row.value === option.label
                  const color = resolveLookupColor(lookupColorsByDomain, row.domain, option.label)

                  if (isEditing) {
                    return (
                      <Button
                        key={`${row.field}-${option.value}`}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        disabled={isUpdating}
                        className={cn(isSelected && getTagClassName(color))}
                        onClick={() => onFieldChange(row.field, option.label)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {getChoiceIcon(option.label)}
                          <span className="truncate">{option.label}</span>
                        </span>
                      </Button>
                    )
                  }

                  if (!isSelected) {
                    return null
                  }

                  return (
                    <Badge
                      key={`${row.field}-${option.value}`}
                      variant="outline"
                      className={getTagClassName(color)}
                    >
                      {getChoiceIcon(option.label)}
                      <span className="truncate">{option.label}</span>
                    </Badge>
                  )
                })}
                {!isEditing && !row.value ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    Non valutata
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
