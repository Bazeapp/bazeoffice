import { toAvatarUrl } from "@/modules/lavoratori/lib"
import { resolveLookupColor } from "@/lib/lookup-utils"
import { formatAssunzioneName, getRapportoProcessIds } from "@/modules/rapporti/lib"
import type { RapportoAssunzioneNames } from "@/modules/gestione-contrattuale/types"
import { normalizeComparableToken, toStringValue } from "@/lib/value-utils"
import type {
  FamigliaRecord,
  LavoratoreRecord,
  ProcessoMatchingRecord,
  RapportoLavorativoRecord,
} from "@/types"

import {
  getCalendarDateKey,
  getCalendarEventTone,
  hasDateOnly,
  toDateRangeValue,
} from "./colloqui-calendar-utils"
import type { ColloquioCalendarEvent, LookupOption, ProvaCardData, ProvaColumnData } from "../types"

export const TRIAL_STATUS_DOMAIN = "rapporti_lavorativi.prova_stato_cs"

function formatColloquioPersonName(row: FamigliaRecord | LavoratoreRecord | null | undefined) {
  if (!row) return null
  const first = toStringValue(row.nome)
  const last = toStringValue(row.cognome)
  return [first, last].filter(Boolean).join(" ").trim() || null
}

function getProveColloquioFamilyLabel(
  rapporto: RapportoLavorativoRecord,
  famiglia: FamigliaRecord | null,
  assunzioneDatore?: RapportoAssunzioneNames["datore"],
) {
  return (
    formatAssunzioneName(assunzioneDatore) ??
    formatColloquioPersonName(famiglia) ??
    toStringValue(rapporto.cognome_nome_datore_proper) ??
    "Famiglia"
  )
}

function getProveColloquioWorkerLabel(
  rapporto: RapportoLavorativoRecord,
  lavoratore: LavoratoreRecord | null,
  assunzioneLavoratore?: RapportoAssunzioneNames["lavoratore"],
) {
  return (
    formatAssunzioneName(assunzioneLavoratore) ??
    formatColloquioPersonName(lavoratore) ??
    toStringValue(rapporto.nome_lavoratore_per_url) ??
    "Lavoratore"
  )
}

export function normalizeProveColloquiStatusToken(value: unknown) {
  return normalizeComparableToken(String(value ?? ""))
}

export function getDefaultProveColloquiCalendarRange() {
  const today = new Date()
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1))
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 2, 0))
  return {
    start: toDateRangeValue(start),
    end: toDateRangeValue(end),
  }
}

export function buildProvaCard(
  rapporto: RapportoLavorativoRecord,
  famiglia: FamigliaRecord | null,
  lavoratore: LavoratoreRecord | null,
  assunzioneNames: RapportoAssunzioneNames | null = null,
): ProvaCardData {
  const famigliaLabel = getProveColloquioFamilyLabel(rapporto, famiglia, assunzioneNames?.datore)
  const lavoratoreLabel = getProveColloquioWorkerLabel(rapporto, lavoratore, assunzioneNames?.lavoratore)

  return {
    id: rapporto.id,
    rapporto,
    famiglia,
    lavoratore,
    title: `${famigliaLabel} — ${lavoratoreLabel}`,
    famigliaLabel,
    lavoratoreLabel,
    workerAvatarUrl: lavoratore ? toAvatarUrl(lavoratore) : null,
  }
}

export function getProvaDedupKeys(card: ProvaCardData) {
  const dateKey = getCalendarDateKey(card.rapporto.data_inizio_rapporto)
  const workerId = toStringValue(card.rapporto.lavoratore_id) ?? toStringValue(card.lavoratore?.id)
  if (!dateKey || !workerId) return []

  const keys = getRapportoProcessIds(card.rapporto).map(
    (processId) => `process:${processId}:worker:${workerId}:date:${dateKey}`,
  )
  const familyId = toStringValue(card.rapporto.famiglia_id) ?? toStringValue(card.famiglia?.id)
  if (familyId) {
    keys.push(`family:${familyId}:worker:${workerId}:date:${dateKey}`)
  }

  return keys
}

export function getColloquioDedupKeys(event: Extract<ColloquioCalendarEvent, { type: "colloquio" }>) {
  const dateKey = getCalendarDateKey(event.start)
  const workerId = toStringValue(event.selection.lavoratore_id) ?? toStringValue(event.lavoratore?.id)
  if (!dateKey || !workerId) return []

  const keys: string[] = []
  const processId = toStringValue(event.selection.processo_matching_id) ?? toStringValue(event.process?.id)
  if (processId) {
    keys.push(`process:${processId}:worker:${workerId}:date:${dateKey}`)
  }
  const familyId = toStringValue(event.process?.famiglia_id) ?? toStringValue(event.famiglia?.id)
  if (familyId) {
    keys.push(`family:${familyId}:worker:${workerId}:date:${dateKey}`)
  }

  return keys
}

