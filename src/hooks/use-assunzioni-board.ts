import * as React from "react"

import {
  fetchAssunzioni,
  fetchFamiglie,
  fetchLookupValues,
  fetchProcessiMatching,
  fetchRapportiLavorativi,
  fetchLavoratori,
  updateRecord,
} from "@/lib/anagrafiche-api"
import {
  fetchRichiesteAttivazioneByIds,
  fetchRichiesteAttivazioneByProcessIds,
} from "@/features/richieste-attivazione/api"
import { getRapportoProcessIds } from "@/features/rapporti/rapporti-processi"
import type {
  FamigliaRecord,
  LookupValueRecord,
  LavoratoreRecord,
  ProcessoMatchingRecord,
  RapportoLavorativoRecord,
  RichiestaAttivazioneRecord,
} from "@/types"

type AssunzioniStageDefinition = {
  id: string
  label: string
  color: string
}

export type AssunzioneRecord = {
  id: string
  creato_il?: string | null
  civico_se_diverso_residenza: string | null
  codice_fiscale_allegati: Record<string, unknown> | Record<string, unknown>[] | null
  comune_se_diverso_residenza: string | null
  dati_bancari_lavoratore: string | null
  documento_identita_allegati: Record<string, unknown> | Record<string, unknown>[] | null
  documento_identita_numero: string | null
  documento_identita_scadenza: string | null
  documento_identita_tipo: string | null
  famiglia_id: string | null
  cittadino_extracomunitario: string | null
  info_anagrafiche_cap: string | null
  info_anagrafiche_cittadidanza: string | null
  info_anagrafiche_civico: string | null
  info_anagrafiche_codice_fiscale: string | null
  info_anagrafiche_cognome: string | null
  info_anagrafiche_data_di_nascita: string | null
  info_anagrafiche_email: string | null
  info_anagrafiche_indirizzo: string | null
  info_anagrafiche_localita: string | null
  info_anagrafiche_luogo_di_nascita: string | null
  info_anagrafiche_nome: string | null
  info_anagrafiche_numero_fisso: string | null
  info_anagrafiche_numero_mobile: string | null
  luogo_lavoro_se_diverso_da_residenza: string | null
  mezza_giornata_di_riposo: string | null
  ore_di_lavoro: number | string | null
  ore_giovedi: number | string | null
  ore_lunedi: number | string | null
  ore_martedi: number | string | null
  ore_mercoledi: number | string | null
  ore_sabato: number | string | null
  ore_venerdi: number | string | null
  provincia: string | null
  permesso_di_soggiorno_allegati: Record<string, unknown> | Record<string, unknown>[] | null
  rapporto_di_lavoro_residenza: boolean | null
  rapporto_lavorativo_datore_lavoro_id: string | null
  rapporto_lavorativo_lavoratore_id: string | null
  lavoratore_id: string | null
  regime_convivenza: string | null
  ricevuta_rinnovo_permesso_allegati: Record<string, unknown> | Record<string, unknown>[] | null
  telecamere_posto_lavoro: string | null
  tredicesima_rateizzata_mensile: string | null
  note_aggiuntive: string | null
  data_assunzione: string | null
  type_of_compilazione_form: string | null
}

export type AssunzioniBoardCardData = {
  id: string
  processId: string | null
  stage: string
  process: ProcessoMatchingRecord | null
  assunzione: AssunzioneRecord | null
  lavoratoreAssunzione: AssunzioneRecord | null
  richiestaAttivazione: RichiestaAttivazioneRecord | null
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
  deferred: boolean
  loadError: string | null
  loaded: boolean
  loading: boolean
}

