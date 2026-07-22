import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckboxChip } from "@/components/ui/checkbox"
import { matchesSearchQuery } from "@/lib/search-utils"
import { cn } from "@/lib/utils"
import {
  addDays,
  formatTime,
  getCalendarEventStatusKey,
  getCalendarStatusRailClassName,
  getEventDate,
  isSameDate,
  startOfWeek,
  toDateRangeValue,
  type CalendarStatusKey,
} from "../lib"
import {
  CALENDAR_KIND_OPTIONS,
  CALENDAR_STATUS_OPTIONS,
  type CalendarEventKind,
} from "../lib/prove-colloqui-view.constants"
import type { CalendarDateRange, ColloquioCalendarEvent } from "../types"

export type ProveColloquiCalendarProps = {
  events: ColloquioCalendarEvent[]
  searchQuery: string
  onEventClick: (event: ColloquioCalendarEvent) => void
  onVisibleRangeChange: (range: CalendarDateRange) => void
}

function CalendarEventButton({
  event,
  compact = false,
  onClick,
}: {
  event: ColloquioCalendarEvent
  compact?: boolean
  onClick: () => void
}) {
  const isColloquio = event.type === "colloquio"
  const avatarUrl = isColloquio ? event.workerAvatarUrl : event.card.workerAvatarUrl
  const workerLabel = isColloquio
    ? [event.lavoratore?.nome, event.lavoratore?.cognome].filter(Boolean).join(" ") || "Lavoratore"
    : event.card.lavoratoreLabel
  const familyLabel = isColloquio
    ? [event.famiglia?.nome, event.famiglia?.cognome].filter(Boolean).join(" ") ||
      event.famiglia?.email ||
      "Famiglia"
    : event.card.famigliaLabel
  const timeLabel = formatTime(event.start)
  const statusRailClassName = getCalendarStatusRailClassName(getCalendarEventStatusKey(event))

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`prove-colloqui-event-${event.id}`}
      className={cn(
        "relative w-full overflow-hidden rounded-md border bg-white px-2 py-1.5 pl-3 text-left text-xs text-foreground transition hover:border-border hover:bg-white",
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", statusRailClassName)} />
      <div className="mb-1.5 flex min-w-0 items-center gap-1.5">
        {!compact ? (
          <Avatar size="xs" src={avatarUrl ?? undefined} fallback={workerLabel[0] ?? "L"} />
        ) : null}
        <Badge
          size="sm"
          variant="outline"
          className="border-border bg-muted/40 text-muted-foreground"
        >
          {isColloquio ? "Colloquio" : "Prova"}
        </Badge>
        {isColloquio && timeLabel ? (
          <>
            <span className="text-muted-foreground/60">•</span>
            <span className="shrink-0 text-2xs font-semibold tabular-nums text-muted-foreground">
              {timeLabel}
            </span>
          </>
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight text-foreground">{familyLabel}</p>
        <p className="mt-0.5 truncate text-xs leading-tight text-muted-foreground">{workerLabel}</p>
      </div>
    </button>
  )
}

export function ProveColloquiCalendar({
  events,
  searchQuery,
  onEventClick,
  onVisibleRangeChange,
}: ProveColloquiCalendarProps) {
  const [cursor, setCursor] = React.useState(() => new Date())
  const [selectedKinds, setSelectedKinds] = React.useState<Set<CalendarEventKind>>(
    () => new Set(CALENDAR_KIND_OPTIONS.map((option) => option.value)),
  )
  const [selectedStatuses, setSelectedStatuses] = React.useState<Set<CalendarStatusKey>>(
    () => new Set(CALENDAR_STATUS_OPTIONS.map((option) => option.value)),
  )
  const toggleKind = React.useCallback((value: CalendarEventKind) => {
    setSelectedKinds((current) => {
      const next = new Set(current)
      if (next.has(value)) {
        next.delete(value)
      } else {
        next.add(value)
      }
      return next
    })
  }, [])
  const toggleStatus = React.useCallback((value: CalendarStatusKey) => {
    setSelectedStatuses((current) => {
      const next = new Set(current)
      if (next.has(value)) {
        next.delete(value)
      } else {
        next.add(value)
      }
      return next
    })
  }, [])
  const filteredEvents = React.useMemo(
    () =>
      events.filter((event) => {
        if (!selectedKinds.has(event.type)) return false
        if (!selectedStatuses.has(getCalendarEventStatusKey(event))) return false
        return matchesSearchQuery(
          [
            event.title,
            event.status,
            event.type,
            event.type === "colloquio" ? event.famiglia?.email : event.card.famiglia?.email,
            event.type === "colloquio" ? event.lavoratore?.email : event.card.lavoratore?.email,
          ],
          searchQuery,
        )
      }),
    [events, searchQuery, selectedKinds, selectedStatuses],
  )

  const visibleDays = React.useMemo(() => {
    const start = startOfWeek(cursor)
    return Array.from({ length: 7 }, (_, index) => addDays(start, index))
  }, [cursor])

  const visibleEvents = React.useMemo(() => {
    const firstDay = visibleDays[0]
    const lastDay = visibleDays[visibleDays.length - 1]
    if (!firstDay || !lastDay) return []
    return filteredEvents.filter((event) => {
      const date = getEventDate(event)
      if (!date) return false
      return date >= firstDay && date <= addDays(lastDay, 1)
    })
  }, [filteredEvents, visibleDays])

  React.useEffect(() => {
    const firstDay = visibleDays[0]
    const lastDay = visibleDays[visibleDays.length - 1]
    if (!firstDay || !lastDay) return
    onVisibleRangeChange({
      start: toDateRangeValue(firstDay),
      end: toDateRangeValue(addDays(lastDay, 1)),
    })
  }, [onVisibleRangeChange, visibleDays])

  const weekStart = visibleDays[0] ?? cursor
  const weekEnd = visibleDays[6] ?? cursor
  const title = `${new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "short",
  }).format(weekStart)} - ${new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(weekEnd)}`

  function move(direction: -1 | 1) {
    setCursor((current) => addDays(current, direction * 7))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-4">
      <div className="flex flex-wrap items-center gap-2 border-b py-3">
        <Button type="button" variant="outline" size="sm" onClick={() => setCursor(new Date())}>
          Oggi
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => move(-1)}
          aria-label="Periodo precedente"
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => move(1)}
          aria-label="Periodo successivo"
        >
          <ChevronRightIcon className="size-4" />
        </Button>
        <div className="min-w-0 flex-1 text-sm font-semibold capitalize text-foreground">{title}</div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tipo
          </span>
          {CALENDAR_KIND_OPTIONS.map((option) => (
            <CheckboxChip
              key={option.value}
              checked={selectedKinds.has(option.value)}
              onCheckedChange={() => toggleKind(option.value)}
            >
              {option.label}
            </CheckboxChip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Stato
          </span>
          {CALENDAR_STATUS_OPTIONS.map((option) => (
            <CheckboxChip
              key={option.value}
              checked={selectedStatuses.has(option.value)}
              onCheckedChange={() => toggleStatus(option.value)}
            >
              {option.label}
            </CheckboxChip>
          ))}
        </div>
      </div>

      {!visibleEvents.length ? (
        <div className="flex min-h-80 flex-1 items-center justify-center rounded-lg border border-dashed bg-muted/10 text-sm text-muted-foreground">
          Nessun colloquio programmato questa settimana
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden border-l">
          <div className="grid h-full min-w-[1180px] grid-cols-7 items-stretch">
            {visibleDays.map((day) => {
              const dayEvents = filteredEvents
                .filter((event) => {
                  const date = getEventDate(event)
                  return date ? isSameDate(date, day) : false
                })
                .sort((left, right) => {
                  if (left.type !== right.type) return left.type === "colloquio" ? -1 : 1
                  const leftTime = getEventDate(left)?.getTime() ?? 0
                  const rightTime = getEventDate(right)?.getTime() ?? 0
                  return leftTime - rightTime
                })
              return (
                <div
                  key={day.toISOString()}
                  className="flex min-h-0 flex-col border-b border-r bg-surface p-2"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-2xs font-medium capitalize text-muted-foreground">
                      {new Intl.DateTimeFormat("it-IT", {
                        timeZone: "Europe/Rome",
                        weekday: "short",
                      }).format(day)}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold tabular-nums",
                        isSameDate(day, new Date()) &&
                          "rounded-full bg-accent px-1.5 py-0.5 text-accent-foreground",
                      )}
                    >
                      {day.getUTCDate()}
                    </span>
                  </div>
                  <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
                    {dayEvents.map((event) => (
                      <CalendarEventButton
                        key={event.id}
                        event={event}
                        onClick={() => onEventClick(event)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
