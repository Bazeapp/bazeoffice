import * as React from "react"
import { toast } from "sonner"

import type { LavoratoreListItem } from "../components/lavoratore-card"
import {
  AVAILABILITY_EDIT_BANDS,
  AVAILABILITY_EDIT_DAYS,
  AVAILABILITY_HOUR_LABELS,
  formatDateOnly,
} from "../lib/availability-utils"
import {
  asInputValue,
  asLavoratoreRecord,
  asString,
  getAgeFromBirthDate,
  parseNumberValue,
  readArrayStrings,
} from "../lib/base-utils"
import { parseRecruiterFeedback } from "../lib/feedback-utils"
import {
  getTagClassName,
  normalizeLookupToken,
  resolveLookupColor,
} from "../lib/lookup-utils"
import {
  findNonQualificatoIssues,
  isNonIdoneoStatus,
  normalizeWorkerStatus,
} from "../lib/status-utils"
import { updateRecord } from "@/lib/record-crud"
import type { EsperienzaLavoratoreRecord } from "../types/esperienza-lavoratore"
import type { LavoratoreRecord } from "../types/lavoratore"
import type { ReferenzaLavoratoreRecord } from "../types/referenza-lavoratore"
import { type PatchLoadingKey } from "../lib/worker-editor-draft-builders"
import { formatEditorError } from "../lib/worker-editor-utils"
import { useWorkerAddressEditor } from "./use-worker-address-editor"
import { useWorkerAvailabilityEditor } from "./use-worker-availability-editor"
import { useWorkerDocumentsEditor } from "./use-worker-documents-editor"
import { useWorkerExperienceEditor } from "./use-worker-experience-editor"
import { useWorkerHeaderEditor } from "./use-worker-header-editor"
import { useWorkerJobSearchEditor } from "./use-worker-job-search-editor"
import { useWorkerSkillsEditor } from "./use-worker-skills-editor"

type UseSelectedWorkerEditorParams = {
  selectedWorkerId: string | null
  selectedWorker: LavoratoreListItem | null
  selectedWorkerRow: LavoratoreRecord | null
  selectedWorkerAddress: Record<string, unknown> | null
  lookupColorsByDomain: Map<string, string>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  applyUpdatedWorkerRow: (row: LavoratoreRecord) => void
  applyUpdatedWorkerAddress: (row: Record<string, unknown>) => void
  applyUpdatedWorkerExperience: (row: EsperienzaLavoratoreRecord) => void
  appendCreatedWorkerExperience: (row: EsperienzaLavoratoreRecord) => void
  removeWorkerExperience: (id: string) => void
  applyUpdatedWorkerReference: (row: ReferenzaLavoratoreRecord) => void
  appendCreatedWorkerReference: (row: ReferenzaLavoratoreRecord) => void
}

