import { screen, waitFor } from "@testing-library/react"
import type { User } from "@supabase/supabase-js"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/test-utils"

import { CommentAppProvider } from "../../components/comment-app-provider"
import { useCommentContext } from "../use-comment-context"
import { useCommentRouteContext } from "../use-comment-route-context"

const { mockFetchCurrentOperatorId } = vi.hoisted(() => ({
  mockFetchCurrentOperatorId: vi.fn(),
}))

vi.mock("../../queries/fetch-current-operator-id", () => ({
  fetchCurrentOperatorId: (...args: unknown[]) => mockFetchCurrentOperatorId(...args),
}))

const RICERCA_ID = "00000000-0000-0000-0000-00000000b00c"
const CANDIDATURA_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
const OPERATOR_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const AUTH_USER_ID = "99999999-9999-4999-8999-999999999999"

const mockUser: User = {
  id: AUTH_USER_ID,
  email: "test@usuario.com",
  user_metadata: { full_name: "Test Operatore" },
  app_metadata: {},
  aud: "authenticated",
  created_at: "2024-01-01T00:00:00.000Z",
}

function ContextProbe() {
  const context = useCommentContext()
  const focus = context?.pageFocus
  const label = focus ? `${focus.entityType}:${focus.entityId}` : "none"
  return (
    <>
      <div data-testid="comment-focus">{label}</div>
      <div data-testid="comment-current-user-id">{context?.currentUserId ?? "null"}</div>
    </>
  )
}

function RicercaDetailRegistrar({ overlayOpen }: { overlayOpen: boolean }) {
  useCommentRouteContext({
    enabled: !overlayOpen,
    pageFocus: { entityType: "ricerca", entityId: RICERCA_ID },
    row: { id: RICERCA_ID },
    sourceInterface: "dettaglio_ricerca",
  })
  return null
}

function PipelineRegistrar({ overlayOpen }: { overlayOpen: boolean }) {
  useCommentRouteContext({
    enabled: overlayOpen,
    pageFocus: overlayOpen
      ? { entityType: "candidatura", entityId: CANDIDATURA_ID }
      : null,
    row: overlayOpen ? { id: CANDIDATURA_ID } : {},
    sourceInterface: overlayOpen ? "dettaglio_lavoratore_ricerca" : null,
  })
  return null
}

function RicercaPageFixture({ overlayOpen }: { overlayOpen: boolean }) {
  return (
    <>
      <RicercaDetailRegistrar overlayOpen={overlayOpen} />
      <PipelineRegistrar overlayOpen={overlayOpen} />
      <ContextProbe />
    </>
  )
}

function renderRicercaPage(overlayOpen: boolean) {
  return renderWithProviders(
    <CommentAppProvider user={mockUser}>
      <RicercaPageFixture overlayOpen={overlayOpen} />
    </CommentAppProvider>,
  )
}

describe("useCommentRouteContext", () => {
  beforeEach(() => {
    mockFetchCurrentOperatorId.mockResolvedValue(OPERATOR_ID)
  })

  it("exposes operatori.id as currentUserId, not the auth uid", async () => {
    renderRicercaPage(false)

    await waitFor(() => {
      expect(screen.getByTestId("comment-current-user-id")).toHaveTextContent(OPERATOR_ID)
    })
    expect(screen.getByTestId("comment-current-user-id")).not.toHaveTextContent(
      AUTH_USER_ID,
    )
  })

  it("keeps ricerca registration when pipeline hook is mounted but disabled", () => {
    renderRicercaPage(false)

    expect(screen.getByTestId("comment-focus")).toHaveTextContent(
      `ricerca:${RICERCA_ID}`,
    )
  })

  it("switches to candidatura when overlay opens and back to ricerca when it closes", () => {
    const { rerender } = renderRicercaPage(false)

    expect(screen.getByTestId("comment-focus")).toHaveTextContent(
      `ricerca:${RICERCA_ID}`,
    )

    rerender(
      <CommentAppProvider user={mockUser}>
        <RicercaPageFixture overlayOpen />
      </CommentAppProvider>,
    )

    expect(screen.getByTestId("comment-focus")).toHaveTextContent(
      `candidatura:${CANDIDATURA_ID}`,
    )

    rerender(
      <CommentAppProvider user={mockUser}>
        <RicercaPageFixture overlayOpen={false} />
      </CommentAppProvider>,
    )

    expect(screen.getByTestId("comment-focus")).toHaveTextContent(
      `ricerca:${RICERCA_ID}`,
    )
  })
})
