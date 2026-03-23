import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon, CircleDotIcon } from "lucide-react"

import { OnboardingCard } from "@/components/crm/cards/onboarding-card"
import { LavoratoreCard } from "@/components/lavoratori/lavoratore-card"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getTagClassName } from "@/features/lavoratori/lib/lookup-utils"
import {
  getLookupDropZoneActiveClassName,
  getLookupDropZoneClassName,
  getLookupPanelClassName,
  getLookupToneTextClassName,
} from "@/lib/lookup-color-styles"
import { cn } from "@/lib/utils"
import {
  type CrmPipelineCardData,
  type LookupOptionsByField,
} from "@/hooks/use-crm-pipeline-preview"
import {
  type RicercaWorkerSelectionColumn,
  useRicercaWorkersPipeline,
} from "@/hooks/use-ricerca-workers-pipeline"

type RicercaWorkersPipelineViewProps = {
  processId: string
  card: CrmPipelineCardData
  lookupOptionsByField: LookupOptionsByField
  onPatchProcess: (processId: string, patch: Record<string, unknown>) => Promise<void>
  className?: string
}

function normalizeToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
}

type GroupedColumnGroup = {
  key: string
  label: string
  dropStatusId: string
}

const CANDIDATI_GROUPS: GroupedColumnGroup[] = [
  {
    key: "candidato - good fit",
    label: "Good fit",
    dropStatusId: "Candidato - Good fit",
  },
  {
    key: "prospetto",
    label: "Prospetto",
    dropStatusId: "Prospetto",
  },
  {
    key: "candidato - poor fit",
    label: "Poor fit",
    dropStatusId: "Candidato - Poor fit",
  },
] as const

const ARCHIVIO_GROUPS: GroupedColumnGroup[] = [
  {
    key: "non risponde",
    label: "Non risponde",
    dropStatusId: "Non risponde",
  },
  {
    key: "no match",
    label: "No match",
    dropStatusId: "No match",
  },
  {
    key: "archivio",
    label: "Archivio",
    dropStatusId: "Archivio",
  },
  {
    key: "non selezionato",
    label: "Non selezionato",
    dropStatusId: "Non selezionato",
  },
  {
    key: "nascosto - oot",
    label: "Nascosto - OOT",
    dropStatusId: "Nascosto - OOT",
  },
]

const COLLOQUI_MATCH_GROUPS: GroupedColumnGroup[] = [
  {
    key: "colloquio schedulato",
    label: "Colloquio schedulato",
    dropStatusId: "Colloquio schedulato",
  },
  {
    key: "colloquio fatto",
    label: "Colloquio fatto",
    dropStatusId: "Colloquio fatto",
  },
  {
    key: "prova con cliente",
    label: "Prova con cliente",
    dropStatusId: "Prova con cliente",
  },
  {
    key: "match",
    label: "Match",
    dropStatusId: "Match",
  },
]

const GROUPED_COLUMN_GROUPS: Record<string, GroupedColumnGroup[]> = {
  __candidati__: CANDIDATI_GROUPS,
  __archivio__: ARCHIVIO_GROUPS,
  __colloqui_match__: COLLOQUI_MATCH_GROUPS,
}

function resolveGroupColor(
  column: RicercaWorkerSelectionColumn,
  group: GroupedColumnGroup
) {
  return column.groupColors?.[normalizeToken(group.key)] ?? null
}

