import {
  LoaderCircleIcon,
  PlusIcon,
  SparklesIcon,
} from "lucide-react";

import { WorkerPipelineColumn } from "./worker-pipeline-column";
import { RicercaWorkerPipelineOverlay } from "./ricerca-worker-pipeline-overlay";
import { SectionHeader } from "@/components/shared-next/section-header";
import { Button } from "@/components/ui/button";
import { useCommentRouteContext } from "@/modules/commenti/hooks";
import {
  candidaturaCommentRow,
  candidaturaDisplayNames,
} from "@/modules/commenti/lib/comment-route-helpers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchInput } from "@/components/ui/search-input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { type CrmPipelineCardData } from "@/modules/crm/types"
import type {
  RicercaWorkersPipelineState,
} from "../types";
import { useRicercaWorkersPipelineView } from "../hooks/use-ricerca-workers-pipeline-view"
import { useRicercaWorkerPipelineOverlay } from "../hooks/use-ricerca-worker-pipeline-overlay"

type RicercaWorkersPipelineViewProps = {
  processId: string;
  card: CrmPipelineCardData &
    Partial<{
      indirizzoProvaProvincia: string;
      indirizzoProvaCap: string;
      indirizzoProvaNote: string;
      indirizzoProvaVia: string;
      indirizzoProvaCivico: string;
      indirizzoProvaComune: string;
      indirizzoProvaCitofono: string;
    }>;
  focusSelectionId?: string | null;
  onOpenRelatedSearch?: (processId: string, selectionId: string) => void;
  onFocusSelectionChange?: (selectionId: string | null) => void;
  onPatchProcess?: (
    processId: string,
    patch: Record<string, unknown>,
  ) => Promise<void> | void;
  pipelineState: RicercaWorkersPipelineState;
  recruiterLabelsById: Map<string, string>;
  className?: string;
};


