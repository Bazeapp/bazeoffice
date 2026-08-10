import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { confirm } from "@/components/ui/confirmer"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { formatItalianDateOrNull } from "@/lib/format-utils"

import { useCedoliniBulkReminder } from "../hooks/use-cedolini-bulk-reminder"
import { useCedoliniPagamenti } from "../hooks/use-cedolini-pagamenti"
import {
  filterPagamentiCardsByDate,
  getPagamentiReminderBulkIds,
  togglePagamentiReminderExclusion,
} from "../lib/cedolini-pagamenti-filters"
import type { PayrollBoardCardData, PayrollBoardColumnData } from "../types"
import { CedoliniPagamentiReminderDialog } from "./cedolini-pagamenti-reminder-dialog"

export type CedoliniPagamentiViewProps = {
  selectedMonth: string
  columns: PayrollBoardColumnData[]
}

/**
 * Cedolini Pagamenti (BAZ-98/99/100 U6, R7/R8/AE6/OQ6; BAZ-180): Reminder da
 * fare / fatti for "Inviato cedolino" Baze Pay rows with a linked
 * transazione (abbonamenti and closure-month cedolini always excluded), a
 * date filter on `data_invio_famiglia` that gates visibility, per-card
 * include/exclude (two lists + switch) for the bulk send, and a dry-run →
 * confirm → sequential/stoppable bulk reminder.
 */
