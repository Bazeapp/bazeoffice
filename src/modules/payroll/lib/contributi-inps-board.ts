import { formatItalianCurrencyOrNull } from "@/lib/format-utils"
import { fetchLookupValues } from "@/lib/lookup-values"
import { fetchAssunzioniNamesByRapportoIds } from "@/modules/gestione-contrattuale/queries"
import type { RapportoAssunzioneNames } from "@/modules/gestione-contrattuale/types"
import {
  getRapportoFamilyLabel,
  getRapportoWorkerLabel,
  isRapportoAttivo,
} from "@/modules/rapporti/lib"
import { fetchRapportiLavorativiAll } from "@/modules/rapporti/queries"
import {
  normalizeComparableToken,
  readLookupColor,
  readLookupSortOrder,
  toStringValue,
} from "@/lib/value-utils"
import type {
  ContributoInpsRecord,
  LookupValueRecord,
  MeseCalendarioRecord,
  RapportoLavorativoRecord,
} from "@/types"

import { fetchContributiInpsByPeriod } from "../queries/fetch-contributi-inps-by-period"
import { fetchMesiCalendarioAll } from "../queries/fetch-mesi-calendario-all"
import type {
  ContributiStageDefinition,
  ContributoInpsBoardCardData,
  ContributoQuarterValue,
} from "../types"
import {
  formatQuarterLabel,
  getQuarterDateRange,
  getQuarterValueFromDate,
  getYearFromDate,
  parseQuarterReference,
} from "./contributi-quarter"

export const CONTRIBUTI_DEFAULT_STAGE_DEFINITIONS: ContributiStageDefinition[] = [
  { id: "Da richiedere", label: "Da richiedere", color: "sky" },
  { id: "PagoPA ricevuto", label: "PagoPA ricevuto", color: "cyan" },
  { id: "Inviato alla famiglia", label: "Inviato alla famiglia", color: "amber" },
  { id: "Pagato", label: "Pagato", color: "green" },
]

export const CONTRIBUTI_LEGACY_STAGE_ALIASES: Record<string, string> = {
  todo: "Da richiedere",
  "to do": "Da richiedere",
  inviato: "Inviato alla famiglia",
  "inviato alla famiglia": "Inviato alla famiglia",
  "inviato pagopa": "Inviato alla famiglia",
  inviati: "Inviato alla famiglia",
  pagopa: "PagoPA ricevuto",
  "pagopa ricevuto": "PagoPA ricevuto",
  pagato: "Pagato",
}

type StageMetadata = {
  definitions: ContributiStageDefinition[]
  aliases: Map<string, string>
}

type RapportoLookups = {
  byId: Map<string, RapportoLavorativoRecord>
  byExternalId: Map<string, RapportoLavorativoRecord>
}

function getStageColorFallback(value: string | null | undefined) {
  const token = normalizeComparableToken(value)
  if (!token) return "sky"
  if (token.includes("pagato")) return "green"
  if (token.includes("inviat")) return "amber"
  if (token.includes("pagopa")) return "cyan"
  if (token.includes("richied")) return "sky"
  return "sky"
}

export function buildContributiStageMetadata(rows: LookupValueRecord[]): StageMetadata {
  const lookupRows = rows.filter(
    (row) =>
      row.is_active &&
      row.entity_table === "contributi_inps" &&
      row.entity_field === "stato_contributi_inps",
  )

  if (lookupRows.length === 0) {
    const aliases = new Map<string, string>()

    for (const stage of CONTRIBUTI_DEFAULT_STAGE_DEFINITIONS) {
      aliases.set(normalizeComparableToken(stage.id), stage.id)
      aliases.set(normalizeComparableToken(stage.label), stage.id)
    }

    for (const [legacyAlias, stageId] of Object.entries(CONTRIBUTI_LEGACY_STAGE_ALIASES)) {
      aliases.set(normalizeComparableToken(legacyAlias), stageId)
    }

    return {
      definitions: CONTRIBUTI_DEFAULT_STAGE_DEFINITIONS,
      aliases,
    }
  }

  const aliases = new Map<string, string>()
  const definitionsById = new Map<
    string,
    ContributiStageDefinition & { sortOrder: number | null }
  >()

  for (const row of lookupRows) {
    const valueKey = toStringValue(row.value_key)
    const valueLabel = toStringValue(row.value_label)
    const stageId = valueKey ?? valueLabel
    if (!stageId) continue

    const normalizedStageId = normalizeComparableToken(stageId)
    const resolvedLabel = valueLabel ?? valueKey ?? stageId
    const existing = definitionsById.get(stageId)
    const nextSortOrder = readLookupSortOrder(row.sort_order)

    definitionsById.set(stageId, {
      id: stageId,
      label: resolvedLabel,
      color: readLookupColor(row.metadata) ?? existing?.color ?? getStageColorFallback(resolvedLabel),
      sortOrder: nextSortOrder ?? existing?.sortOrder ?? null,
    })

    aliases.set(normalizedStageId, stageId)
    if (valueKey) aliases.set(normalizeComparableToken(valueKey), stageId)
    if (valueLabel) aliases.set(normalizeComparableToken(valueLabel), stageId)
  }

  for (const stage of CONTRIBUTI_DEFAULT_STAGE_DEFINITIONS) {
    const resolvedId =
      aliases.get(normalizeComparableToken(stage.id)) ??
      aliases.get(normalizeComparableToken(stage.label)) ??
      null

    if (!resolvedId) continue

    aliases.set(normalizeComparableToken(stage.id), resolvedId)
    aliases.set(normalizeComparableToken(stage.label), resolvedId)
  }

  for (const [legacyAlias, stageId] of Object.entries(CONTRIBUTI_LEGACY_STAGE_ALIASES)) {
    const resolvedId =
      aliases.get(normalizeComparableToken(stageId)) ??
      aliases.get(normalizeComparableToken(legacyAlias)) ??
      null

    if (resolvedId) {
      aliases.set(normalizeComparableToken(legacyAlias), resolvedId)
    }
  }

  const definitions = Array.from(definitionsById.values())
    .sort((left, right) => {
      const leftOrder = left.sortOrder ?? Number.POSITIVE_INFINITY
      const rightOrder = right.sortOrder ?? Number.POSITIVE_INFINITY
      if (leftOrder !== rightOrder) return leftOrder - rightOrder
      return left.label.localeCompare(right.label, "it")
    })
    .map((definition) => ({
      id: definition.id,
      label: definition.label,
      color: definition.color,
    }))

  return {
    definitions: definitions.length > 0 ? definitions : CONTRIBUTI_DEFAULT_STAGE_DEFINITIONS,
    aliases,
  }
}

