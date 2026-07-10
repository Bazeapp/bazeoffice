import { CheckboxChip } from "@/components/ui/checkbox"

import { CEDOLINI_FILTER_GROUPS, type CedoliniFilterGroupKey, type CedoliniFilters } from "../lib"

export function PayrollOverviewCedoliniFilterBar({
  filters,
  onToggle,
}: {
  filters: CedoliniFilters
  onToggle: (group: CedoliniFilterGroupKey, value: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {CEDOLINI_FILTER_GROUPS.map((group) => (
        <div
          key={group.key}
          role="group"
          aria-label={group.label}
          className="flex flex-wrap items-center gap-2"
        >
          <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </span>
          {group.options.map((option) => (
            <CheckboxChip
              key={option.value}
              checked={filters[group.key].has(option.value)}
              onCheckedChange={() => onToggle(group.key, option.value)}
            >
              {option.label}
            </CheckboxChip>
          ))}
        </div>
      ))}
    </div>
  )
}
