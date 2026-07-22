import * as React from "react"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import { fetchLookupValues } from "@/lib/lookup-values"
import { createRecord, updateRecord } from "@/lib/record-crud"
import { buildAttachmentPayload, normalizeAttachmentArray } from "@/lib/attachments"
import { sanitizeFileName } from "@/lib/file-utils"
import { supabase } from "@/lib/supabase-client"
import { fetchDocumentiLavoratoriByWorker } from "@/modules/lavoratori/queries"
import type { DocumentoLavoratoreRecord } from "@/modules/lavoratori/types"
import { fetchAssunzioniByIds } from "../queries/fetch-assunzioni-by-ids"
import { fetchAssunzioniByFormType } from "../queries/fetch-assunzioni-by-form-type"
import type { AssunzioneRecord, AssunzioniBoardCardData } from "../types"
import type { AttachmentLink } from "@/components/shared-next/attachment-utils"
import {
  ASSUNZIONE_DATORE_FORM_TYPE,
  ASSUNZIONE_DETAIL_SELECT,
  ASSUNZIONE_LAVORATORE_FORM_TYPE,
  SCONTO_APPLICATO_OPTIONS,
  type AssunzioneAttachmentSlot,
  type AssunzioneAttachmentTarget,
  type AssunzioneCandidatesByTarget,
  type DetailTarget,
  type LookupOption,
  buildLookupOptions,
  formatDate,
  formatSelectedAssunzioneLabel,
  hasAssunzioneCoreDetails,
  isValidTipoContratto,
  matchesAssunzioneSearch,
  mergeAssunzioneOptions,
  resolveAssunzioneDisplayName,
  resolveAssunzioneFormLabel,
  resolveAssunzioneFormSubLabel,
  toNullableNumber,
} from "../lib/detail-utils"
import { findLookupOption } from "@/modules/lavoratori/lib"

export type UseAssunzioniDetailSheetParams = {
  card: AssunzioniBoardCardData | null
  open: boolean
  onCardChange: (card: AssunzioniBoardCardData) => void
  onOpenChange: (open: boolean) => void
  onDeleteRapporto?: (rapportoId: string) => Promise<void>
}

