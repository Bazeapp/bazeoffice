import * as React from "react"
import {
  BanIcon,
  CalendarClockIcon,
  CalendarPlusIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  CircleXIcon,
  Clock3Icon,
  FlameIcon,
  PhoneCallIcon,
  PhoneForwardedIcon,
  SnowflakeIcon,
  TrophyIcon,
  UserRoundXIcon,
} from "lucide-react"

import { FamigliaProcessoDetailShell } from "@/components/crm/famiglia-processo-detail-shell"
import { FamigliaProcessoCard } from "@/components/crm/famiglia-processo-card"
import { KanbanColumnShell, KanbanColumnSkeleton } from "@/components/shared-next/kanban"
import { SectionHeader } from "@/components/shared-next/section-header"
import { Badge } from "@/components/ui/badge"
import { SearchInput } from "@/components/ui/search-input"
import {
  type CrmPipelineCardData,
  type CrmPipelineColumnData,
  useCrmPipelinePreview,
} from "@/hooks/use-crm-pipeline-preview"
import { cn } from "@/lib/utils"

type ColumnVisual = {
  columnClassName: string
  headerClassName: string
  iconClassName: string
}

function getColumnVisual(color: string | null): ColumnVisual {
  switch ((color ?? "").toLowerCase()) {
    case "red":
      return {
        columnClassName: "bg-red-400",
        headerClassName: "",
        iconClassName: "text-red-500",
      }
    case "rose":
      return {
        columnClassName: "bg-rose-400",
        headerClassName: "",
        iconClassName: "text-rose-500",
      }
    case "orange":
      return {
        columnClassName: "bg-orange-400",
        headerClassName: "",
        iconClassName: "text-orange-500",
      }
    case "amber":
      return {
        columnClassName: "bg-amber-400",
        headerClassName: "",
        iconClassName: "text-amber-500",
      }
    case "yellow":
      return {
        columnClassName: "bg-yellow-400",
        headerClassName: "",
        iconClassName: "text-yellow-500",
      }
    case "lime":
      return {
        columnClassName: "bg-lime-400",
        headerClassName: "",
        iconClassName: "text-lime-500",
      }
    case "green":
      return {
        columnClassName: "bg-green-400",
        headerClassName: "",
        iconClassName: "text-green-500",
      }
    case "emerald":
      return {
        columnClassName: "bg-emerald-400",
        headerClassName: "",
        iconClassName: "text-emerald-500",
      }
    case "teal":
      return {
        columnClassName: "bg-teal-400",
        headerClassName: "",
        iconClassName: "text-teal-500",
      }
    case "cyan":
      return {
        columnClassName: "bg-cyan-400",
        headerClassName: "",
        iconClassName: "text-cyan-500",
      }
    case "sky":
      return {
        columnClassName: "bg-sky-400",
        headerClassName: "",
        iconClassName: "text-sky-500",
      }
    case "blue":
      return {
        columnClassName: "bg-blue-400",
        headerClassName: "",
        iconClassName: "text-blue-500",
      }
    case "indigo":
      return {
        columnClassName: "bg-indigo-400",
        headerClassName: "",
        iconClassName: "text-indigo-500",
      }
    case "violet":
      return {
        columnClassName: "bg-violet-400",
        headerClassName: "",
        iconClassName: "text-violet-500",
      }
    case "purple":
      return {
        columnClassName: "bg-purple-400",
        headerClassName: "",
        iconClassName: "text-purple-500",
      }
    case "fuchsia":
      return {
        columnClassName: "bg-fuchsia-400",
        headerClassName: "",
        iconClassName: "text-fuchsia-500",
      }
    case "pink":
      return {
        columnClassName: "bg-pink-400",
        headerClassName: "",
        iconClassName: "text-pink-500",
      }
    case "slate":
      return {
        columnClassName: "bg-slate-400",
        headerClassName: "",
        iconClassName: "text-slate-500",
      }
    case "gray":
      return {
        columnClassName: "bg-gray-400",
        headerClassName: "",
        iconClassName: "text-gray-500",
      }
    case "zinc":
      return {
        columnClassName: "bg-zinc-400",
        headerClassName: "",
        iconClassName: "text-zinc-500",
      }
    default:
      return {
        columnClassName: "",
        headerClassName: "",
        iconClassName: "text-muted-foreground/80",
      }
  }
}

function getStageIcon(stageId: string, iconClassName: string) {
  const className = cn("size-4", iconClassName)

  switch (stageId) {
    case "warm_lead":
      return <FlameIcon className={className} />
    case "hot_ingresso":
      return <PhoneForwardedIcon className={className} />
    case "hot_in_attesa_di_primo_contatto":
      return <Clock3Icon className={className} />
    case "hot_contatto_avvenuto":
      return <PhoneCallIcon className={className} />
    case "hot_callback_programmato":
      return <CalendarClockIcon className={className} />
    case "hot_decisione_rimandata":
      return <Clock3Icon className={className} />
    case "hot_call_attivazione_prenotata":
      return <CalendarPlusIcon className={className} />
    case "hot_call_attivazione_fatta":
      return <CheckCircle2Icon className={className} />
    case "hot_follow_up_post_call":
      return <CalendarClockIcon className={className} />
    case "hot_no_show":
      return <UserRoundXIcon className={className} />
    case "cold_ricerca_futura":
      return <SnowflakeIcon className={className} />
    case "won_ricerca_attivata":
      return <TrophyIcon className={className} />
    case "lost":
      return <CircleXIcon className={className} />
    case "out_of_target":
      return <BanIcon className={className} />
    default:
      return <CircleDotIcon className={className} />
  }
}

function CrmPipelineSkeletonColumn() {
  return <KanbanColumnSkeleton widthClassName="w-73" showBadgeRow />
}

