import * as React from "react"

import {
  clearReadCaches,
  fetchAssunzioniBoard,
  fetchLookupValues,
  updateRecord,
} from "@/lib/anagrafiche-api"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"

const ASSUNZIONI_REALTIME_TABLES = [
  "assunzioni",
  "rapporti_lavorativi",
  "famiglie",
  "lavoratori",
  "processi_matching",
  "richieste_attivazione",
]
import type {
  FamigliaRecord,
  LookupValueRecord,
  LavoratoreRecord,
  ProcessoMatchingRecord,
  RapportoLavorativoRecord,
  RichiestaAttivazioneRecord,
} from "@/types"

type AssunzioniStageDefinition = {
  id: string
  label: string
  color: string
}

export type AssunzioneRecord = {
  id: string
  creato_il?: string | null
  delega_inps_allegati: Record<string, unknown> | Record<string, unknown>[] | null
  civico_se_diverso_residenza: string | null
  codice_fiscale_allegati: Record<string, unknown> | Record<string, unknown>[] | null
  comune_se_diverso_residenza: string | null
  dati_bancari_lavoratore: string | null
  documento_identita_allegati: Record<string, unknown> | Record<string, unknown>[] | null
  documento_identita_numero: string | null
  documento_identita_scadenza: string | null
  documento_identita_tipo: string | null
  famiglia_id: string | null
  cittadino_extracomunitario: string | null
  info_anagrafiche_cap: string | null
  info_anagrafiche_cittadidanza: string | null
  info_anagrafiche_civico: string | null
  info_anagrafiche_codice_fiscale: string | null
  info_anagrafiche_cognome: string | null
  info_anagrafiche_data_di_nascita: string | null
  info_anagrafiche_email: string | null
  info_anagrafiche_indirizzo: string | null
  info_anagrafiche_localita: string | null
  info_anagrafiche_luogo_di_nascita: string | null
  info_anagrafiche_nome: string | null
  info_anagrafiche_numero_fisso: string | null
  info_anagrafiche_numero_mobile: string | null
  luogo_lavoro_se_diverso_da_residenza: string | null
  mezza_giornata_di_riposo: string | null
  ore_di_lavoro: number | string | null
  ore_giovedi: number | string | null
  ore_lunedi: number | string | null
  ore_martedi: number | string | null
  ore_mercoledi: number | string | null
  ore_sabato: number | string | null
  ore_venerdi: number | string | null
  provincia: string | null
  permesso_di_soggiorno_allegati: Record<string, unknown> | Record<string, unknown>[] | null
  rapporto_di_lavoro_residenza: boolean | null
  rapporto_lavorativo_datore_lavoro_id: string | null
  rapporto_lavorativo_lavoratore_id: string | null
  lavoratore_id: string | null
  regime_convivenza: string | null
  ricevuta_rinnovo_permesso_allegati: Record<string, unknown> | Record<string, unknown>[] | null
  telecamere_posto_lavoro: string | null
  tredicesima_rateizzata_mensile: string | null
  note_aggiuntive: string | null
  data_assunzione: string | null
  type_of_compilazione_form: string | null
}

export type AssunzioniBoardCardData = {
  id: string
  processId: string | null
  stage: string
  process: ProcessoMatchingRecord | null
  assunzione: AssunzioneRecord | null
  lavoratoreAssunzione: AssunzioneRecord | null
  richiestaAttivazione: RichiestaAttivazioneRecord | null
  rapporto: RapportoLavorativoRecord | null
  lavoratore: LavoratoreRecord | null
  famiglia: FamigliaRecord | null
  famigliaId: string | null
  nomeFamiglia: string
  nomeLavoratore: string
  email: string
  telefono: string
  titoloAnnuncio: string | null
  tipoRapporto: string | null
  deadline: string
}

export type AssunzioniBoardColumnData = {
  id: string
  label: string
  color: string
  cards: AssunzioniBoardCardData[]
  deferred: boolean
  loadError: string | null
  loaded: boolean
  loading: boolean
}

