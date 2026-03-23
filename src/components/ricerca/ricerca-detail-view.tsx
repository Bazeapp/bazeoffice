import * as React from "react"
import {
  ArrowLeftIcon,
  BriefcaseBusinessIcon,
  CalendarIcon,
  Clock3Icon,
  MailIcon,
  PencilIcon,
  PhoneIcon,
} from "lucide-react"

import { CrmDetailCard } from "@/components/crm/detail-card"
import { RicercaWorkersPipelineView } from "@/components/ricerca/ricerca-workers-pipeline-view"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getTagClassName } from "@/features/lavoratori/lib/lookup-utils"
import { useCrmPipelinePreview } from "@/hooks/use-crm-pipeline-preview"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type RicercaDetailViewProps = {
  processId: string
  onBack: () => void
}

function renderValue(value: string | null | undefined) {
  if (!value) return "-"
  const normalized = value.trim()
  return normalized ? normalized : "-"
}

function formatBadgeLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replaceAll("/", " / ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeLookupToken(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase()
}

export function RicercaDetailView({ processId, onBack }: RicercaDetailViewProps) {
  const { loading, error, columns, lookupOptionsByField, updateProcessCard } =
    useCrmPipelinePreview()
  const [isEditingNoMatchReason, setIsEditingNoMatchReason] = React.useState(false)

  const card = React.useMemo(() => {
    for (const column of columns) {
      const match = column.cards.find((item) => item.id === processId)
      if (match) return match
    }
    return null
  }, [columns, processId])
  const resolveLookupValueKey = React.useCallback(
    (field: string, rawValue: string) => {
      const options = lookupOptionsByField[field] ?? []
      const token = normalizeLookupToken(rawValue)
      if (!token || token === "-") return ""

      const matched = options.find(
        (option) =>
          normalizeLookupToken(option.valueKey) === token ||
          normalizeLookupToken(option.valueLabel) === token
      )
      return matched?.valueKey ?? rawValue
    },
    [lookupOptionsByField]
  )
  const lookupDisplayValue = React.useCallback(
    (field: string, rawValue: string) => {
      const options = lookupOptionsByField[field] ?? []
      const token = normalizeLookupToken(rawValue)
      if (!token || token === "-") return "-"

      const matched = options.find(
        (option) =>
          normalizeLookupToken(option.valueKey) === token ||
          normalizeLookupToken(option.valueLabel) === token
      )
      if (matched?.valueLabel) return matched.valueLabel

      return rawValue.replaceAll("_", " ")
    },
    [lookupOptionsByField]
  )
  const isNoMatchState = React.useMemo(() => {
    const token = normalizeLookupToken(card?.statoRes)
    return token === "no_match" || token === "no match"
  }, [card?.statoRes])

  return (
    <section className="flex h-[calc(100vh-7.5rem)] min-h-0 w-full flex-col gap-4 overflow-hidden pb-4">
      <div className="shrink-0 flex items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeftIcon className="size-4" />
          Torna alle ricerche
        </Button>
        <div className="text-muted-foreground text-xs">ID ricerca: {processId}</div>
      </div>

      {error ? (
        <div className="shrink-0 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento dettaglio ricerca: {error}
        </div>
      ) : null}

      {loading ? (
        <div className="shrink-0 text-muted-foreground rounded-lg border p-4 text-sm">
          Caricamento dettaglio ricerca...
        </div>
      ) : !card ? (
        <div className="shrink-0 rounded-lg border p-4 text-sm">
          Ricerca non trovata o non disponibile.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="shrink-0 rounded-xl border bg-white p-4">
            <h2 className="text-xl font-semibold">{renderValue(card.nomeFamiglia)}</h2>
            <div className="text-muted-foreground mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <PhoneIcon className="size-4" />
                <span className="truncate">{renderValue(card.telefono)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MailIcon className="size-4" />
                <span className="truncate">{renderValue(card.email)}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-4" />
                <span className="truncate">{renderValue(card.dataLead)}</span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-border bg-muted text-foreground">
                Stato: {lookupDisplayValue("stato_res", card.statoRes)}
              </Badge>
              <Badge variant="outline" className="border-border bg-muted text-foreground">
                Modalita incontro:{" "}
                {lookupDisplayValue(
                  "tipo_incontro_famiglia_lavoratore",
                  card.tipoIncontroFamigliaLavoratore
                )}
              </Badge>
              {card.tipoLavoroBadge ? (
                <Badge variant="outline" className={getTagClassName(card.tipoLavoroColor)}>
                  <BriefcaseBusinessIcon data-icon="inline-start" />
                  {formatBadgeLabel(card.tipoLavoroBadge)}
                </Badge>
              ) : null}
              {card.tipoRapportoBadge ? (
                <Badge variant="outline" className={getTagClassName(card.tipoRapportoColor)}>
                  <Clock3Icon data-icon="inline-start" />
                  {formatBadgeLabel(card.tipoRapportoBadge)}
                </Badge>
              ) : null}
            </div>
          </div>

          {isNoMatchState ? (
            <CrmDetailCard
              title="Motivo No Match"
              className="shrink-0"
              titleAction={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={
                    isEditingNoMatchReason
                      ? "Termina modifica motivo no match"
                      : "Modifica motivo no match"
                  }
                  title={
                    isEditingNoMatchReason
                      ? "Termina modifica motivo no match"
                      : "Modifica motivo no match"
                  }
                  onClick={() => setIsEditingNoMatchReason((current) => !current)}
                >
                  <PencilIcon />
                </Button>
              }
            >
              {isEditingNoMatchReason ? (
                <Select
                  value={resolveLookupValueKey("motivo_no_match", card.motivoNoMatch)}
                  onValueChange={(next) => {
                    void updateProcessCard(processId, {
                      motivo_no_match: next || null,
                    })
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona motivo no match" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {(lookupOptionsByField.motivo_no_match ?? []).map((option) => (
                      <SelectItem key={option.valueKey} value={option.valueKey}>
                        {option.valueLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  {lookupDisplayValue("motivo_no_match", card.motivoNoMatch)}
                </div>
              )}
            </CrmDetailCard>
          ) : null}

          <RicercaWorkersPipelineView
            className="min-h-0 flex-1"
            processId={processId}
            card={card}
            lookupOptionsByField={lookupOptionsByField}
            onPatchProcess={updateProcessCard}
          />
        </div>
      )}
    </section>
  )
}
