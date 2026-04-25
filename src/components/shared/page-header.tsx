/**
 * PageHeader — header di una pagina backoffice con title + count + actions.
 * Vedi spec `outputs/04_spec/shared/page-header.md`.
 */
import * as React from "react"

import { cn } from "@/lib/utils"

type PageHeaderProps = {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  compact?: boolean
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  compact = false,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-border bg-background",
        compact ? "px-5 py-2.5" : "px-6 py-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h1
          className={cn(
            "truncate font-semibold text-foreground",
            compact ? "text-[15.5px]" : "text-[17px]",
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="ui-type-meta mt-0.5 truncate text-[12px] text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}
