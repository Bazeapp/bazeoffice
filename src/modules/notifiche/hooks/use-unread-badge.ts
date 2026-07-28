import { useQuery } from "@tanstack/react-query"

import { notificheCountsQueryKey } from "../lib/query-keys"
import { fetchNotificaCounts } from "../queries"
import { useNotificheRealtime } from "./use-notifiche-realtime"

export function useUnreadBadge(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true
  useNotificheRealtime(enabled, { announceIncoming: true })

  const countsQuery = useQuery({
    queryKey: notificheCountsQueryKey(),
    queryFn: fetchNotificaCounts,
    enabled,
  })

  return {
    unread: countsQuery.data?.unread ?? 0,
    daRisolvere: countsQuery.data?.daRisolvere ?? 0,
    isLoading: countsQuery.isLoading,
    isError: countsQuery.isError,
    refetch: countsQuery.refetch,
  }
}