export function CedoliniPagamentiView({ selectedMonth, columns }: CedoliniPagamentiViewProps) {
  const pagamenti = useCedoliniPagamenti(columns)
  const bulkReminder = useCedoliniBulkReminder()
  const [reminderDialogOpen, setReminderDialogOpen] = React.useState(false)
  const [dateFilter, setDateFilter] = React.useState("")
  /** Operator deselections for the next bulk send (BAZ-180). Empty ⇒ all included. */
  const [excludedIds, setExcludedIds] = React.useState<Set<string>>(() => new Set())

  const normalizedDateFilter = dateFilter.trim() || null

  const visibleDaFare = React.useMemo(
    () => filterPagamentiCardsByDate(pagamenti.daFare, normalizedDateFilter),
    [pagamenti.daFare, normalizedDateFilter],
  )
  // Drop exclusions that no longer appear in the visible da-fare set (date
  // filter / refetch) so counts stay accurate without sticky ghosts.
  const activeExcludedIds = React.useMemo(() => {
    if (excludedIds.size === 0) return excludedIds
    const visibleIdSet = new Set(visibleDaFare.map((card) => card.id))
    const next = new Set<string>()
    for (const id of excludedIds) {
      if (visibleIdSet.has(id)) next.add(id)
    }
    return next.size === excludedIds.size ? excludedIds : next
  }, [excludedIds, visibleDaFare])

  const includedDaFare = React.useMemo(
    () => visibleDaFare.filter((card) => !activeExcludedIds.has(card.id)),
    [visibleDaFare, activeExcludedIds],
  )
  const excludedDaFare = React.useMemo(
    () => visibleDaFare.filter((card) => activeExcludedIds.has(card.id)),
    [visibleDaFare, activeExcludedIds],
  )

  // AE6 + BAZ-180: bulk ids = visible da-fare minus operator exclusions.
  const bulkIds = React.useMemo(
    () => getPagamentiReminderBulkIds(visibleDaFare, activeExcludedIds),
    [visibleDaFare, activeExcludedIds],
  )
  const excludedCount = excludedDaFare.length

  const dateBoundLabel = normalizedDateFilter ? formatItalianDateOrNull(normalizedDateFilter) : null

  // Once the bulk job settles successfully (or is interrupted), refresh the
  // reminder flags so cards move from "da fare" to "fatti" without a full
  // page reload.
  // Watch `phase` (not only job.status): a single-item dry-run can land
  // directly in `completata` without the FE ever observing `in_corso`
  // (dry_run_first finalizes when nothing remains), so an
  // in_corso→terminal transition never fires and flags would stay stale.
  const bulkPhase = bulkReminder.phase
  const previousBulkPhaseRef = React.useRef(bulkPhase)
  React.useEffect(() => {
    const previous = previousBulkPhaseRef.current
    previousBulkPhaseRef.current = bulkPhase
    if (previous === bulkPhase) return
    if (bulkPhase === "completata" || bulkPhase === "interrotta") {
      void pagamenti.refetch()
    }
  }, [bulkPhase, pagamenti.refetch])

  const openReminderDialog = () => {
    // Re-open an existing reminder-session dialog (in flight, failed dry run,
    // completed, …) without starting a second dry run — same gate as Controlli's
    // `openSendDialog`.
    if (bulkReminder.phase !== "idle") {
      setReminderDialogOpen(true)
      return
    }

    void confirm({
      title: "Promemoria di prova",
      description:
        "Verrà inviato solo il primo reminder di pagamento come test. L'invio degli altri non parte finché non confermi il risultato.",
      cancelButtonTitle: "Annulla",
      confirmButtonTitle: "Avvia promemoria di prova",
      variant: "default",
      disableCancelWhilePending: true,
      action: async () => {
        await bulkReminder.startDryRun(bulkIds, selectedMonth)
      },
    }).then((confirmed) => {
      if (confirmed) setReminderDialogOpen(true)
    })
  }

  const selectAllVisible = () => {
    // Clear sticky exclusions too (including cards hidden by the date filter)
    // so "Seleziona tutti" always restores a clean all-included state.
    setExcludedIds(new Set())
  }

  const deselectAllVisible = () => {
    // Merge into existing exclusions — do not replace — so cards temporarily
    // hidden by the date filter stay deselected when the filter is cleared.
    setExcludedIds((previous) => {
      const next = new Set(previous)
      for (const card of visibleDaFare) next.add(card.id)
      return next
    })
  }

  const setCardIncluded = (meseLavorativoId: string, included: boolean) => {
    setExcludedIds((previous) => togglePagamentiReminderExclusion(previous, meseLavorativoId, included))
  }

  const hasAnyStickyExclusions = excludedIds.size > 0

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-muted-foreground flex items-center gap-2 text-sm">
            Filtra per data invio (fino a)
            <Input
              type="date"
              className="w-auto"
              data-testid="cedolini-pagamenti-date-filter"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
            />
          </label>
          {normalizedDateFilter ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-testid="cedolini-pagamenti-date-filter-clear"
              onClick={() => setDateFilter("")}
            >
              Rimuovi filtro
            </Button>
          ) : null}

          <Button
            type="button"
            data-testid="cedolini-pagamenti-reminder-invia"
            onClick={openReminderDialog}
            disabled={bulkIds.length === 0}
          >
            Invia reminder{bulkIds.length > 0 ? ` (${bulkIds.length})` : ""}
          </Button>
        </div>
      </div>

      {pagamenti.error ? (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento pagamenti: {pagamenti.error}
        </div>
      ) : null}
      {pagamenti.singleError ? (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {pagamenti.singleError}
        </div>
      ) : null}

      <div className="scrollbar-visible min-h-0 flex-1 overflow-y-auto px-4 py-4 [scrollbar-gutter:stable]">
        <div className="grid min-h-0 grid-cols-1 gap-6 lg:grid-cols-2">
          <section aria-label="Reminder da fare" data-testid="cedolini-pagamenti-da-fare">
            <h2 className="text-foreground-strong mb-2 flex items-center gap-2 text-sm font-semibold">
              Reminder da fare
              <Badge variant="warning" size="sm">
                {visibleDaFare.length}
              </Badge>
            </h2>

            {visibleDaFare.length > 0 ? (
              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  data-testid="cedolini-pagamenti-select-all"
                  onClick={selectAllVisible}
                  disabled={!hasAnyStickyExclusions}
                >
                  Seleziona tutti
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  data-testid="cedolini-pagamenti-deselect-all"
                  onClick={deselectAllVisible}
                  disabled={bulkIds.length === 0}
                >
                  Deseleziona tutti
                </Button>
                <span
                  className="text-muted-foreground text-xs"
                  data-testid="cedolini-pagamenti-selection-summary"
                >
                  Inclusi {bulkIds.length} · Esclusi {excludedCount}
                </span>
              </div>
            ) : null}

            <div className="flex flex-col gap-4">
              <div data-testid="cedolini-pagamenti-inclusi">
                <h3 className="text-foreground-strong mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                  Inclusi
                  <Badge variant="secondary" size="sm">
                    {includedDaFare.length}
                  </Badge>
                </h3>
                <div className="flex flex-col gap-2">
                  {includedDaFare.map((card) => (
                    <CedoliniPagamentiCardItem
                      key={card.id}
                      card={card}
                      included
                      onIncludedChange={(included) => setCardIncluded(card.id, included)}
                      onSendReminder={() => void pagamenti.sendSingleReminder(card.id)}
                      isSending={pagamenti.sendingSingleId === card.id}
                    />
                  ))}
                  {!pagamenti.isLoading && includedDaFare.length === 0 && visibleDaFare.length > 0 ? (
                    <p className="text-muted-foreground text-sm">Nessun cedolino incluso.</p>
                  ) : null}
                </div>
              </div>

              <div data-testid="cedolini-pagamenti-esclusi">
                <h3 className="text-foreground-strong mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                  Esclusi
                  <Badge variant="secondary" size="sm">
                    {excludedDaFare.length}
                  </Badge>
                </h3>
                <div className="flex flex-col gap-2">
                  {excludedDaFare.map((card) => (
                    <CedoliniPagamentiCardItem
                      key={card.id}
                      card={card}
                      included={false}
                      onIncludedChange={(included) => setCardIncluded(card.id, included)}
                    />
                  ))}
                  {!pagamenti.isLoading && excludedDaFare.length === 0 && visibleDaFare.length > 0 ? (
                    <p className="text-muted-foreground text-sm">Nessun cedolino escluso.</p>
                  ) : null}
                </div>
              </div>
            </div>

            {!pagamenti.isLoading && visibleDaFare.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nessun reminder da fare.</p>
            ) : null}
            {pagamenti.isLoading ? (
              <p className="text-muted-foreground text-sm">Caricamento…</p>
            ) : null}
          </section>

          <section aria-label="Reminder fatti" data-testid="cedolini-pagamenti-fatti">
            <h2 className="text-foreground-strong mb-2 flex items-center gap-2 text-sm font-semibold">
              Reminder fatti
              <Badge variant="success" size="sm">
                {pagamenti.fatti.length}
              </Badge>
            </h2>
            <p className="text-muted-foreground mb-2 text-xs">
              Risultano accettati dal sistema: non garantisce che email/WhatsApp siano stati
              effettivamente recapitati.
            </p>
            <div className="flex flex-col gap-2">
              {pagamenti.fatti.map((card) => (
                <CedoliniPagamentiCardItem key={card.id} card={card} />
              ))}
              {!pagamenti.isLoading && pagamenti.fatti.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nessun reminder fatto.</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <CedoliniPagamentiReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        eligibleCount={bulkIds.length}
        dateBoundLabel={dateBoundLabel}
        state={bulkReminder}
      />
    </div>
  )
}

