import * as React from "react"
import { MoreHorizontalIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
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

  React.useEffect(() => {
    if (!onMarkRead || !comment.isUnread) return
    const node = ref.current
    if (!node) return

    let timer: ReturnType<typeof setTimeout> | null = null
    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting)
        if (!isVisible) {
          if (timer) clearTimeout(timer)
          timer = null
          return
        }
        if (timer) return
        timer = setTimeout(() => {
          onMarkRead(comment)
        }, MARK_READ_DELAY_MS)
      },
      { threshold: 0.6 },
    )

    observer.observe(node)
    return () => {
      observer.disconnect()
      if (timer) clearTimeout(timer)
    }
  }, [comment, onMarkRead])

  return ref
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
        "rounded-lg border border-border px-3 py-2.5",
        isReply ? "ml-4" : null,
        isPhaseNote ? "border-blue-200 bg-[#EFF6FF]" : "bg-surface",
        comment.isOptimistic ? "opacity-60" : null,
      )}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "text-sm font-semibold",
                comment.author.isDeactivated ? "text-muted-foreground" : null,
              )}
            >
              {comment.author.name}
            </span>
            <Badge variant="secondary" size="sm">
              {comment.author.rolePill}
            </Badge>
            {isPhaseNote && comment.phaseLabel ? (
              <Badge variant="info" size="sm" data-testid="comments-phase-badge">
                {getPhaseLabelText(comment.phaseLabel)}
              </Badge>
            ) : null}
            {!isReply && comment.sourceInterface ? (
              <Badge variant="outline" size="sm" data-testid="comments-source-badge">
                {getSourceInterfaceLabel(comment.sourceInterface)}
              </Badge>
            ) : null}
            {showOriginBadge && !isReply ? (
              <Badge variant="outline" size="sm" data-testid="comments-origin-badge">
                {comment.anchor.entityType}
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatCommentTimestamp(comment.createdAt)}
            {comment.editedAt ? " · modificato" : null}
          </p>
        </div>
        {isAuthor && !isEditing ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                data-testid={`comments-menu-${comment.id}`}
                aria-label="Azioni commento"
              >
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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

      {!isReply && !isEditing ? (
        <div className="mt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            data-testid={`comments-reply-${comment.id}`}
            onClick={() => onReply(comment.id)}
          >
            Rispondi
          </Button>
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
    <div className="space-y-2" data-testid={`comments-root-${comment.id}`}>
      <CommentBubble
        comment={comment}
        currentUserId={currentUserId}
        showOriginBadge={showOriginBadge}
        onReply={onReply}
        onEdit={onEdit}
        onMarkRead={onMarkRead}
      />
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
      {hiddenReplyCount > 0 && !showAllReplies ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-4 h-7 px-2 text-xs"
          data-testid={`comments-show-replies-${comment.id}`}
          onClick={() => setShowAllReplies(true)}
        >
          Mostra altre {hiddenReplyCount} risposte
        </Button>
      ) : null}
    </div>
  )
}
