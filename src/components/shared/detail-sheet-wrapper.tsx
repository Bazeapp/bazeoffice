import * as React from "react"
import { LoaderCircleIcon } from "lucide-react"

import { DetailSheet, DetailSheetBody, DetailSheetHeader } from "@/components/shared/detail-sheet"
import { cn } from "@/lib/utils"

export type DetailSheetWrapperProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: React.ReactNode
  rightSlot?: React.ReactNode
  onClose?: () => void
  widthClass?: string
  children: React.ReactNode
  isLoading?: boolean
  error?: string | null
  footerSlot?: React.ReactNode
}

export function DetailSheetWrapper({
  open,
  onOpenChange,
  title,
  subtitle,
  rightSlot,
  onClose,
  widthClass,
  children,
  isLoading = false,
  error,
  footerSlot,
}: DetailSheetWrapperProps) {
  const handleClose = onClose ?? (() => onOpenChange(false))

  return (
    <DetailSheet open={open} onOpenChange={onOpenChange} widthClass={widthClass}>
      <DetailSheetHeader
        title={title}
        subtitle={subtitle}
        onClose={handleClose}
        rightSlot={rightSlot}
      />

      {error ? (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <DetailSheetBody>
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <LoaderCircleIcon className="size-5 animate-spin" />
          </div>
        ) : (
          children
        )}
      </DetailSheetBody>

      {footerSlot ? (
        <div
          className={cn(
            "shrink-0 border-t border-border bg-surface-raised px-5 py-3",
            "shadow-elevation-xs flex items-center gap-2",
          )}
        >
          {footerSlot}
        </div>
      ) : null}
    </DetailSheet>
  )
}
