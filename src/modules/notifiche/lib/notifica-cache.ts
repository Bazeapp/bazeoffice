import type { QueryClient } from "@tanstack/react-query"

import {
  notificheCountsQueryKey,
  notificheQueryPrefix,
} from "./query-keys"
import type { Notifica, NotificaCounts, NotificaListResult } from "../types"

function listQueryFilter() {
  return {
    queryKey: [...notificheQueryPrefix(), "list"] as const,
  }
}

function patchNotificaInLists(
  queryClient: QueryClient,
  notificaId: string,
  patch: (item: Notifica) => Notifica,
): void {
  const lists = queryClient.getQueriesData<NotificaListResult>(listQueryFilter())
  for (const [key, data] of lists) {
    if (!data) continue
    queryClient.setQueryData<NotificaListResult>(key, {
      ...data,
      items: data.items.map((item) =>
        item.id === notificaId ? patch(item) : item,
      ),
    })
  }
}

function patchCounts(
  queryClient: QueryClient,
  patch: (counts: NotificaCounts) => NotificaCounts,
): void {
  const key = notificheCountsQueryKey()
  const current = queryClient.getQueryData<NotificaCounts>(key)
  if (!current) return
  queryClient.setQueryData(key, patch(current))
}

export function applyNotificaReadInCache(
  queryClient: QueryClient,
  notificaId: string,
  readAt: string = new Date().toISOString(),
): void {
  let becameRead = false
  patchNotificaInLists(queryClient, notificaId, (item) => {
    if (item.status !== "non_letta") return item
    becameRead = true
    return {
      ...item,
      status: item.resolvedAt ? "risolta" : "letta",
      readAt: item.readAt ?? readAt,
    }
  })
  if (becameRead) {
    patchCounts(queryClient, (counts) => ({
      ...counts,
      unread: Math.max(0, counts.unread - 1),
    }))
  }
}

export function applyAllNotificheReadInCache(queryClient: QueryClient): void {
  const readAt = new Date().toISOString()
  const lists = queryClient.getQueriesData<NotificaListResult>(listQueryFilter())
  for (const [key, data] of lists) {
    if (!data) continue
    queryClient.setQueryData<NotificaListResult>(key, {
      ...data,
      items: data.items.map((item) =>
        item.status === "non_letta"
          ? {
              ...item,
              status: item.resolvedAt ? "risolta" : "letta",
              readAt: item.readAt ?? readAt,
            }
          : item,
      ),
    })
  }
  patchCounts(queryClient, (counts) => ({ ...counts, unread: 0 }))
}

export function applyNotificaResolvedInCache(
  queryClient: QueryClient,
  notificaId: string,
  resolvedAt: string = new Date().toISOString(),
): void {
  let wasUnread = false
  let wasOpen = false

  const lists = queryClient.getQueriesData<NotificaListResult>(listQueryFilter())
  for (const [key, data] of lists) {
    if (!data) continue
    const isDaRisolvereList =
      Array.isArray(key) && key.includes("da_risolvere")
    const nextItems = data.items.flatMap((item) => {
      if (item.id !== notificaId) return [item]
      wasUnread = item.status === "non_letta"
      wasOpen = item.resolvedAt == null
      if (isDaRisolvereList) return []
      return [
        {
          ...item,
          status: "risolta" as const,
          readAt: item.readAt ?? resolvedAt,
          resolvedAt: item.resolvedAt ?? resolvedAt,
        },
      ]
    })
    queryClient.setQueryData<NotificaListResult>(key, {
      ...data,
      items: nextItems,
    })
  }

  patchCounts(queryClient, (counts) => ({
    unread: wasUnread ? Math.max(0, counts.unread - 1) : counts.unread,
    daRisolvere: wasOpen ? Math.max(0, counts.daRisolvere - 1) : counts.daRisolvere,
  }))
}

export function applyNotificaReopenedInCache(
  queryClient: QueryClient,
  notificaId: string,
): void {
  let becameOpen = false
  patchNotificaInLists(queryClient, notificaId, (item) => {
    if (item.id !== notificaId || item.resolvedAt == null) return item
    becameOpen = true
    return {
      ...item,
      status: item.readAt ? "letta" : "non_letta",
      resolvedAt: null,
    }
  })
  if (becameOpen) {
    patchCounts(queryClient, (counts) => ({
      ...counts,
      daRisolvere: counts.daRisolvere + 1,
    }))
  }
}
