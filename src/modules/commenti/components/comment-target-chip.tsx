import { CheckIcon, ChevronDownIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { ENTITY_SECTION_META } from "../lib/consts"
import { entityRefKey } from "../lib/entity-ref"
import type { CommentSection } from "../types/section"
import type { EntityRef } from "../types/entity"

type CommentTargetChipProps = {
  target: EntityRef
  options: EntityRef[]
  sections: CommentSection[]
  onTargetChange: (target: EntityRef) => void
}

function metaForTarget(target: EntityRef, sections: CommentSection[]) {
  const section = sections.find(
    (item) =>
      item.entityRef !== null &&
      entityRefKey(item.entityRef) === entityRefKey(target),
  )
  if (section) {
    return {
      icon: section.icon,
      typeLabel: section.typeLabel,
      displayName: section.displayName,
    }
  }
  const meta = ENTITY_SECTION_META[target.entityType]
  return { icon: meta.icon, typeLabel: meta.typeLabel, displayName: "" }
}

export function CommentTargetChip({
  target,
  options,
  sections,
  onTargetChange,
}: CommentTargetChipProps) {
  const activeMeta = metaForTarget(target, sections)

  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-[11.5px] text-[#9ca3af]">Commenti su</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-testid="comments-target-chip"
            className={cn(
              "flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-[9px] px-3 py-2",
              "border-[1.5px] border-[#2563EB] bg-[#EFF6FF] text-[13px] font-semibold text-[#1D4ED8]",
            )}
          >
            <span aria-hidden className="text-[13px] leading-none">
              {activeMeta.icon}
            </span>
            <span className="min-w-0 flex-1 truncate text-left">
              {activeMeta.typeLabel}
              {activeMeta.displayName ? ` · ${activeMeta.displayName}` : null}
            </span>
            <ChevronDownIcon className="size-3.5 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-90 max-w-[calc(100vw-3rem)]">
          {options.map((option) => {
            const meta = metaForTarget(option, sections)
            const isActive = entityRefKey(option) === entityRefKey(target)
            return (
              <DropdownMenuItem
                key={entityRefKey(option)}
                data-testid={`comments-target-option-${option.entityType}`}
                className={cn("gap-2", isActive ? "bg-[#EFF6FF]" : null)}
                onSelect={() => onTargetChange(option)}
              >
                <span aria-hidden className="w-4.5 shrink-0 text-center">
                  {meta.icon}
                </span>
                <span className="shrink-0 text-[13px] font-semibold">
                  {meta.typeLabel}
                </span>
                <span className="truncate text-[11.5px] text-[#9ca3af]">
                  {meta.displayName}
                </span>
                {isActive ? (
                  <CheckIcon className="ml-auto size-3.5 shrink-0 text-[#2563EB]" />
                ) : null}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