const WorkerPipelineColumn = React.memo(function WorkerPipelineColumn({
  column,
  isDropTarget,
  activeGroupDropId,
  draggingSelectionId,
  onDragEnterColumn,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropToColumn,
  onDragStartCard,
  onDragEndCard,
}: {
  column: RicercaWorkerSelectionColumn
  isDropTarget: boolean
  activeGroupDropId: string | null
  draggingSelectionId: string | null
  onDragEnterColumn: (columnId: string) => void
  onDragOverColumn: (columnId: string) => void
  onDragLeaveColumn: (event: React.DragEvent<HTMLDivElement>) => void
  onDropToColumn: (columnId: string, selectionId: string | null) => void
  onDragStartCard: (selectionId: string) => void
  onDragEndCard: () => void
}) {
  const groups = GROUPED_COLUMN_GROUPS[column.id] ?? null
  const isGroupedColumn = Boolean(groups)
  const showDropZones = isGroupedColumn && Boolean(draggingSelectionId)

  return (
    <div
      className={cn(
        "relative flex h-full w-[320px] shrink-0 flex-col rounded-xl border transition-all duration-150",
        getLookupPanelClassName(column.color),
        isDropTarget && "ring-primary/50 ring-2 shadow-md"
      )}
      onDragEnter={() => {
        if (isGroupedColumn) return
        onDragEnterColumn(column.id)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
        if (isGroupedColumn) return
        onDragOverColumn(column.id)
      }}
      onDragLeave={onDragLeaveColumn}
      onDrop={(event) => {
        event.preventDefault()
        if (isGroupedColumn) return
        const droppedSelectionId = event.dataTransfer.getData("text/plain") || null
        onDropToColumn(column.dropStatusId ?? column.id, droppedSelectionId)
      }}
    >
      {groups ? (
        <div
          className={cn(
            "absolute inset-0 z-20 flex flex-col gap-2 rounded-xl p-2 transition-opacity",
            showDropZones
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          )}
        >
          {groups.map((group) => {
            const groupDropId = `${column.id}::${group.key}`
            const isGroupDropTarget = activeGroupDropId === groupDropId
            const groupColor = resolveGroupColor(column, group)

            return (
              <div
                key={group.key}
                onDragEnter={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  onDragEnterColumn(groupDropId)
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  event.dataTransfer.dropEffect = "move"
                  onDragOverColumn(groupDropId)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  const droppedSelectionId = event.dataTransfer.getData("text/plain") || null
                  onDropToColumn(group.dropStatusId, droppedSelectionId)
                }}
                className={cn(
                  "flex min-h-0 flex-1 items-center justify-center rounded-md border-2 border-dashed transition-transform transition-colors duration-150",
                  getLookupDropZoneClassName(groupColor),
                  isGroupDropTarget &&
                    cn(getLookupDropZoneActiveClassName(groupColor), "scale-[1.03]")
                )}
              >
                <Badge variant="outline" className={getTagClassName(groupColor)}>
                  {group.label}
                </Badge>
              </div>
            )
          })}
        </div>
      ) : null}

      <div className="space-y-1 border-b px-4 py-3">
        <div className="flex items-start gap-2">
          <CircleDotIcon className="text-muted-foreground size-4 pt-0.5" />
          <h3 className="min-h-10 text-lg leading-5 font-semibold line-clamp-2">
            {column.label}
          </h3>
        </div>
        <p className="text-muted-foreground text-sm">
          {column.cards.length} {column.cards.length === 1 ? "lavoratore" : "lavoratori"}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {column.cards.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed border-border/60 p-3 text-xs">
            Nessun lavoratore
          </div>
        ) : groups ? (
          <Accordion
            type="multiple"
            defaultValue={groups.map((group) => group.key)}
            className="gap-2"
          >
            {groups.map((group) => {
              const groupCards = column.cards.filter(
                (card) => normalizeToken(card.status) === group.key
              )
              const groupColor = resolveGroupColor(column, group)

              return (
                <AccordionItem
                  key={group.key}
                  value={group.key}
                  className="not-last:border-0 bg-transparent"
                >
                  <AccordionTrigger
                    className={cn(
                      "py-2 text-sm font-semibold no-underline hover:no-underline",
                      getLookupToneTextClassName(groupColor)
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Badge variant="outline" className={getTagClassName(groupColor)}>
                        {group.label}
                      </Badge>
                      <span className="text-muted-foreground font-normal">
                        ({groupCards.length})
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pt-1">
                    {groupCards.length === 0 ? (
                      <div className="text-muted-foreground rounded-md border border-dashed border-border/60 p-2 text-xs">
                        Nessun lavoratore
                      </div>
                    ) : (
                      groupCards.map((card) => (
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
                            draggingSelectionId === card.id && "opacity-40"
                          )}
                        >
                          <LavoratoreCard
                            worker={card.worker}
                            isActive={false}
                            onClick={() => {}}
                          />
                        </div>
                      ))
                    )}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
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
                draggingSelectionId === card.id && "opacity-40"
              )}
            >
              <LavoratoreCard worker={card.worker} isActive={false} onClick={() => {}} />
            </div>
          ))
        )}
      </div>
    </div>
  )
})

