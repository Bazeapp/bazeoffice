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
  PencilIcon,
  PhoneIcon,
  XIcon,
} from "lucide-react";

import { RicercaWorkersPipelineView } from "./ricerca-workers-pipeline-view";
import { RicercaWorkersMapView } from "./ricerca-workers-map-view";
import { CardMetaRow } from "@/components/shared-next/card-meta-row";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckboxChip } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Form } from "@/components/ui/form";
import {
  FieldInput,
  FieldTextarea,
  FieldCheckbox,
} from "@/components/forms/field-components";
import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
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
import { Textarea } from "@/components/ui/textarea";
import type { CrmPipelineCardData, LookupOptionsByField } from "@/modules/crm";
import { fetchFamiglieByIds, normalizeLookupPatchLabels } from "@/modules/crm";
import { useRicercaWorkersPipeline } from "../hooks/use-ricerca-workers-pipeline";
import { STATI_RICERCA_CANONICI } from "../features/ricerca/stati-ricerca";
import {
  fetchProcessiMatchingByIds,
} from "../queries/fetch-processi-matching-by-ids";
import {
  createRecord,
  fetchIndirizziByEntity,
  fetchLookupValues,
  updateRecord,
} from "@/lib/anagrafiche-api";
import { buildFamilyPrivateAreaUrl } from "@/lib/private-area-url";
import { getRicercaCenter } from "../lib/center-coords";
import { invokeEdgeFunction } from "@/lib/supabase-edge";
import { cn } from "@/lib/utils";
import { useOperatoriOptions } from "@/hooks/use-operatori-options";
import { useProvincieOptions } from "@/hooks/use-provincie";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";

type RicercaDetailViewProps = {
  processId: string;
  selectionId?: string | null;
  onBack: () => void;
  // BAZ-19: instrada la navigazione verso una ricerca correlata attraverso lo
  // shell (push di history) e riporta la selezione focalizzata nella route.
  onOpenRelatedRicerca?: (processId: string, selectionId: string) => void;
  onFocusSelection?: (selectionId: string | null) => void;
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
    famigliaMoltoEsigenteLabel: string;
    nazionalitaEscluseLabel: string;
    nazionalitaObbligatorieLabel: string;
    richiestaAutonomiaLabel: string;
    datoreSpessoPresenteLabel: string;
    richiestaDiscrezioneLabel: string;
    geocode: string;
    descrizioneRichiestaTrasferte: string;
    descrizioneRichiestaFerie: string;
    indirizzoCompleto: string;
    indirizzoVia: string;
    indirizzoCivico: string;
    indirizzoComune: string;
    indirizzoCitofono: string;
    indirizzoProvincia: string;
    indirizzoProvaProvincia: string;
    indirizzoProvaCap: string;
    indirizzoProvaNote: string;
    indirizzoProvaVia: string;
    indirizzoProvaCivico: string;
    indirizzoProvaComune: string;
    indirizzoProvaCitofono: string;
    indirizzoProvaLatitudine: number | null;
    indirizzoProvaLongitudine: number | null;
    deadlineMobile: string;
    deadlineMobileRaw: string;
    dataAssegnazione: string;
    dataAssegnazioneRaw: string;
    nucleoFamigliare: string;
    descrizioneCasa: string;
    metraturaCasa: string;
    descrizioneAnimaliInCasa: string;
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

// Ricava l'ordinale del tentativo più alto (es. "3° chiamata..." -> 3).
// Robusto sia alla scrittura cumulativa ("1°, 2°, 3°") sia a quella
// con singolo ordinale ("3°").
function getCallAttemptCount(value: unknown): number {
  const items = getStringArrayValue(value);
  let maxOrdinal = 0;
  for (const item of items) {
    for (const match of item.matchAll(/\d+/g)) {
      maxOrdinal = Math.max(maxOrdinal, Number(match[0]));
    }
  }
  return maxOrdinal || items.length;
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
    timeZone: "Europe/Rome",
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

function buildCanonicalStatoRicercaOptions(
  options: LookupOptionsByField[string] | undefined,
) {
  const optionsByIdOrLabel = new Map(
    (options ?? []).flatMap((option) => [
      [normalizeLookupToken(option.valueKey), option],
      [normalizeLookupToken(option.valueLabel), option],
    ]),
  );

  return STATI_RICERCA_CANONICI.map((stato) => {
    const lookupOption =
      optionsByIdOrLabel.get(normalizeLookupToken(stato.id)) ??
      optionsByIdOrLabel.get(normalizeLookupToken(stato.label));

    return {
      valueKey: lookupOption?.valueKey ?? stato.id,
      valueLabel: lookupOption?.valueLabel ?? stato.label,
      color: lookupOption?.color ?? stato.color,
      sortOrder: stato.sortOrder,
    };
  });
}

function editableValue(value: unknown) {
  const normalized = toStringValue(value);
  return normalized && normalized !== "-" ? normalized : "";
}

const WEEKDAY_ITEMS = [
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
  "Domenica",
] as const;

const WEEKDAY_ALIASES: Record<string, (typeof WEEKDAY_ITEMS)[number]> = {
  lunedi: "Lunedì",
  "lunedì": "Lunedì",
  martedi: "Martedì",
  "martedì": "Martedì",
  mercoledi: "Mercoledì",
  "mercoledì": "Mercoledì",
  giovedi: "Giovedì",
  "giovedì": "Giovedì",
  venerdi: "Venerdì",
  "venerdì": "Venerdì",
  sabato: "Sabato",
  domenica: "Domenica",
};

function normalizeWeekdayList(values: string[] | null | undefined): string[] {
  if (!values) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const token = raw.trim().toLowerCase();
    const canonical = WEEKDAY_ALIASES[token];
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical);
      result.push(canonical);
    }
  }
  return WEEKDAY_ITEMS.filter((day) => seen.has(day));
}

