import * as React from "react";
import {
  AlertCircleIcon,
  CalendarRangeIcon,
  CheckCircle2Icon,
  CheckIcon,
  FileTextIcon,
  HelpCircleIcon,
  MessageSquareTextIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  StarIcon,
  UserIcon,
} from "lucide-react";

import { DetailSectionCard } from "@/components/shared/detail-section-card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { ExperienceCardTitle } from "@/components/ui/experience-card-title";
import { ExperienceLevel } from "@/components/ui/experience-level";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldDescription, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateOnly } from "@/features/lavoratori/lib/availability-utils";
import {
  getTagClassName,
  resolveLookupColor,
} from "@/features/lavoratori/lib/lookup-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { EsperienzaLavoratoreRecord } from "@/types/entities/esperienza-lavoratore";
import type { ReferenzaLavoratoreRecord } from "@/types/entities/referenza-lavoratore";

type ExperienceDraft = {
  anni_esperienza_colf: string;
  anni_esperienza_badante: string;
  anni_esperienza_babysitter: string;
  situazione_lavorativa_attuale: string;
};

type LookupOption = {
  label: string;
  value: string;
};

function getReferenceStatusIcon(status: string) {
  switch (status) {
    case "Referenza verificata":
      return <CheckCircle2Icon className="size-3.5 text-emerald-600" />;
    case "Referenza in attesa di verifica":
      return <AlertCircleIcon className="size-3.5 text-orange-500" />;
    case "Referenza da richiedere":
      return <HelpCircleIcon className="size-3.5 text-yellow-500" />;
    default:
      return null;
  }
}

function getExperienceReferenceStatus(
  references: ReferenzaLavoratoreRecord[],
): string | null {
  const statuses = references
    .map((reference) => reference.referenza_verificata ?? "")
    .filter(Boolean);

  if (statuses.includes("Referenza verificata")) {
    return "Referenza verificata";
  }

  if (statuses.includes("Referenza in attesa di verifica")) {
    return "Referenza in attesa di verifica";
  }

  if (statuses.includes("Referenza da richiedere")) {
    return "Referenza da richiedere";
  }

  return null;
}

function getExperienceDurationLabel(experience: EsperienzaLavoratoreRecord) {
  const start = experience.data_inizio
    ? new Date(experience.data_inizio)
    : null;
  const end = experience.stato_esperienza_attiva
    ? new Date()
    : experience.data_fine
      ? new Date(experience.data_fine)
      : null;

  if (
    !start ||
    Number.isNaN(start.getTime()) ||
    !end ||
    Number.isNaN(end.getTime())
  ) {
    return "-";
  }

  const diffMonths =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  if (diffMonths < 12) {
    return "meno di 1 anno";
  }

  const years = Math.floor(diffMonths / 12);
  return years === 1 ? "1 anno" : `${years} anni`;
}

function getExperienceHeader({
  tipo_lavoro,
  tipo_rapporto,
  data_inizio,
  data_fine,
  stato_esperienza_attiva,
}: Pick<
  EsperienzaLavoratoreRecord,
  | "tipo_lavoro"
  | "tipo_rapporto"
  | "data_inizio"
  | "data_fine"
  | "stato_esperienza_attiva"
>) {
  const roleValues = Array.isArray(tipo_lavoro) ? tipo_lavoro : [];
  const ruolo =
    roleValues.length > 0 ? roleValues.join(", ") : "Ruolo non indicato";
  const tipoRapporto = tipo_rapporto || "Rapporto non indicato";
  const durata = getExperienceDurationLabel({
    data_inizio,
    data_fine,
    stato_esperienza_attiva,
  } as EsperienzaLavoratoreRecord);
  return `${ruolo} | ${tipoRapporto} | ${durata}`;
}

type ExperienceRoleFieldProps = {
  value: string[];
  options: LookupOption[];
  disabled: boolean;
  onChange: (values: string[]) => void;
};

