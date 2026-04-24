import * as React from "react"

import {
  fetchFamiglie,
  fetchLookupValues,
  fetchProcessiMatching,
  updateRecord,
  updateProcessoMatchingStatoSales,
} from "@/lib/anagrafiche-api"
import type { LookupValueRecord } from "@/types"

const STATO_SALES_COLUMN_ORDER = [
  "warm_lead",
  "hot_ingresso",
  "hot_in_attesa_di_primo_contatto",
  "hot_contatto_avvenuto",
  "hot_callback_programmato",
  "hot_decisione_rimandata",
  "hot_call_attivazione_prenotata",
  "hot_call_attivazione_fatta",
  "hot_follow_up_post_call",
  "hot_no_show",
  "cold_ricerca_futura",
  "won_ricerca_attivata",
  "lost",
  "out_of_target",
] as const

type LookupOption = {
  valueKey: string
  valueLabel: string
  color: string | null
  sortOrder: number | null
}

export type LookupOptionsByField = Record<string, LookupOption[]>

export type CrmPipelineCardData = {
  id: string
  famigliaId: string
  numeroRicercaAttivata: string | null
  stage: string
  nomeFamiglia: string
  email: string
  telefono: string
  dataLead: string
  tipoLavoroBadge: string | null
  tipoLavoroColor: string | null
  tipoRapportoBadge: string | null
  tipoRapportoColor: string | null
  statoRes: string
  qualificazioneLead: string
  motivoNoMatch: string
  modelloSmartmatching: string
  oreSettimana: string
  giorniSettimana: string
  giornatePreferite: string[]
  salesColdCallFollowup: string
  salesNoShowFollowup: string
  motivazioneLost: string
  motivazioneOot: string
  appuntiChiamataSales: string
  dataPerRicercaFutura: string
  dataCallPrenotata: string
  dataLeadRaw: string | null
  dataPerRicercaFuturaRaw: string | null
  dataCallPrenotataRaw: string | null
  tentativiChiamataCount: number
  preventivoAccettato: boolean
  orarioDiLavoro: string
  nucleoFamigliare: string
  descrizioneCasa: string
  metraturaCasa: string
  descrizioneAnimaliInCasa: string
  mansioniRichieste: string
  informazioniExtraRiservate: string
  etaMinima: string
  etaMassima: string
  indirizzoProvincia: string
  indirizzoCap: string
  indirizzoNote: string
  indirizzoCompleto: string
  srcEmbedMapsAnnucio: string
  deadlineMobile: string
  disponibilitaColloquiInPresenza: string
  familyAvailabilityJson?: string | null
  tipoIncontroFamigliaLavoratore: string
  richiestaPatente: boolean
  richiestaTrasferte: boolean
  richiestaFerie: boolean
  descrizioneRichiestaTrasferte: string
  descrizioneRichiestaFerie: string
  patenteDettaglio: string
  sesso: string | null
  testoAnnuncioWhatsapp: string
}

export type CrmPipelineColumnData = {
  id: string
  label: string
  color: string | null
  cards: CrmPipelineCardData[]
}

type UseCrmPipelinePreviewState = {
  loading: boolean
  error: string | null
  columns: CrmPipelineColumnData[]
  lookupOptionsByField: LookupOptionsByField
  moveCard: (processId: string, targetStageId: string) => Promise<void>
  updateProcessCard: (
    processId: string,
    patch: Record<string, unknown>
  ) => Promise<void>
  updateFamilyCard: (
    familyId: string,
    patch: Record<string, unknown>
  ) => Promise<void>
}

type GenericRow = Record<string, unknown>
type LookupColorMap = Record<string, Record<string, string>>

type StageDefinition = {
  id: string
  label: string
  color: string | null
}

type FetchBoardDataResult = {
  columns: CrmPipelineColumnData[]
  lookupOptionsByField: LookupOptionsByField
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

function getFirstArrayValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = toStringValue(item)
      if (normalized) return normalized
    }
    return null
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

function toBooleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return null
    if (["true", "1", "si", "sì", "yes"].includes(normalized)) return true
    if (["false", "0", "no"].includes(normalized)) return false
  }
  return null
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

function formatItalianDateTime(value: unknown): string {
  const raw = toStringValue(value)
  if (!raw) return "-"

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return "-"

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed)
}