export function useSelectedWorkerEditor({
  selectedWorkerId,
  selectedWorker,
  selectedWorkerRow,
  selectedWorkerAddress,
  lookupColorsByDomain,
  setError,
  applyUpdatedWorkerRow,
  applyUpdatedWorkerAddress,
  applyUpdatedWorkerExperience,
  appendCreatedWorkerExperience,
  removeWorkerExperience,
  applyUpdatedWorkerReference,
  appendCreatedWorkerReference,
}: UseSelectedWorkerEditorParams) {
  const [nonIdoneoReasonValues, setNonIdoneoReasonValues] = React.useState<string[]>([])
  const [blacklistChecked, setBlacklistChecked] = React.useState(false)
  const [updatingNonIdoneo, setUpdatingNonIdoneo] = React.useState(false)
  const [updatingNonQualificato, setUpdatingNonQualificato] = React.useState(false)

  const activePatchesRef = React.useRef(0)

  const selectedWorkerIsNonIdoneo = React.useMemo(
    () => isNonIdoneoStatus(selectedWorkerRow?.stato_lavoratore),
    [selectedWorkerRow]
  )
  const selectedWorkerNonQualificatoIssues = React.useMemo(
    () => findNonQualificatoIssues(selectedWorkerRow ?? {}),
    [selectedWorkerRow]
  )
  const selectedWorkerIsNonQualificato = React.useMemo(
    () => normalizeWorkerStatus(selectedWorkerRow?.stato_lavoratore) === "non qualificato",
    [selectedWorkerRow]
  )
  const recruiterFeedbackEntries = React.useMemo(
    () => parseRecruiterFeedback(asString(selectedWorkerRow?.feedback_recruiter)),
    [selectedWorkerRow]
  )
  const disponibilitaBadgeClassName = React.useMemo(
    () =>
      getTagClassName(
        resolveLookupColor(
          lookupColorsByDomain,
          "lavoratori.disponibilita",
          asString(selectedWorkerRow?.disponibilita)
        )
      ),
    [lookupColorsByDomain, selectedWorkerRow]
  )

  React.useEffect(() => {
    if (activePatchesRef.current > 0) return
    setNonIdoneoReasonValues(readArrayStrings(selectedWorkerRow?.motivazione_non_idoneo))
    const blacklistToken = normalizeLookupToken(selectedWorkerRow?.check_blacklist)
    setBlacklistChecked(blacklistToken === "blacklist" || blacklistToken === "yes")
  }, [selectedWorkerRow])

  const setPatchLoading = React.useCallback((key: PatchLoadingKey, value: boolean) => {
    switch (key) {
      case "nonIdoneo":
        setUpdatingNonIdoneo(value)
        break
      case "nonQualificato":
        setUpdatingNonQualificato(value)
        break
    }
  }, [])

  const applyWorkerPatch = React.useCallback(
    async (
      patch: Partial<LavoratoreRecord> & Record<string, unknown>,
      options: {
        loadingKey?: PatchLoadingKey
        errorMessage: string
      }
    ) => {
      if (!selectedWorkerId) return null
      activePatchesRef.current++
      if (options.loadingKey) setPatchLoading(options.loadingKey, true)
      try {
        const result = await updateRecord("lavoratori", selectedWorkerId, patch)
        const nextRow = asLavoratoreRecord(result.row)
        applyUpdatedWorkerRow(nextRow)
        return nextRow
      } catch (caughtError) {
        const message = formatEditorError(options.errorMessage, caughtError)
        setError(message)
        toast.error(message)
        throw caughtError
      } finally {
        activePatchesRef.current--
        if (options.loadingKey) setPatchLoading(options.loadingKey, false)
      }
    },
    [applyUpdatedWorkerRow, selectedWorkerId, setError, setPatchLoading]
  )

  const patchWorkerField = React.useCallback(
    async (
      field: keyof LavoratoreRecord,
      value: unknown,
      options: {
        loadingKey?: PatchLoadingKey
        errorMessage: string
      }
    ) => {
      await applyWorkerPatch(
        {
          [field]: value,
        } as Partial<LavoratoreRecord> & Record<string, unknown>,
        options
      )
    },
    [applyWorkerPatch]
  )

  const handleNonIdoneoReasonsChange = React.useCallback(
    async (values: string[]) => {
      if (!selectedWorkerId) return
      setNonIdoneoReasonValues(values)
      await patchWorkerField(
        "motivazione_non_idoneo",
        values.length > 0 ? values : null,
        {
          loadingKey: "nonIdoneo",
          errorMessage: "Errore aggiornando motivazione non idoneo",
        }
      )
    },
    [patchWorkerField, selectedWorkerId]
  )

  const handleBlacklistChange = React.useCallback(
    async (checked: boolean) => {
      if (!selectedWorkerId) return
      setBlacklistChecked(checked)
      await patchWorkerField("check_blacklist", checked ? "blacklist" : null, {
        loadingKey: "nonIdoneo",
        errorMessage: "Errore aggiornando blacklist",
      })
    },
    [patchWorkerField, selectedWorkerId]
  )

  const patchSelectedWorkerField = React.useCallback(
    async (field: keyof LavoratoreRecord, value: unknown) => {
      if (!selectedWorkerId) return
      await patchWorkerField(field, value, {
        errorMessage: "Errore aggiornando campo",
      })
    },
    [patchWorkerField, selectedWorkerId]
  )

  const {
    isEditingHeader,
    setIsEditingHeader,
    presentationPhotoSlots,
    selectedPresentationPhotoIndex,
    setSelectedPresentationPhotoIndex,
  } = useWorkerHeaderEditor({
    selectedWorkerId,
    selectedWorker,
    selectedWorkerRow,
  })

  const {
    isEditingAddress,
    setIsEditingAddress,
    addressDraft,
    setAddressDraft,
    patchWorkerAddressField,
    commitAddressField,
  } = useWorkerAddressEditor({
    selectedWorkerId,
    selectedWorkerRow,
    selectedWorkerAddress,
    activePatchesRef,
    patchSelectedWorkerField,
    applyUpdatedWorkerAddress,
    setError,
    setPatchLoading,
  })

  const {
    availabilityPayload,
    availabilityReadOnlyRows,
    isEditingAvailabilityStatus,
    setIsEditingAvailabilityStatus,
    isEditingAvailability,
    setIsEditingAvailability,
    updatingAvailability,
    updatingAvailabilityStatus,
    availabilityDraft,
    setAvailabilityDraft,
    availabilityStatusDraft,
    setAvailabilityStatusDraft,
    saveWorkerAvailability,
    patchWorkerAvailabilityStatus,
    handleAvailabilityMatrixChange,
  } = useWorkerAvailabilityEditor({
    selectedWorkerId,
    selectedWorkerRow,
    activePatchesRef,
    applyUpdatedWorkerRow,
    setError,
  })

  const {
    isEditingJobSearch,
    setIsEditingJobSearch,
    updatingJobSearch,
    jobSearchDraft,
    setJobSearchDraft,
    patchJobSearchField,
  } = useWorkerJobSearchEditor({
    selectedWorkerId,
    selectedWorkerRow,
    activePatchesRef,
    patchWorkerField,
  })

  const {
    isEditingSkills,
    setIsEditingSkills,
    updatingSkills,
    skillsDraft,
    setSkillsDraft,
    patchSkillsField,
  } = useWorkerSkillsEditor({
    selectedWorkerId,
    selectedWorkerRow,
    activePatchesRef,
    patchWorkerField,
  })

  const {
    isEditingExperience,
    setIsEditingExperience,
    updatingExperience,
    experienceDraft,
    setExperienceDraft,
    patchExperienceRecord,
    createExperienceRecord,
    deleteExperienceRecord,
    patchReferenceRecord,
    createReferenceRecord,
    commitExperienceField,
  } = useWorkerExperienceEditor({
    selectedWorkerId,
    selectedWorkerRow,
    activePatchesRef,
    patchWorkerField,
    applyUpdatedWorkerExperience,
    appendCreatedWorkerExperience,
    removeWorkerExperience,
    applyUpdatedWorkerReference,
    appendCreatedWorkerReference,
    setError,
  })

  const {
    isEditingDocuments,
    setIsEditingDocuments,
    updatingDocuments,
    documentsDraft,
    setDocumentsDraft,
    resolvedIban,
    patchDocumentField,
    commitDocumentField,
    generateStripeAccount,
  } = useWorkerDocumentsEditor({
    selectedWorkerId,
    selectedWorkerRow,
    activePatchesRef,
    patchWorkerField,
    applyUpdatedWorkerRow,
    setError,
  })

  return {
    selectedWorkerIsNonIdoneo,
    selectedWorkerNonQualificatoIssues,
    selectedWorkerIsNonQualificato,
    recruiterFeedbackEntries,
    availabilityPayload,
    disponibilitaBadgeClassName,
    availabilityReadOnlyRows,
    presentationPhotoSlots,
    nonIdoneoReasonValues,
    blacklistChecked,
    updatingNonIdoneo,
    updatingNonQualificato,
    isEditingHeader,
    setIsEditingHeader,
    isEditingAddress,
    setIsEditingAddress,
    isEditingAvailabilityStatus,
    setIsEditingAvailabilityStatus,
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
    updatingAvailabilityStatus,
    updatingJobSearch,
    updatingExperience,
    updatingSkills,
    updatingDocuments,
    selectedPresentationPhotoIndex,
    setSelectedPresentationPhotoIndex,
    addressDraft,
    setAddressDraft,
    availabilityDraft,
    setAvailabilityDraft,
    availabilityStatusDraft,
    setAvailabilityStatusDraft,
    jobSearchDraft,
    setJobSearchDraft,
    experienceDraft,
    setExperienceDraft,
    skillsDraft,
    setSkillsDraft,
    documentsDraft,
    setDocumentsDraft,
    resolvedIban,
    handleNonIdoneoReasonsChange,
    handleBlacklistChange,
    patchSelectedWorkerField,
    patchWorkerAddressField,
    commitAddressField,
    saveWorkerAvailability,
    patchWorkerAvailabilityStatus,
    handleAvailabilityMatrixChange,
    patchJobSearchField,
    patchExperienceRecord,
    createExperienceRecord,
    deleteExperienceRecord,
    patchReferenceRecord,
    createReferenceRecord,
    commitExperienceField,
    patchSkillsField,
    patchDocumentField,
    commitDocumentField,
    generateStripeAccount,
    formatDateOnly,
    getAgeFromBirthDate,
    parseNumberValue,
    asInputValue,
    AVAILABILITY_EDIT_DAYS,
    AVAILABILITY_EDIT_BANDS,
    AVAILABILITY_HOUR_LABELS,
  }
}
