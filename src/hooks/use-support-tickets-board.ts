import * as React from "react"

import {
  createRecord,
  fetchLookupValues,
  fetchRapportiLavorativi,
  fetchTickets,
  updateRecord,
} from "@/lib/anagrafiche-api"
import type { LookupValueRecord, RapportoLavorativoRecord, TicketRecord } from "@/types"
import {
  SUPPORT_TICKET_STATUSES,
  getSupportTicketMetadata,
  inferSupportTicketTag,
  resolveSupportTicketTag,
  resolveSupportTicketUrgency,
  type SupportTicketMetadata,
  type SupportTicketStatusDefinition,
  type SupportTicketTag,
  type SupportTicketType,
  type SupportTicketUrgency,
} from "@/components/support/support-ticket-config"
import { getRapportoFamilyLabel, getRapportoTitle, getRapportoWorkerLabel } from "@/features/rapporti/rapporti-labels"
import { resolveRapportoStatus } from "@/features/rapporti/rapporti-status"

type SupportTicketStageMetadata = {
  definitions: SupportTicketStatusDefinition[]
  aliases: Map<string, string>
}

export type SupportTicketBoardCardData = {
  id: string
  stage: string
  record: TicketRecord
  rapporto: RapportoLavorativoRecord | null
  tipo: SupportTicketType
  causale: string
  nomeFamiglia: string
  nomeLavoratore: string
  nomeCompleto: string
  dataAperturaLabel: string
  tag: string
  urgenza: string
  assegnatario: string
  note: string | null
  attachmentCount: number
}

type CreateSupportTicketInput = {
  tipo: SupportTicketType
  rapportoId: string
  tag: SupportTicketTag
  urgenza: SupportTicketUrgency
  causale: string
  note: string
}

type UseSupportTicketsBoardState = {
  loading: boolean
  error: string | null
  stages: SupportTicketStatusDefinition[]
  cards: SupportTicketBoardCardData[]
  activeRapportiCount: number
  rapportoOptions: Array<{ id: string; label: string }>
  createTicket: (input: CreateSupportTicketInput) => Promise<void>
  moveTicket: (ticketId: string, targetStageId: string) => Promise<void>
  patchTicket: (ticketId: string, patch: Partial<TicketRecord>) => Promise<void>
}

function normalizeToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
}

function toStringValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return null
}

function readLookupColor(metadata: LookupValueRecord["metadata"]) {
  if (!metadata || typeof metadata !== "object") return null
  const color = metadata.color
  return typeof color === "string" && color.trim() ? color.trim() : null
}

function readLookupSortOrder(value: LookupValueRecord["sort_order"]) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function countAttachments(value: TicketRecord["allegati"]) {
  if (!value) return 0
  if (Array.isArray(value)) return value.length
  return 1
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return "Non disponibile"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed)
}

function normalizeTicketType(value: string | null | undefined): SupportTicketType | null {
  const token = normalizeToken(value)
  if (token === "customer") return "Customer"
  if (token === "customer support") return "Customer"
  if (token === "payroll") return "Payroll"
  if (token === "consulenza lavoro") return "Payroll"
  return null
}

function buildStageMetadata(rows: LookupValueRecord[], ticketRows: TicketRecord[]): SupportTicketStageMetadata {
  const aliases = new Map<string, string>()
  const definitionsById = new Map<string, SupportTicketStatusDefinition & { sortOrder: number | null }>()

  const lookupRows = rows.filter(
    (row) => row.is_active && row.entity_table === "ticket" && row.entity_field === "stato"
  )

  for (const stage of SUPPORT_TICKET_STATUSES) {
    aliases.set(normalizeToken(stage.id), stage.id)
    aliases.set(normalizeToken(stage.label), stage.id)
    definitionsById.set(stage.id, { ...stage, sortOrder: null })
  }

  for (const row of lookupRows) {
    const valueKey = toStringValue(row.value_key)
    const valueLabel = toStringValue(row.value_label)
    const stageId = valueKey ?? valueLabel
    if (!stageId) continue

    const existing = definitionsById.get(stageId)
    if (!existing) {
      throw new Error(`lookup_values contiene uno stato ticket non supportato: ${stageId}`)
    }

    const color = readLookupColor(row.metadata) ?? existing.color

    definitionsById.set(stageId, {
      ...existing,
      label: valueLabel ?? valueKey ?? existing.label,
      color,
      sortOrder: readLookupSortOrder(row.sort_order) ?? existing.sortOrder ?? null,
    })

    aliases.set(normalizeToken(stageId), stageId)
    if (valueKey) aliases.set(normalizeToken(valueKey), stageId)
    if (valueLabel) aliases.set(normalizeToken(valueLabel), stageId)
  }

  for (const row of ticketRows) {
    const status = toStringValue(row.stato)
    if (!status) continue

    if (!definitionsById.has(status)) {
      throw new Error(`Valore ticket.stato non supportato: ${status}`)
    }

    aliases.set(normalizeToken(status), status)
  }

  const definitions = Array.from(definitionsById.values())
    .sort((left, right) => {
      const leftDefaultIndex = SUPPORT_TICKET_STATUSES.findIndex(
        (item) => normalizeToken(item.id) === normalizeToken(left.id)
      )
      const rightDefaultIndex = SUPPORT_TICKET_STATUSES.findIndex(
        (item) => normalizeToken(item.id) === normalizeToken(right.id)
      )
      const leftOrder = left.sortOrder ?? (leftDefaultIndex >= 0 ? leftDefaultIndex : Number.POSITIVE_INFINITY)
      const rightOrder = right.sortOrder ?? (rightDefaultIndex >= 0 ? rightDefaultIndex : Number.POSITIVE_INFINITY)

      if (leftOrder !== rightOrder) return leftOrder - rightOrder
      return left.label.localeCompare(right.label, "it")
    })
    .map((definition) => ({
      id: definition.id,
      label: definition.label,
      color: definition.color,
      badgeClassName: definition.badgeClassName,
      icon: definition.icon,
    }))

  return { definitions, aliases }
}

