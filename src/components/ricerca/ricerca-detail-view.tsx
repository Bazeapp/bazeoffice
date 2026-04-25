import * as React from "react";
import {
  BriefcaseBusinessIcon,
  CalendarIcon,
  Clock3Icon,
  LoaderCircleIcon,
  PencilIcon,
  SparklesIcon,
} from "lucide-react";

import { CrmDetailCard } from "@/components/crm/detail-card";
import { RicercaWorkersPipelineView } from "@/components/ricerca/ricerca-workers-pipeline-view";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  type CrmPipelineCardData,
  useCrmPipelinePreview,
} from "@/hooks/use-crm-pipeline-preview";
import {
  createRecord,
  fetchFamiglie,
  fetchLavoratori,
  fetchProcessiMatching,
  fetchSelezioniLavoratori,
  runAutomationWebhook,
} from "@/lib/anagrafiche-api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type RicercaDetailViewProps = {
  processId: string;
  onBack: () => void;
};

function normalizeLookupToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function toStringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function getFirstArrayValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = toStringValue(item);
      if (normalized) return normalized;
    }
  }
  return toStringValue(value);
}

function getStringArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => toStringValue(item))
      .filter((item): item is string => Boolean(item));
  }
  const single = toStringValue(value);
  return single ? [single] : [];
}

