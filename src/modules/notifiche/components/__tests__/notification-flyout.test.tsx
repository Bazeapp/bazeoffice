import { fireEvent, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/test-utils"

import type { Notifica } from "../../types"
import { NotificationFlyout } from "../notification-flyout"

const mockMarkRead = vi.fn()
const mockMarkAllRead = vi.fn()
const mockResolve = vi.fn()
const mockReopen = vi.fn()
const mockOnOpenNotifica = vi.fn()

const unreadNotifica: Notifica = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  actor: { id: "33333333-3333-4333-8333-333333333333", name: "Giulia Bianchi" },
  type: "menzione",
  commentId: "44444444-4444-4444-8444-444444444444",
  entityType: "candidatura",
  entityId: "55555555-5555-4555-8555-555555555555",
  body: "Ciao, puoi dare un'occhiata?",
  status: "non_letta",
  readAt: null,
  resolvedAt: null,
  createdAt: "2026-07-17T10:00:00.000Z",
}

vi.mock("../../hooks/use-notification-center", () => ({
  useNotificationCenter: () => ({
    tab: "da_risolvere",
    items: [unreadNotifica],
    groups: [{ label: "Oggi", items: [unreadNotifica] }],
    nextCursor: null,
    unread: 1,
    daRisolvere: 1,
    isLoading: false,
    isError: false,
    markRead: mockMarkRead,
    markAllRead: mockMarkAllRead,
    resolve: mockResolve,
    reopen: mockReopen,
    isMarkingAllRead: false,
  }),
}))

describe("NotificationFlyout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMarkRead.mockResolvedValue(undefined)
    mockMarkAllRead.mockResolvedValue(undefined)
  })

  it("defaults to Da risolvere and shows unread badge count", () => {
    renderWithProviders(
      <NotificationFlyout open onOpenNotifica={mockOnOpenNotifica} />,
    )

    expect(screen.getByTestId("notifiche-tab-da-risolvere")).toBeInTheDocument()
    expect(screen.getByTestId("notifiche-flyout")).toHaveTextContent("Notifiche")
    expect(screen.getByTestId("notifiche-row")).toHaveAttribute(
      "data-status",
      "non_letta",
    )
  })

  it("marks read and opens the notifica on row click", async () => {
    renderWithProviders(
      <NotificationFlyout open onOpenNotifica={mockOnOpenNotifica} />,
    )

    fireEvent.click(screen.getByTestId("notifiche-row"))

    await waitFor(() => {
      expect(mockMarkRead).toHaveBeenCalledWith(unreadNotifica.id)
      expect(mockOnOpenNotifica).toHaveBeenCalledWith(unreadNotifica)
    })
  })

  it("calls mark-all-read from the header action", async () => {
    renderWithProviders(
      <NotificationFlyout open onOpenNotifica={mockOnOpenNotifica} />,
    )

    fireEvent.click(screen.getByTestId("notifiche-mark-all-read"))

    await waitFor(() => {
      expect(mockMarkAllRead).toHaveBeenCalled()
    })
  })
})
