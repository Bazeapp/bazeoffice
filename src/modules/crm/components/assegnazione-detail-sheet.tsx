import * as React from "react";
import {
  AlertTriangleIcon,
  BriefcaseBusinessIcon,
  CalendarIcon,
  CheckCircle2Icon,
  Clock3Icon,
  LinkIcon,
  MailIcon,
  PhoneIcon,
  XIcon,
} from "lucide-react";
import { useController } from "react-hook-form";

import type { AssegnazioneCardData } from "../types";
import type { OperatoreOption } from "@/hooks/use-operatori-options";
import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  DetailField,
  DetailFieldControl,
  DetailSectionBlock,
} from "@/components/shared-next/detail-section-card";
import { FieldDatePicker, FieldSelect } from "@/components/forms/field-components";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatBadgeLabel } from "@/lib/format-utils";
import { getLookupBadgeSoftClassName } from "@/lib/lookup-color-styles";
import { cn, getInitials } from "@/lib/utils";
import {
  buildSchedulingDraft,
  buildSchedulingSavePatch,
  formatDateForView,
  formatOreGiorniLabel,
  formatRoleBadgeLabel,
  getStatoResBadgeClassName,
  getTipoLavoroBadges,
  hasDisplayValue,
  type SchedulingFormValues,
} from "../lib/assegnazione-display-utils";
import { AssegnazioneOperatorSelectOption } from "./assegnazione-operator-select-option";

const STATO_RES_OPTIONS = [
  { value: "da_assegnare", label: "Da assegnare" },
  { value: "fare_ricerca", label: "Fare ricerca" },
];

export type AssegnazioneDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: AssegnazioneCardData | null;
  operatorOptions: OperatoreOption[];
  onPatchCard: (patch: Record<string, unknown>) => Promise<void>;
  onOpenRicerca: (processId: string) => void;
};