function ExperienceRoleField({
  value,
  options,
  disabled,
  onChange,
}: ExperienceRoleFieldProps) {
  const anchor = useComboboxAnchor();

  return (
    <Combobox
      multiple
      autoHighlight
      items={options.map((option) => option.label)}
      value={value}
      onValueChange={(nextValues) => onChange(nextValues as string[])}
      disabled={disabled}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values) => (
            <React.Fragment>
              {values.map((item: string) => (
                <ComboboxChip key={item}>{item}</ComboboxChip>
              ))}
              <ComboboxChipsInput placeholder="Seleziona ruoli" />
            </React.Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor} className="max-h-80">
        <ComboboxEmpty>Nessuna opzione trovata.</ComboboxEmpty>
        <ComboboxList className="max-h-72 overflow-y-auto">
          {(item) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

type AddReferenceActionProps = {
  experience: EsperienzaLavoratoreRecord;
  disabled: boolean;
  onReferenceCreate: (
    values: Partial<ReferenzaLavoratoreRecord>,
  ) => Promise<void> | void;
};

function AddReferenceAction({
  experience,
  disabled,
  onReferenceCreate,
}: AddReferenceActionProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({
    nome_datore: "",
    cognome_datore: "",
    telefono_datore: "",
  });
  const [error, setError] = React.useState<string | null>(null);

  const canSubmit = React.useMemo(() => {
    const hasIdentity =
      draft.nome_datore.trim().length > 0 ||
      draft.cognome_datore.trim().length > 0;
    const hasPhone = draft.telefono_datore.trim().length > 0;
    return hasIdentity && hasPhone;
  }, [draft]);

  const handleCreate = React.useCallback(async () => {
    const nome = draft.nome_datore.trim();
    const cognome = draft.cognome_datore.trim();
    const telefono = draft.telefono_datore.trim();

    if ((!nome && !cognome) || !telefono) {
      setError("Inserisci il telefono e almeno uno tra nome e cognome.");
      return;
    }

    setError(null);

    await onReferenceCreate({
      esperienza_lavoratore_id: experience.id,
      lavoratore_id: experience.lavoratore_id,
      referenza_verificata: "Referenza da richiedere",
      nome_datore: nome || null,
      cognome_datore: cognome || null,
      telefono_datore: telefono,
      ruolo:
        Array.isArray(experience.tipo_lavoro) &&
        experience.tipo_lavoro.length > 0
          ? experience.tipo_lavoro
          : null,
    });

    setDraft({
      nome_datore: "",
      cognome_datore: "",
      telefono_datore: "",
    });
    setOpen(false);
  }, [draft, experience, onReferenceCreate]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <PlusIcon />
        Aggiungi referenza
      </Button>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuova referenza</DialogTitle>
          <DialogDescription>
            Inserisci il telefono e almeno uno tra nome e cognome.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
              Nome
            </FieldTitle>
            <Input
              value={draft.nome_datore}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  nome_datore: event.target.value,
                }))
              }
              disabled={disabled}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
              Cognome
            </FieldTitle>
            <Input
              value={draft.cognome_datore}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  cognome_datore: event.target.value,
                }))
              }
              disabled={disabled}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
              Telefono
            </FieldTitle>
            <Input
              type="tel"
              value={draft.telefono_datore}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  telefono_datore: event.target.value,
                }))
              }
              disabled={disabled}
              className="w-full"
            />
          </div>
          {error ? (
            <FieldDescription className="text-destructive">
              {error}
            </FieldDescription>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Annulla
          </Button>
          <Button
            type="button"
            onClick={() => void handleCreate()}
            disabled={disabled || !canSubmit}
          >
            Aggiungi referenza
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type EditableReferenceCardProps = {
  reference: ReferenzaLavoratoreRecord;
  referenceStatusOptions: LookupOption[];
  disabled: boolean;
  onPatch: (
    referenceId: string,
    patch: Partial<ReferenzaLavoratoreRecord>,
  ) => Promise<void> | void;
};

function EditableReferenceCard({
  reference,
  referenceStatusOptions,
  disabled,
  onPatch,
}: EditableReferenceCardProps) {
  const [draft, setDraft] = React.useState(() => ({
    referenza_verificata: reference.referenza_verificata ?? "",
    nome_datore: reference.nome_datore ?? "",
    cognome_datore: reference.cognome_datore ?? "",
    telefono_datore: reference.telefono_datore ?? "",
    valutazione: reference.valutazione ?? 0,
    commento_esperienza: reference.commento_esperienza ?? "",
    referenza_verificata_da_baze:
      reference.referenza_verificata_da_baze ?? false,
  }));

  React.useEffect(() => {
    setDraft({
      referenza_verificata: reference.referenza_verificata ?? "",
      nome_datore: reference.nome_datore ?? "",
      cognome_datore: reference.cognome_datore ?? "",
      telefono_datore: reference.telefono_datore ?? "",
      valutazione: reference.valutazione ?? 0,
      commento_esperienza: reference.commento_esperienza ?? "",
      referenza_verificata_da_baze:
        reference.referenza_verificata_da_baze ?? false,
    });
  }, [reference]);

  const isVerified = draft.referenza_verificata === "Referenza verificata";

  return (
    <Card className="gap-0 py-0 shadow-none">
      <CardContent className="space-y-4 p-4 pt-3 pb-3">
        <div className="space-y-2">
          <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
            Stato verifica referenza
          </FieldTitle>
          <div className="max-w-sm">
            <Select
              value={draft.referenza_verificata || undefined}
              onValueChange={(value) => {
                setDraft((current) => ({
                  ...current,
                  referenza_verificata: value,
                }));
                void onPatch(reference.id, { referenza_verificata: value });
              }}
              disabled={disabled}
            >
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue placeholder="Seleziona stato" />
              </SelectTrigger>
              <SelectContent>
                {referenceStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
              <UserIcon className="size-3.5" />
              Nome referenza
            </FieldTitle>
            <Input
              value={draft.nome_datore}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  nome_datore: event.target.value,
                }))
              }
              onBlur={() => {
                const nextValue = draft.nome_datore.trim();
                if (nextValue === (reference.nome_datore ?? "")) return;
                void onPatch(reference.id, { nome_datore: nextValue || null });
              }}
              disabled={disabled}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-2">
            <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
              <UserIcon className="size-3.5" />
              Cognome referenza
            </FieldTitle>
            <Input
              value={draft.cognome_datore}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  cognome_datore: event.target.value,
                }))
              }
              onBlur={() => {
                const nextValue = draft.cognome_datore.trim();
                if (nextValue === (reference.cognome_datore ?? "")) return;
                void onPatch(reference.id, {
                  cognome_datore: nextValue || null,
                });
              }}
              disabled={disabled}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-2">
            <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
              <PhoneIcon className="size-3.5" />
              Numero referenza
            </FieldTitle>
            <Input
              value={draft.telefono_datore}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  telefono_datore: event.target.value,
                }))
              }
              onBlur={() => {
                const nextValue = draft.telefono_datore.trim();
                if (nextValue === (reference.telefono_datore ?? "")) return;
                void onPatch(reference.id, {
                  telefono_datore: nextValue || null,
                });
              }}
              disabled={disabled}
              className="h-9 text-sm"
            />
          </div>
        </div>

        {isVerified ? (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
                <StarIcon className="size-3.5" />
                Valutazione
              </FieldTitle>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }, (_, index) => {
                  const score = index + 1;
                  const active = draft.valutazione >= score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => {
                        setDraft((current) => ({
                          ...current,
                          valutazione: score,
                        }));
                        void onPatch(reference.id, { valutazione: score });
                      }}
                      disabled={disabled}
                      className="disabled:opacity-50"
                    >
                      <StarIcon
                        className={
                          active
                            ? "fill-primary text-primary size-4"
                            : "text-muted-foreground/35 size-4"
                        }
                      />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
                <CheckCircle2Icon className="size-3.5" />
                Disponibile a essere chiamata
              </FieldTitle>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.referenza_verificata_da_baze}
                  onCheckedChange={(checked) => {
                    const nextValue = checked === true;
                    setDraft((current) => ({
                      ...current,
                      referenza_verificata_da_baze: nextValue,
                    }));
                    void onPatch(reference.id, {
                      referenza_verificata_da_baze: nextValue,
                    });
                  }}
                  disabled={disabled}
                />
                <span className="inline-flex items-center gap-1">
                  <CheckIcon className="size-3.5" />
                  {draft.referenza_verificata_da_baze ? "Si" : "No"}
                </span>
              </label>
            </div>
            <div className="space-y-2 md:col-span-3">
              <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
                <MessageSquareTextIcon className="size-3.5" />
                Feedback della referenza
              </FieldTitle>
              <Textarea
                value={draft.commento_esperienza}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    commento_esperienza: event.target.value,
                  }))
                }
                onBlur={() => {
                  const nextValue = draft.commento_esperienza.trim();
                  if (nextValue === (reference.commento_esperienza ?? ""))
                    return;
                  void onPatch(reference.id, {
                    commento_esperienza: nextValue || null,
                  });
                }}
                disabled={disabled}
                className="min-h-24 w-full text-sm"
              />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

