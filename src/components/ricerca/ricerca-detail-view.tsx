import * as React from "react";
import {
  CalendarIcon,
  ChevronLeftIcon,
  Clock3Icon,
  CopyIcon,
  KanbanSquareIcon,
  MailIcon,
  MapIcon,
  MapPinIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  PhoneIcon,
} from "lucide-react";

import { RicercaWorkersPipelineView } from "@/components/ricerca/ricerca-workers-pipeline-view";
import { RicercaWorkersMapView } from "@/components/ricerca/ricerca-workers-map-view";
import { CardMetaRow } from "@/components/shared-next/card-meta-row";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type {
  CrmPipelineCardData,
  LookupOptionsByField,
} from "@/hooks/use-crm-pipeline-preview";
import {
  fetchFamiglie,
  fetchIndirizzi,
  fetchLookupValues,
  fetchProcessiMatching,
  updateRecord,
} from "@/lib/anagrafiche-api";
import { cn } from "@/lib/utils";
import { useOperatoriOptions } from "@/hooks/use-operatori-options";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";

type RicercaDetailViewProps = {
  processId: string;
  onBack: () => void;
};

/**
 * Estende CrmPipelineCardData con i campi che vengono caricati via API
 * (fetchProcessiMatching) e che servono al detail completo: tipologia
 * incontro editabile, accordion "Orari e frequenza" e "Richieste famiglia".
 * Tutti opzionali perche provengono dalla useEffect asincrona.
 */
type ExtendedCardData = CrmPipelineCardData &
  Partial<{
    tipoIncontroFamigliaLavoratore: string;
    mansioniRichieste: string;
    orarioDiLavoro: string;
    richiestaPatente: boolean;
    richiestaTrasferte: boolean;
    richiestaFerie: boolean;
    comunicaItaliano: string;
    comunicaInglese: string;
    famigliaMoltoEsigente: string;
    nazionalitaEscluse: string;
    nazionalitaObbligatorie: string;
    richiestaAutonomia: string;
    datoreSpessoPresente: string;
    richiestaDiscrezione: string;
    geocode: string;
    descrizioneRichiestaTrasferte: string;
    descrizioneRichiestaFerie: string;
    indirizzoCompleto: string;
    indirizzoVia: string;
    indirizzoCivico: string;
    indirizzoComune: string;
    indirizzoCitofono: string;
    indirizzoProvincia: string;
    deadlineMobile: string;
    nucleoFamigliare: string;
    descrizioneCasa: string;
    metraturaCasa: string;
    descrizioneAnimaliInCasa: string;
    codiceOtp: string;
    areaPrivataUrl: string;
    informazioniExtraRiservate: string;
    etaMinima: string;
    etaMassima: string;
    recruiterId: string;
  }>;

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

function getOtpSortValue(value: unknown): string | null {
  const rawValue = toStringValue(value);
  if (!rawValue) return null;
  const normalized = rawValue.replace(/\D/g, "");
  return normalized ? normalized : null;
}

function getFamilyOtpCode(value: unknown): string | null {
  const sortValue = getOtpSortValue(value);
  if (!sortValue) return null;
  const otpNumber = 100000 - Number(sortValue);
  return Number.isFinite(otpNumber) ? String(otpNumber) : null;
}

