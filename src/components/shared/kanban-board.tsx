/**
 * KanbanBoard — contenitore orizzontale scroll per colonne Kanban.
 * Vedi spec `outputs/04_spec/shared/kanban-board.md`.
 */
import * as React from "react"

import { cn } from "@/lib/utils"

type KanbanBoardProps = React.ComponentPropsWithoutRef<"div"> & {
  /** ARIA label del container */
  ariaLabel?: string
}

export function KanbanBoard({
  ariaLabel = "Kanban board",
  className,
  children,
  ...rest
}: KanbanBoardProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "relative min-h-0 flex-1 overflow-x-auto overflow-y-hidden",
        className,
      )}
      {...rest}
    >
      <div className="flex h-full min-w-max gap-4 px-6 py-4">{children}</div>
    </div>
  )
}
