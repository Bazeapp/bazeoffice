import type * as React from "react"
import type { ControllerRenderProps } from "react-hook-form"

import type { WorkerAddressDraft } from "@/modules/lavoratori/lib"
import type { OpenRicercaDetailOptions } from "@/routes/app-routes"
import type { useSelectedWorkerEditor } from "../hooks/use-selected-worker-editor"
import {
  AVAILABILITY_EDIT_BANDS,
  AVAILABILITY_EDIT_DAYS,
  AVAILABILITY_HOUR_LABELS,
} from "../lib/availability-utils"
import type { SearchProcessResult, WorkerRelatedSearchItem } from "../lib/cerca-utils"
import type { LookupOption } from "@/lib/lookup-utils"
import type { NonQualificatoIssue } from "../lib/status-utils"
import type {
  DocumentoLavoratoreRecord,
  EsperienzaLavoratoreRecord,
  LeadDetailFormDraft,
  LavoratoreRecord,
  NonQualificatoFormDraft,
  ReferenzaLavoratoreRecord,
} from "../types"
import type { LavoratoreListItem } from "./lavoratore-card"

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
  nonQualificatoForm: ReturnType<
    typeof import("@/hooks/use-auto-save-form").useAutoSaveForm<NonQualificatoFormDraft>
  >
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

export type LavoratoriCercaDetailHeaderProps = Pick<
  LavoratoriCercaDetailPanelProps,
  | "selectedWorkerBlacklistAlert"
  | "selectedWorkerStatusAlert"
  | "selectedWorker"
  | "selectedWorkerRow"
  | "availabilityStatusDraft"
  | "dataRitornoLCVValue"
  | "statoLavoratoreLookupOptions"
  | "disponibilitaLookupOptions"
  | "motivazioniNonIdoneoOptions"
  | "sessoLookupOptions"
  | "nazionalitaLookupOptions"
  | "patchSelectedWorkerField"
  | "setAvailabilityStatusDraft"
  | "patchWorkerAvailabilityStatus"
  | "dataRitornoField"
  | "handleNonIdoneoReasonsChange"
  | "updatingNonQualificato"
  | "updatingAvailabilityStatus"
  | "updatingNonIdoneo"
  | "blacklistChecked"
  | "handleBlacklistChange"
  | "presentationPhotoSlots"
  | "selectedPresentationPhotoIndex"
  | "onPrimaryWorkerPhotoChange"
  | "onUploadPhoto"
  | "selectedMotivazioneClassName"
>

export type LavoratoriCercaDetailProcessiProps = Pick<
  LavoratoriCercaDetailPanelProps,
  | "setWorkerSectionRef"
  | "setIsAddSearchDialogOpen"
  | "selectedWorkerId"
  | "loadingRelatedActiveSearches"
  | "relatedActiveSearches"
  | "groupedDirectRelatedSearches"
  | "groupedOtherRelatedSearches"
  | "getSelectionStateClassName"
  | "openRicercaDetailFromWorker"
>

export type LavoratoriCercaDetailCardsProps = Pick<
  LavoratoriCercaDetailPanelProps,
  | "setWorkerSectionRef"
  | "selectedWorkerRow"
  | "selectedWorkerId"
  | "selectedWorkerAddress"
  | "addressMobilityAnchor"
  | "mobilityLookupOptions"
  | "addressDraft"
  | "setAddressDraft"
  | "isEditingAddress"
  | "setIsEditingAddress"
  | "commitAddressField"
  | "patchWorkerAddressField"
  | "provinciaLookupOptions"
  | "patchSelectedWorkerField"
  | "updatingNonQualificato"
  | "lookupOptionsByDomain"
  | "lookupColorsByDomain"
  | "availabilityPayload"
  | "availabilityReadOnlyRows"
  | "isEditingAvailability"
  | "setIsEditingAvailability"
  | "updatingAvailability"
  | "availabilityDraft"
  | "setAvailabilityDraft"
  | "availabilityEditDays"
  | "availabilityEditBands"
  | "availabilityHourLabels"
  | "onAvailabilityMatrixChange"
  | "onAvailabilitySave"
  | "isEditingJobSearch"
  | "setIsEditingJobSearch"
  | "updatingJobSearch"
  | "jobSearchDraft"
  | "setJobSearchDraft"
  | "tipoLavoroDomesticoOptions"
  | "tipoRapportoLavorativoOptions"
  | "lavoriAccettabiliOptions"
  | "trasfertaOptions"
  | "multipliContrattiOptions"
  | "paga9Options"
  | "patchJobSearchField"
  | "selectedWorkerExperiences"
  | "loadingSelectedWorkerExperiences"
  | "generatingWorkerSummary"
  | "onGenerateWorkerSummary"
  | "experienceTipoLavoroOptions"
  | "experienceTipoRapportoOptions"
  | "isEditingExperience"
  | "setIsEditingExperience"
  | "updatingExperience"
  | "experienceDraft"
  | "patchExperienceRecord"
  | "createExperienceRecord"
  | "deleteExperienceRecord"
  | "selectedWorkerReferences"
  | "loadingSelectedWorkerReferences"
  | "referenceStatusOptions"
  | "patchReferenceRecord"
  | "createReferenceRecord"
  | "anniEsperienzaColfValue"
  | "anniEsperienzaBadanteValue"
  | "anniEsperienzaBabysitterValue"
  | "situazioneLavorativaAttualeValue"
  | "anniColfField"
  | "anniBadanteField"
  | "anniBabysitterField"
  | "situazioneField"
  | "riassuntoProfiloField"
  | "selectedSkillCompetenzeValues"
  | "isEditingSkills"
  | "setIsEditingSkills"
  | "updatingSkills"
  | "skillsDraft"
  | "setSkillsDraft"
  | "patchSkillsField"
  | "selectedWorkerDocuments"
  | "loadingSelectedWorkerDocuments"
  | "isEditingDocuments"
  | "setIsEditingDocuments"
  | "updatingDocuments"
  | "documentsDraft"
  | "setDocumentsDraft"
  | "documentiVerificatiOptions"
  | "documentiInRegolaOptions"
  | "resolvedIban"
  | "naspiLCVValue"
  | "ibanLCVValue"
  | "stripeAccountLCVValue"
  | "naspiField"
  | "ibanField"
  | "stripeAccountField"
  | "generateStripeAccount"
  | "patchDocumentField"
  | "upsertSelectedWorkerDocument"
  | "setError"
>

export type LavoratoriCercaDetailNonQualificatoProps = Pick<
  LavoratoriCercaDetailPanelProps,
  | "setWorkerSectionRef"
  | "selectedWorkerNonQualificatoIssues"
  | "nonQualificatoForm"
  | "onUploadPhoto"
  | "updatingNonQualificato"
  | "uploadingWorkerPhoto"
  | "documentiInRegolaOptions"
  | "haiReferenzeOptions"
  | "tipoLavoroDomesticoOptions"
>

export type LavoratoriCercaDetailAddSearchDialogProps = Pick<
  LavoratoriCercaDetailPanelProps,
  | "isAddSearchDialogOpen"
  | "setIsAddSearchDialogOpen"
  | "isSubmittingAddSearch"
  | "searchProcessQuery"
  | "setSearchProcessQuery"
  | "isSearchProcessLoading"
  | "searchProcessResults"
  | "selectedSearchToAdd"
  | "setSelectedSearchToAdd"
  | "manualSearchInsertReason"
  | "setManualSearchInsertReason"
  | "onAddWorkerToSearch"
  | "onOpenRicercaDetail"
  | "openRicercaDetailFromWorker"
>
