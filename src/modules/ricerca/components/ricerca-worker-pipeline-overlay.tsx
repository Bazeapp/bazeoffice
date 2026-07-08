import type { Dispatch, SetStateAction } from "react"
import type { ControllerRenderProps } from "react-hook-form"
import {
  ClipboardListIcon,
  UserIcon,
  XIcon,
} from "lucide-react"

import { WorkerProfileHeader } from "@/modules/lavoratori/components/worker-profile-header"
import { RecruiterFeedbackButton } from "@/modules/lavoratori/components/recruiter-feedback-sheet"
import { SchedaColloquioPanel } from "./scheda-colloquio-panel"
import {
  type RelatedSearchGroups,
  WorkerPipelineSummaryCards,
} from "./worker-pipeline-summary-cards"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Breadcrumb,
  BreadcrumbItem,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  asString,
  formatAvailabilityComputedAt,
  getLookupSelectValue,
  parseNumberValue,
  readArrayStrings,
  type LookupOption,
} from "@/modules/lavoratori/lib"
import { type CrmPipelineCardData } from "@/modules/crm/types"
import type { RicercaWorkerSelectionCard } from "../types"
import type {
  DocumentoLavoratoreRecord,
  EsperienzaLavoratoreRecord,
  LavoratoreRecord,
  ReferenzaLavoratoreRecord,
} from "@/modules/lavoratori/types"
import type { PipelineDetailFormDraft } from "../hooks/use-ricerca-worker-pipeline-overlay"