function displayValue(value: unknown): string {
  return toStringValue(value) ?? "-"
}

function getFlexibleStringArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toStringValue(item))
      .filter((item): item is string => Boolean(item))
  }

  const single = toStringValue(value)
  if (!single) return []

  return single
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function resolveLookupOptionColor(
  lookupOptionsByField: LookupOptionsByField,
  field: string,
  value: string | null
) {
  if (!value) return null
  const token = normalizeLookupToken(value)
  const options = lookupOptionsByField[field] ?? []
  const matched = options.find(
    (option) =>
      normalizeLookupToken(option.valueKey) === token ||
      normalizeLookupToken(option.valueLabel) === token
  )
  return matched?.color ?? null
}

function parseIsoTime(value: string | null) {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

function compareNullableDates(left: string | null, right: string | null, ascending: boolean) {
  const leftTime = parseIsoTime(left)
  const rightTime = parseIsoTime(right)

  if (leftTime === null && rightTime === null) return 0
  if (leftTime === null) return -1
  if (rightTime === null) return 1
  return ascending ? leftTime - rightTime : rightTime - leftTime
}

function sortCardsForStage(cards: CrmPipelineCardData[], stageId: string) {
  const sorted = [...cards]

  sorted.sort((left, right) => {
    if (stageId === "hot_call_attivazione_prenotata") {
      const byCall = compareNullableDates(left.dataCallPrenotataRaw, right.dataCallPrenotataRaw, true)
      if (byCall !== 0) return byCall
    } else if (stageId === "cold_ricerca_futura") {
      const byCallback = compareNullableDates(
        left.dataPerRicercaFuturaRaw,
        right.dataPerRicercaFuturaRaw,
        true
      )
      if (byCallback !== 0) return byCallback
    }

    return compareNullableDates(left.dataLeadRaw, right.dataLeadRaw, false)
  })

  return sorted
}

function extractFirstNumberToken(value: unknown) {
  const raw = toStringValue(value)
  if (!raw) return null
  const match = raw.match(/\d+(?:[.,]\d+)?/)
  return match?.[0] ?? null
}

function normalizeLookupToken(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase()
}

function canonicalizeLookupValue(
  field: string | null | undefined,
  value: string | null | undefined
) {
  const token = normalizeLookupToken(value)
  if (!token) return null

  if (field === "tipo_lavoro") {
    if (["colf/pulizia", "colf / pulizia"].includes(token)) {
      return "Colf / Pulizie"
    }
    if (
      ["assistenza domestica / badante", "assistenza domiciliare / badante"].includes(
        token
      )
    ) {
      return "Assistenza domiciliare / Badante"
    }
    if (["tata colf", "babysitter / tata-colf"].includes(token)) {
      return "Babysitter / Tata-Colf"
    }
  }

  if (field === "tipo_rapporto") {
    if (
      [
        "*non* convivente full time",
        "non convivente full time",
        "non convivente full-time",
        "full time",
      ].includes(token)
    ) {
      return "Non convivente Full-time"
    }
    if (["part-time", "part time"].includes(token)) {
      return "Part time"
    }
    if (token === "lavoro ad ore") {
      return "Lavoro ad ore"
    }
    if (token === "convivente") {
      return "Convivente"
    }
  }

  return value?.trim() ?? null
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

    const canonicalValueKey = canonicalizeLookupValue(
      current.entity_field,
      current.value_key
    )
    const canonicalValueLabel = canonicalizeLookupValue(
      current.entity_field,
      current.value_label
    )

    acc[domain][normalizeLookupToken(current.value_key)] = color
    acc[domain][normalizeLookupToken(current.value_label)] = color
    if (canonicalValueKey) {
      acc[domain][normalizeLookupToken(canonicalValueKey)] = color
    }
    if (canonicalValueLabel) {
      acc[domain][normalizeLookupToken(canonicalValueLabel)] = color
    }
    return acc
  }, {})
}

