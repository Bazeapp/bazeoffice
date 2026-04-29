import * as React from "react"

import {
  createRecord,
  fetchLookupValues,
  fetchRapportiLavorativi,
  fetchVariazioniContrattuali,
  updateRecord,
} from "@/lib/anagrafiche-api"
import { getRapportoTitle } from "@/features/rapporti/rapporti-labels"
import type { LookupValueRecord, RapportoLavorativoRecord, VariazioneContrattualeRecord } from "@/types"

type VariazioneStageDefinition = {
  id: string
  label: string
  color: string
}

type StageMetadata = {
  definitions: VariazioneStageDefinition[]
  aliases: Map<string, string>
}

export type VariazioniBoardCardData = {
  id: string
  stage: string
  record: VariazioneContrattualeRecord
  rapporto: RapportoLavorativoRecord | null
  nomeCompleto: string
  dataVariazione: string
  variazioneDaApplicare: string | null
}

export type VariazioniBoardColumnData = {
  id: string
  label: string
  color: string
  cards: VariazioniBoardCardData[]
}

export type VariazioniRapportoOption = {
  id: string
  label: string
  rapporto: RapportoLavorativoRecord
}

type UseVariazioniBoardState = {
  loading: boolean
  error: string | null
  columns: VariazioniBoardColumnData[]
  rapportoOptions: VariazioniRapportoOption[]
  createVariazione: (input: {
    rapportoId: string
    variazioneDaApplicare: string
    dataVariazione: string
  }) => Promise<void>
  moveCard: (recordId: string, targetStageId: string) => Promise<void>
  updateCard: (
    recordId: string,
    updater: (card: VariazioniBoardCardData) => VariazioniBoardCardData
  ) => void
}

const DEFAULT_STAGE_DEFINITIONS: VariazioneStageDefinition[] = [
  { id: "presa in carico", label: "presa in carico", color: "sky" },
  { id: "variazione effettuata", label: "variazione effettuata", color: "cyan" },
  { id: "documenti inviati", label: "documenti inviati", color: "teal" },
]

const VARIAZIONI_RAPPORTI_SELECT = [
  "id",
  "stato_assunzione",
  "stato_servizio",
  "fine_rapporto_lavorativo_id",
  "tipo_rapporto",
  "tipo_contratto",
  "ore_a_settimana",
  "paga_oraria_lorda",
  "data_inizio_rapporto",
  "cognome_nome_datore_proper",
  "nome_lavoratore_per_url",
] satisfies string[]

const VARIAZIONI_SELECT = [
  "id",
  "accordo_variazione_contrattuale",
  "rapporto_lavorativo_id",
  "ricevuta_inps_variazione_rapporto",
  "stato",
  "data_variazione",
  "variazione_da_applicare",
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
      row.entity_table === "variazioni_contrattuali" &&
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

async function fetchVariazioniBoardData(): Promise<{
  columns: VariazioniBoardColumnData[]
  rapportoOptions: VariazioniRapportoOption[]
}> {
  const [variazioniResult, rapportiResult, lookupResult] = await Promise.all([
    fetchVariazioniContrattuali({
      select: VARIAZIONI_SELECT,
      limit: 1000,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
    }),
    fetchRapportiLavorativi({
      select: VARIAZIONI_RAPPORTI_SELECT,
      limit: 1000,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
    }),
    fetchLookupValues(),
  ])

  const stageMetadata = buildStageMetadata(lookupResult.rows)
  const stages = stageMetadata.definitions
  const aliases = stageMetadata.aliases
  const cardsByStage = new Map<string, VariazioniBoardCardData[]>(
    stages.map((stage) => [stage.id, []])
  )
  const rapportoById = new Map(rapportiResult.rows.map((rapporto) => [rapporto.id, rapporto]))

  for (const record of variazioniResult.rows) {
    const stage = aliases.get(normalizeToken(record.stato))

    if (!stage) continue

    const rapporto = record.rapporto_lavorativo_id
      ? rapportoById.get(record.rapporto_lavorativo_id) ?? null
      : null
    const nomeCompleto = rapporto ? getRapportoTitle(rapporto) : "Rapporto non disponibile"

    const card: VariazioniBoardCardData = {
      id: record.id,
      stage,
      record,
      rapporto,
      nomeCompleto,
      dataVariazione: formatItalianDate(record.data_variazione),
      variazioneDaApplicare: record.variazione_da_applicare,
    }

    cardsByStage.get(stage)?.push(card)
  }

  const columns = stages.map((stage) => ({
    id: stage.id,
    label: stage.label,
    color: stage.color,
    cards: cardsByStage.get(stage.id) ?? [],
  }))

  const rapportoOptions = rapportiResult.rows
    .map((rapporto) => ({
      id: rapporto.id,
      label: getRapportoTitle(rapporto),
      rapporto,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "it"))

  return { columns, rapportoOptions }
}

export function useVariazioniBoard(): UseVariazioniBoardState {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [columns, setColumns] = React.useState<VariazioniBoardColumnData[]>([])
  const [rapportoOptions, setRapportoOptions] = React.useState<VariazioniRapportoOption[]>([])

  const updateCard = React.useCallback(
    (
      recordId: string,
      updater: (card: VariazioniBoardCardData) => VariazioniBoardCardData
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

      setColumns((current) => {
        let movedCard: VariazioniBoardCardData | null = null

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
            ? { ...column, cards: [movedCard as VariazioniBoardCardData, ...column.cards] }
            : column
        )
      })

      try {
        await updateRecord("variazioni_contrattuali", recordId, {
          stato: targetStageId,
        })
      } catch (caughtError) {
        setColumns(previous)
        setError(
          caughtError instanceof Error ? caughtError.message : "Errore aggiornando stato variazione"
        )
      }
    },
    [columns]
  )

  const createVariazione = React.useCallback(
    async (input: {
      rapportoId: string
      variazioneDaApplicare: string
      dataVariazione: string
    }) => {
      const rapporto =
        rapportoOptions.find((option) => option.id === input.rapportoId)?.rapporto ?? null
      const initialStage = DEFAULT_STAGE_DEFINITIONS[0].id
      const response = await createRecord("variazioni_contrattuali", {
        rapporto_lavorativo_id: input.rapportoId,
        variazione_da_applicare: input.variazioneDaApplicare,
        data_variazione: input.dataVariazione || null,
        stato: initialStage,
      })
      const record = response.row as VariazioneContrattualeRecord
      const card: VariazioniBoardCardData = {
        id: record.id,
        stage: record.stato ?? initialStage,
        record,
        rapporto,
        nomeCompleto: rapporto ? getRapportoTitle(rapporto) : "Rapporto non disponibile",
        dataVariazione: formatItalianDate(record.data_variazione),
        variazioneDaApplicare: record.variazione_da_applicare,
      }

      setColumns((current) =>
        current.map((column) =>
          column.id === initialStage ? { ...column, cards: [card, ...column.cards] } : column
        )
      )
    },
    [rapportoOptions]
  )

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchVariazioniBoardData()
        if (cancelled) return
        setColumns(data.columns)
        setRapportoOptions(data.rapportoOptions)
      } catch (caughtError) {
        if (cancelled) return
        setError(
          caughtError instanceof Error ? caughtError.message : "Errore caricamento variazioni"
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

  return {
    loading,
    error,
    columns,
    rapportoOptions,
    createVariazione,
    moveCard,
    updateCard,
  }
}
