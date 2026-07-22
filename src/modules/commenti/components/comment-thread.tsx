import * as React from "react"
import { CornerUpLeftIcon, MoreHorizontalIcon } from "lucide-react"

import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import {
  formatCommentTimestamp,
  getAuthorInitials,
  getPhaseLabelText,
  getSourceInterfaceLabel,
} from "../lib/comment-display"
import type { Comment } from "../types/comment"
import { CommentBody } from "./comment-body"

const VISIBLE_REPLY_LIMIT = 3
const MARK_READ_DELAY_MS = 1000

type CommentThreadProps = {
  comment: Comment
  currentUserId: string | null
  showOriginBadge?: boolean
  onReply: (rootId: string) => void
  onEdit: (commentId: string, body: string) => Promise<void> | void
  onMarkRead?: (comment: Comment) => void
}

function useMarkReadOnView(
  comment: Comment,
  onMarkRead?: (comment: Comment) => void,
) {
  const ref = React.useRef<HTMLDivElement>(null)
  const hasMarkRead = onMarkRead != null
  const markReadIfNeeded = React.useEffectEvent(() => {
    onMarkRead?.(comment)
  })

  React.useEffect(() => {
    if (!hasMarkRead || !comment.isUnread) return
    const node = ref.current
    if (!node) return

    let timer: ReturnType<typeof setTimeout> | null = null
    const schedule = () => {
      if (timer) return
      timer = setTimeout(() => {
        markReadIfNeeded()
      }, MARK_READ_DELAY_MS)
    }
    const cancel = () => {
      if (timer) clearTimeout(timer)
      timer = null
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting)
        if (isVisible) schedule()
        else cancel()
      },
      // Any visible pixel counts — 0.6 was too strict inside the panel scroller
      // and never settled under Playwright / frequent layout scrolls.
      { threshold: 0 },
    )

    observer.observe(node)
    return () => {
      observer.disconnect()
      cancel()
    }
  }, [comment.id, comment.isUnread, hasMarkRead])

  return ref
}

function CommentAvatar({ name, isReply }: { name: string; isReply?: boolean }) {
  return (
    <Avatar
      aria-hidden
      size={isReply ? "xs" : "sm"}
      fallback={getAuthorInitials(name)}
    />
  )
}