function buildLookupOptionsByField(rows: LookupValueRecord[]): LookupOptionsByField {
  const entries = rows
    .filter(
      (row) =>
        row.is_active &&
        row.entity_table === "processi_matching" &&
        Boolean(toStringValue(row.value_key)) &&
        Boolean(toStringValue(row.value_label))
    )
    .sort((a, b) => {
      const left = a.sort_order ?? Number.MAX_SAFE_INTEGER
      const right = b.sort_order ?? Number.MAX_SAFE_INTEGER
      if (left !== right) return left - right
      return a.value_label.localeCompare(b.value_label, "it")
    })

  const map: LookupOptionsByField = {}
  const seenByField = new Map<string, Set<string>>()
  for (const row of entries) {
    const field = toStringValue(row.entity_field)
    const valueKey = canonicalizeLookupValue(field, toStringValue(row.value_key))
    const valueLabel = canonicalizeLookupValue(field, toStringValue(row.value_label))
    if (!field || !valueKey || !valueLabel) continue

    if (!map[field]) map[field] = []
    if (!seenByField.has(field)) {
      seenByField.set(field, new Set<string>())
    }

    const normalizedValueKey = normalizeLookupToken(valueKey)
    const normalizedValueLabel = normalizeLookupToken(valueLabel)
    const dedupeToken = `${normalizedValueKey}::${normalizedValueLabel}`
    if (seenByField.get(field)?.has(dedupeToken)) {
      continue
    }

    seenByField.get(field)?.add(dedupeToken)

    map[field].push({
      valueKey,
      valueLabel,
      color: readLookupColor(row.metadata),
      sortOrder: row.sort_order,
    })
  }

  return map
}

function resolveBadgeColor(
  lookupColors: LookupColorMap,
  entityTable: string,
  entityField: string,
  value: string | null
) {
  if (!value) return null
  const domain = `${entityTable}.${entityField}`
  return lookupColors[domain]?.[normalizeLookupToken(value)] ?? null
}

function buildStageDefinitions(lookupRows: LookupValueRecord[]) {
  const stageRows = lookupRows.filter(
    (row) =>
      row.is_active &&
      row.entity_table === "processi_matching" &&
      row.entity_field === "stato_sales"
  )

  const byId = new Map<string, StageDefinition>()
  const tokenToStageId = new Map<string, string>()

  for (const row of stageRows) {
    const id = normalizeLookupToken(row.value_key)
    if (!id) continue

    const label = toStringValue(row.value_label) ?? id
    const color = readLookupColor(row.metadata)

    byId.set(id, { id, label, color })
    tokenToStageId.set(normalizeLookupToken(row.value_key), id)
    tokenToStageId.set(normalizeLookupToken(row.value_label), id)
  }

  const orderedIds: string[] = []
  for (const rawId of STATO_SALES_COLUMN_ORDER) {
    const normalizedId = normalizeLookupToken(rawId)
    if (byId.has(normalizedId)) {
      orderedIds.push(normalizedId)
    }
  }

  const stages = orderedIds
    .map((id) => byId.get(id))
    .filter((item): item is StageDefinition => Boolean(item))

  return { stages, tokenToStageId }
}