function CedoliniPagamentiCardItem({
  card,
  included,
  onIncludedChange,
  onSendReminder,
  isSending = false,
}: {
  card: PayrollBoardCardData
  included?: boolean
  onIncludedChange?: (included: boolean) => void
  onSendReminder?: () => void
  isSending?: boolean
}) {
  const showSelection = typeof included === "boolean" && onIncludedChange != null

  return (
    <div
      className="border-border bg-surface rounded-lg border p-3"
      data-testid={`cedolini-pagamenti-card-${card.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="text-foreground-strong text-sm font-medium">{card.nomeCompleto}</span>
            {card.importoLabel ? (
              <Badge variant="secondary" size="sm">
                {card.importoLabel}
              </Badge>
            ) : null}
          </div>
          {card.dataInvioLabel ? (
            <p className="text-muted-foreground mt-1 text-xs">Inviato il {card.dataInvioLabel}</p>
          ) : null}
          {onSendReminder ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              data-testid={`cedolini-pagamenti-reminder-single-${card.id}`}
              onClick={onSendReminder}
              disabled={isSending}
            >
              {isSending ? "Invio…" : "Invia reminder"}
            </Button>
          ) : null}
        </div>
        {showSelection ? (
          <Switch
            checked={included}
            onCheckedChange={(checked) => onIncludedChange(checked)}
            data-testid={`cedolini-pagamenti-include-${card.id}`}
            aria-label={
              included
                ? `Escludi ${card.nomeCompleto} dall'invio reminder`
                : `Includi ${card.nomeCompleto} nell'invio reminder`
            }
            size="sm"
            className="mt-0.5 shrink-0"
          />
        ) : null}
      </div>
    </div>
  )
}
