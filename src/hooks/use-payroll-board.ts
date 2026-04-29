import * as React from "react"

import {
  fetchFamiglie,
  fetchLookupValues,
  fetchMesiCalendario,
  fetchMesiLavorati,
  fetchPagamenti,
  fetchPresenzeMensili,
  fetchRapportiLavorativi,
  fetchTransazioniFinanziarie,
  updateRecord,
  type QueryFilterGroup,
} from "@/lib/anagrafiche-api"
import { getRapportoTitle } from "@/features/rapporti/rapporti-labels"
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

const PAYROLL_RAPPORTI_SELECT = [
  "id",
  "famiglia_id",
  "creata",
  "codice_datore_webcolf",
  "codice_dipendente_webcolf",
  "cognome_nome_datore_proper",
  "nome_lavoratore_per_url",
  "tipo_rapporto",
  "tipo_contratto",
] satisfies string[]

const PAYROLL_FAMIGLIE_SELECT = ["id", "nome", "cognome"] satisfies string[]

const PAYROLL_MESI_LAVORATI_SELECT = [
  "id",
  "mese_id",
  "rapporto_lavorativo_id",
  "presenze_id",
  "presenze_regolare_id",
  "stato_mese_lavorativo",
  "importo_busta_estratto",
  "data_invio_famiglia",
  "data_ora_creazione",
  "caso_particolare",
  "cedolino",
  "cedolino_url",
  "ore_contratto_mese",
  "ore_lavorate_estratte",
  "cedolino_corretto",
  "note",
  "rating_feedback_famiglia",
  "testo_feedback_famiglia",
] satisfies string[]

const PAYROLL_TRANSAZIONI_SELECT = ["id", "mese_lavorativo_id"] satisfies string[]

const PAYROLL_PAGAMENTI_SELECT = [
  "id",
  "amount",
  "charge_id",
  "data_ora_di_pagamento",
  "famiglia_id",
  "fattura_url",
  "fee",
  "numero_fattura",
  "payment_intent_id",
  "status",
  "ticket_id",
  "transazione_id",
  "type_of_payment",
] satisfies string[]

const PAYROLL_PRESENZE_SELECT = [
  "id",
  "presenze_mensili",
  "data_ora_creazione",
] satisfies string[]

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

function buildInFilter(field: string, values: string[]): QueryFilterGroup | undefined {
  const uniqueValues = Array.from(new Set(values.filter(Boolean)))
  if (uniqueValues.length === 0) return undefined

  return {
    kind: "group",
    id: `${field}-in-root`,
    logic: "and",
    nodes: [
      {
      kind: "condition" as const,
      id: `${field}-in-0`,
      field,
      operator: "in" as const,
      value: uniqueValues.join(","),
    },
    ],
  }
}

function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = []

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }

  return chunks
}

function normalizeRecordKey(value: unknown) {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  return normalized || null
}

function buildMonthDateRange(selectedMonth: string) {
  const [yearPart, monthPart] = selectedMonth.split("-")
  const year = Number.parseInt(yearPart ?? "", 10)
  const month = Number.parseInt(monthPart ?? "", 10)

  if (!Number.isFinite(year) || !Number.isFinite(month)) return null

  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 0))

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

function getMonthIdsForSelectedMonth(
  mesiCalendario: MeseCalendarioRecord[],
  selectedMonth: string
) {
  const range = buildMonthDateRange(selectedMonth)
  if (!range) return []

  return mesiCalendario
    .filter((mese) => {
      const dataInizio = normalizeRecordKey(mese.data_inizio)
      if (!dataInizio) return false
      const normalizedDate = dataInizio.slice(0, 10)
      return normalizedDate >= range.start && normalizedDate <= range.end
    })
    .map((mese) => normalizeRecordKey(mese.id))
    .filter((value): value is string => Boolean(value))
}

