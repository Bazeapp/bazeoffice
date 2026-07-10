import type * as React from "react"

import type {
  AvailabilityEditBandField,
  AvailabilityEditDayField,
  LookupOption,
} from "@/modules/lavoratori/lib"
import type {
  DocumentoLavoratoreRecord,
  EsperienzaLavoratoreRecord,
  LavoratoreRecord,
  ReferenzaLavoratoreRecord,
} from "@/modules/lavoratori/types"

export type RelatedActiveSearchItem = {
  selectionId: string
  processId: string
  familyName: string
  ricercaLabel: string
  recruiterLabel: string
  statoSelezione: string
  statoSelezioneColor?: string | null
  statoRicerca: string
  statoRicercaColor?: string | null
  orarioDiLavoro: string
  zona: string
  appunti: string
  workerColloquio?: { giorni: string; orario: string }
}

export type RelatedSearchGroups = {
  direct: RelatedActiveSearchItem[]
  other: RelatedActiveSearchItem[]
}

export type SkillCompetenzeValues = {
  livello_pulizie: string
  check_accetta_salire_scale_o_soffitti_alti: string
  compatibilita_famiglie_numerose: string
  compatibilita_famiglie_molto_esigenti: string
  compatibilita_lavoro_con_datore_presente_in_casa: string
  compatibilita_con_case_di_grandi_dimensioni: string
  compatibilita_con_elevata_autonomia_richiesta: string
  compatibilita_con_contesti_pacati: string
  livello_stiro: string
  compatibilita_con_stiro_esigente: string
  livello_cucina: string
  compatibilita_con_cucina_strutturata: string
  livello_babysitting: string
  check_accetta_babysitting_multipli_bambini: string
  check_accetta_babysitting_neonati: string
  compatibilita_babysitting_neonati: string
  livello_dogsitting: string
  check_accetta_case_con_cani: string
  check_accetta_case_con_cani_grandi: string
  check_accetta_case_con_gatti: string
  compatibilita_con_animali_in_casa: string
  livello_giardinaggio: string
  livello_italiano: string
  livello_inglese: string
}

export type WorkerAddressDraft = {
  via: string
  civico: string
  cap: string
  citta: string
  provincia: string
  citofono: string
  come_ti_sposti: string[]
}

export type FamilyAddressDraft = {
  indirizzo_prova_provincia: string
  indirizzo_prova_cap: string
  indirizzo_prova_via: string
  indirizzo_prova_civico: string
  indirizzo_prova_comune: string
  indirizzo_prova_citofono: string
  indirizzo_prova_note: string
}

export type ExperienceSummaryDraft = {
  anni_esperienza_colf: string
  anni_esperienza_badante: string
  anni_esperienza_babysitter: string
  situazione_lavorativa_attuale: string
  riassunto_profilo_breve: string
}

export type ExperienceDraft = {
  anni_esperienza_colf: string
  anni_esperienza_badante: string
  anni_esperienza_babysitter: string
  situazione_lavorativa_attuale: string
}

export type JobSearchDraft = {
  tipo_lavoro_domestico: string[]
  tipo_rapporto_lavorativo: string[]
  check_accetta_funzionamento_baze: string
  check_accetta_lavori_con_trasferta: string
  check_accetta_multipli_contratti: string
  check_accetta_paga_9_euro_netti: string
}

export type DocumentsDraft = {
  stato_verifica_documenti: string
  documenti_in_regola: string
  data_scadenza_naspi: string
  iban: string
  id_stripe_account: string
}

export type WorkerPipelineSummaryTone = "high" | "medium" | "low" | "neutral"

export type PreferenceFieldName =
  | "check_accetta_funzionamento_baze"
  | "check_accetta_lavori_con_trasferta"
  | "check_accetta_multipli_contratti"
  | "check_accetta_paga_9_euro_netti"

export type PreferenceFieldConfig = {
  field: PreferenceFieldName
  label: string
  domain: string
  value: string
  options: LookupOption[]
}

export type JobSearchFieldName =
  | "tipo_lavoro_domestico"
  | "tipo_rapporto_lavorativo"
  | "check_accetta_funzionamento_baze"
  | "check_accetta_lavori_con_trasferta"
  | "check_accetta_multipli_contratti"
  | "check_accetta_paga_9_euro_netti"

export type WorkerPipelineSummaryTravelTimeCardProps = {
  workerRow: LavoratoreRecord
  selectionRow?: Record<string, unknown> | null
  onPatchWorkerField?: (
    field: keyof LavoratoreRecord,
    value: unknown,
  ) => Promise<void> | void
  onPatchWorkerAddress?: (
    field: "via" | "civico" | "cap" | "citta" | "provincia" | "citofono" | "note",
    value: string | null,
  ) => Promise<void>
  workerVia?: string | null
  workerCivico?: string | null
  workerCap?: string | null
  workerCitta?: string | null
  workerProvincia?: string | null
  workerCitofono?: string | null
  onPatchProcessField?: (
    field:
      | "indirizzo_prova_provincia"
      | "indirizzo_prova_cap"
      | "indirizzo_prova_via"
      | "indirizzo_prova_civico"
      | "indirizzo_prova_comune"
      | "indirizzo_prova_citofono"
      | "indirizzo_prova_note",
    value: unknown,
  ) => Promise<void> | void
  familyAddress?: string | null
  familyCap?: string | null
  familyProvince?: string | null
  familyStreet?: string | null
  familyCivicNumber?: string | null
  familyCity?: string | null
  familyIntercom?: string | null
  familyAddressNote?: string | null
  provinceOptions?: LookupOption[]
  mobilityOptions?: LookupOption[]
  updatingProcessAddress?: boolean
}

