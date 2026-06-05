import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useMoveMutation, usePatchMutation } from "@/hooks/use-board-mutations"

import {
  fetchAssunzioniNamesByRapportoIds,
  fetchCedoliniBoard,
  fetchLookupValues,
  updateRecord,
} from "@/lib/anagrafiche-api"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import { getRapportoTitle } from "@/features/rapporti/rapporti-labels"

const PAYROLL_REALTIME_TABLES = [
  "mesi_lavorati",
  "pagamenti",
  "presenze_mensili",
  "rapporti_lavorativi",
  "famiglie",
  "transazioni_finanziarie",
  "mesi_calendario",
]
import type {
  FamigliaRecord,
  LookupValueRecord,
  MeseCalendarioRecord,
  MeseLavoratoRecord,
  PagamentoRecord,
  PresenzaMensileRecord,
  RapportoLavorativoRecord,
  TransazioneFinanziariaRecord,
} from "@/types"

type PayrollStageDefinition = {
  id: string
  label: string
  color: string
}

type StageMetadata = {
  definitions: PayrollStageDefinition[]
  aliases: Map<string, string>
}

export type PayrollBoardCardData = {
  id: string
  stage: string
  record: MeseLavoratoRecord
  famiglia: FamigliaRecord | null
  pagamento: PagamentoRecord | null
  transazione: TransazioneFinanziariaRecord | null
  presenze: PresenzaMensileRecord | null
  presenzeRegolari: PresenzaMensileRecord | null
  rapporto: RapportoLavorativoRecord | null
  mese: MeseCalendarioRecord | null
  richiestaAttivazione: { id: string; fee_concordata: number | null } | null
  presenzeIrregolari: boolean
  nomeCompleto: string
  importoLabel: string | null
  dataInvioLabel: string | null
}

export type PayrollBoardColumnData = {
  id: string
  label: string
  color: string
  cards: PayrollBoardCardData[]
}

type UsePayrollBoardState = {
  loading: boolean
  error: string | null
  columns: PayrollBoardColumnData[]
  moveCard: (recordId: string, targetStageId: string) => Promise<void>
  patchCard: (recordId: string, patch: Partial<MeseLavoratoRecord>) => Promise<void>
  patchPresence: (recordId: string, patch: Partial<PresenzaMensileRecord>) => Promise<void>
  /**
   * Inject detail-loader fields (presenze, presenzeRegolari, enriched record /
   * rapporto / famiglia / mese columns) into the cached card. The detail panel
   * then reads from the board cache directly — same shape as CRM pipeline.
   * If the card is not in the cache (e.g. it was filtered out), this is a
   * no-op. Returns the merged card or undefined.
   */
  enrichCardFromDetail: (
    cardId: string,
    detail: Partial<PayrollBoardCardData>,
  ) => PayrollBoardCardData | undefined
  /**
   * Incremented by useRealtimeBoardSync when a remote change arrives (and
   * passes the echo-window guard). The view binds the detail loader's
   * useEffect deps to this tick so the open detail panel re-fetches its
   * detail-only fields (e.g. presenze) when another user modifies them.
   *
   * Without this, Pattern A's preserveDetailFields would restore the
   * LOCAL previous presenze values during the board refetch, silently
   * hiding the remote change until page reload.
   */
  detailRefreshTick: number
}

const DEFAULT_STAGE_DEFINITIONS: PayrollStageDefinition[] = [
  { id: "TODO", label: "TODO", color: "sky" },
  { id: "Inviate richiesta presenze", label: "Inviate richiesta presenze", color: "sky" },
  { id: "Follow up richiesta presenze", label: "Follow up richiesta presenze", color: "cyan" },
  { id: "Followup fatti", label: "Followup fatti", color: "blue" },
  { id: "Problema in comunicazione presenze", label: "Problema in comunicazione presenze", color: "orange" },
  { id: "Ricezione presenze", label: "Ricezione presenze", color: "amber" },
  { id: "Cedolino da controllare", label: "Cedolino da controllare", color: "yellow" },
  { id: "Cedolino Pronto", label: "Cedolino Pronto", color: "lime" },
  { id: "Inviato cedolino", label: "Inviato cedolino", color: "green" },
  { id: "Richiesta chiarimenti", label: "Richiesta chiarimenti", color: "orange" },
  { id: "Pagato", label: "Pagato", color: "green" },
  { id: "DONE", label: "DONE", color: "emerald" },
]

