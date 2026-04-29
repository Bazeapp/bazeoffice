import * as React from "react";
import { Clock3Icon, PaperclipIcon, PlusIcon } from "lucide-react";

import { SupportTicketCreateDialog } from "@/components/support/support-ticket-create-dialog";
import { SupportTicketDetailSheet } from "@/components/support/support-ticket-detail-sheet";
import {
  resolveSupportTicketTag,
  resolveSupportTicketUrgency,
  type SupportTicketType,
} from "@/components/support/support-ticket-config";
import {
  type SupportTicketBoardCardData,
  useSupportTicketsBoard,
} from "@/hooks/use-support-tickets-board";
import {
  KanbanColumnShell,
  KanbanColumnSkeleton,
  KanbanDeferredColumnAction,
  type KanbanColumnVisual,
} from "@/components/shared-next/kanban";
import { RecordCard } from "@/components/shared-next/record-card";
import { SectionHeader } from "@/components/shared-next/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SupportColumnData = {
  id: string;
  label: string;
  color: string;
  totalCount: number;
  cards: SupportTicketBoardCardData[];
  deferred?: boolean;
  isLoaded?: boolean;
  deferredActionLabel?: string;
};

const TICKET_TYPE_TITLE: Record<SupportTicketType, string> = {
  Customer: "Ticket customer",
  Payroll: "Ticket payroll",
};

function getColumnVisual(color: string): KanbanColumnVisual {
  switch (color.toLowerCase()) {
    case "sky":
      return {
        columnClassName: "bg-sky-400",
        headerClassName: "",
        iconClassName: "text-sky-500",
      };
    case "amber":
      return {
        columnClassName: "bg-amber-400",
        headerClassName: "",
        iconClassName: "text-amber-500",
      };
    case "orange":
      return {
        columnClassName: "bg-orange-400",
        headerClassName: "",
        iconClassName: "text-orange-500",
      };
    case "green":
      return {
        columnClassName: "bg-green-400",
        headerClassName: "",
        iconClassName: "text-green-500",
      };
    default:
      return {
        columnClassName: "",
        headerClassName: "",
        iconClassName: "text-muted-foreground/80",
      };
  }
}

function SupportTicketCard({ card }: { card: SupportTicketBoardCardData }) {
  const tagConfig = resolveSupportTicketTag(card.tag);
  const urgencyConfig = resolveSupportTicketUrgency(card.urgenza);
  const TagIcon = tagConfig.icon;

  return (
    <RecordCard>
      <RecordCard.Header
        title={card.causale}
        subtitle={card.nomeCompleto}
      />
      <RecordCard.Body>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={tagConfig.colorClassName}>
            <TagIcon className="size-3" />
            {tagConfig.label}
          </Badge>
          <Badge className={urgencyConfig.badgeClassName}>
            {urgencyConfig.label}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-3 text-2xs">
          <div className="text-muted-foreground flex items-center gap-1.5">
            <Clock3Icon className="size-3.5" />
            <span>{card.dataAperturaLabel}</span>
          </div>
          <div className="text-muted-foreground flex items-center gap-2">
            {card.attachmentCount > 0 ? (
              <span className="flex items-center gap-1">
                <PaperclipIcon className="size-3.5" />
                {card.attachmentCount}
              </span>
            ) : null}
            <span className="font-medium text-foreground">
              {card.assegnatario.split(" ")[0]}
            </span>
          </div>
        </div>
      </RecordCard.Body>
    </RecordCard>
  );
}

function SupportTicketsBoardColumn({
  column,
  draggingTicketId,
  isDropTarget,
  onOpenTicket,
  onLoadDeferredColumn,
  onDragStartTicket,
  onDragEndTicket,
  onDragEnterColumn,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropToColumn,
}: {
  column: SupportColumnData;
  draggingTicketId: string | null;
  isDropTarget: boolean;
  onOpenTicket: (ticketId: string) => void;
  onLoadDeferredColumn: (columnId: string) => void;
  onDragStartTicket: (ticketId: string) => void;
  onDragEndTicket: () => void;
  onDragEnterColumn: (columnId: string) => void;
  onDragOverColumn: (columnId: string) => void;
  onDragLeaveColumn: (event: React.DragEvent<HTMLDivElement>) => void;
  onDropToColumn: (columnId: string, ticketId: string | null) => void;
}) {
  const visual = getColumnVisual(column.color);

  return (
    <KanbanColumnShell
      columnId={column.id}
      title={column.label}
      countLabel={`${column.totalCount} ticket`}
      visual={visual}
      density="compact"
      widthClassName="w-73"
      isDropTarget={isDropTarget}
      emptyMessage="Nessun ticket"
      onDragEnter={onDragEnterColumn}
      onDragOver={onDragOverColumn}
      onDragLeave={onDragLeaveColumn}
      onDrop={onDropToColumn}
    >
      {column.deferred && !column.isLoaded ? (
        <KanbanDeferredColumnAction
          label={column.deferredActionLabel ?? `Mostra ${column.label}`}
          onClick={() => {
            onLoadDeferredColumn(column.id);
          }}
        />
      ) : null}
      {column.cards.map((card) => (
        <div
          key={card.id}
          draggable
          onClick={() => onOpenTicket(card.id)}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", card.id);
            event.dataTransfer.effectAllowed = "move";
            onDragStartTicket(card.id);
          }}
          onDragEnd={onDragEndTicket}
          className={cn(
            "cursor-grab transition-opacity active:cursor-grabbing",
            draggingTicketId === card.id && "opacity-40",
          )}
        >
          <SupportTicketCard card={card} />
        </div>
      ))}
    </KanbanColumnShell>
  );
}

