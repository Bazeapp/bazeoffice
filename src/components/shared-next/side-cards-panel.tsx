import * as React from "react"
import { SearchIcon, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui-next/card"
import { Input } from "@/components/ui-next/input"

type SideCardsPanelGroup = {
  id: string
  title: React.ReactNode
  count?: number
  children: React.ReactNode
  className?: string
  headerClassName?: string
  contentClassName?: string
}

type SideCardsPanelProps = React.ComponentProps<typeof Card> & {
  title: string
  subtitle?: string
  icon?: LucideIcon
  groups?: SideCardsPanelGroup[]
  empty?: boolean
  emptyMessage?: React.ReactNode
  searchValue?: string
  searchPlaceholder?: string
  onSearchValueChange?: (value: string) => void
  toolbarActions?: React.ReactNode
  headerClassName?: string
  toolbarClassName?: string
  contentClassName?: string
  groupClassName?: string
  groupHeaderClassName?: string
  groupContentClassName?: string
  emptyClassName?: string
}

export function SideCardsPanel({
  title,
  subtitle,
  icon: Icon,
  groups,
  empty = false,
  emptyMessage = "Nessun elemento disponibile.",
  searchValue,
  searchPlaceholder = "Cerca...",
  onSearchValueChange,
  toolbarActions,
  className,
  headerClassName,
  toolbarClassName,
  contentClassName,
  groupClassName,
  groupHeaderClassName,
  groupContentClassName,
  emptyClassName,
  children,
  ...props
}: SideCardsPanelProps) {
  const hasGroups = Array.isArray(groups) && groups.length > 0
  const hasToolbar =
    typeof searchValue === "string" || Boolean(toolbarActions)

  return (
    <Card
      className={cn("flex h-full flex-col overflow-hidden bg-muted", className)}
      {...props}
    >
      <CardHeader className={cn("pb-2.5", headerClassName)}>
        <CardTitle className="flex items-center gap-1.5 text-[13px]">
          {Icon ? <Icon className="size-3.5" /> : null}
          {title}
        </CardTitle>
        {subtitle ? <p className="text-muted-foreground text-[12px]">{subtitle}</p> : null}
      </CardHeader>
      {hasToolbar ? (
        <div
          className={cn(
            "flex flex-col gap-2 px-5 pb-3",
            toolbarClassName,
          )}
        >
          {typeof searchValue === "string" ? (
            <div className="relative">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={searchValue}
                onChange={(event) => onSearchValueChange?.(event.target.value)}
                placeholder={searchPlaceholder}
                className="bg-background pl-9"
              />
            </div>
          ) : null}
          {toolbarActions ? (
            <div className="flex flex-wrap items-center gap-2">
              {toolbarActions}
            </div>
          ) : null}
        </div>
      ) : null}
      <CardContent className={cn("flex-1 overflow-y-auto", contentClassName)}>
        {empty ? (
          <div
            className={cn(
              "rounded-xl border border-dashed bg-background px-4 py-6 text-center text-sm text-muted-foreground",
              emptyClassName,
            )}
          >
            {emptyMessage}
          </div>
        ) : hasGroups ? (
          <div className="space-y-4">
            {groups.map((group) => (
              <section
                key={group.id}
                className={cn("space-y-2", groupClassName, group.className)}
              >
                <div
                  className={cn(
                    "flex items-center justify-between gap-2",
                    groupHeaderClassName,
                    group.headerClassName,
                  )}
                >
                  <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide">
                    {group.title}
                  </p>
                  {typeof group.count === "number" ? (
                    <span className="text-muted-foreground text-[11px]">
                      {group.count}
                    </span>
                  ) : null}
                </div>
                <div
                  className={cn(
                    "space-y-2",
                    groupContentClassName,
                    group.contentClassName,
                  )}
                >
                  {group.children}
                </div>
              </section>
            ))}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