function SchedulingRecruiterSelect({
  operatorOptions,
}: {
  operatorOptions: OperatoreOption[];
}) {
  const { field } = useController<SchedulingFormValues, "recruiterId">({
    name: "recruiterId",
  });
  const selectedOperator =
    field.value && field.value !== "none"
      ? (operatorOptions.find((op) => op.id === field.value) ?? null)
      : null;

  return (
    <Select
      value={field.value || "none"}
      onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
    >
      <SelectTrigger>
        {selectedOperator ? (
          <AssegnazioneOperatorSelectOption operator={selectedOperator} />
        ) : (
          <SelectValue placeholder="Seleziona recruiter" />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Non assegnato</SelectItem>
        {operatorOptions.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            <AssegnazioneOperatorSelectOption operator={option} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AssegnazioneDetailSheet({
  open,
  onOpenChange,
  card,
  operatorOptions,
  onPatchCard,
  onOpenRicerca,
}: AssegnazioneDetailSheetProps) {
  const [isEditingScheduling, setIsEditingScheduling] = React.useState(false);
  const [isSavingScheduling, setIsSavingScheduling] = React.useState(false);
  const getValuesRef = React.useRef<() => SchedulingFormValues>(() =>
    buildSchedulingDraft(card),
  );

  const schedulingDefaults = React.useMemo(
    () => buildSchedulingDraft(card),
    [card],
  );

  const form = useAutoSaveForm<SchedulingFormValues>({
    defaults: schedulingDefaults,
    resetKey: card?.id ?? null,
    debounceMs: 700,
    errorMessage: () => "Errore salvataggio stato e assegnazione",
    onSave: async () => {
      if (!card) return;
      const values = getValuesRef.current();
      const patch = buildSchedulingSavePatch(values);
      const current = buildSchedulingDraft(card);
      const currentPatch = buildSchedulingSavePatch(current);
      if (JSON.stringify(patch) === JSON.stringify(currentPatch)) return;

      setIsSavingScheduling(true);
      try {
        await onPatchCard(patch);
      } finally {
        setIsSavingScheduling(false);
      }
    },
  });

  React.useEffect(() => {
    getValuesRef.current = () => form.getValues();
  });

  React.useEffect(() => {
    setIsEditingScheduling(false);
    setIsSavingScheduling(false);
  }, [card?.id]);

  const recruiterLabel = card?.recruiterId
    ? (operatorOptions.find((op) => op.id === card.recruiterId)?.label ??
      "Sconosciuto")
    : null;
  const hasInconsistentAssignment = Boolean(
    card &&
      ((card.statoRes === "da_assegnare" &&
        (Boolean(card.recruiterId) || Boolean(card.dataAssegnazione))) ||
        (card.statoRes === "fare_ricerca" && !card.dataAssegnazione)),
  );
  const hasEmail = hasDisplayValue(card?.email);
  const hasTelefono = hasDisplayValue(card?.telefono);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[min(96vw,760px)]! max-w-none! overflow-hidden p-0 sm:max-w-none!"
      >
        {card ? (
          <Form {...form}>
            <section className="flex h-full min-h-0 flex-col overflow-hidden bg-surface-muted">
              <header className="sticky top-0 z-20 shrink-0 border-b bg-surface">
                <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
                  <SheetTitle className="text-xl font-semibold">
                    {card.nomeFamiglia}
                  </SheetTitle>
                  <SheetClose asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Chiudi"
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </SheetClose>
                </div>
                <SheetDescription className="sr-only">
                  Dettaglio assegnazione di {card.nomeFamiglia}
                </SheetDescription>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pb-3">
                  <Badge
                    className={cn(
                      "shrink-0",
                      getStatoResBadgeClassName(card.statoRes),
                    )}
                  >
                    {card.statoResLabel}
                  </Badge>
                  {hasInconsistentAssignment ? (
                    <Badge className="border-orange-200 bg-orange-100 text-orange-700">
                      <AlertTriangleIcon data-icon="inline-start" />
                      Stato incoerente
                    </Badge>
                  ) : null}
                  <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                    <CalendarIcon className="size-3.5" />
                    Deadline{" "}
                    <span className="text-foreground font-medium">
                      {card.deadlineMobile}
                    </span>
                  </span>
                  {recruiterLabel ? (
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <Avatar size="xs" fallback={getInitials(recruiterLabel)} />
                      <span>{recruiterLabel}</span>
                    </span>
                  ) : null}
                  {getTipoLavoroBadges(card).map((tipoLavoro) => (
                    <Badge
                      key={tipoLavoro}
                      className={getLookupBadgeSoftClassName(
                        card.tipoLavoroColors?.[tipoLavoro] ??
                          card.tipoLavoroColor,
                      )}
                    >
                      <BriefcaseBusinessIcon data-icon="inline-start" />
                      {formatRoleBadgeLabel(tipoLavoro)}
                    </Badge>
                  ))}
                  {card.tipoRapportoBadge ? (
                    <Badge
                      className={getLookupBadgeSoftClassName(
                        card.tipoRapportoColor,
                      )}
                    >
                      <Clock3Icon data-icon="inline-start" />
                      {formatBadgeLabel(card.tipoRapportoBadge)}
                    </Badge>
                  ) : null}
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-3 px-4 py-4">
                  <DetailSectionBlock
                    icon={<LinkIcon className="size-4" />}
                    title="Ricerca collegata"
                    action={
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenRicerca(card.id)}
                      >
                        <LinkIcon className="size-4" />
                        Vai alla ricerca
                      </Button>
                    }
                  >
                    <div className="space-y-1">
                      <p className="text-base font-semibold">
                        {card.nomeFamiglia}
                      </p>
                      {hasEmail ? (
                        <a
                          href={`mailto:${card.email}`}
                          className="text-foreground inline-flex max-w-full items-center gap-1.5 text-sm hover:underline"
                        >
                          <MailIcon className="text-muted-foreground size-3.5 shrink-0" />
                          <span className="truncate">{card.email}</span>
                        </a>
                      ) : null}
                      {hasTelefono ? (
                        <a
                          href={`tel:${card.telefono}`}
                          className="text-muted-foreground inline-flex max-w-full items-center gap-1.5 text-sm hover:underline"
                        >
                          <PhoneIcon className="size-3.5 shrink-0" />
                          <span className="truncate">{card.telefono}</span>
                        </a>
                      ) : null}
                      <p className="text-muted-foreground text-xs">
                        ID ricerca: {card.id}
                      </p>
                    </div>
                  </DetailSectionBlock>

                  <DetailSectionBlock
                    icon={<CheckCircle2Icon className="size-4" />}
                    title="Stato e assegnazione"
                    showDefaultAction
                    onActionClick={() => {
                      setIsEditingScheduling((current) => !current);
                    }}
                    actionLabel={
                      isEditingScheduling
                        ? "Termina modifica stato e assegnazione"
                        : "Modifica stato e assegnazione"
                    }
                  >
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      {isEditingScheduling ? (
                        <DetailFieldControl label="Stato">
                          <FieldSelect
                            name="statoRes"
                            options={STATO_RES_OPTIONS}
                            placeholder="Seleziona stato RES"
                          />
                        </DetailFieldControl>
                      ) : (
                        <DetailFieldControl label="Stato">
                          <Badge
                            className={cn(
                              "w-fit",
                              getStatoResBadgeClassName(card.statoRes),
                            )}
                          >
                            {card.statoResLabel}
                          </Badge>
                        </DetailFieldControl>
                      )}

                      <DetailFieldControl label="Tipologia ricerca">
                        <Badge
                          className={cn(
                            "w-fit",
                            card.tipoRicerca === "sostituzione"
                              ? "border-amber-200 bg-amber-100 text-amber-700"
                              : "border-sky-200 bg-sky-100 text-sky-700",
                          )}
                        >
                          {card.tipoRicerca === "sostituzione"
                            ? "Sostituzione"
                            : "Nuova"}
                        </Badge>
                      </DetailFieldControl>

                      {isEditingScheduling ? (
                        <DetailFieldControl label="Recruiter">
                          <SchedulingRecruiterSelect
                            operatorOptions={operatorOptions}
                          />
                        </DetailFieldControl>
                      ) : (
                        <DetailFieldControl label="Recruiter">
                          {recruiterLabel ? (
                            <div className="flex items-center gap-2">
                              <Avatar
                                size="sm"
                                fallback={getInitials(recruiterLabel)}
                              />
                              <span className="text-sm">{recruiterLabel}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              Non assegnato
                            </span>
                          )}
                        </DetailFieldControl>
                      )}

                      {isEditingScheduling ? (
                        <DetailFieldControl label="Data assegnazione">
                          <FieldDatePicker name="dataAssegnazione" />
                        </DetailFieldControl>
                      ) : (
                        <DetailField
                          label="Data assegnazione"
                          value={formatDateForView(card.dataAssegnazione)}
                        />
                      )}

                      {isEditingScheduling ? (
                        <DetailFieldControl label="Deadline">
                          <FieldDatePicker name="deadlineMobile" />
                        </DetailFieldControl>
                      ) : (
                        <DetailField
                          label="Deadline"
                          value={card.deadlineMobile}
                        />
                      )}
                    </div>

                    {isEditingScheduling ? (
                      <p className="text-muted-foreground mt-3 text-xs">
                        {isSavingScheduling
                          ? "Salvataggio..."
                          : "Salvataggio automatico attivo"}
                      </p>
                    ) : null}
                  </DetailSectionBlock>

                  <DetailSectionBlock
                    icon={<Clock3Icon className="size-4" />}
                    title="Panoramica ricerca"
                  >
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <DetailField
                        label="Orari e giorni"
                        value={formatOreGiorniLabel(
                          card.oreSettimanali,
                          card.giorniSettimanali,
                        )}
                      />
                      <DetailField
                        label="Orario di lavoro"
                        value={card.orarioDiLavoro}
                      />
                      <DetailField
                        label="Disponibilità colloqui"
                        value={card.disponibilitaColloquiInPresenza}
                      />
                      <DetailField label="Luogo" value={card.zona} />
                      <DetailFieldControl label="Tipo profilo">
                        {getTipoLavoroBadges(card).length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {getTipoLavoroBadges(card).map((tipoLavoro) => (
                              <Badge
                                key={tipoLavoro}
                                className={cn(
                                  "w-fit",
                                  getLookupBadgeSoftClassName(
                                    card.tipoLavoroColors?.[tipoLavoro] ??
                                      card.tipoLavoroColor,
                                  ),
                                )}
                              >
                                {formatRoleBadgeLabel(tipoLavoro)}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            -
                          </span>
                        )}
                      </DetailFieldControl>
                      <DetailFieldControl label="Tipo lavoro">
                        {card.tipoRapportoBadge ? (
                          <Badge
                            className={cn(
                              "w-fit",
                              getLookupBadgeSoftClassName(
                                card.tipoRapportoColor,
                              ),
                            )}
                          >
                            {formatBadgeLabel(card.tipoRapportoBadge)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            -
                          </span>
                        )}
                      </DetailFieldControl>
                    </div>
                  </DetailSectionBlock>
                </div>
              </div>
            </section>
          </Form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
