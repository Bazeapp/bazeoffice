/**
 * Pins flyout list refresh after realtime invalidation while unmounted.
 *
 * App QueryClient defaults are staleTime: Infinity + refetchOnMount: false.
 * The popover unmounts useNotificationCenter when closed, so an inactive list
 * query that was invalidated by the always-mounted badge subscription must
 * refetch on reopen — otherwise the list serves pre-invalidation cache until
 * a full page refresh.
 */
import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const fetchNotificaList = vi.fn()
const fetchNotificaCounts = vi.fn()

vi.mock("../../queries", () => ({
  fetchNotificaList: (...args: unknown[]) => fetchNotificaList(...args),
  fetchNotificaCounts: (...args: unknown[]) => fetchNotificaCounts(...args),
}))

vi.mock("../../mutations", () => ({
  markNotificaRead: vi.fn(),
  markAllNotificheRead: vi.fn(),
  resolveNotifica: vi.fn(),
  reopenNotifica: vi.fn(),
}))

import { notificheListQueryKey, notificheQueryPrefix } from "../../lib/query-keys"
import { useNotificationCenter } from "../use-notification-center"
import type { NotificaListResult } from "../../types"

function makeAppLikeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        retry: false,
      },
      mutations: { retry: false },
    },
  })
}

function listResult(ids: string[]): NotificaListResult {
  return {
    items: ids.map((id) => ({
      id,
      userId: "u1",
      actor: { id: "a1", name: "Ada" },
      type: "menzione" as const,
      commentId: `c-${id}`,
      entityType: "famiglia",
      entityId: "f1",
      body: `body ${id}`,
      status: "non_letta" as const,
      readAt: null,
      resolvedAt: null,
      createdAt: "2026-07-22T12:00:00.000Z",
    })),
    nextCursor: null,
  }
}

describe("useNotificationCenter — remount after invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fetchNotificaCounts.mockResolvedValue({ unread: 0, daRisolvere: 0 })
  })

  it("refetches the list when reopening after a realtime invalidation", async () => {
    fetchNotificaList
      .mockResolvedValueOnce(listResult(["n1"]))
      .mockResolvedValueOnce(listResult(["n2", "n1"]))

    const queryClient = makeAppLikeQueryClient()
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const first = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useNotificationCenter({ enabled, tab: "da_risolvere" }),
      { wrapper, initialProps: { enabled: true } },
    )

    await waitFor(() => {
      expect(first.result.current.items.map((item) => item.id)).toEqual(["n1"])
    })
    expect(fetchNotificaList).toHaveBeenCalledTimes(1)

    // Flyout closes — popover unmounts the hook (inactive cached list).
    first.unmount()

    // Badge realtime invalidates notifiche queries (counts stay live; list does not).
    await queryClient.invalidateQueries({ queryKey: [...notificheQueryPrefix()] })
    expect(
      queryClient.getQueryState(notificheListQueryKey("da_risolvere"))?.isInvalidated,
    ).toBe(true)

    // Flyout reopens — must not serve the pre-invalidation cache.
    const second = renderHook(
      () => useNotificationCenter({ enabled: true, tab: "da_risolvere" }),
      { wrapper },
    )

    await waitFor(() => {
      expect(second.result.current.items.map((item) => item.id)).toEqual([
        "n2",
        "n1",
      ])
    })
    expect(fetchNotificaList).toHaveBeenCalledTimes(2)

    second.unmount()
  })
})
