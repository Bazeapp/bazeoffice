import { waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderHookWithQueryClient } from "@/test/test-utils"

import type { Comment } from "../../types/comment"
import { useCommentPanel } from "../use-comment-panel"

const PAGE_FOCUS = {
  entityType: "ricerca" as const,
  entityId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
}

const SECTION_REF = {
  entityType: "ricerca" as const,
  entityId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
}

const TARGET_REF = {
  entityType: "famiglia" as const,
  entityId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
}

const CURRENT_USER_ID = "99999999-9999-4999-8999-999999999999"

const BASE_PANEL_OPTIONS = {
  watchedEntityRefs: [PAGE_FOCUS, TARGET_REF],
  activeSectionKind: "focus" as const,
  activeSectionRef: SECTION_REF,
  excludeAnchors: [PAGE_FOCUS],
  targetEntityRef: TARGET_REF,
  currentUserId: CURRENT_USER_ID,
}

const {
  mockFetchCommentCountForPage,
  mockFetchCommentSectionPage,
  mockCreateComment,
  mockReplyComment,
  mockMarkCommentRead,
  mockUseRealtimeRows,
} = vi.hoisted(() => ({
  mockFetchCommentCountForPage: vi.fn(),
  mockFetchCommentSectionPage: vi.fn(),
  mockCreateComment: vi.fn(),
  mockReplyComment: vi.fn(),
  mockMarkCommentRead: vi.fn(),
  mockUseRealtimeRows: vi.fn(),
}))

vi.mock("../../queries/fetch-comment-count", () => ({
  fetchCommentCountForPage: (...args: unknown[]) => mockFetchCommentCountForPage(...args),
}))

vi.mock("../../queries/fetch-section-comments", () => ({
  fetchCommentSectionPage: (...args: unknown[]) => mockFetchCommentSectionPage(...args),
}))

vi.mock("../../mutations/create-comment", () => ({
  createComment: (...args: unknown[]) => mockCreateComment(...args),
}))

vi.mock("../../mutations/reply-comment", () => ({
  replyComment: (...args: unknown[]) => mockReplyComment(...args),
}))

vi.mock("../../mutations/mark-comment-read", () => ({
  markCommentRead: (...args: unknown[]) => mockMarkCommentRead(...args),
}))

vi.mock("../../mutations/edit-comment", () => ({
  editComment: vi.fn(),
}))

vi.mock("@/hooks/use-realtime-rows", () => ({
  useRealtimeRows: (...args: unknown[]) => mockUseRealtimeRows(...args),
}))

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "comment-1",
    threadRootId: null,
    anchor: TARGET_REF,
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
    ...overrides,
  }
}