function buildRapportoIndex(rows: RapportoLavorativoRecord[]) {
  const byId = new Map<string, RapportoLavorativoRecord>()
  const byExternalId = new Map<string, RapportoLavorativoRecord>()

  for (const rapporto of rows) {
    byId.set(rapporto.id, rapporto)

    for (const key of [
      rapporto.id,
      rapporto.id_rapporto,
      rapporto.ticket_id,
    ]) {
      if (!key) continue
      byExternalId.set(key, rapporto)
    }
  }

  return { byId, byExternalId }
}

const SUPPORT_RAPPORTI_SELECT = [
  "id",
  "id_rapporto",
  "ticket_id",
  "stato_assunzione",
  "stato_servizio",
  "fine_rapporto_lavorativo_id",
  "tipo_rapporto",
  "tipo_contratto",
  "data_inizio_rapporto",
  "cognome_nome_datore_proper",
  "nome_lavoratore_per_url",
] satisfies string[]

function getRapportoForTicket(
  record: TicketRecord,
  rapportoIndex: ReturnType<typeof buildRapportoIndex>
) {
  return record.rapporto_id
    ? rapportoIndex.byId.get(record.rapporto_id) ?? rapportoIndex.byExternalId.get(record.rapporto_id) ?? null
    : null
}

function mapRecordToCard(
  record: TicketRecord,
  ticketType: SupportTicketType,
  rapportoIndex: ReturnType<typeof buildRapportoIndex>,
  aliases: Map<string, string>
): SupportTicketBoardCardData | null {
  const normalizedType = normalizeTicketType(record.tipo)
  if (normalizedType !== ticketType) return null

  const rapporto = getRapportoForTicket(record, rapportoIndex)
  const metadata = getSupportTicketMetadata(record)
  const tag = toStringValue(metadata.tag) ?? inferSupportTicketTag(record)
  const note = toStringValue(metadata.note)
  const assegnatario = toStringValue(metadata.assegnatario)
  resolveSupportTicketTag(tag)

  const urgenza = toStringValue(record.urgenza)
  if (!urgenza) {
    throw new Error(`Ticket ${record.id} senza urgenza valorizzata`)
  }
  resolveSupportTicketUrgency(urgenza)

  const rawStage = toStringValue(record.stato)
  if (!rawStage) {
    throw new Error(`Ticket ${record.id} senza stato valorizzato`)
  }
  const stage = aliases.get(normalizeToken(rawStage))
  if (!stage) {
    throw new Error(`Stato ticket non mappato per ticket ${record.id}: ${rawStage}`)
  }
  const nomeFamiglia = rapporto ? getRapportoFamilyLabel(rapporto) : "Famiglia non disponibile"
  const nomeLavoratore = rapporto ? getRapportoWorkerLabel(rapporto) : "Lavoratore non disponibile"

  return {
    id: record.id,
    stage,
    record,
    rapporto,
    tipo: ticketType,
    causale: toStringValue(record.causale) ?? "Ticket senza causale",
    nomeFamiglia,
    nomeLavoratore,
    nomeCompleto: rapporto ? getRapportoTitle(rapporto) : `${nomeFamiglia} – ${nomeLavoratore}`,
    dataAperturaLabel: formatDateLabel(record.data_apertura ?? record.creato_il),
    tag,
    urgenza,
    assegnatario: assegnatario ?? "",
    note,
    attachmentCount: countAttachments(record.allegati),
  }
}

