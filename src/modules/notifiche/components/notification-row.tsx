import { CheckIcon } from "lucide-react"

import { getAuthorInitials, getAvatarColor } from "@/modules/commenti/lib/comment-display"
import { ENTITY_SECTION_META, ENTITY_TYPES } from "@/modules/commenti/lib/consts"
import { CommentSectionIcon, CommentBody } from "@/modules/commenti/components"
import type { EntityType } from "@/modules/commenti/types"
import { cn } from "@/lib/utils"

import { formatRelativeTime, notificaActionLabel } from "../lib/notifica-copy"
import type { Notifica } from "../types"

type NotificationRowProps = {
  notifica: Notifica
  onOpen: (notifica: Notifica) => void
  onResolve?: (notifica: Notifica) => void
  onReopen?: (notifica: Notifica) => void
}

function asEntityType(entityType: string): EntityType | null {
  return (ENTITY_TYPES as readonly string[]).includes(entityType)
    ? (entityType as EntityType)
    : null
}

function entityChipLabel(entityType: string): string {
  const typed = asEntityType(entityType)
  if (!typed) return entityType
  return ENTITY_SECTION_META[typed].typeLabel
}

export function NotificationRow({
  notifica,
  onOpen,
  onResolve,
  onReopen,
}: NotificationRowProps) {
  const isUnread = notifica.status === "non_letta"
  const isResolved = notifica.status === "risolta"
  const initials = getAuthorInitials(notifica.actor.name)
  const avatarColor = getAvatarColor(notifica.actor.name)

  return (
    <button
      type="button"
      data-testid="notifiche-row"
      data-status={notifica.status}
      onClick={() => onOpen(notifica)}
      className={cn(
        "group flex w-full gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors",
        isUnread ? "bg-[#F1F7FF]" : "bg-surface hover:bg-surface-muted/60",
        isResolved && "opacity-75",
      )}
    >
      <div className="relative shrink-0">
        <div
          className="flex size-9 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: avatarColor }}
        >
          {initials}
        </div>
        {isUnread ? (
          <span
            className="absolute -left-0.5 top-0 size-2 rounded-full bg-accent ring-2 ring-[#F1F7FF]"
            aria-hidden
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "text-[13.5px] leading-snug",
            isUnread ? "text-foreground-strong" : "text-foreground",
          )}
        >
          <span className="font-bold">{notifica.actor.name}</span>{" "}
          {notificaActionLabel(notifica.type)}
        </div>
        <CommentBody
          body={notifica.body}
          className={cn(
            "mt-0.5 line-clamp-2 text-[13px] leading-snug",
            isUnread ? "text-foreground" : "text-muted-foreground",
          )}
        />
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-surface-muted px-2 py-0.5 text-xs">
          <CommentSectionIcon
            entityType={asEntityType(notifica.entityType)}
            kind="focus"
          />
          <span className="font-semibold text-foreground">
            {entityChipLabel(notifica.entityType)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2 pl-1">
        <span className="whitespace-nowrap text-[11.5px] text-muted-foreground">
          {formatRelativeTime(notifica.createdAt)}
        </span>
        {isResolved ? (
          <span
            role="button"
            tabIndex={0}
            data-testid="notifiche-reopen"
            className="hidden items-center gap-1 text-xs font-medium text-muted-foreground group-hover:inline-flex"
            onClick={(event) => {
              event.stopPropagation()
              onReopen?.(notifica)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                event.stopPropagation()
                onReopen?.(notifica)
              }
            }}
          >
            Riapri
          </span>
        ) : (
          <span
            role="button"
            tabIndex={0}
            data-testid="notifiche-resolve"
            className="hidden items-center gap-1 text-xs font-medium text-accent group-hover:inline-flex"
            onClick={(event) => {
              event.stopPropagation()
              onResolve?.(notifica)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                event.stopPropagation()
                onResolve?.(notifica)
              }
            }}
          >
            <CheckIcon className="size-3.5" />
            Risolvi
          </span>
        )}
        {isResolved ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground group-hover:hidden">
            <CheckIcon className="size-3.5" />
            Risolta
          </span>
        ) : null}
      </div>
    </button>
  )
}
