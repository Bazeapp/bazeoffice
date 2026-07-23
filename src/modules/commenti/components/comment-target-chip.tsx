import { CheckIcon, ChevronDownIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { getSectionSubtitle } from "../lib/comment-display"
import { ENTITY_SECTION_META } from "../lib/consts"
import { entityRefKey } from "../lib/entity-ref"
import { useCommentPanelPortalContainer } from "../hooks/use-comment-panel-portal-container"
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
      subtitle: getSectionSubtitle(section.displayName, section.typeLabel),
    }
  }
  const meta = ENTITY_SECTION_META[target.entityType]
  return { icon: meta.icon, typeLabel: meta.typeLabel, subtitle: null }
}

export function CommentTargetChip({
  target,
  options,
  sections,
  onTargetChange,
}: CommentTargetChipProps) {
  const activeMeta = metaForTarget(target, sections)
  const portalContainer = useCommentPanelPortalContainer()

  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-2xs text-foreground-faint">Commenti su</span>
      {/* Non-modal + z-110 + panel portal: sheet scroll-lock sets body
          pointer-events:none; menu must stay inside the dismissable branch. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            data-testid="comments-target-chip"
            className={cn(
              "flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-3 py-2",
              "border-2 border-accent bg-accent-soft text-sm font-semibold text-accent-ink",
            )}
          >
            <span aria-hidden className="text-sm leading-none">
              {activeMeta.icon}
            </span>
            <span className="min-w-0 flex-1 truncate text-left">
              {activeMeta.typeLabel}
              {activeMeta.subtitle ? ` · ${activeMeta.subtitle}` : null}
            </span>
            <ChevronDownIcon className="size-3.5 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          className="pointer-events-auto z-110 w-90 max-w-[calc(100vw-3rem)]"
          container={portalContainer}
        >
          {options.map((option) => {
            const meta = metaForTarget(option, sections)
            const isActive = entityRefKey(option) === entityRefKey(target)
            return (
              <DropdownMenuItem
                key={entityRefKey(option)}
                data-testid={`comments-target-option-${option.entityType}`}
                className={cn(isActive ? "bg-accent-soft" : null)}
                onSelect={() => onTargetChange(option)}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden className="w-4.5 shrink-0 text-center">
                    {meta.icon}
                  </span>
                  <span className="shrink-0 text-sm font-semibold">
                    {meta.typeLabel}
                  </span>
                  {meta.subtitle ? (
                    <span className="truncate text-2xs text-foreground-faint">
                      {meta.subtitle}
                    </span>
                  ) : null}
                  {isActive ? (
                    <CheckIcon className="ml-auto size-3.5 shrink-0 text-accent" />
                  ) : null}
                </span>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
