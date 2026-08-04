export function notificheQueryPrefix() {
  return ["notifiche"] as const
}

export function notificheCountsQueryKey() {
  return [...notificheQueryPrefix(), "counts"] as const
}

export function notificheListQueryKey(tab: string, cursor?: string | null) {
  return [...notificheQueryPrefix(), "list", tab, cursor ?? null] as const
}

export const NOTIFICHE_REALTIME_TABLES = ["notifiche"] as const
