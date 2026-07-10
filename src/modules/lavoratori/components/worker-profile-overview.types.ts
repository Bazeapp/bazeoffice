import type { LavoratoreListItem } from "./lavoratore-card"
import type { LavoratoreRecord } from "../types/lavoratore"
import type { getWorkerQualificationStatus } from "../lib/status-utils"

export type WorkerProfileOverviewLookupOption = {
  label: string
  value: string
}

export type WorkerProfileOverviewDraft = {
  nome: string
  cognome: string
  email: string
  telefono: string
  sesso: string
  nazionalita: string
  data_di_nascita: string
  descrizione_pubblica: string
}

export type WorkerProfileOverviewProps = {
  worker: LavoratoreListItem
  workerRow: LavoratoreRecord
  isEditing?: boolean
  /** Quando true, i campi editabili usano react-hook-form (parent Form). */
  useFormFields?: boolean
  draft?: WorkerProfileOverviewDraft
  livelloItaliano?: string
  livelloItalianoOptions?: WorkerProfileOverviewLookupOption[]
  sessoOptions?: WorkerProfileOverviewLookupOption[]
  nazionalitaOptions?: WorkerProfileOverviewLookupOption[]
  lookupColorsByDomain?: Map<string, string>
  presentationPhotoSlots?: string[]
  selectedPresentationPhotoIndex?: number
  showUploadPhotoAction?: boolean
  uploadingPhoto?: boolean
  onUploadPhoto?: () => void
  onSelectedPresentationPhotoIndexChange?: (value: number) => void
  onLivelloItalianoChange?: (value: string) => void
  onFieldChange?: (field: string, value: string) => void
}

export type WorkerProfileQualificationStatus = ReturnType<
  typeof getWorkerQualificationStatus
>

export type WorkerProfileOverviewValues = {
  qualificationStatus: WorkerProfileQualificationStatus
  canUseSessoSelect: boolean
  email: string
  telefono: string
  descrizione: string
  livelloItaliano: string
  livelloItalianoOptions: WorkerProfileOverviewLookupOption[]
  sesso: string
  nazionalita: string
  sessoOptions: WorkerProfileOverviewLookupOption[]
  nazionalitaOptions: WorkerProfileOverviewLookupOption[]
  dataNascita: string
}
