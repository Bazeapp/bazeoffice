import * as React from "react"
import type { ComponentProps } from "react"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type PageHeaderProps = {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  searchSlot?: React.ReactNode
  actionsSlot?: React.ReactNode
  statsSlot?: React.ReactNode
  filterContent?: React.ReactNode
}

export function PageHeader({
  title,
  subtitle,
  searchSlot,
  actionsSlot,
  statsSlot,
  filterContent,
}: PageHeaderProps) {
  return (
    <div className="-mx-3 -mt-3 border-b border-border bg-surface-raised shrink-0 shadow-elevation-xs">
      {/* Main row */}
      <div className="px-5 py-3.5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[16px] font-bold text-foreground leading-tight tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>

        {(searchSlot || actionsSlot) && (
          <div className="flex items-center gap-2.5 shrink-0">
            {searchSlot}
            {actionsSlot}
          </div>
        )}
      </div>

      {/* Stats row */}
      {statsSlot && (
        <div className="px-5 pb-3.5 flex items-center gap-3">
          {statsSlot}
        </div>
      )}

      {/* Filter panel row */}
      {filterContent && (
        <div className="px-5 pb-3 flex items-center gap-3 flex-wrap border-t border-border/40 pt-3 bg-surface/50">
          {filterContent}
        </div>
      )}
    </div>
  )
}

export function PageHeaderSearch({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <div className="relative w-56">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
      <Input
        className={cn(
          "pl-9 h-9 text-[12px] bg-surface-inset border-border/60 focus:bg-surface-raised transition-colors",
          className
        )}
        {...props}
      />
    </div>
  )
}

export function PageHeaderSecondaryButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("h-9 text-[11px] gap-1.5 font-medium", className)}
      {...props}
    />
  )
}

export function PageHeaderPrimaryButton({ className, ...props }: ComponentProps<typeof Button>) {
  return (
    <Button
      variant="default"
      size="sm"
      className={cn("h-8 text-[11px] gap-1.5", className)}
      {...props}
    />
  )
}