export function useAssunzioniDetailSheet({
  card,
  open,
  onCardChange,
  onOpenChange,
  onDeleteRapporto,
}: UseAssunzioniDetailSheetParams) {
  const [target, setTarget] = React.useState<DetailTarget>("datore")
  const [statoAssunzioneOptions, setStatoAssunzioneOptions] = React.useState<LookupOption[]>([])
  const [tipoRapportoOptions, setTipoRapportoOptions] = React.useState<LookupOption[]>([])
  const [offertaOptions, setOffertaOptions] = React.useState<LookupOption[]>(SCONTO_APPLICATO_OPTIONS)
  const [workerDocuments, setWorkerDocuments] = React.useState<DocumentoLavoratoreRecord[]>([])
  const [assunzioneCandidates, setAssunzioneCandidates] =
    React.useState<AssunzioneCandidatesByTarget>({
      datore: [],
      lavoratore: [],
    })
  const [assunzioneSearchQuery, setAssunzioneSearchQuery] = React.useState("")
  const [loadingAssunzioneCandidates, setLoadingAssunzioneCandidates] = React.useState(false)
  const [savingPractice, setSavingPractice] = React.useState(false)
  const [practiceError, setPracticeError] = React.useState<string | null>(null)
  const [uploadingAttachment, setUploadingAttachment] = React.useState<string | null>(null)
  const hydratedAssunzioniRef = React.useRef<Set<string>>(new Set())
  const latestCardRef = React.useRef<AssunzioniBoardCardData | null>(card)
  const datoreAssunzioneCreateRef = React.useRef<Promise<AssunzioneRecord> | null>(null)
  const lavoratoreAssunzioneCreateRef = React.useRef<Promise<AssunzioneRecord> | null>(null)

  React.useEffect(() => {
    latestCardRef.current = card
  }, [card])

  const applyCardChange = React.useCallback(
    (nextCard: AssunzioniBoardCardData) => {
      latestCardRef.current = nextCard
      onCardChange(nextCard)
    },
    [onCardChange]
  )

  const datoreIsLinked = React.useMemo(
    () => Boolean(card?.assunzione?.id),
    [card]
  )
  const lavoratoreIsLinked = React.useMemo(() => Boolean(card?.lavoratoreAssunzione?.id), [card])
  const datoreAssunzioneOptions = React.useMemo(
    () => mergeAssunzioneOptions(card?.assunzione, assunzioneCandidates.datore),
    [assunzioneCandidates.datore, card?.assunzione]
  )
  const lavoratoreAssunzioneOptions = React.useMemo(
    () => mergeAssunzioneOptions(card?.lavoratoreAssunzione, assunzioneCandidates.lavoratore),
    [assunzioneCandidates.lavoratore, card?.lavoratoreAssunzione]
  )
  const currentOffertaOptions = React.useMemo(() => {
    const currentOfferta = card?.process?.offerta?.trim()
    if (!currentOfferta || findLookupOption(offertaOptions, currentOfferta)) {
      return offertaOptions
    }
    return [{ value: currentOfferta, label: currentOfferta }, ...offertaOptions]
  }, [card?.process?.offerta, offertaOptions])
  const selectedAssunzioneOptions =
    target === "datore" ? datoreAssunzioneOptions : lavoratoreAssunzioneOptions
  const selectedAssunzioneId =
    target === "datore" ? card?.assunzione?.id : card?.lavoratoreAssunzione?.id
  const selectedAssunzioneRecord = React.useMemo(
    () =>
      selectedAssunzioneId
        ? selectedAssunzioneOptions.find((record) => record.id === selectedAssunzioneId) ?? null
        : null,
    [selectedAssunzioneId, selectedAssunzioneOptions]
  )
  const filteredAssunzioneOptions = React.useMemo(() => {
    const query = assunzioneSearchQuery.trim()
    if (!query) return selectedAssunzioneOptions.slice(0, 10)
    if (query.length < 2) return []
    return selectedAssunzioneOptions
      .filter((record) => matchesAssunzioneSearch(record, query))
      .slice(0, 80)
  }, [assunzioneSearchQuery, selectedAssunzioneOptions])

  React.useEffect(() => {
    if (!open) return
    setTarget("datore")
  }, [open, card?.id])

  React.useEffect(() => {
    setAssunzioneSearchQuery(
      selectedAssunzioneRecord
        ? formatSelectedAssunzioneLabel(selectedAssunzioneRecord, target, card)
        : ""
    )
  }, [card, selectedAssunzioneRecord, target])

  React.useEffect(() => {
    if (!open || !card?.id) {
      setAssunzioneCandidates({ datore: [], lavoratore: [] })
      return
    }

    let isActive = true

    async function loadAssunzioneCandidates() {
      setLoadingAssunzioneCandidates(true)
      setPracticeError(null)

      try {
        const candidatesColumns = ASSUNZIONE_DETAIL_SELECT.join(",")
        const [datoreResponse, lavoratoreResponse] = await Promise.all([
          fetchAssunzioniByFormType(ASSUNZIONE_DATORE_FORM_TYPE, candidatesColumns),
          fetchAssunzioniByFormType(ASSUNZIONE_LAVORATORE_FORM_TYPE, candidatesColumns),
        ])

        if (!isActive) return
        setAssunzioneCandidates({
          datore: datoreResponse.rows as AssunzioneRecord[],
          lavoratore: lavoratoreResponse.rows as AssunzioneRecord[],
        })
      } catch (caughtError) {
        if (!isActive) return
        setAssunzioneCandidates({ datore: [], lavoratore: [] })
        setPracticeError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore caricando form assunzione"
        )
      } finally {
        if (isActive) setLoadingAssunzioneCandidates(false)
      }
    }

    void loadAssunzioneCandidates()

    return () => {
      isActive = false
    }
  }, [card?.id, open])

  React.useEffect(() => {
    if (!open || !card?.lavoratore?.id) {
      setWorkerDocuments([])
      return
    }

    let isActive = true
    const workerId = card.lavoratore.id

    async function loadWorkerDocuments() {
      try {
        const response = await fetchDocumentiLavoratoriByWorker(workerId)
        if (!isActive) return
        setWorkerDocuments(response.rows)
      } catch {
        if (!isActive) return
        setWorkerDocuments([])
      }
    }

    void loadWorkerDocuments()

    return () => {
      isActive = false
    }
  }, [card?.lavoratore?.id, open])

  React.useEffect(() => {
    if (!open || !card?.id) return
    const currentCard = card
    if (
      hasAssunzioneCoreDetails(currentCard.assunzione) &&
      hasAssunzioneCoreDetails(currentCard.lavoratoreAssunzione)
    ) {
      return
    }
    const hydrationKey = `assunzioni-detail-v2:${currentCard.id}`
    if (hydratedAssunzioniRef.current.has(hydrationKey)) return
    hydratedAssunzioniRef.current.add(hydrationKey)

    let isActive = true

    async function hydrateLinkedAssunzioni() {
      try {
        const datoreAssunzioneId = currentCard.assunzione?.id ?? null
        const lavoratoreAssunzioneId = currentCard.lavoratoreAssunzione?.id ?? null
        const emptyResponse = { rows: [] as AssunzioneRecord[], total: 0, columns: [] }
        const detailColumns = ASSUNZIONE_DETAIL_SELECT.join(",")
        const [datoreResponse, lavoratoreResponse] = await Promise.all([
          datoreAssunzioneId
            ? fetchAssunzioniByIds([datoreAssunzioneId], detailColumns)
            : Promise.resolve(emptyResponse),
          lavoratoreAssunzioneId
            ? fetchAssunzioniByIds([lavoratoreAssunzioneId], detailColumns)
            : Promise.resolve(emptyResponse),
        ])

        if (!isActive) return

        const datoreRow = (datoreResponse.rows as AssunzioneRecord[])[0] ?? null
        const lavoratoreRow = (lavoratoreResponse.rows as AssunzioneRecord[])[0] ?? null
        if (!datoreRow && !lavoratoreRow) return

        let nextCard: AssunzioniBoardCardData = currentCard
        let changed = false

        if (datoreRow) {
          nextCard = {
            ...nextCard,
            assunzione: {
              ...(nextCard.assunzione ?? {}),
              ...datoreRow,
            },
          }
          changed = true
        }

        if (lavoratoreRow) {
          nextCard = {
            ...nextCard,
            lavoratoreAssunzione: {
              ...(nextCard.lavoratoreAssunzione ?? {}),
              ...lavoratoreRow,
            },
          }
          changed = true
        }

        if (changed) {
          applyCardChange(nextCard)
        }
      } catch (caughtError) {
        if (!isActive) return
        setPracticeError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore caricando dati assunzione"
        )
      }
    }

    void hydrateLinkedAssunzioni()

    return () => {
      isActive = false
    }
  }, [applyCardChange, card, open])

  React.useEffect(() => {
    let isActive = true

    async function loadLookupOptions() {
      try {
        const response = await fetchLookupValues()
        if (!isActive) return

        setStatoAssunzioneOptions(
          buildLookupOptions(
            response.rows,
            "processi_matching",
            "stato_assunzione",
            card?.stage ?? null
          )
        )
        setTipoRapportoOptions(
          buildLookupOptions(
            response.rows,
            "rapporti_lavorativi",
            "tipo_rapporto",
            card?.tipoRapporto ?? null
          )
        )
        const nextOffertaOptions = buildLookupOptions(
          response.rows,
          "processi_matching",
          "offerta",
          card?.process?.offerta ?? null
        )
        setOffertaOptions(nextOffertaOptions.length > 0 ? nextOffertaOptions : SCONTO_APPLICATO_OPTIONS)
      } catch {
        if (!isActive) return
        setStatoAssunzioneOptions(
          card?.stage ? [{ value: card.stage, label: card.stage }] : []
        )
        setTipoRapportoOptions(
          card?.tipoRapporto ? [{ value: card.tipoRapporto, label: card.tipoRapporto }] : []
        )
        setOffertaOptions(SCONTO_APPLICATO_OPTIONS)
      }
    }

    void loadLookupOptions()

    return () => {
      isActive = false
    }
    // Options derive from the static lookup domain, not from the current
    // card values. Including card fields in the deps would re-fetch on every
    // autosave and cause a network round-trip per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const saveRapportoPatch = React.useCallback(
    async (patch: Record<string, unknown>) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard || Object.keys(patch).length === 0) return

      setPracticeError(null)
      setSavingPractice(true)

      try {
        const response = await updateRecord("rapporti_lavorativi", currentCard.id, patch)
        const baseCard = latestCardRef.current ?? currentCard
        const nextRapporto = {
          ...(baseCard.rapporto ?? {}),
          ...response.row,
        } as NonNullable<AssunzioniBoardCardData["rapporto"]>
        const nextStage =
          typeof nextRapporto.stato_assunzione === "string" && nextRapporto.stato_assunzione
            ? nextRapporto.stato_assunzione
            : baseCard.stage
        const nextTipoRapporto = nextRapporto.tipo_rapporto ?? baseCard.tipoRapporto

        applyCardChange({
          ...baseCard,
          stage: nextStage,
          rapporto: nextRapporto,
          tipoRapporto: nextTipoRapporto,
          deadline: formatDate(nextRapporto.data_inizio_rapporto),
        })
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore salvando assunzione"
        )
      } finally {
        setSavingPractice(false)
      }
    },
    [applyCardChange, card]
  )

  const saveProcessPatch = React.useCallback(
    async (patch: Record<string, unknown>) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard?.process?.id || Object.keys(patch).length === 0) return

      try {
        const response = await updateRecord("processi_matching", currentCard.process.id, patch)
        const baseCard = latestCardRef.current ?? currentCard
        const baseProcess = baseCard.process ?? currentCard.process
        applyCardChange({
          ...baseCard,
          process: {
            ...baseProcess,
            ...response.row,
          },
        })
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore salvando processo"
        )
      }
    },
    [applyCardChange, card]
  )

  // FASE 5 BIS — form + autosave per la sezione "Contesto pratica" (sostituisce
  // i 5 DebouncedInput committedValue + practiceDraft/setPracticeDraft + il
  // resync effect). onSave instrada per chiave a 3 target con le trasformazioni
  // originali: stato/tipo/data/id/codici → saveRapportoPatch (lookup label per
  // stato_assunzione/tipo_rapporto, toNullableNumber per i codici), offerta →
  // saveProcessPatch, fee_concordata → updateRecord("richieste_attivazione")
  // con la stessa validazione (guard se manca id, skip se non numerico).
  const richiestaAttivazioneId = card?.richiestaAttivazione?.id
  const practiceForm = useAutoSaveForm({
    defaults: {
      stato_assunzione: card?.stage ?? "",
      tipo_rapporto: card?.tipoRapporto ?? "",
      tipo_contratto: isValidTipoContratto(card?.rapporto?.tipo_contratto)
        ? (card?.rapporto?.tipo_contratto ?? "")
        : "",
      data_inizio_rapporto: card?.rapporto?.data_inizio_rapporto ?? "",
      id_rapporto: card?.rapporto?.id_rapporto ?? "",
      codice_datore_webcolf:
        typeof card?.rapporto?.codice_datore_webcolf === "number"
          ? String(card.rapporto.codice_datore_webcolf)
          : "",
      codice_dipendente_webcolf:
        typeof card?.rapporto?.codice_dipendente_webcolf === "number"
          ? String(card.rapporto.codice_dipendente_webcolf)
          : "",
      offerta: card?.process?.offerta ?? "",
      fee_concordata:
        card?.richiestaAttivazione?.fee_concordata != null
          ? String(card.richiestaAttivazione.fee_concordata)
          : "",
    },
    onSave: async (patch) => {
      const rapportoPatch: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(patch)) {
        if (key === "offerta") {
          await saveProcessPatch({ offerta: (value as string) || null })
        } else if (key === "fee_concordata") {
          if (!richiestaAttivazioneId) continue
          const rawValue = String(value ?? "").trim()
          const nextValue = rawValue ? Number(rawValue) : null
          if (rawValue && Number.isNaN(nextValue)) continue
          await updateRecord("richieste_attivazione", richiestaAttivazioneId, {
            fee_concordata: nextValue,
          })
        } else if (
          key === "codice_datore_webcolf" ||
          key === "codice_dipendente_webcolf"
        ) {
          rapportoPatch[key] = toNullableNumber(value as string)
        } else {
          rapportoPatch[key] = (value as string) || null
        }
      }
      if (Object.keys(rapportoPatch).length > 0) await saveRapportoPatch(rapportoPatch)
    },
  })

  const saveFamigliaPatch = React.useCallback(
    async (patch: Record<string, unknown>) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard?.famigliaId || Object.keys(patch).length === 0) return

      setPracticeError(null)
      setSavingPractice(true)

      try {
        const response = await updateRecord("famiglie", currentCard.famigliaId, patch)
        const baseCard = latestCardRef.current ?? currentCard
        const nextFamiglia = {
          ...(baseCard.famiglia ?? {}),
          ...response.row,
        } as NonNullable<AssunzioniBoardCardData["famiglia"]>
        const nextNomeFamiglia =
          [nextFamiglia.cognome, nextFamiglia.nome].filter(Boolean).join(" ").trim() ||
          baseCard.nomeFamiglia

        applyCardChange({
          ...baseCard,
          famiglia: nextFamiglia,
          nomeFamiglia: nextNomeFamiglia,
          email: nextFamiglia.email ?? baseCard.email,
          telefono: nextFamiglia.telefono ?? baseCard.telefono,
        })
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore salvando datore"
        )
      } finally {
        setSavingPractice(false)
      }
    },
    [applyCardChange, card]
  )

  const saveAssunzionePatch = React.useCallback(
    async (patch: Record<string, unknown>) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard || Object.keys(patch).length === 0) return

      setPracticeError(null)
      setSavingPractice(true)

      try {
        let nextAssunzione: AssunzioneRecord
        const existingAssunzioneId =
          currentCard.assunzione?.id ?? latestCardRef.current?.assunzione?.id

        if (existingAssunzioneId) {
          const response = await updateRecord("assunzioni", existingAssunzioneId, patch)
          nextAssunzione = response.row as AssunzioneRecord
        } else {
          let createdByThisCall = false
          if (!datoreAssunzioneCreateRef.current) {
            createdByThisCall = true
            datoreAssunzioneCreateRef.current = createRecord("assunzioni", {
              ...patch,
              famiglia_id: currentCard.famigliaId,
            })
              .then(async (response) => {
                const created = response.row as AssunzioneRecord
                await updateRecord("rapporti_lavorativi", currentCard.id, {
                  assunzione_datore_id: created.id,
                })
                return created
              })
              .finally(() => {
                datoreAssunzioneCreateRef.current = null
              })
          }

          const createdAssunzione = await datoreAssunzioneCreateRef.current
          if (createdByThisCall) {
            nextAssunzione = createdAssunzione
          } else {
            const response = await updateRecord("assunzioni", createdAssunzione.id, patch)
            nextAssunzione = {
              ...createdAssunzione,
              ...response.row,
            } as AssunzioneRecord
          }
        }

        const baseCard = latestCardRef.current ?? currentCard
        applyCardChange({
          ...baseCard,
          assunzione: {
            ...(baseCard.assunzione ?? {}),
            ...nextAssunzione,
          } as AssunzioniBoardCardData["assunzione"],
        })
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore salvando dati assunzione"
        )
      } finally {
        setSavingPractice(false)
      }
    },
    [applyCardChange, card]
  )

  const saveLavoratoreAssunzionePatch = React.useCallback(
    async (patch: Record<string, unknown>) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard || Object.keys(patch).length === 0) return

      setPracticeError(null)
      setSavingPractice(true)

      try {
        let nextAssunzione: AssunzioneRecord
        const existingAssunzioneId =
          currentCard.lavoratoreAssunzione?.id ?? latestCardRef.current?.lavoratoreAssunzione?.id

        if (existingAssunzioneId) {
          const response = await updateRecord("assunzioni", existingAssunzioneId, patch)
          nextAssunzione = response.row as AssunzioneRecord
        } else {
          let createdByThisCall = false
          if (!lavoratoreAssunzioneCreateRef.current) {
            createdByThisCall = true
            lavoratoreAssunzioneCreateRef.current = createRecord("assunzioni", {
              ...patch,
              lavoratore_id: currentCard.lavoratore?.id,
            })
              .then(async (response) => {
                const created = response.row as AssunzioneRecord
                await updateRecord("rapporti_lavorativi", currentCard.id, {
                  assunzione_lavoratore_id: created.id,
                })
                return created
              })
              .finally(() => {
                lavoratoreAssunzioneCreateRef.current = null
              })
          }

          const createdAssunzione = await lavoratoreAssunzioneCreateRef.current
          if (createdByThisCall) {
            nextAssunzione = createdAssunzione
          } else {
            const response = await updateRecord("assunzioni", createdAssunzione.id, patch)
            nextAssunzione = {
              ...createdAssunzione,
              ...response.row,
            } as AssunzioneRecord
          }
        }

        const baseCard = latestCardRef.current ?? currentCard
        applyCardChange({
          ...baseCard,
          lavoratoreAssunzione: {
            ...(baseCard.lavoratoreAssunzione ?? {}),
            ...nextAssunzione,
          } as AssunzioniBoardCardData["lavoratoreAssunzione"],
        })
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore salvando dati lavoratore"
        )
      } finally {
        setSavingPractice(false)
      }
    },
    [applyCardChange, card]
  )

  const saveLavoratorePatch = React.useCallback(
    async (patch: Record<string, unknown>) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard?.lavoratore?.id || Object.keys(patch).length === 0) return

      setPracticeError(null)
      setSavingPractice(true)

      try {
        const response = await updateRecord("lavoratori", currentCard.lavoratore.id, patch)
        const baseCard = latestCardRef.current ?? currentCard
        const nextLavoratore = {
          ...baseCard.lavoratore,
          ...response.row,
        } as NonNullable<AssunzioniBoardCardData["lavoratore"]>
        const nextNomeLavoratore =
          [nextLavoratore.cognome, nextLavoratore.nome].filter(Boolean).join(" ").trim() ||
          baseCard.nomeLavoratore

        applyCardChange({
          ...baseCard,
          lavoratore: nextLavoratore,
          nomeLavoratore: nextNomeLavoratore,
        })
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore salvando lavoratore"
        )
      } finally {
        setSavingPractice(false)
      }
    },
    [applyCardChange, card]
  )

  const linkAssunzioneRecord = React.useCallback(
    async (assunzioneId: string) => {
      const currentCard = latestCardRef.current ?? card
      if (!currentCard) return

      const sourceOptions = target === "datore" ? datoreAssunzioneOptions : lavoratoreAssunzioneOptions
      const selectedRecord = sourceOptions.find((record) => record.id === assunzioneId)
      if (!selectedRecord) return

      setPracticeError(null)
      setSavingPractice(true)

      try {
        const response = await updateRecord(
          "rapporti_lavorativi",
          currentCard.id,
          target === "datore"
            ? { assunzione_datore_id: assunzioneId }
            : { assunzione_lavoratore_id: assunzioneId }
        )
        const nextRecord = selectedRecord
        const nextRapporto = {
          ...(currentCard.rapporto ?? {}),
          ...response.row,
        } as AssunzioniBoardCardData["rapporto"]

        setAssunzioneSearchQuery(formatSelectedAssunzioneLabel(nextRecord, target, currentCard))

        applyCardChange(
          target === "datore"
            ? {
                ...currentCard,
                rapporto: nextRapporto,
                assunzione: nextRecord,
                nomeFamiglia: resolveAssunzioneDisplayName(nextRecord) ?? currentCard.nomeFamiglia,
                email: nextRecord.info_anagrafiche_email ?? currentCard.email,
                telefono: nextRecord.info_anagrafiche_numero_mobile ?? currentCard.telefono,
              }
            : {
                ...currentCard,
                rapporto: nextRapporto,
                lavoratoreAssunzione: nextRecord,
                nomeLavoratore: resolveAssunzioneDisplayName(nextRecord) ?? currentCard.nomeLavoratore,
              }
        )
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore associando form assunzione"
        )
      } finally {
        setSavingPractice(false)
      }
    },
    [
      card,
      datoreAssunzioneOptions,
      lavoratoreAssunzioneOptions,
      applyCardChange,
      target,
    ]
  )

  const unlinkAssunzioneRecord = React.useCallback(async () => {
    const currentCard = latestCardRef.current ?? card
    if (!currentCard) return

    const currentRecord = target === "datore" ? currentCard.assunzione : currentCard.lavoratoreAssunzione
    if (!currentRecord?.id) return

    setPracticeError(null)
    setSavingPractice(true)

    try {
      const response = await updateRecord(
        "rapporti_lavorativi",
        currentCard.id,
        target === "datore"
          ? { assunzione_datore_id: null }
          : { assunzione_lavoratore_id: null }
      )
      const nextRapporto = {
        ...(currentCard.rapporto ?? {}),
        ...response.row,
      } as AssunzioniBoardCardData["rapporto"]

      setAssunzioneSearchQuery("")

      applyCardChange(
        target === "datore"
          ? {
              ...currentCard,
              rapporto: nextRapporto,
              assunzione: null,
            }
          : {
              ...currentCard,
              rapporto: nextRapporto,
              lavoratoreAssunzione: null,
            }
      )
    } catch (caughtError) {
      setPracticeError(
        caughtError instanceof Error
          ? caughtError.message
          : "Errore scollegando form assunzione"
      )
    } finally {
      setSavingPractice(false)
    }
  }, [applyCardChange, card, target])

  const uploadAssunzioneAttachment = React.useCallback(
    async (
      target: AssunzioneAttachmentTarget,
      slot: AssunzioneAttachmentSlot,
      file: File
    ) => {
      if (!card) return

      const currentRecord = target === "datore" ? card.assunzione : card.lavoratoreAssunzione
      const key = `${target}:${slot}`
      setUploadingAttachment(key)
      setPracticeError(null)

      try {
        const safeName = sanitizeFileName(file.name || "documento")
        const storagePath = [
          "assunzioni",
          card.id,
          target,
          slot,
          `${Date.now()}-${safeName}`,
        ].join("/")

        const uploadResult = await supabase.storage.from("baze-bucket").upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        })

        if (uploadResult.error) {
          throw uploadResult.error
        }

        const payload = buildAttachmentPayload(file, storagePath)
        const nextValue = [...normalizeAttachmentArray(currentRecord?.[slot]), payload]
        if (target === "datore") {
          await saveAssunzionePatch({ [slot]: nextValue })
        } else {
          await saveLavoratoreAssunzionePatch({ [slot]: nextValue })
        }
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore caricando documento"
        )
      } finally {
        setUploadingAttachment(null)
      }
    },
    [card, saveAssunzionePatch, saveLavoratoreAssunzionePatch]
  )

  const uploadRapportoAttachment = React.useCallback(
    async (
      slot: "accordo_di_lavoro_allegati" | "ricevuta_inps_allegati",
      file: File
    ) => {
      if (!card?.rapporto) return

      const key = `rapporto:${slot}`
      setUploadingAttachment(key)
      setPracticeError(null)

      try {
        const safeName = sanitizeFileName(file.name || "documento")
        const storagePath = [
          "rapporti_lavorativi",
          card.id,
          slot,
          `${Date.now()}-${safeName}`,
        ].join("/")

        const uploadResult = await supabase.storage.from("baze-bucket").upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        })

        if (uploadResult.error) {
          throw uploadResult.error
        }

        const payload = buildAttachmentPayload(file, storagePath)
        await saveRapportoPatch({
          [slot]: [...normalizeAttachmentArray(card.rapporto[slot]), payload],
        })
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore caricando documento"
        )
      } finally {
        setUploadingAttachment(null)
      }
    },
    [card, saveRapportoPatch]
  )

  const removeAssunzioneAttachment = React.useCallback(
    async (
      target: AssunzioneAttachmentTarget,
      slot: AssunzioneAttachmentSlot,
      link: AttachmentLink,
    ) => {
      if (!card) return

      const currentRecord = target === "datore" ? card.assunzione : card.lavoratoreAssunzione
      const key = `${target}:${slot}`
      setUploadingAttachment(key)
      setPracticeError(null)

      try {
        const nextValue = normalizeAttachmentArray(currentRecord?.[slot]).filter(
          (a) => !(link.path && a.path === link.path) && a.name !== link.label,
        )

        if (link.path?.startsWith("baze-bucket/")) {
          await supabase.storage
            .from("baze-bucket")
            .remove([link.path.replace(/^baze-bucket\//, "")])
        }

        const patch = { [slot]: nextValue.length > 0 ? nextValue : null }
        if (target === "datore") {
          await saveAssunzionePatch(patch)
        } else {
          await saveLavoratoreAssunzionePatch(patch)
        }
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore rimuovendo documento",
        )
      } finally {
        setUploadingAttachment(null)
      }
    },
    [card, saveAssunzionePatch, saveLavoratoreAssunzionePatch],
  )

  const removeRapportoAttachment = React.useCallback(
    async (
      slot: "accordo_di_lavoro_allegati" | "ricevuta_inps_allegati",
      link: AttachmentLink,
    ) => {
      if (!card?.rapporto) return

      const key = `rapporto:${slot}`
      setUploadingAttachment(key)
      setPracticeError(null)

      try {
        const nextValue = normalizeAttachmentArray(card.rapporto[slot]).filter(
          (a) => !(link.path && a.path === link.path) && a.name !== link.label,
        )

        if (link.path?.startsWith("baze-bucket/")) {
          await supabase.storage
            .from("baze-bucket")
            .remove([link.path.replace(/^baze-bucket\//, "")])
        }

        await saveRapportoPatch({
          [slot]: nextValue.length > 0 ? nextValue : null,
        })
      } catch (caughtError) {
        setPracticeError(
          caughtError instanceof Error ? caughtError.message : "Errore rimuovendo documento",
        )
      } finally {
        setUploadingAttachment(null)
      }
    },
    [card, saveRapportoPatch],
  )

  function openAttachmentPreview(link: AttachmentLink) {
    window.open(link.url, "_blank", "noopener,noreferrer")
  }

  return {
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
  }
}
