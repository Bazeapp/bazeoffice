import { describe, expect, it } from "vitest"

import type { Comment } from "../../types/comment"
import { sectionHasUnreadComments } from "../section-unread"

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "comment-1",
    threadRootId: null,
    anchor: { entityType: "lavoratore", entityId: "lavoratore-1" },
    author: {
      id: "author-1",
      name: "Mario Rossi",
      rolePill: "Recruiter",
      isDeactivated: false,
    },
    body: "Ciao",
    commentType: "free",
    phaseLabel: null,
    sourceInterface: null,
    createdAt: "2026-07-14T08:00:00.000Z",
    editedAt: null,
    isUnread: false,
    replyCount: 0,
    replies: [],
    ...overrides,
  }
}

describe("sectionHasUnreadComments", () => {
  it("returns false when every comment and reply is read", () => {
    expect(
      sectionHasUnreadComments([
        makeComment(),
        makeComment({
          id: "comment-2",
          replies: [makeComment({ id: "reply-1", threadRootId: "comment-2" })],
        }),
      ]),
    ).toBe(false)
  })

  it("returns true when a root comment is unread", () => {
    expect(sectionHasUnreadComments([makeComment({ isUnread: true })])).toBe(true)
  })

  it("returns true when a reply is unread", () => {
    expect(
      sectionHasUnreadComments([
        makeComment({
          replies: [
            makeComment({
              id: "reply-1",
              threadRootId: "comment-1",
              isUnread: true,
            }),
          ],
        }),
      ]),
    ).toBe(true)
  })
})