function buildFamilyPrivateAreaUrl(email: unknown, sortValue: unknown) {
  const normalizedEmail = toStringValue(email);
  const normalizedSort = getOtpSortValue(sortValue);
  if (!normalizedEmail || !normalizedSort) return null;

  const params = new URLSearchParams({
    email: normalizedEmail,
    sort: normalizedSort,
    utm_source: "entry_point",
  });

  return `https://app.bazeapp.com/auth/entry-point?${params.toString()}`;
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

function getFirstPresentValue(
  row: Record<string, unknown>,
  fields: string[],
) {
  for (const field of fields) {
    const value = row[field];
    if (value !== null && value !== undefined) return value;
  }
  return undefined;
}

function displayBooleanValue(value: unknown) {
  const parsed = toBooleanValue(value);
  if (parsed === true) return "Sì";
  if (parsed === false) return "No";
  return "Non richiesto";
}

function displayItalianRequirementValue(value: unknown) {
  const parsed = toBooleanValue(value);
  if (parsed === false) return "No";
  return "Sì";
}

function displayListValue(value: unknown) {
  const values = getStringArrayValue(value);
  if (values.length > 0) return values.join(", ");
  return displayValue(value);
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

function toAvatarRingClass(legacyClassName: string) {
  return legacyClassName.replace(/after:border-/g, "ring-2 ring-");
}

function isPlaceholderText(value: string) {
  return value === "-" || value === "—";
}

function firstMeaningfulText(...values: unknown[]) {
  for (const value of values) {
    const normalized = toStringValue(value);
    if (normalized && !isPlaceholderText(normalized)) return normalized;
  }
  return null;
}

function buildAddressLine(address: Record<string, unknown> | null | undefined) {
  if (!address) return null;

  const formatted = toStringValue(address.indirizzo_formattato);
  if (formatted) return formatted;

  return (
    [
      toStringValue(address.via),
      toStringValue(address.civico),
      toStringValue(address.citta),
      toStringValue(address.cap),
    ]
      .filter(
        (item): item is string =>
          typeof item === "string" && !isPlaceholderText(item),
      )
      .join(", ") || null
  );
}

function buildLegacyProcessAddressLine(process: Record<string, unknown>) {
  return (
    [
      toStringValue(process.indirizzo_prova_via),
      toStringValue(process.indirizzo_prova_civico),
      toStringValue(process.indirizzo_prova_comune),
      toStringValue(process.indirizzo_prova_cap),
    ]
      .filter(
        (item): item is string =>
          typeof item === "string" && !isPlaceholderText(item),
      )
      .join(", ") || null
  );
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

function buildLookupOptionsByField(rows: Array<Record<string, unknown>>): LookupOptionsByField {
  return rows.reduce<LookupOptionsByField>((acc, row) => {
    if (row.is_active === false) return acc;
    if (toStringValue(row.entity_table) !== "processi_matching") return acc;

    const field = toStringValue(row.entity_field);
    const valueKey = toStringValue(row.value_key);
    const valueLabel = toStringValue(row.value_label);
    if (!field || !valueKey || !valueLabel) return acc;

    const sortOrder =
      typeof row.sort_order === "number" && Number.isFinite(row.sort_order)
        ? row.sort_order
        : null;
    const color =
      row.metadata &&
      typeof row.metadata === "object" &&
      "color" in row.metadata
        ? toStringValue((row.metadata as Record<string, unknown>).color)
        : null;
    const options = acc[field] ?? [];
    options.push({ valueKey, valueLabel, color, sortOrder });
    options.sort((left, right) => {
      const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.valueLabel.localeCompare(right.valueLabel, "it");
    });
    acc[field] = options;
    return acc;
  }, {});
}

function applyProcessPatchToCard(
  card: ExtendedCardData,
  patch: Record<string, unknown>,
): ExtendedCardData {
  const nextCard = { ...card };

  if ("stato_res" in patch) {
    nextCard.statoRes = displayValue(patch.stato_res);
  }
  if ("tipo_incontro_famiglia_lavoratore" in patch) {
    nextCard.tipoIncontroFamigliaLavoratore = displayValue(
      patch.tipo_incontro_famiglia_lavoratore,
    );
  }
  if ("motivo_no_match" in patch) {
    nextCard.motivoNoMatch = displayValue(patch.motivo_no_match);
  }
  if ("orario_di_lavoro" in patch) {
    nextCard.orarioDiLavoro = displayValue(patch.orario_di_lavoro);
  }
  if ("mansioni_richieste" in patch) {
    nextCard.mansioniRichieste = displayValue(patch.mansioni_richieste);
  }
  if ("deadline_mobile" in patch) {
    nextCard.deadlineMobile = formatItalianDate(patch.deadline_mobile);
  }
  if ("indirizzo_prova_provincia" in patch) {
    nextCard.indirizzoProvincia = displayValue(patch.indirizzo_prova_provincia);
  }
  if ("indirizzo_prova_cap" in patch) {
    nextCard.indirizzoCap = displayValue(patch.indirizzo_prova_cap);
  }
  if ("indirizzo_prova_note" in patch) {
    nextCard.indirizzoNote = displayValue(patch.indirizzo_prova_note);
  }
  if ("indirizzo_prova_via" in patch) {
    nextCard.indirizzoVia = displayValue(patch.indirizzo_prova_via);
  }
  if ("indirizzo_prova_civico" in patch) {
    nextCard.indirizzoCivico = displayValue(patch.indirizzo_prova_civico);
  }
  if ("indirizzo_prova_comune" in patch) {
    nextCard.indirizzoComune = displayValue(patch.indirizzo_prova_comune);
  }
  if ("indirizzo_prova_citofono" in patch) {
    nextCard.indirizzoCitofono = displayValue(patch.indirizzo_prova_citofono);
  }
  if ("recruiter_ricerca_e_selezione_id" in patch) {
    nextCard.recruiterId =
      toStringValue(patch.recruiter_ricerca_e_selezione_id) ?? "";
  }

  return nextCard;
}

export function RicercaDetailView({
  processId,
  onBack,
}: RicercaDetailViewProps) {
  const [currentProcessId, setCurrentProcessId] = React.useState(processId);
  const [focusedSelectionId, setFocusedSelectionId] = React.useState<
    string | null
  >(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [card, setCard] = React.useState<ExtendedCardData | null>(null);
  const [lookupOptionsByField, setLookupOptionsByField] =
    React.useState<LookupOptionsByField>({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const { options: operatorOptions, loading: operatorOptionsLoading } =
    useOperatoriOptions();
  const { options: recruiterOptions } = useOperatoriOptions({
    role: "recruiter",
    activeOnly: true,
  });

  React.useEffect(() => {
    setCurrentProcessId(processId);
    setFocusedSelectionId(null);
  }, [processId]);

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
  const isNoMatchState = React.useMemo(() => {
    const token = normalizeLookupToken(card?.statoRes);
    return token === "no_match" || token === "no match";
  }, [card]);
  const assignedRecruiter = React.useMemo(() => {
    const recruiterId = toStringValue(card?.recruiterId);
    if (!recruiterId) return null;
    return (
      operatorOptions.find((operator) => operator.id === recruiterId) ?? null
    );
  }, [card?.recruiterId, operatorOptions]);
  const recruiterSelectOptions = React.useMemo(() => {
    if (
      !assignedRecruiter ||
      recruiterOptions.some((operator) => operator.id === assignedRecruiter.id)
    ) {
      return recruiterOptions;
    }

    return [assignedRecruiter, ...recruiterOptions];
  }, [assignedRecruiter, recruiterOptions]);

  React.useEffect(() => {
    let cancelled = false;

    const loadDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const [processResult, lookupResult] = await Promise.all([
          fetchProcessiMatching({
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
          }),
          fetchLookupValues(),
        ]);

        const processRow = Array.isArray(processResult.rows)
          ? (processResult.rows[0] as Record<string, unknown> | undefined)
          : undefined;

        if (!processRow) {
          if (!cancelled) {
            setCard(null);
            setLookupOptionsByField(buildLookupOptionsByField(lookupResult.rows));
          }
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

        const addressResult = await fetchIndirizzi({
          select: [
            "tipo_indirizzo",
            "via",
            "civico",
            "cap",
            "citta",
            "provincia",
            "indirizzo_formattato",
            "note",
          ],
          limit: 3,
          offset: 0,
          orderBy: [{ field: "aggiornato_il", ascending: false }],
          filters: {
            kind: "group",
            id: "ricerca-detail-address-by-process",
            logic: "and",
            nodes: [
              {
                kind: "condition",
                id: "ricerca-detail-address-table-condition",
                field: "entita_tabella",
                operator: "is",
                value: "processi_matching",
              },
              {
                kind: "condition",
                id: "ricerca-detail-address-id-condition",
                field: "entita_id",
                operator: "is",
                value: currentProcessId,
              },
              {
                kind: "condition",
                id: "ricerca-detail-address-type-condition",
                field: "tipo_indirizzo",
                operator: "in",
                value: "luogo,prova",
              },
            ],
          },
        });
        const addressRows = Array.isArray(addressResult.rows)
          ? (addressResult.rows as Record<string, unknown>[])
          : [];
        const processAddress =
          addressRows.find(
            (row) =>
              normalizeLookupToken(toStringValue(row.tipo_indirizzo)) ===
              "luogo",
          ) ??
          addressRows.find(
            (row) =>
              normalizeLookupToken(toStringValue(row.tipo_indirizzo)) ===
              "prova",
          ) ??
          addressRows[0] ??
          null;

        const familyName = [
          toStringValue(familyRow?.nome),
          toStringValue(familyRow?.cognome),
        ]
          .filter((value): value is string => Boolean(value))
          .join(" ");
        const familyPrivateAreaUrl = buildFamilyPrivateAreaUrl(
          familyRow?.email,
          familyRow?.base_codice_otp,
        );
        const familyOtpCode = getFamilyOtpCode(familyRow?.base_codice_otp);

        const giorniSettimanaValue =
          toStringValue(processRow.numero_giorni_settimanali) ??
          extractFirstNumberToken(processRow.frequenza_rapporto) ??
          "-";

        const mapped: ExtendedCardData = {
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
          codiceOtp: displayValue(familyOtpCode),
          areaPrivataUrl: displayValue(familyPrivateAreaUrl),
          tipoLavoroBadge: getFirstArrayValue(processRow.tipo_lavoro),
          tipoLavoroColor: null,
          tipoRapportoBadge: getFirstArrayValue(processRow.tipo_rapporto),
          tipoRapportoColor: null,
          statoRes: displayValue(processRow.stato_res),
          recruiterId: toStringValue(processRow.recruiter_ricerca_e_selezione_id) ?? "",
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
          richiestaAttivazioneId: null,
          preventivoUrl: null,
          preventivoTitolo: null,
          feeConcordata: null,
          origineUrl: null,
          scontoApplicatoRaw: null,
          scontoApplicato: "-",
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
            firstMeaningfulText(
              processAddress?.provincia,
              processRow.indirizzo_prova_provincia,
            ),
          ),
          indirizzoCap: displayValue(
            firstMeaningfulText(processAddress?.cap, processRow.indirizzo_prova_cap),
          ),
          indirizzoNote: displayValue(
            firstMeaningfulText(processAddress?.note, processRow.indirizzo_prova_note),
          ),
          indirizzoCompleto: displayValue(
            firstMeaningfulText(
              buildAddressLine(processAddress),
              buildLegacyProcessAddressLine(processRow),
            ),
          ),
          indirizzoVia: displayValue(processRow.indirizzo_prova_via),
          indirizzoCivico: displayValue(processRow.indirizzo_prova_civico),
          indirizzoComune: displayValue(processRow.indirizzo_prova_comune),
          indirizzoCitofono: displayValue(processRow.indirizzo_prova_citofono),
          geocode: displayValue(processRow.geocode),
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
          comunicaItaliano: displayItalianRequirementValue(
            getFirstPresentValue(processRow, [
              "comunica_in_italiano",
              "comunicare_bene_italiano",
              "comunicare_in_italiano",
              "richiesta_italiano",
            ]),
          ),
          comunicaInglese: displayBooleanValue(
            getFirstPresentValue(processRow, [
              "comunica_in_inglese",
              "comunicare_bene_inglese",
              "comunicare_in_inglese",
              "richiesta_inglese",
            ]),
          ),
          famigliaMoltoEsigente: displayBooleanValue(
            getFirstPresentValue(processRow, [
              "famiglia_molto_esigente",
              "molto_esigente",
              "cliente_molto_esigente",
            ]),
          ),
          nazionalitaEscluse: displayListValue(
            getFirstPresentValue(processRow, [
              "nazionalita_escluse",
              "nazionalita_esclusa",
              "nazionalita_non_accettate",
            ]),
          ),
          nazionalitaObbligatorie: displayListValue(
            getFirstPresentValue(processRow, [
              "nazionalita_obbligatorie",
              "nazionalita_richieste",
              "nazionalita_preferite",
            ]),
          ),
          richiestaAutonomia: displayBooleanValue(
            getFirstPresentValue(processRow, [
              "richiesta_autonomia",
              "richiesta_elevata_autonomia",
              "elevata_autonomia_richiesta",
            ]),
          ),
          datoreSpessoPresente: displayBooleanValue(
            getFirstPresentValue(processRow, [
              "datore_spesso_presente",
              "datore_presente",
              "cliente_spesso_presente",
            ]),
          ),
          richiestaDiscrezione: displayBooleanValue(
            getFirstPresentValue(processRow, [
              "richiesta_discrezione",
              "discrezione_richiesta",
            ]),
          ),
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

        if (!cancelled) {
          setCard(mapped);
          setLookupOptionsByField(buildLookupOptionsByField(lookupResult.rows));
        }
      } catch (caughtError) {
        if (cancelled) return;
        setCard(null);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore caricamento dettaglio ricerca",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [currentProcessId]);

  const updateProcessCard = React.useCallback(
    async (targetProcessId: string, patch: Record<string, unknown>) => {
      setError(null);
      const previousCard = card;

      if (targetProcessId === currentProcessId) {
        setCard((current) =>
          current ? applyProcessPatchToCard(current, patch) : current,
        );
      }

      try {
        await updateRecord("processi_matching", targetProcessId, patch);
      } catch (caughtError) {
        if (targetProcessId === currentProcessId) {
          setCard(previousCard);
        }
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando ricerca",
        );
        throw caughtError;
      }
    },
    [card, currentProcessId],
  );

  const resolvedCard = React.useMemo<ExtendedCardData | null>(() => {
    return card;
  }, [card]);
  const statoRicercaOptions = lookupOptionsByField.stato_res ?? [];
  const selectedStatoRicercaValue = selectedLookupOptionValue(
    resolvedCard?.statoRes ?? null,
    statoRicercaOptions,
  );

  const handleOpenRelatedSearch = React.useCallback(
    (nextProcessId: string, nextSelectionId: string) => {
      setCurrentProcessId(nextProcessId);
      setFocusedSelectionId(nextSelectionId);
    },
    [],
  );

  const headerTitle = resolvedCard?.nomeFamiglia
    ? `Famiglia ${resolvedCard.nomeFamiglia}`
    : "Ricerca";

  const oreGiorniLabel = (() => {
    const ore = resolvedCard?.oreSettimana ?? "-";
    const giorni = resolvedCard?.giorniSettimana ?? "-";
    if ((ore === "-" || !ore) && (giorni === "-" || !giorni)) return "-";
    const oreLabel = ore && ore !== "-" ? `${ore}h` : "—";
    const giorniLabel = giorni && giorni !== "-" ? `${giorni}gg` : "—";
    return `${oreLabel} / sett · ${giorniLabel}`;
  })();

  const isDeadlineUrgent = (() => {
    const value = resolvedCard?.deadlineMobile;
    if (!value || value === "-") return false;
    const parts = value.split("/");
    if (parts.length !== 3) return false;
    const [day, month, year] = parts;
    const deadline = new Date(`${year}-${month}-${day}T00:00:00`);
    if (Number.isNaN(deadline.getTime())) return false;
    const now = new Date();
    return deadline.getTime() - now.getTime() <= 1000 * 60 * 60 * 24 * 7;
  })();

  const tipoIncontroOptions =
    lookupOptionsByField.tipo_incontro_famiglia_lavoratore ?? [];

  const renderField = (label: string, value: React.ReactNode) => (
    <Field>
      <FieldLabel variant="eyebrow">{label}</FieldLabel>
      <p className="text-sm text-foreground">{value || "—"}</p>
    </Field>
  );

  return (
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <Tabs
        defaultValue="pipeline"
        className="flex h-full min-h-0 flex-col gap-0"
      >
        <header className="sticky top-0 z-20 shrink-0 border-b border-border-subtle bg-surface px-6 py-3">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <button
                type="button"
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
              >
                <ChevronLeftIcon className="size-3.5" />
                Torna alle ricerche
              </button>
              <h1 className="mt-1 max-w-full truncate text-2xl font-semibold tracking-tight">
                {headerTitle}
              </h1>
            </div>
            <TabsList variant="segmented">
              <TabsTrigger value="mappa">
                <MapIcon />
                Mappa
              </TabsTrigger>
              <TabsTrigger value="pipeline">
                <KanbanSquareIcon />
                Pipeline
              </TabsTrigger>
            </TabsList>
          </div>
        </header>

        {error ? (
          <div className="shrink-0 m-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            Errore caricamento dettaglio ricerca: {error}
          </div>
        ) : null}

        {loading ? (
          <div className="shrink-0 m-6 text-muted-foreground rounded-lg border p-4 text-sm">
            Caricamento dettaglio ricerca...
          </div>
        ) : !resolvedCard ? (
          <div className="shrink-0 m-6 rounded-lg border p-4 text-sm">
            Ricerca non trovata o non disponibile.
          </div>
        ) : (
          <div
            className={cn(
              "grid min-h-0 flex-1 gap-3 overflow-hidden p-3",
              isSidebarCollapsed
                ? "grid-cols-[40px_minmax(0,1fr)]"
                : "grid-cols-1 xl:grid-cols-[clamp(300px,18vw,360px)_minmax(0,1fr)]",
            )}
          >
            {isSidebarCollapsed ? (
              <div className="flex h-full min-h-0 shrink-0 items-start justify-center rounded-lg border border-border-subtle bg-surface p-1 shadow-[0_1px_1px_rgba(0,0,0,0.02),0_2px_4px_rgba(0,0,0,0.04)]">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Espandi dettagli famiglia"
                  title="Espandi dettagli famiglia"
                  onClick={() => setIsSidebarCollapsed(false)}
                >
                  <PanelLeftOpenIcon />
                </Button>
              </div>
            ) : (
            <aside className="flex min-h-0 flex-col overflow-y-auto rounded-lg border border-border-subtle bg-surface p-4 shadow-[0_1px_1px_rgba(0,0,0,0.02),0_2px_4px_rgba(0,0,0,0.04)]">
              <div className="space-y-4">
                <Field>
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel variant="eyebrow">Famiglia</FieldLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Comprimi dettagli famiglia"
                      title="Comprimi dettagli famiglia"
                      onClick={() => setIsSidebarCollapsed(true)}
                    >
                      <PanelLeftCloseIcon />
                    </Button>
                  </div>
                  <h2 className="text-2xl font-semibold leading-tight tracking-tight">
                    {resolvedCard.nomeFamiglia ?? "—"}
                  </h2>
                </Field>

                <Field>
                  <FieldLabel variant="eyebrow">Stato</FieldLabel>
                  <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <Select
                      value={selectedStatoRicercaValue}
                      onValueChange={(next) => {
                        if (!next || !resolvedCard.id) return;
                        void updateProcessCard?.(resolvedCard.id, {
                          stato_res: next || null,
                        });
                      }}
                      disabled={!resolvedCard.id}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleziona stato" />
                      </SelectTrigger>
                      <SelectContent>
                        {statoRicercaOptions.map((option) => (
                          <SelectItem
                            key={option.valueKey}
                            value={option.valueKey}
                          >
                            {option.valueLabel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={card?.recruiterId || "none"}
                      onValueChange={(next) => {
                        if (!resolvedCard.id) return;
                        void updateProcessCard?.(resolvedCard.id, {
                          recruiter_ricerca_e_selezione_id:
                            next === "none" ? null : next,
                        });
                      }}
                      disabled={!resolvedCard.id}
	                    >
	                      <SelectTrigger
	                        className="h-10 w-10 min-w-10 rounded-full border-border-subtle bg-surface-muted p-0 shadow-none [&>svg]:hidden"
	                        aria-label="Cambia recruiter assegnato"
	                        title={
	                          assignedRecruiter
	                            ? `Recruiter: ${assignedRecruiter.label}`
	                            : "Non assegnata"
	                        }
	                      >
	                        <Avatar
	                          size="md"
	                          fallback={
	                            assignedRecruiter
	                              ? assignedRecruiter.avatar
	                              : card?.recruiterId && operatorOptionsLoading
	                                ? "..."
	                                : "-"
	                          }
	                          className={
	                            assignedRecruiter
	                              ? toAvatarRingClass(
	                                  assignedRecruiter.avatarBorderClassName,
	                                )
	                              : "ring-1 ring-zinc-300"
	                          }
	                        />
	                      </SelectTrigger>
                      <SelectContent align="end">
                        <SelectItem value="none">Non assegnata</SelectItem>
                        {recruiterSelectOptions.map((operator) => (
                          <SelectItem key={operator.id} value={operator.id}>
                            <span className="inline-flex min-w-0 items-center gap-2">
                              <Avatar
                                size="sm"
                                fallback={operator.avatar}
                                className={toAvatarRingClass(
                                  operator.avatarBorderClassName,
                                )}
                              />
                              <span className="truncate">{operator.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </Field>

                <Field>
                  <FieldLabel variant="eyebrow">
                    Tipologia di incontro
                  </FieldLabel>
                  <Select
                    value={resolveLookupValueKey(
                      "tipo_incontro_famiglia_lavoratore",
                      resolvedCard.tipoIncontroFamigliaLavoratore,
                    )}
                    onValueChange={(next) => {
                      if (!resolvedCard.id) return;
                      void updateProcessCard?.(resolvedCard.id, {
                        tipo_incontro_famiglia_lavoratore: next || null,
                      });
                    }}
                    disabled={!resolvedCard.id}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleziona tipologia" />
                    </SelectTrigger>
                    <SelectContent>
                      {tipoIncontroOptions.map((option) => (
                        <SelectItem
                          key={option.valueKey}
                          value={option.valueKey}
                        >
                          {option.valueLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {isNoMatchState ? (
                  <Field>
                    <FieldLabel variant="eyebrow">Motivo no match</FieldLabel>
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
                      <SelectContent>
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
                  </Field>
                ) : null}

                {resolvedCard.tipoLavoroBadge ||
                resolvedCard.tipoRapportoBadge ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {resolvedCard.tipoLavoroBadge ? (
                      <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">
                        {resolvedCard.tipoLavoroBadge}
                      </Badge>
                    ) : null}
                    {resolvedCard.tipoRapportoBadge ? (
                      <Badge className="border-amber-200 bg-amber-100 text-amber-700">
                        {resolvedCard.tipoRapportoBadge}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  {resolvedCard.telefono && resolvedCard.telefono !== "-" ? (
                    <CardMetaRow icon={<PhoneIcon />}>
                      {resolvedCard.telefono}
                    </CardMetaRow>
                  ) : null}
                  {resolvedCard.email && resolvedCard.email !== "-" ? (
                    <CardMetaRow icon={<MailIcon />}>
                      {resolvedCard.email}
                    </CardMetaRow>
                  ) : null}
                  {resolvedCard.indirizzoCompleto &&
                  resolvedCard.indirizzoCompleto !== "" ? (
                    <CardMetaRow icon={<MapPinIcon />}>
                      {resolvedCard.indirizzoCompleto}
                    </CardMetaRow>
                  ) : resolvedCard.indirizzoProvincia &&
                    resolvedCard.indirizzoProvincia !== "-" ? (
                    <CardMetaRow icon={<MapPinIcon />}>
                      {resolvedCard.indirizzoProvincia}
                    </CardMetaRow>
                  ) : null}
                  {oreGiorniLabel !== "-" ? (
                    <CardMetaRow icon={<Clock3Icon />}>
                      {oreGiorniLabel}
                    </CardMetaRow>
                  ) : null}
                  {resolvedCard.deadlineMobile &&
                  resolvedCard.deadlineMobile !== "-" ? (
                    <div
                      className={cn(
                        "flex min-w-0 items-center gap-2 text-[12.5px]",
                        isDeadlineUrgent ? "text-red-600" : "text-foreground-muted",
                      )}
                    >
                      <CalendarIcon
                        className={cn(
                          "size-3 shrink-0",
                          isDeadlineUrgent
                            ? "text-red-600"
                            : "text-foreground-faint",
                        )}
                      />
                      <span
                        className={cn(
                          "min-w-0 truncate",
                          isDeadlineUrgent && "font-medium",
                        )}
                      >
                        Deadline: {resolvedCard.deadlineMobile}
                      </span>
                    </div>
                  ) : null}
                </div>

                <Accordion
                  type="multiple"
                  tone="flush"
                  defaultValue={["orari"]}
                >
                  <AccordionItem value="orari">
                    <AccordionTrigger>Orari e frequenza</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      {renderField(
                        "Orario di lavoro",
                        resolvedCard.orarioDiLavoro,
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        {renderField(
                          "Ore settimanali",
                          resolvedCard.oreSettimana,
                        )}
                        {renderField(
                          "Giorni settimanali",
                          resolvedCard.giorniSettimana,
                        )}
                      </div>
                      {resolvedCard.giornatePreferite &&
                      resolvedCard.giornatePreferite.length > 0 ? (
                        <Field>
                          <FieldLabel variant="eyebrow">
                            Giornate preferite
                          </FieldLabel>
                          <div className="flex flex-wrap gap-1.5">
                            {resolvedCard.giornatePreferite.map((giorno) => (
                              <Badge
                                key={giorno}
                                className="border-blue-200 bg-blue-50 text-blue-700"
                              >
                                {giorno}
                              </Badge>
                            ))}
                          </div>
                        </Field>
                      ) : null}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="luogo-lavoro">
                    <AccordionTrigger>Luogo di lavoro</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        {renderField(
                          "Provincia",
                          resolvedCard.indirizzoProvincia,
                        )}
                        {renderField("CAP", resolvedCard.indirizzoCap)}
                      </div>
                      {renderField("Quartiere", resolvedCard.indirizzoNote)}
                      {renderField(
                        "Indirizzo completo",
                        resolvedCard.indirizzoCompleto,
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="famiglia">
                    <AccordionTrigger>Famiglia</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        {renderField("Codice OTP", resolvedCard.codiceOtp)}
                        <Field>
                          <FieldLabel variant="eyebrow">
                            Link area privata
                          </FieldLabel>
                          {resolvedCard.areaPrivataUrl &&
                          resolvedCard.areaPrivataUrl !== "-" ? (
                            <div className="flex min-w-0 items-center gap-2">
                              <a
                                href={resolvedCard.areaPrivataUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="min-w-0 truncate text-sm font-medium text-blue-600 underline-offset-2 hover:underline"
                              >
                                Apri area privata
                              </a>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 shrink-0 px-2"
                                onClick={() => {
                                  void navigator.clipboard
                                    .writeText(resolvedCard.areaPrivataUrl ?? "")
                                    .then(() => toast.success("Link copiato"))
                                    .catch(() =>
                                      toast.error("Impossibile copiare"),
                                    );
                                }}
                              >
                                <CopyIcon className="size-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <p className="text-sm text-foreground">—</p>
                          )}
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {renderField(
                          "Nucleo famigliare",
                          resolvedCard.nucleoFamigliare,
                        )}
                      </div>
                      {renderField(
                        "Descrizione casa",
                        resolvedCard.descrizioneCasa,
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        {renderField(
                          "Metratura casa",
                          resolvedCard.metraturaCasa,
                        )}
                      </div>
                      {renderField(
                        "Animali in casa",
                        resolvedCard.descrizioneAnimaliInCasa,
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="mansioni">
                    <AccordionTrigger>Mansioni</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      {renderField(
                        "Mansioni richieste",
                        resolvedCard.mansioniRichieste,
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="richieste-specifiche">
                    <AccordionTrigger>Richieste specifiche</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        {renderField(
                          "Richiesta patente",
                          resolvedCard.richiestaPatente ? "Sì" : "No",
                        )}
                        {renderField(
                          "Richiesta trasferte",
                          resolvedCard.richiestaTrasferte ? "Sì" : "No",
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {renderField(
                          "Richiesta ferie",
                          resolvedCard.richiestaFerie ? "Sì" : "No",
                        )}
                        {renderField(
                          "Dettaglio patente",
                          resolvedCard.patenteDettaglio,
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {renderField(
                          "Età lavoratore",
                          `${resolvedCard.etaMinima ?? "-"} - ${resolvedCard.etaMassima ?? "-"}`,
                        )}
                        {renderField("Sesso", resolvedCard.sesso)}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {renderField(
                          "Comunica in italiano",
                          resolvedCard.comunicaItaliano,
                        )}
                        {renderField(
                          "Comunica in inglese",
                          resolvedCard.comunicaInglese,
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {renderField(
                          "Famiglia molto esigente",
                          resolvedCard.famigliaMoltoEsigente,
                        )}
                        {renderField(
                          "Richiesta autonomia",
                          resolvedCard.richiestaAutonomia,
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {renderField(
                          "Datore spesso presente",
                          resolvedCard.datoreSpessoPresente,
                        )}
                        {renderField(
                          "Richiesta discrezione",
                          resolvedCard.richiestaDiscrezione,
                        )}
                      </div>
                      {renderField(
                        "Nazionalità escluse",
                        resolvedCard.nazionalitaEscluse,
                      )}
                      {renderField(
                        "Nazionalità obbligatorie",
                        resolvedCard.nazionalitaObbligatorie,
                      )}
                      {renderField(
                        "Descrizione trasferte",
                        resolvedCard.descrizioneRichiestaTrasferte,
                      )}
                      {renderField(
                        "Descrizione ferie",
                        resolvedCard.descrizioneRichiestaFerie,
                      )}
                      {renderField(
                        "Informazioni extra riservate",
                        resolvedCard.informazioniExtraRiservate,
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="tempistiche">
                    <AccordionTrigger>Tempistiche</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      {renderField("Deadline", resolvedCard.deadlineMobile)}
                      {renderField(
                        "Disponibilità colloqui",
                        resolvedCard.disponibilitaColloquiInPresenza,
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="annuncio">
                    <AccordionTrigger>Annuncio</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      {(() => {
                        const brief =
                          resolvedCard.testoAnnuncioWhatsapp?.trim() ?? "";
                        const hasBrief = brief && brief !== "-";
                        return (
                          <Field>
                            <div className="flex items-center justify-between gap-2">
                              <FieldLabel variant="eyebrow">
                                Testo per WhatsApp
                              </FieldLabel>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={!hasBrief}
                                onClick={() => {
                                  if (!hasBrief) return;
                                  void navigator.clipboard
                                    .writeText(brief)
                                    .then(() => toast.success("Testo copiato"))
                                    .catch(() =>
                                      toast.error("Impossibile copiare"),
                                    );
                                }}
                              >
                                <CopyIcon className="size-3.5" />
                                Copia
                              </Button>
                            </div>
                            <div className="rounded-md border bg-surface-muted p-3">
                              {hasBrief ? (
                                <div className="ml-auto max-w-[92%] whitespace-pre-wrap rounded-xl rounded-br-sm border border-emerald-200 bg-emerald-100/80 px-3 py-2 text-sm leading-relaxed text-foreground shadow-sm">
                                  {brief}
                                </div>
                              ) : (
                                <p className="text-muted-foreground text-sm">
                                  Nessun annuncio disponibile.
                                </p>
                              )}
                            </div>
                          </Field>
                        );
                      })()}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </aside>
            )}

            <div className="flex min-h-0 flex-col overflow-hidden">
              <TabsContent
                value="pipeline"
                className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <RicercaWorkersPipelineView
                  key={currentProcessId}
                  className="min-h-0 flex-1"
                  processId={currentProcessId}
                  card={resolvedCard}
                  focusSelectionId={focusedSelectionId}
                  onOpenRelatedSearch={handleOpenRelatedSearch}
                  onPatchProcess={updateProcessCard}
                />
              </TabsContent>
              <TabsContent
                value="mappa"
                className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <RicercaWorkersMapView
                  className="min-h-0 flex-1 shadow-[0_1px_1px_rgba(0,0,0,0.02),0_2px_4px_rgba(0,0,0,0.04)]"
                  processId={currentProcessId}
                  searchGeocode={resolvedCard.geocode}
                  searchMapsEmbed={resolvedCard.srcEmbedMapsAnnucio}
                  jobRole={resolvedCard.tipoLavoroBadge}
                  weeklyDays={resolvedCard.giorniSettimana}
                />
              </TabsContent>
            </div>
          </div>
        )}
      </Tabs>
    </section>
  );
}
