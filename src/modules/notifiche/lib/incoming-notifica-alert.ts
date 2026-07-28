import type { RealtimeRowEvent } from "@/hooks/use-realtime-rows"

import { notificaActionLabel } from "./notifica-copy"
import type { NotificaType } from "../types"

export function isIncomingNotificaInsert(event: RealtimeRowEvent): boolean {
  return event.table === "notifiche" && event.eventType === "INSERT" && event.newRow != null
}

export function incomingNotificaToastCopy(type: unknown): {
  title: string
  description: string
} {
  const notificaType: NotificaType =
    type === "risposta_thread" ? "risposta_thread" : "menzione"

  if (notificaType === "menzione") {
    return {
      title: "Nuova menzione",
      description: `Qualcuno ${notificaActionLabel("menzione")}`,
    }
  }

  return {
    title: "Nuova risposta",
    description: `Qualcuno ${notificaActionLabel("risposta_thread")}`,
  }
}