export type RicercaWorkerPipelineOverlayProps = {
  card: CrmPipelineCardData &
    Partial<{
      indirizzoProvaProvincia: string
      indirizzoProvaCap: string
      indirizzoProvaNote: string
      indirizzoProvaVia: string
      indirizzoProvaCivico: string
      indirizzoProvaComune: string
      indirizzoProvaCitofono: string
      oreSettimana: string | null
      familyAvailabilityJson: string | null
      orarioDiLavoro: string | null
      giorniSettimana: string | null
      nomeFamiglia: string
    }>
  onClose: () => void
  selectedWorkerError: string | null
  selectedCard: RicercaWorkerSelectionCard | null
  selectedWorker: RicercaWorkerSelectionCard["worker"] | null
  selectedWorkerRow: LavoratoreRecord | null
  selectedSelectionRow: Record<string, unknown> | null
  selectedWorkerAddress: Record<string, unknown> | null
  lookupOptionsByDomain: Map<string, LookupOption[]>
  lookupColorsByDomain: Map<string, string>
  relatedActiveSearches: RelatedSearchGroups
  loadingRelatedActiveSearches: boolean
  familyAddressDraft: {
    province: string
    cap: string
    address: string
    street: string
    civicNumber: string
    city: string
    intercom: string
    note: string
  }
  updatingFamilyAddress: boolean
  updatingSelectionDetails: boolean
  generatingSelectionFeedback: boolean
  generatingWorkerSummary: boolean
  loadingSelectedWorkerExperiences: boolean
  loadingSelectedWorkerDocuments: boolean
  loadingSelectedWorkerReferences: boolean
  selectedWorkerExperiences: EsperienzaLavoratoreRecord[]
  selectedWorkerDocuments: DocumentoLavoratoreRecord[]
  selectedWorkerReferences: ReferenzaLavoratoreRecord[]
  operatorName: string
  dataRitornoPipelineValue: string
  documentNaspiValue: string
  documentIbanValue: string
  documentStripeValue: string
  dataRitornoPipelineField: ControllerRenderProps<PipelineDetailFormDraft, "data_ritorno_disponibilita">
  naspiField: ControllerRenderProps<PipelineDetailFormDraft, "data_scadenza_naspi">
  ibanField: ControllerRenderProps<PipelineDetailFormDraft, "iban">
  stripeField: ControllerRenderProps<PipelineDetailFormDraft, "id_stripe_account">
  availabilityPayload: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["availabilityPayload"]
  availabilityReadOnlyRows: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["availabilityReadOnlyRows"]
  isEditingAvailability: boolean
  setIsEditingAvailability: Dispatch<SetStateAction<boolean>>
  isEditingJobSearch: boolean
  setIsEditingJobSearch: Dispatch<SetStateAction<boolean>>
  isEditingExperience: boolean
  setIsEditingExperience: Dispatch<SetStateAction<boolean>>
  isEditingSkills: boolean
  setIsEditingSkills: Dispatch<SetStateAction<boolean>>
  isEditingDocuments: boolean
  setIsEditingDocuments: Dispatch<SetStateAction<boolean>>
  updatingAvailability: boolean
  updatingJobSearch: boolean
  updatingExperience: boolean
  updatingSkills: boolean
  updatingDocuments: boolean
  availabilityDraft: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["availabilityDraft"]
  setAvailabilityDraft: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["setAvailabilityDraft"]
  jobSearchDraft: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["jobSearchDraft"]
  setJobSearchDraft: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["setJobSearchDraft"]
  experienceDraft: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["experienceDraft"]
  setExperienceDraft: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["setExperienceDraft"]
  skillsDraft: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["skillsDraft"]
  setSkillsDraft: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["setSkillsDraft"]
  documentsDraft: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["documentsDraft"]
  setDocumentsDraft: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["setDocumentsDraft"]
  resolvedIban: string
  handleAvailabilityMatrixChange: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["handleAvailabilityMatrixChange"]
  saveWorkerAvailability: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["saveWorkerAvailability"]
  patchJobSearchField: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["patchJobSearchField"]
  patchExperienceRecord: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["patchExperienceRecord"]
  createExperienceRecord: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["createExperienceRecord"]
  deleteExperienceRecord: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["deleteExperienceRecord"]
  patchReferenceRecord: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["patchReferenceRecord"]
  createReferenceRecord: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["createReferenceRecord"]
  patchSkillsField: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["patchSkillsField"]
  patchDocumentField: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["patchDocumentField"]
  patchSelectedWorkerField: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["patchSelectedWorkerField"]
  patchWorkerAddressField: ReturnType<typeof import("@/modules/lavoratori/hooks").useSelectedWorkerEditor>["patchWorkerAddressField"]
  patchSelectedSelectionField: (field: string, value: unknown) => Promise<void>
  patchSelectedProcessAddressField: (
    field:
      | "indirizzo_prova_provincia"
      | "indirizzo_prova_cap"
      | "indirizzo_prova_via"
      | "indirizzo_prova_civico"
      | "indirizzo_prova_comune"
      | "indirizzo_prova_citofono"
      | "indirizzo_prova_note",
    value: unknown,
  ) => Promise<void>
  handleMoveSelectionStatus: (value: string) => Promise<void>
  handleGenerateSelectionFeedback: () => Promise<string | null>
  handleGenerateWorkerSummary: () => Promise<void>
  handleOpenRelatedSearchCard: (nextProcessId: string, nextSelectionId: string) => void
  upsertSelectedWorkerDocument: (row: DocumentoLavoratoreRecord) => void
  setSelectedWorkerError: Dispatch<SetStateAction<string | null>>
}

