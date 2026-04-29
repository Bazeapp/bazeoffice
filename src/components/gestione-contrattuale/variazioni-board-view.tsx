import * as React from "react";
import {
  CalendarDaysIcon,
  CalendarIcon,
  FileTextIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";

import {
  type VariazioniBoardCardData,
  type VariazioniBoardColumnData,
  type VariazioniRapportoOption,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { updateRecord } from "@/lib/anagrafiche-api";
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

function toDateInputValue(value: string | null | undefined) {
  return value?.slice(0, 10) ?? "";
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
  onCardChange,
}: {
  card: VariazioniBoardCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCardChange: (card: VariazioniBoardCardData) => void;
}) {
  const [editingDetails, setEditingDetails] = React.useState(false);
  const [savingDetails, setSavingDetails] = React.useState(false);
  const [detailsError, setDetailsError] = React.useState<string | null>(null);
  const [detailsDraft, setDetailsDraft] = React.useState(() => ({
    dataVariazione: toDateInputValue(card?.record.data_variazione),
    variazioneDaApplicare: card?.record.variazione_da_applicare ?? "",
  }));
  const distributionItems = buildDistributionItems(
    card?.rapporto?.distribuzione_ore_settimana ?? null,
    card?.rapporto?.ore_a_settimana ?? null,
  );

  React.useEffect(() => {
    setDetailsDraft({
      dataVariazione: toDateInputValue(card?.record.data_variazione),
      variazioneDaApplicare: card?.record.variazione_da_applicare ?? "",
    });
    setEditingDetails(false);
    setDetailsError(null);
  }, [card?.id, card?.record.data_variazione, card?.record.variazione_da_applicare]);

  async function saveDetailsPatch(patch: Record<string, unknown>) {
    if (!card || Object.keys(patch).length === 0) return;

    setSavingDetails(true);
    setDetailsError(null);

    try {
      const response = await updateRecord("variazioni_contrattuali", card.id, patch);
      const nextRecord = {
        ...card.record,
        ...response.row,
      } as VariazioniBoardCardData["record"];

      onCardChange({
        ...card,
        record: nextRecord,
        dataVariazione: formatDate(nextRecord.data_variazione),
        variazioneDaApplicare: nextRecord.variazione_da_applicare,
      });
    } catch (caughtError) {
      setDetailsError(
        caughtError instanceof Error ? caughtError.message : "Errore salvando variazione",
      );
    } finally {
      setSavingDetails(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[min(96vw,980px)]! max-w-none! p-0 sm:max-w-none"
      >
        <SheetHeader className="border-b bg-surface px-5 py-5">
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
          <section className="h-full overflow-y-auto bg-surface-muted px-5 py-5">
            <div className="mx-auto max-w-5xl space-y-5">
              <LinkedRapportoSummaryCard title={card.nomeCompleto} rapporto={card.rapporto} />

              <DetailSectionBlock
                title="Dettagli variazione"
                icon={<CalendarDaysIcon className="size-4" />}
                action={
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingDetails((current) => !current)}
                    aria-label="Modifica dettagli variazione"
                  >
                    <PencilIcon className="size-4" />
                  </button>
                }
                contentClassName="space-y-5"
              >
                {editingDetails ? (
                  <div className="grid gap-4">
                    <label className="space-y-2">
                      <span className="ui-type-label">Data di partenza</span>
                      <Input
                        type="date"
                        value={detailsDraft.dataVariazione}
                        onChange={(event) =>
                          setDetailsDraft((current) => ({
                            ...current,
                            dataVariazione: event.target.value,
                          }))
                        }
                        onBlur={() =>
                          void saveDetailsPatch({
                            data_variazione: detailsDraft.dataVariazione || null,
                          })
                        }
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="ui-type-label">Variazione da applicare</span>
                      <Textarea
                        value={detailsDraft.variazioneDaApplicare}
                        onChange={(event) =>
                          setDetailsDraft((current) => ({
                            ...current,
                            variazioneDaApplicare: event.target.value,
                          }))
                        }
                        onBlur={() =>
                          void saveDetailsPatch({
                            variazione_da_applicare: detailsDraft.variazioneDaApplicare || null,
                          })
                        }
                      />
                    </label>
                    {savingDetails ? (
                      <p className="text-muted-foreground text-xs">Salvataggio in corso...</p>
                    ) : null}
                    {detailsError ? (
                      <p className="text-xs font-medium text-red-600">{detailsError}</p>
                    ) : null}
                  </div>
                ) : (
                  <>
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
                        {card.variazioneDaApplicare ?? "-"}
                      </span>
                    </div>
                  </>
                )}
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

function CreateVariazioneDialog({
  open,
  onOpenChange,
  rapportoOptions,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rapportoOptions: VariazioniRapportoOption[];
  onCreate: (input: {
    rapportoId: string;
    variazioneDaApplicare: string;
    dataVariazione: string;
  }) => Promise<void>;
}) {
  const [query, setQuery] = React.useState("");
  const [selectedRapportoId, setSelectedRapportoId] = React.useState("");
  const [variazioneDaApplicare, setVariazioneDaApplicare] = React.useState("");
  const [dataVariazione, setDataVariazione] = React.useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const filteredOptions = React.useMemo(() => {
    const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return rapportoOptions.slice(0, 20);
    return rapportoOptions
      .filter((option) => {
        const haystack = option.label.toLowerCase();
        return tokens.every((token) => haystack.includes(token));
      })
      .slice(0, 20);
  }, [query, rapportoOptions]);

  const selectedRapporto = rapportoOptions.find((option) => option.id === selectedRapportoId);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedRapportoId("");
      setVariazioneDaApplicare("");
      setDataVariazione(new Date().toISOString().slice(0, 10));
      setError(null);
      setSaving(false);
    }
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRapportoId || !variazioneDaApplicare.trim()) {
      setError("Seleziona un rapporto e inserisci la descrizione della variazione.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onCreate({
        rapportoId: selectedRapportoId,
        variazioneDaApplicare: variazioneDaApplicare.trim(),
        dataVariazione,
      });
      onOpenChange(false);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Errore creando variazione",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Apri una variazione</DialogTitle>
          <DialogDescription>
            Seleziona il rapporto e descrivi la variazione contrattuale da gestire.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="space-y-2 block">
            <span className="ui-type-label">Rapporto di lavoro</span>
            <SearchInput
              placeholder="Cerca per famiglia o lavoratore..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onClear={() => setQuery("")}
            />
          </label>
          <div className="max-h-60 space-y-2 overflow-y-auto rounded-xl border bg-surface p-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    selectedRapportoId === option.id && "bg-primary/10 text-primary",
                  )}
                  onClick={() => setSelectedRapportoId(option.id)}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <p className="text-muted-foreground px-3 py-4 text-sm">
                Nessun rapporto trovato.
              </p>
            )}
          </div>
          {selectedRapporto ? (
            <p className="text-muted-foreground text-xs">
              Selezionato: <span className="font-medium text-foreground">{selectedRapporto.label}</span>
            </p>
          ) : null}
          <label className="space-y-2 block">
            <span className="ui-type-label">Data variazione</span>
            <Input
              type="date"
              value={dataVariazione}
              onChange={(event) => setDataVariazione(event.target.value)}
            />
          </label>
          <label className="space-y-2 block">
            <span className="ui-type-label">Descrizione variazione</span>
            <Textarea
              value={variazioneDaApplicare}
              onChange={(event) => setVariazioneDaApplicare(event.target.value)}
              placeholder="Es. aumento ore, cambio paga, modifica luogo di lavoro..."
              className="min-h-28"
            />
          </label>
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creazione..." : "Crea variazione"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function VariazioniBoardView() {
  const { loading, error, columns, rapportoOptions, createVariazione, moveCard, updateCard } = useVariazioniBoard();
  const [draggingRecordId, setDraggingRecordId] = React.useState<string | null>(
    null,
  );
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<
    string | null
  >(null);
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(
    null,
  );
  const [searchValue, setSearchValue] = React.useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);

  const filteredColumns = React.useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return columns;
    const tokens = query.split(/\s+/).filter(Boolean);
    return columns.map((column) => ({
      ...column,
      cards: column.cards.filter((card) => {
        const haystack = [
          card.nomeCompleto,
          card.variazioneDaApplicare,
          card.rapporto?.cognome_nome_datore_proper,
          card.rapporto?.nome_lavoratore_per_url,
          card.rapporto?.tipo_rapporto,
          card.rapporto?.tipo_contratto,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return tokens.every((token) => haystack.includes(token));
      }),
    }));
  }, [columns, searchValue]);

  const totalVariazioni = React.useMemo(
    () => filteredColumns.reduce((sum, column) => sum + column.cards.length, 0),
    [filteredColumns],
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
      <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
        <SectionHeader>
          <SectionHeader.Title
            subtitle={`${totalVariazioni} ${
              totalVariazioni === 1 ? "variazione" : "variazioni"
            }`}
          >
            Variazioni
          </SectionHeader.Title>
          <SectionHeader.Toolbar>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <PlusIcon className="size-4" />
              Apri una variazione
            </Button>
            <SearchInput
              className="md:max-w-sm"
              placeholder="Cerca per famiglia, lavoratore, tipo rapporto..."
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onClear={() => setSearchValue("")}
            />
          </SectionHeader.Toolbar>
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
              : filteredColumns.map((column) => (
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
        onCardChange={(nextCard) => updateCard(nextCard.id, () => nextCard)}
      />
      <CreateVariazioneDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        rapportoOptions={rapportoOptions}
        onCreate={createVariazione}
      />
    </>
  );
}
