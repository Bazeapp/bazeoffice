import { describe, expect, it } from "vitest"

import { shouldMarkCommentRead } from "../comment-panel-utils"
import type { Comment } from "../../types/comment"

const baseComment: Comment = {
  id: "comment-1",
  threadRootId: null,
  anchor: { entityType: "ricerca", entityId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" },
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
  isUnread: true,
  replyCount: 0,
  replies: [],
}

describe("comment-panel-utils", () => {
  it("skips mark-read for the current author", () => {
    expect(shouldMarkCommentRead(baseComment, "author-1")).toBe(false)
    expect(shouldMarkCommentRead(baseComment, "other-user")).toBe(true)
    expect(shouldMarkCommentRead({ ...baseComment, isUnread: false }, "other-user")).toBe(
      false,
    )
  })
})
