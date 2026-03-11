import * as React from "react"
import {
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3Icon,
  MapPinIcon,
} from "lucide-react"

import type { AssegnazioneCardData } from "@/hooks/use-crm-assegnazione"
import { useCrmAssegnazione } from "@/hooks/use-crm-assegnazione"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { SideCardsPanel } from "@/components/shared/side-cards-panel"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

function formatBadgeLabel(value: string) {
  return value
    .replaceAll("-", " ")
    .replaceAll("/", " / ")
    .replace(/\s+/g, " ")
    .trim()
}

function getBadgeClassName(color: string | null | undefined) {
  switch ((color ?? "").toLowerCase()) {
    case "red":
      return "border-red-200 bg-red-100 text-red-700"
    case "rose":
      return "border-rose-200 bg-rose-100 text-rose-700"
    case "orange":
      return "border-orange-200 bg-orange-100 text-orange-700"
    case "amber":
      return "border-amber-200 bg-amber-100 text-amber-700"
    case "yellow":
      return "border-yellow-200 bg-yellow-100 text-yellow-700"
    case "lime":
      return "border-lime-200 bg-lime-100 text-lime-700"
    case "green":
      return "border-green-200 bg-green-100 text-green-700"
    case "emerald":
      return "border-emerald-200 bg-emerald-100 text-emerald-700"
    case "teal":
      return "border-teal-200 bg-teal-100 text-teal-700"
    case "cyan":
      return "border-cyan-200 bg-cyan-100 text-cyan-700"
    case "sky":
      return "border-sky-200 bg-sky-100 text-sky-700"
    case "blue":
      return "border-blue-200 bg-blue-100 text-blue-700"
    case "indigo":
      return "border-indigo-200 bg-indigo-100 text-indigo-700"
    case "violet":
      return "border-violet-200 bg-violet-100 text-violet-700"
    case "purple":
      return "border-purple-200 bg-purple-100 text-purple-700"
    case "fuchsia":
      return "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700"
    case "pink":
      return "border-pink-200 bg-pink-100 text-pink-700"
    case "slate":
      return "border-slate-200 bg-slate-100 text-slate-700"
    case "gray":
      return "border-gray-200 bg-gray-100 text-gray-700"
    case "zinc":
      return "border-zinc-200 bg-zinc-100 text-zinc-700"
    default:
      return "border-border bg-muted text-foreground"
  }
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(date)
}

function startOfWeekMonday(input: Date) {
  const date = new Date(input)
  const day = date.getDay()
  const delta = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + delta)
  date.setHours(0, 0, 0, 0)
  return date
}

function buildWeekDays(weekStart: Date) {
  return Array.from({ length: 5 }).map((_, index) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + index)
    return {
      key: toDateKey(date),
      date,
      label: formatDayLabel(date),
    }
  })
}

const HR_OPTIONS = [
  { id: "giulia", label: "Giulia", avatar: "G" },
  { id: "elisa", label: "Elisa", avatar: "E" },
  { id: "francesca", label: "Francesca", avatar: "F" },
] as const

type HrId = (typeof HR_OPTIONS)[number]["id"]
type AssigneeValue = HrId | "none"