type EditableExperienceCardProps = {
  experience: EsperienzaLavoratoreRecord;
  references: ReferenzaLavoratoreRecord[];
  referencesLoading: boolean;
  disabled: boolean;
  experienceTipoLavoroOptions: LookupOption[];
  experienceTipoRapportoOptions: LookupOption[];
  referenceStatusOptions: LookupOption[];
  onExperiencePatch: (
    experienceId: string,
    patch: Partial<EsperienzaLavoratoreRecord>,
  ) => Promise<void> | void;
  onReferencePatch: (
    referenceId: string,
    patch: Partial<ReferenzaLavoratoreRecord>,
  ) => Promise<void> | void;
  onReferenceCreate: (
    values: Partial<ReferenzaLavoratoreRecord>,
  ) => Promise<void> | void;
};

function EditableExperienceCard({
  experience,
  references,
  referencesLoading,
  disabled,
  experienceTipoLavoroOptions,
  experienceTipoRapportoOptions,
  referenceStatusOptions,
  onExperiencePatch,
  onReferencePatch,
  onReferenceCreate,
}: EditableExperienceCardProps) {
  const [draft, setDraft] = React.useState(() => ({
    tipo_lavoro: experience.tipo_lavoro ?? [],
    tipo_rapporto: experience.tipo_rapporto ?? "",
    data_inizio: experience.data_inizio ?? "",
    data_fine: experience.data_fine ?? "",
    stato_esperienza_attiva: experience.stato_esperienza_attiva ?? false,
    descrizione: experience.descrizione ?? "",
    descrizione_contesto_lavorativo:
      experience.descrizione_contesto_lavorativo ?? "",
    motivazione_fine_rapporto: experience.motivazione_fine_rapporto ?? "",
  }));

  React.useEffect(() => {
    setDraft({
      tipo_lavoro: experience.tipo_lavoro ?? [],
      tipo_rapporto: experience.tipo_rapporto ?? "",
      data_inizio: experience.data_inizio ?? "",
      data_fine: experience.data_fine ?? "",
      stato_esperienza_attiva: experience.stato_esperienza_attiva ?? false,
      descrizione: experience.descrizione ?? "",
      descrizione_contesto_lavorativo:
        experience.descrizione_contesto_lavorativo ?? "",
      motivazione_fine_rapporto: experience.motivazione_fine_rapporto ?? "",
    });
  }, [experience]);

  return (
    <Card className="bg-background gap-0 py-0 shadow-none">
      <CardContent className="space-y-4 px-0 pt-1 pb-2">
        <div className="space-y-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
                Tipo lavoro
              </FieldTitle>
              <ExperienceRoleField
                value={draft.tipo_lavoro}
                options={experienceTipoLavoroOptions}
                disabled={disabled}
                onChange={(values) => {
                  setDraft((current) => ({ ...current, tipo_lavoro: values }));
                  void onExperiencePatch(experience.id, {
                    tipo_lavoro: values.length > 0 ? values : null,
                  });
                }}
              />
            </div>
            <div className="space-y-2">
              <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
                Tipo rapporto
              </FieldTitle>
              <Select
                value={draft.tipo_rapporto || undefined}
                onValueChange={(value) => {
                  setDraft((current) => ({ ...current, tipo_rapporto: value }));
                  void onExperiencePatch(experience.id, {
                    tipo_rapporto: value || null,
                  });
                }}
                disabled={disabled}
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder="Seleziona tipo rapporto" />
                </SelectTrigger>
                <SelectContent>
                  {experienceTipoRapportoOptions.map((option) => (
                    <SelectItem key={option.value} value={option.label}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
                Data inizio
              </FieldTitle>
              <Input
                type="date"
                value={draft.data_inizio}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    data_inizio: event.target.value,
                  }))
                }
                onBlur={() => {
                  if (draft.data_inizio === (experience.data_inizio ?? ""))
                    return;
                  void onExperiencePatch(experience.id, {
                    data_inizio: draft.data_inizio || null,
                  });
                }}
                disabled={disabled}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
                Data fine
              </FieldTitle>
              <Input
                type="date"
                value={draft.data_fine}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    data_fine: event.target.value,
                  }))
                }
                onBlur={() => {
                  if (draft.data_fine === (experience.data_fine ?? "")) return;
                  void onExperiencePatch(experience.id, {
                    data_fine: draft.data_fine || null,
                  });
                }}
                disabled={disabled || draft.stato_esperienza_attiva}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
                Rapporto attivo
              </FieldTitle>
              <label className="flex h-9 items-center gap-2 text-sm">
                <Checkbox
                  checked={draft.stato_esperienza_attiva}
                  onCheckedChange={(checked) => {
                    const nextValue = checked === true;
                    setDraft((current) => ({
                      ...current,
                      stato_esperienza_attiva: nextValue,
                      data_fine: nextValue ? "" : current.data_fine,
                    }));
                    void onExperiencePatch(experience.id, {
                      stato_esperienza_attiva: nextValue,
                      data_fine: nextValue ? null : draft.data_fine || null,
                    });
                  }}
                  disabled={disabled}
                />
                <span>{draft.stato_esperienza_attiva ? "Si" : "No"}</span>
              </label>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
              Descrizione Mansioni ed Esperienza
            </FieldTitle>
            <Textarea
              value={draft.descrizione}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  descrizione: event.target.value,
                }))
              }
              onBlur={() => {
                const nextValue = draft.descrizione.trim();
                if (nextValue === (experience.descrizione ?? "")) return;
                void onExperiencePatch(experience.id, {
                  descrizione: nextValue || null,
                });
              }}
              disabled={disabled}
              className="min-h-28 w-full text-sm"
            />
          </div>
          <div className="space-y-2">
            <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
              Descrizione Famiglia e Contesto
            </FieldTitle>
            <Textarea
              value={draft.descrizione_contesto_lavorativo}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  descrizione_contesto_lavorativo: event.target.value,
                }))
              }
              onBlur={() => {
                const nextValue = draft.descrizione_contesto_lavorativo.trim();
                if (
                  nextValue ===
                  (experience.descrizione_contesto_lavorativo ?? "")
                )
                  return;
                void onExperiencePatch(experience.id, {
                  descrizione_contesto_lavorativo: nextValue || null,
                });
              }}
              disabled={disabled}
              className="min-h-28 w-full text-sm"
            />
          </div>
        </div>

        {!draft.stato_esperienza_attiva ? (
          <div className="space-y-2">
            <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
              Motivazione fine rapporto
            </FieldTitle>
            <Textarea
              value={draft.motivazione_fine_rapporto}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  motivazione_fine_rapporto: event.target.value,
                }))
              }
              onBlur={() => {
                const nextValue = draft.motivazione_fine_rapporto.trim();
                if (nextValue === (experience.motivazione_fine_rapporto ?? ""))
                  return;
                void onExperiencePatch(experience.id, {
                  motivazione_fine_rapporto: nextValue || null,
                });
              }}
              disabled={disabled}
              className="min-h-24 w-full text-sm"
            />
          </div>
        ) : null}

        <div className="space-y-3">
          <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
            Referenze
          </FieldTitle>
          {referencesLoading ? (
            <FieldDescription>Caricamento referenze...</FieldDescription>
          ) : references.length === 0 ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-4">
              <FieldDescription>Nessuna referenza collegata.</FieldDescription>
              <AddReferenceAction
                experience={experience}
                disabled={disabled}
                onReferenceCreate={onReferenceCreate}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {references.map((reference) => (
                <EditableReferenceCard
                  key={reference.id}
                  reference={reference}
                  referenceStatusOptions={referenceStatusOptions}
                  disabled={disabled}
                  onPatch={onReferencePatch}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type ExperienceReferencesCardProps = {
  workerId?: string | null;
  isEditing: boolean;
  showEditAction?: boolean;
  showCreateExperienceAction?: boolean;
  title?: string;
  showSummaryFields?: boolean;
  showSituationField?: boolean;
  isUpdating: boolean;
  draft: ExperienceDraft;
  experiences: EsperienzaLavoratoreRecord[];
  experiencesLoading: boolean;
  references: ReferenzaLavoratoreRecord[];
  referencesLoading: boolean;
  lookupColorsByDomain: Map<string, string>;
  experienceTipoLavoroOptions: LookupOption[];
  experienceTipoRapportoOptions: LookupOption[];
  referenceStatusOptions: LookupOption[];
  selectedAnniEsperienzaColf: string;
  selectedAnniEsperienzaBadante: string;
  selectedAnniEsperienzaBabysitter: string;
  selectedSituazioneLavorativaAttuale: string;
  onToggleEdit: () => void;
  onAnniEsperienzaColfChange: (value: string) => void;
  onAnniEsperienzaBadanteChange: (value: string) => void;
  onAnniEsperienzaBabysitterChange: (value: string) => void;
  onSituazioneLavorativaAttualeChange: (value: string) => void;
  onAnniEsperienzaColfBlur: () => void;
  onAnniEsperienzaBadanteBlur: () => void;
  onAnniEsperienzaBabysitterBlur: () => void;
  onSituazioneLavorativaAttualeBlur: () => void;
  onExperiencePatch: (
    experienceId: string,
    patch: Partial<EsperienzaLavoratoreRecord>,
  ) => Promise<void> | void;
  onExperienceCreate?: (
    values: Partial<EsperienzaLavoratoreRecord>,
  ) => Promise<void> | void;
  onReferencePatch: (
    referenceId: string,
    patch: Partial<ReferenzaLavoratoreRecord>,
  ) => Promise<void> | void;
  onReferenceCreate: (
    values: Partial<ReferenzaLavoratoreRecord>,
  ) => Promise<void> | void;
};

export function ExperienceReferencesCard({
  workerId = null,
  isEditing,
  showEditAction = true,
  showCreateExperienceAction = false,
  title = "Esperienze e Referenze",
  showSummaryFields = true,
  showSituationField = true,
  isUpdating,
  draft,
  experiences,
  experiencesLoading,
  references,
  referencesLoading,
  lookupColorsByDomain,
  experienceTipoLavoroOptions,
  experienceTipoRapportoOptions,
  referenceStatusOptions,
  selectedAnniEsperienzaColf,
  selectedAnniEsperienzaBadante,
  selectedAnniEsperienzaBabysitter,
  selectedSituazioneLavorativaAttuale,
  onToggleEdit,
  onAnniEsperienzaColfChange,
  onAnniEsperienzaBadanteChange,
  onAnniEsperienzaBabysitterChange,
  onSituazioneLavorativaAttualeChange,
  onAnniEsperienzaColfBlur,
  onAnniEsperienzaBadanteBlur,
  onAnniEsperienzaBabysitterBlur,
  onSituazioneLavorativaAttualeBlur,
  onExperiencePatch,
  onExperienceCreate,
  onReferencePatch,
  onReferenceCreate,
}: ExperienceReferencesCardProps) {
  const referencesByExperienceId = React.useMemo(() => {
    const grouped = new Map<string, ReferenzaLavoratoreRecord[]>();
    for (const reference of references) {
      if (!reference.esperienza_lavoratore_id) continue;
      const current = grouped.get(reference.esperienza_lavoratore_id) ?? [];
      current.push(reference);
      grouped.set(reference.esperienza_lavoratore_id, current);
    }
    return grouped;
  }, [references]);

  const sortedExperiences = React.useMemo(() => {
    return [...experiences].sort((left, right) => {
      const leftActive = left.stato_esperienza_attiva === true ? 1 : 0;
      const rightActive = right.stato_esperienza_attiva === true ? 1 : 0;
      if (leftActive !== rightActive) return rightActive - leftActive;
      const leftDate = left.data_inizio ? new Date(left.data_inizio).getTime() : 0;
      const rightDate = right.data_inizio ? new Date(right.data_inizio).getTime() : 0;
      return rightDate - leftDate;
    });
  }, [experiences]);

  return (
    <DetailSectionCard
      title={title}
      titleIcon={<FileTextIcon className="text-muted-foreground size-4" />}
      titleAction={
        showEditAction ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={
              isEditing ? "Termina modifica esperienze" : "Modifica esperienze"
            }
            title={
              isEditing ? "Termina modifica esperienze" : "Modifica esperienze"
            }
            onClick={onToggleEdit}
          >
            <PencilIcon />
          </Button>
        ) : undefined
      }
      titleOnBorder
      contentClassName="space-y-4"
    >
      {showSummaryFields ? (
        isEditing ? (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
                Anni Esperienza Colf
              </FieldTitle>
              <Input
                type="number"
                min="0"
                step="1"
                value={draft.anni_esperienza_colf}
                onChange={(event) =>
                  onAnniEsperienzaColfChange(event.target.value)
                }
                onBlur={onAnniEsperienzaColfBlur}
                disabled={isUpdating}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
                Anni Esperienza Badante
              </FieldTitle>
              <Input
                type="number"
                min="0"
                step="1"
                value={draft.anni_esperienza_badante}
                onChange={(event) =>
                  onAnniEsperienzaBadanteChange(event.target.value)
                }
                onBlur={onAnniEsperienzaBadanteBlur}
                disabled={isUpdating}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
                Anni Esperienza Babysitter
              </FieldTitle>
              <Input
                type="number"
                min="0"
                step="1"
                value={draft.anni_esperienza_babysitter}
                onChange={(event) =>
                  onAnniEsperienzaBabysitterChange(event.target.value)
                }
                onBlur={onAnniEsperienzaBabysitterBlur}
                disabled={isUpdating}
                className="h-9 text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <ExperienceLevel
              label="Anni Esperienza Colf"
              years={selectedAnniEsperienzaColf}
            />
            <ExperienceLevel
              label="Anni Esperienza Badante"
              years={selectedAnniEsperienzaBadante}
            />
            <ExperienceLevel
              label="Anni Esperienza Babysitter"
              years={selectedAnniEsperienzaBabysitter}
            />
          </div>
        )
      ) : null}

      {showSituationField ? (
        <div className="space-y-2">
          <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
            Situazione lavorativa attuale
          </FieldTitle>
          {isEditing ? (
            <Textarea
              value={draft.situazione_lavorativa_attuale}
              onChange={(event) =>
                onSituazioneLavorativaAttualeChange(event.target.value)
              }
              onBlur={onSituazioneLavorativaAttualeBlur}
              disabled={isUpdating}
              className="min-h-24 w-full text-sm"
            />
          ) : (
            <FieldDescription className="text-foreground leading-7 whitespace-pre-wrap">
              {selectedSituazioneLavorativaAttuale || "-"}
            </FieldDescription>
          )}
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
            Inserisci una sola esperienza
          </FieldTitle>
          {showCreateExperienceAction && isEditing && onExperienceCreate ? (
            <Button
              type="button"
              variant="outline"
              size="default"
              aria-label="Aggiungi esperienza"
              title="Aggiungi esperienza"
              className="h-10 px-4 text-sm"
              onClick={() =>
                void onExperienceCreate({
                  lavoratore_id: workerId,
                  tipo_lavoro: null,
                  tipo_rapporto: null,
                  data_inizio: null,
                  data_fine: null,
                  stato_esperienza_attiva: false,
                  descrizione: null,
                  descrizione_contesto_lavorativo: null,
                  motivazione_fine_rapporto: null,
                })
              }
            >
              <PlusIcon />
              Aggiungi nuova esperienza
            </Button>
          ) : null}
        </div>
        {experiencesLoading ? (
          <FieldDescription>Caricamento esperienze...</FieldDescription>
        ) : experiences.length === 0 ? (
          <FieldDescription>Nessuna esperienza collegata.</FieldDescription>
        ) : (
          <Accordion
            type="multiple"
            className="space-y-3"
            defaultValue={[]}
          >
            {sortedExperiences.map((experience) => {
              const dateLabel = experience.stato_esperienza_attiva
                ? `${formatDateOnly(experience.data_inizio) || "-"} - In corso`
                : `${formatDateOnly(experience.data_inizio) || "-"} - ${
                    formatDateOnly(experience.data_fine) || "-"
                  }`;
              const experienceReferences =
                referencesByExperienceId.get(experience.id) ?? [];
              const referenceStatus = getExperienceReferenceStatus(
                experienceReferences,
              );
              const referenceStatusIcon = referenceStatus
                ? getReferenceStatusIcon(referenceStatus)
                : null;

              return (
                <AccordionItem
                  key={experience.id}
                  value={experience.id}
                  className="bg-background rounded-lg border px-4"
                >
                  <AccordionTrigger className="py-4 hover:no-underline">
                    <div className="flex w-full items-start justify-between gap-3 pr-2">
                      <div className="space-y-1 text-left">
                        <div className="flex items-center gap-2">
                          <ExperienceCardTitle>
                            {getExperienceHeader(experience)}
                          </ExperienceCardTitle>
                          {experience.stato_esperienza_attiva ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-200 bg-emerald-100 text-emerald-700"
                            >
                              Attiva
                            </Badge>
                          ) : null}
                          {referenceStatusIcon ? (
                            <span title={referenceStatus ?? undefined}>
                              {referenceStatusIcon}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                          <CalendarRangeIcon className="text-muted-foreground size-4" />
                          <span>{dateLabel}</span>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-0 pb-0">
                    {isEditing ? (
                      <EditableExperienceCard
                        experience={experience}
                        references={experienceReferences}
                        referencesLoading={referencesLoading}
                        disabled={isUpdating}
                        experienceTipoLavoroOptions={experienceTipoLavoroOptions}
                        experienceTipoRapportoOptions={experienceTipoRapportoOptions}
                        referenceStatusOptions={referenceStatusOptions}
                        onExperiencePatch={onExperiencePatch}
                        onReferencePatch={onReferencePatch}
                        onReferenceCreate={onReferenceCreate}
                      />
                    ) : (
                      <Card className="bg-background gap-0 py-0 shadow-none">
                        <CardContent className="space-y-4 px-0 pt-1 pb-2">
                          <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
                          Descrizione Mansioni ed Esperienza
                        </FieldTitle>
                        <FieldDescription className="text-foreground leading-7 whitespace-pre-wrap">
                          {experience.descrizione || "-"}
                        </FieldDescription>
                      </div>
                      <div className="space-y-2">
                        <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
                          Descrizione Famiglia e Contesto
                        </FieldTitle>
                        <FieldDescription className="text-foreground leading-7 whitespace-pre-wrap">
                          {experience.descrizione_contesto_lavorativo || "-"}
                        </FieldDescription>
                      </div>
                    </div>

                    {!experience.stato_esperienza_attiva ? (
                      <div className="space-y-2">
                        <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
                          Motivazione fine rapporto
                        </FieldTitle>
                        <FieldDescription className="text-foreground leading-7 whitespace-pre-wrap">
                          {experience.motivazione_fine_rapporto || "-"}
                        </FieldDescription>
                      </div>
                    ) : null}

                    <div className="space-y-3">
                      <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
                        Referenze
                      </FieldTitle>
                      {referencesLoading ? (
                        <FieldDescription>
                          Caricamento referenze...
                        </FieldDescription>
                      ) : experienceReferences.length === 0 ? (
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-4">
                          <FieldDescription>
                            Nessuna referenza collegata.
                          </FieldDescription>
                          <AddReferenceAction
                            experience={experience}
                            disabled={false}
                            onReferenceCreate={onReferenceCreate}
                          />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {experienceReferences.map((reference) => {
                            const status = reference.referenza_verificata ?? "";
                            const statusClassName = getTagClassName(
                              resolveLookupColor(
                                lookupColorsByDomain,
                                "referenze_lavoratori.referenza_verificata",
                                status,
                              ),
                            );
                            const isVerified =
                              status === "Referenza verificata";
                            const referenceFullName =
                              [reference.nome_datore, reference.cognome_datore]
                                .filter(Boolean)
                                .join(" ")
                                .trim() || "-";
                            const statusIcon = getReferenceStatusIcon(status);

                            return (
                              <Card key={reference.id} className="shadow-none">
                                <CardContent className="space-y-4 p-4">
                                  <div className="space-y-4">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-3">
                                        <ExperienceCardTitle>
                                          {referenceFullName}
                                        </ExperienceCardTitle>
                                        <Badge
                                          variant="outline"
                                          className={statusClassName}
                                        >
                                          {statusIcon}
                                          {status || "-"}
                                        </Badge>
                                      </div>
                                      <div className="text-muted-foreground flex items-center gap-2 text-sm leading-6">
                                        <PhoneIcon className="size-3.5 shrink-0" />
                                        <span>
                                          {reference.telefono_datore || "-"}
                                        </span>
                                      </div>
                                    </div>

                                    {isVerified ? (
                                      <div className="space-y-4">
                                        <div className="grid gap-4 md:grid-cols-2">
                                          <div className="space-y-2">
                                            <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
                                              <StarIcon className="size-3.5" />
                                              Valutazione
                                            </FieldTitle>
                                            <div className="flex items-center gap-1">
                                              {Array.from(
                                                { length: 5 },
                                                (_, index) => {
                                                  const active =
                                                    (reference.valutazione ??
                                                      0) > index;
                                                  return (
                                                    <StarIcon
                                                      key={index}
                                                      className={
                                                        active
                                                          ? "fill-primary text-primary size-4"
                                                          : "text-muted-foreground/35 size-4"
                                                      }
                                                    />
                                                  );
                                                },
                                              )}
                                            </div>
                                          </div>
                                          <div className="space-y-2">
                                            <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
                                              <CheckCircle2Icon className="size-3.5" />
                                              Disponibile a essere richiamata
                                            </FieldTitle>
                                            <FieldDescription className="text-foreground leading-6 whitespace-pre-wrap">
                                              {(reference.referenza_verificata_da_baze ??
                                              Boolean(
                                                reference.telefono_datore,
                                              ))
                                                ? "Si"
                                                : "No"}
                                            </FieldDescription>
                                          </div>
                                        </div>

                                        <div className="space-y-2">
                                          <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
                                            <MessageSquareTextIcon className="size-3.5" />
                                            Feedback della referenza
                                          </FieldTitle>
                                          <FieldDescription className="text-foreground leading-7 whitespace-pre-wrap">
                                            {reference.commento_esperienza ||
                                              "-"}
                                          </FieldDescription>
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                        </CardContent>
                      </Card>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </DetailSectionCard>
  );
}
