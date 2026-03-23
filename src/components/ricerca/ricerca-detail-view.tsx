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
import {
  type CrmPipelineCardData,
  useCrmPipelinePreview,
} from "@/hooks/use-crm-pipeline-preview"
import { fetchFamiglie, fetchProcessiMatching } from "@/lib/anagrafiche-api"
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

function toStringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") {
    const normalized = value.trim()
    return normalized ? normalized : null
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return null
}

function getFirstArrayValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = toStringValue(item)
      if (normalized) return normalized
    }
  }
  return toStringValue(value)
}

function getStringArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toStringValue(item))
      .filter((item): item is string => Boolean(item))
  }
  const single = toStringValue(value)
  return single ? [single] : []
}

function toBooleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return null
    if (["true", "1", "si", "sì", "yes"].includes(normalized)) return true
    if (["false", "0", "no"].includes(normalized)) return false
  }
  return null
}

function formatItalianDate(value: unknown): string {
  const raw = toStringValue(value)
  if (!raw) return "-"

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return "-"

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed)
}

function displayValue(value: unknown): string {
  return toStringValue(value) ?? "-"
}

function extractFirstNumberToken(value: unknown) {
  const raw = toStringValue(value)
  if (!raw) return null
  const match = raw.match(/\d+(?:[.,]\d+)?/)
  return match?.[0] ?? null
}

