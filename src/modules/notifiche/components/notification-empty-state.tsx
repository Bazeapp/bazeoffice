import { BellIcon, CheckCircle2Icon } from "lucide-react"

import type { NotificaTab } from "../types"

type EmptyStateProps = {
  tab: NotificaTab
}

export function NotificationEmptyState({ tab }: EmptyStateProps) {
  if (tab === "da_risolvere") {
    return (
      <div
        data-testid="notifiche-empty-da-risolvere"
        className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center"
      >
        <CheckCircle2Icon className="size-10 text-emerald-500" />
        <p className="text-base font-semibold text-foreground-strong">
          Tutto risolto
        </p>
        <p className="text-sm text-muted-foreground">
          Non hai menzioni in sospeso
        </p>
      </div>
    )
  }

  if (tab === "risolte") {
    return (
      <div
        data-testid="notifiche-empty-risolte"
        className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center"
      >
        <p className="text-base font-semibold text-foreground-strong">
          Nessuna notifica risolta
        </p>
        <p className="text-sm text-muted-foreground">
          Le notifiche che risolvi compaiono qui
        </p>
      </div>
    )
  }

  return (
    <div
      data-testid="notifiche-empty-tutte"
      className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center"
    >
      <BellIcon className="size-10 text-muted-foreground" />
      <p className="text-base font-semibold text-foreground-strong">
        Nessuna notifica
      </p>
      <p className="text-sm text-muted-foreground">
        Ti avviseremo qui quando qualcuno ti menziona o risponde
      </p>
    </div>
  )
}
