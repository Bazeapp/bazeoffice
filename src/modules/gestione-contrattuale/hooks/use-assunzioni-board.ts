import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useCreateMutation, useMoveMutation } from "@/hooks/use-board-mutations"

import { fetchLookupValues } from "@/lib/lookup-values"
import { deleteRecord, updateRecord } from "@/lib/record-crud"
import { fetchAssunzioniBoard } from "../queries/fetch-assunzioni-board"
import type { AssunzioniBoardRpcRow } from "../types/gestione-rpc"
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
  mansione_lavoratore: string | null
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
  deleteRapporto: (rapportoId: string) => Promise<void>
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
  /**
   * Lazy lookup for the previous card by rapporto id. Read AT mapping time
   * (NOT at queryFn start) so any concurrent `setQueryData` from
   * `handleSelectCard` / `updateCard` is observed and detail-only fields
   * are merged in. Reading a snapshot at queryFn start would race against
   * a parallel detail fetch and reinstate stale empty sub-objects.
   */
  getPreviousCard?: (rapportoId: string) => AssunzioniBoardCardData | undefined
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

/**
 * Pattern A bindings (see docs/realtime-board-pattern.md).
 *
 * The board RPC `assunzioni_board` returns four sub-objects per card —
 * `rapporto`, `assunzione`, `lavoratoreAssunzione`, `richiestaAttivazione` —
 * but with a NARROWER column projection than `assunzione_detail`. When the
 * detail loader merges the rich sub-objects into the board cache and a
 * realtime invalidate refetches the board, the columns the board RPC omits
 * are blanked → the open detail panel visibly empties out.
 *
 * Each binding list enumerates the DB columns that the detail RPC returns
 * for that sub-object. The mapper preserves any column that is *not present*
 * in the fresh board sub-row by copying it from the previous card. Present
 * columns (even `null`) win — clearing in DB still propagates.
 *
 * `richiestaAttivazione` is special: the board RPC does NOT include it at
 * all (`card.richiestaAttivazione` is always `null` post-board-refetch). The
 * bindings still drive a per-column restore so partial future board RPCs
 * (e.g. only `id` returned) would still preserve the rest.
 */
export const RAPPORTO_FIELD_BINDINGS: readonly string[] = [
  "id",
  "stato_assunzione",
  "tipo_rapporto",
  "tipo_contratto",
  "cognome_nome_datore_proper",
  "nome_lavoratore_per_url",
  "codice_datore_webcolf",
  "codice_dipendente_webcolf",
  "id_rapporto",
  "data_inizio_rapporto",
  "data_fine_rapporto",
  "data_assunzione",
]

export const ASSUNZIONE_FIELD_BINDINGS: readonly string[] = [
  "id",
  "creato_il",
  "delega_inps_allegati",
  "civico_se_diverso_residenza",
  "codice_fiscale_allegati",
  "comune_se_diverso_residenza",
  "dati_bancari_lavoratore",
  "documento_identita_allegati",
  "documento_identita_numero",
  "documento_identita_scadenza",
  "documento_identita_tipo",
  "famiglia_id",
  "cittadino_extracomunitario",
  "info_anagrafiche_cap",
  "info_anagrafiche_cittadidanza",
  "info_anagrafiche_civico",
  "info_anagrafiche_codice_fiscale",
  "info_anagrafiche_cognome",
  "info_anagrafiche_data_di_nascita",
  "info_anagrafiche_email",
  "info_anagrafiche_indirizzo",
  "info_anagrafiche_localita",
  "info_anagrafiche_luogo_di_nascita",
  "info_anagrafiche_nome",
  "info_anagrafiche_numero_fisso",
  "info_anagrafiche_numero_mobile",
  "luogo_lavoro_se_diverso_da_residenza",
  "mansione_lavoratore",
  "mezza_giornata_di_riposo",
  "ore_di_lavoro",
  "ore_giovedi",
  "ore_lunedi",
  "ore_martedi",
  "ore_mercoledi",
  "ore_sabato",
  "ore_venerdi",
  "provincia",
  "permesso_di_soggiorno_allegati",
  "rapporto_di_lavoro_residenza",
  "lavoratore_id",
  "regime_convivenza",
  "ricevuta_rinnovo_permesso_allegati",
  "telecamere_posto_lavoro",
  "tredicesima_rateizzata_mensile",
  "note_aggiuntive",
  "data_assunzione",
  "type_of_compilazione_form",
]

