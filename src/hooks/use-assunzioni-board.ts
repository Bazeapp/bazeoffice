import * as React from "react"

import {
  fetchFamiglie,
  fetchLookupValues,
  fetchProcessiMatching,
  fetchRapportiLavorativi,
  fetchLavoratori,
  updateRecord,
} from "@/lib/anagrafiche-api"
import type {
  FamigliaRecord,
  LookupValueRecord,
  LavoratoreRecord,
  ProcessoMatchingRecord,
  RapportoLavorativoRecord,
} from "@/types"

type AssunzioniStageDefinition = {
  id: string
  label: string
  color: string
}

export type AssunzioniBoardCardData = {
  id: string
  processId: string | null
  stage: string
  process: ProcessoMatchingRecord | null
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
}

type UseAssunzioniBoardState = {
  loading: boolean
  error: string | null
  columns: AssunzioniBoardColumnData[]
  moveCard: (rapportoId: string, targetStageId: string) => Promise<void>
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

function getFirstArrayValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = toStringValue(item)
      if (normalized) return normalized
    }
  }

  return toStringValue(value)
}

function parseProcessRapportoIds(value: string | null | undefined) {
  if (!value) return []

  return value
    .split(/[,\n;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
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

async function fetchAssunzioniBoardData(): Promise<AssunzioniBoardColumnData[]> {
  const [processesResult, familiesResult, rapportiResult, lavoratoriResult, lookupResult] =
    await Promise.all([
    fetchProcessiMatching({
      limit: 1000,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
    }),
    fetchFamiglie({
      limit: 1000,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
    }),
    fetchRapportiLavorativi({
      limit: 1000,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
    }),
    fetchLavoratori({
      limit: 1000,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
    }),
    fetchLookupValues(),
  ])

  const familiesById = new Map(
    (familiesResult.rows as FamigliaRecord[]).map((family) => [family.id, family] as const)
  )
  const lavoratoriById = new Map(
    (lavoratoriResult.rows as LavoratoreRecord[]).map((worker) => [worker.id, worker] as const)
  )
  const processById = new Map(
    processesResult.rows.map((process) => [process.id, process] as const)
  )

  const stageMetadata = buildStageMetadata(lookupResult.rows)
  const stages = stageMetadata.definitions
  const aliases = stageMetadata.aliases
  const cardsByStage = new Map<string, AssunzioniBoardCardData[]>(
    stages.map((stage) => [stage.id, []])
  )

  for (const linkedRapporto of rapportiResult.rows) {
    const processStage = aliases.get(normalizeToken(linkedRapporto.stato_assunzione))
    if (!processStage) continue

    const process =
      (linkedRapporto.processo_res ?? [])
        .map((processId) => processById.get(processId) ?? null)
        .find((record): record is ProcessoMatchingRecord => Boolean(record)) ??
      parseProcessRapportoIds(linkedRapporto.id_rapporto)
        .map((processId) => processById.get(processId) ?? null)
        .find((record): record is ProcessoMatchingRecord => Boolean(record)) ??
      null
    const family =
      (linkedRapporto?.famiglia_id ? familiesById.get(linkedRapporto.famiglia_id) ?? null : null) ??
      (process?.famiglia_id ? familiesById.get(process.famiglia_id) ?? null : null)
    const lavoratore =
      linkedRapporto?.lavoratore_id ? lavoratoriById.get(linkedRapporto.lavoratore_id) ?? null : null
    const nomeFamiglia = family
      ? [family.nome, family.cognome].filter(Boolean).join(" ").trim()
      : linkedRapporto?.cognome_nome_datore_proper || "Famiglia non trovata"
    const nomeLavoratore = lavoratore
      ? [lavoratore.nome, lavoratore.cognome].filter(Boolean).join(" ").trim()
      : linkedRapporto?.nome_lavoratore_per_url || "Lavoratore non associato"

    const card: AssunzioniBoardCardData = {
      id: linkedRapporto.id,
      processId: process?.id ?? null,
      stage: processStage,
      process,
      rapporto: linkedRapporto,
      lavoratore,
      famiglia: family,
      famigliaId: family?.id ?? process?.famiglia_id ?? null,
      nomeFamiglia: nomeFamiglia || "Famiglia non trovata",
      nomeLavoratore,
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
  }))
}

export function useAssunzioniBoard(): UseAssunzioniBoardState {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [columns, setColumns] = React.useState<AssunzioniBoardColumnData[]>([])

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

  return {
    loading,
    error,
    columns,
    moveCard,
  }
}
