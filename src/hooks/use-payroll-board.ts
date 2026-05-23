import * as React from "react"

import {
  clearReadCaches,
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
]

const LEGACY_STAGE_ALIASES: Record<string, string> = {
  done: "Pagato",
  "cedolino pronto saf acli": "Cedolino Pronto",
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

async function fetchPayrollBoardData(selectedMonth: string): Promise<PayrollBoardColumnData[]> {
  const [lookupResult, boardResult] = await Promise.all([
    fetchLookupValues(),
    fetchCedoliniBoard(selectedMonth),
  ])

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

    const nomeCompleto = rapporto
      ? getRapportoTitle(rapporto, { famiglia, lavoratore })
      : "Rapporto non disponibile"

    // presenze are not loaded by the board RPC; the detail panel fetches them on
    // card open via fetchCedolinoDetail.
    const card: PayrollBoardCardData = {
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
      nomeCompleto,
      importoLabel: formatCurrency(record.importo_busta_estratto),
      dataInvioLabel: formatItalianDate(record.data_invio_famiglia),
    }

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
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [columns, setColumns] = React.useState<PayrollBoardColumnData[]>([])

  const moveCard = React.useCallback(
    async (recordId: string, targetStageId: string) => {
      const previous = columns

      setColumns((current) => {
        let movedCard: PayrollBoardCardData | null = null

        const nextColumns = current.map((column) => {
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

        if (!movedCard) return current

        return nextColumns.map((column) =>
          column.id === targetStageId
            ? { ...column, cards: [movedCard as PayrollBoardCardData, ...column.cards] }
            : column
        )
      })

      try {
        await updateRecord("mesi_lavorati", recordId, {
          stato_mese_lavorativo: targetStageId,
        })
      } catch (caughtError) {
        setColumns(previous)
        setError(
          caughtError instanceof Error ? caughtError.message : "Errore aggiornando stato cedolino"
        )
      }
    },
    [columns]
  )

  const patchCard = React.useCallback(
    async (recordId: string, patch: Partial<MeseLavoratoRecord>) => {
      const previous = columns

      setColumns((current) =>
        current.map((column) => ({
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
              : card
          ),
        }))
      )

      try {
        await updateRecord("mesi_lavorati", recordId, patch as Record<string, unknown>)
      } catch (caughtError) {
        setColumns(previous)
        setError(
          caughtError instanceof Error ? caughtError.message : "Errore aggiornando cedolino"
        )
      }
    },
    [columns]
  )

  const patchPresence = React.useCallback(
    async (recordId: string, patch: Partial<PresenzaMensileRecord>) => {
      const previous = columns
      setColumns((current) =>
        current.map((column) => ({
          ...column,
          cards: column.cards.map((card) =>
            card.presenze?.id === recordId
              ? { ...card, presenze: { ...card.presenze, ...patch } }
              : card
          ),
        }))
      )

      try {
        await updateRecord("presenze_mensili", recordId, patch as Record<string, unknown>)
      } catch (caughtError) {
        setColumns(previous)
        setError(
          caughtError instanceof Error ? caughtError.message : "Errore aggiornando presenze"
        )
      }
    },
    [columns]
  )

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchPayrollBoardData(selectedMonth)
        if (cancelled) return
        setColumns(data)
      } catch (caughtError) {
        if (cancelled) return
        setError(
          caughtError instanceof Error ? caughtError.message : "Errore caricamento payroll"
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
  }, [selectedMonth])

  const selectedMonthRef = React.useRef(selectedMonth)
  React.useEffect(() => {
    selectedMonthRef.current = selectedMonth
  }, [selectedMonth])

  const reloadSilently = React.useCallback(async () => {
    clearReadCaches()
    try {
      const data = await fetchPayrollBoardData(selectedMonthRef.current)
      setColumns(data)
    } catch {
      // Ignore: a failed background refresh must not blank the board.
    }
  }, [])

  useRealtimeBoardSync({
    tables: PAYROLL_REALTIME_TABLES,
    reload: reloadSilently,
  })

  return {
    loading,
    error,
    columns,
    moveCard,
    patchCard,
    patchPresence,
  }
}
