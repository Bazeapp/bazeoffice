import { describe, expect, it } from "vitest"

import type { Comment } from "../../types/comment"
import {
  commentIsUnreadMention,
  commentMentionsUser,
  sectionHasUnreadComments,
  sectionHasUnreadMentions,
  sectionListScopePage,
} from "../comments-section"
import { formatMentionMarkup } from "../mentions"

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

describe("sectionListScopePage", () => {
  it("uses the section entity as the list/count scope page", () => {
    const section = {
      entityType: "ricerca" as const,
      entityId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    }
    expect(sectionListScopePage(section)).toEqual(section)
  })
})

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

const MENTIONED_USER_ID = "99999999-9999-4999-8999-999999999999"

describe("commentMentionsUser", () => {
  it("returns true when the body mentions the given user", () => {
    expect(
      commentMentionsUser(
        makeComment({
          body: `Ciao ${formatMentionMarkup("Tu", MENTIONED_USER_ID)}`,
        }),
        MENTIONED_USER_ID,
      ),
    ).toBe(true)
  })

  it("returns false for unread comments that mention someone else", () => {
    expect(
      commentMentionsUser(
        makeComment({
          body: `Ciao ${formatMentionMarkup("Altro", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")}`,
        }),
        MENTIONED_USER_ID,
      ),
    ).toBe(false)
  })

  it("matches mention ids case-insensitively", () => {
    expect(
      commentMentionsUser(
        makeComment({
          body: `Ciao ${formatMentionMarkup("Tu", MENTIONED_USER_ID.toUpperCase())}`,
        }),
        MENTIONED_USER_ID.toLowerCase(),
      ),
    ).toBe(true)
  })
})

describe("commentIsUnreadMention", () => {
  it("requires both unread state and a mention of the user", () => {
    const body = `Ciao ${formatMentionMarkup("Tu", MENTIONED_USER_ID)}`
    expect(
      commentIsUnreadMention(
        makeComment({ body, isUnread: true }),
        MENTIONED_USER_ID,
      ),
    ).toBe(true)
    expect(
      commentIsUnreadMention(
        makeComment({ body, isUnread: false }),
        MENTIONED_USER_ID,
      ),
    ).toBe(false)
  })
})

describe("sectionHasUnreadMentions", () => {
  it("returns true when an unread reply mentions the user", () => {
    const body = `Ciao ${formatMentionMarkup("Tu", MENTIONED_USER_ID)}`
    expect(
      sectionHasUnreadMentions(
        [
          makeComment({
            replies: [
              makeComment({
                id: "reply-1",
                threadRootId: "comment-1",
                body,
                isUnread: true,
              }),
            ],
          }),
        ],
        MENTIONED_USER_ID,
      ),
    ).toBe(true)
  })

  it("returns false when mentions are already read", () => {
    const body = `Ciao ${formatMentionMarkup("Tu", MENTIONED_USER_ID)}`
    expect(
      sectionHasUnreadMentions(
        [makeComment({ body, isUnread: false })],
        MENTIONED_USER_ID,
      ),
    ).toBe(false)
  })
})
