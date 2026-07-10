import { ExternalLinkIcon, LoaderCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { LavoratoriCercaDetailAddSearchDialogProps } from "./lavoratori-cerca-detail.types"

export function LavoratoriCercaDetailAddSearchDialog({
  isAddSearchDialogOpen,
  setIsAddSearchDialogOpen,
  isSubmittingAddSearch,
  searchProcessQuery,
  setSearchProcessQuery,
  isSearchProcessLoading,
  searchProcessResults,
  selectedSearchToAdd,
  setSelectedSearchToAdd,
  manualSearchInsertReason,
  setManualSearchInsertReason,
  onAddWorkerToSearch,
  onOpenRicercaDetail,
  openRicercaDetailFromWorker,
}: LavoratoriCercaDetailAddSearchDialogProps) {
  return (
    <Dialog
      open={isAddSearchDialogOpen}
      onOpenChange={(nextOpen) => {
        if (isSubmittingAddSearch) return
        setIsAddSearchDialogOpen(nextOpen)
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Aggiungi ad una ricerca</DialogTitle>
          <DialogDescription>
            Cerca una ricerca per email famiglia, nome famiglia o ID e inserisci il
            lavoratore in Prospetto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Cerca ricerca</p>
            <Input
              value={searchProcessQuery}
              onChange={(event) => setSearchProcessQuery(event.target.value)}
              placeholder="Email famiglia, nome famiglia o ID ricerca"
              className="w-full"
            />
            {searchProcessQuery.trim().length < 2 ? (
              <p className="text-muted-foreground text-xs">Inserisci almeno 2 caratteri.</p>
            ) : isSearchProcessLoading ? (
              <p className="text-muted-foreground text-xs">Caricamento risultati...</p>
            ) : searchProcessResults.length === 0 ? (
              <p className="text-muted-foreground text-xs">Nessuna ricerca trovata.</p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border p-2">
                {searchProcessResults.map((result) => {
                  const isSelected = selectedSearchToAdd?.processId === result.processId

                  return (
                    <button
                      key={result.processId}
                      type="button"
                      onClick={() => setSelectedSearchToAdd(result)}
                      className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium">{result.familyName}</div>
                          <div className="text-muted-foreground text-xs">
                            {result.searchLabel} • {result.familyEmail}
                          </div>
                        </div>
                        <span className="text-muted-foreground shrink-0 text-xs">
                          {result.statoRicerca}
                        </span>
                      </div>
                      <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                        <span>{result.tipoLavoro}</span>
                        <span>{result.tipoRapporto}</span>
                        <span>{result.orarioDiLavoro}</span>
                        <span>{result.zona}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Motivazione</p>
            <Textarea
              value={manualSearchInsertReason}
              onChange={(event) => setManualSearchInsertReason(event.target.value)}
              placeholder="Scrivi perché vuoi aggiungere questo lavoratore alla ricerca"
              className="min-h-28 w-full"
            />
          </div>
        </div>

        <DialogFooter>
          {selectedSearchToAdd && onOpenRicercaDetail ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => openRicercaDetailFromWorker(selectedSearchToAdd.processId)}
              disabled={isSubmittingAddSearch}
            >
              <ExternalLinkIcon className="size-4" />
              Apri ricerca
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAddSearchDialogOpen(false)}
            disabled={isSubmittingAddSearch}
          >
            Annulla
          </Button>
          <Button
            type="button"
            onClick={() => void onAddWorkerToSearch()}
            disabled={
              isSubmittingAddSearch ||
              !selectedSearchToAdd ||
              !manualSearchInsertReason.trim()
            }
          >
            {isSubmittingAddSearch ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : null}
            Aggiungi alla ricerca
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
