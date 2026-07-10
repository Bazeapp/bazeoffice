import * as React from "react"

import { useQuery } from "@tanstack/react-query"

import { useBoardQueryCache } from "@/hooks/use-board-query-cache"
import {
  useMoveMutation,
  usePatchMutation,
} from "@/hooks/use-board-mutations"
import { createRecord, updateRecord } from "@/lib/record-crud"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import type { TicketRecord } from "@/types"

import type { SupportTicketBoardCardData } from "../types"
import {
  SUPPORT_TICKET_STATUSES,
  type SupportTicketMetadata,
  type SupportTicketStatusDefinition,
  type SupportTicketTag,
  type SupportTicketType,
  type SupportTicketUrgency,
} from "../lib"
import {
  buildEmptySupportTicketsLinkedRecordIndexes,
  buildSupportTicketsRapportoIndex,
  fetchSupportTicketsBoardData,
  mapSupportTicketRecordToCard,
  type SupportTicketsBoardData,
} from "../lib/support-tickets-board.utils"

// The board's primary entity is the ticket; linked records are contextual, so
// we subscribe only to `ticket` to avoid refetching on unrelated table churn.
const SUPPORT_TICKETS_REALTIME_TABLES = ["ticket"]

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

export function useSupportTicketsBoard(ticketType: SupportTicketType): UseSupportTicketsBoardState {
  const boardQueryKey = React.useMemo(
    () => ["support-tickets-board", ticketType] as const,
    [ticketType],
  )

  const {
    data,
    isLoading: loading,
    error: queryError,
  } = useQuery<SupportTicketsBoardData>({
    queryKey: boardQueryKey,
    queryFn: () => fetchSupportTicketsBoardData(ticketType),
  })

  const stages = data?.stages ?? []
  const cards = data?.cards ?? []
  const activeRapportiCount = data?.activeRapportiCount ?? 0
  const rapportoOptions = data?.rapportoOptions ?? []
  const rapportoIndex = data?.rapportoIndex ?? buildSupportTicketsRapportoIndex([])
  const chiusuraIndex = data?.chiusuraIndex ?? new Map()
  const linkedRecordIndexes =
    data?.linkedRecordIndexes ?? buildEmptySupportTicketsLinkedRecordIndexes()
  const stageAliases = React.useMemo(
    () => data?.stageAliases ?? new Map<string, string>(),
    [data?.stageAliases],
  )

  const { setBoardData, invalidateBoard } = useBoardQueryCache<SupportTicketsBoardData>(
    boardQueryKey,
  )

  useRealtimeBoardSync({
    tables: SUPPORT_TICKETS_REALTIME_TABLES,
    reload: invalidateBoard,
  })

  const moveMutation = useMoveMutation<
    { ticketId: string; targetStageId: string },
    unknown,
    SupportTicketsBoardData
  >({
    queryKey: boardQueryKey,
    mutationFn: ({ ticketId, targetStageId }) =>
      updateRecord("ticket", ticketId, { stato: targetStageId }),
    applyOptimistic: (previous, { ticketId, targetStageId }) => {
      if (!previous) return previous
      return {
        ...previous,
        cards: previous.cards.map((card) =>
          card.id === ticketId
            ? {
                ...card,
                stage: targetStageId,
                record: { ...card.record, stato: targetStageId },
              }
            : card,
        ),
      }
    },
  })

  const moveTicket = React.useCallback(
    async (ticketId: string, targetStageId: string) => {
      await moveMutation.mutateAsync({ ticketId, targetStageId })
    },
    [moveMutation],
  )

  const patchMutation = usePatchMutation<
    { ticketId: string; patch: Partial<TicketRecord> },
    unknown,
    SupportTicketsBoardData
  >({
    queryKey: boardQueryKey,
    mutationFn: ({ ticketId, patch }) =>
      updateRecord("ticket", ticketId, patch as Record<string, unknown>),
    applyOptimistic: (previous, { ticketId, patch }) => {
      if (!previous) return previous
      return {
        ...previous,
        cards: previous.cards.map((card) => {
          if (card.id !== ticketId) return card
          const nextRecord = { ...card.record, ...patch }
          const nextCard = mapSupportTicketRecordToCard(
            nextRecord,
            ticketType,
            previous.rapportoIndex,
            previous.chiusuraIndex,
            previous.linkedRecordIndexes,
            previous.stageAliases,
          )
          return nextCard ?? card
        }),
      }
    },
  })

  const patchTicket = React.useCallback(
    async (ticketId: string, patch: Partial<TicketRecord>) => {
      await patchMutation.mutateAsync({ ticketId, patch })
    },
    [patchMutation],
  )

  const createTicket = React.useCallback(
    async (input: CreateSupportTicketInput) => {
      const metadata: SupportTicketMetadata = {
        tag: input.tag,
        note: input.note,
        assegnatario: "",
      }

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
      const nextCard = mapSupportTicketRecordToCard(
        createdRecord,
        ticketType,
        rapportoIndex,
        chiusuraIndex,
        linkedRecordIndexes,
        stageAliases,
      )

      if (nextCard) {
        setBoardData((previous) => {
          if (!previous) return previous
          return { ...previous, cards: [nextCard, ...previous.cards] }
        })
      }

      invalidateBoard()
    },
    [
      ticketType,
      rapportoIndex,
      chiusuraIndex,
      linkedRecordIndexes,
      stageAliases,
      setBoardData,
      invalidateBoard,
    ],
  )

  const error =
    moveMutation.error instanceof Error
      ? moveMutation.error.message
      : patchMutation.error instanceof Error
        ? patchMutation.error.message
        : queryError instanceof Error
          ? queryError.message
          : null

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