export function RicercaWorkersPipelineView({
  processId,
  card,
  lookupOptionsByField,
  onPatchProcess,
  className,
}: RicercaWorkersPipelineViewProps) {
  const { loading, error, columns, moveCard } = useRicercaWorkersPipeline(processId)
  const [isOnboardingCollapsed, setIsOnboardingCollapsed] = React.useState(false)
  const [draggingSelectionId, setDraggingSelectionId] = React.useState<string | null>(
    null
  )
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<string | null>(null)
  const updateDropTargetColumnId = React.useCallback((next: string | null) => {
    setDropTargetColumnId((current) => (current === next ? current : next))
  }, [])

  const handleDropToColumn = React.useCallback(
    (columnId: string, droppedSelectionId: string | null) => {
      const selectionId = droppedSelectionId || draggingSelectionId
      setDropTargetColumnId(null)
      setDraggingSelectionId(null)
      if (!selectionId) return
      void moveCard(selectionId, columnId)
    },
    [draggingSelectionId, moveCard]
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
      updateDropTargetColumnId(null)
    },
    [updateDropTargetColumnId]
  )

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      {loading ? <span className="text-muted-foreground text-xs">Caricamento...</span> : null}

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Errore caricamento pipeline lavoratori: {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2">
        <div className="flex h-full min-h-0 min-w-max gap-4">
          <div
            className={cn(
              "flex h-full min-h-0 shrink-0 pt-2",
              isOnboardingCollapsed ? "w-10" : "w-[420px]"
            )}
          >
            <div className="bg-background/90 flex h-full w-10 shrink-0 items-start justify-center rounded-lg border">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={
                  isOnboardingCollapsed ? "Espandi onboarding" : "Comprimi onboarding"
                }
                title={isOnboardingCollapsed ? "Espandi onboarding" : "Comprimi onboarding"}
                onClick={() => setIsOnboardingCollapsed((current) => !current)}
              >
                {isOnboardingCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
              </Button>
            </div>

            {!isOnboardingCollapsed ? (
              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 pl-2">
                <OnboardingCard
                  card={card}
                  lookupOptionsByField={lookupOptionsByField}
                  showTitle={false}
                  showTempistiche={false}
                  onPatchProcess={async (_, patch) => {
                    await onPatchProcess(processId, patch)
                  }}
                />
              </div>
            ) : null}
          </div>

          {columns.map((column) => (
            <WorkerPipelineColumn
              key={column.id}
              column={column}
              isDropTarget={
                dropTargetColumnId === column.id ||
                dropTargetColumnId?.startsWith(`${column.id}::`) === true
              }
              activeGroupDropId={
                dropTargetColumnId?.startsWith(`${column.id}::`)
                  ? dropTargetColumnId
                  : null
              }
              draggingSelectionId={draggingSelectionId}
              onDragEnterColumn={updateDropTargetColumnId}
              onDragOverColumn={updateDropTargetColumnId}
              onDragLeaveColumn={handleDragLeaveColumn}
              onDropToColumn={handleDropToColumn}
              onDragStartCard={setDraggingSelectionId}
              onDragEndCard={() => {
                setDraggingSelectionId(null)
                setDropTargetColumnId(null)
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
