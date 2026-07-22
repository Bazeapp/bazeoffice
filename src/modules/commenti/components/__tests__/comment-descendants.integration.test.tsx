import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/test-utils"

import { formatMentionMarkup } from "../../lib/mentions"
import type { Comment } from "../../types/comment"
import { CommentPanelBody } from "../comment-panel-body"
import { resolveCommentStack } from "../../lib/resolve-comment-stack"

const IDS = {
  lavoratore: "00000000-0000-0000-0000-00000000c001",
} as const

const CURRENT_USER_ID = "99999999-9999-4999-8999-999999999999"

const { mockFetchCommentSectionPage, mockFetchDescendantsCommentPage } = vi.hoisted(
  () => ({
    mockFetchCommentSectionPage: vi.fn(),
    mockFetchDescendantsCommentPage: vi.fn(),
  }),
)

vi.mock("../../queries/fetch-comment-count", () => ({
  fetchCommentCountForPage: vi.fn().mockResolvedValue(1),
}))

vi.mock("../../queries/fetch-section-comments", () => ({
  fetchCommentSectionPage: (...args: unknown[]) => mockFetchCommentSectionPage(...args),
}))

vi.mock("../../queries/fetch-descendants-comments", () => ({
  fetchDescendantsCommentPage: (...args: unknown[]) =>
    mockFetchDescendantsCommentPage(...args),
}))

vi.mock("../../queries/fetch-section-comment-count", () => ({
  fetchCommentSectionCount: vi.fn().mockResolvedValue(0),
}))

vi.mock("../../queries/fetch-descendants-comment-count", () => ({
  fetchDescendantsCommentCount: vi.fn().mockResolvedValue(1),
}))

vi.mock("../../mutations/create-comment", () => ({
  createComment: vi.fn(),
}))

vi.mock("../../mutations/reply-comment", () => ({
  replyComment: vi.fn(),
}))

vi.mock("../../mutations/edit-comment", () => ({
  editComment: vi.fn(),
}))

vi.mock("../../mutations/mark-comment-read", () => ({
  markCommentRead: vi.fn(),
}))

vi.mock("@/hooks/use-realtime-rows", () => ({
  useRealtimeRows: vi.fn(),
}))

vi.mock("@/hooks/use-operatori-options", () => ({
  useOperatoriOptions: () => ({
    options: [],
    loading: false,
    error: null,
  }),
}))

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: "comment-linked-1",
    threadRootId: null,
    anchor: { entityType: "famiglia", entityId: "00000000-0000-0000-0000-00000000f001" },
    author: {
      id: "author-1",
      name: "Mario Rossi",
      rolePill: "Recruiter",
      isDeactivated: false,
    },
    body: "good family!",
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

function renderGate1PanelBody() {
  const pageFocus = { entityType: "lavoratore" as const, entityId: IDS.lavoratore }
  const stack = resolveCommentStack({
    focus: pageFocus,
    row: { id: IDS.lavoratore, lavoratore_id: IDS.lavoratore },
    displayNames: {
      [`lavoratore:${IDS.lavoratore}`]: "Worker One",
    },
  })

  return renderWithProviders(
    <CommentPanelBody
      pageFocus={pageFocus}
      stack={stack}
      totalCount={1}
      panelOptions={{
        currentUserId: CURRENT_USER_ID,
        currentUserName: "Tu",
        sourceInterface: "gate_1",
        defaultCommentType: "phase_note",
        phaseLabel: "gate_1",
      }}
    />,
  )
}

describe("Comment descendants section", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchCommentSectionPage.mockResolvedValue({ comments: [], nextCursor: null })
    mockFetchDescendantsCommentPage.mockResolvedValue({
      comments: [makeComment()],
      nextCursor: null,
    })
  })

  it("loads linked-entity comments in the collegate section on Gate 1", async () => {
    renderGate1PanelBody()

    fireEvent.click(await screen.findByTestId("comments-section-toggle-descendants"))

    await screen.findByTestId("comments-section-descendants")
    expect(mockFetchDescendantsCommentPage).toHaveBeenCalledWith({
      pageEntityType: "lavoratore",
      pageEntityId: IDS.lavoratore,
      excludeAnchors: [{ entityType: "lavoratore", entityId: IDS.lavoratore }],
    })

    const section = await screen.findByTestId("comments-section-descendants")
    await waitFor(() => {
      expect(within(section).getByTestId("comments-root-comment-linked-1")).toBeInTheDocument()
    })
    expect(within(section).getByTestId("comments-origin-badge")).toHaveTextContent("famiglia")
  })

  it("shows unread mention highlight in collegate and scrolls the thread into view", async () => {
    const mentionBody = `Ciao ${formatMentionMarkup("Tu", CURRENT_USER_ID)} collegato`
    mockFetchDescendantsCommentPage.mockResolvedValue({
      comments: [
        makeComment({
          id: "comment-linked-unread",
          body: mentionBody,
          isUnread: true,
        }),
      ],
      nextCursor: null,
    })

    const scrollIntoView = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollIntoView

    renderGate1PanelBody()

    await waitFor(() => {
      const toggle = screen.getByTestId("comments-section-toggle-descendants")
      expect(
        toggle.querySelector(
          '[data-testid="comments-section-count"][data-mention-highlighted="true"]',
        ),
      ).toHaveTextContent("1")
    })

    fireEvent.click(screen.getByTestId("comments-section-toggle-descendants"))

    const section = await screen.findByTestId("comments-section-descendants")
    const thread = await within(section).findByTestId("comments-thread-comment-linked-unread")
    expect(within(thread).getByLabelText("Non letto")).toBeInTheDocument()
    expect(within(thread).getByTestId("comments-mention-highlight")).toHaveTextContent("@Tu")

    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalled()
    })
  })
})
