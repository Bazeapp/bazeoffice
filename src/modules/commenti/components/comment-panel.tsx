import * as React from "react"
import { createPortal } from "react-dom"
import { DismissableLayerBranch } from "@radix-ui/react-dismissable-layer"
import { FocusScope } from "@radix-ui/react-focus-scope"
import { ChevronDownIcon, MessageSquareIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type CommentPanelProps = {
  count: number
  countLoading?: boolean
  expanded: boolean
  onToggleExpanded: () => void
  onClose: () => void
  children?: React.ReactNode
}

/**
 * Floating comments UI: an always-visible pill anchored bottom-right plus a
 * panel that opens right above it. Rendered in a portal so page overlays and
 * transformed ancestors can never hide or reposition it.
 */
export function CommentPanel({
  count,
  countLoading = false,
  expanded,
  onToggleExpanded,
  onClose,
  children,
}: CommentPanelProps) {
  const stopScrollLockPropagation = React.useCallback(
    (event: React.WheelEvent | React.TouchEvent) => {
      event.stopPropagation()
    },
    [],
  )

  return createPortal(
  <DismissableLayerBranch
    className="pointer-events-none fixed inset-0 isolate z-100"
    data-testid="comments-panel-root"
  >
    {expanded ? (
      <FocusScope
        trapped={false}
        data-testid="comments-panel"
        onWheel={stopScrollLockPropagation}
        onTouchMove={stopScrollLockPropagation}
        className={cn(
          "pointer-events-auto fixed right-4 bottom-18 z-60 flex flex-col overflow-hidden",
          "h-[min(70vh,660px)] w-[min(440px,calc(100vw-2rem))]",
          "rounded-xl border border-border bg-surface shadow-xl",
          "text-sm text-foreground-strong",
        )}
        role="dialog"
        aria-label="Commenti"
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-border-subtle bg-surface px-4 py-3.5">
          <MessageSquareIcon
            aria-hidden
            className="size-4 shrink-0 text-foreground-subtle"
            strokeWidth={2}
          />
          <h2 className="text-lg font-bold">
            Commenti <span className="text-foreground-faint">·</span>{" "}
            <span className="text-foreground-subtle">{countLoading ? "…" : count}</span>
          </h2>
          <button
            type="button"
            data-testid="comments-panel-close"
            className="ml-auto flex size-6.5 items-center justify-center rounded-sm text-foreground-faint transition-colors hover:bg-surface-muted"
            onClick={onClose}
            aria-label="Chiudi pannello commenti"
          >
            <ChevronDownIcon className="size-4" />
          </button>
        </header>
        {children}
      </FocusScope>
    ) : null}

    <button
      type="button"
      data-testid="comments-pill"
      className={cn(
        "pointer-events-auto fixed right-4 bottom-4 z-100 flex items-center gap-2 rounded-full",
        "bg-foreground-strong px-4.5 py-3 text-lg font-medium text-foreground-on-accent",
        "shadow-lg transition-colors",
        "cursor-pointer hover:bg-neutral-900",
      )}
      onClick={onToggleExpanded}
      aria-expanded={expanded}
      aria-label={expanded ? "Chiudi commenti" : "Apri commenti"}
    >
      <MessageSquareIcon aria-hidden className="size-4" strokeWidth={2} />
      <span>{countLoading ? "…" : count}</span>
    </button>
  </DismissableLayerBranch>,
    document.body,
  )
}
