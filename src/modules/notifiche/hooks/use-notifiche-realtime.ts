import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useRealtimeRows } from "@/hooks/use-realtime-rows"

import {
  incomingNotificaToastCopy,
  isIncomingNotificaInsert,
} from "../lib/incoming-notifica-alert"
import { playNotificationSound } from "../lib/play-notification-sound"
import {
  NOTIFICHE_REALTIME_TABLES,
  notificheQueryPrefix,
} from "../lib/query-keys"

export function useNotificheRealtime(
  enabled = true,
  options?: { announceIncoming?: boolean },
) {
  const queryClient = useQueryClient()
  const announceIncoming = options?.announceIncoming ?? false

  useRealtimeRows(
    [...NOTIFICHE_REALTIME_TABLES],
    (event) => {
      void queryClient.invalidateQueries({ queryKey: [...notificheQueryPrefix()] })

      if (!announceIncoming || !isIncomingNotificaInsert(event)) return

      const copy = incomingNotificaToastCopy(event.newRow?.type)
      toast.info(copy.title, { description: copy.description })
      playNotificationSound()
    },
    { enabled },
  )
}
