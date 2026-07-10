import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { getTagClassName } from "@/modules/lavoratori/lib"
import { cn } from "@/lib/utils"

import type { RapportiListItem } from "../lib/list-panel-utils"
import { getRapportiListGroupLookupColor } from "../lib/rapporti-list-panel.mappers"
import { RapportiListPanelCard } from "./rapporti-list-panel-card"

export type RapportiListPanelGroupTreeProps = {
  items: RapportiListItem[]
  grouping: string[]
  depth?: number
  collapsedGroups: Record<string, boolean>
  onToggleGroup: (groupKey: string) => void
  selectedRapportoId: string | null
  onSelect: (id: string) => void
  lookupColorsByDomain: Map<string, string>
}

export function RapportiListPanelGroupTree({
  items,
  grouping,
  depth = 0,
  collapsedGroups,
  onToggleGroup,
  selectedRapportoId,
  onSelect,
  lookupColorsByDomain,
}: RapportiListPanelGroupTreeProps) {
  if (grouping.length === 0) {
    return (
      <div className="space-y-2">
        {items.map((rapporto) => (
          <RapportiListPanelCard
            key={rapporto.id}
            rapporto={rapporto}
            selected={selectedRapportoId === rapporto.id}
            onSelect={() => onSelect(rapporto.id)}
            lookupColorsByDomain={lookupColorsByDomain}
          />
        ))}
      </div>
    )
  }

  const [currentGroup, ...nextGroups] = grouping
  const grouped = new Map<string, RapportiListItem[]>()

  for (const item of items) {
    const key = String(item[currentGroup as keyof RapportiListItem] ?? "Senza valore")
    grouped.set(key, [...(grouped.get(key) ?? []), item])
  }

  return (
    <>
      {Array.from(grouped.entries()).map(([groupValue, groupItems]) => {
        const groupKey = `${depth}:${currentGroup}:${groupValue}`
        const isCollapsed = collapsedGroups[groupKey] ?? false
        const color = getRapportiListGroupLookupColor(
          currentGroup,
          groupValue,
          lookupColorsByDomain,
        )

        return (
          <div key={groupKey} className="space-y-2">
            <button
              type="button"
              onClick={() => onToggleGroup(groupKey)}
              className={cn(
                "text-muted-foreground hover:text-foreground flex w-full items-center gap-1.5 px-1 text-sm font-medium transition-colors",
                depth > 0 && "pl-4",
              )}
            >
              {isCollapsed ? (
                <ChevronRightIcon className="size-4" />
              ) : (
                <ChevronDownIcon className="size-4" />
              )}
              <span>{groupValue}</span>
              {color ? <Badge className={getTagClassName(color)}>{currentGroup}</Badge> : null}
              <Badge variant="outline" className="ml-auto">
                {groupItems.length}
              </Badge>
            </button>
            {!isCollapsed ? (
              <div className={cn("space-y-2", depth > 0 && "pl-4")}>
                <RapportiListPanelGroupTree
                  items={groupItems}
                  grouping={nextGroups}
                  depth={depth + 1}
                  collapsedGroups={collapsedGroups}
                  onToggleGroup={onToggleGroup}
                  selectedRapportoId={selectedRapportoId}
                  onSelect={onSelect}
                  lookupColorsByDomain={lookupColorsByDomain}
                />
              </div>
            ) : null}
          </div>
        )
      })}
    </>
  )
}
