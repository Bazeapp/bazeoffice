import * as React from "react"
import { createPortal } from "react-dom"
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
  return createPortal(
    <>
      {expanded ? (
        <div
          data-testid="comments-panel"
          className={cn(
            "fixed right-4 bottom-18 z-60 flex flex-col overflow-hidden",
            "h-[min(70vh,660px)] w-[min(440px,calc(100vw-2rem))]",
            "rounded-[14px] border border-[#e7e9ee] bg-white",
            "shadow-[0_20px_50px_rgba(15,23,42,0.20)]",
            "text-[13.5px] text-[#1a1f2e]",
          )}
          role="dialog"
          aria-label="Commenti"
        >
          <header className="flex shrink-0 items-center gap-2 border-b border-[#eef0f3] bg-white px-4 py-3.5">
            <span aria-hidden className="text-[15px] leading-none">
              💬
            </span>
            <h2 className="text-[15px] font-bold">
              Commenti <span className="text-[#c4c9d2]">·</span>{" "}
              <span className="text-[#6b7280]">{countLoading ? "…" : count}</span>
            </h2>
            <button
              type="button"
              data-testid="comments-panel-close"
              className="ml-auto flex size-6.5 items-center justify-center rounded-[7px] text-[#9ca3af] transition-colors hover:bg-[#f3f4f6]"
              onClick={onClose}
              aria-label="Chiudi pannello commenti"
            >
              <ChevronDownIcon className="size-4" />
            </button>
          </header>
          {children}
        </div>
      ) : null}

      <button
        type="button"
        data-testid="comments-pill"
        className={cn(
          "fixed right-4 bottom-4 z-100 flex items-center gap-2 rounded-full",
          "bg-[#1a1f2e] px-4.5 py-3 text-[15px] font-semibold text-white",
          "shadow-[0_10px_28px_rgba(15,23,42,0.32)] transition-colors",
          "cursor-pointer hover:bg-[#111827]",
        )}
        onClick={onToggleExpanded}
        aria-expanded={expanded}
        aria-label={expanded ? "Chiudi commenti" : "Apri commenti"}
      >
        <MessageSquareIcon aria-hidden className="size-4" strokeWidth={2} />
        <span>{countLoading ? "…" : count}</span>
      </button>
    </>,
    document.body,
  )
}