function SupportTicketsBoardSkeletonColumn() {
  return (
    <KanbanColumnSkeleton
      widthClassName="w-73"
      density="compact"
      showBadgeRow
    />
  );
}

export function SupportTicketsView({
  ticketType,
}: {
  ticketType: SupportTicketType;
}) {
  const [search, setSearch] = React.useState("");
  const [stageFilter, setStageFilter] = React.useState("all");
  const [showClosedTickets, setShowClosedTickets] = React.useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [draggingTicketId, setDraggingTicketId] = React.useState<string | null>(
    null,
  );
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<
    string | null
  >(null);
  const [selectedTicketId, setSelectedTicketId] = React.useState<string | null>(
    null,
  );
  const {
    loading,
    error,
    stages,
    cards,
    rapportoOptions,
    createTicket,
    moveTicket,
    patchTicket,
  } = useSupportTicketsBoard(ticketType);

  const filteredCards = React.useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return cards.filter((card) => {
      if (!showClosedTickets && card.stage === "chiuso") return false;
      if (stageFilter !== "all" && card.stage !== stageFilter) return false;
      if (!normalizedSearch) return true;

      return (
        card.causale.toLowerCase().includes(normalizedSearch) ||
        card.nomeFamiglia.toLowerCase().includes(normalizedSearch) ||
        card.nomeLavoratore.toLowerCase().includes(normalizedSearch) ||
        card.tag.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [cards, search, showClosedTickets, stageFilter]);

  const columns = React.useMemo<SupportColumnData[]>(
    () =>
      stages.map((stage) => ({
        id: stage.id,
        label: stage.label,
        color: stage.color,
        totalCount: cards.filter((card) => card.stage === stage.id).length,
        cards: filteredCards.filter((card) => card.stage === stage.id),
        deferred: stage.id === "chiuso",
        isLoaded: stage.id !== "chiuso" || showClosedTickets,
        deferredActionLabel:
          stage.id === "chiuso" ? "Mostra chiusi" : undefined,
      })),
    [cards, filteredCards, showClosedTickets, stages],
  );

  const selectedCard = React.useMemo(
    () => cards.find((card) => card.id === selectedTicketId) ?? null,
    [cards, selectedTicketId],
  );

  const totalTickets = filteredCards.length;

  return (
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <SectionHeader>
        <SectionHeader.Title
          subtitle={`${totalTickets} ${totalTickets === 1 ? "ticket" : "ticket"}`}
        >
          {TICKET_TYPE_TITLE[ticketType]}
        </SectionHeader.Title>
        <SectionHeader.Actions>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <PlusIcon />
            Apri ticket
          </Button>
        </SectionHeader.Actions>
        <SectionHeader.Toolbar>
          <div className="min-w-0 flex-1">
            <SearchInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => setSearch("")}
              placeholder="Cerca causale, famiglia o lavoratore"
            />
          </div>
          <div className="w-50 shrink-0">
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tutti gli stati" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(search || stageFilter !== "all") ? (
            <Button
              variant="ghost"
              className="shrink-0"
              onClick={() => {
                setSearch("");
                setStageFilter("all");
              }}
            >
              Reset filtri
            </Button>
          ) : null}
        </SectionHeader.Toolbar>
      </SectionHeader>

      {error ? (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento ticket: {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-4">
        <div className="flex h-full min-h-0 min-w-max gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <SupportTicketsBoardSkeletonColumn key={index} />
              ))
            : columns.map((column) => (
                <SupportTicketsBoardColumn
                  key={column.id}
                  column={column}
                  draggingTicketId={draggingTicketId}
                  isDropTarget={dropTargetColumnId === column.id}
                  onOpenTicket={setSelectedTicketId}
                  onLoadDeferredColumn={(columnId) => {
                    if (columnId === "chiuso") {
                      setShowClosedTickets(true);
                    }
                  }}
                  onDragStartTicket={setDraggingTicketId}
                  onDragEndTicket={() => {
                    window.setTimeout(() => {
                      setDraggingTicketId(null);
                      setDropTargetColumnId(null);
                    }, 0);
                  }}
                  onDragEnterColumn={setDropTargetColumnId}
                  onDragOverColumn={setDropTargetColumnId}
                  onDragLeaveColumn={(event) => {
                    const nextTarget = event.relatedTarget;
                    if (
                      nextTarget instanceof Node &&
                      event.currentTarget.contains(nextTarget)
                    )
                      return;
                    setDropTargetColumnId((current) =>
                      current === column.id ? null : current,
                    );
                  }}
                  onDropToColumn={(columnId, ticketId) => {
                    setDropTargetColumnId(null);
                    setDraggingTicketId(null);
                    if (!ticketId) return;
                    void moveTicket(ticketId, columnId);
                  }}
                />
              ))}
        </div>
      </div>

      <SupportTicketCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        defaultTicketType={ticketType}
        rapportoOptions={rapportoOptions}
        onCreateTicket={createTicket}
      />

      {selectedCard ? (
        <SupportTicketDetailSheet
          card={selectedCard}
          stages={stages}
          rapportoOptions={rapportoOptions}
          open={true}
          onOpenChange={(open) => {
            if (!open) setSelectedTicketId(null);
          }}
          onMoveTicket={moveTicket}
          onPatchTicket={patchTicket}
        />
      ) : null}
    </section>
  );
}
