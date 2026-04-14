import * as React from "react";
import {
  CalendarDaysIcon,
  CalendarIcon,
  FileTextIcon,
  MapPinIcon,
  PencilIcon,
} from "lucide-react";

import {
  type VariazioniBoardCardData,
  type VariazioniBoardColumnData,
  useVariazioniBoard,
} from "@/hooks/use-variazioni-board";
import { AttachmentUploadSlot } from "@/components/shared/attachment-upload-slot";
import { DetailSectionBlock } from "@/components/shared/detail-section-card";
import { KanbanColumnShell, KanbanColumnSkeleton } from "@/components/shared/kanban";
import { KanbanCard, KanbanCardBadge, KanbanCardBadgeRow, KanbanCardMeta, KanbanCardTitle } from "@/components/shared/kanban-card";
import { LinkedRapportoSummaryCard } from "@/components/shared/linked-rapporto-summary-card";
import { PageHeader } from "@/components/shared/page-header";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value);
}

function buildDistributionItems(
  source: string | null,
  totalHours: number | null,
) {
  const labels = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
  const matches = String(source ?? "").match(/\d+([.,]\d+)?/g) ?? [];
  const parsedValues = matches.slice(0, 7).map((value) => {
    const normalized = value.replace(",", ".");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  });

  const paddedValues = Array.from(
    { length: 7 },
    (_, index) => parsedValues[index] ?? 0,
  );
  const valuesSum = paddedValues.reduce((sum, value) => sum + value, 0);
  if (
    !valuesSum &&
    typeof totalHours === "number" &&
    Number.isFinite(totalHours)
  ) {
    paddedValues[0] = totalHours;
  }

  return labels.map((label, index) => ({
    label,
    value: `${paddedValues[index] ?? 0}h`,
  }));
}

