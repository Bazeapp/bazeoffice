import { PlusIcon } from "lucide-react"

import { RicercaActiveSearchCard } from "@/modules/ricerca/components"
import { Button } from "@/components/ui/button"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { WorkerRelatedSearchItem } from "../lib/cerca-utils"
import type { LavoratoriCercaDetailProcessiProps } from "./lavoratori-cerca-detail.types"

type RelatedSearchesGroupProps = {
  tab: "direct" | "other"
  groupLabel: string
  groupItems: WorkerRelatedSearchItem[]
  getSelectionStateClassName: (value: string) => string
  onOpenRicerca: (processId: string) => void
}

function RelatedSearchesGroup({
  tab,
  groupLabel,
  groupItems,
  getSelectionStateClassName,
  onOpenRicerca,
}: RelatedSearchesGroupProps) {
  return (
    <AccordionItem
      key={`${tab}-${groupLabel}`}
      value={`${tab}-${groupLabel}`}
      className="overflow-hidden rounded-xl border border-border/70 bg-background"
    >
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <div className="flex min-w-0 items-center gap-2 text-left">
          <div
            className={`rounded-full border px-2 py-0.5 text-2xs font-medium ${getSelectionStateClassName(groupLabel)}`}
          >
            {groupLabel}
          </div>
          <span className="text-muted-foreground text-xs">
            {groupItems.length} {groupItems.length === 1 ? "ricerca" : "ricerche"}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-2 px-4 pb-4">
        {groupItems.map((item) => (
          <RicercaActiveSearchCard
            key={item.selectionId}
            data={item.boardCard}
            className="cursor-pointer"
            onClick={() => onOpenRicerca(item.processId)}
          />
        ))}
      </AccordionContent>
    </AccordionItem>
  )
}

export function LavoratoriCercaDetailProcessi({
  setWorkerSectionRef,
  setIsAddSearchDialogOpen,
  selectedWorkerId,
  loadingRelatedActiveSearches,
  relatedActiveSearches,
  groupedDirectRelatedSearches,
  groupedOtherRelatedSearches,
  getSelectionStateClassName,
  openRicercaDetailFromWorker,
}: LavoratoriCercaDetailProcessiProps) {
  return (
    <div ref={setWorkerSectionRef("processi")}>
      <DetailSectionBlock
        title="Ricerche coinvolte"
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAddSearchDialogOpen(true)}
            disabled={!selectedWorkerId}
          >
            <PlusIcon className="size-4" />
            Aggiungi ad una ricerca
          </Button>
        }
        contentClassName="space-y-2"
      >
        {loadingRelatedActiveSearches ? (
          <p className="text-muted-foreground text-sm">Caricamento ricerche coinvolte...</p>
        ) : relatedActiveSearches.direct.length === 0 &&
          relatedActiveSearches.other.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nessuna ricerca coinvolta.</p>
        ) : (
          <Tabs defaultValue="direct" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="direct" className="gap-2">
                Coinvolto direttamente
                <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px]">
                  {relatedActiveSearches.direct.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="other" className="gap-2">
                Tutte le altre ricerche
                <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px]">
                  {relatedActiveSearches.other.length}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="direct" className="mt-0">
              {groupedDirectRelatedSearches.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nessun coinvolgimento diretto.</p>
              ) : (
                <Accordion
                  type="multiple"
                  defaultValue={groupedDirectRelatedSearches.map(
                    ([groupLabel]) => `direct-${groupLabel}`,
                  )}
                  className="space-y-3"
                >
                  {groupedDirectRelatedSearches.map(([groupLabel, groupItems]) => (
                    <RelatedSearchesGroup
                      key={`direct-${groupLabel}`}
                      tab="direct"
                      groupLabel={groupLabel}
                      groupItems={groupItems}
                      getSelectionStateClassName={getSelectionStateClassName}
                      onOpenRicerca={openRicercaDetailFromWorker}
                    />
                  ))}
                </Accordion>
              )}
            </TabsContent>

            <TabsContent value="other" className="mt-0">
              {groupedOtherRelatedSearches.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nessun'altra ricerca rilevante.</p>
              ) : (
                <Accordion
                  type="multiple"
                  defaultValue={groupedOtherRelatedSearches.map(
                    ([groupLabel]) => `other-${groupLabel}`,
                  )}
                  className="space-y-3"
                >
                  {groupedOtherRelatedSearches.map(([groupLabel, groupItems]) => (
                    <RelatedSearchesGroup
                      key={`other-${groupLabel}`}
                      tab="other"
                      groupLabel={groupLabel}
                      groupItems={groupItems}
                      getSelectionStateClassName={getSelectionStateClassName}
                      onOpenRicerca={openRicercaDetailFromWorker}
                    />
                  ))}
                </Accordion>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DetailSectionBlock>
    </div>
  )
}
