import * as React from "react"

import type { LavoratoreListItem } from "@/components/lavoratori/lavoratore-card"
import {
  AVAILABILITY_DAY_LABELS,
  AVAILABILITY_EDIT_BANDS,
  AVAILABILITY_EDIT_DAYS,
  AVAILABILITY_HOUR_LABELS,
  type AvailabilityEditBandField,
  type AvailabilityEditDayField,
  type AvailabilityMatrixDraft,
  buildAvailabilityMatrixDraft,
  buildAvailabilityPatchFromMatrix,
  formatDateOnly,
  getAvailabilityMatrixKey,
  isAvailabilityHourActive,
  parseAvailabilityPayload,
  readAvailabilitySlots,
} from "@/features/lavoratori/lib/availability-utils"
import {
  DEFAULT_WORKER_AVATARS,
  asInputValue,
  asLavoratoreRecord,
  asString,
  getAgeFromBirthDate,
  parseNumberValue,
  readArrayStrings,
  toPublicAssetUrl,
} from "@/features/lavoratori/lib/base-utils"
import { parseRecruiterFeedback } from "@/features/lavoratori/lib/feedback-utils"
import {
  getTagClassName,
  normalizeLookupToken,
  resolveLookupColor,
} from "@/features/lavoratori/lib/lookup-utils"
import {
  findNonQualificatoIssues,
  isNonIdoneoStatus,
  normalizeWorkerStatus,
} from "@/features/lavoratori/lib/status-utils"
import { createRecord, updateRecord } from "@/lib/anagrafiche-api"
import type { EsperienzaLavoratoreRecord } from "@/types/entities/esperienza-lavoratore"
import type { LavoratoreRecord } from "@/types/entities/lavoratore"
import type { ReferenzaLavoratoreRecord } from "@/types/entities/referenza-lavoratore"

type WorkerHeaderDraft = {
  nome: string
  cognome: string
  email: string
  telefono: string
  sesso: string
  nazionalita: string
  data_di_nascita: string
}

type WorkerAddressDraft = {
  provincia: string
  cap: string
  indirizzo_residenza_completo: string
  come_ti_sposti: string[]
}

type WorkerAvailabilityDraft = {
  vincoli_orari_disponibilita: string
  disponibilita_nel_giorno: string[]
  matrix: AvailabilityMatrixDraft
}

type WorkerAvailabilityStatusDraft = {
  disponibilita: string
  data_ritorno_disponibilita: string
}

type WorkerJobSearchDraft = {
  tipo_lavoro_domestico: string[]
  tipo_rapporto_lavorativo: string[]
  check_lavori_accettabili: string[]
  check_accetta_lavori_con_trasferta: string
  check_accetta_multipli_contratti: string
  check_accetta_paga_9_euro_netti: string
}

type WorkerExperienceDraft = {
  anni_esperienza_colf: string
  anni_esperienza_badante: string
  anni_esperienza_babysitter: string
  situazione_lavorativa_attuale: string
}

