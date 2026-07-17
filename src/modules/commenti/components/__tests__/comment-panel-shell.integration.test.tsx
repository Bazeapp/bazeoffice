import { fireEvent, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useOperatoriOptions } from "@/hooks/use-operatori-options"
import { renderWithProviders } from "@/test/test-utils"

import { setMarkupCaretOffset, renderComposerMarkup } from "../../lib/mention-composer-dom"
import { formatMentionMarkup } from "../../lib/mention-markup"

import { CommentPanelHost } from "../comment-panel-host"
import {
  CommentContextProvider,
  type CommentContextValue,
} from "../comment-context-provider"

const {
  mockFetchCommentCountForPage,
  mockFetchCommentSectionPage,
  mockFetchCommentSectionCount,
  mockUseRealtimeRows,
} = vi.hoisted(() => ({
  mockFetchCommentCountForPage: vi.fn(),
  mockFetchCommentSectionPage: vi.fn(),
  mockFetchCommentSectionCount: vi.fn(),
  mockUseRealtimeRows: vi.fn(),
}))

vi.mock("../../queries/fetch-comment-count", () => ({
  fetchCommentCountForPage: (...args: unknown[]) => mockFetchCommentCountForPage(...args),
}))

vi.mock("../../queries/fetch-section-comment-count", () => ({
  fetchCommentSectionCount: (...args: unknown[]) => mockFetchCommentSectionCount(...args),
}))

vi.mock("../../queries/fetch-descendants-comment-count", () => ({
  fetchDescendantsCommentCount: vi.fn().mockResolvedValue(0),
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
  useOperatoriOptions: vi.fn(() => ({
    options: [],
    loading: false,
    error: null,
  })),
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
    vi.mocked(useOperatoriOptions).mockReturnValue({
      options: [],
      loading: false,
      error: null,
    })
    mockFetchCommentCountForPage.mockResolvedValue(4)
    mockFetchCommentSectionCount.mockResolvedValue(0)
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

  it("prefetches section comments when collapsed to detect unread mentions", async () => {
    mockFetchCommentSectionCount.mockResolvedValue(1)

    renderHost(makeContext())

    await screen.findByTestId("comments-pill")
    await waitFor(() => {
      expect(mockFetchCommentSectionPage).toHaveBeenCalled()
    })
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

  it("collapses the panel when page focus changes", async () => {
    const nextPageId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
    const { rerender } = renderWithProviders(
      <CommentContextProvider value={makeContext()}>
        <CommentPanelHost />
      </CommentContextProvider>,
    )

    fireEvent.click(await screen.findByTestId("comments-pill"))
    expect(await screen.findByTestId("comments-panel")).toBeInTheDocument()

    rerender(
      <CommentContextProvider
        value={makeContext({
          pageFocus: { entityType: "ricerca", entityId: nextPageId },
          row: { id: nextPageId, famiglia_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
        })}
      >
        <CommentPanelHost />
      </CommentContextProvider>,
    )

    await waitFor(() => {
      expect(screen.queryByTestId("comments-panel")).not.toBeInTheDocument()
    })
    expect(screen.getByTestId("comments-pill")).toBeInTheDocument()
  })

  it("keeps the pill clickable while a sheet dialog is open", async () => {
    renderWithProviders(
      <CommentContextProvider value={makeContext()}>
        <Sheet open>
          <SheetContent aria-describedby={undefined}>
            <SheetTitle>Dettaglio cedolino</SheetTitle>
          </SheetContent>
        </Sheet>
        <CommentPanelHost />
      </CommentContextProvider>,
    )

    const pill = await screen.findByTestId("comments-pill")
    await waitFor(() => {
      expect(pill).toHaveTextContent("4")
    })

    fireEvent.click(pill)

    expect(await screen.findByTestId("comments-panel")).toBeInTheDocument()
  })

  it("keeps the composer focusable while a sheet dialog is open", async () => {
    renderWithProviders(
      <CommentContextProvider value={makeContext()}>
        <Sheet open>
          <SheetContent aria-describedby={undefined}>
            <SheetTitle>Dettaglio cedolino</SheetTitle>
          </SheetContent>
        </Sheet>
        <CommentPanelHost />
      </CommentContextProvider>,
    )

    fireEvent.click(await screen.findByTestId("comments-pill"))

    const composer = await screen.findByTestId("comments-composer-input")
    fireEvent.pointerDown(composer)
    composer.focus()

    expect(composer).toHaveFocus()
  })

  it("shows a red dot on the pill when unread comments mention the current user", async () => {
    const currentUserId = "99999999-9999-4999-8999-999999999999"
    mockFetchCommentSectionCount.mockResolvedValue(1)
    mockFetchCommentSectionPage.mockResolvedValue({
      comments: [
        {
          id: "comment-mention-1",
          threadRootId: null,
          anchor: { entityType: "ricerca", entityId: PAGE_ID },
          author: {
            id: "author-1",
            name: "Mario Rossi",
            rolePill: "Customer",
            isDeactivated: false,
          },
          body: `Ciao ${formatMentionMarkup("Tu", currentUserId)}`,
          commentType: "free",
          phaseLabel: null,
          sourceInterface: null,
          createdAt: "2026-07-14T08:00:00.000Z",
          editedAt: null,
          isUnread: true,
          replyCount: 0,
          replies: [],
        },
      ],
      nextCursor: null,
    })

    renderHost(makeContext({ currentUserId }))

    expect(await screen.findByTestId("comments-unread-mention-dot")).toBeInTheDocument()
  })

  it("keeps mention autocomplete wheel events inside the panel while a sheet is open", async () => {
    const manyOperators = Array.from({ length: 20 }, (_, index) => ({
      id: `11111111-1111-4111-8111-${String(index).padStart(12, "0")}`,
      label: `Operatore ${index}`,
      avatar: `O${index}`,
      avatarBorderClassName: "after:border-emerald-500",
    }))

    vi.mocked(useOperatoriOptions).mockReturnValue({
      options: manyOperators,
      loading: false,
      error: null,
    })

    const onDocumentWheel = vi.fn()

    renderWithProviders(
      <CommentContextProvider value={makeContext()}>
        <Sheet open>
          <SheetContent aria-describedby={undefined}>
            <SheetTitle>Dettaglio cedolino</SheetTitle>
          </SheetContent>
        </Sheet>
        <CommentPanelHost />
      </CommentContextProvider>,
    )

    document.addEventListener("wheel", onDocumentWheel)

    try {
      fireEvent.click(await screen.findByTestId("comments-pill"))
      const input = await screen.findByTestId("comments-composer-input")
      renderComposerMarkup(input, "@")
      setMarkupCaretOffset(input, 1)
      fireEvent.input(input)
      fireEvent.keyUp(input)

      const autocomplete = await screen.findByTestId("comments-mention-autocomplete")
      fireEvent.wheel(autocomplete, { deltaY: 120 })

      expect(onDocumentWheel).not.toHaveBeenCalled()
    } finally {
      document.removeEventListener("wheel", onDocumentWheel)
    }
  })
})
