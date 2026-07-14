import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type CommentPanelProps = {
  count: number
  countLoading?: boolean
  expanded: boolean
  onToggleExpanded: () => void
  onClose: () => void
  anchorRef?: React.RefObject<HTMLElement | null>
  children?: React.ReactNode
}

function useAnchorPositionStyle(anchorRef?: React.RefObject<HTMLElement | null>) {
  const [style, setStyle] = React.useState<React.CSSProperties>({
    position: "fixed",
    right: "1rem",
    bottom: "1rem",
  })

  React.useEffect(() => {
    const anchor = anchorRef?.current
    if (!anchor) {
      setStyle({ position: "fixed", right: "1rem", bottom: "1rem" })
      return
    }

    const updatePosition = () => {
      const rect = anchor.getBoundingClientRect()
      const panelWidth = 440
      const left = Math.min(
        Math.max(rect.right - panelWidth, 16),
        window.innerWidth - panelWidth - 16,
      )
      setStyle({
        position: "fixed",
        top: `${Math.max(rect.top + 16, 16)}px`,
        left: `${left}px`,
        width: `${panelWidth}px`,
      })
    }

    updatePosition()
    window.addEventListener("resize", updatePosition)
    window.addEventListener("scroll", updatePosition, true)
    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition, true)
    }
  }, [anchorRef])

  return style
}

export function CommentPanel({
  count,
  countLoading = false,
  expanded,
  onToggleExpanded,
  onClose,
  anchorRef,
  children,
}: CommentPanelProps) {
  const anchorStyle = useAnchorPositionStyle(anchorRef)

  if (!expanded) {
    return (
      <div
        className="z-[45] pointer-events-none"
        style={{
          position: "fixed",
          right: "1rem",
          bottom: "1rem",
        }}
      >
        <Button
          type="button"
          data-testid="comments-pill"
          className="pointer-events-auto h-10 rounded-full px-4 shadow-(--shadow-lg)"
          onClick={onToggleExpanded}
          aria-expanded={false}
          aria-label="Apri commenti"
        >
          <span aria-hidden>💬</span>
          <span>{countLoading ? "…" : count}</span>
        </Button>
      </div>
    )
  }

  return (
    <div
      data-testid="comments-panel"
      className={cn(
        "z-[45] flex max-h-[min(70vh,640px)] flex-col overflow-hidden",
        "rounded-xl border border-border bg-surface shadow-(--shadow-xl)",
      )}
      style={anchorStyle}
      role="dialog"
      aria-label="Commenti"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">
          💬 Commenti · {countLoading ? "…" : count}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          data-testid="comments-panel-close"
          onClick={onClose}
          aria-label="Chiudi pannello commenti"
        >
          <ChevronDownIcon className="size-4" />
        </Button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4" data-testid="comments-panel-body">
        {children}
      </div>
    </div>
  )
}
