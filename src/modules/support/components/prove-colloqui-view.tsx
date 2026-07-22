import { SectionHeader } from "@/components/shared-next/section-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { ProveColloquiViewTab } from "../lib/prove-colloqui-view.constants"
import {
  useProveColloquiView,
  type ProveColloquiViewProps,
} from "../hooks/use-prove-colloqui-view"
import { ProveColloquiCalendar } from "./prove-colloqui-calendar"
import { ProveColloquiColloquioSheet } from "./prove-colloqui-colloquio-sheet"
import { ProveColloquiKanban } from "./prove-colloqui-kanban"
import { ProveColloquiProvaSheet } from "./prove-colloqui-prova-sheet"

export type { ProveColloquiViewProps } from "../hooks/use-prove-colloqui-view"

export function ProveColloquiView(props: ProveColloquiViewProps) {
  const view = useProveColloquiView(props)

  return (
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <SectionHeader>
        <SectionHeader.Title badge={<Badge>{view.header.badgeLabel}</Badge>}>
          Prove e Colloqui
        </SectionHeader.Title>
        <SectionHeader.Actions>
          <Tabs
            value={view.activeTab}
            onValueChange={(next) => view.setActiveTab(next as ProveColloquiViewTab)}
          >
            <TabsList variant="segmented">
              <TabsTrigger value="prove">Prove</TabsTrigger>
              <TabsTrigger value="colloqui">Colloqui</TabsTrigger>
            </TabsList>
          </Tabs>
        </SectionHeader.Actions>
        <SectionHeader.Toolbar>
          <div className="min-w-0 flex-1 max-w-120">
            <SearchInput
              data-testid="prove-colloqui-search-input"
              placeholder="Cerca famiglia, lavoratore, email..."
              value={view.searchQuery}
              onChange={(event) => view.setSearchQuery(event.target.value)}
              onClear={() => view.setSearchQuery("")}
            />
          </div>
          {view.header.showRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={view.reload}>
              Riprova
            </Button>
          ) : null}
        </SectionHeader.Toolbar>
      </SectionHeader>

      {view.error ? (
        <div className="mx-6 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Errore caricamento: {view.error}
        </div>
      ) : null}

      {view.activeTab === "prove" ? (
        <ProveColloquiKanban {...view.kanban} />
      ) : (
        <ProveColloquiCalendar {...view.calendar} />
      )}

      <ProveColloquiProvaSheet
        key={view.provaSheet.selectedCardId ?? "__empty__"}
        card={view.provaSheet.card}
        statusOptions={view.provaSheet.statusOptions}
        feedbackFamigliaOptions={view.provaSheet.feedbackFamigliaOptions}
        feedbackLavoratoreOptions={view.provaSheet.feedbackLavoratoreOptions}
        ramoD2Options={view.provaSheet.ramoD2Options}
        lookupColorsByDomain={view.provaSheet.lookupColorsByDomain}
        open={view.provaSheet.open}
        onOpenChange={view.provaSheet.onOpenChange}
        patchRapporto={view.provaSheet.patchRapporto}
      />

      <ProveColloquiColloquioSheet {...view.colloquioSheet} />
    </section>
  )
}