// Same DB shape as ASSUNZIONE_FIELD_BINDINGS — the `lavoratoreAssunzione`
// sub-object reuses the AssunzioneRecord type. Exported separately so future
// divergence between the two sub-objects (e.g. lavoratore-only columns) can
// be expressed without rewriting callers.
export const LAVORATORE_ASSUNZIONE_FIELD_BINDINGS: readonly string[] = [
  ...ASSUNZIONE_FIELD_BINDINGS,
]

export const RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS: readonly string[] = [
  "id",
  "data_submission",
  "email",
  "fee_concordata",
  "processo_res_id",
  "signed_document_title",
  "signed_document_url",
  "airtable_id",
  "airtable_record_id",
  "creato_il",
  "aggiornato_il",
  "metadati_migrazione",
]

/**
 * Sub-object preservation. For every column in `columns`, if the column is
 * NOT present in `fresh`, restore it from `previous`. Returns a NEW object
 * (does not mutate `fresh`).
 *
 * Treatment of nulls:
 * - `fresh === null` (sub-object entirely absent from board row) → return
 *   `previous` as-is. This is the common case for `richiestaAttivazione`,
 *   which the board RPC omits entirely.
 * - `fresh` is an object, column absent (`!(column in fresh)`) → copy from
 *   `previous`.
 * - `fresh` is an object, column present with any value (including `null`)
 *   → keep fresh value (clearing in DB propagates).
 */
export function preserveMissingFields<T extends Record<string, unknown>>(
  fresh: T | null,
  previous: T | null,
  columns: readonly string[],
): T | null {
  if (!previous) return fresh
  if (!fresh) return previous
  const merged: Record<string, unknown> = { ...fresh }
  for (const column of columns) {
    if (column in fresh) continue
    if (column in previous) {
      merged[column] = (previous as Record<string, unknown>)[column]
    }
  }
  return merged as T
}

/**
 * Build the board card. When `previousCard` is provided, missing columns
 * inside each detail-only sub-object are restored from the previous card.
 *
 * Card-derived fields (`nomeFamiglia`, `nomeLavoratore`, `email`,
 * `telefono`, `titoloAnnuncio`, `tipoRapporto`, `deadline`) are recomputed
 * from the merged sub-objects so they stay consistent.
 */
export function mapAssunzioniBoardCard(
  row: AssunzioniBoardRpcRow,
  processStage: string,
  previousCard?: AssunzioniBoardCardData,
): AssunzioniBoardCardData | null {
  const linkedRapporto = row.rapporto
  if (!linkedRapporto) return null

  const process = row.process ?? null
  const family = row.famiglia ?? null
  const lavoratore = row.lavoratore ?? null
  const datoreAssunzioneFresh = (row.assunzione as AssunzioneRecord | null) ?? null
  const lavoratoreAssunzioneFresh =
    (row.lavoratoreAssunzione as AssunzioneRecord | null) ?? null

  // The board RPC does not return `richiestaAttivazione`, so always start
  // from `null` and let preserveMissingFields restore the previous value.
  const richiestaAttivazioneFresh = null

  const datoreAssunzione = previousCard
    ? preserveMissingFields(
        datoreAssunzioneFresh,
        previousCard.assunzione,
        ASSUNZIONE_FIELD_BINDINGS,
      )
    : datoreAssunzioneFresh
  const lavoratoreAssunzione = previousCard
    ? preserveMissingFields(
        lavoratoreAssunzioneFresh,
        previousCard.lavoratoreAssunzione,
        LAVORATORE_ASSUNZIONE_FIELD_BINDINGS,
      )
    : lavoratoreAssunzioneFresh
  const richiestaAttivazione = previousCard
    ? preserveMissingFields(
        richiestaAttivazioneFresh,
        previousCard.richiestaAttivazione,
        RICHIESTA_ATTIVAZIONE_FIELD_BINDINGS,
      )
    : richiestaAttivazioneFresh
  const rapporto = previousCard
    ? preserveMissingFields(
        linkedRapporto as unknown as Record<string, unknown>,
        previousCard.rapporto as unknown as Record<string, unknown> | null,
        RAPPORTO_FIELD_BINDINGS,
      )
    : linkedRapporto

  const mergedRapporto = (rapporto ?? linkedRapporto) as RapportoLavorativoRecord
  const nomeFamiglia = resolveFamilyName(datoreAssunzione, family, mergedRapporto)
  const nomeLavoratore = resolveWorkerName(lavoratoreAssunzione, lavoratore, mergedRapporto)

  return {
    id: linkedRapporto.id,
    processId: process?.id ?? null,
    stage: processStage,
    process,
    assunzione: datoreAssunzione,
    lavoratoreAssunzione,
    richiestaAttivazione,
    rapporto: mergedRapporto,
    lavoratore,
    famiglia: family,
    famigliaId: family?.id ?? process?.famiglia_id ?? null,
    nomeFamiglia: nomeFamiglia ?? "Famiglia non trovata",
    nomeLavoratore: nomeLavoratore ?? "Lavoratore non associato",
    email: family?.email ?? "-",
    telefono: family?.telefono ?? "-",
    titoloAnnuncio: process?.titolo_annuncio ?? null,
    tipoRapporto:
      mergedRapporto?.tipo_rapporto ?? getFirstArrayValue(process?.tipo_rapporto),
    deadline: formatItalianDate(process?.data_limite_invio_selezione),
  }
}