export function RicercaDetailView({ processId, onBack }: RicercaDetailViewProps) {
  const { loading, error, columns, lookupOptionsByField, updateProcessCard } =
    useCrmPipelinePreview()
  const [isEditingNoMatchReason, setIsEditingNoMatchReason] = React.useState(false)
  const [fallbackCard, setFallbackCard] = React.useState<CrmPipelineCardData | null>(
    null
  )
  const [isFallbackLoading, setIsFallbackLoading] = React.useState(false)

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
    const token = normalizeLookupToken((card ?? fallbackCard)?.statoRes)
    return token === "no_match" || token === "no match"
  }, [card, fallbackCard])

  React.useEffect(() => {
    if (loading || card) {
      setFallbackCard(null)
      setIsFallbackLoading(false)
      return
    }

    let cancelled = false
    setIsFallbackLoading(true)

    const loadFallback = async () => {
      try {
        const processResult = await fetchProcessiMatching({
          limit: 1,
          offset: 0,
          filters: {
            kind: "group",
            id: "ricerca-detail-by-id",
            logic: "and",
            nodes: [
              {
                kind: "condition",
                id: "ricerca-detail-id-condition",
                field: "id",
                operator: "is",
                value: processId,
              },
            ],
          },
        })

        const processRow = Array.isArray(processResult.rows)
          ? (processResult.rows[0] as Record<string, unknown> | undefined)
          : undefined

        if (!processRow) {
          if (!cancelled) setFallbackCard(null)
          return
        }

        const famigliaId = toStringValue(processRow.famiglia_id)
        let familyRow: Record<string, unknown> | null = null

        if (famigliaId) {
          const familyResult = await fetchFamiglie({
            limit: 1,
            offset: 0,
            filters: {
              kind: "group",
              id: "ricerca-detail-family-by-id",
              logic: "and",
              nodes: [
                {
                  kind: "condition",
                  id: "ricerca-detail-family-id-condition",
                  field: "id",
                  operator: "is",
                  value: famigliaId,
                },
              ],
            },
          })
          familyRow = (familyResult.rows?.[0] as Record<string, unknown> | undefined) ?? null
        }

        const familyName = [
          toStringValue(familyRow?.nome),
          toStringValue(familyRow?.cognome),
        ]
          .filter((value): value is string => Boolean(value))
          .join(" ")

        const giorniSettimanaValue =
          toStringValue(processRow.numero_giorni_settimanali) ??
          extractFirstNumberToken(processRow.frequenza_rapporto) ??
          "-"

        const mapped: CrmPipelineCardData = {
          id: displayValue(processRow.id),
          famigliaId: famigliaId ?? "-",
          stage: displayValue(processRow.stato_sales),
          nomeFamiglia: familyName || "-",
          email: displayValue(familyRow?.email),
          telefono: displayValue(familyRow?.telefono),
          dataLead: formatItalianDate(familyRow?.creato_il),
          tipoLavoroBadge: getFirstArrayValue(processRow.tipo_lavoro),
          tipoLavoroColor: null,
          tipoRapportoBadge: getFirstArrayValue(processRow.tipo_rapporto),
          tipoRapportoColor: null,
          statoRes: displayValue(processRow.stato_res),
          qualificazioneLead: displayValue(processRow.qualificazione_lead),
          motivoNoMatch: displayValue(processRow.motivo_no_match),
          modelloSmartmatching: displayValue(processRow.modello_smartmatching),
          oreSettimana: displayValue(processRow.ore_settimanale),
          giorniSettimana: giorniSettimanaValue,
          giornatePreferite: getStringArrayValue(processRow.preferenza_giorno),
          salesColdCallFollowup: displayValue(processRow.sales_cold_call_followup),
          salesNoShowFollowup: displayValue(processRow.sales_no_show_followup),
          motivazioneLost: displayValue(processRow.motivazione_lost),
          motivazioneOot: displayValue(processRow.motivazione_oot),
          appuntiChiamataSales: displayValue(processRow.appunti_chiamata_sales),
          dataPerRicercaFutura: formatItalianDate(processRow.data_per_ricerca_futura),
          dataCallPrenotata: formatItalianDate(familyRow?.data_call_prenotata),
          orarioDiLavoro: displayValue(processRow.orario_di_lavoro),
          nucleoFamigliare: displayValue(processRow.nucleo_famigliare),
          descrizioneCasa: displayValue(processRow.descrizione_casa),
          metraturaCasa: displayValue(processRow.metratura_casa),
          descrizioneAnimaliInCasa: displayValue(processRow.descrizione_animali_in_casa),
          mansioniRichieste: displayValue(processRow.mansioni_richieste),
          informazioniExtraRiservate: displayValue(processRow.informazioni_extra_riservate),
          etaMinima: displayValue(processRow.eta_minima),
          etaMassima: displayValue(processRow.eta_massima),
          indirizzoProvincia: displayValue(processRow.indirizzo_prova_provincia),
          indirizzoCap: displayValue(processRow.indirizzo_prova_cap),
          indirizzoNote: displayValue(processRow.indirizzo_prova_note),
          indirizzoCompleto: [
            toStringValue(processRow.indirizzo_prova_via),
            toStringValue(processRow.indirizzo_prova_civico),
            toStringValue(processRow.indirizzo_prova_comune),
            toStringValue(processRow.indirizzo_prova_cap),
          ]
            .filter((item): item is string => Boolean(item))
            .join(", "),
          srcEmbedMapsAnnucio: displayValue(processRow.src_embed_maps_annucio),
          deadlineMobile: formatItalianDate(processRow.deadline_mobile),
          disponibilitaColloquiInPresenza: displayValue(
            processRow.disponibilita_colloqui_in_presenza
          ),
          tipoIncontroFamigliaLavoratore: displayValue(
            processRow.tipo_incontro_famiglia_lavoratore
          ),
          richiestaPatente: toBooleanValue(processRow.richiesta_patente) ?? false,
          richiestaTrasferte: toBooleanValue(processRow.richiesta_trasferte) ?? false,
          richiestaFerie: toBooleanValue(processRow.richiesta_ferie) ?? false,
          descrizioneRichiestaTrasferte: displayValue(
            processRow.descrizione_richiesta_trasferte
          ),
          descrizioneRichiestaFerie: displayValue(processRow.descrizione_richiesta_ferie),
          patenteDettaglio:
            getFirstArrayValue(processRow.patente) ?? displayValue(processRow.patente),
          sesso: toStringValue(processRow.sesso),
        }

        if (!cancelled) setFallbackCard(mapped)
      } finally {
        if (!cancelled) setIsFallbackLoading(false)
      }
    }

    void loadFallback()

    return () => {
      cancelled = true
    }
  }, [card, loading, processId])

  const resolvedCard = card ?? fallbackCard

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

      {loading || isFallbackLoading ? (
        <div className="shrink-0 text-muted-foreground rounded-lg border p-4 text-sm">
          Caricamento dettaglio ricerca...
        </div>
      ) : !resolvedCard ? (
        <div className="shrink-0 rounded-lg border p-4 text-sm">
          Ricerca non trovata o non disponibile.
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="shrink-0 rounded-xl border bg-white p-4">
            <h2 className="text-xl font-semibold">{renderValue(resolvedCard.nomeFamiglia)}</h2>
            <div className="text-muted-foreground mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <PhoneIcon className="size-4" />
                <span className="truncate">{renderValue(resolvedCard.telefono)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MailIcon className="size-4" />
                <span className="truncate">{renderValue(resolvedCard.email)}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-4" />
                <span className="truncate">{renderValue(resolvedCard.dataLead)}</span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-border bg-muted text-foreground">
                Stato: {lookupDisplayValue("stato_res", resolvedCard.statoRes)}
              </Badge>
              <Badge variant="outline" className="border-border bg-muted text-foreground">
                Modalita incontro:{" "}
                {lookupDisplayValue(
                  "tipo_incontro_famiglia_lavoratore",
                  resolvedCard.tipoIncontroFamigliaLavoratore
                )}
              </Badge>
              {resolvedCard.tipoLavoroBadge ? (
                <Badge
                  variant="outline"
                  className={getTagClassName(resolvedCard.tipoLavoroColor)}
                >
                  <BriefcaseBusinessIcon data-icon="inline-start" />
                  {formatBadgeLabel(resolvedCard.tipoLavoroBadge)}
                </Badge>
              ) : null}
              {resolvedCard.tipoRapportoBadge ? (
                <Badge
                  variant="outline"
                  className={getTagClassName(resolvedCard.tipoRapportoColor)}
                >
                  <Clock3Icon data-icon="inline-start" />
                  {formatBadgeLabel(resolvedCard.tipoRapportoBadge)}
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
                  value={resolveLookupValueKey(
                    "motivo_no_match",
                    resolvedCard.motivoNoMatch
                  )}
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
                  {lookupDisplayValue("motivo_no_match", resolvedCard.motivoNoMatch)}
                </div>
              )}
            </CrmDetailCard>
          ) : null}

          <RicercaWorkersPipelineView
            className="min-h-0 flex-1"
            processId={processId}
            card={resolvedCard}
            lookupOptionsByField={lookupOptionsByField}
            onPatchProcess={updateProcessCard}
          />
        </div>
      )}
    </section>
  )
}
