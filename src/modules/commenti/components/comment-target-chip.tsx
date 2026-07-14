import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { ENTITY_SECTION_META } from "../lib/consts"
import { entityRefKey } from "../lib/entity-ref"
import type { CommentSection } from "../types/section"
import type { EntityRef } from "../types/entity"

type CommentTargetChipProps = {
  target: EntityRef
  options: EntityRef[]
  sections: CommentSection[]
  visibilityHint?: string | null
  composerFocused: boolean
  onTargetChange: (target: EntityRef) => void
}

function labelForTarget(target: EntityRef, sections: CommentSection[]): string {
  const section = sections.find(
    (item) =>
      item.entityRef !== null &&
      entityRefKey(item.entityRef) === entityRefKey(target),
  )
  if (section) {
    return `${section.icon} ${section.typeLabel} · ${section.displayName}`
  }
  const meta = ENTITY_SECTION_META[target.entityType]
  return `${meta.icon} ${meta.typeLabel}`
}

export function CommentTargetChip({
  target,
  options,
  sections,
  visibilityHint,
  composerFocused,
  onTargetChange,
}: CommentTargetChipProps) {
  return (
    <div className="space-y-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="comments-target-chip"
            className="h-8 max-w-full justify-between gap-2 px-2.5 font-normal"
          >
            <span className="truncate">{labelForTarget(target, sections)}</span>
            <ChevronDownIcon className="size-3.5 shrink-0 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-w-[22rem]">
          {options.map((option) => (
            <DropdownMenuItem
              key={entityRefKey(option)}
              data-testid={`comments-target-option-${option.entityType}`}
              onSelect={() => onTargetChange(option)}
            >
              {labelForTarget(option, sections)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {composerFocused && visibilityHint ? (
        <p
          className="text-xs text-muted-foreground"
          data-testid="comments-visibility-hint"
        >
          ↗ Visibile anche su {visibilityHint}
        </p>
      ) : null}
    </div>
  )
}
