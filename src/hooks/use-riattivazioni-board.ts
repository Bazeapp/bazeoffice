import * as React from "react"

import {
  fetchChiusureContratti,
  fetchFamiglie,
  fetchLavoratori,
  fetchRapportiLavorativi,
  updateRecord,
  type QueryFilterGroup,
} from "@/lib/anagrafiche-api"
import {
  getRapportoFamilyLabel,
  getRapportoWorkerLabel,
} from "@/features/rapporti/rapporti-labels"
import type {
  ChiusuraContrattoRecord,
  FamigliaRecord,
  LavoratoreRecord,
  RapportoLavorativoRecord,
} from "@/types"

export type RiattivazioneStageId =
  | "da sentire"
  | "in attesa"
  | "riattivato"
  | "non riattiva"

type RiattivazioneStageDefinition = {
  id: RiattivazioneStageId
  label: string
  color: string
}

export type RiattivazioniBoardCardData = {
  id: string
  stage: RiattivazioneStageId
  record: ChiusuraContrattoRecord
  rapporto: RapportoLavorativoRecord | null
  nomeCompleto: string
  famigliaLabel: string
  lavoratoreLabel: string
  email: string
  motivazione: string | null
  dataFineRapporto: string
  tipoLabel: string
}

export type RiattivazioniBoardColumnData = {
  id: RiattivazioneStageId
  label: string
  color: string
  cards: RiattivazioniBoardCardData[]
}

type UseRiattivazioniBoardState = {
  loading: boolean
  error: string | null
  columns: RiattivazioniBoardColumnData[]
  moveCard: (recordId: string, targetStageId: RiattivazioneStageId) => Promise<void>
  updateCard: (
    recordId: string,
    updater: (card: RiattivazioniBoardCardData) => RiattivazioniBoardCardData,
  ) => void
}

export const RIATTIVAZIONI_STAGE_DEFINITIONS: RiattivazioneStageDefinition[] = [
  { id: "da sentire", label: "Da sentire", color: "sky" },
  { id: "in attesa", label: "In attesa", color: "amber" },
  { id: "riattivato", label: "Riattivato", color: "emerald" },
  { id: "non riattiva", label: "Non riattiva", color: "rose" },
]

const DEFAULT_STAGE_ID: RiattivazioneStageId = "da sentire"

const RIATTIVAZIONI_RAPPORTI_SELECT = [
  "id",
  "ticket_id",
  "famiglia_id",
  "lavoratore_id",
  "stato_assunzione",
  "stato_servizio",
  "fine_rapporto_lavorativo_id",
  "tipo_rapporto",
  "tipo_contratto",
  "ore_a_settimana",
  "data_inizio_rapporto",
  "cognome_nome_datore_proper",
  "nome_lavoratore_per_url",
] satisfies string[]

const RIATTIVAZIONI_CHIUSURE_SELECT = [
  "id",
  "ticket_id",
  "stato",
  "stato_riattivazione_famiglia",
  "nome",
  "cognome",
  "allegato_compilato",
  "check_8_giorni_di_lavoro_svolti",
  "check_chiusura_istantanea",
  "creato_il",
  "email",
  "informazioni_aggiuntive",
  "motivazione_cessazione_rapporto",
  "motivazione_lost",
  "data_fine_rapporto",
  "data_per_riattivazione",
  "documenti_chiusura_rapporto",
  "presenze_ultimo_mese",
  "sconto_proposto_riattivazione",
  "tipo_licenziamento",
  "tipo_decesso",
] satisfies string[]

const RIATTIVAZIONI_FAMIGLIE_SELECT = ["id", "nome", "cognome", "email"] satisfies string[]

const RIATTIVAZIONI_LAVORATORI_SELECT = ["id", "nome", "cognome", "email"] satisfies string[]

const LOOKUP_FILTER_CHUNK_SIZE = 80

type RiattivazioneFamigliaLookup = Pick<FamigliaRecord, "id" | "nome" | "cognome" | "email">

type RiattivazioneLavoratoreLookup = Pick<LavoratoreRecord, "id" | "nome" | "cognome" | "email">