function hashString(input: string) {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

function getAssigneeIdFromProcessId(processId: string): HrId {
  const index = hashString(processId) % HR_OPTIONS.length
  return HR_OPTIONS[index].id
}

function getHrById(assigneeId: HrId) {
  return HR_OPTIONS.find((option) => option.id === assigneeId) ?? HR_OPTIONS[0]
}

function getAssigneeAccentClass(assigneeId: AssigneeValue) {
  switch (assigneeId) {
    case "giulia":
      return "border-l-emerald-500"
    case "elisa":
      return "border-l-sky-500"
    case "francesca":
      return "border-l-violet-500"
    case "none":
      return "border-l-zinc-400"
    default:
      return "border-l-border"
  }
}

function getAssigneeAvatarBorderClass(assigneeId: AssigneeValue) {
  switch (assigneeId) {
    case "giulia":
      return "after:border-emerald-500"
    case "elisa":
      return "after:border-sky-500"
    case "francesca":
      return "after:border-violet-500"
    case "none":
      return "after:border-zinc-400"
    default:
      return ""
  }
}

function getAssigneeAvatarFallback(assigneeId: AssigneeValue) {
  if (assigneeId === "none") return "-"
  return getHrById(assigneeId).avatar
}

function AssegnazionePlaceholderSheet({
  open,
  onOpenChange,
  card,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: AssegnazioneCardData | null
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[680px]">
        <SheetHeader>
          <SheetTitle>{card?.nomeFamiglia ?? "Dettaglio ricerca"}</SheetTitle>
          <SheetDescription>
            Placeholder dettaglio ricerca. Qui collegheremo l&apos;onboarding nel
            prossimo step.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-3 px-4 pb-6">
          <Card>
            <CardContent className="space-y-2 pt-4 text-sm">
              <p>
                <span className="text-muted-foreground">Email:</span>{" "}
                {card?.email ?? "-"}
              </p>
              <p>
                <span className="text-muted-foreground">Telefono:</span>{" "}
                {card?.telefono ?? "-"}
              </p>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function AssegnazioneSearchCard({
  data,
  assigneeId,
  onAssigneeChange,
}: {
  data: AssegnazioneCardData
  assigneeId: AssigneeValue
  onAssigneeChange: (assigneeId: AssigneeValue) => void
}) {
  return (
    <Card
      className={cn(
        "cursor-pointer bg-white border border-border/70 border-l-4 py-2 transition-shadow hover:shadow-md",
        getAssigneeAccentClass(assigneeId)
      )}
    >
      <CardContent className="space-y-2 px-3">
        <p className="truncate text-sm font-semibold">{data.nomeFamiglia}</p>
        <div className="flex min-h-4 flex-col gap-1.5">
          {data.tipoLavoroBadge ? (
            <Badge
              variant="outline"
              className={`h-5 px-2 text-[11px] font-medium ${getBadgeClassName(
                data.tipoLavoroColor
              )}`}
            >
              <BriefcaseBusinessIcon data-icon="inline-start" />
              {formatBadgeLabel(data.tipoLavoroBadge)}
            </Badge>
          ) : null}
          {data.tipoRapportoBadge ? (
            <Badge
              variant="outline"
              className={`h-5 px-2 text-[11px] font-medium ${getBadgeClassName(
                data.tipoRapportoColor
              )}`}
            >
              <Clock3Icon data-icon="inline-start" />
              {formatBadgeLabel(data.tipoRapportoBadge)}
            </Badge>
          ) : null}
        </div>
        <div className="flex items-start justify-between gap-2 border-t pt-2">
          <div className="text-muted-foreground min-w-0 space-y-1 text-xs">
            <p className="flex items-center gap-1.5 truncate">
              <CalendarIcon className="size-3.5 shrink-0" />
              <span className="truncate">{data.deadline}</span>
            </p>
            <p className="flex items-center gap-1.5 truncate">
              <MapPinIcon className="size-3.5 shrink-0" />
              <span className="truncate">{data.zona}</span>
            </p>
          </div>
          <Select
            value={assigneeId}
            onValueChange={(value) => onAssigneeChange(value as AssigneeValue)}
          >
            <SelectTrigger
              className="h-6 w-6 rounded-full border-0 p-0 shadow-none [&>svg]:hidden"
              aria-label="Cambia assegnatario"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <SelectValue className="sr-only" />
              <Avatar
                size="sm"
                className={getAssigneeAvatarBorderClass(assigneeId)}
              >
                <AvatarFallback>{getAssigneeAvatarFallback(assigneeId)}</AvatarFallback>
              </Avatar>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="none">
                <span className="inline-flex items-center gap-2">
                  <Avatar size="sm" className={getAssigneeAvatarBorderClass("none")}>
                    <AvatarFallback>{getAssigneeAvatarFallback("none")}</AvatarFallback>
                  </Avatar>
                  <span>Nessuno</span>
                </span>
              </SelectItem>
              {HR_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  <span className="inline-flex items-center gap-2">
                    <Avatar
                      size="sm"
                      className={getAssigneeAvatarBorderClass(option.id)}
                    >
                      <AvatarFallback>{option.avatar}</AvatarFallback>
                    </Avatar>
                    <span>{option.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}

export function CrmAssegnazioneView() {
  const { loading, error, cards, assignCardToDate } = useCrmAssegnazione()
  const [currentWeekStart, setCurrentWeekStart] = React.useState(() =>
    startOfWeekMonday(new Date())
  )
  const [draggingProcessId, setDraggingProcessId] = React.useState<string | null>(
    null
  )
  const [dropTarget, setDropTarget] = React.useState<string | null>(null)
  const [selectedCard, setSelectedCard] = React.useState<AssegnazioneCardData | null>(
    null
  )
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)
  const [assigneesByProcessId, setAssigneesByProcessId] = React.useState<
    Record<string, AssigneeValue>
  >({})
  const suppressCardClickRef = React.useRef(false)

  const weeks = React.useMemo(() => {
    return [currentWeekStart].map((start) => ({
      id: 0,
      start,
      days: buildWeekDays(start),
      isCurrent: true,
    }))
  }, [currentWeekStart])

  const allDays = React.useMemo(
    () => weeks.flatMap((week) => week.days),
    [weeks]
  )

  const cardsByDate = React.useMemo(() => {
    const map = new Map<string, AssegnazioneCardData[]>()
    for (const day of allDays) {
      map.set(day.key, [])
    }
    for (const card of cards) {
      if (!card.dataAssegnazione) continue
      if (!map.has(card.dataAssegnazione)) continue
      map.get(card.dataAssegnazione)?.push(card)
    }
    return map
  }, [allDays, cards])

  const unassignedCards = React.useMemo(
    () => cards.filter((card) => !card.dataAssegnazione),
    [cards]
  )

  const getCardAssigneeId = React.useCallback(
    (processId: string): AssigneeValue =>
      assigneesByProcessId[processId] ?? getAssigneeIdFromProcessId(processId),
    [assigneesByProcessId]
  )

  const handleDrop = React.useCallback(
    (targetDate: string | null, droppedProcessId: string | null) => {
      const processId = droppedProcessId || draggingProcessId
      setDropTarget(null)
      setDraggingProcessId(null)
      if (!processId) return
      void assignCardToDate(processId, targetDate)
    },
    [assignCardToDate, draggingProcessId]
  )

  const handleOpenCardDetails = React.useCallback((card: AssegnazioneCardData) => {
    if (suppressCardClickRef.current) return
    setSelectedCard(card)
    setIsSheetOpen(true)
  }, [])

  return (
    <section className="w-full min-w-0 space-y-4">
      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento assegnazione: {error}
        </div>
      ) : null}

      <div className="h-[calc(100vh-7.5rem)] grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <SideCardsPanel
          title="Da assegnare"
          icon={CalendarDaysIcon}
          subtitle={
            loading
              ? "Caricamento..."
              : `${unassignedCards.length} ricerche senza giorno assegnato`
          }
          headerClassName="px-5"
          contentClassName="space-y-2 py-3 px-5"
          className={cn(
            "h-full",
            dropTarget === "UNASSIGNED" && "ring-primary/40 ring-2"
          )}
          onDragOver={(event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = "move"
            setDropTarget("UNASSIGNED")
          }}
          onDragLeave={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            const stillInside =
              event.clientX >= rect.left &&
              event.clientX <= rect.right &&
              event.clientY >= rect.top &&
              event.clientY <= rect.bottom
            if (stillInside) return
            setDropTarget(null)
          }}
          onDrop={(event) => {
            event.preventDefault()
            const droppedProcessId = event.dataTransfer.getData("text/plain") || null
            handleDrop(null, droppedProcessId)
          }}
        >
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-muted h-20 animate-pulse rounded-lg border"
                />
              ))}
            </div>
          ) : unassignedCards.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nessuna ricerca in stato da assegnare.
            </p>
          ) : (
            unassignedCards.map((card) => (
              <div
                key={card.id}
                draggable
                onClick={() => handleOpenCardDetails(card)}
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/plain", card.id)
                  event.dataTransfer.effectAllowed = "move"
                  suppressCardClickRef.current = true
                  setDraggingProcessId(card.id)
                }}
                onDragEnd={() => {
                  setDraggingProcessId(null)
                  setDropTarget(null)
                  setTimeout(() => {
                    suppressCardClickRef.current = false
                  }, 150)
                }}
                className={cn(
                  "cursor-grab transition-opacity active:cursor-grabbing",
                  draggingProcessId === card.id && "opacity-40"
                )}
              >
                <AssegnazioneSearchCard
                  data={card}
                  assigneeId={getCardAssigneeId(card.id)}
                  onAssigneeChange={(nextAssigneeId) => {
                    setAssigneesByProcessId((current) => ({
                      ...current,
                      [card.id]: nextAssigneeId,
                    }))
                  }}
                />
              </div>
            ))
          )}
        </SideCardsPanel>

        <div className="flex h-full flex-col gap-2 p-0">
          {weeks.map((week) => (
            <div
              key={toDateKey(week.start)}
              className="h-full rounded-lg border p-2"
            >
                <div className="grid h-full grid-cols-5 gap-2">
                  {week.days.map((day) => {
                    const dayCards = cardsByDate.get(day.key) ?? []
                    return (
                      <div
                        key={day.key}
                        className={cn(
                          "bg-muted/30 h-full min-h-0 rounded-lg border p-2 transition-all",
                          dropTarget === day.key && "ring-primary/40 ring-2"
                        )}
                        onDragOver={(event) => {
                          event.preventDefault()
                          event.dataTransfer.dropEffect = "move"
                          setDropTarget(day.key)
                        }}
                        onDragLeave={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect()
                          const stillInside =
                            event.clientX >= rect.left &&
                            event.clientX <= rect.right &&
                            event.clientY >= rect.top &&
                            event.clientY <= rect.bottom
                          if (stillInside) return
                          setDropTarget(null)
                        }}
                        onDrop={(event) => {
                          event.preventDefault()
                          const droppedProcessId =
                            event.dataTransfer.getData("text/plain") || null
                          handleDrop(day.key, droppedProcessId)
                        }}
                      >
                        <div className="mb-2 border-b pb-2">
                          <p className="text-xs font-semibold">{day.label}</p>
                          <p className="text-muted-foreground text-[11px]">
                            {dayCards.length}{" "}
                            {dayCards.length === 1 ? "ricerca" : "ricerche"}
                          </p>
                        </div>

                        <div className="space-y-2">
                          {dayCards.length === 0 ? (
                            <p className="text-muted-foreground text-xs">
                              Nessuna assegnazione
                            </p>
                          ) : (
                            dayCards.map((card) => (
                              <div
                                key={card.id}
                                draggable
                                onClick={() => handleOpenCardDetails(card)}
                                onDragStart={(event) => {
                                  event.dataTransfer.setData("text/plain", card.id)
                                  event.dataTransfer.effectAllowed = "move"
                                  suppressCardClickRef.current = true
                                  setDraggingProcessId(card.id)
                                }}
                                onDragEnd={() => {
                                  setDraggingProcessId(null)
                                  setDropTarget(null)
                                  setTimeout(() => {
                                    suppressCardClickRef.current = false
                                  }, 150)
                                }}
                                className={cn(
                                  "cursor-grab transition-opacity active:cursor-grabbing",
                                  draggingProcessId === card.id && "opacity-40"
                                )}
                              >
                                <AssegnazioneSearchCard
                                  data={card}
                                  assigneeId={getCardAssigneeId(card.id)}
                                  onAssigneeChange={(nextAssigneeId) => {
                                    setAssigneesByProcessId((current) => ({
                                      ...current,
                                      [card.id]: nextAssigneeId,
                                    }))
                                  }}
                                />
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
            </div>
          ))}
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => {
                const next = new Date(currentWeekStart)
                next.setDate(next.getDate() - 7)
                setCurrentWeekStart(next)
              }}
              aria-label="Settimana precedente"
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => {
                const next = new Date(currentWeekStart)
                next.setDate(next.getDate() + 7)
                setCurrentWeekStart(next)
              }}
              aria-label="Settimana successiva"
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>
      <AssegnazionePlaceholderSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        card={selectedCard}
      />
    </section>
  )
}
