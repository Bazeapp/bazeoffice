import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { groupNotificheByDate } from "../lib/date-groups"
import {
  applyAllNotificheReadInCache,
  applyNotificaReadInCache,
  applyNotificaReopenedInCache,
  applyNotificaResolvedInCache,
} from "../lib/notifica-cache"
import {
  notificheCountsQueryKey,
  notificheListQueryKey,
  notificheQueryPrefix,
} from "../lib/query-keys"
import {
  markAllNotificheRead,
  markNotificaRead,
  reopenNotifica,
  resolveNotifica,
} from "../mutations"
import { fetchNotificaList, fetchNotificaCounts } from "../queries"
import type { NotificaTab } from "../types"

async function invalidateNotifiche(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: [...notificheQueryPrefix()] })
}

export function useNotificationCenter(options?: {
  tab?: NotificaTab
  enabled?: boolean
}) {
  const tab = options?.tab ?? "da_risolvere"
  const enabled = options?.enabled ?? true
  const queryClient = useQueryClient()

  // Popover unmounts this hook when closed. App defaults are staleTime: Infinity
  // + refetchOnMount: false, so an invalidated inactive list would otherwise keep
  // serving the pre-invalidation cache on reopen (badge still updates because it
  // stays mounted). refetchOnMount: true only refetches when isInvalidated.
  const listQuery = useQuery({
    queryKey: notificheListQueryKey(tab),
    queryFn: () => fetchNotificaList(tab),
    enabled,
    refetchOnMount: true,
  })

  const countsQuery = useQuery({
    queryKey: notificheCountsQueryKey(),
    queryFn: fetchNotificaCounts,
    enabled,
    refetchOnMount: true,
  })

  const markReadMutation = useMutation({
    mutationFn: markNotificaRead,
    onMutate: async (notificaId) => {
      await queryClient.cancelQueries({ queryKey: [...notificheQueryPrefix()] })
      applyNotificaReadInCache(queryClient, notificaId)
    },
    onSettled: () => invalidateNotifiche(queryClient),
  })

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificheRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [...notificheQueryPrefix()] })
      applyAllNotificheReadInCache(queryClient)
    },
    onSettled: () => invalidateNotifiche(queryClient),
  })

  const resolveMutation = useMutation({
    mutationFn: resolveNotifica,
    onMutate: async (notificaId) => {
      await queryClient.cancelQueries({ queryKey: [...notificheQueryPrefix()] })
      applyNotificaResolvedInCache(queryClient, notificaId)
    },
    onSettled: () => invalidateNotifiche(queryClient),
  })

  const reopenMutation = useMutation({
    mutationFn: reopenNotifica,
    onMutate: async (notificaId) => {
      await queryClient.cancelQueries({ queryKey: [...notificheQueryPrefix()] })
      applyNotificaReopenedInCache(queryClient, notificaId)
    },
    onSettled: () => invalidateNotifiche(queryClient),
  })

  const items = listQuery.data?.items ?? []
  const groups = groupNotificheByDate(items)

  return {
    tab,
    items,
    groups,
    nextCursor: listQuery.data?.nextCursor ?? null,
    unread: countsQuery.data?.unread ?? 0,
    daRisolvere: countsQuery.data?.daRisolvere ?? 0,
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    markRead: markReadMutation.mutateAsync,
    markAllRead: markAllReadMutation.mutateAsync,
    resolve: resolveMutation.mutateAsync,
    reopen: reopenMutation.mutateAsync,
    isMarkingAllRead: markAllReadMutation.isPending,
  }
}