type UseAssunzioniBoardState = {
  loading: boolean
  error: string | null
  columns: AssunzioniBoardColumnData[]
  loadDeferredColumn: (stageId: string) => Promise<void>
  moveCard: (rapportoId: string, targetStageId: string) => Promise<void>
  updateCard: (
    rapportoId: string,
    updater: (card: AssunzioniBoardCardData) => AssunzioniBoardCardData
  ) => void
}

type StageMetadata = {
  definitions: AssunzioniStageDefinition[]
  aliases: Map<string, string>
}

const DEFAULT_STAGE_DEFINITIONS: AssunzioniStageDefinition[] = [
  { id: "Avviare pratica", label: "Avviare pratica", color: "sky" },
  { id: "Inviata richiesta dati", label: "Inviata richiesta dati", color: "sky" },
  { id: "In attesa di dati famiglia", label: "In attesa di dati famiglia", color: "teal" },
  { id: "In attesa di dati lavoratore", label: "In attesa di dati lavoratore", color: "teal" },
  { id: "Dati pronti per assunzione", label: "Dati pronti per assunzione", color: "amber" },
  { id: "Assunzione fatta", label: "Assunzione fatta", color: "lime" },
  { id: "Documenti assunzione inviati", label: "Documenti assunzione inviati", color: "green" },
  { id: "Contratto firmato", label: "Contratto firmato", color: "green" },
  { id: "Non assume con Baze", label: "Non assume con Baze", color: "orange" },
]

const DEFERRED_STAGE_IDS = new Set(["Contratto firmato", "Non assume con Baze"])

type FetchAssunzioniBoardDataOptions = {
  deferredLoadedStageIds?: Set<string>
  onlyStageId?: string
}

function normalizeToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
}

function toStringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return null
}

function readLookupColor(metadata: LookupValueRecord["metadata"]) {
  if (!metadata || typeof metadata !== "object") return null
  const color = metadata.color
  return typeof color === "string" && color.trim() ? color.trim() : null
}

function formatItalianDate(value: unknown) {
  const raw = toStringValue(value)
  if (!raw) return "-"

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return "-"

  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed)
}

function getFirstArrayValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = toStringValue(item)
      if (normalized) return normalized
    }
  }

  return toStringValue(value)
}

function formatFullName(firstName: string | null | undefined, lastName: string | null | undefined) {
  return [lastName, firstName].filter(Boolean).join(" ").trim()
}

function resolveAssunzioneName(assunzione: AssunzioneRecord | null) {
  if (!assunzione) return null

  const fullName = formatFullName(
    toStringValue(assunzione.info_anagrafiche_nome),
    toStringValue(assunzione.info_anagrafiche_cognome)
  )
  return fullName || null
}

function resolveFamilyName(
  assunzione: AssunzioneRecord | null,
  family: FamigliaRecord | null,
  rapporto: RapportoLavorativoRecord
) {
  const assunzioneName = resolveAssunzioneName(assunzione)
  if (assunzioneName) return assunzioneName

  const rapportoName = toStringValue(rapporto.cognome_nome_datore_proper)
  if (rapportoName) return rapportoName

  const familyName = family ? formatFullName(family.nome, family.cognome) : ""
  return familyName || null
}

function resolveWorkerName(
  assunzione: AssunzioneRecord | null,
  worker: LavoratoreRecord | null,
  rapporto: RapportoLavorativoRecord
) {
  const assunzioneName = resolveAssunzioneName(assunzione)
  if (assunzioneName) return assunzioneName

  const workerName = worker ? formatFullName(worker.nome, worker.cognome) : ""
  if (workerName) return workerName

  return toStringValue(rapporto.nome_lavoratore_per_url)
}

