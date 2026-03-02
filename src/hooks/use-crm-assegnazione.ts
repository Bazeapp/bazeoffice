import * as React from "react"

import {
  fetchFamiglie,
  fetchLookupValues,
  fetchProcessiMatching,
  updateRecord,
} from "@/lib/anagrafiche-api"
import type { LookupValueRecord } from "@/types"

type GenericRow = Record<string, unknown>
type LookupColorMap = Record<string, Record<string, string>>
type LookupLabelMap = Record<string, Record<string, string>>

export type AssegnazioneCardData = {
  id: string
  nomeFamiglia: string
  email: string
  telefono: string
  dataLead: string
  deadline: string
  zona: string
  tipoLavoroBadge: string | null
  tipoLavoroColor: string | null
  tipoRapportoBadge: string | null
  tipoRapportoColor: string | null
  dataAssegnazione: string | null
}

type UseCrmAssegnazioneState = {
  loading: boolean
  error: string | null
  cards: AssegnazioneCardData[]
  assignCardToDate: (processId: string, date: string | null) => Promise<void>
}

function asRowArray(input: unknown): GenericRow[] {
  if (!Array.isArray(input)) return []
  return input.filter(
    (item): item is GenericRow => Boolean(item) && typeof item === "object"
  )
}

function toStringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized ? normalized : null
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return null
}

function normalizeToken(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
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

function formatItalianDate(value: unknown): string {
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

function toIsoDate(value: unknown): string | null {
  const raw = toStringValue(value)
  if (!raw) return null
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

function readLookupColor(metadata: LookupValueRecord["metadata"]) {
  if (!metadata || typeof metadata !== "object") return null
  const color = metadata.color
  return typeof color === "string" && color.trim() ? color.trim() : null
}

function buildLookupColorMap(rows: LookupValueRecord[]): LookupColorMap {
  return rows.reduce<LookupColorMap>((acc, current) => {
    if (!current.is_active) return acc
    const color = readLookupColor(current.metadata)
    if (!color) return acc

    const domain = `${current.entity_table}.${current.entity_field}`
    if (!acc[domain]) acc[domain] = {}

    acc[domain][normalizeToken(current.value_key)] = color
    acc[domain][normalizeToken(current.value_label)] = color
    return acc
  }, {})
}

function buildLookupLabelMap(rows: LookupValueRecord[]): LookupLabelMap {
  return rows.reduce<LookupLabelMap>((acc, current) => {
    if (!current.is_active) return acc
    const key = toStringValue(current.value_key)
    const label = toStringValue(current.value_label)
    if (!key || !label) return acc

    const domain = `${current.entity_table}.${current.entity_field}`
    if (!acc[domain]) acc[domain] = {}
    acc[domain][normalizeToken(key)] = label
    acc[domain][normalizeToken(label)] = label
    return acc
  }, {})
}

function resolveColor(
  lookupColors: LookupColorMap,
  entityTable: string,
  entityField: string,
  value: string | null
) {
  if (!value) return null
  const domain = `${entityTable}.${entityField}`
  return lookupColors[domain]?.[normalizeToken(value)] ?? null
}

function isDaAssegnare(value: unknown) {
  const token = normalizeToken(value).replaceAll("_", " ")
  return token === "da assegnare"
}

async function fetchAssegnazioneCards(): Promise<AssegnazioneCardData[]> {
  const [processesResult, familiesResult, lookupResult] = await Promise.all([
    fetchProcessiMatching({
      limit: 500,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
    }),
    fetchFamiglie({
      limit: 500,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
    }),
    fetchLookupValues(),
  ])

  const processRows = asRowArray(processesResult.rows)
  const familyRows = asRowArray(familiesResult.rows)
  const lookupRows = lookupResult.rows

  const lookupColors = buildLookupColorMap(lookupRows)
  const lookupLabels = buildLookupLabelMap(lookupRows)
  const statoResLabels = lookupLabels["processi_matching.stato_res"] ?? {}

  const familyById = new Map<string, GenericRow>()
  for (const family of familyRows) {
    const id = toStringValue(family.id)
    if (!id) continue
    familyById.set(id, family)
  }

  const cards: AssegnazioneCardData[] = []

  for (const process of processRows) {
    const statusRaw = toStringValue(process.stato_res)
    const statusLabel =
      statoResLabels[normalizeToken(statusRaw)] ?? statusRaw ?? ""
    if (!isDaAssegnare(statusLabel)) continue

    const famigliaId = toStringValue(process.famiglia_id)
    if (!famigliaId) continue

    const family = familyById.get(famigliaId)
    if (!family) continue

    const id = toStringValue(process.id)
    if (!id) continue

    const nomeFamiglia = [toStringValue(family.nome), toStringValue(family.cognome)]
      .filter((value): value is string => Boolean(value))
      .join(" ")

    const tipoLavoroBadge = getFirstArrayValue(process.tipo_lavoro)
    const tipoRapportoBadge = getFirstArrayValue(process.tipo_rapporto)

    cards.push({
      id,
      nomeFamiglia: nomeFamiglia || "-",
      email: toStringValue(family.email) ?? "-",
      telefono: toStringValue(family.telefono) ?? "-",
      dataLead: formatItalianDate(family.creato_il),
      deadline: formatItalianDate(process.data_limite_invio_selezione),
      zona: toStringValue(process.luogo_id) ?? "-",
      tipoLavoroBadge,
      tipoLavoroColor: resolveColor(
        lookupColors,
        "processi_matching",
        "tipo_lavoro",
        tipoLavoroBadge
      ),
      tipoRapportoBadge,
      tipoRapportoColor: resolveColor(
        lookupColors,
        "processi_matching",
        "tipo_rapporto",
        tipoRapportoBadge
      ),
      dataAssegnazione: toIsoDate(process.data_assegnazione),
    })
  }

  return cards
}

export function useCrmAssegnazione(): UseCrmAssegnazioneState {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [cards, setCards] = React.useState<AssegnazioneCardData[]>([])

  const assignCardToDate = React.useCallback(
    async (processId: string, date: string | null) => {
      const previous = cards
      setCards((current) =>
        current.map((card) =>
          card.id === processId ? { ...card, dataAssegnazione: date } : card
        )
      )

      try {
        await updateRecord("processi_matching", processId, {
          data_assegnazione: date,
        })
      } catch (caughtError) {
        setCards(previous)
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando assegnazione ricerca"
        setError(message)
      }
    },
    [cards]
  )

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchAssegnazioneCards()
        if (cancelled) return
        setCards(data)
      } catch (caughtError) {
        if (cancelled) return
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore caricamento assegnazione"
        setError(message)
        setCards([])
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
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
    cards,
    assignCardToDate,
  }
}