describe("useCommentPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchCommentCountForPage.mockResolvedValue(3)
    mockFetchCommentSectionPage.mockResolvedValue({
      comments: [makeComment()],
      nextCursor: null,
    })
    mockCreateComment.mockResolvedValue(makeComment({ id: "server-comment" }))
    mockReplyComment.mockResolvedValue(
      makeComment({
        id: "server-reply",
        threadRootId: "comment-1",
      }),
    )
    mockMarkCommentRead.mockResolvedValue(undefined)
    mockUseRealtimeRows.mockImplementation(() => undefined)
  })

  it("fetches count when page focus is set and defers section fetch until expanded", async () => {
    const collapsed = renderHookWithQueryClient(() =>
      useCommentPanel({
        pageFocus: PAGE_FOCUS,
        watchedEntityRefs: [PAGE_FOCUS],
        expanded: false,
        activeSectionKind: null,
        activeSectionRef: null,
        excludeAnchors: [],
        targetEntityRef: TARGET_REF,
        currentUserId: CURRENT_USER_ID,
      }),
    )

    await waitFor(() => {
      expect(collapsed.result.current.count).toBe(3)
    })

    expect(mockFetchCommentCountForPage).toHaveBeenCalledWith(
      PAGE_FOCUS.entityType,
      PAGE_FOCUS.entityId,
    )
    expect(mockFetchCommentSectionPage).not.toHaveBeenCalled()

    const expanded = renderHookWithQueryClient(() =>
      useCommentPanel({
        pageFocus: PAGE_FOCUS,
        expanded: true,
        ...BASE_PANEL_OPTIONS,
      }),
    )

    await waitFor(() => {
      expect(expanded.result.current.sectionComments).toHaveLength(1)
    })

    expect(mockFetchCommentSectionPage).toHaveBeenCalledWith({
      pageEntityType: PAGE_FOCUS.entityType,
      pageEntityId: PAGE_FOCUS.entityId,
      sectionEntityType: SECTION_REF.entityType,
      sectionEntityId: SECTION_REF.entityId,
    })
  })

  it("rolls back optimistic create when the RPC fails", async () => {
    mockCreateComment.mockRejectedValueOnce(new Error("rpc failed"))

    const { result, queryClient } = renderHookWithQueryClient(() =>
      useCommentPanel({
        pageFocus: PAGE_FOCUS,
        expanded: true,
        ...BASE_PANEL_OPTIONS,
        activeSectionRef: TARGET_REF,
        targetEntityRef: TARGET_REF,
      }),
    )

    await waitFor(() => {
      expect(result.current.sectionComments).toHaveLength(1)
    })

    const sectionKey = [
      "commenti",
      PAGE_FOCUS.entityType,
      PAGE_FOCUS.entityId,
      "section",
      TARGET_REF.entityType,
      TARGET_REF.entityId,
      null,
    ] as const

    await expect(result.current.submitComment("Bozza ottimistica")).rejects.toThrow(
      "rpc failed",
    )

    await waitFor(() => {
      const cached = queryClient.getQueryData<{ comments: Comment[] }>(sectionKey)
      expect(cached?.comments).toHaveLength(1)
      expect(cached?.comments[0]?.body).toBe("Ciao")
    })
  })

  it("sends replies against the root thread id", async () => {
    const { result } = renderHookWithQueryClient(() =>
      useCommentPanel({
        pageFocus: PAGE_FOCUS,
        expanded: true,
        ...BASE_PANEL_OPTIONS,
      }),
    )

    await waitFor(() => {
      expect(result.current.sectionComments).toHaveLength(1)
    })

    await result.current.submitReply("comment-1", "Risposta")

    expect(mockReplyComment).toHaveBeenCalledWith({
      pageEntityType: PAGE_FOCUS.entityType,
      pageEntityId: PAGE_FOCUS.entityId,
      threadRootId: "comment-1",
      body: "Risposta",
      sourceInterface: null,
    })
  })

  it("passes centro_notifiche source interface on reply when panel session came from NC", async () => {
    const { result } = renderHookWithQueryClient(() =>
      useCommentPanel({
        pageFocus: PAGE_FOCUS,
        expanded: true,
        ...BASE_PANEL_OPTIONS,
        sourceInterface: "centro_notifiche",
      }),
    )

    await waitFor(() => {
      expect(result.current.sectionComments).toHaveLength(1)
    })

    await result.current.submitReply("comment-1", "Risposta da NC")

    expect(mockReplyComment).toHaveBeenCalledWith({
      pageEntityType: PAGE_FOCUS.entityType,
      pageEntityId: PAGE_FOCUS.entityId,
      threadRootId: "comment-1",
      body: "Risposta da NC",
      sourceInterface: "centro_notifiche",
    })
  })

  it("invalidates notifiche queries after a successful reply", async () => {
    const { result, queryClient } = renderHookWithQueryClient(() =>
      useCommentPanel({
        pageFocus: PAGE_FOCUS,
        expanded: true,
        ...BASE_PANEL_OPTIONS,
      }),
    )

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    await waitFor(() => {
      expect(result.current.sectionComments).toHaveLength(1)
    })

    await result.current.submitReply("comment-1", "Risposta")

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["notifiche"] }),
    )
  })

  it("does not mark the current user's own comments as read", async () => {
    mockFetchCommentSectionPage.mockResolvedValue({
      comments: [
        makeComment({
          author: {
            id: CURRENT_USER_ID,
            name: "Tu",
            rolePill: "Recruiter",
            isDeactivated: false,
          },
          isUnread: true,
        }),
      ],
      nextCursor: null,
    })

    const { result } = renderHookWithQueryClient(() =>
      useCommentPanel({
        pageFocus: PAGE_FOCUS,
        expanded: true,
        ...BASE_PANEL_OPTIONS,
      }),
    )

    await waitFor(() => {
      expect(result.current.sectionComments).toHaveLength(1)
    })

    result.current.markReadIfNeeded(result.current.sectionComments[0]!)

    expect(mockMarkCommentRead).not.toHaveBeenCalled()
  })
})
