import type { ReactNode } from "react"
import { PanelLeftOpenIcon } from "lucide-react"

import { Accordion } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  RicercaDetailViewSidebarSummary,
  type RicercaDetailSidebarSummaryProps,
} from "./ricerca-detail-view-sidebar-summary"

type Props = {
  isSidebarCollapsed: boolean
  setIsSidebarCollapsed: (collapsed: boolean) => void
  summary: Omit<RicercaDetailSidebarSummaryProps, "onCollapse">
  children: ReactNode
}

export function RicercaDetailViewSidebar({
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  summary,
  children,
}: Props) {
  if (isSidebarCollapsed) {
    return (
      <div className="flex h-full min-h-0 shrink-0 items-start justify-center rounded-lg border border-border-subtle bg-surface p-1 shadow-[0_1px_1px_rgba(0,0,0,0.02),0_2px_4px_rgba(0,0,0,0.04)]">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Espandi dettagli famiglia"
          title="Espandi dettagli famiglia"
          onClick={() => setIsSidebarCollapsed(false)}
        >
          <PanelLeftOpenIcon />
        </Button>
      </div>
    )
  }

  return (
    <aside className="flex min-h-0 flex-col overflow-y-auto rounded-lg border border-border-subtle bg-surface p-4 shadow-[0_1px_1px_rgba(0,0,0,0.02),0_2px_4px_rgba(0,0,0,0.04)]">
      <div className="space-y-4">
        <RicercaDetailViewSidebarSummary
          {...summary}
          onCollapse={() => setIsSidebarCollapsed(true)}
        />
        <Accordion type="multiple" tone="flush" defaultValue={["orari"]}>
          {children}
        </Accordion>
      </div>
    </aside>
  )
}
