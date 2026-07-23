import * as React from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { useNotificationCenter } from "../hooks/use-notification-center"
import type { Notifica, NotificaTab } from "../types"
import { NotificationEmptyState } from "./notification-empty-state"
import { NotificationRow } from "./notification-row"

type NotificationFlyoutProps = {
  open: boolean
  onOpenNotifica: (notifica: Notifica) => void
}

export function NotificationFlyout({
  open,
  onOpenNotifica,
}: NotificationFlyoutProps) {
  const [tab, setTab] = React.useState<NotificaTab>("da_risolvere")
  const center = useNotificationCenter({ tab, enabled: open })

  return (
    <div
      data-testid="notifiche-flyout"
      className="flex h-[min(720px,calc(100vh-48px))] w-[420px] flex-col overflow-hidden rounded-xl bg-surface shadow-[0_0_0_1px_var(--border),var(--shadow-lg)]"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-foreground-strong">
            Notifiche
          </h3>
          {center.unread > 0 ? (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white">
              {center.unread}
            </span>
          ) : null}
        </div>
        {center.unread > 0 ? (
          <button
            type="button"
            data-testid="notifiche-mark-all-read"
            className="text-xs font-medium text-accent disabled:opacity-50"
            disabled={center.isMarkingAllRead}
            onClick={() => {
              void center.markAllRead()
            }}
          >
            Segna tutte come lette
          </button>
        ) : null}
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as NotificaTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList variant="underline" className="px-4">
          <TabsTrigger
            value="da_risolvere"
            data-testid="notifiche-tab-da-risolvere"
            count={center.daRisolvere}
          >
            Da risolvere
          </TabsTrigger>
          <TabsTrigger value="tutte" data-testid="notifiche-tab-tutte">
            Tutte
          </TabsTrigger>
          <TabsTrigger value="risolte" data-testid="notifiche-tab-risolte">
            Risolte
          </TabsTrigger>
        </TabsList>

        {(["da_risolvere", "tutte", "risolte"] as const).map((tabValue) => (
          <TabsContent
            key={tabValue}
            value={tabValue}
            className="mt-0 min-h-0 flex-1 overflow-y-auto"
          >
            {center.isLoading ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                Caricamento…
              </div>
            ) : center.groups.length === 0 ? (
              <NotificationEmptyState tab={tabValue} />
            ) : (
              center.groups.map((group) => (
                <div key={group.label}>
                  <div className="sticky top-0 z-10 bg-surface px-4 py-2 text-[11px] font-semibold tracking-wider text-muted-foreground">
                    {group.label}
                  </div>
                  {group.items.map((notifica) => (
                    <NotificationRow
                      key={notifica.id}
                      notifica={notifica}
                      onOpen={(item) => {
                        void center.markRead(item.id)
                        onOpenNotifica(item)
                      }}
                      onResolve={(item) => {
                        void center.resolve(item.id)
                      }}
                      onReopen={(item) => {
                        void center.reopen(item.id)
                      }}
                    />
                  ))}
                </div>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
