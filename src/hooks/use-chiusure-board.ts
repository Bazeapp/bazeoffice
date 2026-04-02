import * as React from "react"

import { fetchChiusureContratti, fetchLookupValues, updateRecord } from "@/lib/anagrafiche-api"
import type { ChiusuraContrattoRecord, LookupValueRecord } from "@/types"

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
  nomeCompleto: string
  email: string
  motivazione: string | null
  dataFineRapporto: string
  tipoLabel: string
  tipoColor: string | null
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
  moveCard: (recordId: string, targetStageId: string) => Promise<void>
}

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

async function fetchChiusureBoardData(): Promise<ChiusureBoardColumnData[]> {
  const [chiusureResult, lookupResult] = await Promise.all([
    fetchChiusureContratti({
      limit: 1000,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
    }),
    fetchLookupValues(),
  ])

  const stageMetadata = buildStageMetadata(lookupResult.rows)
  const tipoMetadata = buildTipoMetadata(lookupResult.rows)
  const stages = stageMetadata.definitions
  const aliases = stageMetadata.aliases
  const cardsByStage = new Map<string, ChiusureBoardCardData[]>(
    stages.map((stage) => [stage.id, []])
  )

  for (const record of chiusureResult.rows) {
    const stage = aliases.get(normalizeToken(record.stato))
    if (!stage) continue

    const nomeCompleto = [record.nome, record.cognome].filter(Boolean).join(" ").trim() || "Nominativo non disponibile"
    const rawTipo = record.tipo_licenziamento ?? record.tipo_decesso ?? "-"
    const normalizedTipo = normalizeToken(rawTipo)

    const card: ChiusureBoardCardData = {
      id: record.id,
      stage,
      record,
      nomeCompleto,
      email: record.email ?? "-",
      motivazione: record.motivazione_cessazione_rapporto,
      dataFineRapporto: formatItalianDate(record.data_fine_rapporto),
      tipoLabel: tipoMetadata.labels.get(normalizedTipo) ?? rawTipo,
      tipoColor: tipoMetadata.colors.get(normalizedTipo) ?? null,
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

export function useChiusureBoard(): UseChiusureBoardState {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [columns, setColumns] = React.useState<ChiusureBoardColumnData[]>([])

  const moveCard = React.useCallback(
    async (recordId: string, targetStageId: string) => {
      const previous = columns

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

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchChiusureBoardData()
        if (cancelled) return
        setColumns(data)
      } catch (caughtError) {
        if (cancelled) return
        setError(
          caughtError instanceof Error ? caughtError.message : "Errore caricamento chiusure"
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
  }
}
