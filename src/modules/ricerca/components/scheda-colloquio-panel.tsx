import * as React from "react";
import {
  AlertTriangleIcon,
  BotIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  Clock3Icon,
  CoinsIcon,
  MapPinIcon,
  TargetIcon,
  ThumbsUpIcon,
  TrophyIcon,
  XIcon,
} from "lucide-react";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { useController } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { FieldTextarea } from "@/components/forms/field-components";
import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import {
  asString,
  getLookupLabelForSave,
  getLookupOptionLabel,
  getLookupSelectValue,
  normalizeLookupDbLabels,
  normalizeLookupOptionValues,
  readArrayStrings,
  type LookupOption,
} from "@/modules/lavoratori/lib"
import { romaDateTimeToUtcIso, utcIsoToRomaParts } from "@/lib/datetime";

type SelectionRow = Record<string, unknown>;

type ScoreCardValue = "Basso" | "Medio" | "Alto";

type SchedaColloquioPanelProps = {
  selectionRow: SelectionRow;
  nonSelezionatoOptions: LookupOption[];
  noMatchOptions: LookupOption[];
  disabled?: boolean;
  isGeneratingFeedback?: boolean;
  onGenerateFeedback?: () => Promise<string | null | undefined> | string | null | undefined;
  onPatchField: (field: string, value: unknown) => Promise<void> | void;
};

const SCORE_OPTIONS: ScoreCardValue[] = ["Basso", "Medio", "Alto"];

const SLOT_INDEXES = [0, 1, 2] as const;

const COLLOQUIO_EFFETTUATO_OPTIONS = [
  "Effettuato",
  "No show",
  "Annullato dalla famiglia",
  "Annullato dal lavoratore",
] as const;

function toDateInputParts(value: unknown): { date: string; time: string } {
  const raw = asString(value);
  return utcIsoToRomaParts(raw);
}

function toTimestampValue(date: string, time: string) {
  if (!date || !time) return null;
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return null;
  return romaDateTimeToUtcIso(date, time);
}

function toDatetimeLocalValue(value: unknown) {
  const parts = toDateInputParts(value);
  if (!parts.date || !parts.time) return "";
  return `${parts.date}T${parts.time}`;
}

function datetimeLocalToTimestampValue(value: string) {
  const [date = "", time = ""] = value.split("T");
  return toTimestampValue(date, time);
}

