import * as React from "react"
import { BellIcon } from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

import { useUnreadBadge } from "../hooks/use-unread-badge"
import type { Notifica } from "../types"
import { NotificationFlyout } from "./notification-flyout"

type NotificationSidebarTriggerProps = {
  onOpenNotifica: (notifica: Notifica) => void
}

export function NotificationSidebarTrigger({
  onOpenNotifica,
}: NotificationSidebarTriggerProps) {
  const [open, setOpen] = React.useState(false)
  const { unread } = useUnreadBadge()

  return (
    <SidebarMenuItem>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <SidebarMenuButton
            type="button"
            data-testid="notifiche-sidebar-trigger"
            tooltip="Notifiche"
            className="relative h-9 rounded-lg bg-surface/70 px-2.5 hover:bg-surface"
          >
            <span className="relative shrink-0">
              <BellIcon className="size-4" />
              {unread > 0 ? (
                <span
                  data-testid="notifiche-collapsed-dot"
                  className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-red-500 group-data-[state=expanded]/sidebar:hidden"
                  aria-hidden
                />
              ) : null}
            </span>
            <span className="text-sm group-data-[state=collapsed]/sidebar:hidden">
              Notifiche
            </span>
            {unread > 0 ? (
              <span
                data-testid="notifiche-unread-badge"
                className={cn(
                  "ml-auto inline-flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white",
                  "group-data-[state=collapsed]/sidebar:hidden",
                )}
              >
                {unread}
              </span>
            ) : null}
          </SidebarMenuButton>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="end"
          sideOffset={12}
          className="w-auto border-0 bg-transparent p-0 shadow-none"
        >
          <NotificationFlyout
            open={open}
            onOpenNotifica={(notifica) => {
              setOpen(false)
              onOpenNotifica(notifica)
            }}
          />
        </PopoverContent>
      </Popover>
    </SidebarMenuItem>
  )
}