function toIsoDateInputValue(value: string | null | undefined) {
  const normalized = editableValue(value);
  if (!normalized) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;

  const parts = normalized.split("/");
  if (parts.length !== 3) return "";
  const [day, month, year] = parts;
  if (!day || !month || !year) return "";
  return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

// FASE 5 BIS — routing per chiave del form editForm verso i 3 target di save.
// Le chiavi NON elencate qui sono campi di testo del processo.
const EDIT_FAMILY_KEYS = new Set(["telefono", "email"]);
const EDIT_ADDRESS_KEYS = new Set([
  "cap",
  "note",
  "via",
  "civico",
  "citta",
  "citofono",
]);
const EDIT_DATE_KEYS = new Set(["deadline_mobile", "data_assegnazione"]);
const EDIT_BOOLEAN_KEYS = new Set([
  "richiesta_patente",
  "richiesta_trasferte",
  "richiesta_ferie",
  "comunicare_bene_italiano",
  "comunicare_bene_inglese",
  "famiglia_molto_esigente",
  "richiesta_autonomia",
  "datore_spesso_presente",
  "richiesta_discrezione",
]);

function SectionEditBar({
  section,
  editing,
  onToggle,
  onSave,
  saving,
}: {
  section: string;
  editing: boolean;
  onToggle: (section: string) => void;
  onSave?: () => void;
  saving?: boolean;
}) {
  return (
    <div className="flex items-center gap-1 justify-end">
      {editing && onSave ? (
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={saving}
          onClick={onSave}
        >
          {saving ? "Salvataggio..." : "Salva"}
        </Button>
      ) : null}
      <Button
        type="button"
        variant={editing ? "outline" : "ghost"}
        size="icon-sm"
        aria-label={editing ? "Annulla" : "Modifica sezione"}
        title={editing ? "Annulla" : "Modifica sezione"}
        onClick={() => onToggle(section)}
      >
        {editing ? <XIcon /> : <PencilIcon />}
      </Button>
    </div>
  );
}

// FASE 5 BIS — form-aware: in editing rende i Field* del toolkit (agganciati al
// form via `name`, autosave gestito da useAutoSaveForm); in lettura mostra il
// valore. La trasformazione ""→null e il routing al target avvengono in onSave.
function EditableTextField({
  label,
  name,
  value,
  editing,
  multiline = false,
  labelClassName,
}: {
  label: string;
  name: string;
  value: unknown;
  editing: boolean;
  multiline?: boolean;
  labelClassName?: string;
}) {
  if (!editing) {
    return (
      <Field>
        <FieldLabel variant="eyebrow" className={labelClassName}>
          {label}
        </FieldLabel>
        <p className="text-sm text-foreground">{editableValue(value) || "—"}</p>
      </Field>
    );
  }

  return (
    <Field>
      <FieldLabel variant="eyebrow" className={labelClassName}>
        {label}
      </FieldLabel>
      {multiline ? (
        <FieldTextarea name={name} rows={4} />
      ) : (
        <FieldInput
          name={name}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      )}
    </Field>
  );
}

function EditableDateField({
  label,
  name,
  value,
  editing,
}: {
  label: string;
  name: string;
  value: string | null | undefined;
  editing: boolean;
}) {
  if (!editing) {
    return (
      <Field>
        <FieldLabel variant="eyebrow">{label}</FieldLabel>
        <p className="text-sm text-foreground">{editableValue(value) || "—"}</p>
      </Field>
    );
  }

  return (
    <Field>
      <FieldLabel variant="eyebrow">{label}</FieldLabel>
      <FieldInput name={name} type="date" />
    </Field>
  );
}

function EditableCheckboxField({
  label,
  name,
  value,
  editing,
}: {
  label: string;
  name: string;
  value: boolean;
  editing: boolean;
}) {
  if (!editing) {
    return (
      <Field>
        <FieldLabel variant="eyebrow">{label}</FieldLabel>
        <p className="text-sm text-foreground">{value ? "Sì" : "No"}</p>
      </Field>
    );
  }

  return (
    <label className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface-muted px-3 py-2 text-sm">
      <FieldCheckbox name={name} />
      <span>{label}</span>
    </label>
  );
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
  if ("ore_settimanale" in patch) {
    nextCard.oreSettimana = displayValue(patch.ore_settimanale);
  }
  if ("numero_giorni_settimanali" in patch) {
    nextCard.giorniSettimana = displayValue(patch.numero_giorni_settimanali);
  }
  if ("preferenza_giorno" in patch) {
    nextCard.giornatePreferite = getStringArrayValue(patch.preferenza_giorno);
  }
  if ("mansioni_richieste" in patch) {
    nextCard.mansioniRichieste = displayValue(patch.mansioni_richieste);
  }
  if ("deadline_mobile" in patch) {
    nextCard.deadlineMobile = formatItalianDate(patch.deadline_mobile);
    nextCard.deadlineMobileRaw = toStringValue(patch.deadline_mobile) ?? "";
  }
  if ("data_assegnazione" in patch) {
    nextCard.dataAssegnazione = formatItalianDate(patch.data_assegnazione);
    nextCard.dataAssegnazioneRaw = toStringValue(patch.data_assegnazione) ?? "";
  }
  if ("disponibilita_colloqui_in_presenza" in patch) {
    nextCard.disponibilitaColloquiInPresenza = displayValue(
      patch.disponibilita_colloqui_in_presenza,
    );
  }
  if ("indirizzo_prova_provincia" in patch) {
    nextCard.indirizzoProvaProvincia = displayValue(patch.indirizzo_prova_provincia);
  }
  if ("indirizzo_prova_cap" in patch) {
    nextCard.indirizzoProvaCap = displayValue(patch.indirizzo_prova_cap);
  }
  if ("indirizzo_prova_note" in patch) {
    nextCard.indirizzoProvaNote = displayValue(patch.indirizzo_prova_note);
  }
  if ("indirizzo_prova_via" in patch) {
    nextCard.indirizzoProvaVia = displayValue(patch.indirizzo_prova_via);
  }
  if ("indirizzo_prova_civico" in patch) {
    nextCard.indirizzoProvaCivico = displayValue(patch.indirizzo_prova_civico);
  }
  if ("indirizzo_prova_comune" in patch) {
    nextCard.indirizzoProvaComune = displayValue(patch.indirizzo_prova_comune);
  }
  if ("indirizzo_prova_citofono" in patch) {
    nextCard.indirizzoProvaCitofono = displayValue(patch.indirizzo_prova_citofono);
  }
  if ("recruiter_ricerca_e_selezione_id" in patch) {
    nextCard.recruiterId =
      toStringValue(patch.recruiter_ricerca_e_selezione_id) ?? "";
  }
  if ("nucleo_famigliare" in patch) {
    nextCard.nucleoFamigliare = displayValue(patch.nucleo_famigliare);
  }
  if ("descrizione_casa" in patch) {
    nextCard.descrizioneCasa = displayValue(patch.descrizione_casa);
  }
  if ("metratura_casa" in patch) {
    nextCard.metraturaCasa = displayValue(patch.metratura_casa);
  }
  if ("descrizione_animali_in_casa" in patch) {
    nextCard.descrizioneAnimaliInCasa = displayValue(patch.descrizione_animali_in_casa);
  }
  if ("richiesta_patente" in patch) {
    nextCard.richiestaPatente = Boolean(patch.richiesta_patente);
  }
  if ("richiesta_trasferte" in patch) {
    nextCard.richiestaTrasferte = Boolean(patch.richiesta_trasferte);
  }
  if ("richiesta_ferie" in patch) {
    nextCard.richiestaFerie = Boolean(patch.richiesta_ferie);
  }
  if ("eta_minima" in patch) {
    nextCard.etaMinima = displayValue(patch.eta_minima);
  }
  if ("eta_massima" in patch) {
    nextCard.etaMassima = displayValue(patch.eta_massima);
  }
  if ("sesso" in patch) {
    nextCard.sesso = toStringValue(patch.sesso);
  }
  if ("comunicare_bene_italiano" in patch) {
    nextCard.comunicareBeneItaliano = Boolean(patch.comunicare_bene_italiano);
    nextCard.comunicaItaliano = displayBooleanValue(patch.comunicare_bene_italiano);
  }
  if ("comunicare_bene_inglese" in patch) {
    nextCard.comunicareBeneInglese = Boolean(patch.comunicare_bene_inglese);
    nextCard.comunicaInglese = displayBooleanValue(patch.comunicare_bene_inglese);
  }
  if ("famiglia_molto_esigente" in patch) {
    nextCard.famigliaMoltoEsigente = Boolean(patch.famiglia_molto_esigente);
    nextCard.famigliaMoltoEsigenteLabel = displayBooleanValue(patch.famiglia_molto_esigente);
  }
  if ("richiesta_autonomia" in patch) {
    nextCard.richiestaAutonomia = Boolean(patch.richiesta_autonomia);
    nextCard.richiestaAutonomiaLabel = displayBooleanValue(patch.richiesta_autonomia);
  }
  if ("datore_spesso_presente" in patch) {
    nextCard.datoreSpessoPresente = Boolean(patch.datore_spesso_presente);
    nextCard.datoreSpessoPresenteLabel = displayBooleanValue(patch.datore_spesso_presente);
  }
  if ("richiesta_discrezione" in patch) {
    nextCard.richiestaDiscrezione = Boolean(patch.richiesta_discrezione);
    nextCard.richiestaDiscrezioneLabel = displayBooleanValue(patch.richiesta_discrezione);
  }
  if ("nazionalita_escluse" in patch) {
    nextCard.nazionalitaEscluse = getStringArrayValue(patch.nazionalita_escluse);
    nextCard.nazionalitaEscluseLabel = displayListValue(patch.nazionalita_escluse);
  }
  if ("nazionalita_obbligatorie" in patch) {
    nextCard.nazionalitaObbligatorie = getStringArrayValue(patch.nazionalita_obbligatorie);
    nextCard.nazionalitaObbligatorieLabel = displayListValue(patch.nazionalita_obbligatorie);
  }
  if ("descrizione_richiesta_trasferte" in patch) {
    nextCard.descrizioneRichiestaTrasferte = displayValue(patch.descrizione_richiesta_trasferte);
  }
  if ("descrizione_richiesta_ferie" in patch) {
    nextCard.descrizioneRichiestaFerie = displayValue(patch.descrizione_richiesta_ferie);
  }
  if ("informazioni_extra_riservate" in patch) {
    nextCard.informazioniExtraRiservate = displayValue(patch.informazioni_extra_riservate);
  }
  if ("testo_annuncio_whatsapp" in patch) {
    nextCard.testoAnnuncioWhatsapp = displayValue(patch.testo_annuncio_whatsapp);
  }

  return nextCard;
}

function applyAddressPatchToCard(
  card: ExtendedCardData,
  patch: Record<string, unknown>,
  addressId?: string | null,
): ExtendedCardData {
  const nextCard = { ...card };
  if (addressId) {
    nextCard.indirizzoId = addressId;
  }
  if ("provincia" in patch) {
    nextCard.indirizzoProvincia = displayValue(patch.provincia);
  }
  if ("provincia_sigla" in patch) {
    nextCard.indirizzoProvincia = displayValue(patch.provincia_sigla);
  }
  if ("cap" in patch) {
    nextCard.indirizzoCap = displayValue(patch.cap);
  }
  if ("note" in patch) {
    nextCard.indirizzoNote = displayValue(patch.note);
  }
  if ("via" in patch) {
    nextCard.indirizzoVia = displayValue(patch.via);
  }
  if ("civico" in patch) {
    nextCard.indirizzoCivico = displayValue(patch.civico);
  }
  if ("citta" in patch) {
    nextCard.indirizzoComune = displayValue(patch.citta);
  }
  if ("citofono" in patch) {
    nextCard.indirizzoCitofono = displayValue(patch.citofono);
  }
  nextCard.indirizzoCompleto = displayValue(
    buildAddressLine({
      via: "via" in patch ? patch.via : nextCard.indirizzoVia,
      civico: "civico" in patch ? patch.civico : nextCard.indirizzoCivico,
      citta: "citta" in patch ? patch.citta : nextCard.indirizzoComune,
      cap: "cap" in patch ? patch.cap : nextCard.indirizzoCap,
    }),
  );
  return nextCard;
}

function applyFamilyPatchToCard(
  card: ExtendedCardData,
  patch: Record<string, unknown>,
): ExtendedCardData {
  const nextCard = { ...card };
  if ("telefono" in patch) {
    nextCard.telefono = displayValue(patch.telefono);
  }
  if ("email" in patch) {
    nextCard.email = displayValue(patch.email);
  }
  return nextCard;
}

export function RicercaDetailView({
  processId,
  selectionId = null,
  onBack,
  onOpenRelatedRicerca,
  onFocusSelection,
}: RicercaDetailViewProps) {
  const [currentProcessId, setCurrentProcessId] = React.useState(processId);
  const [focusedSelectionId, setFocusedSelectionId] = React.useState<
    string | null
  >(selectionId ?? null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [card, setCard] = React.useState<ExtendedCardData | null>(null);
  // Incrementato dalla mappa quando il geocoding on-demand popola lat/lng:
  // forza il reload della card cosi' che `indirizzoProvaLatitudine` arrivi
  // valorizzato e il map view riceva `searchCoordinates`.
  const [reloadVersion, setReloadVersion] = React.useState(0);
  const [lookupOptionsByField, setLookupOptionsByField] =
    React.useState<LookupOptionsByField>({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [editingSections, setEditingSections] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [orariDraft, setOrariDraft] = React.useState<{
    orarioDiLavoro: string;
    oreSettimana: string;
    giorniSettimana: string;
    giornatePreferite: string[];
  }>({
    orarioDiLavoro: editableValue(card?.orarioDiLavoro),
    oreSettimana: editableValue(card?.oreSettimana),
    giorniSettimana: editableValue(card?.giorniSettimana),
    giornatePreferite: normalizeWeekdayList(card?.giornatePreferite),
  });
  const [isSavingOrari, setIsSavingOrari] = React.useState(false);
  // Serialize concurrent address-create calls per process so that field
  // patches firing before the first INSERT returns don't each create a
  // new `indirizzi` row.
  const pendingAddressCreateRef = React.useRef<Map<string, Promise<string | null>>>(new Map());
  const provincieOptions = useProvincieOptions();
  const { options: operatorOptions, loading: operatorOptionsLoading } =
    useOperatoriOptions();
  const { options: recruiterOptions } = useOperatoriOptions({
    role: "recruiter",
    activeOnly: true,
  });
  const recruiterLabelsById = React.useMemo(
    () => new Map(recruiterOptions.map((option) => [option.id, option.label])),
    [recruiterOptions],
  );
  const pipelineState = useRicercaWorkersPipeline(currentProcessId);

  React.useEffect(() => {
    setCurrentProcessId(processId);
    setEditingSections(new Set());
  }, [processId]);

  // BAZ-19: la selezione focalizzata è guidata dalla route (prop `selectionId`)
  // così il Back del browser (popstate) ripristina il lavoratore aperto.
  React.useEffect(() => {
    setFocusedSelectionId(selectionId ?? null);
  }, [selectionId]);

  React.useEffect(() => {
    if (editingSections.has("orari")) return;
    setOrariDraft({
      orarioDiLavoro: editableValue(card?.orarioDiLavoro),
      oreSettimana: editableValue(card?.oreSettimana),
      giorniSettimana: editableValue(card?.giorniSettimana),
      giornatePreferite: normalizeWeekdayList(card?.giornatePreferite),
    });
  }, [card, editingSections]);

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

  const isEditingSection = React.useCallback(
    (section: string) => editingSections.has(section),
    [editingSections],
  );

  const toggleEditingSection = React.useCallback((section: string) => {
    setEditingSections((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    const loadDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const [processResult, lookupResult] = await Promise.all([
          fetchProcessiMatchingByIds({ ids: [currentProcessId] }),
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
          const familyResult = await fetchFamiglieByIds([famigliaId]);
          familyRow =
            (familyResult.rows?.[0] as Record<string, unknown> | undefined) ??
            null;
        }

        const addressResult = await fetchIndirizziByEntity(
          "processi_matching",
          [currentProcessId],
          ["luogo", "prova"],
        );
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
        const ricercaCenter = getRicercaCenter(
          {
            tipo_incontro_famiglia_lavoratore: toStringValue(
              processRow.tipo_incontro_famiglia_lavoratore,
            ),
            indirizzo_prova_via: toStringValue(processRow.indirizzo_prova_via),
          },
          addressRows,
        )

        const familyName = [
          toStringValue(familyRow?.nome),
          toStringValue(familyRow?.cognome),
        ]
          .filter((value): value is string => Boolean(value))
          .join(" ");
        const giorniSettimanaValue =
          toStringValue(processRow.numero_giorni_settimanali) ?? "-";
        const tipoLavoroBadges = getStringArrayValue(processRow.tipo_lavoro);

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
          tipoLavoroBadges,
          tipoLavoroBadge: tipoLavoroBadges[0] ?? null,
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
          tentativiChiamataCount: getCallAttemptCount(
            processRow.sales_cold_call_followup,
          ),
          preventivoAccettato:
            toBooleanValue(processRow.preventivo_firmato) ?? false,
          richiestaAttivazioneId: null,
          preventivoUrl: null,
          preventivoTitolo: null,
          preventivoSessionId: null,
          preventivoAcceptanceUrl: null,
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
            processAddress?.provincia_sigla ?? processAddress?.provincia,
          ),
          indirizzoProvinciaSigla: displayValue(
            processAddress?.provincia_sigla ?? processAddress?.provincia,
          ),
          indirizzoCap: displayValue(processAddress?.cap),
          indirizzoNote: displayValue(processAddress?.note),
          indirizzoId: toStringValue(processAddress?.id),
          indirizzoCompleto: displayValue(buildAddressLine(processAddress)),
          indirizzoVia: displayValue(processAddress?.via),
          indirizzoCivico: displayValue(processAddress?.civico),
          indirizzoComune: displayValue(processAddress?.citta),
          indirizzoCitofono: displayValue(processAddress?.citofono),
          indirizzoProvaProvincia: displayValue(processRow.indirizzo_prova_provincia),
          indirizzoProvaCap: displayValue(processRow.indirizzo_prova_cap),
          indirizzoProvaNote: displayValue(processRow.indirizzo_prova_note),
          indirizzoProvaVia: displayValue(processRow.indirizzo_prova_via),
          indirizzoProvaCivico: displayValue(processRow.indirizzo_prova_civico),
          indirizzoProvaComune: displayValue(processRow.indirizzo_prova_comune),
          indirizzoProvaCitofono: displayValue(processRow.indirizzo_prova_citofono),
          geocode: displayValue(processRow.geocode),
          srcEmbedMapsAnnucio: displayValue(processRow.src_embed_maps_annucio),
          indirizzoProvaLatitudine: ricercaCenter?.lat ?? null,
          indirizzoProvaLongitudine: ricercaCenter?.lng ?? null,
          deadlineMobile: formatItalianDate(processRow.deadline_mobile),
          deadlineMobileRaw: toStringValue(processRow.deadline_mobile) ?? "",
          dataAssegnazione: formatItalianDate(processRow.data_assegnazione),
          dataAssegnazioneRaw: toStringValue(processRow.data_assegnazione) ?? "",
          disponibilitaColloquiInPresenza: displayValue(
            processRow.disponibilita_colloqui_in_presenza,
          ),
          familyAvailabilityJson: toStringValue(processRow.family_availability_json),
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
          nazionalitaEscluse: getStringArrayValue(processRow.nazionalita_escluse),
          nazionalitaObbligatorie: getStringArrayValue(
            processRow.nazionalita_obbligatorie,
          ),
          famigliaMoltoEsigente:
            toBooleanValue(processRow.famiglia_molto_esigente) ?? false,
          richiestaAutonomia:
            toBooleanValue(processRow.richiesta_autonomia) ?? false,
          datoreSpessoPresente:
            toBooleanValue(processRow.datore_spesso_presente) ?? false,
          richiestaDiscrezione:
            toBooleanValue(processRow.richiesta_discrezione) ?? false,
          comunicareBeneItaliano:
            toBooleanValue(processRow.comunicare_bene_italiano) ?? false,
          comunicareBeneInglese:
            toBooleanValue(processRow.comunicare_bene_inglese) ?? false,
          presenzaNeonati: toBooleanValue(processRow.presenza_neonati) ?? false,
          piuBambini: toBooleanValue(processRow.piu_bambini) ?? false,
          famiglia4Persone: toBooleanValue(processRow.famiglia_4_persone) ?? false,
          caniPiccoli: toBooleanValue(processRow.cani_piccoli) ?? false,
          caniGrandi: toBooleanValue(processRow.cani_grandi) ?? false,
          gatti: toBooleanValue(processRow.gatti) ?? false,
          pulireRipianiAlti:
            toBooleanValue(processRow.pulire_ripiani_alti) ?? false,
          stirare: toBooleanValue(processRow.stirare) ?? false,
          stirareAbitiDifficili:
            toBooleanValue(processRow.stirare_abiti_difficili) ?? false,
          cucinare: toBooleanValue(processRow.cucinare) ?? false,
          cucinareElaborato: toBooleanValue(processRow.cucinare_elaborato) ?? false,
          curaPiante: toBooleanValue(processRow.cura_piante) ?? false,
          famigliaMoltoEsigenteLabel: displayBooleanValue(
            getFirstPresentValue(processRow, [
              "famiglia_molto_esigente",
              "molto_esigente",
              "cliente_molto_esigente",
            ]),
          ),
          nazionalitaEscluseLabel: displayListValue(
            getFirstPresentValue(processRow, [
              "nazionalita_escluse",
              "nazionalita_esclusa",
              "nazionalita_non_accettate",
            ]),
          ),
          nazionalitaObbligatorieLabel: displayListValue(
            getFirstPresentValue(processRow, [
              "nazionalita_obbligatorie",
              "nazionalita_richieste",
              "nazionalita_preferite",
            ]),
          ),
          richiestaAutonomiaLabel: displayBooleanValue(
            getFirstPresentValue(processRow, [
              "richiesta_autonomia",
              "richiesta_elevata_autonomia",
              "elevata_autonomia_richiesta",
            ]),
          ),
          datoreSpessoPresenteLabel: displayBooleanValue(
            getFirstPresentValue(processRow, [
              "datore_spesso_presente",
              "datore_presente",
              "cliente_spesso_presente",
            ]),
          ),
          richiestaDiscrezioneLabel: displayBooleanValue(
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
    // FASE 4 BIS — revert F.1: il dettaglio NON si auto-ricarica sui tick
    // realtime (era `pipelineState.detailRefreshTick`). Su DB condiviso e
    // attivo quel tick bumpava ad ogni evento → loadDetail ripartiva di
    // continuo e restava bloccato su "Caricamento…". Torniamo al comportamento
    // di prod: ricarica solo al cambio processo o dopo l'auto-geocode
    // (reloadVersion). L'aggiornamento granulare sui cambi remoti è un follow-up.
  }, [currentProcessId, reloadVersion]);

  const updateProcessCard = React.useCallback(
    async (targetProcessId: string, patch: Record<string, unknown>) => {
      setError(null);
      const normalizedPatch = normalizeLookupPatchLabels(
        patch,
        lookupOptionsByField,
      );
      const previousCard = card;

      if (targetProcessId === currentProcessId) {
        setCard((current) =>
          current ? applyProcessPatchToCard(current, normalizedPatch) : current,
        );
      }

      try {
        await updateRecord("processi_matching", targetProcessId, normalizedPatch);
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
    [card, currentProcessId, lookupOptionsByField],
  );

  const updateFamilyCard = React.useCallback(
    async (familyId: string, patch: Record<string, unknown>) => {
      setError(null);
      const previousCard = card;

      setCard((current) =>
        current ? applyFamilyPatchToCard(current, patch) : current,
      );

      try {
        await updateRecord("famiglie", familyId, patch);
      } catch (caughtError) {
        setCard(previousCard);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando famiglia",
        );
        throw caughtError;
      }
    },
    [card],
  );

  const updateAddressCard = React.useCallback(
    async (targetProcessId: string, patch: Record<string, unknown>) => {
      setError(null);
      const previousCard = card;
      const addressId = toStringValue(card?.indirizzoId);

      if (!addressId && !Object.values(patch).some((value) => toStringValue(value))) {
        return;
      }

      setCard((current) =>
        current ? applyAddressPatchToCard(current, patch, addressId) : current,
      );

      try {
        if (addressId) {
          await updateRecord("indirizzi", addressId, patch);
          return;
        }

        const pending = pendingAddressCreateRef.current.get(targetProcessId);
        if (pending) {
          const existingId = await pending;
          if (existingId) {
            await updateRecord("indirizzi", existingId, patch);
            return;
          }
        }

        const createPromise = createRecord("indirizzi", {
          entita_tabella: "processi_matching",
          entita_id: targetProcessId,
          tipo_indirizzo: "luogo",
          ...patch,
        }).then((response) => toStringValue(response.row.id));

        pendingAddressCreateRef.current.set(targetProcessId, createPromise);
        let createdAddressId: string | null = null;
        try {
          createdAddressId = await createPromise;
        } finally {
          if (pendingAddressCreateRef.current.get(targetProcessId) === createPromise) {
            pendingAddressCreateRef.current.delete(targetProcessId);
          }
        }
        if (createdAddressId) {
          setCard((current) =>
            current ? { ...current, indirizzoId: createdAddressId } : current,
          );
        }
      } catch (caughtError) {
        setCard(previousCard);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando indirizzo",
        );
        throw caughtError;
      }
    },
    [card],
  );

  const saveProcessPatch = React.useCallback(
    async (_section: string, patch: Record<string, unknown>) => {
      if (!currentProcessId) return;
      try {
        await updateProcessCard(currentProcessId, patch);
      } catch {
        // Error state is already surfaced by updateProcessCard.
      }
    },
    [currentProcessId, updateProcessCard],
  );

  const saveOrariSection = React.useCallback(async () => {
    if (!currentProcessId) return;
    setIsSavingOrari(true);
    try {
      await saveProcessPatch("orari", {
        orario_di_lavoro: orariDraft.orarioDiLavoro.trim() || null,
        ore_settimanale: orariDraft.oreSettimana.trim() || null,
        numero_giorni_settimanali: orariDraft.giorniSettimana.trim() || null,
        preferenza_giorno:
          orariDraft.giornatePreferite.length > 0
            ? orariDraft.giornatePreferite
            : null,
      });
      await invokeEdgeFunction("family-availability", {
        processo_matching_id: currentProcessId,
      });
      toast.success("Orari e frequenza salvati");
      toggleEditingSection("orari");
    } catch {
      toast.error("Errore salvando orari e frequenza");
    } finally {
      setIsSavingOrari(false);
    }
  }, [currentProcessId, orariDraft, saveProcessPatch, toggleEditingSection]);

  const saveFamilyPatch = React.useCallback(
    async (_section: string, patch: Record<string, unknown>) => {
      const familyId = toStringValue(card?.famigliaId);
      if (!familyId || familyId === "-") return;
      try {
        await updateFamilyCard(familyId, patch);
      } catch {
        // Error state is already surfaced by updateFamilyCard.
      }
    },
    [card?.famigliaId, updateFamilyCard],
  );

  const saveAddressPatch = React.useCallback(
    async (_section: string, patch: Record<string, unknown>) => {
      if (!currentProcessId) return;
      try {
        await updateAddressCard(currentProcessId, patch);
      } catch {
        // Error state is already surfaced by updateAddressCard.
      }
    },
    [currentProcessId, updateAddressCard],
  );

  // FASE 5 BIS — form + autosave: source of truth unica per i campi testo/data/
  // checkbox editabili (sostituisce i useDebouncedSave/DebouncedInput dentro
  // Editable*). onSave instrada per chiave ai 3 target originali (processo,
  // famiglia, indirizzo) con le STESSE trasformazioni: ""→null per i testi,
  // data→null se vuota (il type=date dà già ISO), booleano grezzo per i check.
  // Resync realtime senza clobber: keepDirtyValues dentro useAutoSaveForm.
  const editForm = useAutoSaveForm({
    defaults: {
      // famiglia
      telefono: editableValue(card?.telefono),
      email: editableValue(card?.email),
      // indirizzo (luogo di lavoro) — la provincia resta una Select inline
      cap: editableValue(card?.indirizzoCap),
      note: editableValue(card?.indirizzoNote),
      via: editableValue(card?.indirizzoVia),
      civico: editableValue(card?.indirizzoCivico),
      citta: editableValue(card?.indirizzoComune),
      citofono: editableValue(card?.indirizzoCitofono),
      // processo — testi
      nucleo_famigliare: editableValue(card?.nucleoFamigliare),
      descrizione_casa: editableValue(card?.descrizioneCasa),
      metratura_casa: editableValue(card?.metraturaCasa),
      descrizione_animali_in_casa: editableValue(card?.descrizioneAnimaliInCasa),
      mansioni_richieste: editableValue(card?.mansioniRichieste),
      eta_minima: editableValue(card?.etaMinima),
      eta_massima: editableValue(card?.etaMassima),
      descrizione_richiesta_trasferte: editableValue(
        card?.descrizioneRichiestaTrasferte,
      ),
      descrizione_richiesta_ferie: editableValue(
        card?.descrizioneRichiestaFerie,
      ),
      informazioni_extra_riservate: editableValue(
        card?.informazioniExtraRiservate,
      ),
      disponibilita_colloqui_in_presenza: editableValue(
        card?.disponibilitaColloquiInPresenza,
      ),
      testo_annuncio_whatsapp: editableValue(card?.testoAnnuncioWhatsapp),
      // processo — date (type=date → ISO yyyy-mm-dd)
      deadline_mobile: toIsoDateInputValue(
        card?.deadlineMobileRaw || card?.deadlineMobile,
      ),
      data_assegnazione: toIsoDateInputValue(
        card?.dataAssegnazioneRaw || card?.dataAssegnazione,
      ),
      // processo — checkbox
      richiesta_patente: Boolean(card?.richiestaPatente),
      richiesta_trasferte: Boolean(card?.richiestaTrasferte),
      richiesta_ferie: Boolean(card?.richiestaFerie),
      comunicare_bene_italiano: Boolean(card?.comunicareBeneItaliano),
      comunicare_bene_inglese: Boolean(card?.comunicareBeneInglese),
      famiglia_molto_esigente: Boolean(card?.famigliaMoltoEsigente),
      richiesta_autonomia: Boolean(card?.richiestaAutonomia),
      datore_spesso_presente: Boolean(card?.datoreSpessoPresente),
      richiesta_discrezione: Boolean(card?.richiestaDiscrezione),
    },
    onSave: async (patch) => {
      if (!card) return;
      const familyPatch: Record<string, unknown> = {};
      const addressPatch: Record<string, unknown> = {};
      const processPatch: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(patch)) {
        if (EDIT_FAMILY_KEYS.has(key)) {
          familyPatch[key] = (value as string).trim() || null;
        } else if (EDIT_ADDRESS_KEYS.has(key)) {
          addressPatch[key] = (value as string).trim() || null;
        } else if (EDIT_DATE_KEYS.has(key)) {
          processPatch[key] = (value as string) || null;
        } else if (EDIT_BOOLEAN_KEYS.has(key)) {
          processPatch[key] = Boolean(value);
        } else {
          processPatch[key] = (value as string).trim() || null;
        }
      }
      if (Object.keys(familyPatch).length > 0) {
        await saveFamilyPatch("form", familyPatch);
      }
      if (Object.keys(addressPatch).length > 0) {
        await saveAddressPatch("form", addressPatch);
      }
      if (Object.keys(processPatch).length > 0) {
        await saveProcessPatch("form", processPatch);
      }
    },
  });

  const resolvedCard = React.useMemo<ExtendedCardData | null>(() => {
    return card;
  }, [card]);
  const resolvedPrivateAreaUrl = buildFamilyPrivateAreaUrl(
    resolvedCard?.email,
    resolvedCard?.famigliaId,
  );
  const statoRicercaOptions = React.useMemo(
    () => buildCanonicalStatoRicercaOptions(lookupOptionsByField.stato_res),
    [lookupOptionsByField.stato_res],
  );
  const selectedStatoRicercaValue = selectedLookupOptionValue(
    resolvedCard?.statoRes ?? null,
    statoRicercaOptions,
  );

  const handleOpenRelatedSearch = React.useCallback(
    (nextProcessId: string, nextSelectionId: string) => {
      // BAZ-19: passa dallo shell (push di history) invece di mutare solo lo
      // stato locale, così il Back del browser torna a questa ricerca con il
      // lavoratore precedente ancora focalizzato.
      onOpenRelatedRicerca?.(nextProcessId, nextSelectionId);
    },
    [onOpenRelatedRicerca],
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
  const nazionalitaEscluseOptions = lookupOptionsByField.nazionalita_escluse ?? [];
  const nazionalitaObbligatorieOptions =
    lookupOptionsByField.nazionalita_obbligatorie ?? [];
  const nazionalitaEscluseAnchor = useComboboxAnchor();
  const nazionalitaObbligatorieAnchor = useComboboxAnchor();

  const renderField = (label: string, value: React.ReactNode) => (
    <Field>
      <FieldLabel variant="eyebrow">{label}</FieldLabel>
      <p className="text-sm text-foreground">{value || "—"}</p>
    </Field>
  );

  return (
    <Form {...editForm}>
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
	                  <div className="mt-3 flex min-w-0 items-start justify-between gap-3">
	                    <h2 className="min-w-0 flex-1 text-2xl font-semibold leading-tight tracking-tight">
	                      {resolvedCard.nomeFamiglia ?? "—"}
	                    </h2>
	                    <SectionEditBar
	                      section="header"
	                      editing={isEditingSection("header")}
	                      onToggle={toggleEditingSection}
	                    />
	                  </div>
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
		                        className="flex h-10 w-10 min-w-10 items-center justify-center rounded-full border-border-subtle bg-surface-muted p-0 shadow-none [&>svg]:hidden"
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

                {(resolvedCard.tipoLavoroBadges && resolvedCard.tipoLavoroBadges.length > 0) ||
                resolvedCard.tipoLavoroBadge ||
                resolvedCard.tipoRapportoBadge ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(resolvedCard.tipoLavoroBadges &&
                    resolvedCard.tipoLavoroBadges.length > 0
                      ? resolvedCard.tipoLavoroBadges
                      : resolvedCard.tipoLavoroBadge
                        ? [resolvedCard.tipoLavoroBadge]
                        : []
                    ).map((tipoLavoro) => (
                      <Badge
                        key={tipoLavoro}
                        className="border-emerald-200 bg-emerald-100 text-emerald-700"
                      >
                        {tipoLavoro}
                      </Badge>
                    ))}
                    {resolvedCard.tipoRapportoBadge ? (
                      <Badge className="border-amber-200 bg-amber-100 text-amber-700">
                        {resolvedCard.tipoRapportoBadge}
                      </Badge>
                    ) : null}
	                  </div>
	                ) : null}

                {isEditingSection("header") ? (
                  <div className="space-y-3 rounded-md border border-border-subtle bg-surface-muted p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <EditableTextField
                        label="Telefono"
                        name="telefono"
                        value={resolvedCard.telefono}
                        editing
                      />
                      <EditableTextField
                        label="Email"
                        name="email"
                        value={resolvedCard.email}
                        editing
                      />
                    </div>
                    <EditableDateField
                      label="Deadline"
                      name="deadline_mobile"
                      value={
                        resolvedCard.deadlineMobileRaw ||
                        resolvedCard.deadlineMobile
                      }
                      editing
                    />
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
                  {resolvedCard.indirizzoNote &&
                  resolvedCard.indirizzoNote !== "-" ? (
                    <CardMetaRow icon={<MapPinIcon />}>
                      {resolvedCard.indirizzoNote}
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
                    <AccordionTrigger
                      titleAction={
                        <SectionEditBar
                          section="orari"
                          editing={isEditingSection("orari")}
                          onToggle={toggleEditingSection}
                          onSave={saveOrariSection}
                          saving={isSavingOrari}
                        />
                      }
                    >
                      Orari e frequenza
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <Field>
                        <FieldLabel variant="eyebrow">Orario di lavoro</FieldLabel>
                        {isEditingSection("orari") ? (
                          <Textarea
                            value={orariDraft.orarioDiLavoro}
                            onChange={(e) =>
                              setOrariDraft((d) => ({ ...d, orarioDiLavoro: e.target.value }))
                            }
                            rows={4}
                          />
                        ) : (
                          <p className="text-sm text-foreground">
                            {editableValue(resolvedCard.orarioDiLavoro) || "—"}
                          </p>
                        )}
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field>
                          <FieldLabel variant="eyebrow" className="whitespace-nowrap text-[11px]">
                            Ore settimanali
                          </FieldLabel>
                          {isEditingSection("orari") ? (
                            <Input
                              value={orariDraft.oreSettimana}
                              onChange={(e) =>
                                setOrariDraft((d) => ({ ...d, oreSettimana: e.target.value }))
                              }
                            />
                          ) : (
                            <p className="text-sm text-foreground">
                              {editableValue(resolvedCard.oreSettimana) || "—"}
                            </p>
                          )}
                        </Field>
                        <Field>
                          <FieldLabel variant="eyebrow" className="whitespace-nowrap text-[11px]">
                            Giorni settimanali
                          </FieldLabel>
                          {isEditingSection("orari") ? (
                            <Input
                              value={orariDraft.giorniSettimana}
                              onChange={(e) =>
                                setOrariDraft((d) => ({ ...d, giorniSettimana: e.target.value }))
                              }
                            />
                          ) : (
                            <p className="text-sm text-foreground">
                              {editableValue(resolvedCard.giorniSettimana) || "—"}
                            </p>
                          )}
                        </Field>
                      </div>
                      {isEditingSection("orari") ? (
                        <Field>
                          <FieldLabel variant="eyebrow">Giornate preferite</FieldLabel>
                          <div className="flex flex-wrap gap-1.5">
                            {WEEKDAY_ITEMS.map((day) => {
                              const checked = orariDraft.giornatePreferite.includes(day);
                              return (
                                <CheckboxChip
                                  key={day}
                                  checked={checked}
                                  onCheckedChange={(next) =>
                                    setOrariDraft((d) => {
                                      const set = new Set(d.giornatePreferite);
                                      if (next) set.add(day);
                                      else set.delete(day);
                                      return {
                                        ...d,
                                        giornatePreferite: WEEKDAY_ITEMS.filter((item) =>
                                          set.has(item),
                                        ),
                                      };
                                    })
                                  }
                                >
                                  {day}
                                </CheckboxChip>
                              );
                            })}
                          </div>
                        </Field>
                      ) : resolvedCard.giornatePreferite &&
                        resolvedCard.giornatePreferite.length > 0 ? (
                        <Field>
                          <FieldLabel variant="eyebrow">Giornate preferite</FieldLabel>
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
	                    <AccordionTrigger
                        titleAction={
                          <SectionEditBar
                            section="luogo-lavoro"
                            editing={isEditingSection("luogo-lavoro")}
                            onToggle={toggleEditingSection}
                          />
                        }
                      >
                        Luogo di lavoro
                      </AccordionTrigger>
	                    <AccordionContent className="space-y-3">
	                      <div className="grid grid-cols-2 gap-3">
	                        <div className="space-y-1">
                            <FieldLabel>Provincia</FieldLabel>
                            {isEditingSection("luogo-lavoro") ? (
                              <Select
                                value={resolvedCard.indirizzoProvincia || "none"}
                                onValueChange={(next) => {
                                  const value = next === "none" ? "" : next;
                                  void saveAddressPatch("luogo-lavoro", {
                                    provincia_sigla: value || null,
                                  });
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Seleziona provincia" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">—</SelectItem>
                                  {provincieOptions.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="text-sm">{resolvedCard.indirizzoProvincia || "—"}</p>
                            )}
                          </div>
	                        <EditableTextField
                            label="CAP"
                            name="cap"
                            value={resolvedCard.indirizzoCap}
                            editing={isEditingSection("luogo-lavoro")}
                          />
	                      </div>
	                      <EditableTextField
                          label="Quartiere"
                          name="note"
                          value={resolvedCard.indirizzoNote}
                          editing={isEditingSection("luogo-lavoro")}
                        />
                        {isEditingSection("luogo-lavoro") ? (
                          <div className="grid grid-cols-2 gap-3">
                            <EditableTextField
                              label="Via"
                              name="via"
                              value={resolvedCard.indirizzoVia}
                              editing
                            />
                            <EditableTextField
                              label="Civico"
                              name="civico"
                              value={resolvedCard.indirizzoCivico}
                              editing
                            />
                            <EditableTextField
                              label="Comune"
                              name="citta"
                              value={resolvedCard.indirizzoComune}
                              editing
                            />
                            <EditableTextField
                              label="Citofono"
                              name="citofono"
                              value={resolvedCard.indirizzoCitofono}
                              editing
                            />
                          </div>
                        ) : (
	                        renderField(
	                          "Indirizzo completo",
	                          resolvedCard.indirizzoCompleto,
	                        )
                        )}
	                    </AccordionContent>
	                  </AccordionItem>

	                  <AccordionItem value="famiglia">
	                    <AccordionTrigger
                        titleAction={
                          <SectionEditBar
                            section="famiglia"
                            editing={isEditingSection("famiglia")}
                            onToggle={toggleEditingSection}
                          />
                        }
                      >
                        Famiglia
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Field className="col-span-2">
                            <FieldLabel variant="eyebrow">
                              Link area privata
                            </FieldLabel>
                            {resolvedPrivateAreaUrl ? (
                              <div className="flex min-w-0 items-center gap-2">
                                <a
                                  href={resolvedPrivateAreaUrl}
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
                                      .writeText(resolvedPrivateAreaUrl)
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
	                        <EditableTextField
	                          label="Nucleo famigliare"
	                          name="nucleo_famigliare"
	                          value={resolvedCard.nucleoFamigliare}
                            editing={isEditingSection("famiglia")}
	                        />
	                      </div>
	                      <EditableTextField
	                        label="Descrizione casa"
	                        name="descrizione_casa"
	                        value={resolvedCard.descrizioneCasa}
                          editing={isEditingSection("famiglia")}
                          multiline
	                      />
	                      <div className="grid grid-cols-2 gap-3">
	                        <EditableTextField
	                          label="Metratura casa"
	                          name="metratura_casa"
	                          value={resolvedCard.metraturaCasa}
                            editing={isEditingSection("famiglia")}
	                        />
	                      </div>
	                      <EditableTextField
	                        label="Animali in casa"
	                        name="descrizione_animali_in_casa"
	                        value={resolvedCard.descrizioneAnimaliInCasa}
                          editing={isEditingSection("famiglia")}
                          multiline
	                      />
	                    </AccordionContent>
	                  </AccordionItem>

	                  <AccordionItem value="mansioni">
	                    <AccordionTrigger
                        titleAction={
                          <SectionEditBar
                            section="mansioni"
                            editing={isEditingSection("mansioni")}
                            onToggle={toggleEditingSection}
                          />
                        }
                      >
                        Mansioni
                      </AccordionTrigger>
	                    <AccordionContent className="space-y-3">
	                      <EditableTextField
	                        label="Mansioni richieste"
	                        name="mansioni_richieste"
	                        value={resolvedCard.mansioniRichieste}
                          editing={isEditingSection("mansioni")}
                          multiline
	                      />
	                    </AccordionContent>
	                  </AccordionItem>

	                  <AccordionItem value="richieste-specifiche">
	                    <AccordionTrigger
                        titleAction={
                          <SectionEditBar
                            section="richieste-specifiche"
                            editing={isEditingSection("richieste-specifiche")}
                            onToggle={toggleEditingSection}
                          />
                        }
                      >
                        Richieste specifiche
                      </AccordionTrigger>
	                    <AccordionContent className="space-y-3">
	                      <div className="grid grid-cols-2 gap-3">
	                        <EditableCheckboxField
	                          label="Richiesta patente"
	                          name="richiesta_patente"
	                          value={Boolean(resolvedCard.richiestaPatente)}
                            editing={isEditingSection("richieste-specifiche")}
	                        />
	                        <EditableCheckboxField
	                          label="Richiesta trasferte"
	                          name="richiesta_trasferte"
	                          value={Boolean(resolvedCard.richiestaTrasferte)}
                            editing={isEditingSection("richieste-specifiche")}
	                        />
	                      </div>
	                      <div className="grid grid-cols-2 gap-3">
	                        <EditableCheckboxField
	                          label="Richiesta ferie"
	                          name="richiesta_ferie"
	                          value={Boolean(resolvedCard.richiestaFerie)}
                            editing={isEditingSection("richieste-specifiche")}
	                        />
	                      </div>
	                      <div className="grid grid-cols-2 gap-3">
	                        {isEditingSection("richieste-specifiche") ? (
                            <>
                              <EditableTextField
                                label="Età minima"
                                name="eta_minima"
                                value={resolvedCard.etaMinima}
                                editing
                              />
                              <EditableTextField
                                label="Età massima"
                                name="eta_massima"
                                value={resolvedCard.etaMassima}
                                editing
                              />
                            </>
                          ) : (
                            renderField(
                              "Età lavoratore",
                              `${resolvedCard.etaMinima ?? "-"} - ${resolvedCard.etaMassima ?? "-"}`,
                            )
                          )}
	                        <Field>
                            <FieldLabel variant="eyebrow">Sesso</FieldLabel>
                            {isEditingSection("richieste-specifiche") ? (
                              <Select
                                value={(() => {
                                  const raw = (resolvedCard.sesso ?? "").toLowerCase()
                                  if (raw === "uomo") return "Uomo"
                                  if (raw === "donna") return "Donna"
                                  if (raw === "indifferente") return "Indifferente"
                                  return ""
                                })()}
                                onValueChange={(next) =>
                                  void saveProcessPatch("richieste-specifiche", {
                                    sesso: next || null,
                                  })
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Seleziona" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Indifferente">Indifferente</SelectItem>
                                  <SelectItem value="Donna">Donna</SelectItem>
                                  <SelectItem value="Uomo">Uomo</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <p className="text-sm text-foreground">
                                {resolvedCard.sesso || "—"}
                              </p>
                            )}
                          </Field>
	                      </div>
	                      <div className="grid grid-cols-2 gap-3">
	                        <EditableCheckboxField
	                          label="Comunica in italiano"
	                          name="comunicare_bene_italiano"
	                          value={Boolean(resolvedCard.comunicareBeneItaliano)}
                            editing={isEditingSection("richieste-specifiche")}
	                        />
	                        <EditableCheckboxField
	                          label="Comunica in inglese"
	                          name="comunicare_bene_inglese"
	                          value={Boolean(resolvedCard.comunicareBeneInglese)}
                            editing={isEditingSection("richieste-specifiche")}
	                        />
	                      </div>
	                      <div className="grid grid-cols-2 gap-3">
	                        <EditableCheckboxField
	                          label="Famiglia molto esigente"
	                          name="famiglia_molto_esigente"
	                          value={Boolean(resolvedCard.famigliaMoltoEsigente)}
                            editing={isEditingSection("richieste-specifiche")}
	                        />
	                        <EditableCheckboxField
	                          label="Richiesta autonomia"
	                          name="richiesta_autonomia"
	                          value={Boolean(resolvedCard.richiestaAutonomia)}
                            editing={isEditingSection("richieste-specifiche")}
	                        />
	                      </div>
	                      <div className="grid grid-cols-2 gap-3">
	                        <EditableCheckboxField
	                          label="Datore spesso presente"
	                          name="datore_spesso_presente"
	                          value={Boolean(resolvedCard.datoreSpessoPresente)}
                            editing={isEditingSection("richieste-specifiche")}
	                        />
	                        <EditableCheckboxField
	                          label="Richiesta discrezione"
	                          name="richiesta_discrezione"
	                          value={Boolean(resolvedCard.richiestaDiscrezione)}
                            editing={isEditingSection("richieste-specifiche")}
	                        />
	                      </div>
	                      <Field>
                          <FieldLabel variant="eyebrow">Nazionalità escluse</FieldLabel>
                          {isEditingSection("richieste-specifiche") ? (
                            <Combobox
                              multiple
                              autoHighlight
                              items={nazionalitaEscluseOptions.map((o) => o.valueLabel)}
                              value={resolvedCard.nazionalitaEscluse ?? []}
                              onValueChange={(nextValues) =>
                                void saveProcessPatch("richieste-specifiche", {
                                  nazionalita_escluse:
                                    (nextValues as string[]).length > 0
                                      ? (nextValues as string[])
                                      : null,
                                })
                              }
                            >
                              <ComboboxChips ref={nazionalitaEscluseAnchor} className="w-full">
                                <ComboboxValue>
                                  {(values) => (
                                    <React.Fragment>
                                      {(values as string[]).map((value) => (
                                        <ComboboxChip key={value}>{value}</ComboboxChip>
                                      ))}
                                      <ComboboxChipsInput placeholder="Seleziona nazionalità" />
                                    </React.Fragment>
                                  )}
                                </ComboboxValue>
                              </ComboboxChips>
                              <ComboboxContent anchor={nazionalitaEscluseAnchor} className="max-h-80">
                                <ComboboxEmpty>Nessuna opzione trovata.</ComboboxEmpty>
                                <ComboboxList className="max-h-72 overflow-y-auto">
                                  {(item) => (
                                    <ComboboxItem key={item as string} value={item as string}>
                                      {item as string}
                                    </ComboboxItem>
                                  )}
                                </ComboboxList>
                              </ComboboxContent>
                            </Combobox>
                          ) : (
                            <p className="text-sm text-foreground">
                              {resolvedCard.nazionalitaEscluseLabel || "—"}
                            </p>
                          )}
                        </Field>
	                      <Field>
                          <FieldLabel variant="eyebrow">Nazionalità obbligatorie</FieldLabel>
                          {isEditingSection("richieste-specifiche") ? (
                            <Combobox
                              multiple
                              autoHighlight
                              items={nazionalitaObbligatorieOptions.map((o) => o.valueLabel)}
                              value={resolvedCard.nazionalitaObbligatorie ?? []}
                              onValueChange={(nextValues) =>
                                void saveProcessPatch("richieste-specifiche", {
                                  nazionalita_obbligatorie:
                                    (nextValues as string[]).length > 0
                                      ? (nextValues as string[])
                                      : null,
                                })
                              }
                            >
                              <ComboboxChips ref={nazionalitaObbligatorieAnchor} className="w-full">
                                <ComboboxValue>
                                  {(values) => (
                                    <React.Fragment>
                                      {(values as string[]).map((value) => (
                                        <ComboboxChip key={value}>{value}</ComboboxChip>
                                      ))}
                                      <ComboboxChipsInput placeholder="Seleziona nazionalità" />
                                    </React.Fragment>
                                  )}
                                </ComboboxValue>
                              </ComboboxChips>
                              <ComboboxContent anchor={nazionalitaObbligatorieAnchor} className="max-h-80">
                                <ComboboxEmpty>Nessuna opzione trovata.</ComboboxEmpty>
                                <ComboboxList className="max-h-72 overflow-y-auto">
                                  {(item) => (
                                    <ComboboxItem key={item as string} value={item as string}>
                                      {item as string}
                                    </ComboboxItem>
                                  )}
                                </ComboboxList>
                              </ComboboxContent>
                            </Combobox>
                          ) : (
                            <p className="text-sm text-foreground">
                              {resolvedCard.nazionalitaObbligatorieLabel || "—"}
                            </p>
                          )}
                        </Field>
	                      <EditableTextField
	                        label="Descrizione trasferte"
	                        name="descrizione_richiesta_trasferte"
	                        value={resolvedCard.descrizioneRichiestaTrasferte}
                          editing={isEditingSection("richieste-specifiche")}
                          multiline
	                      />
	                      <EditableTextField
	                        label="Descrizione ferie"
	                        name="descrizione_richiesta_ferie"
	                        value={resolvedCard.descrizioneRichiestaFerie}
                          editing={isEditingSection("richieste-specifiche")}
                          multiline
	                      />
	                      <EditableTextField
	                        label="Informazioni extra riservate"
	                        name="informazioni_extra_riservate"
	                        value={resolvedCard.informazioniExtraRiservate}
                          editing={isEditingSection("richieste-specifiche")}
                          multiline
	                      />
	                    </AccordionContent>
	                  </AccordionItem>

                  <AccordionItem value="recruiter">
                    <AccordionTrigger
                      titleAction={
                        <SectionEditBar
                          section="recruiter"
                          editing={isEditingSection("recruiter")}
                          onToggle={toggleEditingSection}
                        />
                      }
                    >
                      Recruiter
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <Field>
                        <FieldLabel variant="eyebrow">Recruiter assegnato</FieldLabel>
                        {isEditingSection("recruiter") ? (
                          <Select
                            value={resolvedCard.recruiterId || "none"}
                            onValueChange={(next) =>
                              void saveProcessPatch("recruiter", {
                                recruiter_ricerca_e_selezione_id:
                                  next === "none" ? null : next,
                              })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleziona recruiter" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Non assegnata</SelectItem>
                              {recruiterSelectOptions.map((operator) => (
                                <SelectItem key={operator.id} value={operator.id}>
                                  {operator.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <p className="text-sm text-foreground">
                            {assignedRecruiter?.label ?? "Non assegnata"}
                          </p>
                        )}
                      </Field>
                      <EditableDateField
                        label="Data assegnazione"
                        name="data_assegnazione"
                        value={
                          resolvedCard.dataAssegnazioneRaw ||
                          resolvedCard.dataAssegnazione
                        }
                        editing={isEditingSection("recruiter")}
                      />
                    </AccordionContent>
                  </AccordionItem>

	                  <AccordionItem value="tempistiche">
	                    <AccordionTrigger
                        titleAction={
                          <SectionEditBar
                            section="tempistiche"
                            editing={isEditingSection("tempistiche")}
                            onToggle={toggleEditingSection}
                          />
                        }
                      >
                        Tempistiche
                      </AccordionTrigger>
	                    <AccordionContent className="space-y-3">
	                      <EditableDateField
                          label="Deadline"
                          name="deadline_mobile"
                          value={
                            resolvedCard.deadlineMobileRaw ||
                            resolvedCard.deadlineMobile
                          }
                          editing={isEditingSection("tempistiche")}
                        />
	                      <EditableTextField
	                        label="Disponibilità colloqui"
	                        name="disponibilita_colloqui_in_presenza"
	                        value={resolvedCard.disponibilitaColloquiInPresenza}
                          editing={isEditingSection("tempistiche")}
                          multiline
	                      />
                        <EditableDateField
                          label="Data assegnazione"
                          name="data_assegnazione"
                          value={
                            resolvedCard.dataAssegnazioneRaw ||
                            resolvedCard.dataAssegnazione
                          }
                          editing={isEditingSection("tempistiche")}
                        />
	                    </AccordionContent>
	                  </AccordionItem>

	                  <AccordionItem value="annuncio">
	                    <AccordionTrigger
                        titleAction={
                          <SectionEditBar
                            section="annuncio"
                            editing={isEditingSection("annuncio")}
                            onToggle={toggleEditingSection}
                          />
                        }
                      >
                        Annuncio
                      </AccordionTrigger>
	                    <AccordionContent className="space-y-3">
                        {isEditingSection("annuncio") ? (
                          <EditableTextField
                            label="Testo per WhatsApp"
                            name="testo_annuncio_whatsapp"
                            value={resolvedCard.testoAnnuncioWhatsapp}
                            editing
                            multiline
                          />
                        ) : null}
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
                  onFocusSelectionChange={onFocusSelection}
                  onPatchProcess={updateProcessCard}
                  pipelineState={pipelineState}
                  recruiterLabelsById={recruiterLabelsById}
                />
              </TabsContent>
              <TabsContent
                value="mappa"
                className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden"
              >
                <RicercaWorkersMapView
                  className="min-h-0 flex-1 shadow-[0_1px_1px_rgba(0,0,0,0.02),0_2px_4px_rgba(0,0,0,0.04)]"
                  processId={currentProcessId}
                  searchLat={resolvedCard.indirizzoProvaLatitudine}
                  searchLng={resolvedCard.indirizzoProvaLongitudine}
                  jobRole={resolvedCard.tipoLavoroBadge}
                  weeklyDays={resolvedCard.giorniSettimana}
                  pipelineState={pipelineState}
                  onCoordinatesGeocoded={() =>
                    setReloadVersion((current) => current + 1)
                  }
                />
              </TabsContent>
            </div>
          </div>
        )}
      </Tabs>
    </section>
    </Form>
  );
}