export function RicercaWorkersPipelineView({
  processId,
  card,
  focusSelectionId = null,
  onOpenRelatedSearch,
  onFocusSelectionChange,
  pipelineState,
  recruiterLabelsById,
  className,
}: RicercaWorkersPipelineViewProps) {
  const { loading, error, columns, moveCard, refresh } = pipelineState;
  const {
    searchQuery,
    setSearchQuery,
    totalWorkers,
    filteredColumns,
    isRunningSmartMatching,
    handleRunSmartMatching,
    isAddWorkerDialogOpen,
    setIsAddWorkerDialogOpen,
    workerSearchQuery,
    setWorkerSearchQuery,
    workerSearchResults,
    isWorkerSearchLoading,
    selectedWorkerToAdd,
    setSelectedWorkerToAdd,
    manualInsertReason,
    setManualInsertReason,
    isSubmittingAddWorker,
    handleAddWorkerToSearch,
    draggingSelectionId,
    draggingFromColumnId,
    dropTargetColumnId,
    updateDropTargetColumnId,
    handleDropToColumn,
    handleDragLeaveColumn,
    onDragStartCard,
    onDragEndCard,
  } = useRicercaWorkersPipelineView({
    processId,
    columns,
    moveCard,
    refresh,
  });
  const {
    isWorkerOverlayOpen,
    handleOpenWorker,
    handleCloseWorkerOverlay,
    loadOtherActiveSelectionDetails,
    overlayProps,
  } = useRicercaWorkerPipelineOverlay({
    processId,
    card,
    columns,
    loading,
    focusSelectionId,
    moveCard,
    recruiterLabelsById,
    onOpenRelatedSearch,
    onFocusSelectionChange,
  });

  const overlaySelection = overlayProps.selectedCard;
  const isOverlayFocus = isWorkerOverlayOpen && Boolean(overlaySelection);

  useCommentRouteContext({
    enabled: isOverlayFocus,
    pageFocus: isOverlayFocus
      ? { entityType: "candidatura", entityId: overlaySelection!.id }
      : null,
    row: isOverlayFocus
      ? candidaturaCommentRow({
          selectionId: overlaySelection!.id,
          processId,
          famigliaId: card.famigliaId,
          lavoratoreId: overlaySelection!.worker.id,
          workerName: overlaySelection!.worker.nomeCompleto,
          ricercaLabel: card.nomeFamiglia ?? card.numeroRicercaAttivata,
          famigliaName: card.nomeFamiglia,
        })
      : {},
    sourceInterface: "dettaglio_lavoratore_ricerca",
    displayNames: isOverlayFocus
      ? candidaturaDisplayNames({
          selectionId: overlaySelection!.id,
          processId,
          famigliaId: card.famigliaId,
          lavoratoreId: overlaySelection!.worker.id,
          workerName: overlaySelection!.worker.nomeCompleto,
          ricercaLabel: card.nomeFamiglia ?? card.numeroRicercaAttivata,
          famigliaName: card.nomeFamiglia,
        })
      : undefined,
  });

  return (
    <div className={cn("relative flex min-h-0 flex-col", className)}>
      <SectionHeader className="px-0">
        <SectionHeader.Title
          size="nested"
          subtitle={`${totalWorkers} ${
            totalWorkers === 1 ? "lavoratore" : "lavoratori"
          }`}
        >
          Lavoratori per questa ricerca
        </SectionHeader.Title>
        <SectionHeader.Actions>
          <Button
            type="button"
            variant="outline"
            disabled={isRunningSmartMatching}
            onClick={() => void handleRunSmartMatching()}
          >
            {isRunningSmartMatching ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <SparklesIcon />
            )}
            {isRunningSmartMatching ? "Calcolo in corso..." : "Smart Matching"}
          </Button>
          <Button
            type="button"
            onClick={() => setIsAddWorkerDialogOpen(true)}
          >
            <PlusIcon />
            Aggiungi
          </Button>
        </SectionHeader.Actions>
        <SectionHeader.Toolbar>
          <div className="min-w-0 flex-1 max-w-105">
            <SearchInput
              placeholder="Cerca candidato..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onClear={() => setSearchQuery("")}
            />
          </div>
        </SectionHeader.Toolbar>
      </SectionHeader>

      {loading ? (
        <span className="text-muted-foreground px-4 pt-3 text-xs">
          Caricamento...
        </span>
      ) : null}

      {error ? (
        <div className="mx-4 mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Errore caricamento pipeline lavoratori: {error}
        </div>
      ) : null}

      <div className="scrollbar-visible min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-4 pt-4 [scrollbar-gutter:stable]">
        <div className="flex h-full min-h-0 min-w-max gap-4">
          {filteredColumns.map((column) => (
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
              draggingFromColumnId={draggingFromColumnId}
              onDragEnterColumn={updateDropTargetColumnId}
              onDragOverColumn={updateDropTargetColumnId}
              onDragLeaveColumn={handleDragLeaveColumn}
              onDropToColumn={handleDropToColumn}
              onDragStartCard={onDragStartCard}
              onDragEndCard={onDragEndCard}
              onOpenWorker={handleOpenWorker}
              onLoadOtherActiveSelectionDetails={loadOtherActiveSelectionDetails}
            />
          ))}
        </div>
      </div>

      {isWorkerOverlayOpen ? (
        <RicercaWorkerPipelineOverlay
          {...overlayProps}
          onClose={handleCloseWorkerOverlay}
        />
      ) : null}

      <Dialog
        open={isAddWorkerDialogOpen}
        onOpenChange={(nextOpen) => {
          if (isSubmittingAddWorker) return;
          setIsAddWorkerDialogOpen(nextOpen);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Aggiungi lavoratore</DialogTitle>
            <DialogDescription>
              Cerca un lavoratore per nome o email e inseriscilo in Prospetto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Cerca lavoratore</p>
              <SearchInput
                value={workerSearchQuery}
                onChange={(event) => setWorkerSearchQuery(event.target.value)}
                onClear={() => setWorkerSearchQuery("")}
                placeholder="Nome, cognome o email"
              />
              {workerSearchQuery.trim().length < 2 ? (
                <p className="text-muted-foreground text-xs">
                  Inserisci almeno 2 caratteri.
                </p>
              ) : isWorkerSearchLoading ? (
                <p className="text-muted-foreground text-xs">
                  Caricamento risultati...
                </p>
              ) : workerSearchResults.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  Nessun lavoratore trovato.
                </p>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-2">
                  {workerSearchResults.map((workerRow) => {
                    const workerId =
                      typeof workerRow.id === "string" ||
                      typeof workerRow.id === "number"
                        ? String(workerRow.id)
                        : "";
                    const workerName =
                      [
                        typeof workerRow.nome === "string"
                          ? workerRow.nome
                          : null,
                        typeof workerRow.cognome === "string"
                          ? workerRow.cognome
                          : null,
                      ]
                        .filter((value): value is string => Boolean(value))
                        .join(" ")
                        .trim() || "Lavoratore";
                    const workerEmail =
                      typeof workerRow.email === "string"
                        ? workerRow.email
                        : null;
                    const isSelected =
                      typeof selectedWorkerToAdd?.id === "string" ||
                      typeof selectedWorkerToAdd?.id === "number"
                        ? String(selectedWorkerToAdd.id) === workerId
                        : false;

                    return (
                      <button
                        key={workerId}
                        type="button"
                        onClick={() => setSelectedWorkerToAdd(workerRow)}
                        className={cn(
                          "w-full rounded-md border px-3 py-2 text-left text-sm transition",
                          isSelected
                            ? "border-emerald-400 bg-emerald-50"
                            : "border-border hover:bg-muted/50",
                        )}
                      >
                        <div className="font-medium">{workerName}</div>
                        {workerEmail ? (
                          <div className="text-muted-foreground text-xs">
                            {workerEmail}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Motivazione</p>
              <Textarea
                value={manualInsertReason}
                onChange={(event) => setManualInsertReason(event.target.value)}
                placeholder="Scrivi perché l'hai selezionato per questa ricerca"
                className="min-h-28"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddWorkerDialogOpen(false)}
              disabled={isSubmittingAddWorker}
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={() => void handleAddWorkerToSearch()}
              disabled={
                isSubmittingAddWorker ||
                !selectedWorkerToAdd ||
                !manualInsertReason.trim()
              }
            >
              {isSubmittingAddWorker ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : null}
              Aggiungi lavoratore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}