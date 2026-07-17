import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/test-utils"

import type { Comment } from "../../types/comment"
import { formatMentionMarkup } from "../../lib/mention-markup"
import { CommentPanelBody } from "../comment-panel-body"
import { resolveCommentStack } from "../../lib/resolve-comment-stack"

const IDS = {
  famiglia: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  lavoratore: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  ricerca: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  candidatura: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
} as const

const { mockFetchCommentSectionPage } = vi.hoisted(() => ({
  mockFetchCommentSectionPage: vi.fn(),
}))

vi.mock("../../queries/fetch-comment-count", () => ({
  fetchCommentCountForPage: vi.fn().mockResolvedValue(2),
}))

vi.mock("../../queries/fetch-section-comments", () => ({
  fetchCommentSectionPage: (...args: unknown[]) => mockFetchCommentSectionPage(...args),
}))

vi.mock("../../queries/fetch-section-comment-count", () => ({
  fetchCommentSectionCount: vi.fn().mockResolvedValue(1),
}))

vi.mock("../../queries/fetch-descendants-comment-count", () => ({
  fetchDescendantsCommentCount: vi.fn().mockResolvedValue(0),
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
    id: "comment-1",
    threadRootId: null,
    anchor: { entityType: "ricerca", entityId: IDS.ricerca },
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

function renderPanelBody() {
  const pageFocus = { entityType: "candidatura" as const, entityId: IDS.candidatura }
  const stack = resolveCommentStack({
    focus: pageFocus,
    row: {
      id: IDS.candidatura,
      lavoratore_id: IDS.lavoratore,
      processi_matching_id: IDS.ricerca,
      famiglia_id: IDS.famiglia,
    },
    displayNames: {
      [`lavoratore:${IDS.lavoratore}`]: "Luigi Bianchi",
      [`ricerca:${IDS.ricerca}`]: "Ricerca badante Milano",
      [`famiglia:${IDS.famiglia}`]: "Famiglia Rossi",
      [`candidatura:${IDS.candidatura}`]: "In colloquio",
    },
  })

  return renderWithProviders(
    <CommentPanelBody
      pageFocus={pageFocus}
      stack={stack}
      totalCount={2}
      panelOptions={{
        currentUserId: "99999999-9999-4999-8999-999999999999",
        currentUserName: "Tu",
        sourceInterface: "dettaglio_ricerca",
      }}
    />,
  )
}

describe("Comment chip-section sync", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchCommentSectionPage.mockResolvedValue({
      comments: [makeComment()],
      nextCursor: null,
    })
  })

  it("updates the target chip and placeholder when the lavoratore section opens", async () => {
    renderPanelBody()

    const lavoratoreSectionId = `lavoratore:${IDS.lavoratore}`
    fireEvent.click(
      await screen.findByTestId(`comments-section-toggle-${lavoratoreSectionId}`),
    )

    const chip = await screen.findByTestId("comments-target-chip")
    expect(chip).toHaveTextContent(/LAVORATORE · Luigi Bianchi/)

    const input = screen.getByTestId("comments-composer-input")
    expect(input).toHaveAttribute("data-placeholder", "Scrivi un commento su Luigi Bianchi…")

    await waitFor(() => {
      expect(mockFetchCommentSectionPage).toHaveBeenCalledWith(
        expect.objectContaining({
          sectionEntityType: "lavoratore",
          sectionEntityId: IDS.lavoratore,
        }),
      )
    })
  })

  it("keeps chip and section aligned when selecting an ancestor from the dropdown", async () => {
    const user = userEvent.setup()
    renderPanelBody()

    await user.click(await screen.findByTestId("comments-target-chip"))
    await user.click(await screen.findByTestId("comments-target-option-famiglia"))

    const chip = screen.getByTestId("comments-target-chip")
    expect(chip).toHaveTextContent(/FAMIGLIA · Famiglia Rossi/)

    await waitFor(() => {
      expect(mockFetchCommentSectionPage).toHaveBeenCalledWith(
        expect.objectContaining({
          sectionEntityType: "famiglia",
          sectionEntityId: IDS.famiglia,
        }),
      )
    })
  })

  it("highlights the section counter when that section has unread comments", async () => {
    mockFetchCommentSectionPage.mockImplementation(
      async (options: { sectionEntityType: string }) => ({
        comments: [
          makeComment({
            isUnread: options.sectionEntityType === "lavoratore",
          }),
        ],
        nextCursor: null,
      }),
    )

    renderPanelBody()

    const lavoratoreSectionId = `lavoratore:${IDS.lavoratore}`
    const ricercaSectionId = `ricerca:${IDS.ricerca}`

    await waitFor(() => {
      const lavoratoreToggle = screen.getByTestId(
        `comments-section-toggle-${lavoratoreSectionId}`,
      )
      const highlightedBadge = lavoratoreToggle.querySelector(
        '[data-testid="comments-section-count"][data-highlighted="true"]',
      )
      expect(highlightedBadge).toHaveTextContent("1")
    })

    const ricercaToggle = screen.getByTestId(`comments-section-toggle-${ricercaSectionId}`)
    expect(
      ricercaToggle.querySelector(
        '[data-testid="comments-section-count"][data-highlighted="true"]',
      ),
    ).toBeNull()
  })

  it("highlights the section counter in red when unread comments mention the current user", async () => {
    const currentUserId = "99999999-9999-4999-8999-999999999999"
    mockFetchCommentSectionPage.mockImplementation(
      async (options: { sectionEntityType: string }) => ({
        comments: [
          makeComment({
            isUnread: options.sectionEntityType === "lavoratore",
            body:
              options.sectionEntityType === "lavoratore"
                ? `Ciao ${formatMentionMarkup("Tu", currentUserId)}`
                : "Ciao",
          }),
        ],
        nextCursor: null,
      }),
    )

    renderPanelBody()

    const lavoratoreSectionId = `lavoratore:${IDS.lavoratore}`

    await waitFor(() => {
      const lavoratoreToggle = screen.getByTestId(
        `comments-section-toggle-${lavoratoreSectionId}`,
      )
      const mentionBadge = lavoratoreToggle.querySelector(
        '[data-testid="comments-section-count"][data-mention-highlighted="true"]',
      )
      expect(mentionBadge).toHaveTextContent("1")
    })
  })
})
