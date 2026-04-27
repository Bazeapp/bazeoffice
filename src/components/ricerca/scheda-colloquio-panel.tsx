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
} from "lucide-react";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { asString, readArrayStrings } from "@/features/lavoratori/lib/base-utils";
import { type LookupOption } from "@/features/lavoratori/lib/lookup-utils";

type SelectionRow = Record<string, unknown>;

type ScoreCardValue = "Basso" | "Medio" | "Alto";

type SchedaSlotDraft = {
  inizioData: string;
  inizioOra: string;
  fineData: string;
  fineOra: string;
};

type SchedaColloquioDraft = {
  statoSelezione: string;
  vannoBeneGiorni: string;
  vannoBeneOrari: string;
  distanzaImpegni: string;
  accettaStipendio: string;
  proMotivazioni: string;
  aspettiDivergenza: string;
  scoreDistanzaOrari: ScoreCardValue | "";
  scoreEsperienze: ScoreCardValue | "";
  scorePaga9Euro: ScoreCardValue | "";
  scoreOverall: ScoreCardValue | "";
  tipologiaIncontro: string;
  feedbackBaze: string;
  motivoNonSelezionato: string[];
  motivoNoMatch: string;
  dataOraColloquioFamigliaLavoratore: string;
  colloquioEffettuato: string;
  slotColloquio: [SchedaSlotDraft, SchedaSlotDraft, SchedaSlotDraft];
};

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