function normalizeStatusToken(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

// --- form keys per gli slot (split data/ora; ricomposti in timestamp in onSave) ---
function slotDataKey(slotIndex: number, boundary: "inizio" | "fine") {
  return `slot_${slotIndex + 1}_${boundary}_data` as const;
}
function slotOraKey(slotIndex: number, boundary: "inizio" | "fine") {
  return `slot_${slotIndex + 1}_${boundary}_ora` as const;
}
function slotTimestampColumn(slotIndex: number, boundary: "inizio" | "fine") {
  return `disponibilita_colloquio_lavoratore_slot${slotIndex + 1}_${boundary}` as const;
}

// FASE 5 BIS — defaults del form: chiavi = colonne DB esatte (testo/score/
// lookup) + chiavi locali split per gli slot (ricomposti in onSave). Stessa
// init dell'originale (asString, readArrayStrings, toDatetimeLocalValue, ...).
function buildDefaults(selectionRow: SelectionRow) {
  const defaults: Record<string, unknown> = {
    intervista_giorni_lavoro: asString(selectionRow.intervista_giorni_lavoro),
    intervista_orario_e_giorni: asString(selectionRow.intervista_orario_e_giorni),
    intervista_distanza: asString(selectionRow.intervista_distanza),
    intervista_stipendio: asString(selectionRow.intervista_stipendio),
    intervista_punti_forza: asString(selectionRow.intervista_punti_forza),
    intervista_punti_debolezza: asString(selectionRow.intervista_punti_debolezza),
    messaggio_famiglia_selezione_lavoratore: asString(
      selectionRow.messaggio_famiglia_selezione_lavoratore,
    ),
    score_orario_e_giorni:
      (asString(selectionRow.score_orario_e_giorni) as ScoreCardValue | "") || "",
    score_esperienze_simili:
      (asString(selectionRow.score_esperienze_simili) as ScoreCardValue | "") || "",
    score_stipendio:
      (asString(selectionRow.score_stipendio) as ScoreCardValue | "") || "",
    score_job_fit:
      (asString(selectionRow.score_job_fit) as ScoreCardValue | "") || "",
    colloquio_effettuato: asString(selectionRow.colloquio_effettuato),
    motivo_non_selezionato: readArrayStrings(selectionRow.motivo_non_selezionato),
    motivo_no_match: asString(selectionRow.motivo_no_match),
    data_ora_colloquio_famiglia_lavoratore: toDatetimeLocalValue(
      selectionRow.data_ora_colloquio_famiglia_lavoratore,
    ),
  };

  for (const slotIndex of SLOT_INDEXES) {
    const inizio = toDateInputParts(
      selectionRow[slotTimestampColumn(slotIndex, "inizio")],
    );
    const fine = toDateInputParts(
      selectionRow[slotTimestampColumn(slotIndex, "fine")],
    );
    defaults[slotDataKey(slotIndex, "inizio")] = inizio.date;
    defaults[slotOraKey(slotIndex, "inizio")] = inizio.time;
    defaults[slotDataKey(slotIndex, "fine")] = fine.date;
    defaults[slotOraKey(slotIndex, "fine")] = fine.time;
  }

  return defaults;
}

const SLOT_FORM_KEYS = new Set<string>(
  SLOT_INDEXES.flatMap((slotIndex) => [
    slotDataKey(slotIndex, "inizio"),
    slotOraKey(slotIndex, "inizio"),
    slotDataKey(slotIndex, "fine"),
    slotOraKey(slotIndex, "fine"),
  ]),
);

const TEXT_FIELD_KEYS = new Set([
  "intervista_giorni_lavoro",
  "intervista_orario_e_giorni",
  "intervista_distanza",
  "intervista_stipendio",
  "intervista_punti_forza",
  "intervista_punti_debolezza",
  "messaggio_famiglia_selezione_lavoratore",
]);

function CollapsibleSection({
  title,
  icon: Icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ElementType;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <CollapsiblePrimitive.Root open={open} onOpenChange={setOpen}>
      <CollapsiblePrimitive.Trigger className="bg-muted hover:bg-muted/80 sticky top-0 z-10 flex w-full items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-foreground transition-colors">
        <Icon className="text-muted-foreground size-3.5" />
        <span className="flex-1 text-left">{title}</span>
        <ChevronDownIcon
          className={`text-muted-foreground size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsiblePrimitive.Trigger>
      <CollapsiblePrimitive.Content className="space-y-3 px-2 py-3">
        {children}
      </CollapsiblePrimitive.Content>
    </CollapsiblePrimitive.Root>
  );
}

// --- FASE 5 BIS — wrapper form-aware locali (Select score con sentinel "none",
//     Select lookup label↔key, multi-lookup combo, datetime-local). ---
function FieldLabeledTextarea({
  name,
  label,
  icon: Icon,
  disabled,
}: {
  name: string;
  label: string;
  icon: React.ElementType;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-foreground flex items-center gap-2 text-sm font-medium leading-5">
        <Icon className="text-muted-foreground size-4 shrink-0" />
        {label}
      </label>
      <FieldTextarea
        name={name}
        disabled={disabled}
        className="min-h-27 w-full resize-y text-sm leading-6"
        placeholder="..."
      />
    </div>
  );
}

function FieldScoreSelect({
  name,
  label,
  icon: Icon,
  disabled,
}: {
  name: string;
  label: string;
  icon: React.ElementType;
  disabled?: boolean;
}) {
  const { field } = useController({ name });
  const current = typeof field.value === "string" ? field.value : "";
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-foreground flex items-center gap-2 text-sm font-medium">
        <Icon className="text-muted-foreground size-4 shrink-0" />
        {label}
      </label>
      <Select
        value={current || "none"}
        onValueChange={(nextValue) => {
          if (nextValue === "none") return;
          field.onChange(nextValue as ScoreCardValue);
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-45">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">—</SelectItem>
          {SCORE_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FieldMultiLookup({
  name,
  options,
  disabled,
}: {
  name: string;
  options: LookupOption[];
  disabled: boolean;
}) {
  const { field } = useController({ name });
  const anchor = useComboboxAnchor();
  const fieldValue = field.value;
  const normalizedValue = React.useMemo(
    () =>
      normalizeLookupOptionValues(
        Array.isArray(fieldValue) ? (fieldValue as string[]) : [],
        options,
      ),
    [options, fieldValue],
  );

  return (
    <Combobox
      multiple
      autoHighlight
      items={options.map((option) => option.value)}
      value={normalizedValue}
      onValueChange={(nextValues) =>
        field.onChange(normalizeLookupDbLabels(nextValues as string[], options))
      }
      disabled={disabled}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values) => (
            <React.Fragment>
              {values.map((itemValue: string) => {
                return (
                  <ComboboxChip key={itemValue}>
                    {getLookupOptionLabel(options, itemValue)}
                  </ComboboxChip>
                );
              })}
              <ComboboxChipsInput placeholder="Seleziona motivazioni" />
            </React.Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor} className="max-h-80">
        <ComboboxEmpty>Nessuna opzione trovata.</ComboboxEmpty>
        <ComboboxList className="max-h-72 overflow-y-auto">
          {(item) => (
            <ComboboxItem key={item} value={item}>
              {getLookupOptionLabel(options, item)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function FieldNoMatchSelect({
  name,
  options,
  disabled,
}: {
  name: string;
  options: LookupOption[];
  disabled: boolean;
}) {
  const { field } = useController({ name });
  const current = typeof field.value === "string" ? field.value : "";
  return (
    <Select
      value={getLookupSelectValue(current, options, "none")}
      onValueChange={(value) => {
        field.onChange(
          value === "none" ? "" : getLookupLabelForSave(value, options),
        );
      }}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="Seleziona motivo" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Nessun motivo</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FieldColloquioEffettuatoSelect({
  name,
  disabled,
}: {
  name: string;
  disabled: boolean;
}) {
  const { field } = useController({ name });
  const current = typeof field.value === "string" ? field.value : "";
  return (
    <Select
      value={current || "none"}
      onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="Seleziona..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Non segnato</SelectItem>
        {COLLOQUIO_EFFETTUATO_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FieldDatetimeLocal({
  name,
  disabled,
}: {
  name: string;
  disabled: boolean;
}) {
  const { field } = useController({ name });
  const current = typeof field.value === "string" ? field.value : "";
  return (
    <Input
      type="datetime-local"
      value={current}
      disabled={disabled}
      onChange={(event) => field.onChange(event.target.value)}
    />
  );
}

function FieldSlotInput({
  name,
  type,
  className,
  disabled,
}: {
  name: string;
  type: "date" | "time";
  className?: string;
  disabled: boolean;
}) {
  const { field } = useController({ name });
  const current = typeof field.value === "string" ? field.value : "";
  return (
    <Input
      type={type}
      className={className}
      value={current}
      disabled={disabled}
      onChange={(event) => field.onChange(event.target.value)}
    />
  );
}

function SlotRow({
  slotIndex,
  disabled,
  onClear,
}: {
  slotIndex: number;
  disabled: boolean;
  onClear: (slotIndex: number) => void;
}) {
  // Riflette i 4 sotto-campi del form per mostrare/nascondere il bottone clear.
  const inizioData = useController({ name: slotDataKey(slotIndex, "inizio") }).field
    .value;
  const inizioOra = useController({ name: slotOraKey(slotIndex, "inizio") }).field
    .value;
  const fineData = useController({ name: slotDataKey(slotIndex, "fine") }).field
    .value;
  const fineOra = useController({ name: slotOraKey(slotIndex, "fine") }).field.value;
  const hasAnyValue = Boolean(inizioData || inizioOra || fineData || fineOra);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-foreground text-sm font-medium">Slot {slotIndex + 1}</p>
        {hasAnyValue ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            onClick={() => onClear(slotIndex)}
            aria-label="Cancella slot"
          >
            <XIcon className="size-3.5" />
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-0.5">
          <label className="text-muted-foreground text-xs">
            Inizio disponibilità
          </label>
          <div className="flex gap-1">
            <FieldSlotInput
              name={slotDataKey(slotIndex, "inizio")}
              type="date"
              className="flex-1"
              disabled={disabled}
            />
            <FieldSlotInput
              name={slotOraKey(slotIndex, "inizio")}
              type="time"
              className="w-28"
              disabled={disabled}
            />
          </div>
        </div>
        <div className="space-y-0.5">
          <label className="text-muted-foreground text-xs">Fine disponibilità</label>
          <div className="flex gap-1">
            <FieldSlotInput
              name={slotDataKey(slotIndex, "fine")}
              type="date"
              className="flex-1"
              disabled={disabled}
            />
            <FieldSlotInput
              name={slotOraKey(slotIndex, "fine")}
              type="time"
              className="w-28"
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SchedaColloquioPanel({
  selectionRow,
  nonSelezionatoOptions,
  noMatchOptions,
  disabled = false,
  isGeneratingFeedback = false,
  onGenerateFeedback,
  onPatchField,
}: SchedaColloquioPanelProps) {
  // FASE 5 BIS — form + autosave: source of truth unica per i campi editabili.
  // Sostituisce gli 8 useDebouncedSave, lo useState `draft` + lo useEffect di
  // resync (l'identity-pin è ora coperto da keepDirtyValues del form). onSave
  // instrada ogni chiave a onPatchField con le stesse trasformazioni
  // dell'originale; gli slot ricompongono data+ora in timestamp (salvati solo
  // quando entrambi presenti).
  const form = useAutoSaveForm({
    defaults: buildDefaults(selectionRow),
    onSave: async (patch) => {
      for (const [key, value] of Object.entries(patch)) {
        if (SLOT_FORM_KEYS.has(key)) {
          // Ricostruisce inizio/fine dello slot toccato dai valori correnti del
          // form; salva solo se data+ora sono entrambe presenti (come l'originale).
          const match = /^slot_(\d)_(inizio|fine)_(?:data|ora)$/.exec(key);
          if (!match) continue;
          const slotIndex = Number(match[1]) - 1;
          const boundary = match[2] as "inizio" | "fine";
          const date = String(
            form.getValues(slotDataKey(slotIndex, boundary)) ?? "",
          );
          const time = String(
            form.getValues(slotOraKey(slotIndex, boundary)) ?? "",
          );
          if (!date || !time) continue;
          await onPatchField(
            slotTimestampColumn(slotIndex, boundary),
            toTimestampValue(date, time),
          );
          continue;
        }

        if (TEXT_FIELD_KEYS.has(key)) {
          await onPatchField(key, String(value ?? "").trim() || null);
          continue;
        }

        if (key === "data_ora_colloquio_famiglia_lavoratore") {
          await onPatchField(
            key,
            datetimeLocalToTimestampValue(String(value ?? "")) || null,
          );
          continue;
        }

        if (key === "motivo_non_selezionato") {
          const values = Array.isArray(value) ? (value as string[]) : [];
          await onPatchField(key, values.length > 0 ? values : null);
          continue;
        }

        if (key === "motivo_no_match" || key === "colloquio_effettuato") {
          await onPatchField(key, String(value ?? "") || null);
          continue;
        }

        // Score: valore grezzo (nessuna trasformazione).
        await onPatchField(key, value);
      }
    },
  });

  const normalizedStatus = React.useMemo(
    () => normalizeStatusToken(asString(selectionRow.stato_selezione)),
    [selectionRow.stato_selezione],
  );
  const isCandidatoPoorFit =
    normalizedStatus.includes("candidato") &&
    normalizedStatus.includes("poor") &&
    normalizedStatus.includes("fit");
  const showMotivazioneNonSelezionato =
    normalizedStatus === "non selezionato" ||
    normalizedStatus === "nascosto oot" ||
    isCandidatoPoorFit;
  const showMotivazioneNoMatch = normalizedStatus === "no match";
  const showColloquioFamigliaFields =
    normalizedStatus.includes("colloquio") ||
    normalizedStatus.includes("prova") ||
    normalizedStatus === "match" ||
    normalizedStatus === "inviato al cliente";

  const hasFeedbackBaze = Boolean(
    String(form.watch("messaggio_famiglia_selezione_lavoratore") ?? "").trim(),
  );

  const clearSlot = React.useCallback(
    (slotIndex: number) => {
      form.setValue(slotDataKey(slotIndex, "inizio"), "", { shouldDirty: false });
      form.setValue(slotOraKey(slotIndex, "inizio"), "", { shouldDirty: false });
      form.setValue(slotDataKey(slotIndex, "fine"), "", { shouldDirty: false });
      form.setValue(slotOraKey(slotIndex, "fine"), "", { shouldDirty: false });
      void onPatchField(slotTimestampColumn(slotIndex, "inizio"), null);
      void onPatchField(slotTimestampColumn(slotIndex, "fine"), null);
    },
    [form, onPatchField],
  );

  return (
    <Form {...form}>
      <div className="bg-card">
        <div className="space-y-2 px-4 py-3">
          {showMotivazioneNonSelezionato ? (
            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                Motivo non selezionato
              </label>
              <FieldMultiLookup
                name="motivo_non_selezionato"
                options={nonSelezionatoOptions}
                disabled={disabled}
              />
            </div>
          ) : null}

          {showMotivazioneNoMatch ? (
            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                Motivo no match
              </label>
              <FieldNoMatchSelect
                name="motivo_no_match"
                options={noMatchOptions}
                disabled={disabled}
              />
            </div>
          ) : null}
        </div>

        <div className="space-y-3 p-3">
          <CollapsibleSection
            title="Completa la scheda colloquio"
            icon={ClipboardListIcon}
          >
            <FieldLabeledTextarea
              name="intervista_giorni_lavoro"
              label="1. Vanno bene i giorni?"
              icon={CalendarCheckIcon}
              disabled={disabled}
            />
            <FieldLabeledTextarea
              name="intervista_orario_e_giorni"
              label="2. Vanno bene gli orari?"
              icon={Clock3Icon}
              disabled={disabled}
            />
            <FieldLabeledTextarea
              name="intervista_distanza"
              label="3. Quanto è distante? Ha altri impegni ravvicinati?"
              icon={MapPinIcon}
              disabled={disabled}
            />
            <FieldLabeledTextarea
              name="intervista_stipendio"
              label="4. Accetta lo stipendio e la paga?"
              icon={CoinsIcon}
              disabled={disabled}
            />
            <FieldLabeledTextarea
              name="intervista_punti_forza"
              label="5. Indica tutti i pro per i quali stai presentando il profilo"
              icon={ThumbsUpIcon}
              disabled={disabled}
            />
            <FieldLabeledTextarea
              name="intervista_punti_debolezza"
              label="6. Indica tutti gli aspetti di divergenza dal profilo ideale per la famiglia"
              icon={AlertTriangleIcon}
              disabled={disabled}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Completa la score-card" icon={TargetIcon}>
            <FieldScoreSelect
              name="score_orario_e_giorni"
              label="Compatibilità Distanza e Orari"
              icon={Clock3Icon}
              disabled={disabled}
            />
            <FieldScoreSelect
              name="score_esperienze_simili"
              label="Compatibilità Esperienze"
              icon={ClipboardListIcon}
              disabled={disabled}
            />
            <FieldScoreSelect
              name="score_stipendio"
              label="Compatibilità Paga 9€ netti"
              icon={CoinsIcon}
              disabled={disabled}
            />
            <FieldScoreSelect
              name="score_job_fit"
              label="Compatibilità Overall"
              icon={TargetIcon}
              disabled={disabled}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Segna gli slot di disponibilità per fare il colloquio"
            icon={CalendarDaysIcon}
          >
            {SLOT_INDEXES.map((slotIndex) => (
              <SlotRow
                key={slotIndex}
                slotIndex={slotIndex}
                disabled={disabled}
                onClear={clearSlot}
              />
            ))}
          </CollapsibleSection>

          {showColloquioFamigliaFields ? (
            <CollapsibleSection
              title="Colloquio famiglia lavoratore"
              icon={CalendarCheckIcon}
            >
              <div className="space-y-1.5">
                <label className="text-foreground text-sm font-medium">
                  Data/ora colloquio famiglia lavoratore
                </label>
                <FieldDatetimeLocal
                  name="data_ora_colloquio_famiglia_lavoratore"
                  disabled={disabled}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-foreground text-sm font-medium">
                  Colloquio effettuato
                </label>
                <FieldColloquioEffettuatoSelect
                  name="colloquio_effettuato"
                  disabled={disabled}
                />
              </div>
            </CollapsibleSection>
          ) : null}

          <CollapsibleSection
            title="Lavoratore selezionato – finalizza la scheda colloquio"
            icon={TrophyIcon}
          >
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <label className="text-foreground text-sm font-medium">
                  Crea feedback Baze – il messaggio che spiega perché è perfetta per
                  la richiesta
                </label>
                {onGenerateFeedback ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const generated = await onGenerateFeedback();
                      if (typeof generated === "string") {
                        form.setValue(
                          "messaggio_famiglia_selezione_lavoratore",
                          generated,
                          { shouldDirty: true },
                        );
                      }
                    }}
                    disabled={disabled || isGeneratingFeedback}
                  >
                    <BotIcon className="size-4" />
                    {hasFeedbackBaze ? "Rigenera" : "Genera"}
                  </Button>
                ) : null}
              </div>
              <FieldTextarea
                name="messaggio_famiglia_selezione_lavoratore"
                disabled={disabled}
                className="min-h-20 resize-none text-xs"
                placeholder="Scrivi il feedback..."
              />
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </Form>
  );
}
