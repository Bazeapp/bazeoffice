import * as React from "react"

import {
  fetchFamiglie,
  fetchLookupValues,
  fetchMesiCalendario,
  fetchMesiLavorati,
  fetchPagamenti,
  fetchPresenzeMensili,
  fetchRapportiLavorativi,
  updateRecord,
  type QueryFilterGroup,
} from "@/lib/anagrafiche-api"
import type {
  FamigliaRecord,
  LookupValueRecord,
  MeseCalendarioRecord,
  MeseLavoratoRecord,
  PagamentoRecord,
  PresenzaMensileRecord,
  RapportoLavorativoRecord,
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
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed)
}

function buildAnyOfFilter(field: string, values: string[]): QueryFilterGroup | undefined {
  const uniqueValues = Array.from(new Set(values.filter(Boolean)))
  if (uniqueValues.length === 0) return undefined

  return {
    kind: "group",
    id: `${field}-any-of-root`,
    logic: "or",
    nodes: uniqueValues.map((value, index) => ({
      kind: "condition" as const,
      id: `${field}-any-of-${index}`,
      field,
      operator: "is" as const,
      value,
    })),
  }
}

async function fetchPayrollBoardData(selectedMonth: string): Promise<PayrollBoardColumnData[]> {
  const [mesiLavoratiResult, mesiCalendarioResult, rapportiResult, famiglieResult, lookupResult] = await Promise.all([
    fetchMesiLavorati({
      limit: 3000,
      offset: 0,
      orderBy: [{ field: "creato_il", ascending: false }],
    }),
    fetchMesiCalendario({
      limit: 200,
      offset: 0,
      orderBy: [{ field: "data_inizio", ascending: false }],
    }),
    fetchRapportiLavorativi({
      limit: 1000,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
    }),
    fetchFamiglie({
      limit: 2000,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
    }),
    fetchLookupValues(),
  ])

  const stageMetadata = buildStageMetadata(lookupResult.rows)
  const stages = stageMetadata.definitions
  const aliases = stageMetadata.aliases
  const cardsByStage = new Map<string, PayrollBoardCardData[]>(
    stages.map((stage) => [stage.id, []])
  )
  const meseById = new Map(mesiCalendarioResult.rows.map((mese) => [mese.id, mese]))
  const rapportoById = new Map(rapportiResult.rows.map((rapporto) => [rapporto.id, rapporto]))
  const famigliaById = new Map(famiglieResult.rows.map((famiglia) => [famiglia.id as string, famiglia as FamigliaRecord]))
  const selectedRows = mesiLavoratiResult.rows.filter((record) => {
    const mese = record.mese_id ? meseById.get(record.mese_id) ?? null : null
    return mese?.data_inizio?.slice(0, 7) === selectedMonth
  })
  const ticketIds = selectedRows.map((record) => record.ticket_id).filter(Boolean) as string[]
  const presenzaIds = selectedRows.flatMap((record) =>
    [record.presenze_id, record.presenze_regolare_id].filter(Boolean) as string[]
  )

  const [pagamentiResult, presenzeResult] = await Promise.all([
    ticketIds.length > 0
      ? fetchPagamenti({
          limit: 500,
          offset: 0,
          orderBy: [{ field: "creato_il", ascending: false }],
          filters: buildAnyOfFilter("ticket_id", ticketIds),
        })
      : Promise.resolve({ rows: [], total: 0, columns: [] }),
    presenzaIds.length > 0
      ? fetchPresenzeMensili({
          limit: 500,
          offset: 0,
          orderBy: [{ field: "creato_il", ascending: false }],
          filters: buildAnyOfFilter("id", presenzaIds),
        })
      : Promise.resolve({ rows: [], total: 0, columns: [] }),
  ])
  const pagamentoByTicketId = new Map(
    pagamentiResult.rows
      .filter((pagamento) => pagamento.ticket_id)
      .map((pagamento) => [pagamento.ticket_id as string, pagamento])
  )
  const presenzeById = new Map(presenzeResult.rows.map((presenza) => [presenza.id, presenza]))

  for (const record of selectedRows) {
    const mese = record.mese_id ? meseById.get(record.mese_id) ?? null : null

    const stage = aliases.get(normalizeToken(record.stato_mese_lavorativo))
    if (!stage) continue

    const rapporto = record.rapporto_lavorativo_id
      ? rapportoById.get(record.rapporto_lavorativo_id) ?? null
      : null
    const famiglia = rapporto?.famiglia_id ? famigliaById.get(rapporto.famiglia_id) ?? null : null
    const pagamento = record.ticket_id ? pagamentoByTicketId.get(record.ticket_id) ?? null : null
    const presenze = record.presenze_id ? presenzeById.get(record.presenze_id) ?? null : null
    const presenzeRegolari = record.presenze_regolare_id
      ? presenzeById.get(record.presenze_regolare_id) ?? null
      : null

    const nomeCompleto =
      [rapporto?.cognome_nome_datore_proper, rapporto?.nome_lavoratore_per_url]
        .filter(Boolean)
        .join(" – ")
        .trim() || "Rapporto non disponibile"

    const card: PayrollBoardCardData = {
      id: record.id,
      stage,
      record,
      famiglia,
      pagamento,
      presenze,
      presenzeRegolari,
      rapporto,
      mese,
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

  return {
    loading,
    error,
    columns,
    moveCard,
    patchCard,
  }
}
