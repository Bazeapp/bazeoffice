import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { usePatchMutation } from "@/hooks/use-board-mutations"

import {
  fetchFamiglie,
  fetchLookupValues,
  fetchProcessiMatching,
  updateRecord,
} from "@/lib/anagrafiche-api"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import type { LookupValueRecord } from "@/types"

const ASSEGNAZIONE_REALTIME_TABLES = ["processi_matching", "famiglie"]

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
  zonaQuartiere: string | null
  zonaCap: string | null
  zonaComune: string | null
  tipoLavoroBadges?: string[]
  tipoLavoroColors?: Record<string, string | null>
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

const ASSEGNAZIONE_QUERY_LIMIT = 5000

const ASSEGNAZIONE_PROCESSI_SELECT = [
  "id",
  "famiglia_id",
  "stato_res",
  "data_assegnazione",
  "deadline_mobile",
  "data_limite_invio_selezione",
  "luogo_id",
  "indirizzo_prova_note",
  "indirizzo_prova_cap",
  "indirizzo_prova_comune",
  "tipo_lavoro",
  "tipo_rapporto",
  "numero_ricerca_attivata",
  "recruiter_ricerca_e_selezione_id",
  "ore_settimanale",
  "numero_giorni_settimanali",
  "frequenza_rapporto",
  "orario_di_lavoro",
  "mansioni_richieste",
  "descrizione_lavoratore_ideale",
  "aggiornato_il",
]

const ASSEGNAZIONE_FAMIGLIE_SELECT = [
  "id",
  "nome",
  "cognome",
  "email",
  "telefono",
  "creato_il",
  "aggiornato_il",
]

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

function getStringArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toStringValue(item))
      .filter((item): item is string => Boolean(item))
  }

  const single = toStringValue(value)
  return single ? [single] : []
}