type UseAssunzioniBoardState = {
  loading: boolean
  error: string | null
  columns: AssunzioniBoardColumnData[]
  loadDeferredColumn: (stageId: string) => Promise<void>
  moveCard: (rapportoId: string, targetStageId: string) => Promise<void>
  updateCard: (
    rapportoId: string,
    updater: (card: AssunzioniBoardCardData) => AssunzioniBoardCardData
  ) => void
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

const DEFERRED_STAGE_IDS = new Set(["Contratto firmato", "Non assume con Baze"])

const ASSUNZIONI_PROCESSI_SELECT = [
  "id",
  "famiglia_id",
  "titolo_annuncio",
  "tipo_rapporto",
  "data_limite_invio_selezione",
  "source_url",
  "offerta",
] satisfies string[]

const ASSUNZIONI_FAMIGLIE_SELECT = [
  "id",
  "nome",
  "cognome",
  "email",
  "telefono",
] satisfies string[]

const ASSUNZIONI_RAPPORTI_SELECT = [
  "id",
  "id_rapporto",
  "codice_datore_webcolf",
  "codice_dipendente_webcolf",
  "processi_matching_id",
  "preventivo_id",
  "richiesta_attivazione_id",
  "famiglia_id",
  "lavoratore_id",
  "stato_assunzione",
  "cognome_nome_datore_proper",
  "nome_lavoratore_per_url",
  "data_inizio_rapporto",
  "ore_a_settimana",
  "distribuzione_ore_settimana",
  "paga_mensile_lorda",
  "paga_oraria_lorda",
  "tipo_contratto",
  "tipo_rapporto",
] satisfies string[]

const ASSUNZIONI_LAVORATORI_SELECT = [
  "id",
  "nome",
  "cognome",
  "email",
  "telefono",
  "nazionalita",
  "iban",
] satisfies string[]

const ASSUNZIONI_RECORD_SELECT = [
  "id",
  "civico_se_diverso_residenza",
  "codice_fiscale_allegati",
  "comune_se_diverso_residenza",
  "dati_bancari_lavoratore",
  "documento_identita_allegati",
  "documento_identita_numero",
  "documento_identita_scadenza",
  "documento_identita_tipo",
  "famiglia_id",
  "cittadino_extracomunitario",
  "info_anagrafiche_cap",
  "info_anagrafiche_cittadidanza",
  "info_anagrafiche_civico",
  "info_anagrafiche_codice_fiscale",
  "info_anagrafiche_cognome",
  "info_anagrafiche_data_di_nascita",
  "info_anagrafiche_email",
  "info_anagrafiche_indirizzo",
  "info_anagrafiche_localita",
  "info_anagrafiche_luogo_di_nascita",
  "info_anagrafiche_nome",
  "info_anagrafiche_numero_fisso",
  "info_anagrafiche_numero_mobile",
  "luogo_lavoro_se_diverso_da_residenza",
  "mezza_giornata_di_riposo",
  "ore_di_lavoro",
  "ore_giovedi",
  "ore_lunedi",
  "ore_martedi",
  "ore_mercoledi",
  "ore_sabato",
  "ore_venerdi",
  "provincia",
  "permesso_di_soggiorno_allegati",
  "rapporto_di_lavoro_residenza",
  "rapporto_lavorativo_datore_lavoro_id",
  "rapporto_lavorativo_lavoratore_id",
  "lavoratore_id",
  "regime_convivenza",
  "ricevuta_rinnovo_permesso_allegati",
  "telecamere_posto_lavoro",
  "tredicesima_rateizzata_mensile",
  "note_aggiuntive",
  "data_assunzione",
  "type_of_compilazione_form",
] satisfies string[]

const RELATED_RECORDS_BATCH_SIZE = 100

type FetchAssunzioniBoardDataOptions = {
  deferredLoadedStageIds?: Set<string>
  onlyStageId?: string
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

function formatFullName(firstName: string | null | undefined, lastName: string | null | undefined) {
  return [lastName, firstName].filter(Boolean).join(" ").trim()
}

function compactUnique(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => toStringValue(value))
        .filter((value): value is string => Boolean(value))
    )
  )
}

function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

function resolveAssunzioneName(assunzione: AssunzioneRecord | null) {
  if (!assunzione) return null

  const fullName = formatFullName(
    toStringValue(assunzione.info_anagrafiche_nome),
    toStringValue(assunzione.info_anagrafiche_cognome)
  )
  return fullName || null
}

function resolveFamilyName(
  assunzione: AssunzioneRecord | null,
  family: FamigliaRecord | null,
  rapporto: RapportoLavorativoRecord
) {
  const assunzioneName = resolveAssunzioneName(assunzione)
  if (assunzioneName) return assunzioneName

  const rapportoName = toStringValue(rapporto.cognome_nome_datore_proper)
  if (rapportoName) return rapportoName

  const familyName = family ? formatFullName(family.nome, family.cognome) : ""
  return familyName || null
}

