import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckboxChip } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

import { useCedoliniCheckRun } from "../hooks/use-cedolini-check-run"
import {
  buildCedolinoCheckCards,
  createDefaultWarningCategoryFilter,
  filterWarningGroups,
  getCheckRunProgressPercent,
  getProntiCards,
  groupWarningsByCategory,
  toggleWarningCategoryFilter,
  WARNING_CATEGORIES,
  type CedolinoCheckCard,
} from "../lib"
import type { CedolinoCheckRunStatus, CedolinoWarningCategory, PayrollBoardColumnData } from "../types"

const RUN_STATUS_LABELS: Record<CedolinoCheckRunStatus, string> = {
  in_corso: "In corso",
  completata: "Completata",
  interrotta: "Interrotta",
}

export type CedoliniControlliViewProps = {
  selectedMonth: string
  columns: PayrollBoardColumnData[]
}

export function CedoliniControlliView({ selectedMonth, columns }: CedoliniControlliViewProps) {
  const { run, results, isLoading, error, isStarting, startError, startMessage, startAnalysis } =
    useCedoliniCheckRun(selectedMonth)

  const [categoryFilter, setCategoryFilter] = React.useState<Set<CedolinoWarningCategory>>(
    createDefaultWarningCategoryFilter,
  )

  const toggleCategory = React.useCallback((category: CedolinoWarningCategory) => {
    setCategoryFilter((current) => toggleWarningCategoryFilter(current, category))
  }, [])

  const cards = React.useMemo(
    () => buildCedolinoCheckCards(results, columns),
    [results, columns],
  )
  const pronti = React.useMemo(() => getProntiCards(cards), [cards])
  const warningGroups = React.useMemo(() => groupWarningsByCategory(cards), [cards])
  const visibleWarningGroups = React.useMemo(
    () => filterWarningGroups(warningGroups, categoryFilter),
    [warningGroups, categoryFilter],
  )
  const totalWarningCount = React.useMemo(
    () => warningGroups.reduce((sum, group) => sum + group.cards.length, 0),
    [warningGroups],
  )

  const isRunning = run?.status === "in_corso"
  const progressPercent = run ? getCheckRunProgressPercent(run) : 0

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            data-testid="cedolini-controlli-avvia"
            onClick={() => void startAnalysis()}
            disabled={isStarting || isRunning}
          >
            {isRunning ? "Analisi in corso…" : "Avvia analisi"}
          </Button>

          {run ? (
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

        {startMessage ? (
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
          <section aria-label="Pronti" data-testid="cedolini-controlli-pronti">
            <h2 className="text-foreground-strong mb-2 flex items-center gap-2 text-sm font-semibold">
              Pronti
              <Badge variant="success" size="sm">
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
                    <CollapsibleTrigger
                      data-testid={`cedolini-controlli-group-${group.category}`}
                      className="w-full justify-start"
                    >
                      {group.category} ({group.cards.length})
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="flex flex-col gap-2 pt-2">
                        {group.cards.map((card) => (
                          <CedolinoCheckCardItem
                            key={`${group.category}-${card.resultId}`}
                            card={card}
                            showWarnings
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
    </div>
  )
}

function CedolinoCheckCardItem({
  card,
  showWarnings = false,
}: {
  card: CedolinoCheckCard
  showWarnings?: boolean
}) {
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
      {showWarnings && card.warnings.length > 0 ? (
        <ul className="text-warning mt-2 flex flex-col gap-1 text-xs">
          {card.warnings.map((warning, index) => (
            <li key={`${warning.category}-${index}`}>{warning.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
