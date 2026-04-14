import * as React from "react"

import { cn } from "@/lib/utils"

export type KanbanColumnVisual = {
  columnClassName: string
  headerClassName: string
  iconClassName: string
  /** Explicit accent bar background class (e.g. "bg-sky-500"). Takes precedence over derivation from iconClassName. */
  accentBg?: string
}

/** Derives bg-* class from text-* class (e.g. "text-sky-500" → "bg-sky-500"). Returns undefined for muted/default variants. */
function deriveAccentBg(iconClassName: string): string | undefined {
  if (!iconClassName || iconClassName.startsWith("text-muted-foreground")) return undefined
  return iconClassName.replace(/^text-/, "bg-")
}

/** Derives text-* class from bg-* class (e.g. "bg-badge-sky-bg" → "text-badge-sky") */
function deriveTextClass(bgClass: string): string {
  return bgClass.replace(/^bg-/, "text-").replace(/-bg$/, "")
}

type KanbanColumnShellProps = {
  columnId: string
  title: string
  /** String label shown in the badge (e.g. "3 processi"). Used when count is not provided. */
  countLabel?: string
  /** Optional numeric count — if provided, shown instead of countLabel in the badge. */
  count?: number
  visual: KanbanColumnVisual
  /** @deprecated Not rendered in the new Lovable-style header. Kept for type compatibility. */
  headerIcon?: React.ReactNode
  isDropTarget?: boolean
  widthClassName?: string
  density?: "comfortable" | "compact"
  emptyState?: React.ReactNode
  children?: React.ReactNode
  onDragEnter?: (columnId: string) => void
  onDragOver?: (columnId: string) => void
  onDragLeave?: (event: React.DragEvent<HTMLDivElement>) => void
  onDrop?: (columnId: string, payload: string | null) => void
}

export function KanbanColumnShell({
  columnId,
  title,
  countLabel,
  count,
  visual,
  isDropTarget = false,
  widthClassName = "w-[272px]",
  density = "comfortable",
  emptyState,
  children,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
}: KanbanColumnShellProps) {
  const isCompact = density === "compact"
  const accentBg = visual.accentBg ?? deriveAccentBg(visual.iconClassName)
  const countTextColor = accentBg ? deriveTextClass(accentBg) : "text-muted-foreground"
  const badgeLabel = count !== undefined ? String(count) : countLabel
  const hasChildren = React.Children.count(children) > 0

  return (
    <div
      className={cn("flex flex-col shrink-0 min-w-[272px]", widthClassName)}
      onDragEnter={() => onDragEnter?.(columnId)}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        onDragOver?.(columnId)
      }}
      onDragLeave={onDragLeave}
      onDrop={(event) => {
        event.preventDefault()
        const payload = event.dataTransfer.getData("text/plain") || null
        onDrop?.(columnId, payload)
      }}
    >
      {/* Header — accent bar + surface-raised background */}
      <div className="relative rounded-t-xl overflow-hidden">
        {accentBg && (
          <div className={cn("absolute inset-x-0 top-0 h-[3px] opacity-70", accentBg)} />
        )}
        <div
          className={cn(
            "px-3 py-2.5 bg-surface-raised border border-border/70 shadow-elevation-xs",
            accentBg && "pt-3.5"
          )}
        >
          <div className="flex items-center gap-2">
            <h2 className="text-[12px] font-bold text-foreground truncate flex-1 tracking-tight">
              {title}
            </h2>
            <span
              className={cn(
                "text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-md min-w-[24px] text-center border border-current/10",
                countTextColor
              )}
              style={
                accentBg
                  ? { backgroundColor: "color-mix(in srgb, currentColor 12%, transparent)" }
                  : undefined
              }
            >
              {badgeLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Body — inset surface, drop-target ring */}
      <div
        className={cn(
          "flex-1 min-h-0 rounded-b-xl border border-t-0 overflow-y-auto transition-all duration-150",
          isCompact ? "p-2 space-y-2" : "p-2 space-y-2.5",
          isDropTarget
            ? "bg-primary/[0.04] ring-2 ring-primary/20 border-primary/20"
            : "bg-surface-inset border-border/50"
        )}
      >
        {hasChildren ? (
          children
        ) : (
          emptyState ?? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/40">
              <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <rect x="3" y="3" width="10" height="10" rx="2" />
                  <path d="M8 6v4M6 8h4" />
                </svg>
              </div>
              <p className="text-[11px]">Nessun elemento</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}

type KanbanColumnSkeletonProps = {
  widthClassName?: string
  density?: "comfortable" | "compact"
  cardCount?: number
  showBadgeRow?: boolean
}

export function KanbanColumnSkeleton({
  widthClassName = "w-[272px]",
  density = "comfortable",
  cardCount = 2,
  showBadgeRow = false,
}: KanbanColumnSkeletonProps) {
  const isCompact = density === "compact"

  return (
    <div className={cn("flex flex-col shrink-0 min-w-[272px]", widthClassName)}>
      {/* Skeleton header */}
      <div className="rounded-t-xl overflow-hidden">
        <div className="px-3 py-2.5 bg-surface-raised border border-border/70 shadow-elevation-xs">
          <div className="flex items-center gap-2">
            <div className={cn("bg-muted animate-pulse rounded", isCompact ? "h-3.5 w-28 flex-1" : "h-4 w-32 flex-1")} />
            <div className={cn("bg-muted animate-pulse rounded-md", isCompact ? "h-5 w-6" : "h-5 w-7")} />
          </div>
        </div>
      </div>

      {/* Skeleton body */}
      <div
        className={cn(
          "flex-1 min-h-0 rounded-b-xl border border-t-0 bg-surface-inset border-border/50",
          isCompact ? "p-2 space-y-2" : "p-2 space-y-2.5"
        )}
      >
        {Array.from({ length: cardCount }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "bg-surface-raised rounded-lg border border-border/80 shadow-elevation-xs",
              isCompact ? "p-2.5 space-y-1.5" : "p-3 space-y-2"
            )}
          >
            <div className={cn("bg-muted animate-pulse rounded", isCompact ? "h-3.5 w-24" : "h-4 w-28")} />
            {showBadgeRow && (
              <div className={cn("bg-muted animate-pulse rounded-full", isCompact ? "h-4 w-20" : "h-5 w-24")} />
            )}
            <div className={cn("border-t border-border/50", isCompact ? "space-y-1 pt-1.5" : "space-y-1.5 pt-2")}>
              <div className="bg-muted h-3 w-full animate-pulse rounded" />
              <div className="bg-muted h-3 w-11/12 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
