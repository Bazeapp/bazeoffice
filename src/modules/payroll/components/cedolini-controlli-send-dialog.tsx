import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import type { UseCedoliniBulkSendState } from "../hooks/use-cedolini-bulk-send"

export type CedoliniControlliSendDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  eligibleCount: number
  state: UseCedoliniBulkSendState
}

/**
 * Dry-run → confirm → sequential/stoppable bulk send dialog (BAZ-98/99/100
 * U5, R4/AE2-AE4). Purely presentational — all state/mutations live in
 * `useCedoliniBulkSend` (`state` prop); this component only renders the
 * copy + actions for the current `state.phase`.
 */
export function CedoliniControlliSendDialog({
  open,
  onOpenChange,
  eligibleCount,
  state,
}: CedoliniControlliSendDialogProps) {
  const { phase, job, dryRunOutcome, remainingCount, progressPercent, isConfirming, isStopping, error } =
    state

  const isTerminal = phase === "completata" || phase === "interrotta" || phase === "error"

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && (phase === "processing" || state.isStopping)) return
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent data-testid="cedolini-controlli-send-dialog">
        <DialogHeader>
          <DialogTitle>Invio cedolini</DialogTitle>
          <DialogDescription>
            {phase === "idle" || phase === "dry_running"
              ? `Verrà eseguito un invio di prova su 1 cedolino (di ${eligibleCount} pronti), poi potrai confermare l'invio dei restanti.`
              : null}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {phase === "dry_running" ? (
          <p className="text-muted-foreground text-sm">Invio di prova in corso…</p>
        ) : null}

        {phase === "dry_run_failed" ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            data-testid="cedolini-controlli-send-dry-run-failed"
          >
            <p className="font-medium">Invio di prova non riuscito.</p>
            <p className="mt-1">
              {(dryRunOutcome?.details?.message as string | undefined) ??
                dryRunOutcome?.error ??
                "Il cedolino di prova non è stato inviato: l'invio in blocco non è stato avviato."}
            </p>
          </div>
        ) : null}

        {phase === "confirm_pending" ? (
          <p
            className="text-foreground-strong text-sm"
            data-testid="cedolini-controlli-send-confirm-copy"
          >
            Invio di prova riuscito. Confermi l&apos;invio dei restanti{" "}
            <strong>{remainingCount}</strong> {remainingCount === 1 ? "cedolino" : "cedolini"}?
          </p>
        ) : null}

        {phase === "processing" ? (
          <div className="flex flex-col gap-2" data-testid="cedolini-controlli-send-progress">
            <div className="bg-surface-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-accent h-full transition-[width]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-muted-foreground text-sm">
              {job?.processed_count ?? 0}/{job?.total_count ?? 0} elaborati
              {job?.stop_requested ? " · arresto richiesto" : ""}
            </p>
          </div>
        ) : null}

        {isTerminal ? (
          <div className="flex flex-wrap items-center gap-2" data-testid="cedolini-controlli-send-summary">
            <Badge variant="success" size="sm">
              {job?.success_count ?? 0} inviati
            </Badge>
            {job?.skipped_count ? (
              <Badge variant="warning" size="sm">
                {job.skipped_count} saltati
              </Badge>
            ) : null}
            {job?.error_count ? (
              <Badge variant="danger" size="sm">
                {job.error_count} errori
              </Badge>
            ) : null}
            {phase === "interrotta" ? (
              <Badge variant="secondary" size="sm">
                Interrotto
              </Badge>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          {phase === "confirm_pending" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  state.reset()
                  onOpenChange(false)
                }}
              >
                Annulla
              </Button>
              <Button
                type="button"
                data-testid="cedolini-controlli-send-confirm"
                onClick={() => void state.confirmSend()}
                disabled={isConfirming}
              >
                {isConfirming ? "Avvio…" : `Invia ${remainingCount} restanti`}
              </Button>
            </>
          ) : null}

          {phase === "processing" ? (
            <Button
              type="button"
              variant="destructive"
              data-testid="cedolini-controlli-send-stop"
              onClick={() => void state.stop()}
              disabled={isStopping || Boolean(job?.stop_requested)}
            >
              {job?.stop_requested ? "Arresto richiesto…" : isStopping ? "Arresto…" : "Interrompi"}
            </Button>
          ) : null}

          {phase === "dry_run_failed" || isTerminal ? (
            <Button
              type="button"
              onClick={() => {
                state.reset()
                onOpenChange(false)
              }}
            >
              Chiudi
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
