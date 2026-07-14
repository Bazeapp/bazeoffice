import { fireEvent, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/test-utils"

import { CommentPanelHost } from "../comment-panel-host"
import {
  CommentContextProvider,
  type CommentContextValue,
} from "../comment-context-provider"

const {
  mockFetchCommentCountForPage,
  mockFetchCommentSectionPage,
  mockUseRealtimeRows,
} = vi.hoisted(() => ({
  mockFetchCommentCountForPage: vi.fn(),
  mockFetchCommentSectionPage: vi.fn(),
  mockUseRealtimeRows: vi.fn(),
}))

vi.mock("../../queries/fetch-comment-count", () => ({
  fetchCommentCountForPage: (...args: unknown[]) => mockFetchCommentCountForPage(...args),
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
  useRealtimeRows: (...args: unknown[]) => mockUseRealtimeRows(...args),
}))

vi.mock("@/hooks/use-operatori-options", () => ({
  useOperatoriOptions: () => ({
    options: [],
    loading: false,
    error: null,
  }),
}))

const PAGE_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

function makeContext(
  overrides: Partial<CommentContextValue> = {},
): CommentContextValue {
  return {
    pageFocus: {
      entityType: "ricerca",
      entityId: PAGE_ID,
    },
    row: { id: PAGE_ID, famiglia_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
    sourceInterface: "dettaglio_ricerca",
    currentUserId: "99999999-9999-4999-8999-999999999999",
    ...overrides,
  }
}

function renderHost(context: CommentContextValue | null) {
  if (!context) {
    return renderWithProviders(<CommentPanelHost />)
  }

  return renderWithProviders(
    <CommentContextProvider value={context}>
      <CommentPanelHost />
    </CommentContextProvider>,
  )
}

describe("CommentPanel shell", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchCommentCountForPage.mockResolvedValue(4)
    mockFetchCommentSectionPage.mockResolvedValue({ comments: [], nextCursor: null })
    mockUseRealtimeRows.mockImplementation(() => undefined)
  })

  it("renders nothing when page focus is missing", () => {
    renderHost(makeContext({ pageFocus: null }))

    expect(screen.queryByTestId("comments-pill")).not.toBeInTheDocument()
    expect(screen.queryByTestId("comments-panel")).not.toBeInTheDocument()
    expect(mockFetchCommentCountForPage).not.toHaveBeenCalled()
  })

  it("shows the collapsed pill and fetches only the count", async () => {
    renderHost(makeContext())

    const pill = await screen.findByTestId("comments-pill")
    await waitFor(() => {
      expect(pill).toHaveTextContent("4")
    })
    await waitFor(() => {
      expect(mockFetchCommentCountForPage).toHaveBeenCalledWith("ricerca", PAGE_ID)
    })
    expect(mockFetchCommentSectionPage).not.toHaveBeenCalled()
    expect(screen.queryByTestId("comments-panel")).not.toBeInTheDocument()
  })

  it("expands the panel on pill click and loads the focus section", async () => {
    renderHost(makeContext())

    fireEvent.click(await screen.findByTestId("comments-pill"))

    const panel = await screen.findByTestId("comments-panel")
    expect(panel).toHaveTextContent(/Commenti · 4/)
    expect(await screen.findByTestId("comments-target-chip")).toBeInTheDocument()

    await waitFor(() => {
      expect(mockFetchCommentSectionPage).toHaveBeenCalled()
    })
  })

  it("closes the expanded panel from the header control", async () => {
    renderHost(makeContext())

    fireEvent.click(await screen.findByTestId("comments-pill"))
    fireEvent.click(await screen.findByTestId("comments-panel-close"))

    await waitFor(() => {
      expect(screen.queryByTestId("comments-panel")).not.toBeInTheDocument()
    })
    expect(screen.getByTestId("comments-pill")).toBeInTheDocument()
  })
})
