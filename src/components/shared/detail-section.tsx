/**
 * DetailSection — nuova anatomy (SectionHead inline dentro una singola Card).
 * Sostituisce il pattern "banner accent/5 + card separata con CSS hidden header" di DetailSectionBlock (OSS-08).
 * Questo file è la NUOVA versione che convive temporaneamente con detail-section-card.tsx.
 * Vedi spec `outputs/04_spec/shared/detail-section-block.md`.
 */
import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { ChevronDownIcon, PencilIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type DetailSectionProps = {
  title: React.ReactNode
  icon?: LucideIcon
  hint?: React.ReactNode
  action?: React.ReactNode
  onActionClick?: () => void
  actionLabel?: string
  showDefaultAction?: boolean
  collapsible?: boolean
  defaultOpen?: boolean
  children?: React.ReactNode
  className?: string
  contentClassName?: string
}

export function DetailSection({
  title,
  icon: Icon,
  hint,
  action,
  onActionClick,
  actionLabel = "Modifica sezione",
  showDefaultAction = true,
  collapsible = false,
  defaultOpen = true,
  children,
  className,
  contentClassName,
}: DetailSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  const headingId = React.useId()

  const resolvedAction =
    action ??
    (showDefaultAction ? (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={actionLabel}
        title={actionLabel}
        disabled={!onActionClick}
        onClick={onActionClick}
      >
        <PencilIcon className="size-4" />
      </Button>
    ) : null)

  const chevron = collapsible ? (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={isOpen ? "Comprimi sezione" : "Espandi sezione"}
      onClick={() => setIsOpen((v) => !v)}
    >
      <ChevronDownIcon
        className={cn("size-4 transition-transform", !isOpen && "-rotate-90")}
      />
    </Button>
  ) : null

  return (
    <Card
      className={cn("gap-0 overflow-hidden", className)}
      role="region"
      aria-labelledby={headingId}
    >
      {/* SectionHead inline */}
      <div className="flex items-center gap-2.5 border-b border-border/60 px-3.5 pb-3 pt-3">
        {Icon ? (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-[color-mix(in_oklch,var(--primary)_10%,white)] text-[color:var(--primary)]">
            <Icon className="size-3.5" />
          </span>
        ) : null}
        <h3
          id={headingId}
          className="ui-type-section flex-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-foreground/70"
        >
          {title}
        </h3>
        {hint ? (
          <span className="ui-type-meta text-[12px] text-muted-foreground">{hint}</span>
        ) : null}
        {resolvedAction ? <span className="shrink-0">{resolvedAction}</span> : null}
        {chevron}
      </div>

      {/* Body */}
      {isOpen ? (
        <CardContent className={cn("space-y-3 p-3.5", contentClassName)}>
          {children}
        </CardContent>
      ) : null}
    </Card>
  )
}