function resolveWorkerName(
  assunzione: AssunzioneRecord | null,
  worker: LavoratoreRecord | null,
  rapporto: RapportoLavorativoRecord
) {
  const assunzioneName = resolveAssunzioneName(assunzione)
  if (assunzioneName) return assunzioneName

  const workerName = worker ? formatFullName(worker.nome, worker.cognome) : ""
  if (workerName) return workerName

  return toStringValue(rapporto.nome_lavoratore_per_url)
}

function parseProcessRapportoIds(value: string | null | undefined) {
  if (!value) return []

  return value
    .split(/[,\n;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function resolveRichiestaAttivazioneForRapporto({
  rapporto,
  process,
  richiesteById,
  richiesteByProcessId,
}: {
  rapporto: RapportoLavorativoRecord
  process: ProcessoMatchingRecord | null
  richiesteById: Map<string, RichiestaAttivazioneRecord>
  richiesteByProcessId: Map<string, RichiestaAttivazioneRecord>
}) {
  if (rapporto.richiesta_attivazione_id) {
    const richiestaById = richiesteById.get(rapporto.richiesta_attivazione_id)
    if (richiestaById) return richiestaById
  }

  if (process?.id) {
    const richiestaByProcess = richiesteByProcessId.get(process.id)
    if (richiestaByProcess) return richiestaByProcess
  }

  for (const processId of getRapportoProcessIds(rapporto)) {
    const richiestaByProcess = richiesteByProcessId.get(processId)
    if (richiestaByProcess) return richiestaByProcess
  }

  for (const processId of parseProcessRapportoIds(rapporto.id_rapporto)) {
    const richiestaByProcess = richiesteByProcessId.get(processId)
    if (richiestaByProcess) return richiestaByProcess
  }

  return null
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

async function fetchFamiglieByIds(ids: string[]) {
  if (ids.length === 0) return [] as FamigliaRecord[]

  const results = await Promise.all(
    chunkValues(ids, RELATED_RECORDS_BATCH_SIZE).map((batch, index) =>
      fetchFamiglie({
        select: ASSUNZIONI_FAMIGLIE_SELECT,
        limit: batch.length,
        offset: 0,
        orderBy: [{ field: "id", ascending: true }],
        filters: {
          kind: "group",
          id: `assunzioni-famiglie-${index}`,
          logic: "and",
          nodes: [
            {
              kind: "condition",
              id: `assunzioni-famiglie-id-${index}`,
              field: "id",
              operator: "in",
              value: batch.join(","),
            },
          ],
        },
      })
    )
  )

  return results.flatMap((result) => result.rows as FamigliaRecord[])
}

async function fetchLavoratoriByIds(ids: string[]) {
  if (ids.length === 0) return [] as LavoratoreRecord[]

  const results = await Promise.all(
    chunkValues(ids, RELATED_RECORDS_BATCH_SIZE).map((batch, index) =>
      fetchLavoratori({
        select: ASSUNZIONI_LAVORATORI_SELECT,
        limit: batch.length,
        offset: 0,
        orderBy: [{ field: "id", ascending: true }],
        filters: {
          kind: "group",
          id: `assunzioni-lavoratori-${index}`,
          logic: "and",
          nodes: [
            {
              kind: "condition",
              id: `assunzioni-lavoratori-id-${index}`,
              field: "id",
              operator: "in",
              value: batch.join(","),
            },
          ],
        },
      })
    )
  )

  return results.flatMap((result) => result.rows as LavoratoreRecord[])
}

function indexFirstAssunzioneBy(
  rows: AssunzioneRecord[],
  getKey: (record: AssunzioneRecord) => string | null | undefined
) {
  const index = new Map<string, AssunzioneRecord>()
  for (const row of rows) {
    const key = getKey(row)
    if (!key || index.has(key)) continue
    index.set(key, row)
  }
  return index
}

function indexFirstProcessBy(
  rows: ProcessoMatchingRecord[],
  getKey: (record: ProcessoMatchingRecord) => string | null | undefined
) {
  const index = new Map<string, ProcessoMatchingRecord>()
  for (const row of rows) {
    const key = getKey(row)
    if (!key || index.has(key)) continue
    index.set(key, row)
  }
  return index
}

async function fetchAssunzioniByLinkedIds({
  rapportoIds,
  famigliaIds,
  lavoratoreIds,
}: {
  rapportoIds: string[]
  famigliaIds: string[]
  lavoratoreIds: string[]
}) {
  if (rapportoIds.length === 0 && famigliaIds.length === 0 && lavoratoreIds.length === 0) {
    return [] as AssunzioneRecord[]
  }

  const results = await Promise.all(
    [
      ...chunkValues(rapportoIds, RELATED_RECORDS_BATCH_SIZE).flatMap((batch, index) => [
        fetchAssunzioni({
          select: ASSUNZIONI_RECORD_SELECT,
          limit: batch.length,
          offset: 0,
          orderBy: [{ field: "creato_il", ascending: false }],
          filters: {
            kind: "group",
            id: `assunzioni-records-datore-${index}`,
            logic: "and",
            nodes: [
              {
                kind: "condition",
                id: `assunzioni-records-datore-id-${index}`,
                field: "rapporto_lavorativo_datore_lavoro_id",
                operator: "in",
                value: batch.join(","),
              },
            ],
          },
        }),
        fetchAssunzioni({
          select: ASSUNZIONI_RECORD_SELECT,
          limit: batch.length,
          offset: 0,
          orderBy: [{ field: "creato_il", ascending: false }],
          filters: {
            kind: "group",
            id: `assunzioni-records-lavoratore-${index}`,
            logic: "and",
            nodes: [
              {
                kind: "condition",
                id: `assunzioni-records-lavoratore-id-${index}`,
                field: "rapporto_lavorativo_lavoratore_id",
                operator: "in",
                value: batch.join(","),
              },
            ],
          },
        }),
      ]),
      ...chunkValues(famigliaIds, RELATED_RECORDS_BATCH_SIZE).map((batch, index) =>
        fetchAssunzioni({
          select: ASSUNZIONI_RECORD_SELECT,
          limit: batch.length * 5,
          offset: 0,
          orderBy: [{ field: "creato_il", ascending: false }],
          filters: {
            kind: "group",
            id: `assunzioni-records-famiglia-${index}`,
            logic: "and",
            nodes: [
              {
                kind: "condition",
                id: `assunzioni-records-famiglia-id-${index}`,
                field: "famiglia_id",
                operator: "in",
                value: batch.join(","),
              },
            ],
          },
        })
      ),
      ...chunkValues(lavoratoreIds, RELATED_RECORDS_BATCH_SIZE).map((batch, index) =>
        fetchAssunzioni({
          select: ASSUNZIONI_RECORD_SELECT,
          limit: batch.length * 5,
          offset: 0,
          orderBy: [{ field: "creato_il", ascending: false }],
          filters: {
            kind: "group",
            id: `assunzioni-records-lavoratore-${index}`,
            logic: "and",
            nodes: [
              {
                kind: "condition",
                id: `assunzioni-records-lavoratore-id-${index}`,
                field: "lavoratore_id",
                operator: "in",
                value: batch.join(","),
              },
            ],
          },
        })
      ),
    ]
  )

  return results.flatMap((result) => result.rows as AssunzioneRecord[])
}

async function fetchAssunzioniBoardData({
  deferredLoadedStageIds = new Set<string>(),
  onlyStageId,
}: FetchAssunzioniBoardDataOptions = {}): Promise<AssunzioniBoardColumnData[]> {
  const rapportiFilters = onlyStageId
    ? {
        kind: "group" as const,
        id: `assunzioni-rapporti-stage-${normalizeToken(onlyStageId)}`,
        logic: "and" as const,
        nodes: [
          {
            kind: "condition" as const,
            id: `assunzioni-rapporti-stage-value-${normalizeToken(onlyStageId)}`,
            field: "stato_assunzione",
            operator: "is" as const,
            value: onlyStageId,
          },
        ],
      }
    : {
        kind: "group" as const,
        id: "assunzioni-rapporti-active-stages",
        logic: "and" as const,
        nodes: [
          {
            kind: "condition" as const,
            id: "assunzioni-rapporti-exclude-deferred-stages",
            field: "stato_assunzione",
            operator: "not_has_any" as const,
            value: Array.from(DEFERRED_STAGE_IDS).join(","),
          },
        ],
      }

  const [
    processesResult,
    rapportiResult,
    lookupResult,
  ] =
    await Promise.all([
    fetchProcessiMatching({
      select: ASSUNZIONI_PROCESSI_SELECT,
      limit: 1000,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
    }),
    fetchRapportiLavorativi({
      select: ASSUNZIONI_RAPPORTI_SELECT,
      limit: 1000,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
      filters: rapportiFilters,
    }),
    fetchLookupValues(),
  ])

  const rapportiRows = rapportiResult.rows as RapportoLavorativoRecord[]
  const processRows = processesResult.rows as ProcessoMatchingRecord[]
  const processById = new Map(processRows.map((process) => [process.id, process] as const))
  const processByFamilyId = indexFirstProcessBy(processRows, (process) => process.famiglia_id)
  const familyIds = compactUnique([
    ...rapportiRows.map((rapporto) => rapporto.famiglia_id),
    ...processRows.map((process) => process.famiglia_id),
  ])
  const workerIds = compactUnique(rapportiRows.map((rapporto) => rapporto.lavoratore_id))
  const rapportoIds = compactUnique(rapportiRows.map((rapporto) => rapporto.id))
  const richiestaIds = compactUnique(
    rapportiRows.map((rapporto) => rapporto.richiesta_attivazione_id)
  )
  const richiestaProcessIds = compactUnique([
    ...processRows.map((process) => process.id),
    ...rapportiRows.flatMap((rapporto) => getRapportoProcessIds(rapporto)),
    ...rapportiRows.flatMap((rapporto) => parseProcessRapportoIds(rapporto.id_rapporto)),
  ])
  const [
    familiesRows,
    lavoratoriRows,
    assunzioniRows,
    richiesteAttivazioneById,
    richiesteAttivazioneByProcessId,
  ] = await Promise.all([
    fetchFamiglieByIds(familyIds),
    fetchLavoratoriByIds(workerIds),
    fetchAssunzioniByLinkedIds({
      rapportoIds,
      famigliaIds: familyIds,
      lavoratoreIds: workerIds,
    }),
    fetchRichiesteAttivazioneByIds(richiestaIds),
    fetchRichiesteAttivazioneByProcessIds(richiestaProcessIds),
  ])

  const familiesById = new Map(
    familiesRows.map((family) => [family.id, family] as const)
  )
  const lavoratoriById = new Map(
    lavoratoriRows.map((worker) => [worker.id, worker] as const)
  )
  const assunzioniByDatoreRapportoId = indexFirstAssunzioneBy(
    assunzioniRows,
    (record) => record.rapporto_lavorativo_datore_lavoro_id
  )
  const assunzioniByLavoratoreRapportoId = indexFirstAssunzioneBy(
    assunzioniRows,
    (record) => record.rapporto_lavorativo_lavoratore_id
  )
  const assunzioniByFamigliaId = indexFirstAssunzioneBy(
    assunzioniRows,
    (record) => record.famiglia_id
  )
  const assunzioniByLavoratoreId = indexFirstAssunzioneBy(
    assunzioniRows,
    (record) => record.lavoratore_id
  )

  const stageMetadata = buildStageMetadata(lookupResult.rows)
  const stages = stageMetadata.definitions
  const aliases = stageMetadata.aliases
  const cardsByStage = new Map<string, AssunzioniBoardCardData[]>(
    stages.map((stage) => [stage.id, []])
  )

  for (const linkedRapporto of rapportiRows) {
    const processStage = aliases.get(normalizeToken(linkedRapporto.stato_assunzione))
    if (!processStage) continue

    const process =
      getRapportoProcessIds(linkedRapporto)
        .map((processId) => processById.get(processId) ?? null)
        .find((record): record is ProcessoMatchingRecord => Boolean(record)) ??
      parseProcessRapportoIds(linkedRapporto.id_rapporto)
        .map((processId) => processById.get(processId) ?? null)
        .find((record): record is ProcessoMatchingRecord => Boolean(record)) ??
      (linkedRapporto.famiglia_id
        ? processByFamilyId.get(linkedRapporto.famiglia_id) ?? null
        : null) ??
      null
    const family =
      (linkedRapporto?.famiglia_id ? familiesById.get(linkedRapporto.famiglia_id) ?? null : null) ??
      (process?.famiglia_id ? familiesById.get(process.famiglia_id) ?? null : null)
    const lavoratore =
      linkedRapporto?.lavoratore_id ? lavoratoriById.get(linkedRapporto.lavoratore_id) ?? null : null
    const datoreAssunzione =
      (family?.id ? assunzioniByFamigliaId.get(family.id) ?? null : null) ??
      assunzioniByDatoreRapportoId.get(linkedRapporto.id) ??
      null
    const lavoratoreAssunzione =
      (lavoratore?.id ? assunzioniByLavoratoreId.get(lavoratore.id) ?? null : null) ??
      assunzioniByLavoratoreRapportoId.get(linkedRapporto.id) ??
      null
    const nomeFamiglia = resolveFamilyName(datoreAssunzione, family, linkedRapporto)
    const nomeLavoratore = resolveWorkerName(lavoratoreAssunzione, lavoratore, linkedRapporto)

    const card: AssunzioniBoardCardData = {
      id: linkedRapporto.id,
      processId: process?.id ?? null,
      stage: processStage,
      process,
      assunzione: datoreAssunzione,
      lavoratoreAssunzione,
      richiestaAttivazione: resolveRichiestaAttivazioneForRapporto({
        rapporto: linkedRapporto,
        process,
        richiesteById: richiesteAttivazioneById,
        richiesteByProcessId: richiesteAttivazioneByProcessId,
      }),
      rapporto: linkedRapporto,
      lavoratore,
      famiglia: family,
      famigliaId: family?.id ?? process?.famiglia_id ?? null,
      nomeFamiglia: nomeFamiglia ?? "Famiglia non trovata",
      nomeLavoratore: nomeLavoratore ?? "Lavoratore non associato",
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
    deferred: DEFERRED_STAGE_IDS.has(stage.id),
    loadError: null,
    loaded: !DEFERRED_STAGE_IDS.has(stage.id) || deferredLoadedStageIds.has(stage.id),
    loading: false,
  }))
}

export function useAssunzioniBoard(): UseAssunzioniBoardState {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [columns, setColumns] = React.useState<AssunzioniBoardColumnData[]>([])
  const [loadedDeferredStageIds, setLoadedDeferredStageIds] = React.useState<Set<string>>(
    () => new Set()
  )

  const updateCard = React.useCallback(
    (
      rapportoId: string,
      updater: (card: AssunzioniBoardCardData) => AssunzioniBoardCardData
    ) => {
      setColumns((current) => {
        let nextCard: AssunzioniBoardCardData | null = null

        const columnsWithoutCard = current.map((column) => ({
          ...column,
          cards: column.cards.filter((card) => {
            if (card.id !== rapportoId) return true
            nextCard = updater(card)
            return false
          }),
        }))

        if (!nextCard) return current

        return columnsWithoutCard.map((column) =>
          column.id === nextCard?.stage
            ? { ...column, cards: [nextCard, ...column.cards] }
            : column
        )
      })
    },
    []
  )

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

  const loadDeferredColumn = React.useCallback(
    async (stageId: string) => {
      if (!DEFERRED_STAGE_IDS.has(stageId) || loadedDeferredStageIds.has(stageId)) return

      setColumns((current) =>
        current.map((column) =>
          column.id === stageId ? { ...column, loadError: null, loading: true } : column
        )
      )

      try {
        const loadedColumns = await fetchAssunzioniBoardData({
          deferredLoadedStageIds: new Set([stageId]),
          onlyStageId: stageId,
        })
        const loadedColumn = loadedColumns.find((column) => column.id === stageId)

        setLoadedDeferredStageIds((current) => {
          const next = new Set(current)
          next.add(stageId)
          return next
        })
        setColumns((current) =>
          current.map((column) =>
            column.id === stageId
              ? {
                  ...column,
                  cards: loadedColumn?.cards ?? [],
                  loadError: null,
                  loaded: true,
                  loading: false,
                }
              : column
          )
        )
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : "Errore caricamento colonna"
        setColumns((current) =>
          current.map((column) =>
            column.id === stageId
              ? { ...column, loadError: message, loaded: false, loading: false }
              : column
          )
        )
      }
    },
    [loadedDeferredStageIds]
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
    loadDeferredColumn,
    moveCard,
    updateCard,
  }
}