export function buildMesiCalendarioQuarterIndex(rows: MeseCalendarioRecord[]) {
  const byId = new Map<string, MeseCalendarioRecord>()
  const byToken = new Map<string, MeseCalendarioRecord>()

  for (const row of rows) {
    if (row.id) byId.set(row.id, row)

    const token = normalizeComparableToken(row.trimestre_id)
    if (!token) continue

    const current = byToken.get(token)
    const currentDate = current?.data_inizio ? new Date(current.data_inizio).getTime() : Number.POSITIVE_INFINITY
    const nextDate = row.data_inizio ? new Date(row.data_inizio).getTime() : Number.POSITIVE_INFINITY
    if (!current || nextDate < currentDate) {
      byToken.set(token, row)
    }
  }

  return { byId, byToken }
}

export function buildRapportoLookups(rapportiRows: RapportoLavorativoRecord[]): RapportoLookups {
  const byId = new Map(
    rapportiRows
      .map((rapporto) => {
        const key = toStringValue(rapporto.id)
        return key ? ([key, rapporto] as const) : null
      })
      .filter(Boolean) as Array<readonly [string, RapportoLavorativoRecord]>,
  )
  const byExternalId = new Map(
    rapportiRows.flatMap((rapporto) =>
      [rapporto.id_rapporto, rapporto.ticket_id]
        .map((key) => toStringValue(key))
        .filter(Boolean)
        .map((key) => [key as string, rapporto] as const),
    ),
  )

  return { byId, byExternalId }
}

export function resolveContributoRapporto(
  record: ContributoInpsRecord,
  lookups: RapportoLookups,
): RapportoLavorativoRecord | null {
  const rapportoKey = toStringValue(record.rapporto_lavorativo_id)
  const ticketKey = toStringValue(record.ticket_id)
  return rapportoKey
    ? lookups.byId.get(rapportoKey) ?? lookups.byExternalId.get(rapportoKey) ?? null
    : ticketKey
      ? lookups.byExternalId.get(ticketKey) ?? null
      : null
}

function matchesSelectedQuarter(
  record: ContributoInpsRecord,
  resolvedQuarter: MeseCalendarioRecord | null,
  selectedYear: number,
  selectedQuarter: ContributoQuarterValue,
) {
  const parsedQuarterReference = parseQuarterReference(record.trimestre_id)
  const recordQuarter =
    getQuarterValueFromDate(record.data_ora_creazione ?? record.creato_il ?? record.aggiornato_il) ?? null
  const recordYear =
    getYearFromDate(record.data_ora_creazione ?? record.creato_il ?? record.aggiornato_il) ?? null

  return (
    (recordQuarter === selectedQuarter && recordYear === selectedYear) ||
    (resolvedQuarter?.data_inizio
      ? getQuarterValueFromDate(resolvedQuarter.data_inizio) === selectedQuarter &&
        getYearFromDate(resolvedQuarter.data_inizio) === selectedYear
      : false) ||
    (parsedQuarterReference
      ? parsedQuarterReference.quarter === selectedQuarter &&
        parsedQuarterReference.year === selectedYear
      : false)
  )
}

