import * as React from "react"
import { CircleDotIcon, InboxIcon } from "lucide-react"

import { Button } from "@/components/ui-next/button"
import { Card, CardContent } from "@/components/ui-next/card"
import { cn } from "@/lib/utils"

export type KanbanColumnVisual = {
  /**
   * Classe Tailwind `bg-*` (es. `bg-red-400`) per la striscia accent sul top
   * della colonna. La striscia e un rettangolo assoluto clippato dal
   * border-radius della colonna (overflow-hidden), non un border CSS.
   * Stringa vuota = nessuna striscia.
   */
  columnClassName: string
  headerClassName: string
  iconClassName: string
}

type KanbanColumnShellProps = {
  columnId: string
  title: string
  countLabel: string
  visual: KanbanColumnVisual
  headerIcon?: React.ReactNode
  headerLayout?: "inline" | "stacked"
  isDropTarget?: boolean
  widthClassName?: string
  density?: "comfortable" | "compact"
  /**
   * Testo mostrato dentro l'empty-state di default quando la colonna non ha
   * children renderizzati. Default: "Nessun elemento".
   */
  emptyMessage?: string
  /** Override completo dell'empty-state. Se passato, ha precedenza su emptyMessage. */
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
  visual,
  headerIcon,
  headerLayout = "inline",
  isDropTarget = false,
  widthClassName = "w-[300px]",
  density = "comfortable",
  emptyMessage = "Nessun elemento",
  emptyState,
  children,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
}: KanbanColumnShellProps) {
  const isCompact = density === "compact"
  const isInline = headerLayout === "inline"
  // Usa toArray invece di count: count include i null (es. da `cond ? <X /> : null`),
  // toArray li filtra. Questo permette ai consumer di mescolare expression
  // condizionali con map() senza inquinare il rilevamento dell'empty-state.
  const isContentEmpty = React.Children.toArray(children).length === 0
  const renderedEmptyState =
    emptyState ?? (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 px-4 py-8">
        <InboxIcon className="size-5 text-muted-foreground/70" />
        <p className="text-sm text-muted-foreground/70">{emptyMessage}</p>
      </div>
    )

  const renderedIcon =
    headerIcon ??
    (isInline ? (
      <span
        className={cn(
          "shrink-0 rounded-full bg-current",
          isCompact ? "size-1.5" : "size-2",
          visual.iconClassName,
        )}
      />
    ) : (
      <CircleDotIcon className={cn(isCompact ? "size-3.5 pt-0.5" : "size-4 pt-0.5", visual.iconClassName)} />
    ))

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-white flex h-full shrink-0 flex-col rounded-xl border transition-all duration-150",
        widthClassName,
        isDropTarget && "ring-primary/50 scale-[1.02] ring-2 shadow-md"
      )}
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
      {visual.columnClassName ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-0 left-0 right-0 h-[4px]",
            visual.columnClassName,
          )}
        />
      ) : null}
      {isInline ? (
        <div
          className={cn(
            visual.headerClassName,
            "flex items-center gap-2",
            isCompact ? "px-3.5 py-3" : "px-4 py-3.5",
          )}
        >
          {renderedIcon}
          <h2
            className={cn(
              "text-foreground min-w-0 flex-1 truncate font-semibold",
              isCompact ? "text-sm leading-5" : "text-[15px] leading-5",
            )}
          >
            {title}
          </h2>
          <span
            className={cn(
              "bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 font-medium",
              isCompact ? "text-[10px]" : "text-[11px]",
            )}
          >
            {countLabel}
          </span>
        </div>
      ) : (
        <div
          className={cn(
            visual.headerClassName,
            isCompact ? "space-y-1 px-3 py-2.5" : "space-y-1 px-3.5 py-3",
          )}
        >
          <div className="flex items-start gap-2">
            {renderedIcon}
            <h2
              className={cn(
                "text-foreground font-semibold",
                isCompact ? "min-h-8 text-sm leading-5 line-clamp-2" : "min-h-9 text-[15px] leading-5 line-clamp-2",
              )}
            >
              {title}
            </h2>
          </div>
          <p className={cn("text-muted-foreground", isCompact ? "text-[11px]" : "text-xs")}>{countLabel}</p>
        </div>
      )}

      <div className={cn("min-h-0 flex-1 overflow-y-auto", isCompact ? "space-y-2.5 p-3" : "space-y-3 p-3")}>
        {isContentEmpty ? renderedEmptyState : children}
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
  widthClassName = "w-[300px]",
  density = "comfortable",
  cardCount = 2,
  showBadgeRow = false,
}: KanbanColumnSkeletonProps) {
  const isCompact = density === "compact"

  return (
    <div className={cn("border-border bg-muted/40 shrink-0 rounded-xl border", widthClassName)}>
      <div className={cn("space-y-1 border-b", isCompact ? "px-3 py-2.5" : "px-3.5 py-3")}>
        <div className={cn("bg-muted animate-pulse rounded", isCompact ? "h-4 w-28" : "h-5 w-32")} />
        <div className={cn("bg-muted animate-pulse rounded", isCompact ? "h-3.5 w-14" : "h-4 w-16")} />
      </div>
      <div className={cn(isCompact ? "space-y-2 p-2.5" : "space-y-2.5 p-2.5")}>
        {Array.from({ length: cardCount }).map((_, index) => (
          <Card key={index} className={cn(isCompact ? "py-1.5" : "py-2")}>
            <CardContent className={cn(isCompact ? "space-y-1.5 px-3" : "space-y-2 px-3")}>
              <div className={cn("bg-muted animate-pulse rounded", isCompact ? "h-3.5 w-24" : "h-4 w-28")} />
              {showBadgeRow ? (
                <div className={cn("bg-muted animate-pulse rounded-full", isCompact ? "h-4 w-20" : "h-5 w-24")} />
              ) : null}
              <div className={cn("border-t", isCompact ? "space-y-1 pt-1.5" : "space-y-1.5 pt-2")}>
                <div className="bg-muted h-3 w-full animate-pulse rounded" />
                <div className="bg-muted h-3 w-11/12 animate-pulse rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

type KanbanDeferredColumnActionProps = {
  label: string
  loadingLabel?: string
  isLoading?: boolean
  onClick: () => void
}

export function KanbanDeferredColumnAction({
  label,
  loadingLabel = "Caricamento...",
  isLoading = false,
  onClick,
}: KanbanDeferredColumnActionProps) {
  return (
    <Button
      variant="outline"
      className="w-full"
      disabled={isLoading}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      {isLoading ? loadingLabel : label}
    </Button>
  )
}