type RiattivazioneBaseCard = {
  record: ChiusuraContrattoRecord
  rapporto: RapportoLavorativoRecord | null
  stage: RiattivazioneStageId
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

function chunkValues<TValue>(values: TValue[], size: number) {
  const chunks: TValue[][] = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

function buildInFilter(field: string, values: string[]): QueryFilterGroup {
  return {
    kind: "group",
    id: `${field}-lookup-filter`,
    logic: "and",
    nodes: [
      {
        kind: "condition",
        id: `${field}-lookup-condition`,
        field,
        operator: "in",
        value: values.join(","),
      },
    ],
  }
}

async function fetchRiattivazioneFamiglieByIds(ids: string[]) {
  if (!ids.length) return [] as RiattivazioneFamigliaLookup[]

  const results = await Promise.all(
    chunkValues(ids, LOOKUP_FILTER_CHUNK_SIZE).map((chunk) =>
      fetchFamiglie({
        select: RIATTIVAZIONI_FAMIGLIE_SELECT,
        limit: chunk.length,
        offset: 0,
        includeSchema: false,
        filters: buildInFilter("id", chunk),
      }),
    ),
  )

  return results.flatMap((result) => result.rows as RiattivazioneFamigliaLookup[])
}

async function fetchRiattivazioneLavoratoriByIds(ids: string[]) {
  if (!ids.length) return [] as RiattivazioneLavoratoreLookup[]

  const results = await Promise.all(
    chunkValues(ids, LOOKUP_FILTER_CHUNK_SIZE).map((chunk) =>
      fetchLavoratori({
        select: RIATTIVAZIONI_LAVORATORI_SELECT,
        limit: chunk.length,
        offset: 0,
        includeSchema: false,
        filters: buildInFilter("id", chunk),
      }),
    ),
  )

  return results.flatMap((result) => result.rows as RiattivazioneLavoratoreLookup[])
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

function formatItalianDate(value: unknown) {
  const raw = toStringValue(value)
  if (!raw) return "-"

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return "-"

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed)
}

function resolveStage(value: string | null | undefined): RiattivazioneStageId {
  const normalized = normalizeToken(value)
  const matchedStage = RIATTIVAZIONI_STAGE_DEFINITIONS.find(
    (stage) => normalizeToken(stage.id) === normalized || normalizeToken(stage.label) === normalized,
  )
  return matchedStage?.id ?? DEFAULT_STAGE_ID
}

function hasRiattivazioneStatus(value: string | null | undefined) {
  return normalizeToken(value).length > 0
}

function shouldShowUnclassifiedChiusura(rapporto: RapportoLavorativoRecord | null) {
  return normalizeToken(rapporto?.stato_servizio) === "non attivo"
}

function getChiusuraTipoLabel(record: ChiusuraContrattoRecord) {
  return record.tipo_licenziamento ?? record.tipo_decesso ?? "-"
}

function getFallbackFamigliaLabel(record: ChiusuraContrattoRecord) {
  return [record.cognome, record.nome].filter(Boolean).join(" ").trim() || "Famiglia senza nome"
}

async function fetchRiattivazioniBoardData(): Promise<{
  columns: RiattivazioniBoardColumnData[]
}> {
  const [chiusureResult, rapportiResult] = await Promise.all([
    fetchChiusureContratti({
      select: RIATTIVAZIONI_CHIUSURE_SELECT,
      limit: 1000,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
    }),
    fetchRapportiLavorativi({
      select: RIATTIVAZIONI_RAPPORTI_SELECT,
      limit: 1000,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
    }),
  ])

  const rapportoByTicketId = new Map(
    rapportiResult.rows
      .filter((rapporto) => rapporto.ticket_id)
      .map((rapporto) => [rapporto.ticket_id as string, rapporto] as const),
  )
  const rapportoByChiusuraId = new Map(
    rapportiResult.rows
      .filter((rapporto) => rapporto.fine_rapporto_lavorativo_id)
      .map((rapporto) => [rapporto.fine_rapporto_lavorativo_id as string, rapporto] as const),
  )

  const baseCards: RiattivazioneBaseCard[] = []
  for (const record of chiusureResult.rows) {
    const stage = resolveStage(record.stato_riattivazione_famiglia)
    const rapporto =
      rapportoByChiusuraId.get(record.id) ??
      (record.ticket_id ? rapportoByTicketId.get(record.ticket_id) ?? null : null)
    const hasExplicitStage = hasRiattivazioneStatus(record.stato_riattivazione_famiglia)
    if (!hasExplicitStage && !shouldShowUnclassifiedChiusura(rapporto)) continue

    baseCards.push({ record, rapporto, stage })
  }

  const famigliaIds = uniqueStrings(baseCards.map((card) => card.rapporto?.famiglia_id))
  const lavoratoreIds = uniqueStrings(baseCards.map((card) => card.rapporto?.lavoratore_id))

  const [famiglie, lavoratori] = await Promise.all([
    fetchRiattivazioneFamiglieByIds(famigliaIds),
    fetchRiattivazioneLavoratoriByIds(lavoratoreIds),
  ])

  const famigliaById = new Map(famiglie.map((famiglia) => [famiglia.id, famiglia] as const))
  const lavoratoreById = new Map(
    lavoratori.map((lavoratore) => [lavoratore.id, lavoratore] as const),
  )

  const cardsByStage = new Map<RiattivazioneStageId, RiattivazioniBoardCardData[]>(
    RIATTIVAZIONI_STAGE_DEFINITIONS.map((stage) => [stage.id, []]),
  )

  for (const { record, rapporto, stage } of baseCards) {
    const famiglia = rapporto?.famiglia_id ? famigliaById.get(rapporto.famiglia_id) ?? null : null
    const lavoratore = rapporto?.lavoratore_id
      ? lavoratoreById.get(rapporto.lavoratore_id) ?? null
      : null
    const famigliaLabel = rapporto
      ? getRapportoFamilyLabel(rapporto, famiglia as FamigliaRecord | null)
      : getFallbackFamigliaLabel(record)
    const lavoratoreLabel = rapporto
      ? getRapportoWorkerLabel(rapporto, lavoratore as LavoratoreRecord | null)
      : "Lavoratore non associato"
    const nomeCompleto = rapporto ? `${famigliaLabel} – ${lavoratoreLabel}` : famigliaLabel

    const card: RiattivazioniBoardCardData = {
      id: record.id,
      stage,
      record,
      rapporto,
      nomeCompleto,
      famigliaLabel,
      lavoratoreLabel,
      email: record.email ?? famiglia?.email ?? "-",
      motivazione: record.motivazione_lost,
      dataFineRapporto: formatItalianDate(record.data_fine_rapporto),
      tipoLabel: getChiusuraTipoLabel(record),
    }

    cardsByStage.get(stage)?.push(card)
  }

  const columns = RIATTIVAZIONI_STAGE_DEFINITIONS.map((stage) => ({
    id: stage.id,
    label: stage.label,
    color: stage.color,
    cards: cardsByStage.get(stage.id) ?? [],
  }))

  return { columns }
}

export function useRiattivazioniBoard(): UseRiattivazioniBoardState {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [columns, setColumns] = React.useState<RiattivazioniBoardColumnData[]>([])

  const updateCard = React.useCallback(
    (
      recordId: string,
      updater: (card: RiattivazioniBoardCardData) => RiattivazioniBoardCardData,
    ) => {
      setColumns((current) =>
        current.map((column) => ({
          ...column,
          cards: column.cards.map((card) => (card.id === recordId ? updater(card) : card)),
        })),
      )
    },
    [],
  )

  const moveCard = React.useCallback(
    async (recordId: string, targetStageId: RiattivazioneStageId) => {
      const previous = columns

      setColumns((current) => {
        let movedCard: RiattivazioniBoardCardData | null = null

        const nextColumns = current.map((column) => {
          if (column.cards.some((card) => card.id === recordId)) {
            const remainingCards = column.cards.filter((card) => {
              if (card.id !== recordId) return true
              movedCard = {
                ...card,
                stage: targetStageId,
                record: {
                  ...card.record,
                  stato_riattivazione_famiglia: targetStageId,
                },
              }
              return false
            })
            return { ...column, cards: remainingCards }
          }
          return column
        })

        if (!movedCard) return current

        return nextColumns.map((column) =>
          column.id === targetStageId
            ? { ...column, cards: [movedCard as RiattivazioniBoardCardData, ...column.cards] }
            : column,
        )
      })

      try {
        await updateRecord("chiusure_contratti", recordId, {
          stato_riattivazione_famiglia: targetStageId,
        })
      } catch (caughtError) {
        setColumns(previous)
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando stato riattivazione",
        )
      }
    },
    [columns],
  )

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchRiattivazioniBoardData()
        if (cancelled) return
        setColumns(data.columns)
      } catch (caughtError) {
        if (cancelled) return
        setError(
          caughtError instanceof Error ? caughtError.message : "Errore caricamento riattivazioni",
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

  return {
    loading,
    error,
    columns,
    moveCard,
    updateCard,
  }
}