function toDateInputParts(value: unknown): { date: string; time: string } {
  const raw = asString(value);
  if (!raw) return { date: "", time: "" };

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return { date: "", time: "" };

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");

  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

function toTimestampValue(date: string, time: string) {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function toDatetimeLocalValue(value: unknown) {
  const raw = asString(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function datetimeLocalToTimestampValue(value: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
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

function MultiLookupField({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string[];
  options: LookupOption[];
  disabled: boolean;
  onChange: (values: string[]) => void;
}) {
  const anchor = useComboboxAnchor();

  return (
    <Combobox
      multiple
      autoHighlight
      items={options.map((option) => option.value)}
      value={value}
      onValueChange={(nextValues) => onChange(nextValues as string[])}
      disabled={disabled}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values) => (
            <React.Fragment>
              {values.map((itemValue: string) => {
                const label =
                  options.find((option) => option.value === itemValue)?.label ??
                  itemValue;
                return <ComboboxChip key={itemValue}>{label}</ComboboxChip>;
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
              {options.find((option) => option.value === item)?.label ?? item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function buildDraft(selectionRow: SelectionRow): SchedaColloquioDraft {
  const slot1Inizio = toDateInputParts(
    selectionRow.disponibilita_colloquio_lavoratore_slot1_inizio,
  );
  const slot1Fine = toDateInputParts(
    selectionRow.disponibilita_colloquio_lavoratore_slot1_fine,
  );
  const slot2Inizio = toDateInputParts(
    selectionRow.disponibilita_colloquio_lavoratore_slot2_inizio,
  );
  const slot2Fine = toDateInputParts(
    selectionRow.disponibilita_colloquio_lavoratore_slot2_fine,
  );
  const slot3Inizio = toDateInputParts(
    selectionRow.disponibilita_colloquio_lavoratore_slot3_inizio,
  );
  const slot3Fine = toDateInputParts(
    selectionRow.disponibilita_colloquio_lavoratore_slot3_fine,
  );

  return {
    statoSelezione: asString(selectionRow.stato_selezione),
    vannoBeneGiorni: asString(selectionRow.intervista_giorni_lavoro),
    vannoBeneOrari: asString(selectionRow.intervista_orario_e_giorni),
    distanzaImpegni: asString(selectionRow.intervista_distanza),
    accettaStipendio: asString(selectionRow.intervista_stipendio),
    proMotivazioni: asString(selectionRow.intervista_punti_forza),
    aspettiDivergenza: asString(selectionRow.intervista_punti_debolezza),
    scoreDistanzaOrari:
      (asString(selectionRow.score_orario_e_giorni) as ScoreCardValue | "") || "",
    scoreEsperienze:
      (asString(selectionRow.score_esperienze_simili) as ScoreCardValue | "") || "",
    scorePaga9Euro:
      (asString(selectionRow.score_stipendio) as ScoreCardValue | "") || "",
    scoreOverall:
      (asString(selectionRow.score_job_fit) as ScoreCardValue | "") || "",
    tipologiaIncontro: asString(selectionRow.colloquio_effettuato),
    feedbackBaze: asString(
      selectionRow.messaggio_famiglia_selezione_lavoratore,
    ),
    motivoNonSelezionato: readArrayStrings(selectionRow.motivo_non_selezionato),
    motivoNoMatch: asString(selectionRow.motivo_no_match),
    dataOraColloquioFamigliaLavoratore: toDatetimeLocalValue(
      selectionRow.data_ora_colloquio_famiglia_lavoratore,
    ),
    colloquioEffettuato: asString(selectionRow.colloquio_effettuato),
    slotColloquio: [
      {
        inizioData: slot1Inizio.date,
        inizioOra: slot1Inizio.time,
        fineData: slot1Fine.date,
        fineOra: slot1Fine.time,
      },
      {
        inizioData: slot2Inizio.date,
        inizioOra: slot2Inizio.time,
        fineData: slot2Fine.date,
        fineOra: slot2Fine.time,
      },
      {
        inizioData: slot3Inizio.date,
        inizioOra: slot3Inizio.time,
        fineData: slot3Fine.date,
        fineOra: slot3Fine.time,
      },
    ],
  };
}

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

function LabeledTextarea({
  label,
  icon: Icon,
  value,
  onChange,
  onBlur,
  disabled,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-foreground flex items-center gap-2 text-sm font-medium leading-5">
        <Icon className="text-muted-foreground size-4 shrink-0" />
        {label}
      </label>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        className="min-h-27 w-full resize-y text-sm leading-6"
        placeholder="..."
      />
    </div>
  );
}

function ScoreSelect({
  label,
  icon: Icon,
  value,
  onChange,
  disabled,
}: {
  label: string;
  icon: React.ElementType;
  value?: ScoreCardValue | "";
  onChange: (value: ScoreCardValue) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-foreground flex items-center gap-2 text-sm font-medium">
        <Icon className="text-muted-foreground size-4 shrink-0" />
        {label}
      </label>
      <Select
        value={value || "none"}
        onValueChange={(nextValue) => {
          if (nextValue === "none") return;
          onChange(nextValue as ScoreCardValue);
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

export function SchedaColloquioPanel({
  selectionRow,
  nonSelezionatoOptions,
  noMatchOptions,
  disabled = false,
  isGeneratingFeedback = false,
  onGenerateFeedback,
  onPatchField,
}: SchedaColloquioPanelProps) {
  const [draft, setDraft] = React.useState<SchedaColloquioDraft>(() =>
    buildDraft(selectionRow),
  );

  React.useEffect(() => {
    setDraft(buildDraft(selectionRow));
  }, [selectionRow]);

  const normalizedStatus = React.useMemo(
    () => normalizeStatusToken(draft.statoSelezione),
    [draft.statoSelezione],
  );
  const showMotivazioneNonSelezionato =
    normalizedStatus === "non selezionato" || normalizedStatus === "nascosto oot";
  const showMotivazioneNoMatch = normalizedStatus === "no match";
  const showColloquioFamigliaFields =
    normalizedStatus.includes("colloquio") ||
    normalizedStatus.includes("prova") ||
    normalizedStatus === "match";

  const patchTextField = React.useCallback(
    (field: string, value: string) => {
      void onPatchField(field, value.trim() || null);
    },
    [onPatchField],
  );

  const patchSlotField = React.useCallback(
    (slotIndex: number, boundary: "inizio" | "fine") => {
      const slot = draft.slotColloquio[slotIndex];
      const field =
        boundary === "inizio"
          ? (`disponibilita_colloquio_lavoratore_slot${slotIndex + 1}_inizio` as const)
          : (`disponibilita_colloquio_lavoratore_slot${slotIndex + 1}_fine` as const);
      const date = boundary === "inizio" ? slot.inizioData : slot.fineData;
      const time = boundary === "inizio" ? slot.inizioOra : slot.fineOra;
      void onPatchField(field, toTimestampValue(date, time));
    },
    [draft.slotColloquio, onPatchField],
  );

  return (
    <div className="bg-card">
      <div className="space-y-2 px-4 py-3">
        {showMotivazioneNonSelezionato ? (
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Motivo non selezionato
            </label>
            <MultiLookupField
              value={draft.motivoNonSelezionato}
              options={nonSelezionatoOptions}
              disabled={disabled}
              onChange={(values) => {
                setDraft((current) => ({
                  ...current,
                  motivoNonSelezionato: values,
                }));
                void onPatchField(
                  "motivo_non_selezionato",
                  values.length > 0 ? values : null,
                );
              }}
            />
          </div>
        ) : null}

        {showMotivazioneNoMatch ? (
          <div className="space-y-1.5">
            <label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Motivo no match
            </label>
            <Select
              value={draft.motivoNoMatch || "none"}
              onValueChange={(value) => {
                const nextValue = value === "none" ? "" : value;
                setDraft((current) => ({
                  ...current,
                  motivoNoMatch: nextValue,
                }));
                void onPatchField("motivo_no_match", nextValue || null);
              }}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessun motivo</SelectItem>
                {noMatchOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

      </div>

      <div className="space-y-3 p-3">
        <CollapsibleSection
          title="Completa la scheda colloquio"
          icon={ClipboardListIcon}
        >
          <LabeledTextarea
            label="1. Vanno bene i giorni?"
            icon={CalendarCheckIcon}
            value={draft.vannoBeneGiorni}
            onChange={(value) =>
              setDraft((current) => ({ ...current, vannoBeneGiorni: value }))
            }
            onBlur={() =>
              patchTextField("intervista_giorni_lavoro", draft.vannoBeneGiorni)
            }
            disabled={disabled}
          />
          <LabeledTextarea
            label="2. Vanno bene gli orari?"
            icon={Clock3Icon}
            value={draft.vannoBeneOrari}
            onChange={(value) =>
              setDraft((current) => ({ ...current, vannoBeneOrari: value }))
            }
            onBlur={() =>
              patchTextField("intervista_orario_e_giorni", draft.vannoBeneOrari)
            }
            disabled={disabled}
          />
          <LabeledTextarea
            label="3. Quanto è distante? Ha altri impegni ravvicinati?"
            icon={MapPinIcon}
            value={draft.distanzaImpegni}
            onChange={(value) =>
              setDraft((current) => ({ ...current, distanzaImpegni: value }))
            }
            onBlur={() =>
              patchTextField("intervista_distanza", draft.distanzaImpegni)
            }
            disabled={disabled}
          />
          <LabeledTextarea
            label="4. Accetta lo stipendio e la paga?"
            icon={CoinsIcon}
            value={draft.accettaStipendio}
            onChange={(value) =>
              setDraft((current) => ({ ...current, accettaStipendio: value }))
            }
            onBlur={() =>
              patchTextField("intervista_stipendio", draft.accettaStipendio)
            }
            disabled={disabled}
          />
          <LabeledTextarea
            label="5. Indica tutti i pro per i quali stai presentando il profilo"
            icon={ThumbsUpIcon}
            value={draft.proMotivazioni}
            onChange={(value) =>
              setDraft((current) => ({ ...current, proMotivazioni: value }))
            }
            onBlur={() =>
              patchTextField("intervista_punti_forza", draft.proMotivazioni)
            }
            disabled={disabled}
          />
          <LabeledTextarea
            label="6. Indica tutti gli aspetti di divergenza dal profilo ideale per la famiglia"
            icon={AlertTriangleIcon}
            value={draft.aspettiDivergenza}
            onChange={(value) =>
              setDraft((current) => ({ ...current, aspettiDivergenza: value }))
            }
            onBlur={() =>
              patchTextField("intervista_punti_debolezza", draft.aspettiDivergenza)
            }
            disabled={disabled}
          />
        </CollapsibleSection>

        <CollapsibleSection title="Completa la score-card" icon={TargetIcon}>
          <ScoreSelect
            label="Compatibilità Distanza e Orari"
            icon={Clock3Icon}
            value={draft.scoreDistanzaOrari}
            onChange={(value) => {
              setDraft((current) => ({ ...current, scoreDistanzaOrari: value }));
              void onPatchField("score_orario_e_giorni", value);
            }}
            disabled={disabled}
          />
          <ScoreSelect
            label="Compatibilità Esperienze"
            icon={ClipboardListIcon}
            value={draft.scoreEsperienze}
            onChange={(value) => {
              setDraft((current) => ({ ...current, scoreEsperienze: value }));
              void onPatchField("score_esperienze_simili", value);
            }}
            disabled={disabled}
          />
          <ScoreSelect
            label="Compatibilità Paga 9€ netti"
            icon={CoinsIcon}
            value={draft.scorePaga9Euro}
            onChange={(value) => {
              setDraft((current) => ({ ...current, scorePaga9Euro: value }));
              void onPatchField("score_stipendio", value);
            }}
            disabled={disabled}
          />
          <ScoreSelect
            label="Compatibilità Overall"
            icon={TargetIcon}
            value={draft.scoreOverall}
            onChange={(value) => {
              setDraft((current) => ({ ...current, scoreOverall: value }));
              void onPatchField("score_job_fit", value);
            }}
            disabled={disabled}
          />
        </CollapsibleSection>

        <CollapsibleSection
          title="Segna gli slot di disponibilità per fare il colloquio"
          icon={CalendarDaysIcon}
        >
          {draft.slotColloquio.map((slot, index) => (
            <div key={index} className="space-y-1.5">
              <p className="text-foreground text-sm font-medium">
                Slot {index + 1}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-muted-foreground text-xs">
                    Inizio disponibilità
                  </label>
                  <div className="flex gap-1">
                    <Input
                      type="date"
                      className="flex-1"
                      value={slot.inizioData}
                      disabled={disabled}
                      onChange={(event) =>
                        setDraft((current) => {
                          const nextSlots = [...current.slotColloquio] as [
                            SchedaSlotDraft,
                            SchedaSlotDraft,
                            SchedaSlotDraft,
                          ];
                          nextSlots[index] = {
                            ...nextSlots[index],
                            inizioData: event.target.value,
                          };
                          return { ...current, slotColloquio: nextSlots };
                        })
                      }
                      onBlur={() => patchSlotField(index, "inizio")}
                    />
                    <Input
                      type="time"
                      className="w-28"
                      value={slot.inizioOra}
                      disabled={disabled}
                      onChange={(event) =>
                        setDraft((current) => {
                          const nextSlots = [...current.slotColloquio] as [
                            SchedaSlotDraft,
                            SchedaSlotDraft,
                            SchedaSlotDraft,
                          ];
                          nextSlots[index] = {
                            ...nextSlots[index],
                            inizioOra: event.target.value,
                          };
                          return { ...current, slotColloquio: nextSlots };
                        })
                      }
                      onBlur={() => patchSlotField(index, "inizio")}
                    />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <label className="text-muted-foreground text-xs">
                    Fine disponibilità
                  </label>
                  <div className="flex gap-1">
                    <Input
                      type="date"
                      className="flex-1"
                      value={slot.fineData}
                      disabled={disabled}
                      onChange={(event) =>
                        setDraft((current) => {
                          const nextSlots = [...current.slotColloquio] as [
                            SchedaSlotDraft,
                            SchedaSlotDraft,
                            SchedaSlotDraft,
                          ];
                          nextSlots[index] = {
                            ...nextSlots[index],
                            fineData: event.target.value,
                          };
                          return { ...current, slotColloquio: nextSlots };
                        })
                      }
                      onBlur={() => patchSlotField(index, "fine")}
                    />
                    <Input
                      type="time"
                      className="w-28"
                      value={slot.fineOra}
                      disabled={disabled}
                      onChange={(event) =>
                        setDraft((current) => {
                          const nextSlots = [...current.slotColloquio] as [
                            SchedaSlotDraft,
                            SchedaSlotDraft,
                            SchedaSlotDraft,
                          ];
                          nextSlots[index] = {
                            ...nextSlots[index],
                            fineOra: event.target.value,
                          };
                          return { ...current, slotColloquio: nextSlots };
                        })
                      }
                      onBlur={() => patchSlotField(index, "fine")}
                    />
                  </div>
                </div>
              </div>
            </div>
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
              <Input
                type="datetime-local"
                value={draft.dataOraColloquioFamigliaLavoratore}
                disabled={disabled}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    dataOraColloquioFamigliaLavoratore: event.target.value,
                  }))
                }
                onBlur={() =>
                  void onPatchField(
                    "data_ora_colloquio_famiglia_lavoratore",
                    datetimeLocalToTimestampValue(
                      draft.dataOraColloquioFamigliaLavoratore,
                    ),
                  )
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-foreground text-sm font-medium">
                Colloquio effettuato
              </label>
              <Select
                value={draft.colloquioEffettuato || "none"}
                onValueChange={(value) => {
                  const nextValue = value === "none" ? "" : value;
                  setDraft((current) => ({
                    ...current,
                    colloquioEffettuato: nextValue,
                  }));
                  void onPatchField("colloquio_effettuato", nextValue || null);
                }}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non segnato</SelectItem>
                  <SelectItem value="Si">Si</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
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
                      setDraft((current) => ({
                        ...current,
                        feedbackBaze: generated,
                      }));
                    }
                  }}
                  disabled={disabled || isGeneratingFeedback}
                >
                  <BotIcon className="size-4" />
                  {draft.feedbackBaze ? "Rigenera" : "Genera"}
                </Button>
              ) : null}
            </div>
            <Textarea
              value={draft.feedbackBaze}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  feedbackBaze: event.target.value,
                }))
              }
              onBlur={() =>
                patchTextField(
                  "messaggio_famiglia_selezione_lavoratore",
                  draft.feedbackBaze,
                )
              }
              disabled={disabled}
              className="min-h-20 resize-none text-xs"
              placeholder="Scrivi il feedback..."
            />
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
