import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { LavoratoreCard } from "../lavoratore-card";
import { SideCardsPanel } from "@/components/shared-next/side-cards-panel";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/components/ui/field";
import { asString } from "../../lib/base-utils";
import { useGate1ListDerived } from "../../hooks/use-gate1-list-panel";
import { useGate1LookupOptions } from "../../hooks/use-gate1-lookup-options";
import { useGate1ViewContext } from "./gate1-view-context";

export function Gate1ListPanel() {
  const {
    activeViewId,
    allowCertifiedStatus,
    applyFilters,
    applySavedView,
    currentPage,
    deleteSavedView,
    error,
    filterFields,
    filters,
    gateFollowupFilter,
    gateLabel,
    gateProvinciaFilter,
    groupingOptions,
    hasPendingFilters,
    listControlsSlot,
    loadWorkersSchema,
    loading,
    lookupOptionsByDomain,
    pageCount,
    saveCurrentView,
    savedViews,
    searchValue,
    selectedWorker,
    selectedWorkerId,
    selectedWorkerRow,
    setFilters,
    setGateFollowupFilter,
    setGateProvinciaFilter,
    setPageIndex,
    setSearchValue,
    setSelectedWorkerId,
    showFollowupFilter,
    statusChangeRetainedWorkerId,
    table,
    workerAddressesById,
    workerCountLabel,
    workerRows,
    workers,
    workerStatus,
  } = useGate1ViewContext();

  const { gateWorkers, workerRowsById, gateProvinciaOptions, gateFollowupOptions } =
    useGate1ListDerived({
      workerStatus,
      workers,
      workerRows,
      lookupOptionsByDomain,
      selectedWorkerId,
      setSelectedWorkerId,
      selectedWorker,
      selectedWorkerRow,
      statusChangeRetainedWorkerId,
    });

  const { followupStatusOptions } = useGate1LookupOptions({
    lookupOptionsByDomain,
    allowCertifiedStatus,
  });

  return (
        <div className="flex min-h-0 flex-col gap-2" data-testid="lavoratori-list-panel">
          <SideCardsPanel
            title={gateLabel}
            headerClassName="hidden"
            contentClassName="space-y-3 px-5 pt-3 pb-3"
            className="h-full gap-2"
          >
            <DataTableToolbar
              table={table}
              searchValue={searchValue}
              onSearchValueChange={setSearchValue}
              searchCommitDebounceMs={500}
              filters={filters}
              onFiltersChange={setFilters}
              filterFields={filterFields}
              searchPlaceholder="Cerca lavoratori..."
              groupOptions={groupingOptions}
              compactControls
              savedViews={savedViews.map((view) => ({
                id: view.id,
                name: view.name,
                updatedAt: view.updatedAt,
              }))}
              activeViewId={activeViewId}
              onSaveCurrentView={saveCurrentView}
              onApplySavedView={applySavedView}
              onDeleteSavedView={deleteSavedView}
              onApplyFilters={applyFilters}
              hasPendingFilters={hasPendingFilters}
              onRequestSchema={loadWorkersSchema}
            />

            <div className="flex flex-col gap-3">
              {listControlsSlot}

              <div className="space-y-1">
                <FieldLabel>Provincia</FieldLabel>
                <Select
                  value={gateProvinciaFilter}
                  onValueChange={setGateProvinciaFilter}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tutte le province" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte le province</SelectItem>
                    {gateProvinciaOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showFollowupFilter ? (
                <div className="space-y-1">
                  <FieldLabel>Follow-up</FieldLabel>
                  <Select
                    value={gateFollowupFilter}
                    onValueChange={setGateFollowupFilter}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Tutti i follow-up" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i follow-up</SelectItem>
                      {gateFollowupOptions.map((followup) => (
                        <SelectItem key={followup} value={followup}>
                          {followup}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            {gateProvinciaFilter !== "all" || gateFollowupFilter !== "all" ? (
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setGateProvinciaFilter("all");
                    setGateFollowupFilter("all");
                  }}
                >
                  Reset filtri
                </Button>
              </div>
            ) : null}

            {loading ? (
              <p className="text-muted-foreground py-3 text-sm">
                Caricamento lavoratori...
              </p>
            ) : error ? (
              <p className="py-3 text-sm text-red-600">{error}</p>
            ) : gateWorkers.length === 0 ? (
              <p className="text-muted-foreground py-3 text-sm">
                {gateProvinciaFilter !== "all" || gateFollowupFilter !== "all"
                  ? "Nessun lavoratore corrisponde ai filtri selezionati."
                  : "Nessun lavoratore trovato."}
              </p>
            ) : (
              <div className="space-y-2">
                {gateWorkers.map((worker) => {
                  const row = workerRowsById.get(worker.id);
                  const followupRaw = asString(row?.followup_chiamata_idoneita);
                  const followupOption = followupStatusOptions.find(
                    (option) =>
                      option.value === followupRaw ||
                      option.label === followupRaw,
                  );
                  return (
                    <LavoratoreCard
                      key={worker.id}
                      worker={worker}
                      isActive={worker.id === selectedWorkerId}
                      variant="gate1"
                      gate1Summary={{
                        // Mostra la sigla (es. "TO") quando disponibile, altrimenti
                        // ripiega sul nome esteso. La sigla è la sorgente canonica
                        // usata anche dal filtro Gate 1/2.
                        // Gate 1 RPC espone già `provincia_sigla` nella row;
                        // per Gate 2 (no RPC) la prendiamo dall'indirizzo di residenza.
                        provincia:
                          asString(row?.provincia_sigla) ||
                          asString(
                            (workerAddressesById?.get(worker.id) ?? []).find(
                              (a) =>
                                asString(a.tipo_indirizzo).toLowerCase() ===
                                "residenza",
                            )?.provincia_sigla ??
                              (workerAddressesById?.get(worker.id) ?? [])[0]
                                ?.provincia_sigla,
                          ) ||
                          asString(row?.provincia),
                        createdAt: asString(row?.creato_il),
                        followup: followupOption?.label ?? followupRaw,
                      }}
                      onClick={() =>
                        setSelectedWorkerId((previous) =>
                          previous === worker.id ? null : worker.id,
                        )
                      }
                    />
                  );
                })}
              </div>
            )}
          </SideCardsPanel>

          <Pagination className="px-1">
            <Pagination.Pages
              page={currentPage}
              pageCount={pageCount}
              onChange={(nextPage) => {
                if (loading) return;
                setPageIndex(Math.max(nextPage - 1, 0));
              }}
            />
            <span className="text-muted-foreground tabular-nums">
              {gateWorkers.length} {workerCountLabel}
            </span>
          </Pagination>
        </div>
  );
}
