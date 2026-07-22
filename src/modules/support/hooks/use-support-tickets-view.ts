import * as React from "react"

import type { SupportTicketType } from "../lib"
import { SUPPORT_TICKET_TYPE_TITLE } from "../lib/support-tickets-view.constants"
import {
  buildSupportTicketColumns,
  filterSupportTicketCards,
  ticketBoardTestIdPrefix,
} from "../lib/support-tickets-view.utils"
import { useSupportTicketsBoard } from "./use-support-tickets-board"

export function useSupportTicketsView(ticketType: SupportTicketType) {
  const [search, setSearch] = React.useState("")
  const [stageFilter, setStageFilter] = React.useState("all")
  const [showClosedTickets, setShowClosedTickets] = React.useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [draggingTicketId, setDraggingTicketId] = React.useState<string | null>(null)
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)
  const [selectedTicketId, setSelectedTicketId] = React.useState<string | null>(null)

  const {
    loading,
    error,
    stages,
    cards,
    rapportoOptions,
    createTicket,
    moveTicket,
    patchTicket,
  } = useSupportTicketsBoard(ticketType)

  const filteredCards = React.useMemo(
    () => filterSupportTicketCards(cards, { search, stageFilter, showClosedTickets }),
    [cards, search, showClosedTickets, stageFilter],
  )

  const columns = React.useMemo(
    () => buildSupportTicketColumns(stages, cards, filteredCards, showClosedTickets),
    [cards, filteredCards, showClosedTickets, stages],
  )

  const selectedCard = React.useMemo(
    () => cards.find((card) => card.id === selectedTicketId) ?? null,
    [cards, selectedTicketId],
  )

  const boardTestIdPrefix = ticketBoardTestIdPrefix(ticketType)
  const totalTickets = filteredCards.length
  const showResetFilters = Boolean(search || stageFilter !== "all")

  const handleResetFilters = React.useCallback(() => {
    setSearch("")
    setStageFilter("all")
  }, [])

  const handleLoadDeferredColumn = React.useCallback((columnId: string) => {
    if (columnId === "chiuso") {
      setShowClosedTickets(true)
    }
  }, [])

  const handleDragEndTicket = React.useCallback(() => {
    window.setTimeout(() => {
      setDraggingTicketId(null)
      setDropTargetColumnId(null)
    }, 0)
  }, [])

  const handleDragLeaveColumn = React.useCallback(
    (columnId: string) => (event: React.DragEvent<HTMLDivElement>) => {
      const nextTarget = event.relatedTarget
      if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return
      setDropTargetColumnId((current) => (current === columnId ? null : current))
    },
    [],
  )

  const handleDropToColumn = React.useCallback(
    (columnId: string, ticketId: string | null) => {
      setDropTargetColumnId(null)
      setDraggingTicketId(null)
      if (!ticketId) return
      void moveTicket(ticketId, columnId)
    },
    [moveTicket],
  )

  const handleDetailOpenChange = React.useCallback((open: boolean) => {
    if (!open) setSelectedTicketId(null)
  }, [])

  return {
    ticketType,
    error,
    boardTestIdPrefix,
    header: {
      title: SUPPORT_TICKET_TYPE_TITLE[ticketType],
      subtitle: `${totalTickets} ticket`,
      search,
      setSearch,
      stageFilter,
      setStageFilter,
      stages,
      showResetFilters,
      onResetFilters: handleResetFilters,
      onOpenCreate: () => setIsCreateDialogOpen(true),
    },
    kanban: {
      loading,
      columns,
      boardTestIdPrefix,
      draggingTicketId,
      dropTargetColumnId,
      onOpenTicket: setSelectedTicketId,
      onLoadDeferredColumn: handleLoadDeferredColumn,
      onDragStartTicket: setDraggingTicketId,
      onDragEndTicket: handleDragEndTicket,
      onDragEnterColumn: setDropTargetColumnId,
      onDragOverColumn: setDropTargetColumnId,
      onDragLeaveColumn: handleDragLeaveColumn,
      onDropToColumn: handleDropToColumn,
    },
    createDialog: {
      open: isCreateDialogOpen,
      onOpenChange: setIsCreateDialogOpen,
      rapportoOptions,
      onCreateTicket: createTicket,
      dialogTestId: `${boardTestIdPrefix}-create-dialog`,
    },
    detailSheet: {
      selectedTicketId,
      card: selectedCard,
      stages,
      rapportoOptions,
      open: Boolean(selectedCard),
      onOpenChange: handleDetailOpenChange,
      onMoveTicket: moveTicket,
      onPatchTicket: patchTicket,
      sheetTestId: `${boardTestIdPrefix}-sheet-dialog`,
    },
  }
}
