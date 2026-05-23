import * as React from "react"
import { toast } from "sonner"

import { clearReadCaches, createRecord, fetchChiusureBoard, fetchLookupValues, updateRecord } from "@/lib/anagrafiche-api"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import { getRapportoTitle } from "@/features/rapporti/rapporti-labels"
import type { ChiusuraContrattoRecord, LookupValueRecord, RapportoLavorativoRecord } from "@/types"

const CHIUSURE_REALTIME_TABLES = [
  "chiusure_contratti",
  "rapporti_lavorativi",
  "famiglie",
  "lavoratori",
]

type ChiusuraStageDefinition = {
  id: string
  label: string
  color: string
}

type StageMetadata = {
  definitions: ChiusuraStageDefinition[]
  aliases: Map<string, string>
}

type TipoMetadata = {
  labels: Map<string, string>
  colors: Map<string, string>
}

export type ChiusureBoardCardData = {
  id: string
  stage: string
  record: ChiusuraContrattoRecord
  rapporto: RapportoLavorativoRecord | null
  nomeCompleto: string
  email: string
  motivazione: string | null
  dataFineRapporto: string
  tipoLabel: string
  tipoColor: string | null
  hasAssunzioneDatore: boolean
  hasAssunzioneLavoratore: boolean
}

export type ChiusureBoardColumnData = {
  id: string
  label: string
  color: string
  cards: ChiusureBoardCardData[]
}

type UseChiusureBoardState = {
  loading: boolean
  error: string | null
  columns: ChiusureBoardColumnData[]
  rapportoOptions: Array<{ id: string; label: string; rapporto: RapportoLavorativoRecord }>
  createChiusura: (input: {
    rapportoId: string
    tipo: "licenziamento" | "dimissione" | "annullamento"
    dataFineRapporto: string
    note: string
  }) => Promise<void>
  linkRapporto: (chiusuraId: string, rapportoId: string | null) => Promise<void>
  moveCard: (recordId: string, targetStageId: string) => Promise<void>
  updateCard: (
    recordId: string,
    updater: (card: ChiusureBoardCardData) => ChiusureBoardCardData
  ) => void
}

const LICENZIAMENTO_STAGE_ID = "Datore comunica licenziamento"

const DEFAULT_STAGE_DEFINITIONS: ChiusuraStageDefinition[] = [
  { id: "Lavoratore comunica dimissioni", label: "Lavoratore comunica dimissioni", color: "violet" },
  { id: "Datore comunica licenziamento", label: "Datore comunica licenziamento", color: "zinc" },
  { id: "Inviato comunicazione per firma documento", label: "Inviato comunicazione per firma documento", color: "sky" },
  { id: "Ricevuto documento firmato", label: "Ricevuto documento firmato", color: "lime" },
  { id: "Chiusura elaborata", label: "Chiusura elaborata", color: "amber" },
  { id: "Inviato documenti di chiusura", label: "Inviato documenti di chiusura", color: "lime" },
  { id: "Richiesta chiarimenti famiglia", label: "Richiesta chiarimenti famiglia", color: "orange" },
  { id: "Chiusura terminata", label: "Chiusura terminata", color: "green" },
]

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
      row.entity_table === "chiusure_contratti" &&
      row.entity_field === "stato"
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

function buildTipoMetadata(rows: LookupValueRecord[]): TipoMetadata {
  const labels = new Map<string, string>()
  const colors = new Map<string, string>()

  const lookupRows = rows.filter(
    (row) =>
      row.is_active &&
      row.entity_table === "chiusure_contratti" &&
      (row.entity_field === "tipo_licenziamento" || row.entity_field === "tipo_decesso")
  )

  for (const row of lookupRows) {
    const valueKey = toStringValue(row.value_key)
    const valueLabel = toStringValue(row.value_label)
    const color = readLookupColor(row.metadata)

    if (valueKey) {
      const normalizedKey = normalizeToken(valueKey)
      if (valueLabel) labels.set(normalizedKey, valueLabel)
      if (color) colors.set(normalizedKey, color)
    }

    if (valueLabel) {
      const normalizedLabel = normalizeToken(valueLabel)
      labels.set(normalizedLabel, valueLabel)
      if (color) colors.set(normalizedLabel, color)
    }
  }

  return { labels, colors }
}

