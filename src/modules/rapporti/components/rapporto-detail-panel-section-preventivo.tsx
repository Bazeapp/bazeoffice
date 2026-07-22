import { ExternalLinkIcon, FileTextIcon } from "lucide-react"

import {
  DetailFieldControl,
  DetailSectionBlock,
} from "@/components/shared-next/detail-section-card"
import { FieldInput } from "@/components/forms/field-components"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { ProcessoMatchingRecord, RichiestaAttivazioneRecord } from "@/types"

import { RapportoDetailPanelFieldScontoSelect } from "./rapporto-detail-panel-field-sconto-select"

type RapportoDetailPanelSectionPreventivoProps = {
  sectionRef: (element: HTMLDivElement | null) => void
  loadingRelated: boolean
  richiestaAttivazione: RichiestaAttivazioneRecord | null
  currentProcesso: ProcessoMatchingRecord | null
}

export function RapportoDetailPanelSectionPreventivo({
  sectionRef,
  loadingRelated,
  richiestaAttivazione,
  currentProcesso,
}: RapportoDetailPanelSectionPreventivoProps) {
  return (
    <div ref={sectionRef}>
      <DetailSectionBlock
        title="Preventivo collegato"
        icon={<FileTextIcon className="size-5" />}
      >
        {loadingRelated ? (
          <div className="grid gap-3 md:grid-cols-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <DetailFieldControl label="Fee concordata">
              <FieldInput
                name="fee_concordata"
                type="number"
                step="0.01"
                disabled={!richiestaAttivazione?.id}
                placeholder="-"
              />
            </DetailFieldControl>
            <div className="rounded-lg border bg-surface px-3 py-2">
              <p className="ui-type-label mb-2">URL origine</p>
              {currentProcesso?.source_url ? (
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={currentProcesso.source_url} target="_blank" rel="noreferrer">
                    Apri URL origine
                    <ExternalLinkIcon className="ml-2 size-4" />
                  </a>
                </Button>
              ) : (
                <span className="text-muted-foreground text-sm">-</span>
              )}
            </div>
            <DetailFieldControl label="Sconto applicato">
              <RapportoDetailPanelFieldScontoSelect
                name="offerta"
                disabled={!currentProcesso?.id}
                placeholder="Seleziona sconto"
              />
            </DetailFieldControl>
          </div>
        )}
      </DetailSectionBlock>
    </div>
  )
}
