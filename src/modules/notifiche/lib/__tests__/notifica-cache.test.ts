import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import {
  applyAllNotificheReadInCache,
  applyNotificaReadInCache,
  applyNotificaReopenedInCache,
  applyNotificaResolvedInCache,
} from "../notifica-cache"
import { notificheCountsQueryKey, notificheListQueryKey } from "../query-keys"
import type { Notifica, NotificaCounts, NotificaListResult } from "../../types"

const unreadItem: Notifica = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  actor: { id: "33333333-3333-4333-8333-333333333333", name: "Giulia" },
  type: "menzione",
  commentId: "44444444-4444-4444-8444-444444444444",
  entityType: "lavoratore",
  entityId: "55555555-5555-4555-8555-555555555555",
  body: "Ciao",
  status: "non_letta",
  readAt: null,
  resolvedAt: null,
  createdAt: "2026-07-17T10:00:00.000Z",
}

function seed(client: QueryClient) {
  client.setQueryData<NotificaListResult>(notificheListQueryKey("da_risolvere"), {
    items: [unreadItem],
    nextCursor: null,
  })
  client.setQueryData<NotificaCounts>(notificheCountsQueryKey(), {
    unread: 1,
    daRisolvere: 1,
  })
}

describe("notifica-cache", () => {
  it("marks a single notifica read and decrements unread", () => {
    const client = new QueryClient()
    seed(client)

    applyNotificaReadInCache(client, unreadItem.id, "2026-07-17T11:00:00.000Z")

    const list = client.getQueryData<NotificaListResult>(
      notificheListQueryKey("da_risolvere"),
    )
    expect(list?.items[0]?.status).toBe("letta")
    expect(list?.items[0]?.readAt).toBe("2026-07-17T11:00:00.000Z")
    expect(client.getQueryData<NotificaCounts>(notificheCountsQueryKey())?.unread).toBe(0)
  })

  it("marks all read", () => {
    const client = new QueryClient()
    seed(client)

    applyAllNotificheReadInCache(client)

    const list = client.getQueryData<NotificaListResult>(
      notificheListQueryKey("da_risolvere"),
    )
    expect(list?.items[0]?.status).toBe("letta")
    expect(client.getQueryData<NotificaCounts>(notificheCountsQueryKey())?.unread).toBe(0)
  })

  it("resolves and reopens with daRisolvere counter updates", () => {
    const client = new QueryClient()
    seed(client)

    applyNotificaResolvedInCache(client, unreadItem.id, "2026-07-17T12:00:00.000Z")
    expect(
      client.getQueryData<NotificaListResult>(notificheListQueryKey("da_risolvere"))
        ?.items,
    ).toEqual([])
    expect(
      client.getQueryData<NotificaCounts>(notificheCountsQueryKey()),
    ).toEqual({ unread: 0, daRisolvere: 0 })

    client.setQueryData<NotificaListResult>(notificheListQueryKey("da_risolvere"), {
      items: [
        {
          ...unreadItem,
          status: "risolta",
          readAt: "2026-07-17T12:00:00.000Z",
          resolvedAt: "2026-07-17T12:00:00.000Z",
        },
      ],
      nextCursor: null,
    })
    client.setQueryData<NotificaListResult>(notificheListQueryKey("risolte"), {
      items: [
        {
          ...unreadItem,
          status: "risolta",
          readAt: "2026-07-17T12:00:00.000Z",
          resolvedAt: "2026-07-17T12:00:00.000Z",
        },
      ],
      nextCursor: null,
    })

    applyNotificaReopenedInCache(client, unreadItem.id)
    expect(
      client.getQueryData<NotificaListResult>(notificheListQueryKey("risolte"))
        ?.items[0]?.status,
    ).toBe("letta")
    expect(
      client.getQueryData<NotificaCounts>(notificheCountsQueryKey())?.daRisolvere,
    ).toBe(1)
  })
})
