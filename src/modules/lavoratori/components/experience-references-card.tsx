import * as React from "react";
import { toast } from "sonner";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  BotIcon,
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
  Trash2Icon,
  UserIcon,
} from "lucide-react";

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Controller, useController, useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { FieldInput, FieldTextarea } from "@/components/forms/field-components";
import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import {
  NEW_WORKER_EXPERIENCE_FORM_DEFAULTS,
  newWorkerExperienceFormSchema,
  newWorkerReferenceFormSchema,
  type NewWorkerExperienceFormValues,
  type NewWorkerReferenceFormValues,
} from "../lib/worker-creation-schemas";
import { formatDateOnly } from "../lib/availability-utils";
import {
  getLookupOptionLabel,
  getTagClassName,
  normalizeLookupDbLabels,
  normalizeLookupOptionValues,
  resolveLookupColor,
} from "../lib/lookup-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { EsperienzaLavoratoreRecord } from "../types/esperienza-lavoratore";
import type { ReferenzaLavoratoreRecord } from "../types/referenza-lavoratore";

const EMPTY_SELECT_VALUE = "none";

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

function ExperienceYearsField({
  label,
  years,
}: {
  label: string;
  years: string;
}) {
  const numericYears = Number(years);
  const hasYears = years !== "" && Number.isFinite(numericYears);
  return (
    <div className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <p
        className={cn(
          "text-sm font-semibold leading-none",
          hasYears ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {hasYears ? `${numericYears} ${numericYears === 1 ? "anno" : "anni"}` : "-"}
      </p>
    </div>
  );
}

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
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth());

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
  const normalizedValue = React.useMemo(
    () => normalizeLookupOptionValues(value, options),
    [options, value],
  );

  return (
    <Combobox
      multiple
      autoHighlight
      items={options.map((option) => option.value)}
      value={normalizedValue}
      onValueChange={(nextValues) =>
        onChange(normalizeLookupDbLabels(nextValues as string[], options))
      }
      disabled={disabled}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values) => (
            <React.Fragment>
              {values.map((item: string) => (
                <ComboboxChip key={item}>
                  {getLookupOptionLabel(options, item)}
                </ComboboxChip>
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
              {getLookupOptionLabel(options, item)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

// FASE 5 BIS — wrapper form-aware del Combobox ruoli (preserva la
// normalizzazione bespoke label↔value dentro ExperienceRoleField).
function FieldExperienceRole({
  name,
  options,
  disabled,
}: {
  name: string;
  options: LookupOption[];
  disabled: boolean;
}) {
  const { field } = useController({ name });
  const value = Array.isArray(field.value) ? (field.value as string[]) : [];
  return (
    <ExperienceRoleField
      value={value}
      options={options}
      disabled={disabled}
      onChange={field.onChange}
    />
  );
}

// FASE 5 BIS — Select tipo rapporto form-aware (value = LABEL, come l'originale;
// EMPTY_SELECT_VALUE ↔ "" interno).
function FieldTipoRapportoSelect({
  name,
  options,
  disabled,
}: {
  name: string;
  options: LookupOption[];
  disabled: boolean;
}) {
  const { field } = useController({ name });
  const value = typeof field.value === "string" ? field.value : "";
  return (
    <Select
      value={value || EMPTY_SELECT_VALUE}
      onValueChange={(next) =>
        field.onChange(next === EMPTY_SELECT_VALUE ? "" : next)
      }
      disabled={disabled}
    >
      <SelectTrigger className="h-9 w-full">
        <SelectValue placeholder="Seleziona tipo rapporto" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={EMPTY_SELECT_VALUE}>Non indicato</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.label}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// FASE 5 BIS — checkbox "rapporto attivo" form-aware. Caso speciale: quando si
// attiva, azzera anche data_fine (setValue marca dirty → autosave persiste null).
function FieldRapportoAttivo({
  name,
  dataFineName,
  disabled,
}: {
  name: string;
  dataFineName: string;
  disabled: boolean;
}) {
  const { field } = useController({ name });
  const { setValue } = useFormContext();
  const checked = Boolean(field.value);
  return (
    <label className="flex h-9 items-center gap-2 text-sm">
      <Checkbox
        checked={checked}
        onCheckedChange={(next) => {
          const nextValue = next === true;
          field.onChange(nextValue);
          if (nextValue) {
            setValue(dataFineName, "", { shouldDirty: true });
          }
        }}
        disabled={disabled}
      />
      <span>{checked ? "Si" : "No"}</span>
    </label>
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
  const form = useForm<NewWorkerReferenceFormValues>({
    resolver: zodResolver(newWorkerReferenceFormSchema),
    defaultValues: {
      nome_datore: "",
      cognome_datore: "",
      telefono_datore: "",
    },
  });

  const resetAndClose = React.useCallback(() => {
    form.reset();
    setOpen(false);
  }, [form]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) form.reset();
    },
    [form],
  );

  const onSubmit = form.handleSubmit(async (values) => {
    const nome = values.nome_datore.trim();
    const cognome = values.cognome_datore.trim();
    const telefono = values.telefono_datore.trim();

    await onReferenceCreate({
      esperienza_lavoratore_id: experience.id,
      lavoratore_id: experience.lavoratore_id,
      referenza_verificata: "Referenza da richiedere",
      nome_datore: nome || null,
      cognome_datore: cognome || null,
      telefono_datore: telefono,
      ruolo:
        Array.isArray(experience.tipo_lavoro) && experience.tipo_lavoro.length > 0
          ? experience.tipo_lavoro
          : null,
    });

    resetAndClose();
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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

        <Form {...form}>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <FieldLabel>Nome</FieldLabel>
              <Input
                {...form.register("nome_datore")}
                disabled={disabled}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Cognome</FieldLabel>
              <Input
                {...form.register("cognome_datore")}
                disabled={disabled}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>Telefono</FieldLabel>
              <Input
                {...form.register("telefono_datore")}
                type="tel"
                disabled={disabled}
                className="w-full"
              />
            </div>
            {form.formState.errors.nome_datore?.message ||
            form.formState.errors.telefono_datore?.message ? (
              <FieldDescription className="text-destructive">
                {form.formState.errors.nome_datore?.message ??
                  form.formState.errors.telefono_datore?.message}
              </FieldDescription>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetAndClose}>
                Annulla
              </Button>
              <Button type="submit" disabled={disabled}>
                Aggiungi referenza
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

type AddExperienceActionProps = {
  workerId: string | null;
  disabled: boolean;
  experienceTipoLavoroOptions: LookupOption[];
  experienceTipoRapportoOptions: LookupOption[];
  onExperienceCreate: (
    values: Partial<EsperienzaLavoratoreRecord>,
  ) => Promise<void> | void;
};

function AddExperienceAction({
  workerId,
  disabled,
  experienceTipoLavoroOptions,
  experienceTipoRapportoOptions,
  onExperienceCreate,
}: AddExperienceActionProps) {
  const [open, setOpen] = React.useState(false);
  const form = useForm<NewWorkerExperienceFormValues>({
    resolver: zodResolver(newWorkerExperienceFormSchema),
    defaultValues: NEW_WORKER_EXPERIENCE_FORM_DEFAULTS,
  });
  const statoEsperienzaAttiva = form.watch("stato_esperienza_attiva");

  const resetAndClose = React.useCallback(() => {
    form.reset(NEW_WORKER_EXPERIENCE_FORM_DEFAULTS);
    setOpen(false);
  }, [form]);

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) form.reset(NEW_WORKER_EXPERIENCE_FORM_DEFAULTS);
    },
    [form],
  );

  const onSubmit = form.handleSubmit(async (values) => {
    await onExperienceCreate({
      lavoratore_id: workerId,
      tipo_lavoro: values.tipo_lavoro.length > 0 ? values.tipo_lavoro : null,
      tipo_rapporto: values.tipo_rapporto || null,
      data_inizio: values.data_inizio || null,
      data_fine: values.stato_esperienza_attiva ? null : values.data_fine || null,
      stato_esperienza_attiva: values.stato_esperienza_attiva,
      descrizione: values.descrizione.trim() || null,
      descrizione_contesto_lavorativo:
        values.descrizione_contesto_lavorativo.trim() || null,
      motivazione_fine_rapporto: values.stato_esperienza_attiva
        ? null
        : values.motivazione_fine_rapporto.trim() || null,
    });

    resetAndClose();
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        variant="outline"
        size="default"
        aria-label="Aggiungi esperienza"
        title="Aggiungi esperienza"
        className="h-10 px-4 text-sm"
        onClick={() => setOpen(true)}
        disabled={disabled || !workerId}
      >
        <PlusIcon />
        Aggiungi esperienza
      </Button>

      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nuova esperienza</DialogTitle>
          <DialogDescription>
            Inserisci i dettagli dell&apos;esperienza lavorativa del lavoratore.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>Tipo lavoro</FieldLabel>
                <Controller
                  name="tipo_lavoro"
                  control={form.control}
                  render={({ field }) => (
                    <ExperienceRoleField
                      value={field.value}
                      options={experienceTipoLavoroOptions}
                      disabled={disabled}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Tipo rapporto</FieldLabel>
                <Controller
                  name="tipo_rapporto"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      value={field.value || EMPTY_SELECT_VALUE}
                      onValueChange={(value) =>
                        field.onChange(value === EMPTY_SELECT_VALUE ? "" : value)
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="Seleziona tipo rapporto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={EMPTY_SELECT_VALUE}>Non indicato</SelectItem>
                        {experienceTipoRapportoOptions.map((option) => (
                          <SelectItem key={option.value} value={option.label}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <FieldLabel>Data inizio</FieldLabel>
                <Input
                  {...form.register("data_inizio")}
                  type="date"
                  disabled={disabled}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Data fine</FieldLabel>
                <Input
                  {...form.register("data_fine")}
                  type="date"
                  disabled={disabled || statoEsperienzaAttiva}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Rapporto attivo</FieldLabel>
                <Controller
                  name="stato_esperienza_attiva"
                  control={form.control}
                  render={({ field }) => (
                    <label className="flex h-9 items-center gap-2 text-sm">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          const nextValue = checked === true;
                          field.onChange(nextValue);
                          if (nextValue) {
                            form.setValue("data_fine", "", { shouldDirty: true });
                          }
                        }}
                        disabled={disabled}
                      />
                      <span>{field.value ? "Si" : "No"}</span>
                    </label>
                  )}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel>Descrizione Mansioni ed Esperienza</FieldLabel>
                <Textarea
                  {...form.register("descrizione")}
                  disabled={disabled}
                  className="min-h-28 w-full text-sm"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel>Descrizione Famiglia e Contesto</FieldLabel>
                <Textarea
                  {...form.register("descrizione_contesto_lavorativo")}
                  disabled={disabled}
                  className="min-h-28 w-full text-sm"
                />
              </div>
            </div>

            {!statoEsperienzaAttiva ? (
              <div className="space-y-2">
                <FieldLabel>Motivazione fine rapporto</FieldLabel>
                <Textarea
                  {...form.register("motivazione_fine_rapporto")}
                  disabled={disabled}
                  className="min-h-24 w-full text-sm"
                />
              </div>
            ) : null}

            {form.formState.errors.data_fine?.message ? (
              <FieldDescription className="text-destructive">
                {form.formState.errors.data_fine.message}
              </FieldDescription>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetAndClose}>
                Annulla
              </Button>
              <Button type="submit" disabled={disabled || !workerId}>
                Aggiungi esperienza
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteExperienceAction({
  disabled,
  onDelete,
}: {
  disabled: boolean;
  onDelete: () => Promise<void> | void;
}) {
  const [open, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await toast.promise(Promise.resolve(onDelete()), {
        loading: "Eliminazione esperienza in corso…",
        success: "Esperienza eliminata",
        error: "Errore durante l'eliminazione dell'esperienza",
      }).unwrap();
      setOpen(false);
    } catch {
      // l'errore è già notificato dal toast
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        disabled={disabled}
        aria-label="Elimina esperienza"
        title="Elimina esperienza"
        className="text-destructive hover:text-destructive"
      >
        <Trash2Icon className="size-4" />
      </Button>
      <AlertDialogContent>
        <div className="space-y-2 text-left">
          <div className="bg-destructive/10 text-destructive flex size-9 items-center justify-center rounded-full">
            <AlertTriangleIcon className="size-4" />
          </div>
          <AlertDialogTitle>Eliminare questa esperienza?</AlertDialogTitle>
          <AlertDialogDescription>
            L&apos;esperienza verrà rimossa dal profilo del lavoratore. Se ci
            sono referenze collegate a questa esperienza, verranno eliminate
            insieme all&apos;esperienza. Questa azione non è reversibile.
          </AlertDialogDescription>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            onClick={(event) => {
              event.preventDefault();
              void handleDelete();
            }}
          >
            Elimina esperienza
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
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

// FASE 5 BIS — Select "stato verifica" form-aware. Le opzioni usano la LABEL
// come value (come il pattern originale); EMPTY_SELECT_VALUE ↔ "" interno.
function FieldReferenceStatusSelect({
  name,
  options,
  disabled,
}: {
  name: string;
  options: LookupOption[];
  disabled: boolean;
}) {
  const { field } = useController({ name });
  const value = typeof field.value === "string" ? field.value : "";
  return (
    <Select
      value={value || EMPTY_SELECT_VALUE}
      onValueChange={(next) =>
        field.onChange(next === EMPTY_SELECT_VALUE ? "" : next)
      }
      disabled={disabled}
    >
      <SelectTrigger className="h-9 w-full">
        <SelectValue placeholder="Seleziona stato" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={EMPTY_SELECT_VALUE}>Non indicato</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.label}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// FASE 5 BIS — rating a stelle form-aware (numero 0..5).
function FieldStarRating({
  name,
  disabled,
}: {
  name: string;
  disabled: boolean;
}) {
  const { field } = useController({ name });
  const current = typeof field.value === "number" ? field.value : 0;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => {
        const score = index + 1;
        const active = current >= score;
        return (
          <button
            key={score}
            type="button"
            onClick={() => field.onChange(score)}
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
  );
}

// FASE 5 BIS — checkbox booleana form-aware con label Si/No accanto.
function FieldDisponibileCheckbox({
  name,
  disabled,
}: {
  name: string;
  disabled: boolean;
}) {
  const { field } = useController({ name });
  const checked = Boolean(field.value);
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={checked}
        onCheckedChange={(next) => field.onChange(next === true)}
        disabled={disabled}
      />
      <span className="inline-flex items-center gap-1">
        <CheckIcon className="size-3.5" />
        {checked ? "Si" : "No"}
      </span>
    </label>
  );
}

function EditableReferenceCard({
  reference,
  referenceStatusOptions,
  disabled,
  onPatch,
}: EditableReferenceCardProps) {
  // FASE 5 BIS — form + autosave. I defaults vengono dal record (resync realtime
  // senza clobber via useAutoSaveForm); onSave instrada ogni campo cambiato a
  // onPatch con la colonna DB e la normalizzazione ("" → null sui testi).
  const form = useAutoSaveForm({
    defaults: {
      referenza_verificata: reference.referenza_verificata ?? "",
      nome_datore: reference.nome_datore ?? "",
      cognome_datore: reference.cognome_datore ?? "",
      telefono_datore: reference.telefono_datore ?? "",
      valutazione: reference.valutazione ?? 0,
      commento_esperienza: reference.commento_esperienza ?? "",
      referenza_verificata_da_baze:
        reference.referenza_verificata_da_baze ?? false,
    },
    onSave: async (patch) => {
      const out: Partial<ReferenzaLavoratoreRecord> = {};
      for (const [key, value] of Object.entries(patch)) {
        switch (key) {
          case "referenza_verificata":
            out.referenza_verificata = value as string;
            break;
          case "nome_datore":
            out.nome_datore = (value as string).trim() || null;
            break;
          case "cognome_datore":
            out.cognome_datore = (value as string).trim() || null;
            break;
          case "telefono_datore":
            out.telefono_datore = (value as string).trim() || null;
            break;
          case "commento_esperienza":
            out.commento_esperienza = (value as string).trim() || null;
            break;
          case "valutazione":
            out.valutazione = value as number;
            break;
          case "referenza_verificata_da_baze":
            out.referenza_verificata_da_baze = value as boolean;
            break;
        }
      }
      await onPatch(reference.id, out);
    },
  });

  const isVerified =
    form.watch("referenza_verificata") === "Referenza verificata";

  return (
    <Form {...form}>
    <Card className="gap-0 py-0 shadow-none">
      <CardContent className="space-y-4 p-4 pt-3 pb-3">
        <div className="space-y-2">
          <FieldLabel>
            Stato verifica referenza
          </FieldLabel>
          <div className="max-w-sm">
            <FieldReferenceStatusSelect
              name="referenza_verificata"
              options={referenceStatusOptions}
              disabled={disabled}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <FieldLabel>
              <UserIcon className="size-3.5" />
              Nome referenza
            </FieldLabel>
            <FieldInput name="nome_datore" disabled={disabled} className="h-9 text-sm" />
          </div>
          <div className="space-y-2">
            <FieldLabel>
              <UserIcon className="size-3.5" />
              Cognome referenza
            </FieldLabel>
            <FieldInput name="cognome_datore" disabled={disabled} className="h-9 text-sm" />
          </div>
          <div className="space-y-2">
            <FieldLabel>
              <PhoneIcon className="size-3.5" />
              Numero referenza
            </FieldLabel>
            <FieldInput name="telefono_datore" disabled={disabled} className="h-9 text-sm" />
          </div>
        </div>

        {isVerified ? (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <FieldLabel>
                <StarIcon className="size-3.5" />
                Valutazione
              </FieldLabel>
              <FieldStarRating name="valutazione" disabled={disabled} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <FieldLabel>
                <CheckCircle2Icon className="size-3.5" />
                Disponibile a essere chiamata
              </FieldLabel>
              <FieldDisponibileCheckbox
                name="referenza_verificata_da_baze"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <FieldLabel>
                <MessageSquareTextIcon className="size-3.5" />
                Feedback della referenza
              </FieldLabel>
              <FieldTextarea
                name="commento_esperienza"
                className="min-h-24 w-full text-sm"
              />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
    </Form>
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
  // FASE 5 BIS — form + autosave. I defaults vengono dal record; onSave instrada
  // ogni campo cambiato a onExperiencePatch con colonna DB e normalizzazione.
  // Caso speciale "rapporto attivo": il toggle azzera anche data_fine (gestito
  // dal wrapper FieldRapportoAttivo via setValue, così il form resta coerente).
  const form = useAutoSaveForm({
    defaults: {
      tipo_lavoro: experience.tipo_lavoro ?? [],
      tipo_rapporto: experience.tipo_rapporto ?? "",
      data_inizio: experience.data_inizio ?? "",
      data_fine: experience.data_fine ?? "",
      stato_esperienza_attiva: experience.stato_esperienza_attiva ?? false,
      descrizione: experience.descrizione ?? "",
      descrizione_contesto_lavorativo:
        experience.descrizione_contesto_lavorativo ?? "",
      motivazione_fine_rapporto: experience.motivazione_fine_rapporto ?? "",
    },
    onSave: async (patch) => {
      const out: Partial<EsperienzaLavoratoreRecord> = {};
      for (const [key, value] of Object.entries(patch)) {
        switch (key) {
          case "tipo_lavoro":
            out.tipo_lavoro =
              (value as string[]).length > 0 ? (value as string[]) : null;
            break;
          case "tipo_rapporto":
            out.tipo_rapporto = (value as string) || null;
            break;
          case "data_inizio":
            out.data_inizio = (value as string) || null;
            break;
          case "data_fine":
            out.data_fine = (value as string) || null;
            break;
          case "stato_esperienza_attiva":
            out.stato_esperienza_attiva = value as boolean;
            break;
          case "descrizione":
            out.descrizione = (value as string).trim() || null;
            break;
          case "descrizione_contesto_lavorativo":
            out.descrizione_contesto_lavorativo =
              (value as string).trim() || null;
            break;
          case "motivazione_fine_rapporto":
            out.motivazione_fine_rapporto = (value as string).trim() || null;
            break;
        }
      }
      await onExperiencePatch(experience.id, out);
    },
  });

  const statoAttiva = Boolean(form.watch("stato_esperienza_attiva"));

  return (
    <Form {...form}>
    <Card className="bg-background gap-0 py-0 shadow-none">
      <CardContent className="space-y-4 px-0 pt-1 pb-2">
        <div className="space-y-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <FieldLabel>
                Tipo lavoro
              </FieldLabel>
              <FieldExperienceRole
                name="tipo_lavoro"
                options={experienceTipoLavoroOptions}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>
                Tipo rapporto
              </FieldLabel>
              <FieldTipoRapportoSelect
                name="tipo_rapporto"
                options={experienceTipoRapportoOptions}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <FieldLabel>
                Data inizio
              </FieldLabel>
              <FieldInput
                name="data_inizio"
                type="date"
                disabled={disabled}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>
                Data fine
              </FieldLabel>
              <FieldInput
                name="data_fine"
                type="date"
                disabled={disabled || statoAttiva}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel>
                Rapporto attivo
              </FieldLabel>
              <FieldRapportoAttivo
                name="stato_esperienza_attiva"
                dataFineName="data_fine"
                disabled={disabled}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel>
              Descrizione Mansioni ed Esperienza
            </FieldLabel>
            <FieldTextarea
              name="descrizione"
              disabled={disabled}
              className="min-h-28 w-full text-sm"
            />
          </div>
          <div className="space-y-2">
            <FieldLabel>
              Descrizione Famiglia e Contesto
            </FieldLabel>
            <FieldTextarea
              name="descrizione_contesto_lavorativo"
              disabled={disabled}
              className="min-h-28 w-full text-sm"
            />
          </div>
        </div>

        {!statoAttiva ? (
          <div className="space-y-2">
            <FieldLabel>
              Motivazione fine rapporto
            </FieldLabel>
            <FieldTextarea
              name="motivazione_fine_rapporto"
              disabled={disabled}
              className="min-h-24 w-full text-sm"
            />
          </div>
        ) : null}

        <div className="space-y-3">
          <FieldLabel>
            Referenze
          </FieldLabel>
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
    </Form>
  );
}

type ExperienceReferencesCardProps = {
  workerId?: string | null;
  isEditing: boolean;
  showEditAction?: boolean;
  showCreateExperienceAction?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
  title?: string;
  showSummaryFields?: boolean;
  showSituationField?: boolean;
  showReferencesSection?: boolean;
  aiSummaryValue?: string;
  isGeneratingAiSummary?: boolean;
  onGenerateAiSummary?: () => Promise<void> | void;
  onAiSummaryChange?: (value: string) => void;
  children?: React.ReactNode;
  isUpdating: boolean;
  draft?: ExperienceDraft;
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
  onExperiencePatch: (
    experienceId: string,
    patch: Partial<EsperienzaLavoratoreRecord>,
  ) => Promise<void> | void;
  onExperienceCreate?: (
    values: Partial<EsperienzaLavoratoreRecord>,
  ) => Promise<void> | void;
  onExperienceDelete?: (experienceId: string) => Promise<void> | void;
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
  collapsible = true,
  defaultOpen = true,
  title = "Esperienze e Referenze",
  showSummaryFields = true,
  showSituationField = true,
  showReferencesSection = true,
  aiSummaryValue,
  isGeneratingAiSummary = false,
  onGenerateAiSummary,
  onAiSummaryChange,
  children,
  isUpdating,
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
  onExperiencePatch,
  onExperienceCreate,
  onExperienceDelete,
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
    <DetailSectionBlock
      title={title}
      icon={<FileTextIcon className="text-muted-foreground size-4" />}
      action={
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
      showDefaultAction={showEditAction}
      collapsible={collapsible}
      defaultOpen={defaultOpen}
      contentClassName="space-y-4"
    >
      {children}

      {onGenerateAiSummary ? (
        <div className="space-y-2 rounded-lg border bg-muted/15 p-3">
          <div className="flex items-center justify-between gap-3">
            <FieldLabel>Riassunto esperienze AI</FieldLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void onGenerateAiSummary()}
              disabled={isUpdating || isGeneratingAiSummary}
            >
              <BotIcon className="size-4" />
              {aiSummaryValue ? "Rigenera" : "Genera"}
            </Button>
          </div>
          <Textarea
            value={aiSummaryValue || ""}
            onChange={(event) => onAiSummaryChange?.(event.target.value)}
            readOnly={!onAiSummaryChange || isGeneratingAiSummary}
            placeholder="Nessun riassunto generato. Genera con AI o scrivi manualmente."
            className="min-h-24 w-full resize-y bg-background text-sm"
          />
        </div>
      ) : null}

      {showSummaryFields ? (
        isEditing ? (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <FieldLabel>Anni esp. Colf</FieldLabel>
              <Input
                type="number"
                min="0"
                step="1"
                value={selectedAnniEsperienzaColf}
                onChange={(event) =>
                  onAnniEsperienzaColfChange(event.target.value)
                }
                disabled={isUpdating}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <FieldLabel>Anni esp. Badante</FieldLabel>
              <Input
                type="number"
                min="0"
                step="1"
                value={selectedAnniEsperienzaBadante}
                onChange={(event) =>
                  onAnniEsperienzaBadanteChange(event.target.value)
                }
                disabled={isUpdating}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <FieldLabel>Anni esp. Babysitter</FieldLabel>
              <Input
                type="number"
                min="0"
                step="1"
                value={selectedAnniEsperienzaBabysitter}
                onChange={(event) =>
                  onAnniEsperienzaBabysitterChange(event.target.value)
                }
                disabled={isUpdating}
                className="h-9 text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <ExperienceYearsField
              label="Anni esp. Colf"
              years={selectedAnniEsperienzaColf}
            />
            <ExperienceYearsField
              label="Anni esp. Badante"
              years={selectedAnniEsperienzaBadante}
            />
            <ExperienceYearsField
              label="Anni esp. Babysitter"
              years={selectedAnniEsperienzaBabysitter}
            />
          </div>
        )
      ) : null}

      {showSituationField ? (
        <div className="space-y-2">
          <FieldLabel>
            Situazione lavorativa attuale
          </FieldLabel>
          {isEditing ? (
            <Textarea
              value={selectedSituazioneLavorativaAttuale}
              onChange={(event) =>
                onSituazioneLavorativaAttualeChange(event.target.value)
              }
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
          <FieldLabel>
            Esperienze di lavoro
          </FieldLabel>
          {showCreateExperienceAction && isEditing && onExperienceCreate ? (
            <AddExperienceAction
              workerId={workerId}
              disabled={isUpdating}
              experienceTipoLavoroOptions={experienceTipoLavoroOptions}
              experienceTipoRapportoOptions={experienceTipoRapportoOptions}
              onExperienceCreate={onExperienceCreate}
            />
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
              const referenceStatus = showReferencesSection
                ? getExperienceReferenceStatus(experienceReferences)
                : null;
              const referenceStatusIcon =
                showReferencesSection && referenceStatus
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
                          <ExperienceCardTitle role={getExperienceHeader(experience)} />
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
                      {isEditing && onExperienceDelete ? (
                        <DeleteExperienceAction
                          disabled={isUpdating}
                          onDelete={() => onExperienceDelete(experience.id)}
                        />
                      ) : null}
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
                        <FieldLabel>
                          Descrizione Mansioni ed Esperienza
                        </FieldLabel>
                        <FieldDescription className="text-foreground leading-7 whitespace-pre-wrap">
                          {experience.descrizione || "-"}
                        </FieldDescription>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel>
                          Descrizione Famiglia e Contesto
                        </FieldLabel>
                        <FieldDescription className="text-foreground leading-7 whitespace-pre-wrap">
                          {experience.descrizione_contesto_lavorativo || "-"}
                        </FieldDescription>
                      </div>
                    </div>

                    {!experience.stato_esperienza_attiva ? (
                      <div className="space-y-2">
                        <FieldLabel>
                          Motivazione fine rapporto
                        </FieldLabel>
                        <FieldDescription className="text-foreground leading-7 whitespace-pre-wrap">
                          {experience.motivazione_fine_rapporto || "-"}
                        </FieldDescription>
                      </div>
                    ) : null}

                    {showReferencesSection ? (
                      <div className="space-y-3">
                        <FieldLabel>
                          Referenze
                        </FieldLabel>
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
                                        <ExperienceCardTitle role={referenceFullName} />
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
                                            <FieldLabel>
                                              <StarIcon className="size-3.5" />
                                              Valutazione
                                            </FieldLabel>
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
                                            <FieldLabel>
                                              <CheckCircle2Icon className="size-3.5" />
                                              Disponibile a essere richiamata
                                            </FieldLabel>
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
                                          <FieldLabel>
                                            <MessageSquareTextIcon className="size-3.5" />
                                            Feedback della referenza
                                          </FieldLabel>
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
                    ) : null}
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
    </DetailSectionBlock>
  );
}
