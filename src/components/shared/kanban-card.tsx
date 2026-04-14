import * as React from "react"
import { cn } from "@/lib/utils"

type KanbanCardProps = {
  onClick?: () => void
  children: React.ReactNode
  className?: string
  /** Optional left accent bar — pass a bg-* class, e.g. "bg-badge-red" */
  accentLeft?: string
}

export function KanbanCard({ onClick, children, className, accentLeft }: KanbanCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative bg-surface-raised rounded-lg border border-border/80 p-3 cursor-pointer",
        "shadow-elevation-xs",
        "transition-[transform,box-shadow,border-color] duration-150 ease-in",
        "hover:-translate-y-px hover:border-primary/25 hover:shadow-elevation-sm",
        "active:translate-y-0 active:shadow-elevation-xs",
        "group",
        className
      )}
    >
      {accentLeft && (
        <div className={cn("absolute left-0 top-2 bottom-2 w-[3px] rounded-full", accentLeft)} />
      )}
      {accentLeft ? <div className="pl-1.5">{children}</div> : children}
    </div>
  )
}

export function KanbanCardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[12px] font-semibold text-foreground truncate group-hover:text-primary transition-colors leading-snug">
      {children}
    </h3>
  )
}

export function KanbanCardSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-muted-foreground truncate mt-0.5 leading-relaxed">
      {children}
    </p>
  )
}

export function KanbanCardBadge({
  children,
  color = "bg-badge-gray-bg text-badge-gray",
}: {
  children: React.ReactNode
  color?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full leading-none border border-current/10",
        color
      )}
    >
      {children}
    </span>
  )
}

export function KanbanCardBadgeRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1 mt-2">{children}</div>
}

export function KanbanCardMeta({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      {children}
    </div>
  )
}