function formatItalianDate(value: unknown): string {
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
  const normalizedStatus = rawStatus?.replace(/_/g, " ")
  if (normalizedStatus === "fare ricerca") return "fare_ricerca"
  if (normalizedStatus === "da assegnare") return "da_assegnare"
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

function formatAssegnazioneZona(process: GenericRow) {
  const quartiere = toStringValue(process.indirizzo_prova_note)
  const comune = toStringValue(process.indirizzo_prova_comune)
  const cap = toStringValue(process.indirizzo_prova_cap)

  if (quartiere && comune) return `${comune} · ${quartiere}`
  if (quartiere) return quartiere
  if (comune && cap) return `${comune} · ${cap}`
  if (cap) return cap

  return "-"
}

async function fetchAssegnazioneCards(): Promise<AssegnazioneCardData[]> {
  const [processesResult, lookupResult] = await Promise.all([
    fetchProcessiMatching({
      select: ASSEGNAZIONE_PROCESSI_SELECT,
      limit: ASSEGNAZIONE_QUERY_LIMIT,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
      filters: {
        kind: "group",
        id: "crm-assegnazione-status-root",
        logic: "and",
        nodes: [
          {
            kind: "condition",
            id: "crm-assegnazione-status-values",
            field: "stato_res",
            operator: "in",
            value: "da assegnare,fare ricerca,da_assegnare,fare_ricerca",
          },
        ],
      },
    }),
    fetchLookupValues(),
  ])

  const processRows = asRowArray(processesResult.rows)
  const famigliaIds = Array.from(
    new Set(
      processRows
        .map((process) => toStringValue(process.famiglia_id))
        .filter((id): id is string => Boolean(id))
    )
  )
  const familiesResult =
    famigliaIds.length > 0
      ? await fetchFamiglie({
          select: ASSEGNAZIONE_FAMIGLIE_SELECT,
          limit: famigliaIds.length,
          offset: 0,
          filters: {
            kind: "group",
            id: "crm-assegnazione-families-root",
            logic: "and",
            nodes: [
              {
                kind: "condition",
                id: "crm-assegnazione-family-ids",
                field: "id",
                operator: "in",
                value: famigliaIds.join(","),
              },
            ],
          },
        })
      : { rows: [] }
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

    const rawTipoLavori = getStringArrayValue(process.tipo_lavoro)
    const rawTipoLavoro = rawTipoLavori[0] ?? null
    const rawTipoRapporto = getFirstArrayValue(process.tipo_rapporto)
    const tipoLavoroBadges = rawTipoLavori
      .map((value) =>
        resolveLabel(lookupLabels, "processi_matching", "tipo_lavoro", value)
      )
      .filter((value): value is string => Boolean(value))
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

    const dataAssegnazione = rawDataAssegnazione
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
      zona: formatAssegnazioneZona(process),
      zonaQuartiere: toStringValue(process.indirizzo_prova_note),
      zonaCap: toStringValue(process.indirizzo_prova_cap),
      zonaComune: toStringValue(process.indirizzo_prova_comune),
      tipoLavoroBadges,
      tipoLavoroColors: Object.fromEntries(
        rawTipoLavori.map((rawValue, index) => [
          tipoLavoroBadges[index] ?? rawValue,
          resolveColor(
            lookupColors,
            "processi_matching",
            "tipo_lavoro",
            rawValue
          ),
        ])
      ),
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

const ASSEGNAZIONE_BOARD_QUERY_KEY = ["crm-assegnazione-board"] as const

export function useCrmAssegnazione(): UseCrmAssegnazioneState {
  const queryClient = useQueryClient()

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ASSEGNAZIONE_BOARD_QUERY_KEY,
    queryFn: fetchAssegnazioneCards,
  })

  const cards = data ?? []

  const invalidateBoard = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ASSEGNAZIONE_BOARD_QUERY_KEY })
  }, [queryClient])

  const patchMutation = usePatchMutation<
    { processId: string; patch: Record<string, unknown> },
    unknown,
    AssegnazioneCardData[]
  >({
    queryKey: ASSEGNAZIONE_BOARD_QUERY_KEY,
    mutationFn: ({ processId, patch }) =>
      updateRecord("processi_matching", processId, patch),
    applyOptimistic: (previous, { processId, patch }) => {
      if (!previous) return previous
      let patchedStatus: "da_assegnare" | "fare_ricerca" | null = null
      if ("stato_res" in patch) {
        patchedStatus = toAssegnazioneStatus(toStringValue(patch.stato_res))
        if (!patchedStatus) {
          throw new Error("Stato assegnazione non valido")
        }
      }
      return previous.map((card) => {
        if (card.id !== processId) return card

        const nextCard = { ...card }

        if (patchedStatus) {
          nextCard.statoRes = patchedStatus
          nextCard.statoResLabel = toReadableStatusLabel(patchedStatus)
        }
        if ("data_assegnazione" in patch) {
          nextCard.dataAssegnazione = toIsoDate(patch.data_assegnazione)
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
        if (
          "indirizzo_prova_note" in patch ||
          "indirizzo_prova_cap" in patch ||
          "indirizzo_prova_comune" in patch
        ) {
          if ("indirizzo_prova_note" in patch) {
            nextCard.zonaQuartiere = toStringValue(patch.indirizzo_prova_note)
          }
          if ("indirizzo_prova_cap" in patch) {
            nextCard.zonaCap = toStringValue(patch.indirizzo_prova_cap)
          }
          if ("indirizzo_prova_comune" in patch) {
            nextCard.zonaComune = toStringValue(patch.indirizzo_prova_comune)
          }
          nextCard.zona = formatAssegnazioneZona({
            indirizzo_prova_note: nextCard.zonaQuartiere,
            indirizzo_prova_cap: nextCard.zonaCap,
            indirizzo_prova_comune: nextCard.zonaComune,
          })
        }
        if ("mansioni_richieste" in patch) {
          nextCard.overview = toStringValue(patch.mansioni_richieste) ?? "-"
        } else if ("descrizione_lavoratore_ideale" in patch) {
          nextCard.overview =
            toStringValue(patch.descrizione_lavoratore_ideale) ?? "-"
        }

        return nextCard
      })
    },
  })

  const patchCard = React.useCallback(
    async (processId: string, patch: Record<string, unknown>) => {
      await patchMutation.mutateAsync({ processId, patch })
    },
    [patchMutation],
  )

  const assignCardToDate = React.useCallback(
    async (processId: string, date: string | null) => {
      const nextStatus = date ? "fare_ricerca" : "da_assegnare"
      await patchCard(processId, {
        data_assegnazione: date,
        stato_res: toAssegnazioneStatusPatch(nextStatus),
      })
    },
    [patchCard],
  )

  useRealtimeBoardSync({
    tables: ASSEGNAZIONE_REALTIME_TABLES,
    reload: invalidateBoard,
  })

  const error =
    patchMutation.error instanceof Error
      ? patchMutation.error.message
      : queryError instanceof Error
        ? queryError.message
        : null

  return {
    loading: isLoading,
    error,
    cards,
    assignCardToDate,
    patchCard,
  }
}