// `done` is intentionally NOT aliased to "Pagato": "DONE" is a DISTINCT,
// terminal stage written by the `wk-conferma-pagamento-cedolino` edge function
// AFTER the payment-confirmation email/WhatsApp have been sent. Collapsing it
// onto "Pagato" (as before) hid whether the confirmation actually went out.
const LEGACY_STAGE_ALIASES: Record<string, string> = {
  "cedolino pronto saf acli": "Cedolino Pronto",
}

/**
 * Stages that cannot be set manually (drop/select). "DONE" used to live here
 * because it's normally written by the `wk-conferma-pagamento-cedolino` edge
 * function after the payment-confirmation message is sent; per richiesta
 * operativa lo spostamento manuale in DONE è ora consentito, quindi il set è
 * vuoto. NB: spostare a mano in DONE NON invia la conferma di pagamento.
 * Per ri-bloccarlo, reinserire "DONE" qui.
 */
export const TERMINAL_STAGE_IDS = new Set<string>([])

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

  for (const [legacyAlias, stageId] of Object.entries(LEGACY_STAGE_ALIASES)) {
    aliases.set(normalizeToken(legacyAlias), stageId)
  }

  const lookupRows = rows.filter(
    (row) =>
      row.is_active &&
      row.entity_table === "mesi_lavorati" &&
      row.entity_field === "stato_mese_lavorativo"
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

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return null
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatItalianDate(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed)
}

/**
 * Pattern A bindings: fields that the detail loader enriches into the card
 * (presenze, presenzeRegolari, and any wider record/rapporto/famiglia/mese
 * columns the detail RPC returns) must be preserved when the board RPC
 * refetches without them. Same shape as use-crm-pipeline-preview.ts.
 *
 * Treatment: if the fresh card has the field as null/undefined but the
 * previous card had a value, restore the previous value. If the fresh card
 * has a non-null value (even if narrower than detail), keep the fresh value.
 */
const PRESERVED_DETAIL_FIELDS: ReadonlyArray<keyof PayrollBoardCardData> = [
  "presenze",
  "presenzeRegolari",
]

function preserveDetailFields(
  card: PayrollBoardCardData,
  previousCard: PayrollBoardCardData | undefined,
): PayrollBoardCardData {
  if (!previousCard) return card
  const merged: PayrollBoardCardData = { ...card }
  for (const field of PRESERVED_DETAIL_FIELDS) {
    if (merged[field] == null && previousCard[field] != null) {
      ;(merged as Record<string, unknown>)[field] = previousCard[field]
    }
  }
  return merged
}

