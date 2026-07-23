import {
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  ExternalLinkIcon,
  FileTextIcon,
} from "lucide-react"

import { AssociationSearchField } from "@/components/shared-next/association-search-field"
import { DeleteRecordAction } from "@/components/shared-next/delete-record-action"
import { AttachmentUploadSlot } from "@/components/shared-next/attachment-upload-slot"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { LinkedRapportoSummaryCard } from "@/components/shared-next/linked-rapporto-summary-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup } from "@/components/ui/radio-group"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Form } from "@/components/ui/form"
import { FieldInput } from "@/components/forms/field-components"
import { TIPO_CONTRATTO_OPTIONS, type DetailTarget } from "../lib/detail-utils"
import type { useAssunzioniDetailSheet } from "../hooks/use-assunzioni-detail-sheet"
import { DatoreDetail } from "./datore-detail"
import { DetailSheetSkeleton } from "./detail-sheet-skeleton"
import {
  EditableField,
  FieldLookupSelect,
  FieldSingleSelect,
  RelatedSubjectCard,
} from "./assunzioni-detail-fields"
import { LavoratoreDetail } from "./lavoratore-detail"
import { RapportoDetailSections } from "./rapporto-detail-sections"

type SheetViewModel = ReturnType<typeof useAssunzioniDetailSheet>

