import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckboxChip } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { confirm } from "@/components/ui/confirmer"

import { useCedoliniBulkSend } from "../hooks/use-cedolini-bulk-send"
import { useCedoliniCheckRun } from "../hooks/use-cedolini-check-run"
import { useCedoliniRecoverUrl } from "../hooks/use-cedolini-recover-url"
import {
  buildCedolinoCheckCards,
  createDefaultWarningCategoryFilter,
  filterWarningGroups,
  getAnalisiEligibleMeseLavorativoIds,
  getCheckRunProgressPercent,
  getInviatiCards,
  getSendEligibleMeseLavorativoIds,
  getUnsentProntiCards,
  groupWarningsByCategory,
  resolveCedolinoWarningMessage,
  toggleWarningCategoryFilter,
  WARNING_CATEGORIES,
  type CedolinoCheckCard,
} from "../lib"
import type { CedolinoCheckRunStatus, CedolinoWarningCategory, PayrollBoardColumnData } from "../types"
import { CedoliniControlliSendDialog } from "./cedolini-controlli-send-dialog"

const RUN_STATUS_LABELS: Record<CedolinoCheckRunStatus, string> = {
  in_corso: "In corso",
  completata: "Completata",
  interrotta: "Interrotta",
}

/** The one PRD category the U5 URL-recovery action targets. */
const CEDOLINO_O_PDF_CATEGORY: CedolinoWarningCategory = "Cedolino o PDF"

export type CedoliniControlliViewProps = {
  selectedMonth: string
  columns: PayrollBoardColumnData[]
}