function VariazioniDetailSheet({
  card,
  open,
  onOpenChange,
}: {
  card: VariazioniBoardCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const distributionItems = buildDistributionItems(
    card?.rapporto?.distribuzione_ore_settimana ?? null,
    card?.rapporto?.ore_a_settimana ?? null,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[min(96vw,980px)]! max-w-none! p-0 sm:max-w-none"
      >
        <SheetHeader className="border-b bg-background px-5 py-5">
          <div className="space-y-2">
            <SheetTitle className="truncate text-xl font-semibold">
              {card?.nomeCompleto ?? "Dettaglio variazione"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Dettaglio pratica di variazione contrattuale con dati del rapporto
              e documenti.
            </SheetDescription>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="flex items-center gap-1.5">
                <CalendarDaysIcon className="size-4" />
                {formatDate(card?.record.data_variazione)}
              </span>
            </div>
          </div>
        </SheetHeader>

        {card ? (
          <section className="h-full overflow-y-auto bg-muted/20 px-5 py-5">
            <div className="mx-auto max-w-5xl space-y-5">
              <LinkedRapportoSummaryCard title={card.nomeCompleto} rapporto={card.rapporto} />

              <DetailSectionBlock
                title="Dettagli variazione"
                icon={
                  <CalendarDaysIcon className="text-muted-foreground size-5" />
                }
                action={
                  <PencilIcon className="text-muted-foreground size-4" />
                }
                contentClassName="space-y-5"
              >
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <CalendarDaysIcon className="text-muted-foreground size-5 shrink-0" />
                  <span className="text-muted-foreground">
                    Data di partenza:
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatDate(card.record.data_variazione)}
                  </span>
                </div>

                <div className="border-t border-border/70 pt-5 text-sm sm:text-base">
                  <span className="text-muted-foreground">
                    Variazione da applicare:
                  </span>{" "}
                  <span className="font-medium text-foreground">
                    {card.variazioneDaApplicare}
                  </span>
                </div>
              </DetailSectionBlock>

              <DetailSectionBlock
                title="Dati rapporto lavorativo"
                icon={<PencilIcon className="text-muted-foreground size-5" />}
                action={
                  <PencilIcon className="text-muted-foreground size-4" />
                }
                contentClassName="space-y-5"
              >
                <div className="grid gap-5 text-sm sm:text-base">
                  <p>
                    <span className="text-muted-foreground">
                      Paga oraria lorda:
                    </span>{" "}
                    <span className="font-medium text-foreground">
                      {formatCurrency(card.rapporto?.paga_oraria_lorda)}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">
                      Ore settimanali:
                    </span>{" "}
                    <span className="font-medium text-foreground">
                      {card.rapporto?.ore_a_settimana}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">
                      Tipo rapporto:
                    </span>{" "}
                    <span className="font-medium text-foreground">
                      {card.rapporto?.tipo_rapporto}
                    </span>
                  </p>
                  <div className="space-y-3">
                    <p className="text-muted-foreground">Distribuzione ore:</p>
                    <div className="flex flex-wrap gap-2">
                      {distributionItems.map((item) => (
                        <div
                          key={item.label}
                          className="bg-muted/70 flex min-w-12 flex-col rounded-lg px-3 py-2 text-center"
                        >
                          <span className="text-muted-foreground text-xs">
                            {item.label}
                          </span>
                          <span className="text-sm font-semibold">
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="flex items-center gap-2">
                    <MapPinIcon className="text-muted-foreground size-4 shrink-0" />
                    <span className="text-muted-foreground">Indirizzo:</span>
                    <span className="font-medium text-foreground" />
                  </p>
                </div>
              </DetailSectionBlock>

              <DetailSectionBlock
                title="Documenti variazione"
                icon={
                  <FileTextIcon className="text-muted-foreground size-5" />
                }
                contentClassName="space-y-4"
              >
                <AttachmentUploadSlot
                  label="Accordo Variazione"
                  value={card.record.accordo_variazione_contrattuale ?? null}
                  onAdd={() => {}}
                  onPreviewOpen={() => {}}
                  isUploading={false}
                />
                <AttachmentUploadSlot
                  label="Ricevuta INPS Variazione"
                  value={card.record.ricevuta_inps_variazione_rapporto ?? null}
                  onAdd={() => {}}
                  onPreviewOpen={() => {}}
                  isUploading={false}
                />
              </DetailSectionBlock>
            </div>
          </section>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function getColumnClasses(color: string) {
  switch (color.toLowerCase()) {
    case "sky":
      return {
        columnClassName: "border-sky-300 bg-sky-50/70",
        headerClassName: "border-b border-sky-200/70",
        iconClassName: "text-sky-500",
        accentBg: "bg-sky-500",
      };
    case "cyan":
      return {
        columnClassName: "border-cyan-300 bg-cyan-50/70",
        headerClassName: "border-b border-cyan-200/70",
        iconClassName: "text-cyan-500",
        accentBg: "bg-cyan-500",
      };
    case "teal":
      return {
        columnClassName: "border-teal-300 bg-teal-50/70",
        headerClassName: "border-b border-teal-200/70",
        iconClassName: "text-teal-500",
        accentBg: "bg-teal-500",
      };
    default:
      return {
        columnClassName: "border-border bg-muted/40",
        headerClassName: "border-b border-border/70",
        iconClassName: "text-muted-foreground",
      };
  }
}

function VariazioniBoardCard({
  card,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  card: VariazioniBoardCardData;
  dragging: boolean;
  onOpen: () => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-grab transition-opacity active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <KanbanCard onClick={onOpen} className="cursor-grab active:cursor-grabbing">
        <KanbanCardTitle>{card.nomeCompleto}</KanbanCardTitle>
        {card.variazioneDaApplicare ? (
          <KanbanCardBadgeRow>
            <KanbanCardBadge>{card.variazioneDaApplicare}</KanbanCardBadge>
          </KanbanCardBadgeRow>
        ) : null}
        <div className="mt-2 border-t pt-2">
          <KanbanCardMeta>
            <CalendarIcon className="size-3.5 shrink-0" />
            <span className="truncate">{card.dataVariazione}</span>
          </KanbanCardMeta>
        </div>
      </KanbanCard>
    </div>
  );
}

function VariazioniBoardColumn({
  column,
  draggingRecordId,
  isDropTarget,
  onOpenCard,
  onDragStartCard,
  onDragEndCard,
  onDragEnterColumn,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropToColumn,
}: {
  column: VariazioniBoardColumnData;
  draggingRecordId: string | null;
  isDropTarget: boolean;
  onOpenCard: (recordId: string) => void;
  onDragStartCard: (recordId: string) => void;
  onDragEndCard: () => void;
  onDragEnterColumn: (columnId: string) => void;
  onDragOverColumn: (columnId: string) => void;
  onDragLeaveColumn: (event: React.DragEvent<HTMLDivElement>) => void;
  onDropToColumn: (columnId: string, recordId: string | null) => void;
}) {
  const visual = getColumnClasses(column.color);

  return (
    <KanbanColumnShell
      columnId={column.id}
      title={column.label}
      count={column.cards.length}
      visual={visual}
      isDropTarget={isDropTarget}
      emptyState={
        <div className="text-muted-foreground rounded-lg border border-dashed border-border/60 p-3 text-xs">
          Nessuna variazione
        </div>
      }
      onDragEnter={onDragEnterColumn}
      onDragOver={onDragOverColumn}
      onDragLeave={onDragLeaveColumn}
      onDrop={onDropToColumn}
    >
      {column.cards.map((card) => (
        <VariazioniBoardCard
          key={card.id}
          card={card}
          dragging={draggingRecordId === card.id}
          onOpen={() => onOpenCard(card.id)}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", card.id);
            event.dataTransfer.effectAllowed = "move";
            onDragStartCard(card.id);
          }}
          onDragEnd={onDragEndCard}
        />
      ))}
    </KanbanColumnShell>
  );
}

function VariazioniBoardSkeletonColumn() {
  return <KanbanColumnSkeleton />;
}

export function VariazioniBoardView() {
  const { loading, error, columns, moveCard } = useVariazioniBoard();
  const [draggingRecordId, setDraggingRecordId] = React.useState<string | null>(
    null,
  );
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<
    string | null
  >(null);
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(
    null,
  );

  const selectedCard = React.useMemo(
    () =>
      columns
        .flatMap((column) => column.cards)
        .find((card) => card.id === selectedCardId) ?? null,
    [columns, selectedCardId],
  );

  return (
    <>
      <section className="flex h-full min-h-0 w-full min-w-0 flex-col space-y-3 overflow-hidden">
        <PageHeader
          title="Variazioni"
          subtitle="Gestisci le variazioni contrattuali con drag & drop"
        />

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Errore caricamento variazioni: {error}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2">
          <div className="flex h-full min-h-0 min-w-max gap-4">
            {loading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <VariazioniBoardSkeletonColumn key={index} />
                ))
              : columns.map((column) => (
                  <VariazioniBoardColumn
                    key={column.id}
                    column={column}
                    draggingRecordId={draggingRecordId}
                    isDropTarget={dropTargetColumnId === column.id}
                    onOpenCard={setSelectedCardId}
                    onDragStartCard={setDraggingRecordId}
                    onDragEndCard={() => {
                      window.setTimeout(() => {
                        setDraggingRecordId(null);
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
                    onDropToColumn={(columnId, recordId) => {
                      setDropTargetColumnId(null);
                      setDraggingRecordId(null);
                      if (!recordId) return;
                      void moveCard(recordId, columnId);
                    }}
                  />
                ))}
          </div>
        </div>
      </section>

      <VariazioniDetailSheet
        card={selectedCard}
        open={Boolean(selectedCard)}
        onOpenChange={(open) => {
          if (!open) setSelectedCardId(null);
        }}
      />
    </>
  );
}