export type WorkerPipelineSummaryExperienceCardProps = {
  workerRow: LavoratoreRecord
  lookupColorsByDomain: Map<string, string>
  experienceTipoLavoroOptions: LookupOption[]
  experienceTipoRapportoOptions: LookupOption[]
  tipoLavoroOptions: LookupOption[]
  referenceStatusOptions: LookupOption[]
  experiences: EsperienzaLavoratoreRecord[]
  experiencesLoading?: boolean
  isGeneratingAiSummary?: boolean
  onGenerateAiSummary?: () => Promise<void> | void
  references: ReferenzaLavoratoreRecord[]
  referencesLoading?: boolean
  isEditing: boolean
  onToggleEdit: () => void
  isUpdating: boolean
  jobSearchDraft: Pick<JobSearchDraft, "tipo_lavoro_domestico">
  onJobSearchDraftChange: (patch: Partial<JobSearchDraft>) => void
  onJobSearchFieldPatch: (
    field: JobSearchFieldName,
    value: unknown,
  ) => Promise<void> | void
  onFieldSave: (field: string, value: string) => void
  onExperiencePatch: (
    experienceId: string,
    patch: Partial<EsperienzaLavoratoreRecord>,
  ) => Promise<void> | void
  onExperienceCreate: (
    values: Partial<EsperienzaLavoratoreRecord>,
  ) => Promise<void> | void
  onExperienceDelete: (experienceId: string) => Promise<void> | void
  onReferencePatch: (
    referenceId: string,
    patch: Partial<ReferenzaLavoratoreRecord>,
  ) => Promise<void> | void
  onReferenceCreate: (
    values: Partial<ReferenzaLavoratoreRecord>,
  ) => Promise<void> | void
}

export type WorkerPipelineSummaryAvailabilityCardProps = {
  availabilityTitleMeta: string
  familyAvailabilityJson?: string | null
  familyWorkSchedule?: string | null
  familyWeeklyFrequency?: string | null
  processWeeklyHours?: string | null
  tipoRapportoOptions: LookupOption[]
  tipoRapportoValues: string[]
  onTipoRapportoChange: (values: string[]) => void
  isEditing: boolean
  onToggleEdit: () => void
  isUpdating: boolean
  lookupColorsByDomain: Map<string, string>
  lavoriAccettabili: string[]
  lavoriAccettabiliOptions: LookupOption[]
  matrix: Record<string, boolean>
  readOnlyRows: Array<{ day: string; activeByHour: boolean[] }>
  vincoliOrari: string
  onLavoriAccettabiliChange: (values: string[]) => void
  onMatrixChange: (
    dayField: AvailabilityEditDayField,
    bandField: AvailabilityEditBandField,
    checked: boolean,
  ) => void
  onVincoliChange: (value: string) => void
  onSave: () => void
}

export type WorkerPipelineSummaryPreferencesCardProps = {
  workerRow: LavoratoreRecord
  isEditing: boolean
  onToggleEdit: () => void
  isUpdating: boolean
  draft: Pick<
    JobSearchDraft,
    | "check_accetta_funzionamento_baze"
    | "check_accetta_lavori_con_trasferta"
    | "check_accetta_multipli_contratti"
    | "check_accetta_paga_9_euro_netti"
  >
  lookupColorsByDomain: Map<string, string>
  funzionamentoBazeOptions: LookupOption[]
  trasfertaOptions: LookupOption[]
  multipliContrattiOptions: LookupOption[]
  paga9Options: LookupOption[]
  onDraftChange: (patch: Partial<JobSearchDraft>) => void
  onFieldPatch: (
    field: JobSearchFieldName,
    value: unknown,
  ) => Promise<void> | void
}

export type WorkerPipelineSummaryRelatedSearchesCardProps = {
  groups: RelatedSearchGroups
  loading?: boolean
  onOpenSearch?: (processId: string, selectionId: string) => void
}