export function CedoliniControlliView({ selectedMonth, columns }: CedoliniControlliViewProps) {
  const { run, results, isLoading, error, isStarting, startError, startMessage, startAnalysis } =
    useCedoliniCheckRun(selectedMonth)

  const bulkSend = useCedoliniBulkSend()
  const recoverUrl = useCedoliniRecoverUrl(selectedMonth)
  const [sendDialogOpen, setSendDialogOpen] = React.useState(false)
  /** Survives dialog close / hook idle so the toolbar keeps the post-send status. */
  const [sendSummary, setSendSummary] = React.useState<{ successCount: number } | null>(null)

  const [categoryFilter, setCategoryFilter] = React.useState<Set<CedolinoWarningCategory>>(
    createDefaultWarningCategoryFilter,
  )

  React.useEffect(() => {
    setSendSummary(null)
  }, [selectedMonth])

  React.useEffect(() => {
    if (bulkSend.phase !== "completata") return
    setSendSummary({ successCount: bulkSend.job?.success_count ?? 0 })
  }, [bulkSend.phase, bulkSend.job?.success_count])

  const toggleCategory = React.useCallback((category: CedolinoWarningCategory) => {
    setCategoryFilter((current) => toggleWarningCategoryFilter(current, category))
  }, [])

  const cards = React.useMemo(
    () => buildCedolinoCheckCards(results, columns),
    [results, columns],
  )
  const pronti = React.useMemo(() => getUnsentProntiCards(cards, columns), [cards, columns])
  const inviati = React.useMemo(() => getInviatiCards(cards, columns), [cards, columns])
  const warningGroups = React.useMemo(() => groupWarningsByCategory(cards), [cards])
  const visibleWarningGroups = React.useMemo(
    () => filterWarningGroups(warningGroups, categoryFilter),
    [warningGroups, categoryFilter],
  )
  const totalWarningCount = React.useMemo(
    () => warningGroups.reduce((sum, group) => sum + group.cards.length, 0),
    [warningGroups],
  )

  const sendEligibleIds = React.useMemo(
    () => getSendEligibleMeseLavorativoIds(pronti, columns),
    [pronti, columns],
  )
  const analisiEligibleIds = React.useMemo(
    () => getAnalisiEligibleMeseLavorativoIds(columns),
    [columns],
  )
  const hasAnalisiEligible = analisiEligibleIds.length > 0

  const cedolinoOPdfGroup = warningGroups.find((group) => group.category === CEDOLINO_O_PDF_CATEGORY)
  const cedolinoOPdfIds = React.useMemo(
    () => cedolinoOPdfGroup?.cards.map((card) => card.meseLavorativoId) ?? [],
    [cedolinoOPdfGroup],
  )

  const isRunning = run?.status === "in_corso"
  const progressPercent = run ? getCheckRunProgressPercent(run) : 0
  const sendCompleted = sendSummary != null || bulkSend.phase === "completata"
  const sendInFlight =
    bulkSend.phase === "dry_running" ||
    bulkSend.phase === "processing" ||
    bulkSend.phase === "confirm_pending"
  const sentCount = sendSummary?.successCount ?? bulkSend.job?.success_count ?? 0

  const openSendDialog = () => {
    // Re-open an existing send-session dialog (in flight, failed dry run,
    // completed, …) without starting a second dry run.
    if (bulkSend.phase !== "idle" || sendCompleted) {
      setSendDialogOpen(true)
      return
    }

    void confirm({
      title: "Invio di prova",
      description:
        "Verrà inviato solo il primo cedolino come test. L'invio degli altri non parte finché non confermi il risultato.",
      cancelButtonTitle: "Annulla",
      confirmButtonTitle: "Avvia invio di prova",
      variant: "default",
      disableCancelWhilePending: true,
      action: async () => {
        await bulkSend.startDryRun(sendEligibleIds, selectedMonth)
      },
    }).then((confirmed) => {
      if (confirmed) setSendDialogOpen(true)
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            data-testid="cedolini-controlli-avvia"
            onClick={() => {
              // Clear a prior send so a new analysis can enable Invia again.
              setSendSummary(null)
              if (bulkSend.phase !== "idle") bulkSend.reset()
              void startAnalysis()
            }}
            disabled={isStarting || isRunning || !hasAnalisiEligible}
          >
            {isRunning ? "Analisi in corso…" : "Avvia analisi"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            data-testid="cedolini-controlli-invia"
            onClick={openSendDialog}
            disabled={
              sendCompleted || (!sendInFlight && sendEligibleIds.length === 0)
            }
          >
            {sendInFlight
              ? "Invio in corso…"
              : `Invia cedolini${sendEligibleIds.length > 0 ? ` (${sendEligibleIds.length})` : ""}`}
          </Button>

          {sendCompleted ? (
            <div
              className="text-success flex items-center gap-2 text-sm font-medium"
              data-testid="cedolini-controlli-sent-status"
            >
              <Badge variant="success" size="sm">
                {sentCount} inviati
              </Badge>
              <span>Cedolini inviati</span>
            </div>
          ) : isRunning && run ? (
            <div
              className="text-muted-foreground flex items-center gap-2 text-sm"
              data-testid="cedolini-controlli-progress"
            >
              <div className="bg-surface-muted h-2 w-40 overflow-hidden rounded-full">
                <div
                  className="bg-accent h-full transition-[width]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span>
                {run.checked_count}/{run.total_count} · {RUN_STATUS_LABELS[run.status]}
              </span>
            </div>
          ) : null}
        </div>

        {!hasAnalisiEligible && !isRunning ? (
          <span
            className="text-muted-foreground text-sm"
            data-testid="cedolini-controlli-no-eligible"
          >
            Nessun cedolino da controllare in board.
          </span>
        ) : startMessage ? (
          <span className="text-muted-foreground text-sm" data-testid="cedolini-controlli-message">
            {startMessage}
          </span>
        ) : null}
      </div>

      {error || startError ? (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {startError ?? `Errore caricamento controlli: ${error}`}
        </div>
      ) : null}

      <div className="scrollbar-visible min-h-0 flex-1 overflow-y-auto px-4 py-4 [scrollbar-gutter:stable]">
        {!run && !isLoading ? (
          <p className="text-muted-foreground text-sm">
            Nessuna analisi ancora avviata per questo mese.
          </p>
        ) : null}

        <div className="grid min-h-0 grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex min-h-0 flex-col gap-6">
            {run && inviati.length > 0 ? (
              <section aria-label="Inviati" data-testid="cedolini-controlli-inviati">
                <h2 className="text-foreground-strong mb-2 flex items-center gap-2 text-sm font-semibold">
                  Inviati
                  <Badge variant="success" size="sm">
                    {inviati.length}
                  </Badge>
                </h2>
                <div className="flex flex-col gap-2">
                  {inviati.map((card) => (
                    <CedolinoCheckCardItem key={card.resultId} card={card} />
                  ))}
                </div>
              </section>
            ) : null}

            <section aria-label="Pronti" data-testid="cedolini-controlli-pronti">
              <h2 className="text-foreground-strong mb-2 flex items-center gap-2 text-sm font-semibold">
                Pronti
                <Badge variant="info" size="sm">
                  {pronti.length}
                </Badge>
              </h2>
              <div className="flex flex-col gap-2">
                {pronti.map((card) => (
                  <CedolinoCheckCardItem key={card.resultId} card={card} />
                ))}
                {!isLoading && run && pronti.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nessun cedolino pronto.</p>
                ) : null}
              </div>
            </section>
          </div>

          <section aria-label="Warning" data-testid="cedolini-controlli-warning">
            <h2 className="text-foreground-strong mb-2 flex items-center gap-2 text-sm font-semibold">
              Warning
              <Badge variant="warning" size="sm">
                {totalWarningCount}
              </Badge>
            </h2>

            <div className="mb-3 flex flex-wrap gap-2">
              {WARNING_CATEGORIES.map((category) => {
                const count =
                  warningGroups.find((group) => group.category === category)?.cards.length ?? 0
                return (
                  <CheckboxChip
                    key={category}
                    data-testid={`cedolini-controlli-category-${category}`}
                    checked={categoryFilter.has(category)}
                    onCheckedChange={() => toggleCategory(category)}
                  >
                    {category} ({count})
                  </CheckboxChip>
                )
              })}
            </div>

            <div className="flex flex-col gap-3">
              {visibleWarningGroups.map((group) =>
                group.cards.length > 0 ? (
                  <Collapsible key={group.category} defaultOpen>
                    <div className="flex items-center justify-between gap-2">
                      <CollapsibleTrigger
                        data-testid={`cedolini-controlli-group-${group.category}`}
                        className="justify-start"
                      >
                        {group.category} ({group.cards.length})
                      </CollapsibleTrigger>
                      {group.category === CEDOLINO_O_PDF_CATEGORY ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          data-testid="cedolini-controlli-recover-bulk"
                          onClick={() => void recoverUrl.recoverBulk(cedolinoOPdfIds, selectedMonth)}
                          disabled={recoverUrl.isBulkRecovering || cedolinoOPdfIds.length === 0}
                        >
                          {recoverUrl.isBulkRecovering ? "Recupero in corso…" : "Recupera URL (blocco)"}
                        </Button>
                      ) : null}
                    </div>
                    {group.category === CEDOLINO_O_PDF_CATEGORY && (recoverUrl.bulkError || recoverUrl.singleError) ? (
                      <p
                        className="text-danger mt-1 text-xs"
                        data-testid="cedolini-controlli-recover-error"
                        role="alert"
                      >
                        {recoverUrl.bulkError ?? recoverUrl.singleError}
                      </p>
                    ) : null}
                    <CollapsibleContent>
                      <div className="flex flex-col gap-2 pt-2">
                        {group.cards.map((card) => (
                          <CedolinoCheckCardItem
                            key={`${group.category}-${card.resultId}`}
                            card={card}
                            warningCategory={group.category}
                            onRecover={
                              group.category === CEDOLINO_O_PDF_CATEGORY &&
                              !recoverUrl.recoveredIds.has(card.meseLavorativoId)
                                ? () => void recoverUrl.recoverSingle(card.meseLavorativoId)
                                : undefined
                            }
                            isRecovering={recoverUrl.recoveringSingleId === card.meseLavorativoId}
                            recoverSucceeded={
                              group.category === CEDOLINO_O_PDF_CATEGORY &&
                              recoverUrl.recoveredIds.has(card.meseLavorativoId)
                            }
                          />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ) : null,
              )}
              {!isLoading && run && totalWarningCount === 0 ? (
                <p className="text-muted-foreground text-sm">Nessun warning.</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>

      <CedoliniControlliSendDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        eligibleCount={sendEligibleIds.length}
        state={bulkSend}
      />
    </div>
  )
}

function CedolinoCheckCardItem({
  card,
  warningCategory,
  onRecover,
  isRecovering = false,
  recoverSucceeded = false,
}: {
  card: CedolinoCheckCard
  /** When set (Warning column), only messages for this group category are shown. */
  warningCategory?: CedolinoWarningCategory
  onRecover?: () => void
  isRecovering?: boolean
  recoverSucceeded?: boolean
}) {
  const visibleWarnings =
    warningCategory == null
      ? []
      : card.warnings.filter((warning) => warning.category === warningCategory)

  return (
    <div
      className="border-border bg-surface rounded-lg border p-3"
      data-testid={`cedolini-check-card-${card.resultId}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-foreground-strong text-sm font-medium">
          {card.info?.nomeCompleto ?? "Rapporto non disponibile"}
        </span>
        <Badge variant={card.info?.tipo === "baze_pay" ? "info" : "secondary"} size="sm">
          {card.info?.tipo === "baze_pay" ? "Baze pay" : "Abbonamento"}
        </Badge>
      </div>
      {card.info?.importoLabel ? (
        <p className="text-muted-foreground mt-1 text-xs">{card.info.importoLabel}</p>
      ) : null}
      {visibleWarnings.length > 0 ? (
        <ul className="text-warning mt-2 flex flex-col gap-1 text-xs">
          {visibleWarnings.map((warning, index) => (
            <li key={`${warning.category}-${index}`}>
              {resolveCedolinoWarningMessage(warning)}
            </li>
          ))}
        </ul>
      ) : null}
      {recoverSucceeded ? (
        <p
          className="text-success mt-2 text-xs font-medium"
          data-testid={`cedolini-controlli-recover-success-${card.meseLavorativoId}`}
          role="status"
        >
          URL recuperato con successo.
        </p>
      ) : null}
      {onRecover ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          data-testid={`cedolini-controlli-recover-${card.meseLavorativoId}`}
          onClick={onRecover}
          disabled={isRecovering}
        >
          {isRecovering ? "Recupero…" : "Recupera URL"}
        </Button>
      ) : null}
    </div>
  )
}
