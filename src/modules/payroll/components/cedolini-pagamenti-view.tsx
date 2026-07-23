import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatItalianDateOrNull } from "@/lib/format-utils"

import { useCedoliniBulkReminder } from "../hooks/use-cedolini-bulk-reminder"
import { useCedoliniPagamenti } from "../hooks/use-cedolini-pagamenti"
import {
  filterPagamentiCardsByDate,
  getPagamentiReminderBulkIds,
} from "../lib/cedolini-pagamenti-filters"
import type { PayrollBoardCardData, PayrollBoardColumnData } from "../types"
import { CedoliniPagamentiReminderDialog } from "./cedolini-pagamenti-reminder-dialog"

export type CedoliniPagamentiViewProps = {
  selectedMonth: string
  columns: PayrollBoardColumnData[]
}

/**
 * Cedolini Pagamenti (BAZ-98/99/100 U6, R7/R8/AE6/OQ6): Reminder da fare /
 * fatti columns for "Inviato cedolino" rows with a linked transazione, a
 * date filter on `data_invio_famiglia` that gates BOTH what's visible and
 * the bulk reminder ids (AE6), and a dry-run → confirm → sequential/
 * stoppable bulk reminder reusing the same `cedolino_bulk_jobs` machinery as
 * Controlli's bulk send (`useCedoliniBulkReminder`, U5's extracted
 * `useCedoliniBulkJob`).
 */
export function CedoliniPagamentiView({ selectedMonth, columns }: CedoliniPagamentiViewProps) {
  const pagamenti = useCedoliniPagamenti(columns)
  const bulkReminder = useCedoliniBulkReminder()
  const [reminderDialogOpen, setReminderDialogOpen] = React.useState(false)
  const [dateFilter, setDateFilter] = React.useState("")

  const normalizedDateFilter = dateFilter.trim() || null

  const visibleDaFare = React.useMemo(
    () => filterPagamentiCardsByDate(pagamenti.daFare, normalizedDateFilter),
    [pagamenti.daFare, normalizedDateFilter],
  )
  // AE6: the bulk reminder ids are exactly what's visible in "da fare"
  // AFTER the date filter — never the unfiltered set.
  const bulkIds = React.useMemo(() => getPagamentiReminderBulkIds(visibleDaFare), [visibleDaFare])

  const dateBoundLabel = normalizedDateFilter ? formatItalianDateOrNull(normalizedDateFilter) : null

  // Once the bulk job settles, refresh the reminder flags so cards move
  // from "da fare" to "fatti" without a full page reload.
  const bulkJobStatus = bulkReminder.job?.status ?? null
  const previousBulkJobStatusRef = React.useRef<typeof bulkJobStatus>(null)
  React.useEffect(() => {
    const wasRunning = previousBulkJobStatusRef.current === "in_corso"
    const isNowTerminal = bulkJobStatus === "completata" || bulkJobStatus === "interrotta"
    if (wasRunning && isNowTerminal) {
      void pagamenti.refetch()
    }
    previousBulkJobStatusRef.current = bulkJobStatus
  }, [bulkJobStatus, pagamenti])

  const openReminderDialog = () => {
    setReminderDialogOpen(true)
    void bulkReminder.startDryRun(bulkIds, selectedMonth)
  }

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
            <div className="flex flex-col gap-2">
              {visibleDaFare.map((card) => (
                <CedoliniPagamentiCardItem
                  key={card.id}
                  card={card}
                  onSendReminder={() => void pagamenti.sendSingleReminder(card.id)}
                  isSending={pagamenti.sendingSingleId === card.id}
                />
              ))}
              {!pagamenti.isLoading && visibleDaFare.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nessun reminder da fare.</p>
              ) : null}
              {pagamenti.isLoading ? (
                <p className="text-muted-foreground text-sm">Caricamento…</p>
              ) : null}
            </div>
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
  onSendReminder,
  isSending = false,
}: {
  card: PayrollBoardCardData
  onSendReminder?: () => void
  isSending?: boolean
}) {
  return (
    <div
      className="border-border bg-surface rounded-lg border p-3"
      data-testid={`cedolini-pagamenti-card-${card.id}`}
    >
      <div className="flex items-center justify-between gap-2">
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
  )
}