function CommentBubble({
  comment,
  currentUserId,
  isReply = false,
  showOriginBadge = false,
  onReply,
  onEdit,
  onMarkRead,
}: CommentThreadProps & { isReply?: boolean }) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editDraft, setEditDraft] = React.useState(comment.body)
  const viewRef = useMarkReadOnView(comment, onMarkRead)
  const isAuthor = currentUserId === comment.author.id
  const isPhaseNote = comment.commentType === "phase_note"

  const handleSaveEdit = async () => {
    const body = editDraft.trim()
    if (!body) return
    await onEdit(comment.id, body)
    setIsEditing(false)
  }

  return (
    <div
      ref={viewRef}
      data-testid={`comments-thread-${comment.id}`}
      className={cn(
        isReply
          ? null
          : isPhaseNote
            ? "mx-4 my-2 rounded-lg border border-accent-muted bg-accent-soft px-3.5 py-3"
            : "px-4 py-3",
        comment.isOptimistic ? "opacity-60" : null,
      )}
    >
      {isPhaseNote && comment.phaseLabel ? (
        <span
          data-testid="comments-phase-badge"
          className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-accent-muted px-2 py-0.5 text-2xs font-bold tracking-snug text-accent-ink"
        >
          📋 {getPhaseLabelText(comment.phaseLabel)}
        </span>
      ) : null}

      <div className="flex items-center gap-2">
        <CommentAvatar name={comment.author.name} isReply={isReply} />
        <span
          className={cn(
            "font-semibold",
            isReply ? "text-xs" : "text-sm",
            comment.author.isDeactivated ? "text-foreground-faint" : "text-foreground-strong",
          )}
        >
          {comment.author.name}
        </span>
        <span
          className={cn(
            "rounded-sm bg-surface-muted px-1.5 py-px text-2xs font-medium text-foreground-subtle",
          )}
        >
          {comment.author.rolePill}
        </span>
        <span className="text-2xs whitespace-nowrap text-foreground-faint">
          {formatCommentTimestamp(comment.createdAt)}
        </span>
        {comment.isUnread ? (
          <span
            aria-label="Non letto"
            className="size-1.5 shrink-0 rounded-full bg-accent"
          />
        ) : null}
        {comment.editedAt ? (
          <span className="text-2xs whitespace-nowrap text-foreground-faint">
            · modificato
          </span>
        ) : null}
        <span className="flex-1" />
        {isAuthor && !isEditing ? (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-6 text-foreground-faint hover:text-foreground-subtle"
                data-testid={`comments-menu-${comment.id}`}
                aria-label="Azioni commento"
              >
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-110">
              <DropdownMenuItem
                data-testid={`comments-edit-${comment.id}`}
                onSelect={() => {
                  setEditDraft(comment.body)
                  setIsEditing(true)
                }}
              >
                Modifica
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {!isReply && comment.sourceInterface ? (
        <span
          data-testid="comments-source-badge"
          className="mt-1.5 ml-8.5 inline-flex items-center gap-1 rounded-sm bg-surface-muted px-1.5 py-px text-2xs font-medium text-foreground-subtle"
        >
          ⧉ {getSourceInterfaceLabel(comment.sourceInterface)}
        </span>
      ) : null}

      <div className={cn("mt-1.5", isReply ? "ml-7.5" : "ml-8.5")}>
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              data-testid={`comments-edit-input-${comment.id}`}
              value={editDraft}
              rows={3}
              onChange={(event) => setEditDraft(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Annulla
              </Button>
              <Button
                type="button"
                size="sm"
                data-testid={`comments-edit-save-${comment.id}`}
                onClick={() => void handleSaveEdit()}
              >
                Salva
              </Button>
            </div>
          </div>
        ) : (
          <CommentBody body={comment.body} />
        )}
      </div>

      {showOriginBadge && !isReply ? (
        <p
          data-testid="comments-origin-badge"
          className="mt-1.5 ml-8.5 text-2xs font-semibold text-foreground-subtle"
        >
          ↗ {comment.anchor.entityType}
        </p>
      ) : null}

      {!isReply && !isEditing ? (
        <div className="mt-2 ml-8.5">
          <button
            type="button"
            data-testid={`comments-reply-${comment.id}`}
            className="inline-flex cursor-pointer items-center gap-1 text-xs text-foreground-subtle transition-colors hover:text-accent"
            onClick={() => onReply(comment.id)}
          >
            <CornerUpLeftIcon aria-hidden className="size-3" /> Rispondi
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function CommentThread({
  comment,
  currentUserId,
  showOriginBadge = false,
  onReply,
  onEdit,
  onMarkRead,
}: CommentThreadProps) {
  const [showAllReplies, setShowAllReplies] = React.useState(false)
  const hiddenReplyCount = Math.max(comment.replies.length - VISIBLE_REPLY_LIMIT, 0)
  const visibleReplies =
    showAllReplies || hiddenReplyCount === 0
      ? comment.replies
      : comment.replies.slice(-VISIBLE_REPLY_LIMIT)

  return (
    <div data-testid={`comments-root-${comment.id}`}>
      <CommentBubble
        comment={comment}
        currentUserId={currentUserId}
        showOriginBadge={showOriginBadge}
        onReply={onReply}
        onEdit={onEdit}
        onMarkRead={onMarkRead}
      />
      {comment.replies.length > 0 ? (
        <div className="mr-4 mb-3 ml-12.5 flex flex-col gap-3 border-l-2 border-border pl-3.5">
          {hiddenReplyCount > 0 && !showAllReplies ? (
            <button
              type="button"
              data-testid={`comments-show-replies-${comment.id}`}
              className="self-start text-xs font-semibold text-accent hover:underline"
              onClick={() => setShowAllReplies(true)}
            >
              Mostra altre {hiddenReplyCount} risposte
            </button>
          ) : null}
          {visibleReplies.map((reply) => (
            <CommentBubble
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              isReply
              onReply={onReply}
              onEdit={onEdit}
              onMarkRead={onMarkRead}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