function mapCardData(
  family: GenericRow,
  process: GenericRow,
  stageId: string,
  lookupColors: LookupColorMap
): CrmPipelineCardData {
  const familyName = [toStringValue(family.nome), toStringValue(family.cognome)]
    .filter((value): value is string => Boolean(value))
    .join(" ")

  const processId = displayValue(process.id)
  const famigliaId = displayValue(process.famiglia_id)
  const tipoLavoroBadge = canonicalizeLookupValue(
    "tipo_lavoro",
    getFirstArrayValue(process.tipo_lavoro)
  )
  const tipoRapportoBadge = canonicalizeLookupValue(
    "tipo_rapporto",
    getFirstArrayValue(process.tipo_rapporto)
  )
  const giorniSettimanaValue =
    toStringValue(process.numero_giorni_settimanali) ??
    extractFirstNumberToken(process.frequenza_rapporto) ??
    "-"

  return {
    id: processId,
    famigliaId,
    numeroRicercaAttivata: toStringValue(process.numero_ricerca_attivata),
    stage: stageId,
    nomeFamiglia: familyName || "-",
    email: displayValue(family.email),
    telefono: displayValue(family.telefono),
    dataLead: formatItalianDate(family.creato_il),
    tipoLavoroBadge,
    tipoLavoroColor: resolveBadgeColor(
      lookupColors,
      "processi_matching",
      "tipo_lavoro",
      tipoLavoroBadge
    ),
    tipoRapportoBadge,
    tipoRapportoColor: resolveBadgeColor(
      lookupColors,
      "processi_matching",
      "tipo_rapporto",
      tipoRapportoBadge
    ),
    statoRes: displayValue(process.stato_res),
    qualificazioneLead: displayValue(process.qualificazione_lead),
    motivoNoMatch: displayValue(process.motivo_no_match),
    modelloSmartmatching: displayValue(process.modello_smartmatching),
    oreSettimana: displayValue(process.ore_settimanale),
    giorniSettimana: giorniSettimanaValue,
    giornatePreferite: getStringArrayValue(process.preferenza_giorno),
    salesColdCallFollowup: displayValue(process.sales_cold_call_followup),
    salesNoShowFollowup: displayValue(process.sales_no_show_followup),
    motivazioneLost: displayValue(process.motivazione_lost),
    motivazioneOot: displayValue(process.motivazione_oot),
    appuntiChiamataSales: displayValue(process.appunti_chiamata_sales),
    dataPerRicercaFutura: formatItalianDate(process.data_per_ricerca_futura),
    dataCallPrenotata: formatItalianDateTime(family.data_call_prenotata),
    dataLeadRaw: toStringValue(family.creato_il),
    dataPerRicercaFuturaRaw: toStringValue(process.data_per_ricerca_futura),
    dataCallPrenotataRaw: toStringValue(family.data_call_prenotata),
    tentativiChiamataCount: getFlexibleStringArrayValue(process.sales_cold_call_followup).length,
    preventivoAccettato: toBooleanValue(process.preventivo_firmato) ?? false,
    orarioDiLavoro: displayValue(process.orario_di_lavoro),
    nucleoFamigliare: displayValue(process.nucleo_famigliare),
    descrizioneCasa: displayValue(process.descrizione_casa),
    metraturaCasa: displayValue(process.metratura_casa),
    descrizioneAnimaliInCasa: displayValue(process.descrizione_animali_in_casa),
    mansioniRichieste: displayValue(process.mansioni_richieste),
    informazioniExtraRiservate: displayValue(process.informazioni_extra_riservate),
    etaMinima: displayValue(process.eta_minima),
    etaMassima: displayValue(process.eta_massima),
    indirizzoProvincia: displayValue(process.indirizzo_prova_provincia),
    indirizzoCap: displayValue(process.indirizzo_prova_cap),
    indirizzoNote: displayValue(process.indirizzo_prova_note),
    indirizzoCompleto: [
      toStringValue(process.indirizzo_prova_via),
      toStringValue(process.indirizzo_prova_civico),
      toStringValue(process.indirizzo_prova_comune),
      toStringValue(process.indirizzo_prova_cap),
    ]
      .filter((item): item is string => Boolean(item))
      .join(", "),
    srcEmbedMapsAnnucio: displayValue(process.src_embed_maps_annucio),
    deadlineMobile: formatItalianDate(process.deadline_mobile),
    disponibilitaColloquiInPresenza: displayValue(
      process.disponibilita_colloqui_in_presenza
    ),
    familyAvailabilityJson: toStringValue(process.family_availability_json),
    tipoIncontroFamigliaLavoratore: displayValue(
      process.tipo_incontro_famiglia_lavoratore
    ),
    richiestaPatente: toBooleanValue(process.richiesta_patente) ?? false,
    richiestaTrasferte: toBooleanValue(process.richiesta_trasferte) ?? false,
    richiestaFerie: toBooleanValue(process.richiesta_ferie) ?? false,
    descrizioneRichiestaTrasferte: displayValue(process.descrizione_richiesta_trasferte),
    descrizioneRichiestaFerie: displayValue(process.descrizione_richiesta_ferie),
    patenteDettaglio: getFirstArrayValue(process.patente) ?? displayValue(process.patente),
    sesso: toStringValue(process.sesso),
    testoAnnuncioWhatsapp: displayValue(process.testo_annuncio_whatsapp),
  }
}

function emptyBoardData(): FetchBoardDataResult {
  return {
    columns: [],
    lookupOptionsByField: {},
  }
}