export function buildProvaColumns(
  cards: ProvaCardData[],
  statusOptions: LookupOption[],
  colorsByDomain: Map<string, string>,
): ProvaColumnData[] {
  const columns = statusOptions.map((status) => {
    const statusToken = normalizeProveColloquiStatusToken(status.value || status.label)
    const columnCards = cards.filter(
      (card) => normalizeProveColloquiStatusToken(card.rapporto.prova_stato_cs) === statusToken,
    )
    const color =
      resolveLookupColor(colorsByDomain, TRIAL_STATUS_DOMAIN, status.value) ??
      resolveLookupColor(colorsByDomain, TRIAL_STATUS_DOMAIN, status.label) ??
      null

    return {
      id: status.value,
      label: status.label,
      color,
      cards: columnCards,
      totalCount: columnCards.length,
    }
  })

  const knownStatusTokens = new Set(
    statusOptions.map((option) => normalizeProveColloquiStatusToken(option.value || option.label)),
  )
  const adHocStatuses = Array.from(
    new Set(
      cards
        .map((card) => card.rapporto.prova_stato_cs)
        .filter(
          (status): status is string =>
            Boolean(status && !knownStatusTokens.has(normalizeProveColloquiStatusToken(status))),
        ),
    ),
  )
  const dynamicColumns = adHocStatuses.map((status) => {
    const columnCards = cards.filter(
      (card) => normalizeProveColloquiStatusToken(card.rapporto.prova_stato_cs) === normalizeProveColloquiStatusToken(status),
    )
    return {
      id: status,
      label: status,
      color: resolveLookupColor(colorsByDomain, TRIAL_STATUS_DOMAIN, status),
      cards: columnCards,
      totalCount: columnCards.length,
    }
  })

  return [...columns, ...dynamicColumns]
}

export function buildColloquioCalendarEvents(input: {
  selections: Array<Record<string, unknown>>
  processesById: Map<string, ProcessoMatchingRecord>
  selectionWorkersById: Map<string, LavoratoreRecord>
  processFamiliesById: Map<string, FamigliaRecord>
}): Array<Extract<ColloquioCalendarEvent, { type: "colloquio" }>> {
  const { selections, processesById, selectionWorkersById, processFamiliesById } = input

  return selections
    .map((selection) => {
      const start = toStringValue(selection.data_ora_colloquio_famiglia_lavoratore)
      const processId = toStringValue(selection.processo_matching_id)
      const workerId = toStringValue(selection.lavoratore_id)
      const process = processId ? processesById.get(processId) ?? null : null
      const famiglia = process?.famiglia_id ? processFamiliesById.get(process.famiglia_id) ?? null : null
      const lavoratore = workerId ? selectionWorkersById.get(workerId) ?? null : null
      if (!start) return null

      const familyLabel = formatColloquioPersonName(famiglia) ?? "Famiglia"
      const workerLabel = formatColloquioPersonName(lavoratore) ?? "Lavoratore"
      const status = toStringValue(selection.stato_selezione) ?? process?.stato_res ?? null

      return {
        id: `colloquio-${toStringValue(selection.id) ?? start}`,
        type: "colloquio" as const,
        title: `${familyLabel} · ${workerLabel}`,
        start,
        allDay: hasDateOnly(start),
        selection,
        process,
        famiglia,
        lavoratore,
        workerAvatarUrl: lavoratore ? toAvatarUrl(lavoratore) : null,
        status,
        tone: getCalendarEventTone(status, start),
      }
    })
    .filter((event): event is Extract<ColloquioCalendarEvent, { type: "colloquio" }> => event !== null)
}

export function buildProvaCalendarEvents(
  cards: ProvaCardData[],
): Array<Extract<ColloquioCalendarEvent, { type: "prova" }>> {
  return cards
    .filter((card) => Boolean(card.rapporto.data_inizio_rapporto))
    .map((card) => {
      const start = card.rapporto.data_inizio_rapporto ?? ""
      const status = card.rapporto.prova_stato_cs
      return {
        id: `prova-${card.id}`,
        type: "prova" as const,
        title: card.title,
        start,
        allDay: true,
        card,
        status,
        tone: getCalendarEventTone(status, start),
      }
    })
}

export function mergeProveColloquiCalendarEvents(
  colloquioEvents: Array<Extract<ColloquioCalendarEvent, { type: "colloquio" }>>,
  provaEvents: Array<Extract<ColloquioCalendarEvent, { type: "prova" }>>,
): ColloquioCalendarEvent[] {
  const provaDedupKeys = new Set(provaEvents.flatMap((event) => getProvaDedupKeys(event.card)))
  const dedupedColloquioEvents = colloquioEvents.filter((event) => {
    const keys = getColloquioDedupKeys(event)
    return !keys.some((key) => provaDedupKeys.has(key))
  })

  return [...dedupedColloquioEvents, ...provaEvents]
}