function toBooleanValue(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    if (["true", "1", "si", "sì", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return null;
}

function formatItalianDate(value: unknown): string {
  const raw = toStringValue(value);
  if (!raw) return "-";

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);
}

function displayValue(value: unknown): string {
  return toStringValue(value) ?? "-";
}

function extractFirstNumberToken(value: unknown) {
  const raw = toStringValue(value);
  if (!raw) return null;
  const match = raw.match(/\d+(?:[.,]\d+)?/);
  return match?.[0] ?? null;
}

function selectedLookupOptionValue(
  selected: string | null | undefined,
  options:
    | {
        valueKey: string;
        valueLabel: string;
      }[]
    | undefined,
) {
  const normalizedSelected = normalizeLookupToken(selected);
  if (!normalizedSelected || !options?.length) return "";

  const match = options.find(
    (option) =>
      normalizeLookupToken(option.valueKey) === normalizedSelected ||
      normalizeLookupToken(option.valueLabel) === normalizedSelected,
  );

  return match?.valueKey ?? "";
}

export function RicercaDetailView({
  processId,
  onBack,
}: RicercaDetailViewProps) {
  const [currentProcessId, setCurrentProcessId] = React.useState(processId);
  const [focusedSelectionId, setFocusedSelectionId] = React.useState<
    string | null
  >(null);
  const { loading, error, columns, lookupOptionsByField, updateProcessCard } =
    useCrmPipelinePreview();
  const [isEditingNoMatchReason, setIsEditingNoMatchReason] =
    React.useState(false);
  const [fallbackCard, setFallbackCard] =
    React.useState<CrmPipelineCardData | null>(null);
  const [isFallbackLoading, setIsFallbackLoading] = React.useState(false);
  const [isRunningSmartMatching, setIsRunningSmartMatching] =
    React.useState(false);
  const [pipelineRefreshKey, setPipelineRefreshKey] = React.useState(0);
  const [isAddWorkerDialogOpen, setIsAddWorkerDialogOpen] =
    React.useState(false);
  const [workerSearchQuery, setWorkerSearchQuery] = React.useState("");
  const [workerSearchResults, setWorkerSearchResults] = React.useState<
    Record<string, unknown>[]
  >([]);
  const [isWorkerSearchLoading, setIsWorkerSearchLoading] =
    React.useState(false);
  const [selectedWorkerToAdd, setSelectedWorkerToAdd] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [manualInsertReason, setManualInsertReason] = React.useState("");
  const [isSubmittingAddWorker, setIsSubmittingAddWorker] =
    React.useState(false);

  React.useEffect(() => {
    setCurrentProcessId(processId);
    setFocusedSelectionId(null);
    setPipelineRefreshKey(0);
  }, [processId]);

  React.useEffect(() => {
    if (!isAddWorkerDialogOpen) {
      setWorkerSearchQuery("");
      setWorkerSearchResults([]);
      setSelectedWorkerToAdd(null);
      setManualInsertReason("");
      setIsWorkerSearchLoading(false);
      return;
    }

    const normalizedQuery = workerSearchQuery.trim();
    if (normalizedQuery.length < 2) {
      setWorkerSearchResults([]);
      setIsWorkerSearchLoading(false);
      return;
    }

    let cancelled = false;
    setIsWorkerSearchLoading(true);

    const timeoutId = window.setTimeout(() => {
      void fetchLavoratori({
        limit: 8,
        offset: 0,
        search: normalizedQuery,
        searchFields: ["nome", "cognome", "email"],
        select: [
          "id",
          "nome",
          "cognome",
          "email",
          "data_di_nascita",
          "provincia",
        ],
      })
        .then((result) => {
          if (cancelled) return;
          setWorkerSearchResults(
            Array.isArray(result.rows)
              ? result.rows.filter(
                  (row): row is Record<string, unknown> =>
                    Boolean(row) && typeof row === "object",
                )
              : [],
          );
        })
        .catch(() => {
          if (cancelled) return;
          setWorkerSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsWorkerSearchLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isAddWorkerDialogOpen, workerSearchQuery]);

  const card = React.useMemo(() => {
    for (const column of columns) {
      const match = column.cards.find((item) => item.id === currentProcessId);
      if (match) return match;
    }
    return null;
  }, [columns, currentProcessId]);
  const resolveLookupValueKey = React.useCallback(
    (field: string, rawValue: string) => {
      const options = lookupOptionsByField[field] ?? [];
      const token = normalizeLookupToken(rawValue);
      if (!token || token === "-") return "";

      const matched = options.find(
        (option) =>
          normalizeLookupToken(option.valueKey) === token ||
          normalizeLookupToken(option.valueLabel) === token,
      );
      return matched?.valueKey ?? rawValue;
    },
    [lookupOptionsByField],
  );
  const lookupDisplayValue = React.useCallback(
    (field: string, rawValue: string) => {
      const options = lookupOptionsByField[field] ?? [];
      const token = normalizeLookupToken(rawValue);
      if (!token || token === "-") return "-";

      const matched = options.find(
        (option) =>
          normalizeLookupToken(option.valueKey) === token ||
          normalizeLookupToken(option.valueLabel) === token,
      );
      if (matched?.valueLabel) return matched.valueLabel;

      return rawValue.replaceAll("_", " ");
    },
    [lookupOptionsByField],
  );
  const isNoMatchState = React.useMemo(() => {
    const token = normalizeLookupToken((card ?? fallbackCard)?.statoRes);
    return token === "no_match" || token === "no match";
  }, [card, fallbackCard]);

  React.useEffect(() => {
    if (loading || card) {
      setFallbackCard(null);
      setIsFallbackLoading(false);
      return;
    }

    let cancelled = false;
    setIsFallbackLoading(true);

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
                value: currentProcessId,
              },
            ],
          },
        });

        const processRow = Array.isArray(processResult.rows)
          ? (processResult.rows[0] as Record<string, unknown> | undefined)
          : undefined;

        if (!processRow) {
          if (!cancelled) setFallbackCard(null);
          return;
        }

        const famigliaId = toStringValue(processRow.famiglia_id);
        let familyRow: Record<string, unknown> | null = null;

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
          });
          familyRow =
            (familyResult.rows?.[0] as Record<string, unknown> | undefined) ??
            null;
        }

        const familyName = [
          toStringValue(familyRow?.nome),
          toStringValue(familyRow?.cognome),
        ]
          .filter((value): value is string => Boolean(value))
          .join(" ");

        const giorniSettimanaValue =
          toStringValue(processRow.numero_giorni_settimanali) ??
          extractFirstNumberToken(processRow.frequenza_rapporto) ??
          "-";

        const mapped: CrmPipelineCardData = {
          id: displayValue(processRow.id),
          famigliaId: famigliaId ?? "-",
          numeroRicercaAttivata: toStringValue(
            processRow.numero_ricerca_attivata,
          ),
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
          salesColdCallFollowup: displayValue(
            processRow.sales_cold_call_followup,
          ),
          salesNoShowFollowup: displayValue(processRow.sales_no_show_followup),
          motivazioneLost: displayValue(processRow.motivazione_lost),
          motivazioneOot: displayValue(processRow.motivazione_oot),
          appuntiChiamataSales: displayValue(processRow.appunti_chiamata_sales),
          dataPerRicercaFutura: formatItalianDate(
            processRow.data_per_ricerca_futura,
          ),
          dataCallPrenotata: formatItalianDate(familyRow?.data_call_prenotata),
          dataLeadRaw: toStringValue(familyRow?.creato_il),
          dataPerRicercaFuturaRaw: toStringValue(
            processRow.data_per_ricerca_futura,
          ),
          dataCallPrenotataRaw: toStringValue(familyRow?.data_call_prenotata),
          tentativiChiamataCount: getStringArrayValue(
            processRow.sales_cold_call_followup,
          ).length,
          preventivoAccettato:
            toBooleanValue(processRow.preventivo_firmato) ?? false,
          orarioDiLavoro: displayValue(processRow.orario_di_lavoro),
          nucleoFamigliare: displayValue(processRow.nucleo_famigliare),
          descrizioneCasa: displayValue(processRow.descrizione_casa),
          metraturaCasa: displayValue(processRow.metratura_casa),
          descrizioneAnimaliInCasa: displayValue(
            processRow.descrizione_animali_in_casa,
          ),
          mansioniRichieste: displayValue(processRow.mansioni_richieste),
          informazioniExtraRiservate: displayValue(
            processRow.informazioni_extra_riservate,
          ),
          etaMinima: displayValue(processRow.eta_minima),
          etaMassima: displayValue(processRow.eta_massima),
          indirizzoProvincia: displayValue(
            processRow.indirizzo_prova_provincia,
          ),
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
            processRow.disponibilita_colloqui_in_presenza,
          ),
          tipoIncontroFamigliaLavoratore: displayValue(
            processRow.tipo_incontro_famiglia_lavoratore,
          ),
          richiestaPatente:
            toBooleanValue(processRow.richiesta_patente) ?? false,
          richiestaTrasferte:
            toBooleanValue(processRow.richiesta_trasferte) ?? false,
          richiestaFerie: toBooleanValue(processRow.richiesta_ferie) ?? false,
          descrizioneRichiestaTrasferte: displayValue(
            processRow.descrizione_richiesta_trasferte,
          ),
          descrizioneRichiestaFerie: displayValue(
            processRow.descrizione_richiesta_ferie,
          ),
          patenteDettaglio:
            getFirstArrayValue(processRow.patente) ??
            displayValue(processRow.patente),
          sesso: toStringValue(processRow.sesso),
          testoAnnuncioWhatsapp: displayValue(
            processRow.testo_annuncio_whatsapp,
          ),
        };

        if (!cancelled) setFallbackCard(mapped);
      } finally {
        if (!cancelled) setIsFallbackLoading(false);
      }
    };

    void loadFallback();

    return () => {
      cancelled = true;
    };
  }, [card, loading, currentProcessId]);

  const resolvedCard = card ?? fallbackCard;
  const statoRicercaOptions = lookupOptionsByField.stato_res ?? [];
  const selectedStatoRicercaValue = selectedLookupOptionValue(
    resolvedCard?.statoRes ?? null,
    statoRicercaOptions,
  );

  const handleRunSmartMatching = React.useCallback(async () => {
    if (!resolvedCard?.id) {
      toast.error("Il processo non ha id");
      return;
    }

    setIsRunningSmartMatching(true);
    try {
      await runAutomationWebhook("workflow-smart-matching", resolvedCard.id);
      toast.success("Smart Matching avviato");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Errore avvio Smart Matching",
      );
    } finally {
      setIsRunningSmartMatching(false);
    }
  }, [resolvedCard]);

  const handleOpenRelatedSearch = React.useCallback(
    (nextProcessId: string, nextSelectionId: string) => {
      setCurrentProcessId(nextProcessId);
      setFocusedSelectionId(nextSelectionId);
    },
    [],
  );

  const handleAddWorkerToSearch = React.useCallback(async () => {
    const workerId = toStringValue(selectedWorkerToAdd?.id);
    const reason = manualInsertReason.trim();

    if (!currentProcessId || !workerId) {
      toast.error("Seleziona un lavoratore");
      return;
    }
    if (!reason) {
      toast.error("La motivazione è obbligatoria");
      return;
    }

    setIsSubmittingAddWorker(true);
    try {
      const existingSelections = await fetchSelezioniLavoratori({
        limit: 1,
        offset: 0,
        select: ["id"],
        filters: {
          kind: "group",
          id: "ricerca-detail-add-worker-duplicate-check",
          logic: "and",
          nodes: [
            {
              kind: "condition",
              id: "ricerca-detail-add-worker-process",
              field: "processo_matching_id",
              operator: "is",
              value: currentProcessId,
            },
            {
              kind: "condition",
              id: "ricerca-detail-add-worker-worker",
              field: "lavoratore_id",
              operator: "is",
              value: workerId,
            },
          ],
        },
      });

      if ((existingSelections.rows ?? []).length > 0) {
        throw new Error("Lavoratore già presente in questa ricerca");
      }

      await createRecord("selezioni_lavoratori", {
        processo_matching_id: currentProcessId,
        lavoratore_id: workerId,
        stato_selezione: "Prospetto",
        motivo_inserimento_manuale: reason,
        source: "manuale",
      });

      setIsAddWorkerDialogOpen(false);
      setPipelineRefreshKey((current) => current + 1);
      toast.success("Lavoratore aggiunto in Prospetto");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Errore aggiungendo il lavoratore",
      );
    } finally {
      setIsSubmittingAddWorker(false);
    }
  }, [currentProcessId, manualInsertReason, selectedWorkerToAdd]);

  const headerTitle = resolvedCard?.nomeFamiglia
    ? `Famiglia ${resolvedCard.nomeFamiglia}`
    : "Ricerca";
  const headerUuid = resolvedCard?.id ?? currentProcessId;

  return (
    <section className="ui-next flex h-full min-h-0 w-full min-w-0 flex-col gap-3 overflow-hidden pb-3">
      <div className="sticky top-0 z-20 shrink-0 bg-transparent px-1 pt-1">
        <div className="bg-card flex flex-col gap-3 rounded-xl border px-4 py-3 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <Breadcrumb className="min-w-0">
                <BreadcrumbList className="text-muted-foreground text-xs">
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <button
                        type="button"
                        onClick={onBack}
                        className="cursor-pointer transition-colors hover:text-foreground"
                      >
                        Torna alle ricerche
                      </button>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="max-w-lg truncate text-foreground">
                      {headerTitle}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <div className="min-w-0 space-y-1">
                <h1 className="max-w-full truncate text-xl font-semibold tracking-tight">
                  {headerTitle}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  {resolvedCard?.dataLead && resolvedCard.dataLead !== "-" ? (
                    <Badge
                      variant="outline"
                      className="h-5 px-2 text-[11px] font-medium border-blue-200 bg-blue-100 text-blue-700"
                    >
                      <CalendarIcon data-icon="inline-start" />
                      {`Lead del ${resolvedCard.dataLead}`}
                    </Badge>
                  ) : null}
                  {resolvedCard?.tipoLavoroBadge ? (
                    <Badge
                      variant="outline"
                      className="h-5 px-2 text-[11px] font-medium border-blue-200 bg-blue-100 text-blue-700"
                    >
                      <BriefcaseBusinessIcon data-icon="inline-start" />
                      {resolvedCard.tipoLavoroBadge}
                    </Badge>
                  ) : null}
                  {resolvedCard?.tipoRapportoBadge ? (
                    <Badge
                      variant="outline"
                      className="h-5 px-2 text-[11px] font-medium border-blue-200 bg-blue-100 text-blue-700"
                    >
                      <Clock3Icon data-icon="inline-start" />
                      {resolvedCard.tipoRapportoBadge}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground truncate text-xs">
                  {headerUuid}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-end gap-3 self-start">
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
                  Stato ricerca
                </p>
                <Select
                  value={selectedStatoRicercaValue}
                  onValueChange={(next) => {
                    if (!next || !resolvedCard?.id) return;
                    void updateProcessCard?.(resolvedCard.id, {
                      stato_res: next || null,
                    });
                  }}
                  disabled={!resolvedCard?.id}
                >
                  <SelectTrigger className="bg-background w-60">
                    <SelectValue placeholder="Seleziona stato ricerca" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {statoRicercaOptions.map((option) => (
                      <SelectItem key={option.valueKey} value={option.valueKey}>
                        {option.valueLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddWorkerDialogOpen(true)}
                >
                  + Aggiungi
                </Button>

                <Button
                  type="button"
                  disabled={!resolvedCard?.id || isRunningSmartMatching}
                  onClick={() => void handleRunSmartMatching()}
                >
                  {isRunningSmartMatching ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <SparklesIcon />
                  )}
                  Smart Matching
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

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
              <Input
                value={workerSearchQuery}
                onChange={(event) => setWorkerSearchQuery(event.target.value)}
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
                  {workerSearchResults.map((worker) => {
                    const workerId = toStringValue(worker.id) ?? "";
                    const workerName =
                      [
                        toStringValue(worker.nome),
                        toStringValue(worker.cognome),
                      ]
                        .filter((value): value is string => Boolean(value))
                        .join(" ")
                        .trim() || "Lavoratore";
                    const workerEmail = toStringValue(worker.email);
                    const isSelected =
                      toStringValue(selectedWorkerToAdd?.id) === workerId;

                    return (
                      <button
                        key={workerId}
                        type="button"
                        onClick={() => setSelectedWorkerToAdd(worker)}
                        className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                          isSelected
                            ? "border-emerald-400 bg-emerald-50"
                            : "border-border hover:bg-muted/50"
                        }`}
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
                  onClick={() =>
                    setIsEditingNoMatchReason((current) => !current)
                  }
                >
                  <PencilIcon />
                </Button>
              }
            >
              {isEditingNoMatchReason ? (
                <Select
                  value={resolveLookupValueKey(
                    "motivo_no_match",
                    resolvedCard.motivoNoMatch,
                  )}
                  onValueChange={(next) => {
                    void updateProcessCard(currentProcessId, {
                      motivo_no_match: next || null,
                    });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona motivo no match" />
                  </SelectTrigger>
                  <SelectContent align="start">
                    {(lookupOptionsByField.motivo_no_match ?? []).map(
                      (option) => (
                        <SelectItem
                          key={option.valueKey}
                          value={option.valueKey}
                        >
                          {option.valueLabel}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                  {lookupDisplayValue(
                    "motivo_no_match",
                    resolvedCard.motivoNoMatch,
                  )}
                </div>
              )}
            </CrmDetailCard>
          ) : null}

          <RicercaWorkersPipelineView
            key={`${currentProcessId}:${pipelineRefreshKey}`}
            className="min-h-0 flex-1"
            processId={currentProcessId}
            card={resolvedCard}
            lookupOptionsByField={lookupOptionsByField}
            focusSelectionId={focusedSelectionId}
            onOpenRelatedSearch={handleOpenRelatedSearch}
            onPatchProcess={updateProcessCard}
          />
        </div>
      )}
    </section>
  );
}