async function fetchSupportTicketsData(ticketType: SupportTicketType) {
  const [ticketsResult, rapportiResult, lookupResult] = await Promise.all([
    fetchTickets({
      limit: 3000,
      offset: 0,
      orderBy: [{ field: "data_apertura", ascending: false }],
    }),
    fetchRapportiLavorativi({
      select: SUPPORT_RAPPORTI_SELECT,
      limit: 3000,
      offset: 0,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
    }),
    fetchLookupValues(),
  ])

  const rapportoIndex = buildRapportoIndex(rapportiResult.rows)
  const filteredTicketRows = ticketsResult.rows.filter((row) => normalizeTicketType(row.tipo) === ticketType)
  const stageMetadata = buildStageMetadata(lookupResult.rows, filteredTicketRows)

  const cards = filteredTicketRows.flatMap((record) => {
    const card = mapRecordToCard(record, ticketType, rapportoIndex, stageMetadata.aliases)
    return card ? [card] : []
  })

  const activeRapportiCount = rapportiResult.rows.filter((rapporto) => {
    const token = normalizeToken(resolveRapportoStatus(rapporto))
    return token === "attivo"
  }).length

  const rapportoOptions = rapportiResult.rows
    .filter((rapporto) => {
      const token = normalizeToken(resolveRapportoStatus(rapporto))
      return token === "attivo"
    })
    .map((rapporto) => ({
      id: rapporto.id,
      label: getRapportoTitle(rapporto),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, "it"))

  return {
    cards,
    stages: stageMetadata.definitions,
    activeRapportiCount,
    rapportoOptions,
    rapportoIndex,
    stageAliases: stageMetadata.aliases,
  }
}

export function useSupportTicketsBoard(ticketType: SupportTicketType): UseSupportTicketsBoardState {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [stages, setStages] = React.useState<SupportTicketStatusDefinition[]>([])
  const [cards, setCards] = React.useState<SupportTicketBoardCardData[]>([])
  const [activeRapportiCount, setActiveRapportiCount] = React.useState(0)
  const [rapportoOptions, setRapportoOptions] = React.useState<Array<{ id: string; label: string }>>([])
  const rapportoIndexRef = React.useRef<ReturnType<typeof buildRapportoIndex>>(buildRapportoIndex([]))
  const stageAliasesRef = React.useRef<Map<string, string>>(new Map())

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const data = await fetchSupportTicketsData(ticketType)
        if (cancelled) return

        setStages(data.stages)
        setCards(data.cards)
        setActiveRapportiCount(data.activeRapportiCount)
        setRapportoOptions(data.rapportoOptions)
        rapportoIndexRef.current = data.rapportoIndex
        stageAliasesRef.current = data.stageAliases
      } catch (caughtError) {
        if (cancelled) return
        setError(caughtError instanceof Error ? caughtError.message : "Errore caricamento ticket")
        setStages([])
        setCards([])
        setActiveRapportiCount(0)
        setRapportoOptions([])
        rapportoIndexRef.current = buildRapportoIndex([])
        stageAliasesRef.current = new Map()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [ticketType])

  const moveTicket = React.useCallback(
    async (ticketId: string, targetStageId: string) => {
      const previous = cards

      setCards((current) =>
        current.map((card) =>
          card.id === ticketId
            ? {
                ...card,
                stage: targetStageId,
                record: {
                  ...card.record,
                  stato: targetStageId,
                },
              }
            : card
        )
      )

      try {
        await updateRecord("ticket", ticketId, {
          stato: targetStageId,
        })
      } catch (caughtError) {
        setCards(previous)
        setError(caughtError instanceof Error ? caughtError.message : "Errore aggiornando ticket")
      }
    },
    [cards]
  )

  const patchTicket = React.useCallback(
    async (ticketId: string, patch: Partial<TicketRecord>) => {
      const previous = cards

      setCards((current) =>
        current.map((card) => {
          if (card.id !== ticketId) return card

          const nextRecord = { ...card.record, ...patch }
          const nextCard = mapRecordToCard(
            nextRecord,
            ticketType,
            rapportoIndexRef.current,
            stageAliasesRef.current
          )

          return nextCard ?? card
        })
      )

      try {
        await updateRecord("ticket", ticketId, patch as Record<string, unknown>)
      } catch (caughtError) {
        setCards(previous)
        setError(caughtError instanceof Error ? caughtError.message : "Errore aggiornando ticket")
      }
    },
    [cards, ticketType]
  )

  const createTicket = React.useCallback(
    async (input: CreateSupportTicketInput) => {
      const metadata: SupportTicketMetadata = {
        tag: input.tag,
        note: input.note,
        assegnatario: "",
      }

      try {
        const response = await createRecord("ticket", {
          allegati: [],
          causale: input.causale,
          data_apertura: new Date().toISOString(),
          rapporto_id: input.rapportoId,
          stato: SUPPORT_TICKET_STATUSES[0].id,
          tipo: input.tipo,
          urgenza: input.urgenza,
          metadati_migrazione: metadata,
        })

        const createdRecord = response.row as TicketRecord
        const nextCard = mapRecordToCard(
          createdRecord,
          ticketType,
          rapportoIndexRef.current,
          stageAliasesRef.current
        )

        if (nextCard) {
          setCards((current) => [nextCard, ...current])
        }
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Errore creazione ticket")
        throw caughtError
      }
    },
    [ticketType]
  )

  return {
    loading,
    error,
    stages,
    cards,
    activeRapportiCount,
    rapportoOptions,
    createTicket,
    moveTicket,
    patchTicket,
  }
}