export function mapContributoRecordToCard(
  record: ContributoInpsRecord,
  options: {
    stage: string
    rapporto: RapportoLavorativoRecord | null
    resolvedQuarter: MeseCalendarioRecord | null
    assunzioneNames: RapportoAssunzioneNames | null
  },
): ContributoInpsBoardCardData {
  const { stage, rapporto, resolvedQuarter, assunzioneNames } = options
  const parsedQuarterReference = parseQuarterReference(record.trimestre_id)
  const recordQuarter =
    getQuarterValueFromDate(record.data_ora_creazione ?? record.creato_il ?? record.aggiornato_il) ?? null
  const recordYear =
    getYearFromDate(record.data_ora_creazione ?? record.creato_il ?? record.aggiornato_il) ?? null

  const nomeFamiglia = rapporto
    ? getRapportoFamilyLabel(rapporto, null, assunzioneNames?.datore)
    : "Famiglia non disponibile"
  const nomeLavoratore = rapporto
    ? getRapportoWorkerLabel(rapporto, null, assunzioneNames?.lavoratore)
    : "Lavoratore non disponibile"
  const quarterValue =
    recordQuarter ??
    getQuarterValueFromDate(resolvedQuarter?.data_inizio ?? null) ??
    parsedQuarterReference?.quarter ??
    null
  const quarterYear =
    recordYear ??
    getYearFromDate(resolvedQuarter?.data_inizio ?? null) ??
    parsedQuarterReference?.year ??
    null

  return {
    id: record.id,
    stage,
    record,
    rapporto,
    trimestre: resolvedQuarter,
    nomeFamiglia,
    nomeLavoratore,
    nomeCompleto: `${nomeFamiglia} – ${nomeLavoratore}`,
    trimestreLabel: formatQuarterLabel(quarterValue, quarterYear, record.trimestre_id),
    importoLabel: formatItalianCurrencyOrNull(record.importo_contributi_inps),
    pagopaLabel: formatItalianCurrencyOrNull(record.valore_pagopa),
  }
}

export async function fetchContributiBoardData(
  selectedYear: number,
  selectedQuarter: ContributoQuarterValue,
): Promise<{
  stages: ContributiStageDefinition[]
  cards: ContributoInpsBoardCardData[]
  activeRapportiCount: number
}> {
  const quarterRange = getQuarterDateRange(selectedYear, selectedQuarter)
  const [contributiResult, mesiResult, rapportiResult, lookupResult] = await Promise.all([
    quarterRange
      ? fetchContributiInpsByPeriod(quarterRange.start, quarterRange.end)
      : Promise.resolve({ rows: [], total: 0, columns: [], groups: [] }),
    fetchMesiCalendarioAll(500),
    fetchRapportiLavorativiAll(
      3000,
      // Solo le colonne usate dalla card contributi (board + view). Il dettaglio
      // rifetcha il rapporto full via rapporti_lavorativi_by_ids → trim sicuro.
      "id,id_rapporto,ticket_id,stato_assunzione,codice_datore_webcolf,codice_dipendente_webcolf,cognome_nome_datore_proper,nome_lavoratore_per_url,tipo_contratto,tipo_rapporto",
    ),
    fetchLookupValues(),
  ])

  // Le RPC ritornano TableRow generico: castiamo ai record tipizzati una volta
  // qui, così il resto della funzione resta type-safe (build tsc -b).
  const contributiRows = contributiResult.rows as unknown as ContributoInpsRecord[]
  const mesiRows = mesiResult.rows as unknown as MeseCalendarioRecord[]
  const rapportiRows = rapportiResult.rows as unknown as RapportoLavorativoRecord[]

  const stageMetadata = buildContributiStageMetadata(lookupResult.rows)
  const stages = stageMetadata.definitions
  const aliases = stageMetadata.aliases
  const rapportoLookups = buildRapportoLookups(rapportiRows)
  const quarterIndex = buildMesiCalendarioQuarterIndex(mesiRows)
  const activeRapportiCount = rapportiRows.filter((rapporto) => isRapportoAttivo(rapporto)).length

  const resolveRapporto = (record: ContributoInpsRecord) =>
    resolveContributoRapporto(record, rapportoLookups)

  const referencedRapportoIds = Array.from(
    new Set(
      contributiRows
        .map((record) => resolveRapporto(record)?.id)
        .filter((id): id is string => Boolean(id)),
    ),
  )
  const assunzioneNamesByRapporto = await fetchAssunzioniNamesByRapportoIds(referencedRapportoIds)

  const cards = contributiRows.flatMap((record) => {
    const resolvedQuarter =
      (record.trimestre_id ? quarterIndex.byId.get(record.trimestre_id) : null) ??
      (record.trimestre_id
        ? quarterIndex.byToken.get(normalizeComparableToken(record.trimestre_id))
        : null) ??
      null

    if (!matchesSelectedQuarter(record, resolvedQuarter, selectedYear, selectedQuarter)) {
      return []
    }

    const stage =
      aliases.get(normalizeComparableToken(record.stato_contributi_inps)) ??
      CONTRIBUTI_DEFAULT_STAGE_DEFINITIONS[0]?.id ??
      ""
    const rapporto = resolveRapporto(record)
    const assunzioneNames = rapporto ? assunzioneNamesByRapporto[rapporto.id] ?? null : null

    return [
      mapContributoRecordToCard(record, {
        stage,
        rapporto,
        resolvedQuarter,
        assunzioneNames,
      }),
    ]
  })

  return {
    stages,
    cards,
    activeRapportiCount,
  }
}