async function fetchAssunzioniBoardData({
  deferredLoadedStageIds = new Set<string>(),
  onlyStageId,
  getPreviousCard,
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

    const previousCard = getPreviousCard?.(linkedRapporto.id)
    const card = mapAssunzioniBoardCard(row, processStage, previousCard)
    if (!card) continue

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

const ASSUNZIONI_BOARD_QUERY_KEY = ["assunzioni-board"] as const

export function useAssunzioniBoard(): UseAssunzioniBoardState {
  const queryClient = useQueryClient()
  // IMPORTANT: this MUST be a ref, not state. React Query's queryFn is set
  // once at mount; if we read state inside the closure it gets stale on
  // refetch (e.g. after a realtime invalidate) and deferred columns that
  // the user had explicitly loaded would revert to `loaded: false` with
  // empty cards. The ref is read fresh on every queryFn invocation.
  const loadedDeferredStageIdsRef = React.useRef<Set<string>>(new Set())

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ASSUNZIONI_BOARD_QUERY_KEY,
    queryFn: async () => {
      const loaded = loadedDeferredStageIdsRef.current
      // Read previous card from latest cache at mapping time — see comment
      // on FetchAssunzioniBoardDataOptions.getPreviousCard for race rationale.
      const getPreviousCard = (rapportoId: string) => {
        const latest = queryClient.getQueryData<AssunzioniBoardColumnData[]>(
          ASSUNZIONI_BOARD_QUERY_KEY,
        )
        if (!latest) return undefined
        for (const column of latest) {
          const card = column.cards.find((c) => c.id === rapportoId)
          if (card) return card
        }
        return undefined
      }

      const baseColumns = await fetchAssunzioniBoardData({
        deferredLoadedStageIds: loaded,
        getPreviousCard,
      })

      if (loaded.size === 0) return baseColumns

      // The default RPC call (with null filter) does NOT return rows for
      // deferred stages. For each stage the user already opted into,
      // re-fetch it explicitly so it stays populated after invalidation.
      const overrides = await Promise.all(
        Array.from(loaded).map((stageId) =>
          fetchAssunzioniBoardData({
            deferredLoadedStageIds: loaded,
            onlyStageId: stageId,
            getPreviousCard,
          }).then((cols) => cols.find((column) => column.id === stageId) ?? null),
        ),
      )

      const overrideById = new Map<string, AssunzioniBoardColumnData>()
      for (const column of overrides) {
        if (column) overrideById.set(column.id, column)
      }

      return baseColumns.map((column) => overrideById.get(column.id) ?? column)
    },
  })

  const columns = data ?? []

  const setBoardData = React.useCallback(
    (updater: (previous: AssunzioniBoardColumnData[] | undefined) => AssunzioniBoardColumnData[] | undefined) => {
      queryClient.setQueryData<AssunzioniBoardColumnData[]>(ASSUNZIONI_BOARD_QUERY_KEY, (previous) =>
        updater(previous),
      )
    },
    [queryClient],
  )

  const invalidateBoard = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ASSUNZIONI_BOARD_QUERY_KEY })
  }, [queryClient])

  const updateCard = React.useCallback(
    (
      rapportoId: string,
      updater: (card: AssunzioniBoardCardData) => AssunzioniBoardCardData
    ) => {
      setBoardData((previous) => {
        if (!previous) return previous
        let nextCard: AssunzioniBoardCardData | null = null

        const columnsWithoutCard = previous.map((column) => ({
          ...column,
          cards: column.cards.filter((card) => {
            if (card.id !== rapportoId) return true
            nextCard = updater(card)
            return false
          }),
        }))

        if (!nextCard) return previous

        return columnsWithoutCard.map((column) =>
          column.id === nextCard?.stage
            ? { ...column, cards: [nextCard, ...column.cards] }
            : column
        )
      })
    },
    [setBoardData],
  )

  const moveMutation = useMoveMutation<
    { rapportoId: string; targetStageId: string },
    unknown,
    AssunzioniBoardColumnData[]
  >({
    queryKey: ASSUNZIONI_BOARD_QUERY_KEY,
    mutationFn: ({ rapportoId, targetStageId }) =>
      updateRecord("rapporti_lavorativi", rapportoId, { stato_assunzione: targetStageId }),
    applyOptimistic: (previous, { rapportoId, targetStageId }) => {
      if (!previous) return previous
      let movedCard: AssunzioniBoardCardData | null = null
      const removed = previous.map((column) => {
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
      if (!movedCard) return previous
      return removed.map((column) =>
        column.id === targetStageId
          ? { ...column, cards: [movedCard as AssunzioniBoardCardData, ...column.cards] }
          : column,
      )
    },
  })

  const moveCard = React.useCallback(
    async (rapportoId: string, targetStageId: string) => {
      await moveMutation.mutateAsync({ rapportoId, targetStageId })
    },
    [moveMutation],
  )

  const deleteMutation = useCreateMutation<
    { rapportoId: string },
    unknown,
    AssunzioniBoardColumnData[]
  >({
    queryKey: ASSUNZIONI_BOARD_QUERY_KEY,
    mutationFn: ({ rapportoId }) => deleteRecord("rapporti_lavorativi", rapportoId),
    applyOptimistic: (previous, { rapportoId }) => {
      if (!previous) return previous
      return previous.map((column) => ({
        ...column,
        cards: column.cards.filter((card) => card.id !== rapportoId),
      }))
    },
  })

  const deleteRapporto = React.useCallback(
    async (rapportoId: string) => {
      await deleteMutation.mutateAsync({ rapportoId })
    },
    [deleteMutation],
  )

  const loadDeferredColumn = React.useCallback(
    async (stageId: string) => {
      if (!DEFERRED_STAGE_IDS.has(stageId) || loadedDeferredStageIdsRef.current.has(stageId)) return

      setBoardData((previous) =>
        (previous ?? []).map((column) =>
          column.id === stageId ? { ...column, loadError: null, loading: true } : column,
        ),
      )

      try {
        const loadedColumns = await fetchAssunzioniBoardData({
          deferredLoadedStageIds: new Set([stageId]),
          onlyStageId: stageId,
          getPreviousCard: (rapportoId: string) => {
            const latest = queryClient.getQueryData<AssunzioniBoardColumnData[]>(
              ASSUNZIONI_BOARD_QUERY_KEY,
            )
            if (!latest) return undefined
            for (const column of latest) {
              const card = column.cards.find((c) => c.id === rapportoId)
              if (card) return card
            }
            return undefined
          },
        })
        const loadedColumn = loadedColumns.find((column) => column.id === stageId)

        // Mark this stage as "user-opted-in" before mutating cache so that any
        // concurrent refetch (e.g. realtime) sees the updated set.
        loadedDeferredStageIdsRef.current = new Set([
          ...loadedDeferredStageIdsRef.current,
          stageId,
        ])
        setBoardData((previous) =>
          (previous ?? []).map((column) =>
            column.id === stageId
              ? {
                  ...column,
                  cards: loadedColumn?.cards ?? [],
                  loadError: null,
                  loaded: true,
                  loading: false,
                }
              : column,
          ),
        )
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : "Errore caricamento colonna"
        setBoardData((previous) =>
          (previous ?? []).map((column) =>
            column.id === stageId
              ? { ...column, loadError: message, loaded: false, loading: false }
              : column,
          ),
        )
      }
    },
    [setBoardData, queryClient],
  )

  useRealtimeBoardSync({
    tables: ASSUNZIONI_REALTIME_TABLES,
    reload: invalidateBoard,
  })

  const error =
    moveMutation.error instanceof Error
      ? moveMutation.error.message
      : queryError instanceof Error
        ? queryError.message
        : null

  return {
    loading: isLoading,
    error,
    columns,
    loadDeferredColumn,
    moveCard,
    updateCard,
    deleteRapporto,
  }
}