async function fetchPayrollBoardData(selectedMonth: string): Promise<PayrollBoardColumnData[]> {
  const mesiCalendarioResult = await fetchMesiCalendario({
    limit: 200,
    offset: 0,
    orderBy: [{ field: "data_inizio", ascending: false }],
  })
  const monthIds = getMonthIdsForSelectedMonth(mesiCalendarioResult.rows, selectedMonth)
  const [rapportiResult, famiglieResult, lookupResult] = await Promise.all([
    fetchRapportiLavorativi({
      select: PAYROLL_RAPPORTI_SELECT,
      limit: 1000,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
    }),
    fetchFamiglie({
      select: PAYROLL_FAMIGLIE_SELECT,
      limit: 2000,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
    }),
    fetchLookupValues(),
  ])
  const mesiLavoratiResult =
    monthIds.length > 0
      ? await fetchMesiLavorati({
          select: PAYROLL_MESI_LAVORATI_SELECT,
          limit: 3000,
          offset: 0,
          orderBy: [{ field: "creato_il", ascending: false }],
          filters: buildInFilter("mese_id", monthIds),
        })
      : { rows: [], total: 0, columns: [], groups: [] }
  const selectedRows = mesiLavoratiResult.rows

  const stageMetadata = buildStageMetadata(lookupResult.rows)
  const stages = stageMetadata.definitions
  const aliases = stageMetadata.aliases
  const cardsByStage = new Map<string, PayrollBoardCardData[]>(
    stages.map((stage) => [stage.id, []])
  )
  const meseById = new Map(
    mesiCalendarioResult.rows
      .map((mese) => {
        const key = normalizeRecordKey(mese.id)
        return key ? ([key, mese] as const) : null
      })
      .filter(Boolean) as Array<readonly [string, MeseCalendarioRecord]>
  )
  const rapportoById = new Map(
    rapportiResult.rows
      .map((rapporto) => {
        const key = normalizeRecordKey(rapporto.id)
        return key ? ([key, rapporto] as const) : null
      })
      .filter(Boolean) as Array<readonly [string, RapportoLavorativoRecord]>
  )
  const famigliaById = new Map(
    famiglieResult.rows
      .map((famiglia) => {
        const key = normalizeRecordKey(famiglia.id)
        return key ? ([key, famiglia as FamigliaRecord] as const) : null
      })
      .filter(Boolean) as Array<readonly [string, FamigliaRecord]>
  )
  const meseLavoratoIds = selectedRows.map((record) => record.id).filter(Boolean)
  const presenzaIds = selectedRows.flatMap((record) =>
    [record.presenze_id, record.presenze_regolare_id].filter(Boolean) as string[]
  )

  const transazioniRows =
    meseLavoratoIds.length > 0
      ? (
          await Promise.all(
            chunkValues(Array.from(new Set(meseLavoratoIds)), 100).map((chunk) =>
              fetchTransazioniFinanziarie({
                select: PAYROLL_TRANSAZIONI_SELECT,
                limit: 500,
                offset: 0,
                orderBy: [{ field: "creato_il", ascending: false }],
                filters: buildInFilter("mese_lavorativo_id", chunk),
              })
            )
          )
        ).flatMap((result) => result.rows)
      : []

  const transazioneIds = transazioniRows
    .map((transazione) => normalizeRecordKey(transazione.id))
    .filter((value): value is string => Boolean(value))

  const [pagamentiRows, presenzeRows] = await Promise.all([
    transazioneIds.length > 0
      ? Promise.all(
          chunkValues(Array.from(new Set(transazioneIds)), 100).map((chunk) =>
            fetchPagamenti({
              select: PAYROLL_PAGAMENTI_SELECT,
              limit: 500,
              offset: 0,
              orderBy: [{ field: "creato_il", ascending: false }],
              filters: buildInFilter("transazione_id", chunk),
            })
          )
        ).then((results) => results.flatMap((result) => result.rows))
      : [],
    presenzaIds.length > 0
      ? Promise.all(
          chunkValues(Array.from(new Set(presenzaIds)), 100).map((chunk) =>
            fetchPresenzeMensili({
              select: PAYROLL_PRESENZE_SELECT,
              limit: 500,
              offset: 0,
              orderBy: [{ field: "creato_il", ascending: false }],
              filters: buildInFilter("id", chunk),
            })
          )
        ).then((results) => results.flatMap((result) => result.rows))
      : [],
  ])
  const transazioneByMeseLavoratoId = new Map<string, TransazioneFinanziariaRecord>()
  for (const transazione of transazioniRows) {
    const meseLavoratoId = normalizeRecordKey(transazione.mese_lavorativo_id)
    if (!meseLavoratoId || transazioneByMeseLavoratoId.has(meseLavoratoId)) continue
    transazioneByMeseLavoratoId.set(meseLavoratoId, transazione)
  }

  const pagamentoByTransazioneId = new Map(
    pagamentiRows
      .map((pagamento) => {
        const key = normalizeRecordKey(pagamento.transazione_id)
        return key ? ([key, pagamento] as const) : null
      })
      .filter(Boolean) as Array<readonly [string, PagamentoRecord]>
  )
  const presenzeById = new Map(
    presenzeRows
      .map((presenza) => {
        const key = normalizeRecordKey(presenza.id)
        return key ? ([key, presenza] as const) : null
      })
      .filter(Boolean) as Array<readonly [string, PresenzaMensileRecord]>
  )

  for (const record of selectedRows) {
    const mese = normalizeRecordKey(record.mese_id)
      ? meseById.get(normalizeRecordKey(record.mese_id) as string) ?? null
      : null

    const stage = aliases.get(normalizeToken(record.stato_mese_lavorativo))
    if (!stage) continue

    const rapporto = normalizeRecordKey(record.rapporto_lavorativo_id)
      ? rapportoById.get(normalizeRecordKey(record.rapporto_lavorativo_id) as string) ?? null
      : null
    const famiglia = normalizeRecordKey(rapporto?.famiglia_id)
      ? famigliaById.get(normalizeRecordKey(rapporto?.famiglia_id) as string) ?? null
      : null
    const transazione = transazioneByMeseLavoratoId.get(record.id) ?? null
    const pagamento = normalizeRecordKey(transazione?.id)
      ? pagamentoByTransazioneId.get(normalizeRecordKey(transazione?.id) as string) ?? null
      : null
    const presenze = normalizeRecordKey(record.presenze_id)
      ? presenzeById.get(normalizeRecordKey(record.presenze_id) as string) ?? null
      : null
    const presenzeRegolari = normalizeRecordKey(record.presenze_regolare_id)
      ? presenzeById.get(normalizeRecordKey(record.presenze_regolare_id) as string) ?? null
      : null

    const nomeCompleto = rapporto ? getRapportoTitle(rapporto) : "Rapporto non disponibile"

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

  return {
    loading,
    error,
    columns,
    moveCard,
    patchCard,
    patchPresence,
  }
}