function buildStageMetadata(rows: LookupValueRecord[]): StageMetadata {
  const aliases = new Map<string, string>()
  const colorByStage = new Map<string, string>()
  const labelByStage = new Map<string, string>()

  for (const stage of DEFAULT_STAGE_DEFINITIONS) {
    aliases.set(normalizeToken(stage.id), stage.id)
    aliases.set(normalizeToken(stage.label), stage.id)
    colorByStage.set(stage.id, stage.color)
    labelByStage.set(stage.id, stage.label)
  }

  const lookupRows = rows.filter(
    (row) =>
      row.is_active &&
      row.entity_table === "processi_matching" &&
      row.entity_field === "stato_assunzione"
  )

  for (const row of lookupRows) {
    const valueKey = toStringValue(row.value_key)
    const valueLabel = toStringValue(row.value_label)
    const resolvedId =
      aliases.get(normalizeToken(valueKey)) ??
      aliases.get(normalizeToken(valueLabel)) ??
      null

    if (!resolvedId) continue

    if (valueKey) aliases.set(normalizeToken(valueKey), resolvedId)
    if (valueLabel) aliases.set(normalizeToken(valueLabel), resolvedId)

    const color = readLookupColor(row.metadata)
    if (color) colorByStage.set(resolvedId, color)
    if (valueLabel) labelByStage.set(resolvedId, valueLabel)
  }

  return {
    definitions: DEFAULT_STAGE_DEFINITIONS.map((stage) => ({
      id: stage.id,
      label: labelByStage.get(stage.id) ?? stage.label,
      color: colorByStage.get(stage.id) ?? stage.color,
    })),
    aliases,
  }
}

async function fetchAssunzioniBoardData({
  deferredLoadedStageIds = new Set<string>(),
  onlyStageId,
}: FetchAssunzioniBoardDataOptions = {}): Promise<AssunzioniBoardColumnData[]> {
  const [boardResult, lookupResult] = await Promise.all([
    fetchAssunzioniBoard(onlyStageId ?? null),
    fetchLookupValues(),
  ])

  const stageMetadata = buildStageMetadata(lookupResult.rows)
  const stages = stageMetadata.definitions
  const aliases = stageMetadata.aliases
  const cardsByStage = new Map<string, AssunzioniBoardCardData[]>(
    stages.map((stage) => [stage.id, []])
  )

  for (const row of boardResult.rows) {
    const linkedRapporto = row.rapporto
    if (!linkedRapporto) continue

    const processStage = aliases.get(normalizeToken(linkedRapporto.stato_assunzione))
    if (!processStage) continue

    const process = row.process ?? null
    const family = row.famiglia ?? null
    const lavoratore = row.lavoratore ?? null
    const datoreAssunzione = (row.assunzione as AssunzioneRecord | null) ?? null
    const lavoratoreAssunzione = (row.lavoratoreAssunzione as AssunzioneRecord | null) ?? null
    const nomeFamiglia = resolveFamilyName(datoreAssunzione, family, linkedRapporto)
    const nomeLavoratore = resolveWorkerName(lavoratoreAssunzione, lavoratore, linkedRapporto)

    // richiestaAttivazione is not shown on cards; the detail RPC resolves it on open.
    const card: AssunzioniBoardCardData = {
      id: linkedRapporto.id,
      processId: process?.id ?? null,
      stage: processStage,
      process,
      assunzione: datoreAssunzione,
      lavoratoreAssunzione,
      richiestaAttivazione: null,
      rapporto: linkedRapporto,
      lavoratore,
      famiglia: family,
      famigliaId: family?.id ?? process?.famiglia_id ?? null,
      nomeFamiglia: nomeFamiglia ?? "Famiglia non trovata",
      nomeLavoratore: nomeLavoratore ?? "Lavoratore non associato",
      email: family?.email ?? "-",
      telefono: family?.telefono ?? "-",
      titoloAnnuncio: process?.titolo_annuncio ?? null,
      tipoRapporto: linkedRapporto?.tipo_rapporto ?? getFirstArrayValue(process?.tipo_rapporto),
      deadline: formatItalianDate(process?.data_limite_invio_selezione),
    }

    cardsByStage.get(processStage)?.push(card)
  }

  return stages.map((stage) => ({
    id: stage.id,
    label: stage.label,
    color: stage.color,
    cards: cardsByStage.get(stage.id) ?? [],
    deferred: DEFERRED_STAGE_IDS.has(stage.id),
    loadError: null,
    loaded: !DEFERRED_STAGE_IDS.has(stage.id) || deferredLoadedStageIds.has(stage.id),
    loading: false,
  }))
}