export type WorkerPipelineSummaryCardsProps = {
  workerRow: LavoratoreRecord
  selectionRow?: Record<string, unknown> | null
  relatedActiveSearches: RelatedSearchGroups
  relatedActiveSearchesLoading?: boolean
  onOpenRelatedSearch?: (processId: string, selectionId: string) => void
  onPatchWorkerField?: (
    field: keyof LavoratoreRecord,
    value: unknown,
  ) => Promise<void> | void
  onPatchWorkerAddress?: (
    field: "via" | "civico" | "cap" | "citta" | "provincia" | "citofono" | "note",
    value: string | null,
  ) => Promise<void>
  workerVia?: string | null
  workerCivico?: string | null
  workerCap?: string | null
  workerCitta?: string | null
  workerProvincia?: string | null
  workerCitofono?: string | null
  onPatchProcessField?: WorkerPipelineSummaryTravelTimeCardProps["onPatchProcessField"]
  processWeeklyHours?: string | null
  familyAddress?: string | null
  familyCap?: string | null
  familyProvince?: string | null
  familyStreet?: string | null
  familyCivicNumber?: string | null
  familyCity?: string | null
  familyIntercom?: string | null
  familyAddressNote?: string | null
  familyAvailabilityJson?: string | null
  familyWorkSchedule?: string | null
  familyWeeklyFrequency?: string | null
  provinceOptions?: LookupOption[]
  updatingProcessAddress?: boolean
  availabilityTitleMeta: string
  availabilityReadOnlyRows: Array<{ day: string; activeByHour: boolean[] }>
  lookupOptionsByDomain: Map<string, LookupOption[]>
  lookupColorsByDomain: Map<string, string>
  experienceTipoLavoroOptions: LookupOption[]
  experienceTipoRapportoOptions: LookupOption[]
  tipoLavoroOptions: LookupOption[]
  tipoRapportoOptions: LookupOption[]
  referenceStatusOptions: LookupOption[]
  experiences: EsperienzaLavoratoreRecord[]
  experiencesLoading?: boolean
  isGeneratingAiSummary?: boolean
  onGenerateAiSummary?: () => Promise<void> | void
  references: ReferenzaLavoratoreRecord[]
  referencesLoading?: boolean
  documents: DocumentoLavoratoreRecord[]
  documentsLoading?: boolean
  isEditingAvailability: boolean
  onToggleAvailabilityEdit: () => void
  updatingAvailability: boolean
  isEditingJobSearch: boolean
  onToggleJobSearchEdit: () => void
  updatingJobSearch: boolean
  jobSearchDraft: JobSearchDraft
  funzionamentoBazeOptions: LookupOption[]
  trasfertaOptions: LookupOption[]
  multipliContrattiOptions: LookupOption[]
  paga9Options: LookupOption[]
  onJobSearchDraftChange: (patch: Partial<JobSearchDraft>) => void
  onJobSearchFieldPatch: (
    field: JobSearchFieldName,
    value: unknown,
  ) => Promise<void> | void
  lavoriAccettabili: string[]
  lavoriAccettabiliOptions: LookupOption[]
  availabilityMatrix: Record<string, boolean>
  availabilityVincoli: string
  onLavoriAccettabiliChange: (values: string[]) => void
  onAvailabilityMatrixChange: (
    dayField: AvailabilityEditDayField,
    bandField: AvailabilityEditBandField,
    checked: boolean,
  ) => void
  onAvailabilityVincoliChange: (value: string) => void
  onAvailabilitySave: () => void
  isEditingExperience: boolean
  onToggleExperienceEdit: () => void
  updatingExperience: boolean
  experienceDraft: ExperienceDraft
  onExperienceDraftChange: (patch: Partial<ExperienceDraft>) => void
  onExperienceFieldSave: (field: string, value: string) => void
  onExperiencePatch: WorkerPipelineSummaryExperienceCardProps["onExperiencePatch"]
  onExperienceCreate: WorkerPipelineSummaryExperienceCardProps["onExperienceCreate"]
  onExperienceDelete: WorkerPipelineSummaryExperienceCardProps["onExperienceDelete"]
  onReferencePatch: WorkerPipelineSummaryExperienceCardProps["onReferencePatch"]
  onReferenceCreate: WorkerPipelineSummaryExperienceCardProps["onReferenceCreate"]
  isEditingSkills: boolean
  onToggleSkillsEdit: () => void
  updatingSkills: boolean
  skillsDraft: SkillCompetenzeValues
  onSkillsDraftChange: (patch: Partial<SkillCompetenzeValues>) => void
  onSkillsFieldPatch: (
    field: keyof SkillCompetenzeValues,
    value: string,
  ) => Promise<void> | void
  isEditingDocuments: boolean
  onToggleDocumentsEdit: () => void
  updatingDocuments: boolean
  documentsDraft: DocumentsDraft
  resolvedIban: string
  documentiVerificatiOptions: LookupOption[]
  documentiInRegolaOptions: LookupOption[]
  onDocumentVerificationChange: (value: string) => void
  onDocumentStatusChange: (value: string) => void
  naspiInputValue?: string
  ibanInputValue?: string
  stripeAccountInputValue?: string
  onDocumentNaspiChange: (value: string) => void
  onDocumentIbanChange: (value: string) => void
  onDocumentStripeAccountChange: (value: string) => void
  onDocumentUpsert: (row: DocumentoLavoratoreRecord) => void
  onDocumentUploadError: React.Dispatch<React.SetStateAction<string | null>>
}