async function fetchPayrollBoardData(
  selectedMonth: string,
  getPreviousCard?: (cardId: string) => PayrollBoardCardData | undefined,
): Promise<PayrollBoardColumnData[]> {
  const [lookupResult, boardResult] = await Promise.all([
    fetchLookupValues(),
    fetchCedoliniBoard(selectedMonth),
  ])

  // Nomi dalle assunzioni collegate (priorità sul nome del rapporto).
  const assunzioneNamesByRapporto = await fetchAssunzioniNamesByRapportoIds(
    boardResult.rows
      .map((row) => row.rapporto?.id)
      .filter((id): id is string => Boolean(id))
  )

  const stageMetadata = buildStageMetadata(lookupResult.rows)
  const stages = stageMetadata.definitions
  const aliases = stageMetadata.aliases
  const cardsByStage = new Map<string, PayrollBoardCardData[]>(
    stages.map((stage) => [stage.id, []])
  )

  for (const row of boardResult.rows) {
    const record = row.record
    if (!record) continue

    const stage = aliases.get(normalizeToken(record.stato_mese_lavorativo))
    if (!stage) continue

    const rapporto = row.rapporto ?? null
    const famiglia = row.famiglia ?? null
    const lavoratore = row.lavoratore ?? null
    const assunzioneNames = rapporto ? assunzioneNamesByRapporto[rapporto.id] ?? null : null

    const nomeCompleto = rapporto
      ? getRapportoTitle(rapporto, {
          famiglia,
          lavoratore,
          assunzioneDatore: assunzioneNames?.datore,
          assunzioneLavoratore: assunzioneNames?.lavoratore,
        })
      : "Rapporto non disponibile"

    // presenze / presenzeRegolari are not loaded by the board RPC; the detail
    // panel writes them into the board cache via setQueryData on card open.
    // We start from null here and let preserveDetailFields restore from the
    // previous card so a board refetch (e.g. realtime echo) doesn't wipe an
    // already-loaded detail.
    const freshCard: PayrollBoardCardData = {
      id: record.id,
      stage,
      record,
      famiglia,
      pagamento: row.pagamento ?? null,
      transazione: row.transazione ?? null,
      presenze: null,
      presenzeRegolari: null,
      rapporto,
      mese: row.mese ?? null,
      richiestaAttivazione: row.richiestaAttivazione ?? null,
      presenzeIrregolari: Boolean(row.presenzeIrregolari),
      nomeCompleto,
      importoLabel: formatCurrency(record.importo_busta_estratto),
      dataInvioLabel: formatItalianDate(record.data_invio_famiglia),
    }

    const card = preserveDetailFields(freshCard, getPreviousCard?.(record.id))

    cardsByStage.get(stage)?.push(card)
  }

  return stages.map((stage) => ({
    id: stage.id,
    label: stage.label,
    color: stage.color,
    cards: cardsByStage.get(stage.id) ?? [],
  }))
}