type ColumnProps = {
  column: CrmPipelineColumnData
  isDropTarget: boolean
  draggingProcessId: string | null
  onDragEnterColumn: (columnId: string) => void
  onDragOverColumn: (columnId: string) => void
  onDragLeaveColumn: (event: React.DragEvent<HTMLDivElement>) => void
  onDropToColumn: (columnId: string, processId: string | null) => void
  onDragStartCard: (processId: string) => void
  onDragEndCard: () => void
  onCardClick: (card: CrmPipelineCardData) => void
}

function Column({
  column,
  isDropTarget,
  draggingProcessId,
  onDragEnterColumn,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropToColumn,
  onDragStartCard,
  onDragEndCard,
  onCardClick,
}: ColumnProps) {
  const visual = getColumnVisual(column.color)

  return (
    <KanbanColumnShell
      columnId={column.id}
      title={column.label}
      countLabel={`${column.totalCount} ${column.totalCount === 1 ? "ricerca" : "ricerche"}`}
      visual={visual}
      headerIcon={getStageIcon(column.id, visual.iconClassName)}
      widthClassName="w-73"
      isDropTarget={isDropTarget}
      emptyMessage="Nessuna ricerca"
      onDragEnter={onDragEnterColumn}
      onDragOver={onDragOverColumn}
      onDragLeave={onDragLeaveColumn}
      onDrop={onDropToColumn}
    >
      {column.cards.map((card) => (
        <div
          key={card.id}
          draggable
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", card.id)
            event.dataTransfer.effectAllowed = "move"
            onDragStartCard(card.id)
          }}
          onDragEnd={onDragEndCard}
          className={cn(
            "cursor-grab transition-opacity active:cursor-grabbing",
            draggingProcessId === card.id && "opacity-40"
          )}
          onClick={() => {
            onCardClick(card)
          }}
        >
          <FamigliaProcessoCard data={card} />
        </div>
      ))}
    </KanbanColumnShell>
  )
}

export function CrmPipelineFamiglieView() {
  const {
    loading,
    error,
    columns,
    lookupOptionsByField,
    moveCard,
    updateProcessCard,
    updateFamilyCard,
  } =
    useCrmPipelinePreview()
  const [draggingProcessId, setDraggingProcessId] = React.useState<string | null>(
    null
  )
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(
    null
  )
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredColumns = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return columns
    return columns.map((column) => {
      const filteredCards = column.cards.filter((card) =>
        [card.nomeFamiglia, card.email, card.telefono].some((field) =>
          field?.toLowerCase().includes(q)
        )
      )

      return {
        ...column,
        totalCount: filteredCards.length,
        cards: filteredCards,
      }
    })
  }, [columns, searchQuery])

  const totalRicerche = React.useMemo(
    () =>
      filteredColumns.reduce((sum, column) => sum + column.totalCount, 0),
    [filteredColumns]
  )

  const selectedCard = React.useMemo(() => {
    if (!selectedCardId) return null
    for (const column of columns) {
      const matched = column.cards.find((card) => card.id === selectedCardId)
      if (matched) return matched
    }
    return null
  }, [columns, selectedCardId])

  const handleDropToColumn = React.useCallback(
    (columnId: string, droppedProcessId: string | null) => {
      const processId = droppedProcessId || draggingProcessId
      setDropTargetColumnId(null)
      setDraggingProcessId(null)
      if (!processId) return
      void moveCard(processId, columnId)
    },
    [draggingProcessId, moveCard]
  )

  const handleDragLeaveColumn = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      const stillInside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom

      if (stillInside) return
      setDropTargetColumnId(null)
    },
    []
  )

  return (
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col gap-3 overflow-hidden">
      <SectionHeader>
        <SectionHeader.Title
          badge={
            <Badge>
              {totalRicerche} {totalRicerche === 1 ? "ricerca" : "ricerche"}
            </Badge>
          }
        >
          Sales Pipeline
        </SectionHeader.Title>
        <SectionHeader.Toolbar>
          <div className="min-w-0 flex-1 max-w-105">
            <SearchInput
              placeholder="Cerca famiglia, email, telefono..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onClear={() => setSearchQuery("")}
            />
          </div>
        </SectionHeader.Toolbar>
      </SectionHeader>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento dati CRM: {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full min-w-max gap-4 px-6">
              {loading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <CrmPipelineSkeletonColumn key={index} />
                  ))
                : filteredColumns.map((column) => (
                    <Column
                      key={column.id}
                      column={column}
                      isDropTarget={dropTargetColumnId === column.id}
                      draggingProcessId={draggingProcessId}
                      onDragEnterColumn={setDropTargetColumnId}
                      onDragOverColumn={setDropTargetColumnId}
                      onDragLeaveColumn={handleDragLeaveColumn}
                      onDropToColumn={handleDropToColumn}
                      onDragStartCard={(processId) => {
                        setDraggingProcessId(processId)
                      }}
                      onDragEndCard={() => {
                        setDraggingProcessId(null)
                        setDropTargetColumnId(null)
                      }}
                      onCardClick={(card) => {
                        setSelectedCardId(card.id)
                        setIsDetailOpen(true)
                      }}
                    />
                  ))}
        </div>
      </div>

      <FamigliaProcessoDetailShell
        mode="sheet"
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open)
          if (!open) {
            setSelectedCardId(null)
          }
        }}
        card={selectedCard}
        lookupOptionsByField={lookupOptionsByField}
        onChangeStatoSales={moveCard}
        onPatchProcess={async (processId, patch) => {
          await updateProcessCard(processId, patch)
        }}
        onPatchFamily={async (familyId, patch) => {
          await updateFamilyCard(familyId, patch)
        }}
      />
    </section>
  )
}
