/**
 * FilterToolbar — toolbar con search + chip filtri attivi + "Aggiungi filtro" popover 2-livelli.
 * Vedi spec `outputs/04_spec/shared/filter-toolbar.md`.
 */
import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { ChevronRightIcon, CheckIcon, PlusIcon, SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { FilterChip } from "./filter-chip"

export type FilterDimension = {
  key: string
  label: string
  icon: LucideIcon
  options: Array<{ value: string; label: string }>
  multi?: boolean
}

type FilterValue = unknown

type FilterToolbarProps = {
  query: string
  onQueryChange: (query: string) => void
  filters: Record<string, unknown>
  onFiltersChange: (filters: Record<string, unknown>) => void
  dimensions: FilterDimension[]
  searchPlaceholder?: string
  rightAction?: React.ReactNode
  className?: string
}

function formatDisplayValue(
  value: FilterValue,
  options: FilterDimension["options"],
): string {
  if (value === undefined) return ""
  if (Array.isArray(value)) {
    if (value.length === 0) return ""
    if (value.length === 1) return options.find((o) => o.value === value[0])?.label ?? String(value[0])
    return `${value.length} selezionati`
  }
  return options.find((o) => o.value === value)?.label ?? String(value)
}

export function FilterToolbar({
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  dimensions,
  searchPlaceholder = "Cerca...",
  rightAction,
  className,
}: FilterToolbarProps) {
  const [popoverOpen, setPopoverOpen] = React.useState(false)
  const [subDim, setSubDim] = React.useState<FilterDimension | null>(null)

  const activeKeys = Object.keys(filters).filter((k) => {
    const v = filters[k]
    if (Array.isArray(v)) return v.length > 0
    return v !== undefined && v !== ""
  })

  const pickDimension = (d: FilterDimension) => setSubDim(d)

  const pickValue = (dim: FilterDimension, val: string) => {
    if (dim.multi) {
      const current = Array.isArray(filters[dim.key]) ? (filters[dim.key] as string[]) : []
      const next = current.includes(val) ? current.filter((v) => v !== val) : [...current, val]
      onFiltersChange({ ...filters, [dim.key]: next })
    } else {
      onFiltersChange({ ...filters, [dim.key]: val })
      setPopoverOpen(false)
      setSubDim(null)
    }
  }

  const removeFilter = (key: string) => {
    const next = { ...filters }
    delete next[key]
    onFiltersChange(next)
  }

  const handleOpenChange = (open: boolean) => {
    setPopoverOpen(open)
    if (!open) setSubDim(null)
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-border bg-background px-6 py-2.5",
        className,
      )}
    >
      {/* Search */}
      <div className="flex h-[30px] min-w-[260px] items-center gap-2 rounded-md bg-muted/50 px-2.5 transition-colors focus-within:bg-background focus-within:ring-1 focus-within:ring-border">
        <SearchIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden items-center justify-center rounded border border-border bg-background px-1 text-[10px] font-medium text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
      </div>

      {/* Active chips */}
      {activeKeys.map((k) => {
        const dim = dimensions.find((d) => d.key === k)
        if (!dim) return null
        return (
          <FilterChip
            key={k}
            icon={dim.icon}
            label={dim.label}
            value={formatDisplayValue(filters[k], dim.options)}
            onRemove={() => removeFilter(k)}
          />
        )
      })}

      {/* Add filter */}
      <Popover open={popoverOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-[26px] border border-dashed border-border text-muted-foreground hover:text-foreground"
          >
            <PlusIcon data-icon="inline-start" className="size-3" />
            Aggiungi filtro
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-1" align="start">
          {!subDim ? (
            <>
              <div className="ui-type-meta px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Filtra per
              </div>
              {dimensions.map((d) => {
                const Icon = d.icon
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => pickDimension(d)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted"
                  >
                    <Icon className="size-3.5 text-muted-foreground" />
                    <span className="flex-1">{d.label}</span>
                    <ChevronRightIcon className="size-3 text-muted-foreground" />
                  </button>
                )
              })}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSubDim(null)}
                className="ui-type-meta flex w-full items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                ← {subDim.label}
              </button>
              <div className="max-h-[260px] overflow-y-auto pt-1">
                {subDim.options.map((opt) => {
                  const current = filters[subDim.key]
                  const isActive = Array.isArray(current)
                    ? current.includes(opt.value)
                    : current === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => pickValue(subDim, opt.value)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted"
                    >
                      <span className="flex-1">{opt.label}</span>
                      {isActive ? (
                        <CheckIcon className="size-3.5 text-primary" />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right action */}
      {rightAction}
    </div>
  )
}