async function fetchBoardData(): Promise<FetchBoardDataResult> {
  const [processesResult, familiesResult, lookupResult] = await Promise.all([
    fetchProcessiMatching({
      limit: 5000,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
    }),
    fetchFamiglie({
      limit: 5000,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
    }),
    fetchLookupValues(),
  ])

  const processRows = asRowArray(processesResult.rows)
  const familyRows = asRowArray(familiesResult.rows)
  const lookupRows = lookupResult.rows
  const lookupColors = buildLookupColorMap(lookupRows)
  const lookupOptionsByField = buildLookupOptionsByField(lookupRows)
  const { stages, tokenToStageId } = buildStageDefinitions(lookupRows)

  if (stages.length === 0) {
    return {
      columns: [],
      lookupOptionsByField,
    }
  }

  const familyById = new Map<string, GenericRow>()
  for (const family of familyRows) {
    const id = toStringValue(family.id)
    if (!id) continue
    familyById.set(id, family)
  }

  const cardsByStage = new Map<string, CrmPipelineCardData[]>()
  for (const stage of stages) {
    cardsByStage.set(stage.id, [])
  }

  for (const process of processRows) {
    const famigliaId = toStringValue(process.famiglia_id)
    if (!famigliaId) continue

    const family = familyById.get(famigliaId)
    if (!family) continue

    const statusToken = normalizeLookupToken(toStringValue(process.stato_sales))
    const stageId = tokenToStageId.get(statusToken)
    if (!stageId) continue

    const card = mapCardData(family, process, stageId, lookupColors)
    cardsByStage.get(stageId)?.push(card)
  }

  return {
    columns: stages.map((stage) => ({
      id: stage.id,
      label: stage.label,
      color: stage.color,
      cards: sortCardsForStage(cardsByStage.get(stage.id) ?? [], stage.id),
    })),
    lookupOptionsByField,
  }
}

