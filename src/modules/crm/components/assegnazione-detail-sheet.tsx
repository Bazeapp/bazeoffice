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
import { toast } from "sonner";

import type { AssegnazioneCardData } from "../types";
import type { OperatoreOption } from "@/hooks/use-operatori-options";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DetailField,
  DetailFieldControl,
  DetailSectionBlock,
} from "@/components/shared-next/detail-section-card";
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
  formatDateForView,
  formatOreGiorniLabel,
  formatRoleBadgeLabel,
  getStatoResBadgeClassName,
  getTipoLavoroBadges,
  hasDisplayValue,
  toIsoDateInput,
} from "../lib/assegnazione-display-utils";
import { AssegnazioneOperatorSelectOption } from "./assegnazione-operator-select-option";

export type AssegnazioneDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: AssegnazioneCardData | null;
  operatorOptions: OperatoreOption[];
  onPatchCard: (patch: Record<string, unknown>) => Promise<void>;
  onOpenRicerca: (processId: string) => void;
};

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
  const [schedulingDraft, setSchedulingDraft] = React.useState(() =>
    buildSchedulingDraft(card),
  );
  const initializedCardIdRef = React.useRef<string | null>(card?.id ?? null);

  React.useEffect(() => {
    const currentCardId = card?.id ?? null;
    if (initializedCardIdRef.current === currentCardId) {
      if (!isEditingScheduling) {
        setSchedulingDraft(buildSchedulingDraft(card));
      } else {
        setSchedulingDraft((current) => ({
          ...current,
          recruiterId: card?.recruiterId ?? "",
        }));
      }
      return;
    }
    initializedCardIdRef.current = currentCardId;

    setIsEditingScheduling(false);
    setIsSavingScheduling(false);
    setSchedulingDraft(buildSchedulingDraft(card));
  }, [card, isEditingScheduling]);

  const recruiterLabel = card?.recruiterId
    ? (operatorOptions.find((op) => op.id === card.recruiterId)?.label ??
      "Sconosciuto")
    : null;
  const selectedSchedulingOperator =
    schedulingDraft.recruiterId && schedulingDraft.recruiterId !== "none"
      ? operatorOptions.find((op) => op.id === schedulingDraft.recruiterId) ?? null
      : null;
  const hasInconsistentAssignment =
    Boolean(
      card &&
        ((card.statoRes === "da_assegnare" &&
          (Boolean(card.recruiterId) || Boolean(card.dataAssegnazione))) ||
          (card.statoRes === "fare_ricerca" && !card.dataAssegnazione)),
    );
  const hasEmail = hasDisplayValue(card?.email);
  const hasTelefono = hasDisplayValue(card?.telefono);

  const commitSchedulingDraft = React.useCallback(async () => {
    if (!card) return;

    let nextStatoRes =
      schedulingDraft.statoRes === "da_assegnare" &&
      schedulingDraft.recruiterId &&
      schedulingDraft.dataAssegnazione
        ? "fare_ricerca"
        : schedulingDraft.statoRes;
    if (nextStatoRes === "fare_ricerca" && !schedulingDraft.dataAssegnazione) {
      nextStatoRes = "da_assegnare";
    }

    const currentDraft = {
      statoRes: card.statoRes,
      recruiterId: card.recruiterId ?? "",
      deadlineMobile: card.deadlineMobile
        ? toIsoDateInput(card.deadlineMobile)
        : "",
      dataAssegnazione: card.dataAssegnazione ?? "",
    };

    const hasChanges =
      nextStatoRes !== currentDraft.statoRes ||
      schedulingDraft.recruiterId !== currentDraft.recruiterId ||
      schedulingDraft.deadlineMobile !== currentDraft.deadlineMobile ||
      schedulingDraft.dataAssegnazione !== currentDraft.dataAssegnazione;

    if (!hasChanges) return;

    setIsSavingScheduling(true);
    try {
      await onPatchCard({
        stato_res:
          nextStatoRes === "fare_ricerca"
            ? "fare ricerca"
            : "da assegnare",
        recruiter_ricerca_e_selezione_id: schedulingDraft.recruiterId || null,
        data_assegnazione: schedulingDraft.dataAssegnazione || null,
        deadline_mobile: schedulingDraft.deadlineMobile || null,
        data_limite_invio_selezione: schedulingDraft.deadlineMobile || null,
      });
    } catch {
      toast.error("Errore salvataggio stato e assegnazione");
    } finally {
      setIsSavingScheduling(false);
    }
  }, [card, onPatchCard, schedulingDraft]);

  React.useEffect(() => {
    if (!isEditingScheduling) return;

    const timeoutId = window.setTimeout(() => {
      void commitSchedulingDraft();
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [commitSchedulingDraft, isEditingScheduling]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[min(96vw,760px)]! max-w-none! overflow-hidden p-0 sm:max-w-none!"
      >
        {card ? (
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
                      card.tipoLavoroColors?.[tipoLavoro] ?? card.tipoLavoroColor,
                    )}
                  >
                    <BriefcaseBusinessIcon data-icon="inline-start" />
                    {formatRoleBadgeLabel(tipoLavoro)}
                  </Badge>
                ))}
                {card.tipoRapportoBadge ? (
                  <Badge className={getLookupBadgeSoftClassName(card.tipoRapportoColor)}>
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
                    if (isEditingScheduling) {
                      setIsEditingScheduling(false);
                      void commitSchedulingDraft();
                      return;
                    }
                    setSchedulingDraft(buildSchedulingDraft(card));
                    setIsEditingScheduling(true);
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
                        <Select
                          value={schedulingDraft.statoRes}
                          onValueChange={(value) =>
                            setSchedulingDraft((current) => ({
                              ...current,
                              statoRes: value as
                                | "da_assegnare"
                                | "fare_ricerca",
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona stato RES" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="da_assegnare">
                              Da assegnare
                            </SelectItem>
                            <SelectItem value="fare_ricerca">
                              Fare ricerca
                            </SelectItem>
                          </SelectContent>
                        </Select>
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
                        <Select
                          value={schedulingDraft.recruiterId || "none"}
                          onValueChange={(value) =>
                            setSchedulingDraft((current) => ({
                              ...current,
                              recruiterId: value === "none" ? "" : value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            {selectedSchedulingOperator ? (
                              <AssegnazioneOperatorSelectOption operator={selectedSchedulingOperator} />
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
                        <Input
                          type="date"
                          value={schedulingDraft.dataAssegnazione}
                          onChange={(event) =>
                            setSchedulingDraft((current) => ({
                              ...current,
                              dataAssegnazione: event.target.value,
                            }))
                          }
                        />
                      </DetailFieldControl>
                    ) : (
                      <DetailField
                        label="Data assegnazione"
                        value={formatDateForView(card.dataAssegnazione)}
                      />
                    )}

                    {isEditingScheduling ? (
                      <DetailFieldControl label="Deadline">
                        <Input
                          type="date"
                          value={schedulingDraft.deadlineMobile}
                          onChange={(event) =>
                            setSchedulingDraft((current) => ({
                              ...current,
                              deadlineMobile: event.target.value,
                            }))
                          }
                        />
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
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </DetailFieldControl>
                    <DetailFieldControl label="Tipo lavoro">
                      {card.tipoRapportoBadge ? (
                        <Badge
                          className={cn(
                            "w-fit",
                            getLookupBadgeSoftClassName(card.tipoRapportoColor),
                          )}
                        >
                          {formatBadgeLabel(card.tipoRapportoBadge)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </DetailFieldControl>
                  </div>
                </DetailSectionBlock>
              </div>
            </div>
          </section>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
