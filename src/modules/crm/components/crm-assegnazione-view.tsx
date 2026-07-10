import * as React from "react";
import {
  CalendarDaysIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
  FilterXIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import type { AssegnazioneCardData } from "../types";
import { useCrmAssegnazione } from "../hooks/use-crm-assegnazione";
import { useOperatoriOptions } from "@/hooks/use-operatori-options";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SectionHeader } from "@/components/shared-next/section-header";
import { SideCardsPanel } from "@/components/shared-next/side-cards-panel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  type AssigneeValue,
  addDays,
  buildVisibleDays,
  compareByDeadlineAsc,
  formatDayMonth,
  formatWeekday,
  getAssigneeAccentClass,
  getDeadlineAccentClass,
  startOfDay,
  toDateKey,
} from "../lib/assegnazione-display-utils";
import { AssegnazioneDetailSheet } from "./assegnazione-detail-sheet";
import { AssegnazioneOperatorSelectOption } from "./assegnazione-operator-select-option";
import { AssegnazioneSearchCard } from "./assegnazione-search-card";

const DRAG_POINTER_THRESHOLD = 6;

type CrmAssegnazioneViewProps = {
  onOpenRicercaDetail?: (processId: string) => void;
};

export function CrmAssegnazioneView({
  onOpenRicercaDetail,
}: CrmAssegnazioneViewProps = {}) {
  const { loading, error, cards, assignCardToDate, patchCard } =
    useCrmAssegnazione();
  const { options: operatorOptions } = useOperatoriOptions({
    role: "recruiter",
    activeOnly: true,
  });
  const [visibleWindowStart, setVisibleWindowStart] = React.useState(() =>
    addDays(startOfDay(new Date()), -1),
  );
  const [draggingProcessId, setDraggingProcessId] = React.useState<
    string | null
  >(null);
  const [dropTarget, setDropTarget] = React.useState<string | null>(null);
  const [selectedCard, setSelectedCard] =
    React.useState<AssegnazioneCardData | null>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [assigneeFilter, setAssigneeFilter] = React.useState<
    AssigneeValue | "all"
  >("all");
  const [tipoRicercaFilter, setTipoRicercaFilter] = React.useState<
    "all" | "nuova" | "sostituzione"
  >("all");
  const cardPointerStateRef = React.useRef<
    Map<string, { x: number; y: number; exceededThreshold: boolean }>
  >(new Map());

  const visibleDays = React.useMemo(
    () => buildVisibleDays(visibleWindowStart),
    [visibleWindowStart],
  );

  const getCardAssigneeId = React.useCallback(
    (card: AssegnazioneCardData): AssigneeValue => card.recruiterId ?? "none",
    [],
  );

  const filteredCards = React.useMemo(() => {
    return cards.filter((card) => {
      const assigneeId = getCardAssigneeId(card);
      if (assigneeFilter !== "all" && assigneeId !== assigneeFilter)
        return false;
      if (
        tipoRicercaFilter !== "all" &&
        card.tipoRicerca !== tipoRicercaFilter
      ) {
        return false;
      }
      return true;
    });
  }, [assigneeFilter, cards, getCardAssigneeId, tipoRicercaFilter]);

  const assigneeById = React.useMemo(() => {
    const map = new Map<string, { label: string; avatar: string }>();
    for (const option of operatorOptions) {
      map.set(option.id, { label: option.label, avatar: option.avatar });
    }
    return map;
  }, [operatorOptions]);
  const selectedAssigneeFilterOperator = React.useMemo(
    () =>
      assigneeFilter !== "all" && assigneeFilter !== "none"
        ? operatorOptions.find((operator) => operator.id === assigneeFilter) ?? null
        : null,
    [assigneeFilter, operatorOptions],
  );

  const compareByAssigneeName = React.useCallback(
    (first: AssegnazioneCardData, second: AssegnazioneCardData) => {
      const firstAssigneeId = getCardAssigneeId(first);
      const secondAssigneeId = getCardAssigneeId(second);
      const firstLabel = assigneeById.get(firstAssigneeId)?.label ?? "";
      const secondLabel = assigneeById.get(secondAssigneeId)?.label ?? "";
      const assigneeDelta = firstLabel.localeCompare(secondLabel, "it");
      if (assigneeDelta !== 0) return assigneeDelta;
      return first.nomeFamiglia.localeCompare(second.nomeFamiglia, "it");
    },
    [assigneeById, getCardAssigneeId],
  );

  const cardsByDate = React.useMemo(() => {
    const map = new Map<string, AssegnazioneCardData[]>();
    for (const day of visibleDays) {
      map.set(day.key, []);
    }
    for (const card of filteredCards) {
      if (card.statoRes !== "fare_ricerca") continue;
      if (!card.dataAssegnazione) continue;
      if (!map.has(card.dataAssegnazione)) continue;
      map.get(card.dataAssegnazione)?.push(card);
    }
    for (const dayCards of map.values()) {
      dayCards.sort(compareByAssigneeName);
    }
    return map;
  }, [compareByAssigneeName, visibleDays, filteredCards]);

  const unassignedCards = React.useMemo(
    () =>
      filteredCards
        .filter(
          (card) =>
            card.statoRes === "da_assegnare" ||
            (card.statoRes === "fare_ricerca" && !card.dataAssegnazione),
        )
        .sort(compareByDeadlineAsc),
    [filteredCards],
  );
  const unassignedGroupedByTipoRicerca = React.useMemo(() => {
    const nuove = unassignedCards.filter(
      (card) => card.tipoRicerca === "nuova",
    );
    const sostituzioni = unassignedCards.filter(
      (card) => card.tipoRicerca === "sostituzione",
    );
    return { nuove, sostituzioni };
  }, [unassignedCards]);

  const applyAssigneeChange = React.useCallback(
    async (card: AssegnazioneCardData, nextAssigneeId: AssigneeValue) => {
      try {
        await patchCard(card.id, {
          recruiter_ricerca_e_selezione_id:
            nextAssigneeId === "none" ? null : nextAssigneeId,
        });
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando assegnatario";
        toast.error(message);
      }
    },
    [patchCard],
  );

  const handleDrop = React.useCallback(
    (targetDate: string | null, droppedProcessId: string | null) => {
      const processId = droppedProcessId || draggingProcessId;
      setDropTarget(null);
      setDraggingProcessId(null);
      cardPointerStateRef.current.clear();
      if (!processId) return;

      if (targetDate) {
        const matchingCard = cards.find((card) => card.id === processId);
        const assignee = matchingCard
          ? getCardAssigneeId(matchingCard)
          : "none";
        if (!assignee || assignee === "none") {
          toast.error(
            "Per assegnare una ricerca a una data devi prima selezionare il recruiter.",
          );
          return;
        }
      }

      void assignCardToDate(processId, targetDate);
    },
    [assignCardToDate, cards, draggingProcessId, getCardAssigneeId],
  );

  const handleOpenCardDetails = React.useCallback(
    (card: AssegnazioneCardData) => {
      setSelectedCard(card);
      setIsSheetOpen(true);
    },
    [],
  );

  const onCardDragStart = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>, processId: string) => {
      event.dataTransfer.setData("text/plain", processId);
      event.dataTransfer.effectAllowed = "move";
      cardPointerStateRef.current.delete(processId);
      setDraggingProcessId(processId);
    },
    [],
  );

  const onCardDragEnd = React.useCallback(() => {
    setDraggingProcessId(null);
    setDropTarget(null);
    cardPointerStateRef.current.clear();
  }, []);

  const onCardPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>, processId: string) => {
      if (event.button !== 0) return;
      cardPointerStateRef.current.set(processId, {
        x: event.clientX,
        y: event.clientY,
        exceededThreshold: false,
      });
    },
    [],
  );

  const onCardPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>, processId: string) => {
      const pointerState = cardPointerStateRef.current.get(processId);
      if (!pointerState || pointerState.exceededThreshold) return;
      const deltaX = Math.abs(event.clientX - pointerState.x);
      const deltaY = Math.abs(event.clientY - pointerState.y);
      if (deltaX > DRAG_POINTER_THRESHOLD || deltaY > DRAG_POINTER_THRESHOLD) {
        pointerState.exceededThreshold = true;
      }
    },
    [],
  );

  const onCardPointerUp = React.useCallback((processId: string) => {
    cardPointerStateRef.current.delete(processId);
  }, []);

  const onCardPointerCancel = React.useCallback((processId: string) => {
    cardPointerStateRef.current.delete(processId);
  }, []);

  const selectedCardFromState = React.useMemo(
    () => cards.find((card) => card.id === selectedCard?.id) ?? selectedCard,
    [cards, selectedCard],
  );

  const handleOpenRicerca = React.useCallback(
    (processId: string) => {
      if (onOpenRicercaDetail) {
        onOpenRicercaDetail(processId);
        return;
      }

      window.location.assign(`/ricerca/${encodeURIComponent(processId)}`);
    },
    [onOpenRicercaDetail],
  );

  return (
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col gap-4 overflow-hidden">
      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento assegnazione: {error}
        </div>
      ) : null}

      <SectionHeader>
        <SectionHeader.Title
          badge={
            <Badge>
              {filteredCards.length}{" "}
              {filteredCards.length === 1 ? "ricerca" : "ricerche"}
            </Badge>
          }
        >
          Assegnazione
        </SectionHeader.Title>
        <SectionHeader.Actions>
          <Select
            value={assigneeFilter}
            onValueChange={(value) =>
              setAssigneeFilter(value as AssigneeValue | "all")
            }
          >
            <SelectTrigger
              className="w-55"
              data-testid="assegnazione-filter-recruiter"
            >
              {selectedAssigneeFilterOperator ? (
                <AssegnazioneOperatorSelectOption operator={selectedAssigneeFilterOperator} />
              ) : (
                <>
                  <UsersIcon className="size-4" />
                  <SelectValue placeholder="Tutti i recruiter" />
                </>
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i recruiter</SelectItem>
              <SelectItem value="none">Non assegnato</SelectItem>
              {operatorOptions.map((operator) => (
                <SelectItem key={operator.id} value={operator.id}>
                  <AssegnazioneOperatorSelectOption operator={operator} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={tipoRicercaFilter}
            onValueChange={(value) =>
              setTipoRicercaFilter(value as "all" | "nuova" | "sostituzione")
            }
          >
            <SelectTrigger
              className="w-47.5"
              data-testid="assegnazione-filter-tipo-ricerca"
            >
              <FilterIcon className="size-4" />
              <SelectValue placeholder="Tutte le ricerche" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le ricerche</SelectItem>
              <SelectItem value="nuova">Nuove ricerche</SelectItem>
              <SelectItem value="sostituzione">Sostituzioni</SelectItem>
            </SelectContent>
          </Select>

          {(assigneeFilter !== "all" || tipoRicercaFilter !== "all") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="assegnazione-reset-filters"
              onClick={() => {
                setAssigneeFilter("all");
                setTipoRicercaFilter("all");
              }}
            >
              <FilterXIcon className="size-4" />
              Reset filtri
            </Button>
          )}
        </SectionHeader.Actions>
      </SectionHeader>

      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-3 overflow-hidden px-6 xl:grid-cols-[292px_minmax(0,1fr)]">
        <SideCardsPanel
          data-testid="assegnazione-unassigned"
          title="Da assegnare"
          icon={CalendarDaysIcon}
          subtitle={
            loading
              ? "Caricamento..."
              : `${unassignedCards.length} ricerche senza giorno assegnato`
          }
          headerClassName="px-5"
          contentClassName="space-y-2 px-5 py-3"
          className={cn(
            "h-full",
            dropTarget === "UNASSIGNED" && "ring-primary/40 ring-2",
          )}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDropTarget("UNASSIGNED");
          }}
          onDragLeave={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const stillInside =
              event.clientX >= rect.left &&
              event.clientX <= rect.right &&
              event.clientY >= rect.top &&
              event.clientY <= rect.bottom;
            if (stillInside) return;
            setDropTarget(null);
          }}
          onDrop={(event) => {
            event.preventDefault();
            const droppedProcessId =
              event.dataTransfer.getData("text/plain") || null;
            handleDrop(null, droppedProcessId);
          }}
        >
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
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
            <Accordion
              type="multiple"
              defaultValue={["nuove", "sostituzioni"]}
              className="gap-2"
            >
              <AccordionItem
                value="nuove"
                className="not-last:border-0 bg-transparent"
              >
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <Badge className="border-sky-200 bg-sky-100 text-sky-700">
                      Nuove
                    </Badge>
                    <span className="text-muted-foreground font-normal">
                      ({unassignedGroupedByTipoRicerca.nuove.length})
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pt-1">
                  {unassignedGroupedByTipoRicerca.nuove.map((card) => {
                    const assigneeId = getCardAssigneeId(card);
                    const assigneeMeta = assigneeById.get(assigneeId);
                    return (
                      <div
                        key={card.id}
                        draggable
                        data-testid={`assegnazione-card-${card.id}`}
                        onClick={() => handleOpenCardDetails(card)}
                        onDragStart={(event) => onCardDragStart(event, card.id)}
                        onDragEnd={onCardDragEnd}
                        onPointerDown={(event) =>
                          onCardPointerDown(event, card.id)
                        }
                        onPointerMove={(event) =>
                          onCardPointerMove(event, card.id)
                        }
                        onPointerUp={() => onCardPointerUp(card.id)}
                        onPointerCancel={() => onCardPointerCancel(card.id)}
                        className={cn(
                          "cursor-grab transition-opacity active:cursor-grabbing",
                          draggingProcessId === card.id && "opacity-40",
                        )}
                      >
                        <AssegnazioneSearchCard
                          data={card}
                          assigneeId={assigneeId}
                          assigneeLabel={assigneeMeta?.label ?? "Non assegnato"}
                          assigneeAvatar={assigneeMeta?.avatar ?? "-"}
                          accentClassName={getDeadlineAccentClass(
                            card.deadlineMobile,
                          )}
                          assigneeOptions={operatorOptions}
                          onAssigneeChange={(nextAssigneeId) => {
                            void applyAssigneeChange(card, nextAssigneeId);
                          }}
                        />
                      </div>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="sostituzioni"
                className="not-last:border-0 bg-transparent"
              >
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <Badge className="border-amber-200 bg-amber-100 text-amber-700">
                      Sostituzioni
                    </Badge>
                    <span className="text-muted-foreground font-normal">
                      ({unassignedGroupedByTipoRicerca.sostituzioni.length})
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pt-1">
                  {unassignedGroupedByTipoRicerca.sostituzioni.map((card) => {
                    const assigneeId = getCardAssigneeId(card);
                    const assigneeMeta = assigneeById.get(assigneeId);
                    return (
                      <div
                        key={card.id}
                        draggable
                        data-testid={`assegnazione-card-${card.id}`}
                        onClick={() => handleOpenCardDetails(card)}
                        onDragStart={(event) => onCardDragStart(event, card.id)}
                        onDragEnd={onCardDragEnd}
                        onPointerDown={(event) =>
                          onCardPointerDown(event, card.id)
                        }
                        onPointerMove={(event) =>
                          onCardPointerMove(event, card.id)
                        }
                        onPointerUp={() => onCardPointerUp(card.id)}
                        onPointerCancel={() => onCardPointerCancel(card.id)}
                        className={cn(
                          "cursor-grab transition-opacity active:cursor-grabbing",
                          draggingProcessId === card.id && "opacity-40",
                        )}
                      >
                        <AssegnazioneSearchCard
                          data={card}
                          assigneeId={assigneeId}
                          assigneeLabel={assigneeMeta?.label ?? "Non assegnato"}
                          assigneeAvatar={assigneeMeta?.avatar ?? "-"}
                          accentClassName={getDeadlineAccentClass(
                            card.deadlineMobile,
                          )}
                          assigneeOptions={operatorOptions}
                          onAssigneeChange={(nextAssigneeId) => {
                            void applyAssigneeChange(card, nextAssigneeId);
                          }}
                        />
                      </div>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </SideCardsPanel>

        <Card className="flex h-full min-h-0 flex-col overflow-hidden bg-surface">
          <CardHeader className="items-center">
            <div className="flex min-w-0 items-center gap-2">
              <CalendarIcon className="text-muted-foreground size-5 shrink-0" />
              <span className="text-base font-semibold">
                Giorni assegnazione
              </span>
              <span className="text-muted-foreground truncate text-sm">
                {`${formatWeekday(visibleDays[0]!.date)} ${formatDayMonth(
                  visibleDays[0]!.date,
                )} · ${formatWeekday(
                  visibleDays[visibleDays.length - 1]!.date,
                )} ${formatDayMonth(
                  visibleDays[visibleDays.length - 1]!.date,
                )}`}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setVisibleWindowStart((current) => addDays(current, -1));
                }}
                aria-label="Giorno precedente"
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setVisibleWindowStart(addDays(startOfDay(new Date()), -1));
                }}
              >
                Oggi
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setVisibleWindowStart((current) => addDays(current, 1));
                }}
                aria-label="Giorno successivo"
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-hidden p-0">
            <div className="grid h-full min-h-0 grid-cols-3 divide-x divide-border-subtle">
              {visibleDays.map((day) => {
                const dayCards = cardsByDate.get(day.key) ?? [];
                const isToday = day.key === toDateKey(new Date());
                return (
                  <div
                    key={day.key}
                    data-testid={`assegnazione-day-${day.key}`}
                    className={cn(
                      "flex h-full min-h-0 flex-col p-4 transition-colors",
                      isToday && "bg-blue-50/40",
                      dropTarget === day.key &&
                        "ring-primary/40 ring-2 ring-inset",
                    )}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDropTarget(day.key);
                    }}
                    onDragLeave={(event) => {
                      const rect =
                        event.currentTarget.getBoundingClientRect();
                      const stillInside =
                        event.clientX >= rect.left &&
                        event.clientX <= rect.right &&
                        event.clientY >= rect.top &&
                        event.clientY <= rect.bottom;
                      if (stillInside) return;
                      setDropTarget(null);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const droppedProcessId =
                        event.dataTransfer.getData("text/plain") || null;
                      handleDrop(day.key, droppedProcessId);
                    }}
                  >
                    <div className="mb-3 shrink-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          <span className="text-muted-foreground">
                            {formatWeekday(day.date)}
                          </span>{" "}
                          <span className="font-semibold">
                            {formatDayMonth(day.date)}
                          </span>
                        </span>
                        {isToday ? (
                          <Badge className="border-blue-200 bg-blue-100 text-blue-700">
                            OGGI
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {dayCards.length}{" "}
                        {dayCards.length === 1 ? "ricerca" : "ricerche"}
                      </p>
                    </div>

                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                      {dayCards.length === 0 ? (
                        <p className="text-muted-foreground text-xs">
                          Nessuna assegnazione
                        </p>
                      ) : (
                        dayCards.map((card) => {
                          const assigneeId = getCardAssigneeId(card);
                          const assigneeMeta = assigneeById.get(assigneeId);
                          return (
                            <div
                              key={card.id}
                              draggable
                              data-testid={`assegnazione-card-${card.id}`}
                              onClick={() => handleOpenCardDetails(card)}
                              onDragStart={(event) =>
                                onCardDragStart(event, card.id)
                              }
                              onDragEnd={onCardDragEnd}
                              onPointerDown={(event) =>
                                onCardPointerDown(event, card.id)
                              }
                              onPointerMove={(event) =>
                                onCardPointerMove(event, card.id)
                              }
                              onPointerUp={() => onCardPointerUp(card.id)}
                              onPointerCancel={() =>
                                onCardPointerCancel(card.id)
                              }
                              className={cn(
                                "cursor-grab transition-opacity active:cursor-grabbing",
                                draggingProcessId === card.id && "opacity-40",
                              )}
                            >
                              <AssegnazioneSearchCard
                                data={card}
                                assigneeId={assigneeId}
                                assigneeLabel={
                                  assigneeMeta?.label ?? "Non assegnato"
                                }
                                assigneeAvatar={assigneeMeta?.avatar ?? "-"}
                                accentClassName={getAssigneeAccentClass(
                                  assigneeId,
                                )}
                                assigneeOptions={operatorOptions}
                                onAssigneeChange={(nextAssigneeId) => {
                                  void applyAssigneeChange(
                                    card,
                                    nextAssigneeId,
                                  );
                                }}
                              />
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <AssegnazioneDetailSheet
        // Remount on card switch so debounced inputs reset their local draft.
        key={selectedCardFromState?.id ?? "__empty__"}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        card={selectedCardFromState}
        operatorOptions={operatorOptions}
        onPatchCard={async (patch) => {
          if (!selectedCardFromState?.id) return;
          await patchCard(selectedCardFromState.id, patch);
        }}
        onOpenRicerca={handleOpenRicerca}
      />
    </section>
  );
}