export function RicercaWorkerPipelineOverlay({
  card,
  onClose,
  selectedWorkerError,
  selectedCard,
  selectedWorker,
  selectedWorkerRow,
  selectedSelectionRow,
  selectedWorkerAddress,
  lookupOptionsByDomain,
  relatedActiveSearches,
  loadingRelatedActiveSearches,
  familyAddressDraft,
  updatingFamilyAddress,
  updatingSelectionDetails,
  generatingSelectionFeedback,
  generatingWorkerSummary,
  loadingSelectedWorkerExperiences,
  loadingSelectedWorkerDocuments,
  loadingSelectedWorkerReferences,
  selectedWorkerExperiences,
  selectedWorkerDocuments,
  selectedWorkerReferences,
  operatorName,
  dataRitornoPipelineValue,
  documentNaspiValue,
  documentIbanValue,
  documentStripeValue,
  dataRitornoPipelineField,
  naspiField,
  ibanField,
  stripeField,
  availabilityPayload,
  availabilityReadOnlyRows,
  lookupColorsByDomain,
  isEditingAvailability,
  setIsEditingAvailability,
  isEditingJobSearch,
  setIsEditingJobSearch,
  isEditingExperience,
  setIsEditingExperience,
  isEditingSkills,
  setIsEditingSkills,
  isEditingDocuments,
  setIsEditingDocuments,
  updatingAvailability,
  updatingJobSearch,
  updatingExperience,
  updatingSkills,
  updatingDocuments,
  availabilityDraft,
  setAvailabilityDraft,
  jobSearchDraft,
  setJobSearchDraft,
  experienceDraft,
  setExperienceDraft,
  skillsDraft,
  setSkillsDraft,
  documentsDraft,
  setDocumentsDraft,
  resolvedIban,
  handleAvailabilityMatrixChange,
  saveWorkerAvailability,
  patchJobSearchField,
  patchExperienceRecord,
  createExperienceRecord,
  deleteExperienceRecord,
  patchReferenceRecord,
  createReferenceRecord,
  patchSkillsField,
  patchDocumentField,
  patchSelectedWorkerField,
  patchWorkerAddressField,
  patchSelectedSelectionField,
  patchSelectedProcessAddressField,
  handleMoveSelectionStatus,
  handleGenerateSelectionFeedback,
  handleGenerateWorkerSummary,
  handleOpenRelatedSearchCard,
  upsertSelectedWorkerDocument,
  setSelectedWorkerError,
}: RicercaWorkerPipelineOverlayProps) {
  return (

        <div className="bg-background absolute inset-0 z-50 flex flex-col overflow-y-auto animate-in fade-in-0">
          <div className="bg-card flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
            <Breadcrumb className="min-w-0">
              <BreadcrumbItem asChild>
                <button
                  type="button"
                  onClick={onClose}
                  className="cursor-pointer"
                >
                  Ricerca
                </button>
              </BreadcrumbItem>
              <BreadcrumbItem asChild>
                <button
                  type="button"
                  onClick={onClose}
                  className="cursor-pointer truncate"
                >
                  {card.nomeFamiglia}
                </button>
              </BreadcrumbItem>
              <BreadcrumbItem current>
                {selectedWorker?.nomeCompleto ?? "Lavoratore"}
              </BreadcrumbItem>
            </Breadcrumb>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
            >
              <XIcon />
            </Button>
          </div>

          {selectedWorkerError ? (
            <div className="mx-4 mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              Errore caricamento lavoratore: {selectedWorkerError}
            </div>
          ) : null}

          {selectedCard && selectedWorkerRow && selectedSelectionRow ? (
            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] 2xl:grid-cols-[minmax(0,1fr)_minmax(480px,0.85fr)]">
              <div className="scrollbar-hidden min-w-0 overflow-y-auto xl:border-r xl:border-border">
                <div className="space-y-4 p-4">
                  <DetailSectionBlock
                    title="Profilo lavoratore"
                    icon={<UserIcon className="size-4" />}
                    collapsible
                  >
                    <WorkerProfileHeader
                      key={selectedWorkerRow?.id ?? "__empty__"}
                      worker={selectedWorker ?? selectedCard.worker}
                      workerRow={{ ...selectedWorkerRow, data_ritorno_disponibilita: dataRitornoPipelineValue }}
                      statoLavoratoreOptions={
                        lookupOptionsByDomain.get("lavoratori.stato_lavoratore") ??
                        []
                      }
                      disponibilitaOptions={
                        lookupOptionsByDomain.get("lavoratori.disponibilita") ?? []
                      }
                      motivazioniOptions={
                        lookupOptionsByDomain.get(
                          "lavoratori.motivazione_non_idoneo",
                        ) ?? []
                      }
                      sessoOptions={
                        lookupOptionsByDomain.get("lavoratori.sesso") ?? []
                      }
                      nazionalitaOptions={
                        lookupOptionsByDomain.get("lavoratori.nazionalita") ?? []
                      }
                      onPatchField={(field, value) =>
                        patchSelectedWorkerField(field, value)
                      }
                      onStatoLavoratoreChange={(value) =>
                        patchSelectedWorkerField("stato_lavoratore", value)
                      }
                      onDisponibilitaChange={(value) =>
                        patchSelectedWorkerField("disponibilita", value)
                      }
                      onDataRitornoDisponibilitaChange={
                        dataRitornoPipelineField.onChange
                      }
                      onMotivazioneChange={(value) =>
                        patchSelectedWorkerField(
                          "motivazione_non_idoneo",
                          value ? [value] : [],
                        )
                      }
                    />
                  </DetailSectionBlock>

                  <DetailSectionBlock
                    title="Scheda colloquio"
                    icon={<ClipboardListIcon className="size-4" />}
                    collapsible
                    action={(() => {
                      const statoOptions =
                        lookupOptionsByDomain.get(
                          "selezioni_lavoratori.stato_selezione",
                        ) ?? [];
                      const currentStato = asString(
                        selectedSelectionRow.stato_selezione,
                      );
                      return (
                        <Select
                          value={getLookupSelectValue(currentStato, statoOptions, "none")}
                          onValueChange={(value) => {
                            if (!value || value === "none") return;
                            void handleMoveSelectionStatus(value);
                          }}
                          disabled={updatingSelectionDetails}
                        >
                          <SelectTrigger className="h-8 w-45 text-xs">
                            <SelectValue placeholder="Stato selezione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              Nessuno stato
                            </SelectItem>
                            {statoOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    })()}
                  >
                    <SchedaColloquioPanel
                      key={asString(selectedSelectionRow?.id) || "__empty__"}
                      selectionRow={selectedSelectionRow}
                      nonSelezionatoOptions={
                        lookupOptionsByDomain.get(
                          "selezioni_lavoratori.motivo_non_selezionato",
                        ) ?? []
                      }
                      noMatchOptions={
                        lookupOptionsByDomain.get(
                          "selezioni_lavoratori.motivo_no_match",
                        ) ?? []
                      }
                      isGeneratingFeedback={generatingSelectionFeedback}
                      onGenerateFeedback={handleGenerateSelectionFeedback}
                      onPatchField={patchSelectedSelectionField}
                    />
                  </DetailSectionBlock>
                </div>
              </div>

              <div className="scrollbar-hidden min-w-0 overflow-y-auto border-t border-border xl:border-t-0">
                <div className="space-y-6 p-4">
                  <WorkerPipelineSummaryCards
                    key={selectedWorkerRow?.id ?? "__empty__"}
                    workerRow={selectedWorkerRow}
                    selectionRow={selectedSelectionRow}
                    relatedActiveSearches={relatedActiveSearches}
                    relatedActiveSearchesLoading={loadingRelatedActiveSearches}
                    onOpenRelatedSearch={handleOpenRelatedSearchCard}
                    onPatchWorkerField={patchSelectedWorkerField}
                    onPatchWorkerAddress={patchWorkerAddressField}
                    onPatchProcessField={patchSelectedProcessAddressField}
                    workerVia={asString(selectedWorkerAddress?.via) || null}
                    workerCivico={asString(selectedWorkerAddress?.civico) || null}
                    workerCap={asString(selectedWorkerAddress?.cap) || null}
                    workerCitta={asString(selectedWorkerAddress?.citta) || null}
                    workerProvincia={asString(selectedWorkerAddress?.provincia_sigla) || null}
                    workerCitofono={asString(selectedWorkerAddress?.citofono) || null}
                    processWeeklyHours={card.oreSettimana}
                    familyAddress={familyAddressDraft.address}
                    familyCap={familyAddressDraft.cap}
                    familyProvince={familyAddressDraft.province}
                    familyStreet={familyAddressDraft.street}
                    familyCivicNumber={familyAddressDraft.civicNumber}
                    familyCity={familyAddressDraft.city}
                    familyIntercom={familyAddressDraft.intercom}
                    familyAddressNote={familyAddressDraft.note}
                    familyAvailabilityJson={card.familyAvailabilityJson}
                    familyWorkSchedule={card.orarioDiLavoro}
                    familyWeeklyFrequency={card.giorniSettimana}
                    provinceOptions={
                      lookupOptionsByDomain.get(
                        "processi_matching.indirizzo_prova_provincia",
                      ) ??
                      lookupOptionsByDomain.get("processi_matching.provincia") ??
                      lookupOptionsByDomain.get("lavoratori.provincia") ??
                      []
                    }
                    updatingProcessAddress={updatingFamilyAddress}
                    availabilityTitleMeta={
                      formatAvailabilityComputedAt(availabilityPayload?.computed_at) ?? "-"
                    }
                    availabilityReadOnlyRows={availabilityReadOnlyRows}
                    lookupOptionsByDomain={lookupOptionsByDomain}
                    lookupColorsByDomain={lookupColorsByDomain}
                    experienceTipoLavoroOptions={
                      lookupOptionsByDomain.get(
                        "esperienze_lavoratori.tipo_lavoro",
                      ) ??
                      lookupOptionsByDomain.get(
                        "lavoratori.tipo_lavoro_domestico",
                      ) ??
                      []
                    }
                    experienceTipoRapportoOptions={
                      lookupOptionsByDomain.get(
                        "esperienze_lavoratori.tipo_rapporto",
                      ) ?? []
                    }
                    tipoLavoroOptions={
                      lookupOptionsByDomain.get(
                        "lavoratori.tipo_lavoro_domestico",
                      ) ?? []
                    }
                    tipoRapportoOptions={
                      lookupOptionsByDomain.get(
                        "lavoratori.tipo_rapporto_lavorativo",
                      ) ?? []
                    }
                    referenceStatusOptions={
                      lookupOptionsByDomain.get(
                        "referenze_lavoratori.referenza_verificata",
                      ) ?? []
                    }
                    experiences={selectedWorkerExperiences}
                    experiencesLoading={loadingSelectedWorkerExperiences}
                    isGeneratingAiSummary={generatingWorkerSummary}
                    onGenerateAiSummary={handleGenerateWorkerSummary}
                    references={selectedWorkerReferences}
                    referencesLoading={loadingSelectedWorkerReferences}
                    documents={selectedWorkerDocuments}
                    documentsLoading={loadingSelectedWorkerDocuments}
                    isEditingAvailability={isEditingAvailability}
                    onToggleAvailabilityEdit={() =>
                      setIsEditingAvailability((current) => !current)
                    }
                    updatingAvailability={updatingAvailability}
                    isEditingJobSearch={isEditingJobSearch}
                    onToggleJobSearchEdit={() =>
                      setIsEditingJobSearch((current) => !current)
                    }
                    updatingJobSearch={updatingJobSearch}
                    jobSearchDraft={jobSearchDraft}
                    funzionamentoBazeOptions={
                      lookupOptionsByDomain.get(
                        "lavoratori.check_accetta_funzionamento_baze",
                      ) ?? []
                    }
                    trasfertaOptions={
                      lookupOptionsByDomain.get(
                        "lavoratori.check_accetta_lavori_con_trasferta",
                      ) ?? []
                    }
                    multipliContrattiOptions={
                      lookupOptionsByDomain.get(
                        "lavoratori.check_accetta_multipli_contratti",
                      ) ?? []
                    }
                    paga9Options={
                      lookupOptionsByDomain.get(
                        "lavoratori.check_accetta_paga_9_euro_netti",
                      ) ?? []
                    }
                    onJobSearchDraftChange={(patch) =>
                      setJobSearchDraft((current) => ({ ...current, ...patch }))
                    }
                    onJobSearchFieldPatch={patchJobSearchField}
                    lavoriAccettabili={readArrayStrings(
                      selectedWorkerRow?.check_lavori_accettabili,
                    )}
                    lavoriAccettabiliOptions={
                      lookupOptionsByDomain.get(
                        "lavoratori.check_lavori_accettabili",
                      ) ?? []
                    }
                    availabilityMatrix={availabilityDraft.matrix}
                    availabilityVincoli={availabilityDraft.vincoli_orari_disponibilita}
                    onLavoriAccettabiliChange={(values) =>
                      void patchSelectedWorkerField(
                        "check_lavori_accettabili",
                        values.length > 0 ? values : null,
                      )
                    }
                    onAvailabilityMatrixChange={(
                      dayField,
                      bandField,
                      checked,
                    ) => handleAvailabilityMatrixChange(dayField, bandField, checked)}
                    onAvailabilityVincoliChange={(value) =>
                      setAvailabilityDraft((current) => ({
                        ...current,
                        vincoli_orari_disponibilita: value,
                      }))
                    }
                    onAvailabilitySave={() => void saveWorkerAvailability()}
                    isEditingExperience={isEditingExperience}
                    onToggleExperienceEdit={() =>
                      setIsEditingExperience((current) => !current)
                    }
                    updatingExperience={updatingExperience}
                    experienceDraft={experienceDraft}
                    onExperienceDraftChange={(patch) =>
                      setExperienceDraft((current) => ({ ...current, ...patch }))
                    }
                    onExperienceFieldSave={(field, value) => {
                      if (
                        field === "situazione_lavorativa_attuale" ||
                        field === "riassunto_profilo_breve"
                      ) {
                        void patchSelectedWorkerField(field, value.trim() || null);
                      } else {
                        void patchSelectedWorkerField(field as keyof LavoratoreRecord, parseNumberValue(value));
                      }
                    }}
                    onExperiencePatch={patchExperienceRecord}
                    onExperienceCreate={createExperienceRecord}
                    onExperienceDelete={deleteExperienceRecord}
                    onReferencePatch={patchReferenceRecord}
                    onReferenceCreate={createReferenceRecord}
                    isEditingSkills={isEditingSkills}
                    onToggleSkillsEdit={() =>
                      setIsEditingSkills((current) => !current)
                    }
                    updatingSkills={updatingSkills}
                    skillsDraft={skillsDraft}
                    onSkillsDraftChange={(patch) =>
                      setSkillsDraft((current) => ({ ...current, ...patch }))
                    }
                    onSkillsFieldPatch={patchSkillsField}
                    isEditingDocuments={isEditingDocuments}
                    onToggleDocumentsEdit={() =>
                      setIsEditingDocuments((current) => !current)
                    }
                    updatingDocuments={updatingDocuments}
                    documentsDraft={documentsDraft}
                    resolvedIban={resolvedIban}
                    documentiVerificatiOptions={
                      lookupOptionsByDomain.get(
                        "lavoratori.stato_verifica_documenti",
                      ) ?? []
                    }
                    documentiInRegolaOptions={
                      lookupOptionsByDomain.get("lavoratori.documenti_in_regola") ??
                      []
                    }
                    onDocumentVerificationChange={(value) => {
                      setDocumentsDraft((current) => ({
                        ...current,
                        stato_verifica_documenti: value,
                      }));
                      void patchDocumentField(
                        "stato_verifica_documenti",
                        value || null,
                      );
                    }}
                    onDocumentStatusChange={(value) => {
                      setDocumentsDraft((current) => ({
                        ...current,
                        documenti_in_regola: value,
                      }));
                      void patchDocumentField("documenti_in_regola", value || null);
                    }}
                    naspiInputValue={documentNaspiValue}
                    ibanInputValue={documentIbanValue}
                    stripeAccountInputValue={documentStripeValue}
                    onDocumentNaspiChange={naspiField.onChange}
                    onDocumentIbanChange={ibanField.onChange}
                    onDocumentStripeAccountChange={stripeField.onChange}
                    onDocumentUpsert={upsertSelectedWorkerDocument}
                    onDocumentUploadError={setSelectedWorkerError}
                  />
                </div>
              </div>
            </div>
          ) : null}
          {selectedWorkerRow ? (
            <div className="pointer-events-none absolute right-4 bottom-4 z-[60]">
              <div className="pointer-events-auto">
                <RecruiterFeedbackButton
                  variant="fab"
                  value={asString(selectedWorkerRow?.feedback_recruiter)}
                  operatorName={operatorName}
                  onSave={(next) =>
                    patchSelectedWorkerField(
                      "feedback_recruiter",
                      next.trim() || null,
                    )
                  }
                />
              </div>
            </div>
          ) : null}
        </div>
  )
}
