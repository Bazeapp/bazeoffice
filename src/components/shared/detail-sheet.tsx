import * as React from "react"
import { XIcon } from "lucide-react"

import { Sheet, SheetContent } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// DetailSheet — unified right-side panel wrapper used by all detail modals.
//
// Width notes:
//   Default widthClass matches the current Repo A convention (≤980px wide modal).
//   Lovable reference uses "w-full sm:max-w-xl" (~512px) for a narrower panel.
//   TODO (Step 6b+): migrate individual detail modals to a narrower widthClass
//   once the panel content is reworked to fit the compact Lovable layout.
// ─────────────────────────────────────────────────────────────────────────────

type DetailSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  /**
   * Tailwind width class(es) for the sheet panel.
   * Default: "w-[min(96vw,980px)] max-w-none" — preserves current Repo A width.
   * Pass e.g. "w-full sm:max-w-xl" to use the narrower Lovable-style panel.
   */
  widthClass?: string
}

export function DetailSheet({
  open,
  onOpenChange,
  children,
  widthClass = "w-[min(96vw,980px)] max-w-none",
}: DetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          "p-0 flex flex-col gap-0 overflow-hidden bg-surface shadow-elevation-xl",
          widthClass,
        )}
      >
        {children}
      </SheetContent>
    </Sheet>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DetailSheetHeader — sticky header with title, optional subtitle, close button.
// ─────────────────────────────────────────────────────────────────────────────

type DetailSheetHeaderProps = {
  /** Primary title — displayed as `text-[14px] font-bold`. */
  title: string
  /**
   * Optional subtitle content rendered below the title row.
   * Use inline elements or fragments (e.g. `<><CalendarIcon /> dal 01/01/2024</>`).
   */
  subtitle?: React.ReactNode
  onClose: () => void
  /**
   * Optional slot rendered below the title block (e.g. status `<Select>`, badges).
   * Gets `mt-3` top spacing automatically.
   */
  rightSlot?: React.ReactNode
  className?: string
}

export function DetailSheetHeader({
  title,
  subtitle,
  onClose,
  rightSlot,
  className,
}: DetailSheetHeaderProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 shrink-0",
        "bg-surface-raised border-b border-border shadow-elevation-xs",
        className,
      )}
    >
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[14px] font-bold text-foreground leading-tight truncate">
              {title}
            </h2>
            {subtitle ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                {subtitle}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="shrink-0 p-1.5 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-surface-inset"
          >
            <XIcon className="size-4" />
          </button>
        </div>
        {rightSlot ? <div className="mt-3">{rightSlot}</div> : null}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DetailSheetBody — scrollable content area.
// ─────────────────────────────────────────────────────────────────────────────

type DetailSheetBodyProps = {
  children: React.ReactNode
  className?: string
}

export function DetailSheetBody({ children, className }: DetailSheetBodyProps) {
  return (
    <div className={cn("flex-1 overflow-y-auto bg-surface", className)}>
      <div className="px-5 py-5 space-y-0">
        {children}
      </div>
    </div>
  )
}
