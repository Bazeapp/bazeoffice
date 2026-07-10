import {
  ArrowRightIcon,
  CheckCircle2Icon,
  FileTextIcon,
  OctagonAlertIcon,
  UsersIcon,
} from "lucide-react"

import { AttachmentUploadSlot } from "@/components/shared-next/attachment-upload-slot"
import type { AttachmentLink } from "@/components/shared-next/attachment-utils"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { LavoratoreRecord, ProcessoMatchingRecord, RapportoLavorativoRecord } from "@/types"
import { buildPathForRoute } from "@/routes/app-routes"

import type { RapportoDetailGestioneView } from "../lib/rapporto-detail-panel.mappers"
import {
  RapportoDetailPanelListRowCard,
  RapportoDetailPanelRelatedPersonCard,
} from "./rapporto-detail-panel-shared"
import { RapportoDetailPanelRelatedRecordsSkeleton } from "./rapporto-detail-panel-states"

type RapportoAttachmentSlot =
  | "accordo_di_lavoro_allegati"
  | "ricevuta_inps_allegati"
  | "delega_inps_allegati"

type RapportoDetailPanelSectionGestioneProps = {
  sectionRef: (element: HTMLDivElement | null) => void
  loadingRelated: boolean
  rapporto: RapportoLavorativoRecord
  rapportoView: RapportoLavorativoRecord
  lavoratore: LavoratoreRecord | null
  processi: ProcessoMatchingRecord[]
  gestione: RapportoDetailGestioneView
  uploadingSlot: string | null
  uploadError: string | null
  onUpload: (slot: RapportoAttachmentSlot, file: File) => void
  onPreviewOpen: (preview: AttachmentLink) => void
}

export function RapportoDetailPanelSectionGestione({
  sectionRef,
  loadingRelated,
  rapporto,
  rapportoView,
  lavoratore,
  processi,
  gestione,
  uploadingSlot,
  uploadError,
  onUpload,
  onPreviewOpen,
}: RapportoDetailPanelSectionGestioneProps) {
  return (
    <div ref={sectionRef}>
      <DetailSectionBlock
        title="Datore e lavoratore"
        icon={<UsersIcon className="size-5" />}
      >
        {loadingRelated ? (
          <RapportoDetailPanelRelatedRecordsSkeleton />
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <RapportoDetailPanelRelatedPersonCard
                role="Datore"
                name={gestione.familyName}
                email={gestione.familyEmail}
                phone={gestione.familyPhone}
                href={
                  rapporto.id
                    ? buildPathForRoute({
                        mainSection: "gestione_contrattuale_assunzioni",
                        anagraficheTab: "famiglie",
                        ricercaProcessId: null,
                        selectedAssunzioneRapportoId: rapporto.id,
                      })
                    : undefined
                }
              />
              <RapportoDetailPanelRelatedPersonCard
                role="Lavoratore"
                name={gestione.workerName}
                email={gestione.workerEmail}
                phone={gestione.workerPhone}
                details={[
                  { label: "IBAN", value: gestione.workerIban },
                  { label: "Stripe", value: gestione.workerStripeId },
                ]}
                href={
                  lavoratore
                    ? buildPathForRoute({
                        mainSection: "lavoratori_cerca",
                        anagraficheTab: "famiglie",
                        ricercaProcessId: null,
                        selectedWorkerId: lavoratore.id,
                      })
                    : undefined
                }
              />
            </div>

            <Separator className="bg-border/60" />

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileTextIcon className="text-muted-foreground size-4" />
                  <span className="text-2xs font-semibold">Accordo di lavoro</span>
                  {gestione.hasAccordoDiLavoro ? (
                    <CheckCircle2Icon className="size-4 text-green-600" />
                  ) : (
                    <OctagonAlertIcon className="size-4 text-red-500" />
                  )}
                </div>
                <AttachmentUploadSlot
                  label="Accordo di lavoro"
                  value={rapportoView.accordo_di_lavoro_allegati}
                  onAdd={(file) => onUpload("accordo_di_lavoro_allegati", file)}
                  onPreviewOpen={onPreviewOpen}
                  isUploading={uploadingSlot === "accordo_di_lavoro_allegati"}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileTextIcon className="text-muted-foreground size-4" />
                  <span className="text-2xs font-semibold">Ricevuta INPS</span>
                  {gestione.hasRicevutaInps ? (
                    <CheckCircle2Icon className="size-4 text-green-600" />
                  ) : (
                    <OctagonAlertIcon className="size-4 text-red-500" />
                  )}
                </div>
                <AttachmentUploadSlot
                  label="Ricevuta INPS"
                  value={rapportoView.ricevuta_inps_allegati}
                  onAdd={(file) => onUpload("ricevuta_inps_allegati", file)}
                  onPreviewOpen={onPreviewOpen}
                  isUploading={uploadingSlot === "ricevuta_inps_allegati"}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileTextIcon className="text-muted-foreground size-4" />
                  <span className="text-2xs font-semibold">Delega INPS</span>
                  {gestione.hasDelegaInps ? (
                    <CheckCircle2Icon className="size-4 text-green-600" />
                  ) : (
                    <OctagonAlertIcon className="size-4 text-red-500" />
                  )}
                </div>
                <AttachmentUploadSlot
                  label="Delega INPS"
                  value={gestione.delegaInpsValue}
                  onAdd={(file) => onUpload("delega_inps_allegati", file)}
                  onPreviewOpen={onPreviewOpen}
                  isUploading={uploadingSlot === "delega_inps_allegati"}
                />
              </div>
            </div>

            {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}

            {processi.length > 0 ? (
              <>
                <Separator className="bg-border/60" />
                <div className="space-y-3">
                  <p className="ui-type-label">Record collegati</p>
                  <div className="space-y-2">
                    {processi.map((processo) => (
                      <RapportoDetailPanelListRowCard
                        key={processo.id}
                        title={processo.titolo_annuncio || processo.id}
                        subtitle={`Stato RES: ${processo.stato_res ?? "-"}`}
                        trailing={
                          <Button asChild variant="outline" size="sm">
                            <a
                              href={buildPathForRoute({
                                mainSection: "ricerca_pipeline",
                                anagraficheTab: "famiglie",
                                ricercaProcessId: processo.id,
                              })}
                            >
                              Apri
                              <ArrowRightIcon className="size-4" />
                            </a>
                          </Button>
                        }
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </>
        )}
      </DetailSectionBlock>
    </div>
  )
}