export function usePayrollBoard(selectedMonth: string): UsePayrollBoardState {
  const queryClient = useQueryClient()
  const boardQueryKey = React.useMemo(
    () => ["payroll-board", selectedMonth] as const,
    [selectedMonth],
  )

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: boardQueryKey,
    queryFn: () =>
      fetchPayrollBoardData(selectedMonth, (cardId) => {
        // Read the CURRENT cache at mapping time (not a snapshot taken at
        // queryFn start) so a concurrent setQueryData from the detail
        // loader is observed and its enriched fields get preserved.
        // Mirrors the lazy callback pattern in use-crm-pipeline-preview.ts.
        const latest = queryClient.getQueryData<PayrollBoardColumnData[]>(boardQueryKey)
        if (!latest) return undefined
        for (const column of latest) {
          const card = column.cards.find((c) => c.id === cardId)
          if (card) return card
        }
        return undefined
      }),
  })

  const columns = data ?? []

  const invalidateBoard = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: boardQueryKey })
  }, [queryClient, boardQueryKey])

  type PayrollBoard = PayrollBoardColumnData[]

  const moveMutation = useMoveMutation<
    { recordId: string; targetStageId: string },
    unknown,
    PayrollBoard
  >({
    queryKey: boardQueryKey,
    mutationFn: ({ recordId, targetStageId }) =>
      updateRecord("mesi_lavorati", recordId, { stato_mese_lavorativo: targetStageId }),
    applyOptimistic: (previous, { recordId, targetStageId }) => {
      if (!previous) return previous
      let movedCard: PayrollBoardCardData | null = null
      const removed = previous.map((column) => {
        if (column.cards.some((card) => card.id === recordId)) {
          const remainingCards = column.cards.filter((card) => {
            if (card.id !== recordId) return true
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
          ? { ...column, cards: [movedCard as PayrollBoardCardData, ...column.cards] }
          : column,
      )
    },
  })

  const moveCard = React.useCallback(
    async (recordId: string, targetStageId: string) => {
      await moveMutation.mutateAsync({ recordId, targetStageId })
    },
    [moveMutation],
  )

  const patchCardMutation = usePatchMutation<
    { recordId: string; patch: Partial<MeseLavoratoRecord> },
    unknown,
    PayrollBoard
  >({
    queryKey: boardQueryKey,
    mutationFn: ({ recordId, patch }) =>
      updateRecord("mesi_lavorati", recordId, patch as Record<string, unknown>),
    applyOptimistic: (previous, { recordId, patch }) => {
      if (!previous) return previous
      return previous.map((column) => ({
        ...column,
        cards: column.cards.map((card) =>
          card.id === recordId
            ? {
                ...card,
                record: { ...card.record, ...patch },
                importoLabel:
                  typeof patch.importo_busta_estratto === "number"
                    ? formatCurrency(patch.importo_busta_estratto)
                    : card.importoLabel,
                dataInvioLabel:
                  typeof patch.data_invio_famiglia === "string"
                    ? formatItalianDate(patch.data_invio_famiglia)
                    : card.dataInvioLabel,
              }
            : card,
        ),
      }))
    },
  })

  const patchCard = React.useCallback(
    async (recordId: string, patch: Partial<MeseLavoratoRecord>) => {
      await patchCardMutation.mutateAsync({ recordId, patch })
    },
    [patchCardMutation],
  )

  const patchPresenceMutation = usePatchMutation<
    { recordId: string; patch: Partial<PresenzaMensileRecord> },
    unknown,
    PayrollBoard
  >({
    queryKey: boardQueryKey,
    mutationFn: ({ recordId, patch }) =>
      updateRecord("presenze_mensili", recordId, patch as Record<string, unknown>),
    applyOptimistic: (previous, { recordId, patch }) => {
      if (!previous) return previous
      return previous.map((column) => ({
        ...column,
        cards: column.cards.map((card) =>
          card.presenze?.id === recordId
            ? { ...card, presenze: { ...card.presenze, ...patch } }
            : card,
        ),
      }))
    },
  })

  const patchPresence = React.useCallback(
    async (recordId: string, patch: Partial<PresenzaMensileRecord>) => {
      await patchPresenceMutation.mutateAsync({ recordId, patch })
    },
    [patchPresenceMutation],
  )

  const [detailRefreshTick, setDetailRefreshTick] = React.useState(0)
  const bumpDetailRefreshTick = React.useCallback(() => {
    setDetailRefreshTick((current) => current + 1)
  }, [])

  useRealtimeBoardSync({
    tables: PAYROLL_REALTIME_TABLES,
    reload: invalidateBoard,
    // Re-fetch the open detail panel when a remote change arrives. The
    // board fetch returns presenze: null, and Pattern A's
    // preserveDetailFields restores presenze from the LOCAL previous
    // card — so without this, remote presenze edits stay invisible
    // until page reload. Self-echoes are filtered by the echo-window
    // guard inside useRealtimeBoardSync, so the tick only bumps for
    // genuinely remote changes.
    reloadOpenDetail: bumpDetailRefreshTick,
  })

  const error =
    moveMutation.error instanceof Error
      ? moveMutation.error.message
      : patchCardMutation.error instanceof Error
        ? patchCardMutation.error.message
        : patchPresenceMutation.error instanceof Error
          ? patchPresenceMutation.error.message
          : queryError instanceof Error
            ? queryError.message
            : null

  const enrichCardFromDetail = React.useCallback(
    (
      cardId: string,
      detail: Partial<PayrollBoardCardData>,
    ): PayrollBoardCardData | undefined => {
      let mergedCard: PayrollBoardCardData | undefined
      queryClient.setQueryData<PayrollBoardColumnData[]>(boardQueryKey, (previous) => {
        if (!previous) return previous
        return previous.map((column) => ({
          ...column,
          cards: column.cards.map((card) => {
            if (card.id !== cardId) return card
            mergedCard = { ...card, ...detail }
            return mergedCard
          }),
        }))
      })
      return mergedCard
    },
    [queryClient, boardQueryKey],
  )

  return {
    loading: isLoading,
    error,
    columns,
    moveCard,
    patchCard,
    patchPresence,
    enrichCardFromDetail,
    detailRefreshTick,
  }
}
