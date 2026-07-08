import * as React from "react"
import type { ControllerRenderProps } from "react-hook-form"
import {
  AlertTriangleIcon,
  ExternalLinkIcon,
  LoaderCircleIcon,
  PlusIcon,
  SirenIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"

import { AddressSectionCard } from "./address-section-card"
import { AvailabilityCalendarCard } from "./availability-calendar-card"
import { DocumentsCard } from "./documents-card"
import { ExperienceReferencesCard } from "./experience-references-card"
import { JobSearchCard } from "./job-search-card"
import { WorkerDetailShell } from "./worker-detail-shell"
import { RicercaActiveSearchCard } from "@/modules/ricerca/components"
import { WorkerProfileHeader } from "./worker-profile-header"
import { RecruiterFeedbackButton } from "./recruiter-feedback-sheet"
import { SkillsCompetenzeCard } from "./skills-competenze-card"
import { useSelectedWorkerEditor } from "../hooks/use-selected-worker-editor"
import type { WorkerAddressDraft } from "@/modules/lavoratori/lib"
import {
  AVAILABILITY_EDIT_BANDS,
  AVAILABILITY_EDIT_DAYS,
  AVAILABILITY_HOUR_LABELS,
  type AvailabilityEditBandField,
  type AvailabilityEditDayField,
  formatAvailabilityComputedAt,
} from "../lib/availability-utils"
import { asString, getStripeAccountMissingRequirements, readArrayStrings } from "../lib/base-utils"
import { Button } from "@/components/ui/button"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { FieldInput } from "@/components/forms/field-components"
import { Form } from "@/components/ui/form"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { OpenRicercaDetailOptions } from "@/routes/app-routes"
import { FieldDocumentiInRegolaSelect } from "./field-documenti-in-regola-select"
import { FieldHaiReferenzeSelect } from "./field-hai-referenze-select"
import { FieldNonQualificatoTipoLavoro } from "./field-non-qualificato-tipo-lavoro"
import type { SearchProcessResult, WorkerRelatedSearchItem } from "../lib/cerca-utils"
import type { LavoratoreListItem } from "./lavoratore-card"
import type {
  DocumentoLavoratoreRecord,
  EsperienzaLavoratoreRecord,
  LeadDetailFormDraft,
  LavoratoreRecord,
  NonQualificatoFormDraft,
  ReferenzaLavoratoreRecord,
} from "../types"
import type { LookupOption } from "../lib/lookup-utils"
import type { NonQualificatoIssue } from "../lib/status-utils"

type WorkerEditor = ReturnType<typeof useSelectedWorkerEditor>

export type LavoratoriCercaDetailPanelProps = {
  onClose: () => void
  workerPhotoInputRef: React.RefObject<HTMLInputElement | null>
  onWorkerPhotoInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  detailScrollRef: React.RefObject<HTMLElement | null>
  workerSectionTabs: Array<{
    id: string
    label: string
    icon: React.ComponentType<{ className?: string }>
  }>
  activeWorkerSection: string
  onSectionChange: (sectionId: string) => void
  setWorkerSectionRef: (sectionId: string) => (node: HTMLDivElement | null) => void
  selectedWorkerBlacklistAlert: { statusLabel: string; reasonLabel: string } | null
  selectedWorkerStatusAlert: {
    statusLabel: string
    reasonLabel: string
    tone: "critical" | "muted"
  } | null
  selectedWorker: LavoratoreListItem | null
  selectedWorkerRow: LavoratoreRecord | null
  selectedWorkerId: string | null
  selectedWorkerAddress: Record<string, unknown> | null
  availabilityStatusDraft: { disponibilita: string; data_ritorno_disponibilita: string }
  dataRitornoLCVValue: string
  statoLavoratoreLookupOptions: LookupOption[]
  disponibilitaLookupOptions: LookupOption[]
  motivazioniNonIdoneoOptions: LookupOption[]
  sessoLookupOptions: LookupOption[]
  nazionalitaLookupOptions: LookupOption[]
  patchSelectedWorkerField: WorkerEditor["patchSelectedWorkerField"]
  setAvailabilityStatusDraft: React.Dispatch<
    React.SetStateAction<{ disponibilita: string; data_ritorno_disponibilita: string }>
  >
  patchWorkerAvailabilityStatus: (patch: Record<string, unknown>) => Promise<void>
  dataRitornoField: ControllerRenderProps<LeadDetailFormDraft, "data_ritorno_disponibilita">
  handleNonIdoneoReasonsChange: (values: string[]) => void
  updatingNonQualificato: boolean
  updatingAvailabilityStatus: boolean
  updatingNonIdoneo: boolean
  blacklistChecked: boolean
  handleBlacklistChange: (checked: boolean) => void
  presentationPhotoSlots: string[]
  selectedPresentationPhotoIndex: number
  onPrimaryWorkerPhotoChange: (index: number) => void
  onUploadPhoto: () => void
  uploadingWorkerPhoto: boolean
  selectedMotivazioneClassName: string
  addressMobilityAnchor: ReturnType<typeof import("@/components/ui/combobox").useComboboxAnchor>
  mobilityLookupOptions: LookupOption[]
  addressDraft: WorkerAddressDraft
  setAddressDraft: React.Dispatch<React.SetStateAction<WorkerAddressDraft>>
  isEditingAddress: boolean
  setIsEditingAddress: React.Dispatch<React.SetStateAction<boolean>>
  commitAddressField: WorkerEditor["commitAddressField"]
  patchWorkerAddressField: WorkerEditor["patchWorkerAddressField"]
  provinciaLookupOptions: LookupOption[]
  lookupOptionsByDomain: Map<string, LookupOption[]>
  lookupColorsByDomain: Map<string, string>
  availabilityPayload: WorkerEditor["availabilityPayload"]
  availabilityReadOnlyRows: WorkerEditor["availabilityReadOnlyRows"]
  isEditingAvailability: boolean
  setIsEditingAvailability: React.Dispatch<React.SetStateAction<boolean>>
  updatingAvailability: boolean
  availabilityDraft: WorkerEditor["availabilityDraft"]
  setAvailabilityDraft: WorkerEditor["setAvailabilityDraft"]
  availabilityEditDays: typeof AVAILABILITY_EDIT_DAYS
  availabilityEditBands: typeof AVAILABILITY_EDIT_BANDS
  availabilityHourLabels: typeof AVAILABILITY_HOUR_LABELS
  onAvailabilityMatrixChange: WorkerEditor["handleAvailabilityMatrixChange"]
  onAvailabilitySave: WorkerEditor["saveWorkerAvailability"]
  isEditingJobSearch: boolean
  setIsEditingJobSearch: React.Dispatch<React.SetStateAction<boolean>>
  updatingJobSearch: boolean
  jobSearchDraft: WorkerEditor["jobSearchDraft"]
  setJobSearchDraft: WorkerEditor["setJobSearchDraft"]
  tipoLavoroDomesticoOptions: LookupOption[]
  tipoRapportoLavorativoOptions: LookupOption[]
  lavoriAccettabiliOptions: LookupOption[]
  trasfertaOptions: LookupOption[]
  multipliContrattiOptions: LookupOption[]
  paga9Options: LookupOption[]
  patchJobSearchField: WorkerEditor["patchJobSearchField"]
  selectedWorkerExperiences: EsperienzaLavoratoreRecord[]
  loadingSelectedWorkerExperiences: boolean
  generatingWorkerSummary: boolean
  onGenerateWorkerSummary: () => void
  experienceTipoLavoroOptions: LookupOption[]
  experienceTipoRapportoOptions: LookupOption[]
  isEditingExperience: boolean
  setIsEditingExperience: React.Dispatch<React.SetStateAction<boolean>>
  updatingExperience: boolean
  experienceDraft: WorkerEditor["experienceDraft"]
  patchExperienceRecord: WorkerEditor["patchExperienceRecord"]
  createExperienceRecord: WorkerEditor["createExperienceRecord"]
  deleteExperienceRecord: WorkerEditor["deleteExperienceRecord"]
  selectedWorkerReferences: ReferenzaLavoratoreRecord[]
  loadingSelectedWorkerReferences: boolean
  referenceStatusOptions: LookupOption[]
  patchReferenceRecord: WorkerEditor["patchReferenceRecord"]
  createReferenceRecord: WorkerEditor["createReferenceRecord"]
  anniEsperienzaColfValue: string
  anniEsperienzaBadanteValue: string
  anniEsperienzaBabysitterValue: string
  situazioneLavorativaAttualeValue: string
  anniColfField: ControllerRenderProps<LeadDetailFormDraft, "anni_esperienza_colf">
  anniBadanteField: ControllerRenderProps<LeadDetailFormDraft, "anni_esperienza_badante">
  anniBabysitterField: ControllerRenderProps<LeadDetailFormDraft, "anni_esperienza_babysitter">
  situazioneField: ControllerRenderProps<LeadDetailFormDraft, "situazione_lavorativa_attuale">
  riassuntoProfiloField: ControllerRenderProps<LeadDetailFormDraft, "riassunto_profilo_breve">
  selectedSkillCompetenzeValues: WorkerEditor["skillsDraft"]
  isEditingSkills: boolean
  setIsEditingSkills: React.Dispatch<React.SetStateAction<boolean>>
  updatingSkills: boolean
  skillsDraft: WorkerEditor["skillsDraft"]
  setSkillsDraft: WorkerEditor["setSkillsDraft"]
  patchSkillsField: WorkerEditor["patchSkillsField"]
  selectedWorkerDocuments: DocumentoLavoratoreRecord[]
  loadingSelectedWorkerDocuments: boolean
  isEditingDocuments: boolean
  setIsEditingDocuments: React.Dispatch<React.SetStateAction<boolean>>
  updatingDocuments: boolean
  documentsDraft: WorkerEditor["documentsDraft"]
  setDocumentsDraft: WorkerEditor["setDocumentsDraft"]
  documentiVerificatiOptions: LookupOption[]
  documentiInRegolaOptions: LookupOption[]
  haiReferenzeOptions: LookupOption[]
  resolvedIban: string
  naspiLCVValue: string
  ibanLCVValue: string
  stripeAccountLCVValue: string
  naspiField: ControllerRenderProps<LeadDetailFormDraft, "data_scadenza_naspi">
  ibanField: ControllerRenderProps<LeadDetailFormDraft, "iban">
  stripeAccountField: ControllerRenderProps<LeadDetailFormDraft, "id_stripe_account">
  generateStripeAccount: WorkerEditor["generateStripeAccount"]
  patchDocumentField: WorkerEditor["patchDocumentField"]
  upsertSelectedWorkerDocument: (row: DocumentoLavoratoreRecord) => void
  setError: React.Dispatch<React.SetStateAction<string | null>>
  selectedWorkerIsNonQualificato: boolean
  selectedWorkerNonQualificatoIssues: NonQualificatoIssue[]
  nonQualificatoForm: ReturnType<typeof import("@/hooks/use-auto-save-form").useAutoSaveForm<NonQualificatoFormDraft>>
  groupedDirectRelatedSearches: Array<[string, WorkerRelatedSearchItem[]]>
  groupedOtherRelatedSearches: Array<[string, WorkerRelatedSearchItem[]]>
  relatedActiveSearches: {
    direct: WorkerRelatedSearchItem[]
    other: WorkerRelatedSearchItem[]
  }
  loadingRelatedActiveSearches: boolean
  getSelectionStateClassName: (value: string) => string
  openRicercaDetailFromWorker: (processId: string) => void
  onOpenRicercaDetail?: (processId: string, options?: OpenRicercaDetailOptions) => void
  setIsAddSearchDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  operatorName: string
  isAddSearchDialogOpen: boolean
  isSubmittingAddSearch: boolean
  searchProcessQuery: string
  setSearchProcessQuery: React.Dispatch<React.SetStateAction<string>>
  isSearchProcessLoading: boolean
  searchProcessResults: SearchProcessResult[]
  selectedSearchToAdd: SearchProcessResult | null
  setSelectedSearchToAdd: React.Dispatch<React.SetStateAction<SearchProcessResult | null>>
  manualSearchInsertReason: string
  setManualSearchInsertReason: React.Dispatch<React.SetStateAction<string>>
  onAddWorkerToSearch: () => Promise<void>
}

export function LavoratoriCercaDetailPanel({
  onClose,
  workerPhotoInputRef,
  onWorkerPhotoInputChange,
  detailScrollRef,
  workerSectionTabs,
  activeWorkerSection,
  onSectionChange,
  setWorkerSectionRef,
  selectedWorkerBlacklistAlert,
  selectedWorkerStatusAlert,
  selectedWorker,
  selectedWorkerRow,
  selectedWorkerId,
  selectedWorkerAddress,
  availabilityStatusDraft,
  dataRitornoLCVValue,
  statoLavoratoreLookupOptions,
  disponibilitaLookupOptions,
  motivazioniNonIdoneoOptions,
  sessoLookupOptions,
  nazionalitaLookupOptions,
  patchSelectedWorkerField,
  setAvailabilityStatusDraft,
  patchWorkerAvailabilityStatus,
  dataRitornoField,
  handleNonIdoneoReasonsChange,
  updatingNonQualificato,
  updatingAvailabilityStatus,
  updatingNonIdoneo,
  blacklistChecked,
  handleBlacklistChange,
  presentationPhotoSlots,
  selectedPresentationPhotoIndex,
  onPrimaryWorkerPhotoChange,
  onUploadPhoto,
  uploadingWorkerPhoto,
  selectedMotivazioneClassName,
  addressMobilityAnchor,
  mobilityLookupOptions,
  addressDraft,
  setAddressDraft,
  isEditingAddress,
  setIsEditingAddress,
  commitAddressField,
  patchWorkerAddressField,
  provinciaLookupOptions,
  lookupOptionsByDomain,
  lookupColorsByDomain,
  availabilityPayload,
  availabilityReadOnlyRows,
  isEditingAvailability,
  setIsEditingAvailability,
  updatingAvailability,
  availabilityDraft,
  setAvailabilityDraft,
  availabilityEditDays,
  availabilityEditBands,
  availabilityHourLabels,
  onAvailabilityMatrixChange,
  onAvailabilitySave,
  isEditingJobSearch,
  setIsEditingJobSearch,
  updatingJobSearch,
  jobSearchDraft,
  setJobSearchDraft,
  tipoLavoroDomesticoOptions,
  tipoRapportoLavorativoOptions,
  lavoriAccettabiliOptions,
  trasfertaOptions,
  multipliContrattiOptions,
  paga9Options,
  patchJobSearchField,
  selectedWorkerExperiences,
  loadingSelectedWorkerExperiences,
  generatingWorkerSummary,
  onGenerateWorkerSummary,
  experienceTipoLavoroOptions,
  experienceTipoRapportoOptions,
  isEditingExperience,
  setIsEditingExperience,
  updatingExperience,
  experienceDraft,
  patchExperienceRecord,
  createExperienceRecord,
  deleteExperienceRecord,
  selectedWorkerReferences,
  loadingSelectedWorkerReferences,
  referenceStatusOptions,
  patchReferenceRecord,
  createReferenceRecord,
  anniEsperienzaColfValue,
  anniEsperienzaBadanteValue,
  anniEsperienzaBabysitterValue,
  situazioneLavorativaAttualeValue,
  anniColfField,
  anniBadanteField,
  anniBabysitterField,
  situazioneField,
  riassuntoProfiloField,
  selectedSkillCompetenzeValues,
  isEditingSkills,
  setIsEditingSkills,
  updatingSkills,
  skillsDraft,
  setSkillsDraft,
  patchSkillsField,
  selectedWorkerDocuments,
  loadingSelectedWorkerDocuments,
  isEditingDocuments,
  setIsEditingDocuments,
  updatingDocuments,
  documentsDraft,
  setDocumentsDraft,
  documentiVerificatiOptions,
  documentiInRegolaOptions,
  haiReferenzeOptions,
  resolvedIban,
  naspiLCVValue,
  ibanLCVValue,
  stripeAccountLCVValue,
  naspiField,
  ibanField,
  stripeAccountField,
  generateStripeAccount,
  patchDocumentField,
  upsertSelectedWorkerDocument,
  setError,
  selectedWorkerIsNonQualificato,
  selectedWorkerNonQualificatoIssues,
  nonQualificatoForm,
  groupedDirectRelatedSearches,
  groupedOtherRelatedSearches,
  relatedActiveSearches,
  loadingRelatedActiveSearches,
  getSelectionStateClassName,
  openRicercaDetailFromWorker,
  onOpenRicercaDetail,
  setIsAddSearchDialogOpen,
  operatorName,
  isAddSearchDialogOpen,
  isSubmittingAddSearch,
  searchProcessQuery,
  setSearchProcessQuery,
  isSearchProcessLoading,
  searchProcessResults,
  selectedSearchToAdd,
  setSelectedSearchToAdd,
  manualSearchInsertReason,
  setManualSearchInsertReason,
  onAddWorkerToSearch,
}: LavoratoriCercaDetailPanelProps) {
  return (
    <>
      <input
        ref={workerPhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onWorkerPhotoInputChange}
      />
      <WorkerDetailShell
        key={selectedWorkerRow?.id ?? "__empty__"}
            sectionRef={detailScrollRef}
            tabs={workerSectionTabs}
            activeSection={activeWorkerSection}
            onSectionChange={onSectionChange}
            topBar={
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Chiudi scheda lavoratore"
                  title="Chiudi scheda lavoratore"
                  onClick={onClose}
                >
                  <XIcon />
                </Button>
              </>
            }
            headerRef={setWorkerSectionRef("profilo")}
            header={
              <>
                {selectedWorkerBlacklistAlert ? (
                  <div className="flex items-start gap-2 rounded-md bg-rose-50/70 px-3 py-2 text-sm text-rose-700">
                    <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="font-semibold">
                        {selectedWorkerBlacklistAlert.statusLabel}
                      </p>
                      <p>{selectedWorkerBlacklistAlert.reasonLabel}</p>
                    </div>
                  </div>
                ) : null}
                {selectedWorkerStatusAlert ? (
                  <div
                    className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm ${
                      selectedWorkerStatusAlert.tone === "critical"
                        ? "bg-rose-50/70 text-rose-700"
                        : "bg-zinc-100/70 text-zinc-700"
                    }`}
                  >
                    <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                    <div className="space-y-0.5">
                      <p className="font-semibold">
                        {selectedWorkerStatusAlert.statusLabel}
                      </p>
                      <p>{selectedWorkerStatusAlert.reasonLabel}</p>
                    </div>
                  </div>
                ) : null}
                {selectedWorker && selectedWorkerRow ? (
                  <WorkerProfileHeader
                    worker={selectedWorker}
                    workerRow={{
                      ...selectedWorkerRow,
                      disponibilita: availabilityStatusDraft.disponibilita,
                      data_ritorno_disponibilita: dataRitornoLCVValue,
                    }}
                    statoLavoratoreOptions={statoLavoratoreLookupOptions}
                    disponibilitaOptions={disponibilitaLookupOptions}
                    motivazioniOptions={motivazioniNonIdoneoOptions}
                    sessoOptions={sessoLookupOptions}
                    nazionalitaOptions={nazionalitaLookupOptions}
                    onPatchField={(field, value) =>
                      patchSelectedWorkerField(field, value)
                    }
                    onStatoLavoratoreChange={(value) =>
                      patchSelectedWorkerField("stato_lavoratore", value)
                    }
                    onDisponibilitaChange={(value) => {
                      setAvailabilityStatusDraft((current) => ({
                        ...current,
                        disponibilita: value ?? "",
                      }));
                      void patchWorkerAvailabilityStatus({
                        disponibilita: value || null,
                      });
                    }}
                    onDataRitornoDisponibilitaChange={
                      dataRitornoField.onChange
                    }
                    onMotivazioneChange={(value) =>
                      void handleNonIdoneoReasonsChange(value ? [value] : [])
                    }
                    fieldsDisabled={updatingNonQualificato}
                    statoLavoratoreDisabled={
                      updatingNonQualificato ||
                      statoLavoratoreLookupOptions.length === 0
                    }
                    disponibilitaDisabled={
                      updatingAvailabilityStatus ||
                      disponibilitaLookupOptions.length === 0
                    }
                    dataRitornoDisponibilitaDisabled={false}
                    motivazioneDisabled={updatingNonIdoneo}
                    blacklistChecked={blacklistChecked}
                    onBlacklistToggle={(nextValue) =>
                      void handleBlacklistChange(nextValue)
                    }
                    blacklistDisabled={updatingNonIdoneo}
                    presentationPhotoSlots={presentationPhotoSlots}
                    selectedPresentationPhotoIndex={
                      selectedPresentationPhotoIndex
                    }
                    onSelectedPresentationPhotoIndexChange={
                      onPrimaryWorkerPhotoChange
                    }
                    showUploadPhotoAction
                    onUploadPhoto={onUploadPhoto}
                    selectedMotivazioneClassName={
                      selectedMotivazioneClassName
                    }
                  />
                ) : null}
              </>
            }
          >
          {selectedWorker ? (
            <div className="space-y-6">
              <div className="space-y-6 text-sm">

                <div ref={setWorkerSectionRef("residenza")}>
                  <AddressSectionCard
                    isEditing={isEditingAddress}
                    isUpdating={updatingNonQualificato}
                    addressDraft={addressDraft}
                    provinciaOptions={provinciaLookupOptions}
                    mobilityOptions={mobilityLookupOptions}
                    selectedVia={asString(selectedWorkerAddress?.via) || null}
                    selectedCivico={asString(selectedWorkerAddress?.civico) || null}
                    selectedCap={asString(selectedWorkerAddress?.cap) || null}
                    selectedCitta={asString(selectedWorkerAddress?.citta) || null}
                    selectedProvincia={asString(selectedWorkerAddress?.provincia_sigla) || null}

                    selectedMobility={readArrayStrings(
                      selectedWorkerRow?.come_ti_sposti,
                    )}
                    mobilityAnchor={addressMobilityAnchor}
                    onToggleEdit={() =>
                      setIsEditingAddress((current) => !current)
                    }
                    onFieldChange={(field, value) => {
                      setAddressDraft((current) => ({ ...current, [field]: value }));
                      if (field === "provincia") {
                        void patchWorkerAddressField("provincia", value || null);
                      }
                    }}
                    onFieldCommit={(field, value) => {
                      if (field !== "provincia") void commitAddressField(field, value);
                    }}
                    onMobilityChange={(values) => {
                      setAddressDraft((current) => ({
                        ...current,
                        come_ti_sposti: values,
                      }));
                      void patchSelectedWorkerField(
                        "come_ti_sposti",
                        values.length > 0 ? values : null,
                      );
                    }}
                  />
                </div>

                <div ref={setWorkerSectionRef("calendario")}>
                  <AvailabilityCalendarCard
                    titleMeta={
                      formatAvailabilityComputedAt(
                        availabilityPayload?.computed_at,
                      ) ?? "-"
                    }
                    isEditing={isEditingAvailability}
                    isUpdating={updatingAvailability}
                    editDays={availabilityEditDays.map(
                      ({ field, label }) => ({
                        field,
                        label,
                      }),
                    )}
                    editBands={availabilityEditBands.map(
                      ({ field, label }) => ({ field, label }),
                    )}
                    hourLabels={availabilityHourLabels}
                    readOnlyRows={availabilityReadOnlyRows}
                    matrix={availabilityDraft.matrix}
                    vincoliOrari={availabilityDraft.vincoli_orari_disponibilita}
                    onToggleEdit={() =>
                      setIsEditingAvailability((current) => !current)
                    }
                    onMatrixChange={(dayField, bandField, checked) =>
                      void onAvailabilityMatrixChange(
                        dayField as AvailabilityEditDayField,
                        bandField as AvailabilityEditBandField,
                        checked,
                      )
                    }
                    onVincoliChange={(value) =>
                      setAvailabilityDraft((current) => ({
                        ...current,
                        vincoli_orari_disponibilita: value,
                      }))
                    }
                    onVincoliSave={async (value) => {
                      setAvailabilityDraft((current) => ({
                        ...current,
                        vincoli_orari_disponibilita: value,
                      }))
                      await patchSelectedWorkerField(
                        "vincoli_orari_disponibilita",
                        value.trim() || null,
                      )
                    }}
                    vincoliIdentity={selectedWorkerId}
                    onSave={() => void onAvailabilitySave()}
                  />
                </div>

                <div ref={setWorkerSectionRef("ricerca")}>
                  <JobSearchCard
                    isEditing={isEditingJobSearch}
                    isUpdating={updatingJobSearch}
                    draft={jobSearchDraft}
                    tipoLavoroOptions={tipoLavoroDomesticoOptions}
                    tipoRapportoOptions={tipoRapportoLavorativoOptions}
                    lavoriAccettabiliOptions={lavoriAccettabiliOptions}
                    trasfertaOptions={trasfertaOptions}
                    multipliContrattiOptions={multipliContrattiOptions}
                    paga9Options={paga9Options}
                    lookupColorsByDomain={lookupColorsByDomain}
                    selectedTipoLavoro={readArrayStrings(
                      selectedWorkerRow?.tipo_lavoro_domestico,
                    )}
                    selectedTipoRapporto={readArrayStrings(
                      selectedWorkerRow?.tipo_rapporto_lavorativo,
                    )}
                    selectedLavoriAccettabili={readArrayStrings(
                      selectedWorkerRow?.check_lavori_accettabili,
                    )}
                    selectedTrasferta={asString(
                      selectedWorkerRow?.check_accetta_lavori_con_trasferta,
                    )}
                    selectedMultipliContratti={asString(
                      selectedWorkerRow?.check_accetta_multipli_contratti,
                    )}
                    selectedPaga9={asString(
                      selectedWorkerRow?.check_accetta_paga_9_euro_netti,
                    )}
                    onToggleEdit={() =>
                      setIsEditingJobSearch((current) => !current)
                    }
                    onTipoLavoroChange={(values) => {
                      setJobSearchDraft((current) => ({
                        ...current,
                        tipo_lavoro_domestico: values,
                      }));
                      void patchJobSearchField(
                        "tipo_lavoro_domestico",
                        values.length > 0 ? values : null,
                      );
                    }}
                    onTipoRapportoChange={(values) => {
                      setJobSearchDraft((current) => ({
                        ...current,
                        tipo_rapporto_lavorativo: values,
                      }));
                      void patchJobSearchField(
                        "tipo_rapporto_lavorativo",
                        values.length > 0 ? values : null,
                      );
                    }}
                    onLavoriAccettabiliChange={(values) => {
                      setJobSearchDraft((current) => ({
                        ...current,
                        check_lavori_accettabili: values,
                      }));
                      void patchJobSearchField(
                        "check_lavori_accettabili",
                        values.length > 0 ? values : null,
                      );
                    }}
                    onTrasfertaChange={(value) => {
                      setJobSearchDraft((current) => ({
                        ...current,
                        check_accetta_lavori_con_trasferta: value,
                      }));
                      void patchJobSearchField(
                        "check_accetta_lavori_con_trasferta",
                        value || null,
                      );
                    }}
                    onMultipliContrattiChange={(value) => {
                      setJobSearchDraft((current) => ({
                        ...current,
                        check_accetta_multipli_contratti: value,
                      }));
                      void patchJobSearchField(
                        "check_accetta_multipli_contratti",
                        value || null,
                      );
                    }}
                    onPaga9Change={(value) => {
                      setJobSearchDraft((current) => ({
                        ...current,
                        check_accetta_paga_9_euro_netti: value,
                      }));
                      void patchJobSearchField(
                        "check_accetta_paga_9_euro_netti",
                        value || null,
                      );
                    }}
                  />
                </div>

                <div ref={setWorkerSectionRef("esperienze")}>
                  <ExperienceReferencesCard
                    workerId={selectedWorkerId}
                    isEditing={isEditingExperience}
                    showCreateExperienceAction={isEditingExperience}
                    isUpdating={updatingExperience}
                    draft={experienceDraft}
                    experiences={selectedWorkerExperiences}
                    experiencesLoading={loadingSelectedWorkerExperiences}
                    aiSummaryValue={riassuntoProfiloField.value}
                    onAiSummaryChange={riassuntoProfiloField.onChange}
                    isGeneratingAiSummary={generatingWorkerSummary}
                    onGenerateAiSummary={onGenerateWorkerSummary}
                    references={selectedWorkerReferences}
                    referencesLoading={loadingSelectedWorkerReferences}
                    lookupColorsByDomain={lookupColorsByDomain}
                    experienceTipoLavoroOptions={experienceTipoLavoroOptions}
                    experienceTipoRapportoOptions={
                      experienceTipoRapportoOptions
                    }
                    referenceStatusOptions={referenceStatusOptions}
                    selectedAnniEsperienzaColf={anniEsperienzaColfValue}
                    selectedAnniEsperienzaBadante={anniEsperienzaBadanteValue}
                    selectedAnniEsperienzaBabysitter={anniEsperienzaBabysitterValue}
                    selectedSituazioneLavorativaAttuale={situazioneLavorativaAttualeValue}
                    onToggleEdit={() =>
                      setIsEditingExperience((current) => !current)
                    }
                    onAnniEsperienzaColfChange={anniColfField.onChange}
                    onAnniEsperienzaBadanteChange={anniBadanteField.onChange}
                    onAnniEsperienzaBabysitterChange={anniBabysitterField.onChange}
                    onSituazioneLavorativaAttualeChange={situazioneField.onChange}
                    onExperiencePatch={(experienceId, patch) =>
                      void patchExperienceRecord(experienceId, patch)
                    }
                    onExperienceCreate={(values) =>
                      void createExperienceRecord(values)
                    }
                    onExperienceDelete={(experienceId) =>
                      void deleteExperienceRecord(experienceId)
                    }
                    onReferencePatch={(referenceId, patch) =>
                      void patchReferenceRecord(referenceId, patch)
                    }
                    onReferenceCreate={(values) =>
                      void createReferenceRecord(values)
                    }
                  />
                </div>

                <div ref={setWorkerSectionRef("competenze")}>
                  <SkillsCompetenzeCard
                    isEditing={isEditingSkills}
                    isUpdating={updatingSkills}
                    draft={skillsDraft}
                    selectedValues={selectedSkillCompetenzeValues}
                    lookupOptionsByDomain={lookupOptionsByDomain}
                    lookupColorsByDomain={lookupColorsByDomain}
                    onToggleEdit={() =>
                      setIsEditingSkills((current) => !current)
                    }
                    onFieldChange={(field, value) => {
                      setSkillsDraft((current) => ({
                        ...current,
                        [field]: value,
                      }));
                      void patchSkillsField(field, value);
                    }}
                  />
                </div>

                <div ref={setWorkerSectionRef("documenti")}>
                  <DocumentsCard
                    workerId={selectedWorkerId}
                    isEditing={isEditingDocuments}
                    isUpdating={updatingDocuments}
                    draft={documentsDraft}
                    selectedValues={{
                      stato_verifica_documenti: asString(
                        selectedWorkerRow?.stato_verifica_documenti,
                      ),
                      documenti_in_regola: asString(
                        selectedWorkerRow?.documenti_in_regola,
                      ),
                      data_scadenza_naspi: naspiLCVValue,
                    }}
                    documents={selectedWorkerDocuments}
                    documentsLoading={loadingSelectedWorkerDocuments}
                    verificationOptions={documentiVerificatiOptions}
                    statoDocumentiOptions={documentiInRegolaOptions}
                    lookupColorsByDomain={lookupColorsByDomain}
                    administrativeValues={{
                      iban: resolvedIban,
                      id_stripe_account: asString(
                        selectedWorkerRow?.id_stripe_account,
                      ),
                      missingStripeRequirements: getStripeAccountMissingRequirements({
                        worker: selectedWorkerRow,
                        address: selectedWorkerAddress,
                        iban: ibanLCVValue,
                      }),
                    }}
                    ibanInputValue={ibanLCVValue}
                    stripeAccountInputValue={stripeAccountLCVValue}
                    onToggleEdit={() =>
                      setIsEditingDocuments((current) => !current)
                    }
                    onVerificationChange={(value) => {
                      setDocumentsDraft((current) => ({
                        ...current,
                        stato_verifica_documenti: value,
                      }));
                      void patchDocumentField(
                        "stato_verifica_documenti",
                        value || null,
                      );
                    }}
                    onStatoDocumentiChange={(value) => {
                      setDocumentsDraft((current) => ({
                        ...current,
                        documenti_in_regola: value,
                      }));
                      void patchDocumentField(
                        "documenti_in_regola",
                        value || null,
                      );
                    }}
                    onNaspiChange={naspiField.onChange}
                    onIbanChange={ibanField.onChange}
                    onStripeAccountChange={stripeAccountField.onChange}
                    onGenerateStripeAccount={generateStripeAccount}
                    onDocumentUpsert={upsertSelectedWorkerDocument}
                    onUploadError={setError}
                  />
                </div>

                {selectedWorkerIsNonQualificato ? (
                  <div ref={setWorkerSectionRef("non-qualificato")}>
                    <Form {...nonQualificatoForm}>
                    <DetailSectionBlock
                      title="Questo lavoratore non è qualificato"
                      icon={
                        <SirenIcon className="text-muted-foreground size-4" />
                      }
                      contentClassName="space-y-4"
                    >
                      <div className="space-y-3">
                        {selectedWorkerNonQualificatoIssues.map((issue) => (
                          <div key={issue.id} className="space-y-1">
                            <p className="font-medium">{issue.title}</p>
                            <div>
                              {issue.id === "missing-description" ? (
                                <FieldInput
                                  name="descrizione_pubblica"
                                  placeholder="Inserisci descrizione"
                                />
                              ) : null}

                              {issue.id === "missing-photo" ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={onUploadPhoto}
                                  disabled={
                                    updatingNonQualificato ||
                                    uploadingWorkerPhoto
                                  }
                                >
                                  <UploadIcon className="size-4" />
                                  Carica foto
                                </Button>
                              ) : null}

                              {issue.id === "not-milano" ? (
                                <FieldInput
                                  name="provincia"
                                  placeholder="Provincia (sigla)"
                                />
                              ) : null}

                              {issue.id === "documenti" ? (
                                <FieldDocumentiInRegolaSelect
                                  name="documenti_in_regola"
                                  options={documentiInRegolaOptions}
                                  disabled={updatingNonQualificato}
                                />
                              ) : null}

                              {issue.id === "referenze" ? (
                                <FieldHaiReferenzeSelect
                                  name="hai_referenze"
                                  options={haiReferenzeOptions}
                                  disabled={updatingNonQualificato}
                                />
                              ) : null}

                              {issue.id === "age" ? (
                                <FieldInput
                                  name="data_di_nascita"
                                  type="date"
                                />
                              ) : null}

                              {issue.id === "tipo-lavoro" ? (
                                <FieldNonQualificatoTipoLavoro
                                  name="tipo_lavoro_domestico"
                                  options={tipoLavoroDomesticoOptions}
                                  disabled={updatingNonQualificato}
                                />
                              ) : null}

                              {issue.id === "esperienza" ? (
                                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                  <FieldInput
                                    name="anni_esperienza_colf"
                                    type="number"
                                    inputMode="decimal"
                                    placeholder="Anni esperienza colf"
                                  />
                                  <FieldInput
                                    name="anni_esperienza_babysitter"
                                    type="number"
                                    inputMode="decimal"
                                    placeholder="Anni esperienza babysitter"
                                  />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </DetailSectionBlock>
                    </Form>
                  </div>
                ) : null}

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
                      <p className="text-muted-foreground text-sm">
                        Caricamento ricerche coinvolte...
                      </p>
                    ) : relatedActiveSearches.direct.length === 0 &&
                      relatedActiveSearches.other.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        Nessuna ricerca coinvolta.
                      </p>
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
                            <p className="text-muted-foreground text-sm">
                              Nessun coinvolgimento diretto.
                            </p>
                          ) : (
                            <Accordion
                              type="multiple"
                              defaultValue={groupedDirectRelatedSearches.map(([groupLabel]) => `direct-${groupLabel}`)}
                              className="space-y-3"
                            >
                              {groupedDirectRelatedSearches.map(([groupLabel, groupItems]) => (
                                <AccordionItem
                                  key={`direct-${groupLabel}`}
                                  value={`direct-${groupLabel}`}
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
                                        onClick={() => openRicercaDetailFromWorker(item.processId)}
                                      />
                                    ))}
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          )}
                        </TabsContent>

                        <TabsContent value="other" className="mt-0">
                          {groupedOtherRelatedSearches.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                              Nessun'altra ricerca rilevante.
                            </p>
                          ) : (
                            <Accordion
                              type="multiple"
                              defaultValue={groupedOtherRelatedSearches.map(([groupLabel]) => `other-${groupLabel}`)}
                              className="space-y-3"
                            >
                              {groupedOtherRelatedSearches.map(([groupLabel, groupItems]) => (
                                <AccordionItem
                                  key={`other-${groupLabel}`}
                                  value={`other-${groupLabel}`}
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
                                        onClick={() => openRicercaDetailFromWorker(item.processId)}
                                      />
                                    ))}
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          )}
                        </TabsContent>
                      </Tabs>
                    )}
                  </DetailSectionBlock>
                </div>
              </div>
            </div>
          ) : null}
          <RecruiterFeedbackButton
            value={asString(selectedWorkerRow?.feedback_recruiter)}
            operatorName={operatorName}
            onSave={(next) =>
              patchSelectedWorkerField(
                "feedback_recruiter",
                next.trim() || null,
              )
            }
          />
        </WorkerDetailShell>
        <Dialog
          open={isAddSearchDialogOpen}
          onOpenChange={(nextOpen) => {
            if (isSubmittingAddSearch) return;
            setIsAddSearchDialogOpen(nextOpen);
          }}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Aggiungi ad una ricerca</DialogTitle>
              <DialogDescription>
                Cerca una ricerca per email famiglia, nome famiglia o ID e
                inserisci il lavoratore in Prospetto.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Cerca ricerca</p>
                <Input
                  value={searchProcessQuery}
                  onChange={(event) =>
                    setSearchProcessQuery(event.target.value)
                  }
                  placeholder="Email famiglia, nome famiglia o ID ricerca"
                  className="w-full"
                />
                {searchProcessQuery.trim().length < 2 ? (
                  <p className="text-muted-foreground text-xs">
                    Inserisci almeno 2 caratteri.
                  </p>
                ) : isSearchProcessLoading ? (
                  <p className="text-muted-foreground text-xs">
                    Caricamento risultati...
                  </p>
                ) : searchProcessResults.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    Nessuna ricerca trovata.
                  </p>
                ) : (
                  <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border p-2">
                    {searchProcessResults.map((result) => {
                      const isSelected =
                        selectedSearchToAdd?.processId === result.processId;

                      return (
                        <button
                          key={result.processId}
                          type="button"
                          onClick={() => setSelectedSearchToAdd(result)}
                          className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                            isSelected
                              ? "border-emerald-400 bg-emerald-50"
                              : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium">
                                {result.familyName}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {result.searchLabel} • {result.familyEmail}
                              </div>
                            </div>
                            <span className="text-muted-foreground shrink-0 text-xs">
                              {result.statoRicerca}
                            </span>
                          </div>
                          <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                            <span>{result.tipoLavoro}</span>
                            <span>{result.tipoRapporto}</span>
                            <span>{result.orarioDiLavoro}</span>
                            <span>{result.zona}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Motivazione</p>
                <Textarea
                  value={manualSearchInsertReason}
                  onChange={(event) =>
                    setManualSearchInsertReason(event.target.value)
                  }
                  placeholder="Scrivi perché vuoi aggiungere questo lavoratore alla ricerca"
                  className="min-h-28 w-full"
                />
              </div>
            </div>

            <DialogFooter>
              {selectedSearchToAdd && onOpenRicercaDetail ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => openRicercaDetailFromWorker(selectedSearchToAdd.processId)}
                  disabled={isSubmittingAddSearch}
                >
                  <ExternalLinkIcon className="size-4" />
                  Apri ricerca
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddSearchDialogOpen(false)}
                disabled={isSubmittingAddSearch}
              >
                Annulla
              </Button>
              <Button
                type="button"
                onClick={() => void onAddWorkerToSearch()}
                disabled={
                  isSubmittingAddSearch ||
                  !selectedSearchToAdd ||
                  !manualSearchInsertReason.trim()
                }
              >
                {isSubmittingAddSearch ? (
                  <LoaderCircleIcon className="size-4 animate-spin" />
                ) : null}
                Aggiungi alla ricerca
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </>
  )
}
