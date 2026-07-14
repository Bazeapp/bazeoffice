import * as React from "react"
import { CornerUpLeftIcon, MoreHorizontalIcon } from "lucide-react"

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
  getAvatarColor,
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

function CommentAvatar({ name, isReply }: { name: string; isReply?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold text-white",
        isReply ? "size-5.5 text-[9px]" : "size-6.5 text-[10.5px]",
      )}
      style={{ backgroundColor: getAvatarColor(name) }}
    >
      {getAuthorInitials(name)}
    </span>
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
            ? "mx-4 my-2 rounded-[10px] border border-[#BFDBFE] bg-[#EFF6FF] px-3.5 py-3"
            : "px-4 py-3",
        comment.isOptimistic ? "opacity-60" : null,
      )}
    >
      {isPhaseNote && comment.phaseLabel ? (
        <span
          data-testid="comments-phase-badge"
          className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-[#DBEAFE] px-2 py-0.5 text-[10.5px] font-bold tracking-[0.03em] text-[#1D4ED8]"
        >
          📋 {getPhaseLabelText(comment.phaseLabel)}
        </span>
      ) : null}

      <div className="flex items-center gap-2">
        <CommentAvatar name={comment.author.name} isReply={isReply} />
        <span
          className={cn(
            "font-semibold",
            isReply ? "text-[12.5px]" : "text-[13px]",
            comment.author.isDeactivated ? "text-[#9ca3af]" : "text-[#1a1f2e]",
          )}
        >
          {comment.author.name}
        </span>
        <span
          className={cn(
            "rounded-[5px] bg-[#f1f3f5] px-1.5 py-px font-medium text-[#6b7280]",
            isReply ? "text-[10px]" : "text-[10.5px]",
          )}
        >
          {comment.author.rolePill}
        </span>
        <span className="text-[11px] whitespace-nowrap text-[#9ca3af]">
          {formatCommentTimestamp(comment.createdAt)}
        </span>
        {comment.isUnread ? (
          <span
            aria-label="Non letto"
            className="size-1.5 shrink-0 rounded-full bg-[#2563EB]"
          />
        ) : null}
        {comment.editedAt ? (
          <span className="text-[11px] whitespace-nowrap text-[#b6bcc6]">
            · modificato
          </span>
        ) : null}
        <span className="flex-1" />
        {isAuthor && !isEditing ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-6 text-[#c4c9d2] hover:text-[#6b7280]"
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

      {!isReply && comment.sourceInterface ? (
        <span
          data-testid="comments-source-badge"
          className="mt-1.5 ml-8.5 inline-flex items-center gap-1 rounded-[5px] bg-[#f1f3f5] px-1.5 py-px text-[10.5px] font-medium text-[#6b7280]"
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
          className="mt-1.5 ml-8.5 text-[10.5px] font-semibold text-[#6b7280]"
        >
          ↗ {comment.anchor.entityType}
        </p>
      ) : null}

      {!isReply && !isEditing ? (
        <div className="mt-2 ml-8.5">
          <button
            type="button"
            data-testid={`comments-reply-${comment.id}`}
            className="inline-flex cursor-pointer items-center gap-1 text-xs text-[#6b7280] transition-colors hover:text-[#2563EB]"
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
        <div className="mr-4 mb-3 ml-12.5 flex flex-col gap-3 border-l-2 border-[#e7e9ee] pl-3.5">
          {hiddenReplyCount > 0 && !showAllReplies ? (
            <button
              type="button"
              data-testid={`comments-show-replies-${comment.id}`}
              className="self-start text-xs font-semibold text-[#2563EB] hover:underline"
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