export function useAssunzioniBoard(): UseAssunzioniBoardState {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [columns, setColumns] = React.useState<AssunzioniBoardColumnData[]>([])
  const [loadedDeferredStageIds, setLoadedDeferredStageIds] = React.useState<Set<string>>(
    () => new Set()
  )

  const updateCard = React.useCallback(
    (
      rapportoId: string,
      updater: (card: AssunzioniBoardCardData) => AssunzioniBoardCardData
    ) => {
      setColumns((current) => {
        let nextCard: AssunzioniBoardCardData | null = null

        const columnsWithoutCard = current.map((column) => ({
          ...column,
          cards: column.cards.filter((card) => {
            if (card.id !== rapportoId) return true
            nextCard = updater(card)
            return false
          }),
        }))

        if (!nextCard) return current

        return columnsWithoutCard.map((column) =>
          column.id === nextCard?.stage
            ? { ...column, cards: [nextCard, ...column.cards] }
            : column
        )
      })
    },
    []
  )

  const moveCard = React.useCallback(
    async (rapportoId: string, targetStageId: string) => {
      const previous = columns

      setColumns((current) => {
        let movedCard: AssunzioniBoardCardData | null = null

        const nextColumns = current.map((column) => {
          if (column.cards.some((card) => card.id === rapportoId)) {
            const remainingCards = column.cards.filter((card) => {
              if (card.id !== rapportoId) return true
              movedCard = { ...card, stage: targetStageId }
              return false
            })
            return { ...column, cards: remainingCards }
          }
          return column
        })

        if (!movedCard) return current

        return nextColumns.map((column) =>
          column.id === targetStageId
            ? { ...column, cards: [movedCard as AssunzioniBoardCardData, ...column.cards] }
            : column
        )
      })

      try {
        await updateRecord("rapporti_lavorativi", rapportoId, {
          stato_assunzione: targetStageId,
        })
      } catch (caughtError) {
        setColumns(previous)
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando stato assunzione"
        )
      }
    },
    [columns]
  )

  const loadDeferredColumn = React.useCallback(
    async (stageId: string) => {
      if (!DEFERRED_STAGE_IDS.has(stageId) || loadedDeferredStageIds.has(stageId)) return

      setColumns((current) =>
        current.map((column) =>
          column.id === stageId ? { ...column, loadError: null, loading: true } : column
        )
      )

      try {
        const loadedColumns = await fetchAssunzioniBoardData({
          deferredLoadedStageIds: new Set([stageId]),
          onlyStageId: stageId,
        })
        const loadedColumn = loadedColumns.find((column) => column.id === stageId)

        setLoadedDeferredStageIds((current) => {
          const next = new Set(current)
          next.add(stageId)
          return next
        })
        setColumns((current) =>
          current.map((column) =>
            column.id === stageId
              ? {
                  ...column,
                  cards: loadedColumn?.cards ?? [],
                  loadError: null,
                  loaded: true,
                  loading: false,
                }
              : column
          )
        )
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : "Errore caricamento colonna"
        setColumns((current) =>
          current.map((column) =>
            column.id === stageId
              ? { ...column, loadError: message, loaded: false, loading: false }
              : column
          )
        )
      }
    },
    [loadedDeferredStageIds]
  )

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchAssunzioniBoardData()
        if (cancelled) return
        setColumns(data)
      } catch (caughtError) {
        if (cancelled) return
        setError(
          caughtError instanceof Error ? caughtError.message : "Errore caricamento assunzioni"
        )
        setColumns([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const reloadSilently = React.useCallback(async () => {
    clearReadCaches()
    try {
      const data = await fetchAssunzioniBoardData()
      setColumns(data)
    } catch {
      // Ignore: a failed background refresh must not blank the board.
    }
  }, [])

  useRealtimeBoardSync({
    tables: ASSUNZIONI_REALTIME_TABLES,
    reload: reloadSilently,
  })

  return {
    loading,
    error,
    columns,
    loadDeferredColumn,
    moveCard,
    updateCard,
  }
}