async function fetchChiusureBoardData(): Promise<{
  columns: ChiusureBoardColumnData[]
  rapportoOptions: Array<{ id: string; label: string; rapporto: RapportoLavorativoRecord }>
}> {
  const [boardResult, lookupResult] = await Promise.all([
    fetchChiusureBoard(),
    fetchLookupValues(),
  ])

  const stageMetadata = buildStageMetadata(lookupResult.rows)
  const tipoMetadata = buildTipoMetadata(lookupResult.rows)
  const stages = stageMetadata.definitions
  const aliases = stageMetadata.aliases
  const cardsByStage = new Map<string, ChiusureBoardCardData[]>(
    stages.map((stage) => [stage.id, []])
  )

  for (const row of boardResult.cards) {
    const record = row.record
    const stage = aliases.get(normalizeToken(record.stato))
    if (!stage) continue

    const rapporto = row.rapporto ?? null
    const nomeCompleto =
      (rapporto
        ? getRapportoTitle(rapporto, {
            famiglia: row.famiglia ? { cognome: row.famiglia.cognome, nome: row.famiglia.nome } : null,
            lavoratore: row.lavoratore ? { cognome: row.lavoratore.cognome, nome: row.lavoratore.nome } : null,
          })
        : null) ||
      [record.nome, record.cognome].filter(Boolean).join(" ").trim() ||
      "Nominativo non disponibile"
    const rawTipo = record.tipo_licenziamento ?? record.tipo_decesso ?? "-"
    const normalizedTipo = normalizeToken(rawTipo)

    const card: ChiusureBoardCardData = {
      id: record.id,
      stage,
      record,
      rapporto,
      nomeCompleto,
      email: record.email ?? "-",
      motivazione: record.motivazione_cessazione_rapporto,
      dataFineRapporto: formatItalianDate(record.data_fine_rapporto),
      tipoLabel: tipoMetadata.labels.get(normalizedTipo) ?? rawTipo,
      tipoColor: tipoMetadata.colors.get(normalizedTipo) ?? null,
      hasAssunzioneDatore: Boolean(rapporto?.assunzione_datore_id),
      hasAssunzioneLavoratore: Boolean(rapporto?.assunzione_lavoratore_id),
    }

    cardsByStage.get(stage)?.push(card)
  }

  const columns = stages.map((stage) => ({
    id: stage.id,
    label: stage.label,
    color: stage.color,
    cards: cardsByStage.get(stage.id) ?? [],
  }))
  const rapportoOptions = boardResult.rapporti
    .map((row) => ({
      id: row.rapporto.id,
      label: getRapportoTitle(row.rapporto, {
        famiglia: row.famiglia ? { cognome: row.famiglia.cognome, nome: row.famiglia.nome } : null,
        lavoratore: row.lavoratore ? { cognome: row.lavoratore.cognome, nome: row.lavoratore.nome } : null,
      }),
      rapporto: row.rapporto,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "it"))

  return { columns, rapportoOptions }
}

export function useChiusureBoard(): UseChiusureBoardState {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [columns, setColumns] = React.useState<ChiusureBoardColumnData[]>([])
  const [rapportoOptions, setRapportoOptions] = React.useState<Array<{ id: string; label: string; rapporto: RapportoLavorativoRecord }>>([])

  const updateCard = React.useCallback(
    (
      recordId: string,
      updater: (card: ChiusureBoardCardData) => ChiusureBoardCardData
    ) => {
      setColumns((current) =>
        current.map((column) => ({
          ...column,
          cards: column.cards.map((card) => (card.id === recordId ? updater(card) : card)),
        }))
      )
    },
    []
  )

  const moveCard = React.useCallback(
    async (recordId: string, targetStageId: string) => {
      const previous = columns

      const movingCard = columns.flatMap((column) => column.cards).find((card) => card.id === recordId)
      const licenziamentoIndex = columns.findIndex((column) => column.id === LICENZIAMENTO_STAGE_ID)
      const targetIndex = columns.findIndex((column) => column.id === targetStageId)
      const isAfterLicenziamento =
        licenziamentoIndex >= 0 && targetIndex > licenziamentoIndex

      if (movingCard && isAfterLicenziamento) {
        const missing: string[] = []
        if (!movingCard.hasAssunzioneLavoratore) missing.push("assunzione lavoratore")
        if (!movingCard.hasAssunzioneDatore) missing.push("assunzione datore")
        if (missing.length > 0) {
          toast.error(`Mancano i dati di: ${missing.join(" e ")}`)
          return
        }
      }

      setColumns((current) => {
        let movedCard: ChiusureBoardCardData | null = null

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
            ? { ...column, cards: [movedCard as ChiusureBoardCardData, ...column.cards] }
            : column
        )
      })

      try {
        await updateRecord("chiusure_contratti", recordId, {
          stato: targetStageId,
        })
      } catch (caughtError) {
        setColumns(previous)
        setError(
          caughtError instanceof Error ? caughtError.message : "Errore aggiornando stato chiusura"
        )
      }
    },
    [columns]
  )

  const createChiusura = React.useCallback(
    async (input: {
      rapportoId: string
      tipo: "licenziamento" | "dimissione" | "annullamento"
      dataFineRapporto: string
      note: string
    }) => {
      const rapportoOption =
        rapportoOptions.find((option) => option.id === input.rapportoId) ?? null
      const rapporto = rapportoOption?.rapporto ?? null
      const stage =
        input.tipo === "dimissione"
          ? "Lavoratore comunica dimissioni"
          : input.tipo === "licenziamento"
            ? "Datore comunica licenziamento"
            : "Chiusura elaborata"
      const response = await createRecord("chiusure_contratti", {
        stato: stage,
        data_fine_rapporto: input.dataFineRapporto || null,
        tipo_licenziamento:
          input.tipo === "licenziamento"
            ? "Licenziamento"
            : input.tipo === "annullamento"
              ? "Annullamento"
              : null,
        motivazione_cessazione_rapporto:
          input.tipo === "dimissione" ? "Dimissioni" : input.note || null,
        informazioni_aggiuntive: input.note || null,
      })
      const record = response.row as ChiusuraContrattoRecord
      await updateRecord("rapporti_lavorativi", input.rapportoId, {
        fine_rapporto_lavorativo_id: record.id,
      })

      const card: ChiusureBoardCardData = {
        id: record.id,
        stage,
        record,
        rapporto,
        nomeCompleto: rapportoOption?.label ?? "Rapporto non disponibile",
        email: record.email ?? "-",
        motivazione: record.motivazione_cessazione_rapporto,
        dataFineRapporto: formatItalianDate(record.data_fine_rapporto),
        tipoLabel: record.tipo_licenziamento ?? record.tipo_decesso ?? "-",
        tipoColor: null,
        hasAssunzioneDatore: false,
        hasAssunzioneLavoratore: false,
      }

      setColumns((current) =>
        current.map((column) =>
          column.id === stage ? { ...column, cards: [card, ...column.cards] } : column
        )
      )
    },
    [rapportoOptions]
  )

  const linkRapporto = React.useCallback(
    async (chiusuraId: string, rapportoId: string | null) => {
      const nextOption = rapportoId
        ? rapportoOptions.find((option) => option.id === rapportoId) ?? null
        : null
      const nextRapporto = nextOption?.rapporto ?? null

      let previousRapportoId: string | null = null
      for (const column of columns) {
        for (const card of column.cards) {
          if (card.id === chiusuraId && card.rapporto) {
            previousRapportoId = card.rapporto.id
          }
        }
      }

      const previousColumns = columns

      const fallbackNome = (card: ChiusureBoardCardData) =>
        [card.record.nome, card.record.cognome].filter(Boolean).join(" ").trim() ||
        "Nominativo non disponibile"

      setColumns((current) =>
        current.map((column) => ({
          ...column,
          cards: column.cards.map((card) => {
            if (card.id === chiusuraId) {
              return {
                ...card,
                rapporto: nextRapporto,
                nomeCompleto: nextOption ? nextOption.label : fallbackNome(card),
              }
            }
            if (rapportoId && card.rapporto?.id === rapportoId) {
              return { ...card, rapporto: null, nomeCompleto: fallbackNome(card) }
            }
            return card
          }),
        }))
      )

      try {
        if (rapportoId) {
          if (previousRapportoId && previousRapportoId !== rapportoId) {
            await updateRecord("rapporti_lavorativi", previousRapportoId, {
              fine_rapporto_lavorativo_id: null,
            })
          }
          await updateRecord("rapporti_lavorativi", rapportoId, {
            fine_rapporto_lavorativo_id: chiusuraId,
          })
        } else if (previousRapportoId) {
          await updateRecord("rapporti_lavorativi", previousRapportoId, {
            fine_rapporto_lavorativo_id: null,
          })
        }
      } catch (caughtError) {
        setColumns(previousColumns)
        setError(
          caughtError instanceof Error ? caughtError.message : "Errore collegando rapporto"
        )
        throw caughtError
      }
    },
    [columns, rapportoOptions]
  )

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchChiusureBoardData()
        if (cancelled) return
        setColumns(data.columns)
        setRapportoOptions(data.rapportoOptions)
      } catch (caughtError) {
        if (cancelled) return
        setError(
          caughtError instanceof Error ? caughtError.message : "Errore caricamento chiusure"
        )
        setColumns([])
        setRapportoOptions([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  // Silent background refresh used by realtime: no spinner, keep current data on error.
  const reloadSilently = React.useCallback(async () => {
    clearReadCaches()
    try {
      const data = await fetchChiusureBoardData()
      setColumns(data.columns)
      setRapportoOptions(data.rapportoOptions)
    } catch {
      // Ignore: a failed background refresh must not blank the board.
    }
  }, [])

  useRealtimeBoardSync({
    tables: CHIUSURE_REALTIME_TABLES,
    reload: reloadSilently,
  })

  return {
    loading,
    error,
    columns,
    rapportoOptions,
    createChiusura,
    linkRapporto,
    moveCard,
    updateCard,
  }
}