export function useCrmPipelinePreview(): UseCrmPipelinePreviewState {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [columns, setColumns] = React.useState<CrmPipelineColumnData[]>([])
  const [lookupOptionsByField, setLookupOptionsByField] =
    React.useState<LookupOptionsByField>({})

  const moveCard = React.useCallback(
    async (processId: string, targetStageId: string) => {
      setError(null)

      const sourceColumnIndex = columns.findIndex((column) =>
        column.cards.some((card) => card.id === processId)
      )
      if (sourceColumnIndex === -1) return

      const targetColumnIndex = columns.findIndex(
        (column) => column.id === targetStageId
      )
      if (targetColumnIndex === -1) return

      const sourceColumn = columns[sourceColumnIndex]
      const cardIndex = sourceColumn.cards.findIndex(
        (card) => card.id === processId
      )
      if (cardIndex === -1) return

      if (sourceColumn.id === targetStageId) {
        return
      }

      const movedCard = sourceColumn.cards[cardIndex]

      const updatedSourceCards = sourceColumn.cards.filter(
        (card) => card.id !== processId
      )
      const targetColumn = columns[targetColumnIndex]
      const updatedTargetCards = [
        { ...movedCard, stage: targetStageId },
        ...targetColumn.cards,
      ]

      const previousColumns = columns
      const optimisticColumns = columns.map((column) => {
        if (column.id === sourceColumn.id) {
          return { ...column, cards: sortCardsForStage(updatedSourceCards, sourceColumn.id) }
        }
        if (column.id === targetStageId) {
          return { ...column, cards: sortCardsForStage(updatedTargetCards, targetStageId) }
        }
        return column
      })

      setColumns(optimisticColumns)

      try {
        await updateProcessoMatchingStatoSales(processId, targetStageId)
      } catch (caughtError) {
        setColumns(previousColumns)

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando stato ricerca su Supabase"
        setError(message)
      }
    },
    [columns]
  )

  const updateProcessCard = React.useCallback(
    async (processId: string, patch: Record<string, unknown>) => {
      setError(null)

      const previousColumns = columns

      const optimisticColumns = columns.map((column) => ({
        ...column,
        cards: sortCardsForStage(column.cards.map((card) => {
          if (card.id !== processId) return card

          const nextCard = { ...card }

          if (typeof patch.stato_sales === "string" && patch.stato_sales.trim()) {
            nextCard.stage = patch.stato_sales.trim()
          }
          if ("tipo_lavoro" in patch) {
            const nextTipoLavoro = getFirstArrayValue(patch.tipo_lavoro)
            nextCard.tipoLavoroBadge = nextTipoLavoro
            nextCard.tipoLavoroColor = resolveLookupOptionColor(
              lookupOptionsByField,
              "tipo_lavoro",
              nextTipoLavoro
            )
          }
          if ("tipo_rapporto" in patch) {
            const nextTipoRapporto = getFirstArrayValue(patch.tipo_rapporto)
            nextCard.tipoRapportoBadge = nextTipoRapporto
            nextCard.tipoRapportoColor = resolveLookupOptionColor(
              lookupOptionsByField,
              "tipo_rapporto",
              nextTipoRapporto
            )
          }
          if ("sales_cold_call_followup" in patch) {
            nextCard.salesColdCallFollowup = displayValue(
              patch.sales_cold_call_followup
            )
            nextCard.tentativiChiamataCount = getFlexibleStringArrayValue(
              patch.sales_cold_call_followup
            ).length
          }
          if ("sales_no_show_followup" in patch) {
            nextCard.salesNoShowFollowup = displayValue(
              patch.sales_no_show_followup
            )
          }
          if ("motivazione_lost" in patch) {
            nextCard.motivazioneLost = displayValue(patch.motivazione_lost)
          }
          if ("motivazione_oot" in patch) {
            nextCard.motivazioneOot = displayValue(patch.motivazione_oot)
          }
          if ("appunti_chiamata_sales" in patch) {
            nextCard.appuntiChiamataSales = displayValue(
              patch.appunti_chiamata_sales
            )
          }
          if ("data_per_ricerca_futura" in patch) {
            nextCard.dataPerRicercaFutura = formatItalianDate(
              patch.data_per_ricerca_futura
            )
            nextCard.dataPerRicercaFuturaRaw = toStringValue(
              patch.data_per_ricerca_futura
            )
          }
          if ("orario_di_lavoro" in patch) {
            nextCard.orarioDiLavoro = displayValue(patch.orario_di_lavoro)
          }
          if ("stato_res" in patch) {
            nextCard.statoRes = displayValue(patch.stato_res)
          }
          if ("qualificazione_lead" in patch) {
            nextCard.qualificazioneLead = displayValue(patch.qualificazione_lead)
          }
          if ("motivo_no_match" in patch) {
            nextCard.motivoNoMatch = displayValue(patch.motivo_no_match)
          }
          if ("modello_smartmatching" in patch) {
            nextCard.modelloSmartmatching = displayValue(
              patch.modello_smartmatching
            )
          }
          if ("ore_settimanale" in patch) {
            nextCard.oreSettimana = displayValue(patch.ore_settimanale)
          }
          if ("numero_giorni_settimanali" in patch) {
            nextCard.giorniSettimana = displayValue(
              patch.numero_giorni_settimanali
            )
          }
          if ("preferenza_giorno" in patch) {
            nextCard.giornatePreferite = getStringArrayValue(patch.preferenza_giorno)
          }
          if ("nucleo_famigliare" in patch) {
            nextCard.nucleoFamigliare = displayValue(patch.nucleo_famigliare)
          }
          if ("descrizione_casa" in patch) {
            nextCard.descrizioneCasa = displayValue(patch.descrizione_casa)
          }
          if ("metratura_casa" in patch) {
            nextCard.metraturaCasa = displayValue(patch.metratura_casa)
          }
          if ("descrizione_animali_in_casa" in patch) {
            nextCard.descrizioneAnimaliInCasa = displayValue(
              patch.descrizione_animali_in_casa
            )
          }
          if ("mansioni_richieste" in patch) {
            nextCard.mansioniRichieste = displayValue(patch.mansioni_richieste)
          }
          if ("sesso" in patch) {
            nextCard.sesso = toStringValue(patch.sesso)
          }
          if ("richiesta_patente" in patch) {
            nextCard.richiestaPatente =
              toBooleanValue(patch.richiesta_patente) ?? false
          }
          if ("richiesta_trasferte" in patch) {
            nextCard.richiestaTrasferte =
              toBooleanValue(patch.richiesta_trasferte) ?? false
          }
          if ("richiesta_ferie" in patch) {
            nextCard.richiestaFerie = toBooleanValue(patch.richiesta_ferie) ?? false
          }
          if ("preventivo_firmato" in patch) {
            nextCard.preventivoAccettato =
              toBooleanValue(patch.preventivo_firmato) ?? false
          }
          if ("descrizione_richiesta_trasferte" in patch) {
            nextCard.descrizioneRichiestaTrasferte = displayValue(
              patch.descrizione_richiesta_trasferte
            )
          }
          if ("descrizione_richiesta_ferie" in patch) {
            nextCard.descrizioneRichiestaFerie = displayValue(
              patch.descrizione_richiesta_ferie
            )
          }
          if ("patente" in patch) {
            nextCard.patenteDettaglio = getFirstArrayValue(patch.patente) ?? "-"
          }
          if ("eta_minima" in patch) {
            nextCard.etaMinima = displayValue(patch.eta_minima)
          }
          if ("eta_massima" in patch) {
            nextCard.etaMassima = displayValue(patch.eta_massima)
          }
          if ("informazioni_extra_riservate" in patch) {
            nextCard.informazioniExtraRiservate = displayValue(
              patch.informazioni_extra_riservate
            )
          }
          if ("indirizzo_prova_provincia" in patch) {
            nextCard.indirizzoProvincia = displayValue(patch.indirizzo_prova_provincia)
          }
          if ("indirizzo_prova_cap" in patch) {
            nextCard.indirizzoCap = displayValue(patch.indirizzo_prova_cap)
          }
          if ("indirizzo_prova_note" in patch) {
            nextCard.indirizzoNote = displayValue(patch.indirizzo_prova_note)
          }
          if ("src_embed_maps_annucio" in patch) {
            nextCard.srcEmbedMapsAnnucio = displayValue(patch.src_embed_maps_annucio)
          }
          if ("deadline_mobile" in patch) {
            nextCard.deadlineMobile = formatItalianDate(patch.deadline_mobile)
          }
          if ("disponibilita_colloqui_in_presenza" in patch) {
            nextCard.disponibilitaColloquiInPresenza = displayValue(
              patch.disponibilita_colloqui_in_presenza
            )
          }
          if ("family_availability_json" in patch) {
            nextCard.familyAvailabilityJson = toStringValue(patch.family_availability_json)
          }
          if ("tipo_incontro_famiglia_lavoratore" in patch) {
            nextCard.tipoIncontroFamigliaLavoratore = displayValue(
              patch.tipo_incontro_famiglia_lavoratore
            )
          }
          if ("testo_annuncio_whatsapp" in patch) {
            nextCard.testoAnnuncioWhatsapp = displayValue(
              patch.testo_annuncio_whatsapp
            )
          }

          return nextCard
        }), column.id),
      }))

      setColumns(optimisticColumns)

      try {
        await updateRecord("processi_matching", processId, patch)
      } catch (caughtError) {
        setColumns(previousColumns)
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando ricerca su Supabase"
        setError(message)
        throw caughtError
      }
    },
    [columns, lookupOptionsByField]
  )

  const updateFamilyCard = React.useCallback(
    async (familyId: string, patch: Record<string, unknown>) => {
      setError(null)

      const previousColumns = columns

      const optimisticColumns = columns.map((column) => ({
        ...column,
        cards: sortCardsForStage(
          column.cards.map((card) => {
            if (card.famigliaId !== familyId) return card

            const nextCard = { ...card }

            if ("data_call_prenotata" in patch) {
              nextCard.dataCallPrenotata = formatItalianDateTime(
                patch.data_call_prenotata
              )
              nextCard.dataCallPrenotataRaw = toStringValue(
                patch.data_call_prenotata
              )
            }

            return nextCard
          }),
          column.id
        ),
      }))

      setColumns(optimisticColumns)

      try {
        await updateRecord("famiglie", familyId, patch)
      } catch (caughtError) {
        setColumns(previousColumns)
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando famiglia su Supabase"
        setError(message)
        throw caughtError
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
        const boardData = await fetchBoardData()
        if (cancelled) return
        setColumns(boardData.columns)
        setLookupOptionsByField(boardData.lookupOptionsByField)
      } catch (caughtError) {
        if (cancelled) return
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore nel caricamento pipeline CRM"
        setError(message)
        setColumns(emptyBoardData().columns)
        setLookupOptionsByField(emptyBoardData().lookupOptionsByField)
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
    columns,
    lookupOptionsByField,
    moveCard,
    updateProcessCard,
    updateFamilyCard,
  }
}
