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
import { AttachmentUploadSlot } from "@/components/shared-next/attachment-upload-slot";
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card";
import {
  KanbanColumnShell,
  KanbanColumnSkeleton,
  type KanbanColumnVisual,
} from "@/components/shared-next/kanban";
import { LinkedRapportoSummaryCard } from "@/components/shared-next/linked-rapporto-summary-card";
import { RecordCard } from "@/components/shared-next/record-card";
import { SectionHeader } from "@/components/shared-next/section-header";
import { Badge } from "@/components/ui-next/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui-next/sheet";
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
        <SheetHeader className="border-b bg-white px-5 py-5">
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
          <section className="h-full overflow-y-auto bg-[var(--neutral-150)] px-5 py-5">
            <div className="mx-auto max-w-5xl space-y-5">
              <LinkedRapportoSummaryCard title={card.nomeCompleto} rapporto={card.rapporto} />

              <DetailSectionBlock
                title="Dettagli variazione"
                icon={<CalendarDaysIcon className="size-4" />}
                action={<PencilIcon className="text-muted-foreground size-4" />}
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
                icon={<PencilIcon className="size-4" />}
                action={<PencilIcon className="text-muted-foreground size-4" />}
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
                icon={<FileTextIcon className="size-4" />}
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

function getColumnVisual(color: string): KanbanColumnVisual {
  switch (color.toLowerCase()) {
    case "sky":
      return { columnClassName: "bg-sky-400", headerClassName: "", iconClassName: "text-sky-500" };
    case "cyan":
      return { columnClassName: "bg-cyan-400", headerClassName: "", iconClassName: "text-cyan-500" };
    case "teal":
      return { columnClassName: "bg-teal-400", headerClassName: "", iconClassName: "text-teal-500" };
    default:
      return { columnClassName: "", headerClassName: "", iconClassName: "text-muted-foreground/80" };
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
      onClick={onOpen}
      className={cn(
        "cursor-grab transition-opacity active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <RecordCard>
        <RecordCard.Header title={card.nomeCompleto} />
        <RecordCard.Body>
          {card.variazioneDaApplicare ? (
            <div>
              <Badge variant="secondary">{card.variazioneDaApplicare}</Badge>
            </div>
          ) : null}
          <div className="text-muted-foreground border-t pt-2 text-xs">
            <p className="flex items-center gap-1.5 truncate">
              <CalendarIcon className="size-3.5 shrink-0" />
              <span className="truncate">{card.dataVariazione}</span>
            </p>
          </div>
        </RecordCard.Body>
      </RecordCard>
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
  const visual = getColumnVisual(column.color);

  return (
    <KanbanColumnShell
      columnId={column.id}
      title={column.label}
      countLabel={`${column.cards.length} ${
        column.cards.length === 1 ? "variazione" : "variazioni"
      }`}
      visual={visual}
      isDropTarget={isDropTarget}
      emptyMessage="Nessuna variazione"
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

  const totalVariazioni = React.useMemo(
    () => columns.reduce((sum, column) => sum + column.cards.length, 0),
    [columns],
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
      <section className="ui-next flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
        <SectionHeader>
          <SectionHeader.Title
            subtitle={`${totalVariazioni} ${
              totalVariazioni === 1 ? "variazione" : "variazioni"
            }`}
          >
            Variazioni
          </SectionHeader.Title>
        </SectionHeader>

        {error ? (
          <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Errore caricamento variazioni: {error}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-4">
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
