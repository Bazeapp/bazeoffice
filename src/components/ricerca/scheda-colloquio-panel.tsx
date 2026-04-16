import * as React from "react";
import {
  AlertTriangleIcon,
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

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { asString } from "@/features/lavoratori/lib/base-utils";
import {
  getTagClassName,
  resolveLookupColor,
  type LookupOption,
} from "@/features/lavoratori/lib/lookup-utils";

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
  slotColloquio: [SchedaSlotDraft, SchedaSlotDraft, SchedaSlotDraft];
};

type SchedaColloquioPanelProps = {
  selectionRow: SelectionRow;
  statusOptions: LookupOption[];
  lookupColorsByDomain: Map<string, string>;
  disabled?: boolean;
  onMoveStatus: (value: string) => Promise<void> | void;
  onPatchField: (field: string, value: unknown) => Promise<void> | void;
};

const SCORE_OPTIONS: ScoreCardValue[] = ["Basso", "Medio", "Alto"];

const FALLBACK_STATI_SELEZIONE = [
  "Prospetto",
  "Candidato Good Fit",
  "Candidato Poor Fit",
  "Da colloquiare",
  "Non risponde",
  "Invitato a colloquio",
  "Selezionato",
  "Inviato a cliente",
  "Colloquio schedulato",
  "Colloquio fatto",
  "In prova con cliente",
  "Match",
  "No Match",
  "Non selezionato",
  "Archivio",
] as const;

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
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="bg-muted hover:bg-muted/80 sticky top-0 z-10 flex w-full items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold text-foreground transition-colors">
        <Icon className="text-muted-foreground size-3.5" />
        <span className="flex-1 text-left">{title}</span>
        <ChevronDownIcon
          className={`text-muted-foreground size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 px-2 py-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
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
        className="min-h-[108px] w-full resize-y text-sm leading-6"
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
      <label className="text-foreground flex items-center gap-1.5 text-[11px] font-medium">
        <Icon className="text-muted-foreground size-3.5 shrink-0" />
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
        <SelectTrigger className="h-7 w-[120px] text-xs">
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
  statusOptions,
  lookupColorsByDomain,
  disabled = false,
  onMoveStatus,
  onPatchField,
}: SchedaColloquioPanelProps) {
  const [draft, setDraft] = React.useState<SchedaColloquioDraft>(() =>
    buildDraft(selectionRow),
  );

  React.useEffect(() => {
    setDraft(buildDraft(selectionRow));
  }, [selectionRow]);

  const mergedStatusOptions = React.useMemo(() => {
    if (statusOptions.length > 0) return statusOptions;
    return FALLBACK_STATI_SELEZIONE.map((status) => ({
      label: status,
      value: status,
    }));
  }, [statusOptions]);

  const statusClassName = getTagClassName(
    resolveLookupColor(
      lookupColorsByDomain,
      "selezioni_lavoratori.stato_selezione",
      draft.statoSelezione,
    ) ??
      resolveLookupColor(
        lookupColorsByDomain,
        "lavoratori.stato_selezione",
        draft.statoSelezione,
      ),
  );

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
        <div className="space-y-0.5">
          <label className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
            Stato selezione
          </label>
          <Select
            value={draft.statoSelezione || "none"}
            onValueChange={(value) => {
              const nextValue = value === "none" ? "" : value;
              setDraft((current) => ({ ...current, statoSelezione: nextValue }));
              if (nextValue) {
                void onMoveStatus(nextValue);
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger className={`h-8 text-xs font-semibold border ${statusClassName}`}>
              <SelectValue placeholder="Seleziona stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nessuno stato</SelectItem>
              {mergedStatusOptions.map((status) => {
                const optionClassName = getTagClassName(
                  resolveLookupColor(
                    lookupColorsByDomain,
                    "selezioni_lavoratori.stato_selezione",
                    status.label || status.value,
                  ) ??
                    resolveLookupColor(
                      lookupColorsByDomain,
                      "lavoratori.stato_selezione",
                      status.label || status.value,
                    ),
                );

                return (
                  <SelectItem
                    key={status.value}
                    value={status.value}
                    className={optionClassName}
                  >
                    {status.label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

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
          <div className="space-y-1">
            <label className="text-foreground text-[11px] font-medium">
              Tipologia di incontro
            </label>
            <Select
              value={draft.tipologiaIncontro || "none"}
              onValueChange={(value) => {
                const nextValue = value === "none" ? "" : value;
                setDraft((current) => ({
                  ...current,
                  tipologiaIncontro: nextValue,
                }));
                void onPatchField("colloquio_effettuato", nextValue || null);
              }}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Seleziona..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessuna tipologia</SelectItem>
                <SelectItem value="Colloquio conoscitivo">
                  Colloquio conoscitivo
                </SelectItem>
                <SelectItem value="Colloquio tecnico">
                  Colloquio tecnico
                </SelectItem>
                <SelectItem value="Prova pratica">Prova pratica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {draft.slotColloquio.map((slot, index) => (
            <div key={index} className="space-y-1.5">
              <p className="text-foreground text-[11px] font-medium">
                Slot {index + 1}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-muted-foreground text-[10px]">
                    Inizio disponibilità
                  </label>
                  <div className="flex gap-1">
                    <Input
                      type="date"
                      className="h-7 flex-1 text-[10px]"
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
                      className="h-7 w-20 text-[10px]"
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
                  <label className="text-muted-foreground text-[10px]">
                    Fine disponibilità
                  </label>
                  <div className="flex gap-1">
                    <Input
                      type="date"
                      className="h-7 flex-1 text-[10px]"
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
                      className="h-7 w-20 text-[10px]"
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

        <CollapsibleSection
          title="Lavoratore selezionato – finalizza la scheda colloquio"
          icon={TrophyIcon}
        >
          <div className="space-y-1">
            <label className="text-foreground text-[11px] font-medium">
              Crea feedback Baze – il messaggio che spiega perché è perfetta per
              la richiesta
            </label>
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
              className="min-h-[80px] resize-none text-xs"
              placeholder="Scrivi il feedback..."
            />
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
