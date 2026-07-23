import { ANCESTOR_SECTION_ORDER } from "./consts"
import { parseMentionMarkup } from "./mentions"
import type { Comment } from "../types/comment"
import type { EntityRef, EntityType } from "../types/entity"

export function compareAncestorSections(a: EntityType, b: EntityType): number {
  const indexA = ANCESTOR_SECTION_ORDER.indexOf(a)
  const indexB = ANCESTOR_SECTION_ORDER.indexOf(b)
  const safeA = indexA === -1 ? ANCESTOR_SECTION_ORDER.length : indexA
  const safeB = indexB === -1 ? ANCESTOR_SECTION_ORDER.length : indexB
  return safeA - safeB
}

/**
 * Page entity passed to `commenti_list_section` / `commenti_count_for_section`.
 *
 * Those RPCs join `commenti_scope` on the page ref. Every comment has a depth-0
 * scope row for its own anchor, so listing a section with
 * `page === section` always returns that entity's threads.
 *
 * Using the panel's route page focus instead fails when the UI shows an
 * ancestor (e.g. RICERCA from Assunzioni `card.processId`) that is not linked
 * by FK for scope fanout (`rapporto.processi_matching_id` null). The create
 * succeeds, optimistic UI flashes, then refetch under page=rapporto returns
 * empty and the comment disappears.
 */
export function sectionListScopePage(sectionRef: EntityRef): EntityRef {
  return sectionRef
}

export function commentMentionsUser(
  comment: Comment,
  userId: string | null,
): boolean {
  if (!userId) return false
  const normalizedUserId = userId.toLowerCase()
  return parseMentionMarkup(comment.body).some(
    (part) =>
      part.type === "mention" && part.userId.toLowerCase() === normalizedUserId,
  )
}

export function commentIsUnreadMention(
  comment: Comment,
  userId: string | null,
): boolean {
  return comment.isUnread && commentMentionsUser(comment, userId)
}

export function sectionHasUnreadComments(comments: Comment[]): boolean {
  return comments.some(
    (comment) => comment.isUnread || comment.replies.some((reply) => reply.isUnread),
  )
}

export function sectionHasUnreadMentions(
  comments: Comment[],
  userId: string | null,
): boolean {
  return comments.some(
    (comment) =>
      commentIsUnreadMention(comment, userId) ||
      comment.replies.some((reply) => commentIsUnreadMention(reply, userId)),
  )
}
