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
  famigliaId: string
  nomeFamiglia: string
  email: string
  telefono: string
  dataLead: string
  deadlineMobile: string
  deadlineSales: string
  zona: string
  tipoLavoroBadge: string | null
  tipoLavoroColor: string | null
  tipoRapportoBadge: string | null
  tipoRapportoColor: string | null
  dataAssegnazione: string | null
  recruiterId: string | null
  statoRes: "da_assegnare" | "fare_ricerca"
  statoResLabel: string
  oreSettimanali: string
  giorniSettimanali: string
  orarioDiLavoro: string
  tipoRicerca: "nuova" | "sostituzione"
  overview: string
}

type UseCrmAssegnazioneState = {
  loading: boolean
  error: string | null
  cards: AssegnazioneCardData[]
  assignCardToDate: (
    processId: string,
    date: string | null
  ) => Promise<void>
  patchCard: (processId: string, patch: Record<string, unknown>) => Promise<void>
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

function resolveLabel(
  lookupLabels: LookupLabelMap,
  entityTable: string,
  entityField: string,
  value: string | null
) {
  if (!value) return null
  const domain = `${entityTable}.${entityField}`
  return lookupLabels[domain]?.[normalizeToken(value)] ?? value
}

function toAssegnazioneStatus(
  rawStatus: string | null
): "da_assegnare" | "fare_ricerca" | null {
  if (rawStatus === "fare ricerca") return "fare_ricerca"
  if (rawStatus === "da assegnare") return "da_assegnare"
  return null
}

function toReadableStatusLabel(status: "da_assegnare" | "fare_ricerca") {
  return status === "fare_ricerca" ? "Fare ricerca" : "Da assegnare"
}

function toAssegnazioneStatusPatch(
  status: "da_assegnare" | "fare_ricerca"
) {
  return status === "fare_ricerca" ? "fare ricerca" : "da assegnare"
}

function toNumberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function extractFirstNumberToken(value: unknown) {
  const raw = toStringValue(value)
  if (!raw) return null
  const match = raw.match(/\d+(?:[.,]\d+)?/)
  return match?.[0] ?? null
}

async function fetchAssegnazioneCards(): Promise<AssegnazioneCardData[]> {
  const [processesResult, familiesResult, lookupResult] = await Promise.all([
    fetchProcessiMatching({
      limit: 500,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
      filters: {
        kind: "group",
        id: "crm-assegnazione-status-root",
        logic: "or",
        nodes: [
          {
            kind: "condition",
            id: "crm-assegnazione-status-da-assegnare-label",
            field: "stato_res",
            operator: "is",
            value: "da assegnare",
          },
          {
            kind: "condition",
            id: "crm-assegnazione-status-fare-ricerca-label",
            field: "stato_res",
            operator: "is",
            value: "fare ricerca",
          },
        ],
      },
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

  const familyById = new Map<string, GenericRow>()
  for (const family of familyRows) {
    const id = toStringValue(family.id)
    if (!id) continue
    familyById.set(id, family)
  }

  const cards: AssegnazioneCardData[] = []

  for (const process of processRows) {
    const famigliaId = toStringValue(process.famiglia_id)
    if (!famigliaId) continue

    const family = familyById.get(famigliaId)
    if (!family) continue

    const id = toStringValue(process.id)
    if (!id) continue

    const nomeFamiglia = [toStringValue(family.nome), toStringValue(family.cognome)]
      .filter((value): value is string => Boolean(value))
      .join(" ")

    const rawTipoLavoro = getFirstArrayValue(process.tipo_lavoro)
    const rawTipoRapporto = getFirstArrayValue(process.tipo_rapporto)
    const tipoLavoroBadge = resolveLabel(
      lookupLabels,
      "processi_matching",
      "tipo_lavoro",
      rawTipoLavoro
    )
    const tipoRapportoBadge = resolveLabel(
      lookupLabels,
      "processi_matching",
      "tipo_rapporto",
      rawTipoRapporto
    )
    const rawDataAssegnazione = toIsoDate(process.data_assegnazione)
    const statoRes = toAssegnazioneStatus(toStringValue(process.stato_res))
    if (!statoRes) continue

    if (statoRes === "da_assegnare" && rawDataAssegnazione) continue
    if (statoRes === "fare_ricerca" && !rawDataAssegnazione) continue

    const dataAssegnazione =
      statoRes === "da_assegnare" ? null : rawDataAssegnazione
    const statoResLabel = toReadableStatusLabel(statoRes)

    const numeroRicercaAttivata = toNumberValue(process.numero_ricerca_attivata)
    const tipoRicerca: "nuova" | "sostituzione" =
      (numeroRicercaAttivata ?? 1) > 1 ? "sostituzione" : "nuova"

    cards.push({
      id,
      famigliaId,
      nomeFamiglia: nomeFamiglia || "-",
      email: toStringValue(family.email) ?? "-",
      telefono: toStringValue(family.telefono) ?? "-",
      dataLead: formatItalianDate(family.creato_il),
      deadlineMobile: formatItalianDate(
        process.deadline_mobile ?? process.data_limite_invio_selezione
      ),
      deadlineSales: formatItalianDate(
        process.deadline_mobile ?? process.data_limite_invio_selezione
      ),
      zona: toStringValue(process.luogo_id) ?? "-",
      tipoLavoroBadge,
      tipoLavoroColor: resolveColor(
        lookupColors,
        "processi_matching",
        "tipo_lavoro",
        rawTipoLavoro
      ),
      tipoRapportoBadge,
      tipoRapportoColor: resolveColor(
        lookupColors,
        "processi_matching",
        "tipo_rapporto",
        rawTipoRapporto
      ),
      dataAssegnazione,
      recruiterId: toStringValue(process.recruiter_ricerca_e_selezione_id),
      statoRes,
      statoResLabel,
      oreSettimanali: toStringValue(process.ore_settimanale) ?? "-",
      giorniSettimanali:
        toStringValue(process.numero_giorni_settimanali) ??
        extractFirstNumberToken(process.frequenza_rapporto) ??
        "-",
      orarioDiLavoro: toStringValue(process.orario_di_lavoro) ?? "-",
      tipoRicerca,
      overview:
        toStringValue(process.mansioni_richieste) ??
        toStringValue(process.descrizione_lavoratore_ideale) ??
        "-",
    })
  }

  return cards
}

export function useCrmAssegnazione(): UseCrmAssegnazioneState {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [cards, setCards] = React.useState<AssegnazioneCardData[]>([])

  const patchCard = React.useCallback(
    async (processId: string, patch: Record<string, unknown>) => {
      let patchedStatus: "da_assegnare" | "fare_ricerca" | null = null

      if ("stato_res" in patch) {
        patchedStatus = toAssegnazioneStatus(toStringValue(patch.stato_res))
        if (!patchedStatus) {
          throw new Error("Stato assegnazione non valido")
        }
      }

      const previous = cards

      setCards((current) =>
        current.map((card) => {
          if (card.id !== processId) return card

          const nextCard = { ...card }

          if (patchedStatus) {
            nextCard.statoRes = patchedStatus
            nextCard.statoResLabel = toReadableStatusLabel(patchedStatus)
            if (patchedStatus === "da_assegnare") {
              nextCard.dataAssegnazione = null
            }
          }
          if ("data_assegnazione" in patch) {
            nextCard.dataAssegnazione =
              nextCard.statoRes === "da_assegnare"
                ? null
                : toIsoDate(patch.data_assegnazione)
          }
          if ("recruiter_ricerca_e_selezione_id" in patch) {
            nextCard.recruiterId = toStringValue(patch.recruiter_ricerca_e_selezione_id)
          }
          if ("deadline_mobile" in patch) {
            const nextDeadline = patch.deadline_mobile ?? patch.data_limite_invio_selezione
            nextCard.deadlineMobile = formatItalianDate(nextDeadline)
            nextCard.deadlineSales = formatItalianDate(nextDeadline)
          }
          if ("data_limite_invio_selezione" in patch && !("deadline_mobile" in patch)) {
            nextCard.deadlineMobile = formatItalianDate(patch.data_limite_invio_selezione)
            nextCard.deadlineSales = formatItalianDate(patch.data_limite_invio_selezione)
          }
          if ("ore_settimanale" in patch) {
            nextCard.oreSettimanali = toStringValue(patch.ore_settimanale) ?? "-"
          }
          if ("numero_giorni_settimanali" in patch) {
            nextCard.giorniSettimanali =
              toStringValue(patch.numero_giorni_settimanali) ??
              extractFirstNumberToken(patch.frequenza_rapporto) ??
              "-"
          }
          if ("frequenza_rapporto" in patch && nextCard.giorniSettimanali === "-") {
            nextCard.giorniSettimanali =
              extractFirstNumberToken(patch.frequenza_rapporto) ?? "-"
          }
          if ("orario_di_lavoro" in patch) {
            nextCard.orarioDiLavoro = toStringValue(patch.orario_di_lavoro) ?? "-"
          }
          if ("luogo_id" in patch) {
            nextCard.zona = toStringValue(patch.luogo_id) ?? "-"
          }
          if ("mansioni_richieste" in patch) {
            nextCard.overview = toStringValue(patch.mansioni_richieste) ?? "-"
          } else if ("descrizione_lavoratore_ideale" in patch) {
            nextCard.overview =
              toStringValue(patch.descrizione_lavoratore_ideale) ?? "-"
          }

          return nextCard
        })
      )

      try {
        await updateRecord("processi_matching", processId, patch)
      } catch (caughtError) {
        setCards(previous)
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando ricerca in assegnazione"
        setError(message)
        throw caughtError
      }
    },
    [cards]
  )

  const assignCardToDate = React.useCallback(
    async (processId: string, date: string | null) => {
      const nextStatus = date ? "fare_ricerca" : "da_assegnare"
      await patchCard(processId, {
        data_assegnazione: date,
        stato_res: toAssegnazioneStatusPatch(nextStatus),
      })
    },
    [patchCard]
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
    patchCard,
  }
}
