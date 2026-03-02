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

import { FamigliaProcessoDetailSidebar } from "@/components/crm/famiglia-processo-detail-sidebar"
import { FamigliaProcessoCard } from "@/components/crm/famiglia-processo-card"
import { Card, CardContent } from "@/components/ui/card"
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
        columnClassName: "border-red-300 bg-red-50/70",
        headerClassName: "border-b border-red-200/70",
        iconClassName: "text-red-500",
      }
    case "rose":
      return {
        columnClassName: "border-rose-300 bg-rose-50/70",
        headerClassName: "border-b border-rose-200/70",
        iconClassName: "text-rose-500",
      }
    case "orange":
      return {
        columnClassName: "border-orange-300 bg-orange-50/70",
        headerClassName: "border-b border-orange-200/70",
        iconClassName: "text-orange-500",
      }
    case "amber":
      return {
        columnClassName: "border-amber-300 bg-amber-50/70",
        headerClassName: "border-b border-amber-200/70",
        iconClassName: "text-amber-500",
      }
    case "yellow":
      return {
        columnClassName: "border-yellow-300 bg-yellow-50/70",
        headerClassName: "border-b border-yellow-200/70",
        iconClassName: "text-yellow-500",
      }
    case "lime":
      return {
        columnClassName: "border-lime-300 bg-lime-50/70",
        headerClassName: "border-b border-lime-200/70",
        iconClassName: "text-lime-500",
      }
    case "green":
      return {
        columnClassName: "border-green-300 bg-green-50/70",
        headerClassName: "border-b border-green-200/70",
        iconClassName: "text-green-500",
      }
    case "emerald":
      return {
        columnClassName: "border-emerald-300 bg-emerald-50/70",
        headerClassName: "border-b border-emerald-200/70",
        iconClassName: "text-emerald-500",
      }
    case "teal":
      return {
        columnClassName: "border-teal-300 bg-teal-50/70",
        headerClassName: "border-b border-teal-200/70",
        iconClassName: "text-teal-500",
      }
    case "cyan":
      return {
        columnClassName: "border-cyan-300 bg-cyan-50/70",
        headerClassName: "border-b border-cyan-200/70",
        iconClassName: "text-cyan-500",
      }
    case "sky":
      return {
        columnClassName: "border-sky-300 bg-sky-50/70",
        headerClassName: "border-b border-sky-200/70",
        iconClassName: "text-sky-500",
      }
    case "blue":
      return {
        columnClassName: "border-blue-300 bg-blue-50/70",
        headerClassName: "border-b border-blue-200/70",
        iconClassName: "text-blue-500",
      }
    case "indigo":
      return {
        columnClassName: "border-indigo-300 bg-indigo-50/70",
        headerClassName: "border-b border-indigo-200/70",
        iconClassName: "text-indigo-500",
      }
    case "violet":
      return {
        columnClassName: "border-violet-300 bg-violet-50/70",
        headerClassName: "border-b border-violet-200/70",
        iconClassName: "text-violet-500",
      }
    case "purple":
      return {
        columnClassName: "border-purple-300 bg-purple-50/70",
        headerClassName: "border-b border-purple-200/70",
        iconClassName: "text-purple-500",
      }
    case "fuchsia":
      return {
        columnClassName: "border-fuchsia-300 bg-fuchsia-50/70",
        headerClassName: "border-b border-fuchsia-200/70",
        iconClassName: "text-fuchsia-500",
      }
    case "pink":
      return {
        columnClassName: "border-pink-300 bg-pink-50/70",
        headerClassName: "border-b border-pink-200/70",
        iconClassName: "text-pink-500",
      }
    case "slate":
      return {
        columnClassName: "border-slate-300 bg-slate-50/70",
        headerClassName: "border-b border-slate-200/70",
        iconClassName: "text-slate-500",
      }
    case "gray":
      return {
        columnClassName: "border-gray-300 bg-gray-50/70",
        headerClassName: "border-b border-gray-200/70",
        iconClassName: "text-gray-500",
      }
    case "zinc":
      return {
        columnClassName: "border-zinc-300 bg-zinc-50/70",
        headerClassName: "border-b border-zinc-200/70",
        iconClassName: "text-zinc-500",
      }
    default:
      return {
        columnClassName: "border-border bg-muted/40",
        headerClassName: "border-b border-border/70",
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
  return (
    <div className="border-border bg-muted/40 w-[300px] shrink-0 rounded-xl border">
      <div className="space-y-1 border-b px-4 py-3">
        <div className="bg-muted h-5 w-32 animate-pulse rounded" />
        <div className="bg-muted h-4 w-16 animate-pulse rounded" />
      </div>
      <div className="space-y-3 p-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index} className="py-2">
            <CardContent className="space-y-2 px-3">
              <div className="bg-muted h-4 w-28 animate-pulse rounded" />
              <div className="bg-muted h-5 w-24 animate-pulse rounded-full" />
              <div className="space-y-1.5 border-t pt-2">
                <div className="bg-muted h-3 w-full animate-pulse rounded" />
                <div className="bg-muted h-3 w-11/12 animate-pulse rounded" />
                <div className="bg-muted h-3 w-8/12 animate-pulse rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
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
  suppressCardClickRef: React.MutableRefObject<boolean>
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
  suppressCardClickRef,
}: ColumnProps) {
  const visual = getColumnVisual(column.color)

  return (
    <div
      className={cn(
        "w-[300px] shrink-0 rounded-xl border transition-all duration-150",
        isDropTarget && "ring-primary/50 scale-[1.02] ring-2 shadow-md",
        visual.columnClassName
      )}
      onDragEnter={() => onDragEnterColumn(column.id)}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        onDragOverColumn(column.id)
      }}
      onDragLeave={onDragLeaveColumn}
      onDrop={(event) => {
        event.preventDefault()
        const droppedProcessId = event.dataTransfer.getData("text/plain") || null
        onDropToColumn(column.id, droppedProcessId)
      }}
    >
      <div className={cn("space-y-1 px-4 py-3", visual.headerClassName)}>
        <div className="flex items-start gap-2">
          <span className="pt-0.5">{getStageIcon(column.id, visual.iconClassName)}</span>
          <h2 className="text-foreground min-h-10 text-lg leading-5 font-semibold line-clamp-2">
            {column.label}
          </h2>
        </div>
        <p className="text-muted-foreground text-sm">
          {column.cards.length} {column.cards.length === 1 ? "ricerca" : "ricerche"}
        </p>
      </div>

      <div className="space-y-3 p-3">
        {column.cards.length === 0 ? (
          <div className="text-muted-foreground border-border/60 rounded-lg border border-dashed p-3 text-xs">
            Nessun contatto
          </div>
        ) : (
          column.cards.map((card) => (
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
                if (suppressCardClickRef.current) return
                onCardClick(card)
              }}
            >
              <FamigliaProcessoCard data={card} />
            </div>
          ))
        )}
      </div>
    </div>
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
  } =
    useCrmPipelinePreview()
  const [draggingProcessId, setDraggingProcessId] = React.useState<string | null>(
    null
  )
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(
    null
  )
  const [selectedCard, setSelectedCard] = React.useState<CrmPipelineCardData | null>(
    null
  )
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const suppressCardClickRef = React.useRef(false)

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
    <section className="w-full min-w-0 space-y-3">
      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento dati CRM: {error}
        </div>
      ) : null}

      <div className="w-full overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4">
              {loading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <CrmPipelineSkeletonColumn key={index} />
                  ))
                : columns.map((column) => (
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
                        suppressCardClickRef.current = true
                        setDraggingProcessId(processId)
                      }}
                      onDragEndCard={() => {
                        setDraggingProcessId(null)
                        setDropTargetColumnId(null)
                        setTimeout(() => {
                          suppressCardClickRef.current = false
                        }, 150)
                      }}
                      onCardClick={(card) => {
                        setSelectedCard(card)
                        setIsDetailOpen(true)
                      }}
                      suppressCardClickRef={suppressCardClickRef}
                    />
                  ))}
        </div>
      </div>

      <FamigliaProcessoDetailSidebar
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        card={selectedCard}
        lookupOptionsByField={lookupOptionsByField}
        onChangeStatoSales={async (processId, targetStageId) => {
          setSelectedCard((current) =>
            current && current.id === processId
              ? { ...current, stage: targetStageId }
              : current
          )
          await moveCard(processId, targetStageId)
        }}
        onPatchProcess={async (processId, patch) => {
          await updateProcessCard(processId, patch)
        }}
      />
    </section>
  )
}