type WorkerSkillsDraft = {
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

type WorkerDocumentsDraft = {
  stato_verifica_documenti: string
  documenti_in_regola: string
  data_scadenza_naspi: string
}

type PatchLoadingKey =
  | "nonIdoneo"
  | "nonQualificato"
  | "availability"
  | "availabilityStatus"
  | "jobSearch"
  | "experience"
  | "skills"
  | "documents"

type UseSelectedWorkerEditorParams = {
  selectedWorkerId: string | null
  selectedWorker: LavoratoreListItem | null
  selectedWorkerRow: LavoratoreRecord | null
  lookupColorsByDomain: Map<string, string>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  applyUpdatedWorkerRow: (row: LavoratoreRecord) => void
  applyUpdatedWorkerExperience: (row: EsperienzaLavoratoreRecord) => void
  appendCreatedWorkerExperience: (row: EsperienzaLavoratoreRecord) => void
  applyUpdatedWorkerReference: (row: ReferenzaLavoratoreRecord) => void
  appendCreatedWorkerReference: (row: ReferenzaLavoratoreRecord) => void
}

function buildHeaderDraft(row: LavoratoreRecord | null): WorkerHeaderDraft {
  return {
    nome: asString(row?.nome),
    cognome: asString(row?.cognome),
    email: asString(row?.email),
    telefono: asString(row?.telefono),
    sesso: asString(row?.sesso),
    nazionalita: asString(row?.nazionalita),
    data_di_nascita: asString(row?.data_di_nascita),
  }
}

function buildAddressDraft(row: LavoratoreRecord | null): WorkerAddressDraft {
  return {
    provincia: asString(row?.provincia),
    cap: asString(row?.cap),
    indirizzo_residenza_completo: asString(row?.indirizzo_residenza_completo),
    come_ti_sposti: readArrayStrings(row?.come_ti_sposti),
  }
}

function buildAvailabilityDraft(
  row: LavoratoreRecord | null,
  availabilityPayload: ReturnType<typeof parseAvailabilityPayload>
): WorkerAvailabilityDraft {
  return {
    vincoli_orari_disponibilita: asString(row?.vincoli_orari_disponibilita),
    disponibilita_nel_giorno: readArrayStrings(row?.disponibilita_nel_giorno),
    matrix: buildAvailabilityMatrixDraft(row, availabilityPayload),
  }
}

function buildAvailabilityStatusDraft(
  row: LavoratoreRecord | null
): WorkerAvailabilityStatusDraft {
  return {
    disponibilita: asString(row?.disponibilita),
    data_ritorno_disponibilita: asString(row?.data_ritorno_disponibilita),
  }
}

function buildJobSearchDraft(row: LavoratoreRecord | null): WorkerJobSearchDraft {
  return {
    tipo_lavoro_domestico: readArrayStrings(row?.tipo_lavoro_domestico),
    tipo_rapporto_lavorativo: readArrayStrings(row?.tipo_rapporto_lavorativo),
    check_lavori_accettabili: readArrayStrings(row?.check_lavori_accettabili),
    check_accetta_lavori_con_trasferta: asString(row?.check_accetta_lavori_con_trasferta),
    check_accetta_multipli_contratti: asString(row?.check_accetta_multipli_contratti),
    check_accetta_paga_9_euro_netti: asString(row?.check_accetta_paga_9_euro_netti),
  }
}

function buildExperienceDraft(row: LavoratoreRecord | null): WorkerExperienceDraft {
  return {
    anni_esperienza_colf: asInputValue(row?.anni_esperienza_colf),
    anni_esperienza_badante: asInputValue(row?.anni_esperienza_badante),
    anni_esperienza_babysitter: asInputValue(row?.anni_esperienza_babysitter),
    situazione_lavorativa_attuale: asString(row?.situazione_lavorativa_attuale),
  }
}

function buildSkillsDraft(row: LavoratoreRecord | null): WorkerSkillsDraft {
  return {
    livello_pulizie: asString(row?.livello_pulizie),
    check_accetta_salire_scale_o_soffitti_alti: asString(
      row?.check_accetta_salire_scale_o_soffitti_alti
    ),
    compatibilita_famiglie_numerose: asString(row?.compatibilita_famiglie_numerose),
    compatibilita_famiglie_molto_esigenti: asString(
      row?.compatibilita_famiglie_molto_esigenti
    ),
    compatibilita_lavoro_con_datore_presente_in_casa: asString(
      row?.compatibilita_lavoro_con_datore_presente_in_casa
    ),
    compatibilita_con_case_di_grandi_dimensioni: asString(
      row?.compatibilita_con_case_di_grandi_dimensioni
    ),
    compatibilita_con_elevata_autonomia_richiesta: asString(
      row?.compatibilita_con_elevata_autonomia_richiesta
    ),
    compatibilita_con_contesti_pacati: asString(row?.compatibilita_con_contesti_pacati),
    livello_stiro: asString(row?.livello_stiro),
    compatibilita_con_stiro_esigente: asString(row?.compatibilita_con_stiro_esigente),
    livello_cucina: asString(row?.livello_cucina),
    compatibilita_con_cucina_strutturata: asString(
      row?.compatibilita_con_cucina_strutturata
    ),
    livello_babysitting: asString(row?.livello_babysitting),
    check_accetta_babysitting_multipli_bambini: asString(
      row?.check_accetta_babysitting_multipli_bambini
    ),
    check_accetta_babysitting_neonati: asString(row?.check_accetta_babysitting_neonati),
    compatibilita_babysitting_neonati: asString(row?.compatibilita_babysitting_neonati),
    livello_dogsitting: asString(row?.livello_dogsitting),
    check_accetta_case_con_cani: asString(row?.check_accetta_case_con_cani),
    check_accetta_case_con_cani_grandi: asString(row?.check_accetta_case_con_cani_grandi),
    check_accetta_case_con_gatti: asString(row?.check_accetta_case_con_gatti),
    compatibilita_con_animali_in_casa: asString(row?.compatibilita_con_animali_in_casa),
    livello_giardinaggio: asString(row?.livello_giardinaggio),
    livello_italiano: asString(row?.livello_italiano),
    livello_inglese: asString(row?.livello_inglese),
  }
}

function buildDocumentsDraft(row: LavoratoreRecord | null): WorkerDocumentsDraft {
  return {
    stato_verifica_documenti: asString(row?.stato_verifica_documenti),
    documenti_in_regola: asString(row?.documenti_in_regola),
    data_scadenza_naspi: asString(row?.data_scadenza_naspi),
  }
}

function formatEditorError(message: string, caughtError: unknown) {
  return caughtError instanceof Error ? caughtError.message : message
}

export function useSelectedWorkerEditor({
  selectedWorkerId,
  selectedWorker,
  selectedWorkerRow,
  lookupColorsByDomain,
  setError,
  applyUpdatedWorkerRow,
  applyUpdatedWorkerExperience,
  appendCreatedWorkerExperience,
  applyUpdatedWorkerReference,
  appendCreatedWorkerReference,
}: UseSelectedWorkerEditorParams) {
  const [nonIdoneoReasonValues, setNonIdoneoReasonValues] = React.useState<string[]>([])
  const [blacklistChecked, setBlacklistChecked] = React.useState(false)
  const [updatingNonIdoneo, setUpdatingNonIdoneo] = React.useState(false)
  const [updatingNonQualificato, setUpdatingNonQualificato] = React.useState(false)
  const [isEditingHeader, setIsEditingHeader] = React.useState(false)
  const [isEditingAddress, setIsEditingAddress] = React.useState(false)
  const [isEditingAvailabilityStatus, setIsEditingAvailabilityStatus] = React.useState(false)
  const [isEditingAvailability, setIsEditingAvailability] = React.useState(false)
  const [isEditingJobSearch, setIsEditingJobSearch] = React.useState(false)
  const [isEditingExperience, setIsEditingExperience] = React.useState(false)
  const [isEditingSkills, setIsEditingSkills] = React.useState(false)
  const [isEditingDocuments, setIsEditingDocuments] = React.useState(false)
  const [updatingAvailability, setUpdatingAvailability] = React.useState(false)
  const [updatingAvailabilityStatus, setUpdatingAvailabilityStatus] = React.useState(false)
  const [updatingJobSearch, setUpdatingJobSearch] = React.useState(false)
  const [updatingExperience, setUpdatingExperience] = React.useState(false)
  const [updatingSkills, setUpdatingSkills] = React.useState(false)
  const [updatingDocuments, setUpdatingDocuments] = React.useState(false)
  const [selectedPresentationPhotoIndex, setSelectedPresentationPhotoIndex] = React.useState(0)
  const [headerDraft, setHeaderDraft] = React.useState<WorkerHeaderDraft>(() =>
    buildHeaderDraft(selectedWorkerRow)
  )
  const [addressDraft, setAddressDraft] = React.useState<WorkerAddressDraft>(() =>
    buildAddressDraft(selectedWorkerRow)
  )
  const [availabilityStatusDraft, setAvailabilityStatusDraft] =
    React.useState<WorkerAvailabilityStatusDraft>(() =>
      buildAvailabilityStatusDraft(selectedWorkerRow)
    )
  const [jobSearchDraft, setJobSearchDraft] = React.useState<WorkerJobSearchDraft>(() =>
    buildJobSearchDraft(selectedWorkerRow)
  )
  const [experienceDraft, setExperienceDraft] = React.useState<WorkerExperienceDraft>(() =>
    buildExperienceDraft(selectedWorkerRow)
  )
  const [skillsDraft, setSkillsDraft] = React.useState<WorkerSkillsDraft>(() =>
    buildSkillsDraft(selectedWorkerRow)
  )
  const [documentsDraft, setDocumentsDraft] = React.useState<WorkerDocumentsDraft>(() =>
    buildDocumentsDraft(selectedWorkerRow)
  )
  const availabilityPayload = React.useMemo(
    () =>
      parseAvailabilityPayload(selectedWorkerRow?.availability_final_json) ??
      parseAvailabilityPayload(selectedWorkerRow?.disponibilita_per_json),
    [selectedWorkerRow]
  )
  const [availabilityDraft, setAvailabilityDraft] = React.useState<WorkerAvailabilityDraft>(() =>
    buildAvailabilityDraft(selectedWorkerRow, availabilityPayload)
  )

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
  const availabilityReadOnlyRows = React.useMemo(
    () =>
      AVAILABILITY_DAY_LABELS
        ? Object.keys(AVAILABILITY_DAY_LABELS).slice(0, 6).map((day) => {
            const typedDay = day as keyof typeof AVAILABILITY_DAY_LABELS
            const slots = readAvailabilitySlots(availabilityPayload?.weekly, typedDay)
            return {
              day: AVAILABILITY_DAY_LABELS[typedDay],
              activeByHour: AVAILABILITY_HOUR_LABELS.map((hourLabel) =>
                isAvailabilityHourActive(slots, hourLabel)
              ),
            }
          })
        : [],
    [availabilityPayload]
  )
  const presentationPhotoSlots = React.useMemo(() => {
    const defaults = DEFAULT_WORKER_AVATARS.map((fileName) => toPublicAssetUrl(fileName))
    if (selectedWorker?.immagineUrl) {
      return [
        selectedWorker.immagineUrl,
        ...defaults.filter((item) => item !== selectedWorker.immagineUrl),
      ]
    }
    return defaults
  }, [selectedWorker?.immagineUrl])

  React.useEffect(() => {
    setNonIdoneoReasonValues(readArrayStrings(selectedWorkerRow?.motivazione_non_idoneo))
    const blacklistToken = normalizeLookupToken(selectedWorkerRow?.check_blacklist)
    setBlacklistChecked(blacklistToken === "blacklist" || blacklistToken === "yes")
    setHeaderDraft(buildHeaderDraft(selectedWorkerRow))
    setAddressDraft(buildAddressDraft(selectedWorkerRow))
    setAvailabilityDraft(buildAvailabilityDraft(selectedWorkerRow, availabilityPayload))
    setAvailabilityStatusDraft(buildAvailabilityStatusDraft(selectedWorkerRow))
    setJobSearchDraft(buildJobSearchDraft(selectedWorkerRow))
    setExperienceDraft(buildExperienceDraft(selectedWorkerRow))
    setSkillsDraft(buildSkillsDraft(selectedWorkerRow))
    setDocumentsDraft(buildDocumentsDraft(selectedWorkerRow))
  }, [selectedWorkerRow, availabilityPayload])

  React.useEffect(() => {
    setSelectedPresentationPhotoIndex(0)
    setIsEditingHeader(false)
    setIsEditingAddress(false)
    setIsEditingAvailabilityStatus(false)
    setIsEditingAvailability(false)
    setIsEditingJobSearch(false)
    setIsEditingExperience(false)
    setIsEditingSkills(false)
    setIsEditingDocuments(false)
  }, [selectedWorkerId])

  const setPatchLoading = React.useCallback((key: PatchLoadingKey, value: boolean) => {
    switch (key) {
      case "nonIdoneo":
        setUpdatingNonIdoneo(value)
        break
      case "nonQualificato":
        setUpdatingNonQualificato(value)
        break
      case "availability":
        setUpdatingAvailability(value)
        break
      case "availabilityStatus":
        setUpdatingAvailabilityStatus(value)
        break
      case "jobSearch":
        setUpdatingJobSearch(value)
        break
      case "experience":
        setUpdatingExperience(value)
        break
      case "skills":
        setUpdatingSkills(value)
        break
      case "documents":
        setUpdatingDocuments(value)
        break
    }
  }, [])

  const applyWorkerPatch = React.useCallback(
    async (
      patch: Partial<LavoratoreRecord> & Record<string, unknown>,
      options: {
        loadingKey: PatchLoadingKey
        errorMessage: string
      }
    ) => {
      if (!selectedWorkerId) return null
      setPatchLoading(options.loadingKey, true)
      try {
        const result = await updateRecord("lavoratori", selectedWorkerId, patch)
        const nextRow = asLavoratoreRecord(result.row)
        applyUpdatedWorkerRow(nextRow)
        return nextRow
      } catch (caughtError) {
        setError(formatEditorError(options.errorMessage, caughtError))
        throw caughtError
      } finally {
        setPatchLoading(options.loadingKey, false)
      }
    },
    [applyUpdatedWorkerRow, selectedWorkerId, setError, setPatchLoading]
  )

  const patchWorkerField = React.useCallback(
    async (
      field: keyof LavoratoreRecord,
      value: unknown,
      options: {
        loadingKey: PatchLoadingKey
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
        loadingKey: "nonQualificato",
        errorMessage: "Errore aggiornando campo",
      })
    },
    [patchWorkerField, selectedWorkerId]
  )

  const commitHeaderField = React.useCallback(
    async (
      field:
        | "nome"
        | "cognome"
        | "email"
        | "telefono"
        | "sesso"
        | "nazionalita"
        | "data_di_nascita"
    ) => {
      const currentValue = asString(selectedWorkerRow?.[field])
      const nextValue =
        field === "data_di_nascita" ? headerDraft[field] : headerDraft[field].trim()
      if (nextValue === currentValue) return
      await patchSelectedWorkerField(field, nextValue || null)
    },
    [headerDraft, patchSelectedWorkerField, selectedWorkerRow]
  )

  const commitAddressField = React.useCallback(
    async (field: "provincia" | "cap" | "indirizzo_residenza_completo" | "come_ti_sposti") => {
      if (field === "come_ti_sposti") {
        const currentValue = readArrayStrings(selectedWorkerRow?.come_ti_sposti)
        const nextValue = addressDraft.come_ti_sposti
        if (JSON.stringify(nextValue) === JSON.stringify(currentValue)) return
        await patchSelectedWorkerField(field, nextValue.length > 0 ? nextValue : null)
        return
      }

      const currentValue = asString(selectedWorkerRow?.[field])
      const rawValue = addressDraft[field].trim()
      const nextValue =
        field === "cap" ? rawValue.replace(/\s+/g, "").toUpperCase() : rawValue
      if (field === "cap" && nextValue && !/^[A-Z0-9]{3,10}$/.test(nextValue)) {
        setError("Formato CAP non valido (3-10 caratteri alfanumerici).")
        return
      }
      if (nextValue === currentValue) return
      await patchSelectedWorkerField(field, nextValue || null)
    },
    [addressDraft, patchSelectedWorkerField, selectedWorkerRow, setError]
  )

  const commitAvailabilityField = React.useCallback(
    async (field: "vincoli_orari_disponibilita") => {
      const currentValue = asString(selectedWorkerRow?.[field])
      const nextValue = availabilityDraft[field].trim()
      if (nextValue === currentValue) return
      await patchWorkerField(field, nextValue || null, {
        loadingKey: "availability",
        errorMessage: "Errore aggiornando disponibilita",
      })
    },
    [availabilityDraft, patchWorkerField, selectedWorkerRow]
  )

  const commitAvailabilityStatusField = React.useCallback(
    async (field: "disponibilita" | "data_ritorno_disponibilita") => {
      const currentValue = asString(selectedWorkerRow?.[field])
      const nextValue =
        field === "data_ritorno_disponibilita"
          ? availabilityStatusDraft[field]
          : availabilityStatusDraft[field].trim()
      if (nextValue === currentValue) return

      await patchWorkerField(field, nextValue || null, {
        loadingKey: "availabilityStatus",
        errorMessage: "Errore aggiornando stato disponibilita",
      })
    },
    [availabilityStatusDraft, patchWorkerField, selectedWorkerRow]
  )

  const patchAvailabilityStatusValue = React.useCallback(
    async (field: "disponibilita" | "data_ritorno_disponibilita", nextValue: string) => {
      const currentValue = asString(selectedWorkerRow?.[field])
      if (nextValue === currentValue) return

      await patchWorkerField(field, nextValue || null, {
        loadingKey: "availabilityStatus",
        errorMessage: "Errore aggiornando stato disponibilita",
      })
    },
    [patchWorkerField, selectedWorkerRow]
  )

  const handleAvailabilityMatrixChange = React.useCallback(
    async (
      dayField: AvailabilityEditDayField,
      bandField: AvailabilityEditBandField,
      checked: boolean
    ) => {
      const key = getAvailabilityMatrixKey(dayField, bandField)
      const nextMatrix = {
        ...availabilityDraft.matrix,
        [key]: checked,
      }

      setAvailabilityDraft((current) => ({
        ...current,
        matrix: nextMatrix,
      }))

      await applyWorkerPatch(buildAvailabilityPatchFromMatrix(nextMatrix, availabilityPayload), {
        loadingKey: "availability",
        errorMessage: "Errore aggiornando disponibilita",
      })
    },
    [applyWorkerPatch, availabilityDraft.matrix, availabilityPayload]
  )

  const patchJobSearchField = React.useCallback(
    async (
      field:
        | "tipo_lavoro_domestico"
        | "tipo_rapporto_lavorativo"
        | "check_lavori_accettabili"
        | "check_accetta_lavori_con_trasferta"
        | "check_accetta_multipli_contratti"
        | "check_accetta_paga_9_euro_netti",
      value: unknown
    ) => {
      await patchWorkerField(field, value, {
        loadingKey: "jobSearch",
        errorMessage: "Errore aggiornando ricerca lavoro",
      })
    },
    [patchWorkerField]
  )

  const patchExperienceRecord = React.useCallback(
    async (experienceId: string, patch: Partial<EsperienzaLavoratoreRecord>) => {
      setUpdatingExperience(true)
      try {
        const result = await updateRecord("esperienze_lavoratori", experienceId, patch)
        applyUpdatedWorkerExperience(result.row as EsperienzaLavoratoreRecord)
      } catch (caughtError) {
        setError(formatEditorError("Errore aggiornando esperienza", caughtError))
        throw caughtError
      } finally {
        setUpdatingExperience(false)
      }
    },
    [applyUpdatedWorkerExperience, setError]
  )

  const createExperienceRecord = React.useCallback(
    async (values: Partial<EsperienzaLavoratoreRecord>) => {
      setUpdatingExperience(true)
      try {
        const result = await createRecord(
          "esperienze_lavoratori",
          values as Record<string, unknown>
        )
        appendCreatedWorkerExperience(result.row as EsperienzaLavoratoreRecord)
      } catch (caughtError) {
        setError(formatEditorError("Errore creando esperienza", caughtError))
        throw caughtError
      } finally {
        setUpdatingExperience(false)
      }
    },
    [appendCreatedWorkerExperience, setError]
  )

  const patchReferenceRecord = React.useCallback(
    async (referenceId: string, patch: Partial<ReferenzaLavoratoreRecord>) => {
      setUpdatingExperience(true)
      try {
        const result = await updateRecord("referenze_lavoratori", referenceId, patch)
        applyUpdatedWorkerReference(result.row as ReferenzaLavoratoreRecord)
      } catch (caughtError) {
        setError(formatEditorError("Errore aggiornando referenza", caughtError))
        throw caughtError
      } finally {
        setUpdatingExperience(false)
      }
    },
    [applyUpdatedWorkerReference, setError]
  )

  const createReferenceRecord = React.useCallback(
    async (values: Partial<ReferenzaLavoratoreRecord>) => {
      setUpdatingExperience(true)
      try {
        const result = await createRecord(
          "referenze_lavoratori",
          values as Record<string, unknown>
        )
        appendCreatedWorkerReference(result.row as ReferenzaLavoratoreRecord)
      } catch (caughtError) {
        setError(formatEditorError("Errore creando referenza", caughtError))
        throw caughtError
      } finally {
        setUpdatingExperience(false)
      }
    },
    [appendCreatedWorkerReference, setError]
  )

  const commitExperienceField = React.useCallback(
    async (
      field:
        | "anni_esperienza_colf"
        | "anni_esperienza_badante"
        | "anni_esperienza_babysitter"
        | "situazione_lavorativa_attuale"
    ) => {
      if (field === "situazione_lavorativa_attuale") {
        const currentValue = asString(selectedWorkerRow?.[field])
        const nextValue = experienceDraft[field].trim()
        if (nextValue === currentValue) return
        await patchWorkerField(field, nextValue || null, {
          loadingKey: "experience",
          errorMessage: "Errore aggiornando esperienza lavorativa",
        })
        return
      }

      const currentValue = parseNumberValue(selectedWorkerRow?.[field])
      const nextValue = parseNumberValue(experienceDraft[field])
      if (currentValue === nextValue) return
      await patchWorkerField(field, nextValue, {
        loadingKey: "experience",
        errorMessage: "Errore aggiornando esperienza lavorativa",
      })
    },
    [experienceDraft, patchWorkerField, selectedWorkerRow]
  )

  const patchSkillsField = React.useCallback(
    async (field: keyof WorkerSkillsDraft, value: string) => {
      await patchWorkerField(field, value.trim() || null, {
        loadingKey: "skills",
        errorMessage: "Errore aggiornando skill e competenze",
      })
    },
    [patchWorkerField]
  )

  const patchDocumentField = React.useCallback(
    async (
      field: keyof WorkerDocumentsDraft,
      value: string | null
    ) => {
      await patchWorkerField(field, value, {
        loadingKey: "documents",
        errorMessage: "Errore aggiornando documenti",
      })
    },
    [patchWorkerField]
  )

  const commitDocumentField = React.useCallback(
    async (field: "data_scadenza_naspi") => {
      const currentValue = asString(selectedWorkerRow?.[field])
      const nextValue = documentsDraft[field]
      if (nextValue === currentValue) return

      await patchDocumentField(field, nextValue || null)
    },
    [documentsDraft, patchDocumentField, selectedWorkerRow]
  )

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
    headerDraft,
    setHeaderDraft,
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
    handleNonIdoneoReasonsChange,
    handleBlacklistChange,
    patchSelectedWorkerField,
    commitHeaderField,
    commitAddressField,
    commitAvailabilityField,
    commitAvailabilityStatusField,
    patchAvailabilityStatusValue,
    handleAvailabilityMatrixChange,
    patchJobSearchField,
    patchExperienceRecord,
    createExperienceRecord,
    patchReferenceRecord,
    createReferenceRecord,
    commitExperienceField,
    patchSkillsField,
    patchDocumentField,
    commitDocumentField,
    formatDateOnly,
    getAgeFromBirthDate,
    parseNumberValue,
    asInputValue,
    AVAILABILITY_EDIT_DAYS,
    AVAILABILITY_EDIT_BANDS,
    AVAILABILITY_HOUR_LABELS,
  }
}
