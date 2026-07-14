import { fireEvent, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/test-utils"

import type { Comment } from "../../types/comment"
import { CommentPanelBody } from "../comment-panel-body"
import { resolveCommentStack } from "../../lib/resolve-comment-stack"

const IDS = {
  famiglia: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  lavoratore: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  ricerca: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  candidatura: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
} as const

const CURRENT_USER_ID = "99999999-9999-4999-8999-999999999999"

const { mockFetchCommentSectionPage } = vi.hoisted(() => ({
  mockFetchCommentSectionPage: vi.fn(),
}))

vi.mock("../../queries/fetch-comment-count", () => ({
  fetchCommentCountForPage: vi.fn().mockResolvedValue(2),
}))

vi.mock("../../queries/fetch-section-comments", () => ({
  fetchCommentSectionPage: (...args: unknown[]) => mockFetchCommentSectionPage(...args),
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
      panelOptions={{
        currentUserId: CURRENT_USER_ID,
        currentUserName: "Tu",
        sourceInterface: "dettaglio_ricerca",
      }}
    />,
  )
}

describe("Comment phase note rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders phase notes before newer free comments in the lavoratore section", async () => {
    mockFetchCommentSectionPage.mockResolvedValue({
      comments: [
        makeComment({
          id: "free-1",
          body: "Commento libero",
          commentType: "free",
          createdAt: "2026-07-14T10:00:00.000Z",
          anchor: { entityType: "lavoratore", entityId: IDS.lavoratore },
        }),
        makeComment({
          id: "phase-1",
          body: "Nota gate",
          commentType: "phase_note",
          phaseLabel: "gate_1",
          createdAt: "2026-07-14T09:00:00.000Z",
          anchor: { entityType: "lavoratore", entityId: IDS.lavoratore },
        }),
      ],
      nextCursor: null,
    })

    renderPanelBody()
    fireEvent.click(
      await screen.findByTestId(`comments-section-commenta-lavoratore:${IDS.lavoratore}`),
    )

    const section = await screen.findByTestId(`comments-section-lavoratore:${IDS.lavoratore}`)
    const threads = within(section).getAllByTestId(/^comments-root-/)
    expect(threads[0]).toHaveAttribute("data-testid", "comments-root-phase-1")
    expect(within(section).getByTestId("comments-phase-badge")).toHaveTextContent("Gate 1")
    expect(within(section).getByText("Nota gate").closest("div")).toHaveClass("bg-[#EFF6FF]")
  })

  it("shows edit in the author menu but not delete", async () => {
    const user = userEvent.setup()
    mockFetchCommentSectionPage.mockResolvedValue({
      comments: [
        makeComment({
          id: "mine-1",
          author: {
            id: CURRENT_USER_ID,
            name: "Tu",
            rolePill: "Recruiter",
            isDeactivated: false,
          },
          anchor: { entityType: "candidatura", entityId: IDS.candidatura },
        }),
      ],
      nextCursor: null,
    })

    renderPanelBody()

    await user.click(await screen.findByTestId("comments-menu-mine-1"))
    expect(await screen.findByTestId("comments-edit-mine-1")).toBeInTheDocument()
    expect(screen.queryByText("Elimina")).not.toBeInTheDocument()
    expect(screen.queryByText("Delete")).not.toBeInTheDocument()
  })

  it("shows empty-state copy on an empty focus section", async () => {
    mockFetchCommentSectionPage.mockResolvedValue({
      comments: [],
      nextCursor: null,
    })

    renderPanelBody()

    expect(await screen.findByTestId("comments-empty-state")).toHaveTextContent(
      "Nessun commento su questa entità. Scrivi il primo messaggio qui sotto.",
    )
  })
})