export function AssunzioniDetailSheetContent({ vm }: { vm: SheetViewModel }) {
  const {
    card,
    open,
    onOpenChange,
    onDeleteRapporto,
    target,
    setTarget,
    statoAssunzioneOptions,
    tipoRapportoOptions,
    currentOffertaOptions,
    practiceError,
    uploadingAttachment,
    practiceForm,
    datoreIsLinked,
    lavoratoreIsLinked,
    assunzioneSearchQuery,
    setAssunzioneSearchQuery,
    filteredAssunzioneOptions,
    selectedAssunzioneId,
    savingPractice,
    loadingAssunzioneCandidates,
    workerDocuments,
    saveRapportoPatch,
    saveFamigliaPatch,
    saveAssunzionePatch,
    saveLavoratorePatch,
    saveLavoratoreAssunzionePatch,
    linkAssunzioneRecord,
    unlinkAssunzioneRecord,
    uploadAssunzioneAttachment,
    removeAssunzioneAttachment,
    uploadRapportoAttachment,
    removeRapportoAttachment,
    openAttachmentPreview,
    formatDate,
    resolveAssunzioneFormLabel,
    resolveAssunzioneFormSubLabel,
  } = vm

  return (
    <Form {...practiceForm}>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[min(96vw,980px)]! max-w-none! p-0 sm:max-w-none"
      >
        <SheetHeader className="border-b bg-surface px-5 py-5">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <SheetTitle className="truncate text-xl font-semibold">
                  {card ? `${card.nomeFamiglia} - ${card.nomeLavoratore}` : "Dettaglio assunzione"}
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Dettaglio pratica di assunzione con dati del datore e del lavoratore.
                </SheetDescription>
                <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <span className="flex items-center gap-1.5">
                    <CalendarDaysIcon className="size-4" />
                    {card ? formatDate(card.rapporto?.data_inizio_rapporto) : "-"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BriefcaseBusinessIcon className="size-4" />
                    {card?.tipoRapporto ?? "-"}
                  </span>
                </div>
              </div>
              {card?.rapporto?.id && onDeleteRapporto ? (
                <div className="flex shrink-0 items-center gap-1">
                  <DeleteRecordAction
                    title="Eliminare questo rapporto lavorativo?"
                    description="Il rapporto lavorativo verrà eliminato definitivamente. I form di assunzione (datore e lavoratore), i cedolini, i contributi, i CUD, le variazioni e i ticket collegati verranno scollegati ma NON eliminati. Questa azione non è reversibile."
                    toastMessages={{
                      loading: "Eliminazione rapporto in corso…",
                      success: "Rapporto lavorativo eliminato",
                      error: "Errore durante l'eliminazione del rapporto",
                    }}
                    onDelete={async () => {
                      await onDeleteRapporto(card.rapporto!.id)
                      onOpenChange(false)
                    }}
                  />
                </div>
              ) : null}
            </div>

          </div>
        </SheetHeader>

        {card ? (
          <section className="h-full overflow-y-auto bg-surface-muted px-5 py-5">
            <div className="mx-auto max-w-5xl space-y-5">
              <LinkedRapportoSummaryCard
                title={`${card.nomeFamiglia} – ${card.nomeLavoratore}`}
                rapporto={card.rapporto}
                type={card.rapporto?.tipo_rapporto ?? card.tipoRapporto}
              />

              <DetailSectionBlock
                title="Contesto pratica"
                icon={<BriefcaseBusinessIcon className="text-muted-foreground size-4" />}
                contentClassName="space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-3">
                  <EditableField label="Stato assunzione">
                    <FieldLookupSelect
                      name="stato_assunzione"
                      options={statoAssunzioneOptions}
                      placeholder="Seleziona stato"
                    />
                  </EditableField>
                  <EditableField label="Tipologia contratto">
                    <FieldSingleSelect
                      name="tipo_contratto"
                      placeholder="Seleziona tipologia contratto"
                      options={TIPO_CONTRATTO_OPTIONS}
                    />
                  </EditableField>
                  <EditableField label="Tipo rapporto">
                    <FieldLookupSelect
                      name="tipo_rapporto"
                      options={tipoRapportoOptions}
                      placeholder="Seleziona tipo rapporto"
                    />
                  </EditableField>
                  <EditableField label="Data di assunzione">
                    <FieldInput name="data_inizio_rapporto" type="date" />
                  </EditableField>
                  <EditableField label="ID rapporto INPS">
                    <FieldInput name="id_rapporto" />
                  </EditableField>
                  <EditableField label="Cod. Rapporto WebColf">
                    <FieldInput name="codice_datore_webcolf" type="number" />
                  </EditableField>
                  <EditableField label="Fee concordata">
                    <FieldInput
                      name="fee_concordata"
                      type="number"
                      step="0.01"
                      placeholder="-"
                      disabled={!card.richiestaAttivazione?.id}
                    />
                  </EditableField>
                  <EditableField label="URL origine">
                    {card.process?.source_url ? (
                      <Button type="button" variant="outline" className="w-full justify-between" asChild>
                        <a
                          href={card.process.source_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Apri URL origine
                          <ExternalLinkIcon className="size-4" />
                        </a>
                      </Button>
                    ) : (
                      <Input value="-" readOnly />
                    )}
                  </EditableField>
                  <EditableField label="Sconto applicato">
                    <FieldLookupSelect
                      name="offerta"
                      options={currentOffertaOptions}
                      placeholder="Seleziona sconto"
                      disabled={!card.process?.id}
                    />
                  </EditableField>
                  <EditableField label="Cod. Lavoratore WebColf">
                    <FieldInput name="codice_dipendente_webcolf" type="number" />
                  </EditableField>
                </div>
                {practiceError ? (
                  <p className="text-xs font-medium text-red-600">{practiceError}</p>
                ) : null}
              </DetailSectionBlock>

              <DetailSectionBlock
                title="Documenti del rapporto"
                icon={<FileTextIcon className="text-muted-foreground size-4" />}
                contentClassName="space-y-4"
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <AttachmentUploadSlot
                    label="Accordo di lavoro"
                    value={card.rapporto?.accordo_di_lavoro_allegati ?? null}
                    onAdd={(file) => uploadRapportoAttachment("accordo_di_lavoro_allegati", file)}
                    onRemove={(link) => void removeRapportoAttachment("accordo_di_lavoro_allegati", link)}
                    onPreviewOpen={openAttachmentPreview}
                    isUploading={uploadingAttachment === "rapporto:accordo_di_lavoro_allegati"}
                    showStatusIndicator
                  />
                  <AttachmentUploadSlot
                    label="Ricevuta INPS"
                    value={card.rapporto?.ricevuta_inps_allegati ?? null}
                    onAdd={(file) => uploadRapportoAttachment("ricevuta_inps_allegati", file)}
                    onRemove={(link) => void removeRapportoAttachment("ricevuta_inps_allegati", link)}
                    onPreviewOpen={openAttachmentPreview}
                    isUploading={uploadingAttachment === "rapporto:ricevuta_inps_allegati"}
                    showStatusIndicator
                  />
                </div>
              </DetailSectionBlock>

              <RapportoDetailSections
                card={card}
                onRapportoPatch={saveRapportoPatch}
              />

              <RadioGroup
                value={target}
                onValueChange={(value) => setTarget(value as DetailTarget)}
                className="grid gap-3 md:grid-cols-2"
              >
                <RelatedSubjectCard
                  role="Datore collegato"
                  name={card.nomeFamiglia}
                  email={card.email}
                  phone={card.telefono}
                  value="datore"
                  selected={target === "datore"}
                  isComplete={datoreIsLinked}
                />
                <RelatedSubjectCard
                  role="Lavoratore collegato"
                  name={card.nomeLavoratore}
                  email={card.lavoratore?.email}
                  phone={card.lavoratore?.telefono}
                  value="lavoratore"
                  selected={target === "lavoratore"}
                  isComplete={lavoratoreIsLinked}
                />
              </RadioGroup>

              <DetailSectionBlock
                title="Associazione form"
                icon={<FileTextIcon className="text-muted-foreground size-4" />}
                contentClassName="space-y-2"
              >
                <EditableField
                  label={
                    target === "datore"
                      ? "Form assunzione famiglia"
                      : "Form assunzione lavoratore"
                  }
                >
                  <AssociationSearchField
                    query={assunzioneSearchQuery}
                    onQueryChange={setAssunzioneSearchQuery}
                    options={filteredAssunzioneOptions.map((record) => ({
                      id: record.id,
                      primaryLabel: resolveAssunzioneFormLabel(record, target, card),
                      secondaryLabel: resolveAssunzioneFormSubLabel(record, target, card),
                    }))}
                    selectedId={selectedAssunzioneId ?? null}
                    onSelect={(id) => void linkAssunzioneRecord(id)}
                    onUnlink={() => void unlinkAssunzioneRecord()}
                    canUnlink={Boolean(selectedAssunzioneId)}
                    disabled={savingPractice}
                    loading={loadingAssunzioneCandidates}
                    placeholder="Nome, cognome o email"
                    emptyMessage="Nessun form trovato."
                  />
                </EditableField>
              </DetailSectionBlock>

              {target === "datore" ? (
                <DatoreDetail
                  card={card}
                  onFamigliaPatch={saveFamigliaPatch}
                  onAssunzionePatch={saveAssunzionePatch}
                  onAttachmentAdd={uploadAssunzioneAttachment}
                  onAttachmentRemove={removeAssunzioneAttachment}
                  onAttachmentPreview={openAttachmentPreview}
                  uploadingAttachment={uploadingAttachment}
                />
              ) : (
                <LavoratoreDetail
                  card={card}
                  documents={workerDocuments}
                  onLavoratorePatch={saveLavoratorePatch}
                  onLavoratoreAssunzionePatch={saveLavoratoreAssunzionePatch}
                  onAttachmentAdd={uploadAssunzioneAttachment}
                  onAttachmentRemove={removeAssunzioneAttachment}
                  onAttachmentPreview={openAttachmentPreview}
                  uploadingAttachment={uploadingAttachment}
                />
              )}
            </div>
          </section>
        ) : (
          <DetailSheetSkeleton />
        )}
      </SheetContent>
    </Sheet>
    </Form>
  )
}
