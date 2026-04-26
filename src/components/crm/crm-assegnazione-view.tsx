import * as React from "react";
import {
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3Icon,
  FilterIcon,
  FilterXIcon,
  LinkIcon,
  MapPinIcon,
  PencilIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import type { AssegnazioneCardData } from "@/hooks/use-crm-assegnazione";
import { useCrmAssegnazione } from "@/hooks/use-crm-assegnazione";
import { useOperatoriOptions } from "@/hooks/use-operatori-options";
import { Avatar } from "@/components/ui-next/avatar";
import { Badge } from "@/components/ui-next/badge";
import { Button } from "@/components/ui-next/button";
import { Card, CardContent } from "@/components/ui-next/card";
import { Input } from "@/components/ui-next/input";
import { SectionHeader } from "@/components/shared-next/section-header";
import { SideCardsPanel } from "@/components/shared-next/side-cards-panel";
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui-next/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui-next/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui-next/sheet";
import { cn } from "@/lib/utils";

type AssigneeValue = string | "none";
const DRAG_POINTER_THRESHOLD = 6;

function formatBadgeLabel(value: string) {
  return value
    .replaceAll("-", " ")
    .replaceAll("/", " / ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatRoleBadgeLabel(value: string) {
  const token = value.trim().toLowerCase().replaceAll("_", " ");
  if (token.includes("badante") || token.includes("assistenza domestica"))
    return "Badante";
  if (token.includes("babysitter") || token.includes("tata")) return "Tata";
  if (token.includes("colf") || token.includes("pulizie")) return "Colf";
  return formatBadgeLabel(value);
}

function getBadgeClassName(color: string | null | undefined) {
  switch ((color ?? "").toLowerCase()) {
    case "red":
      return "border-red-200 bg-red-100 text-red-700";
    case "rose":
      return "border-rose-200 bg-rose-100 text-rose-700";
    case "orange":
      return "border-orange-200 bg-orange-100 text-orange-700";
    case "amber":
      return "border-amber-200 bg-amber-100 text-amber-700";
    case "yellow":
      return "border-yellow-200 bg-yellow-100 text-yellow-700";
    case "lime":
      return "border-lime-200 bg-lime-100 text-lime-700";
    case "green":
      return "border-green-200 bg-green-100 text-green-700";
    case "emerald":
      return "border-emerald-200 bg-emerald-100 text-emerald-700";
    case "teal":
      return "border-teal-200 bg-teal-100 text-teal-700";
    case "cyan":
      return "border-cyan-200 bg-cyan-100 text-cyan-700";
    case "sky":
      return "border-sky-200 bg-sky-100 text-sky-700";
    case "blue":
      return "border-blue-200 bg-blue-100 text-blue-700";
    case "indigo":
      return "border-indigo-200 bg-indigo-100 text-indigo-700";
    case "violet":
      return "border-violet-200 bg-violet-100 text-violet-700";
    case "purple":
      return "border-purple-200 bg-purple-100 text-purple-700";
    case "fuchsia":
      return "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700";
    case "pink":
      return "border-pink-200 bg-pink-100 text-pink-700";
    case "slate":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "gray":
      return "border-gray-200 bg-gray-100 text-gray-700";
    case "zinc":
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
    default:
      return "border-border bg-muted text-foreground";
  }
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function startOfDay(input: Date) {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(input: Date, days: number) {
  const date = new Date(input);
  date.setDate(date.getDate() + days);
  return date;
}

function buildVisibleDays(windowStart: Date) {
  return Array.from({ length: 3 }).map((_, index) => {
    const date = addDays(windowStart, index);
    return {
      key: toDateKey(date),
      date,
      label: formatDayLabel(date),
    };
  });
}

function hashString(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getAssigneeAccentClass(assigneeId: AssigneeValue) {
  if (assigneeId === "none") return "border-l-zinc-400";
  const variants = [
    "border-l-emerald-500",
    "border-l-sky-500",
    "border-l-violet-500",
    "border-l-amber-500",
    "border-l-rose-500",
    "border-l-cyan-500",
  ];
  return (
    variants[hashString(assigneeId) % variants.length] ?? "border-l-zinc-400"
  );
}

function getDeadlineTime(value: string | null | undefined) {
  const isoDate = value ? toIsoDateInput(value) : "";
  if (!isoDate) return Number.POSITIVE_INFINITY;
  const parsed = new Date(`${isoDate}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? Number.POSITIVE_INFINITY
    : parsed.getTime();
}

function getDeadlineAccentClass(deadline: string | null | undefined) {
  const deadlineTime = getDeadlineTime(deadline);
  if (!Number.isFinite(deadlineTime)) return "border-l-zinc-300";

  const today = startOfDay(new Date()).getTime();
  const daysUntilDeadline = Math.floor(
    (deadlineTime - today) / (24 * 60 * 60 * 1000),
  );

  if (daysUntilDeadline <= 3) return "border-l-red-500";
  if (daysUntilDeadline <= 7) return "border-l-emerald-500";
  return "border-l-zinc-300";
}

function compareByDeadlineAsc(
  first: AssegnazioneCardData,
  second: AssegnazioneCardData,
) {
  const deadlineDelta =
    getDeadlineTime(first.deadlineMobile) - getDeadlineTime(second.deadlineMobile);
  if (deadlineDelta !== 0) return deadlineDelta;
  return first.nomeFamiglia.localeCompare(second.nomeFamiglia, "it");
}

function getAssigneeAvatarBorderClass(assigneeId: AssigneeValue) {
  if (assigneeId === "none") return "ring-1 ring-zinc-300";
  const variants = [
    "ring-2 ring-emerald-500",
    "ring-2 ring-sky-500",
    "ring-2 ring-violet-500",
    "ring-2 ring-amber-500",
    "ring-2 ring-rose-500",
    "ring-2 ring-cyan-500",
  ];
  return (
    variants[hashString(assigneeId) % variants.length] ?? "ring-1 ring-zinc-300"
  );
}

function toIsoDateInput(displayDate: string) {
  const normalized = displayDate.trim();
  const parts = normalized.split("/");
  if (parts.length !== 3) return "";
  const day = parts[0]?.padStart(2, "0");
  const month = parts[1]?.padStart(2, "0");
  const year = parts[2];
  if (!day || !month || !year) return "";
  return `${year}-${month}-${day}`;
}

function formatDateForView(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "-";

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(parsed);
  }

  return raw;
}

function formatOreGiorniLabel(
  oreSettimanali: string,
  giorniSettimanali: string,
) {
  const oreToken = oreSettimanali.trim();
  const giorniToken = giorniSettimanali.trim();
  if (
    (oreToken === "" || oreToken === "-") &&
    (giorniToken === "" || giorniToken === "-")
  ) {
    return "-";
  }
  const oreLabel = oreToken && oreToken !== "-" ? `${oreToken}h` : "-";
  const giorniLabel =
    giorniToken && giorniToken !== "-" ? `${giorniToken}g` : "-";
  return `${oreLabel} | ${giorniLabel}`;
}

function getStatoResBadgeClassName(statoRes: "da_assegnare" | "fare_ricerca") {
  return statoRes === "fare_ricerca"
    ? "border-emerald-200 bg-emerald-100 text-emerald-700"
    : "border-amber-200 bg-amber-100 text-amber-700";
}

function AssegnazioneSearchCard({
  data,
  assigneeId,
  assigneeLabel,
  assigneeAvatar,
  assigneeOptions,
  accentClassName,
  onAssigneeChange,
}: {
  data: AssegnazioneCardData;
  assigneeId: AssigneeValue;
  assigneeLabel: string;
  assigneeAvatar: string;
  assigneeOptions: Array<{ id: string; label: string }>;
  accentClassName: string;
  onAssigneeChange: (assigneeId: AssigneeValue) => void;
}) {
  return (
    <Card
      className={cn(
        "cursor-pointer border-l-4 bg-white transition-shadow hover:shadow-md",
        accentClassName,
      )}
    >
      <CardContent className="space-y-3">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <h3 className="truncate text-base font-semibold leading-snug">
            {data.nomeFamiglia}
          </h3>
          <Badge
            className={cn(
              "shrink-0",
              data.tipoRicerca === "sostituzione"
                ? "border-amber-200 bg-amber-100 text-amber-700"
                : "border-sky-200 bg-sky-100 text-sky-700",
            )}
          >
            {data.tipoRicerca === "sostituzione" ? "Sostituzione" : "Nuova"}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {data.tipoLavoroBadge ? (
            <Badge className={getBadgeClassName(data.tipoLavoroColor)}>
              <BriefcaseBusinessIcon data-icon="inline-start" />
              {formatRoleBadgeLabel(data.tipoLavoroBadge)}
            </Badge>
          ) : null}
          {data.tipoRapportoBadge ? (
            <Badge className={getBadgeClassName(data.tipoRapportoColor)}>
              <Clock3Icon data-icon="inline-start" />
              {formatBadgeLabel(data.tipoRapportoBadge)}
            </Badge>
          ) : null}
        </div>

        <div className="flex items-end justify-between gap-3 border-t pt-3">
          <div className="text-muted-foreground min-w-0 space-y-1.5 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <CalendarIcon className="size-4 shrink-0" />
              <span className="truncate">{data.deadlineMobile}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <Clock3Icon className="size-4 shrink-0" />
              <span className="truncate">
                {formatOreGiorniLabel(
                  data.oreSettimanali,
                  data.giorniSettimanali,
                )}
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <MapPinIcon className="size-4 shrink-0" />
              <span className="truncate">{data.zona}</span>
            </div>
          </div>
          <Select
            value={assigneeId}
            onValueChange={(value) =>
              onAssigneeChange(value as AssigneeValue)
            }
          >
            <SelectTrigger
              className="h-8 w-8 min-w-0 max-w-8 shrink-0 rounded-full border-0 p-0 shadow-none [&>svg]:hidden"
              aria-label="Cambia assegnatario"
              title={assigneeLabel}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <Avatar
                size="md"
                fallback={assigneeAvatar}
                className={getAssigneeAvatarBorderClass(assigneeId)}
              />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="none">Nessuno</SelectItem>
              {assigneeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

function AssegnazioneDetailSheet({
  open,
  onOpenChange,
  card,
  operatorOptions,
  onPatchCard,
  onOpenRicerca,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: AssegnazioneCardData | null;
  operatorOptions: Array<{ id: string; label: string }>;
  onPatchCard: (patch: Record<string, unknown>) => Promise<void>;
  onOpenRicerca: (processId: string) => void;
}) {
  const [isEditingScheduling, setIsEditingScheduling] = React.useState(false);
  const [isSavingScheduling, setIsSavingScheduling] = React.useState(false);
  const [schedulingDraft, setSchedulingDraft] = React.useState({
    statoRes: card?.statoRes ?? "da_assegnare",
    recruiterId: card?.recruiterId ?? "",
    deadlineMobile: card?.deadlineMobile
      ? toIsoDateInput(card.deadlineMobile)
      : "",
    dataAssegnazione: card?.dataAssegnazione ?? "",
  });
  const initializedCardIdRef = React.useRef<string | null>(card?.id ?? null);

  React.useEffect(() => {
    const currentCardId = card?.id ?? null;
    if (initializedCardIdRef.current === currentCardId) return;
    initializedCardIdRef.current = currentCardId;

    setIsEditingScheduling(false);
    setIsSavingScheduling(false);
    setSchedulingDraft({
      statoRes: card?.statoRes ?? "da_assegnare",
      recruiterId: card?.recruiterId ?? "",
      deadlineMobile: card?.deadlineMobile
        ? toIsoDateInput(card.deadlineMobile)
        : "",
      dataAssegnazione: card?.dataAssegnazione ?? "",
    });
  }, [card]);

  React.useEffect(() => {
    if (!isEditingScheduling || !card) return;

    const currentDraft = {
      statoRes: card.statoRes,
      recruiterId: card.recruiterId ?? "",
      deadlineMobile: card.deadlineMobile
        ? toIsoDateInput(card.deadlineMobile)
        : "",
      dataAssegnazione: card.dataAssegnazione ?? "",
    };

    const hasChanges =
      schedulingDraft.statoRes !== currentDraft.statoRes ||
      schedulingDraft.recruiterId !== currentDraft.recruiterId ||
      schedulingDraft.deadlineMobile !== currentDraft.deadlineMobile ||
      schedulingDraft.dataAssegnazione !== currentDraft.dataAssegnazione;

    if (!hasChanges) return;

    const timeoutId = window.setTimeout(() => {
      setIsSavingScheduling(true);
      void onPatchCard({
        stato_res:
          schedulingDraft.statoRes === "fare_ricerca"
            ? "fare ricerca"
            : "da assegnare",
        recruiter_ricerca_e_selezione_id: schedulingDraft.recruiterId || null,
        data_assegnazione: schedulingDraft.dataAssegnazione || null,
        deadline_mobile: schedulingDraft.deadlineMobile || null,
        data_limite_invio_selezione: schedulingDraft.deadlineMobile || null,
      })
        .catch(() => {
          toast.error("Errore salvataggio stato e assegnazione");
        })
        .finally(() => {
          setIsSavingScheduling(false);
        });
    }, 700);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [card, isEditingScheduling, onPatchCard, schedulingDraft]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[min(96vw,760px)]! max-w-none! overflow-y-auto sm:max-w-none!"
      >
        <SheetHeader>
          <SheetTitle className="text-xl font-semibold">
            {card?.nomeFamiglia ?? "Dettaglio ricerca"}
          </SheetTitle>
          <SheetDescription>
            Dettaglio ricerca con modifica inline dei campi principali.
          </SheetDescription>
        </SheetHeader>

        {card ? (
          <div className="space-y-4 px-4 pb-6 text-sm">
            <DetailSectionBlock
              title="Ricerca collegata"
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenRicerca(card.id)}
                >
                  <LinkIcon className="size-4" />
                  Vai alla ricerca
                </Button>
              }
              contentClassName="grid grid-cols-1 gap-3"
            >
              <div>
                <p className="text-lg font-semibold">{card.nomeFamiglia}</p>
                <p className="text-muted-foreground text-xs">
                  ID ricerca: {card.id}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="space-y-1">
                  <p className="ui-type-label">Stato</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-5 w-fit px-2 text-[11px] font-medium",
                      getStatoResBadgeClassName(card.statoRes),
                    )}
                  >
                    {card.statoResLabel}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="ui-type-label">Deadline</p>
                  <p className="font-medium">{card.deadlineMobile}</p>
                </div>
                <div className="space-y-1">
                  <p className="ui-type-label">Tipo</p>
                  <p className="font-medium">
                    {card.tipoRicerca === "sostituzione"
                      ? "Sostituzione"
                      : "Nuova"}
                  </p>
                </div>
              </div>
            </DetailSectionBlock>

            <DetailSectionBlock
              title="Stato e assegnazione"
              action={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={
                    isEditingScheduling
                      ? "Termina modifica stato e assegnazione"
                      : "Modifica stato e assegnazione"
                  }
                  title={
                    isEditingScheduling
                      ? "Termina modifica stato e assegnazione"
                      : "Modifica stato e assegnazione"
                  }
                  onClick={() => setIsEditingScheduling((current) => !current)}
                >
                  <PencilIcon />
                </Button>
              }
              contentClassName="grid grid-cols-1 gap-3"
            >
              <div className="space-y-1">
                <p className="ui-type-label">Stato</p>
                {isEditingScheduling ? (
                  <Select
                    value={schedulingDraft.statoRes}
                    onValueChange={(value) =>
                      setSchedulingDraft((current) => ({
                        ...current,
                        statoRes: value as "da_assegnare" | "fare_ricerca",
                      }))
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Seleziona stato RES" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="da_assegnare">Da assegnare</SelectItem>
                      <SelectItem value="fare_ricerca">Fare ricerca</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-5 w-fit px-2 text-[11px] font-medium",
                      getStatoResBadgeClassName(card.statoRes),
                    )}
                  >
                    {card.statoResLabel}
                  </Badge>
                )}
              </div>

              <div className="space-y-1">
                <p className="ui-type-label">Tipologia ricerca</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "h-5 w-fit px-2 text-[11px] font-medium",
                    card.tipoRicerca === "sostituzione"
                      ? "border-amber-200 bg-amber-100 text-amber-700"
                      : "border-sky-200 bg-sky-100 text-sky-700",
                  )}
                >
                  {card.tipoRicerca === "sostituzione"
                    ? "Sostituzione"
                    : "Nuova"}
                </Badge>
              </div>

              <div className="space-y-1">
                <p className="ui-type-label">Recruiter</p>
                {isEditingScheduling ? (
                  <Select
                    value={schedulingDraft.recruiterId || "none"}
                    onValueChange={(value) =>
                      setSchedulingDraft((current) => ({
                        ...current,
                        recruiterId: value === "none" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Seleziona recruiter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Non assegnato</SelectItem>
                      {operatorOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium">
                    {operatorOptions.find(
                      (item) => item.id === card.recruiterId,
                    )?.label ?? "Non assegnato"}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <p className="ui-type-label">
                  Data assegnazione
                </p>
                {isEditingScheduling ? (
                  <Input
                    type="date"
                    value={schedulingDraft.dataAssegnazione}
                    onChange={(event) =>
                      setSchedulingDraft((current) => ({
                        ...current,
                        dataAssegnazione: event.target.value,
                      }))
                    }
                    className="h-8"
                  />
                ) : (
                  <p className="font-medium">
                    {formatDateForView(card.dataAssegnazione)}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <p className="ui-type-label">Deadline</p>
                {isEditingScheduling ? (
                  <Input
                    type="date"
                    value={schedulingDraft.deadlineMobile}
                    onChange={(event) =>
                      setSchedulingDraft((current) => ({
                        ...current,
                        deadlineMobile: event.target.value,
                      }))
                    }
                    className="h-8"
                  />
                ) : (
                  <p className="font-medium">{card.deadlineMobile}</p>
                )}
              </div>

              {isEditingScheduling ? (
                <div>
                  <p className="ui-type-label">
                    {isSavingScheduling
                      ? "Salvataggio..."
                      : "Salvataggio automatico attivo"}
                  </p>
                </div>
              ) : null}
            </DetailSectionBlock>

            <DetailSectionBlock
              title="Panoramica ricerca"
              contentClassName="space-y-2"
            >
              <div className="grid grid-cols-1 gap-2.5">
                <div className="space-y-1">
                  <p className="ui-type-label">
                    Ore settimanali
                  </p>
                  <p className="font-medium">{card.oreSettimanali}</p>
                </div>
                <div className="space-y-1">
                  <p className="ui-type-label">
                    Giorni settimanali
                  </p>
                  <p className="font-medium">{card.giorniSettimanali}</p>
                </div>
                <div className="space-y-1">
                  <p className="ui-type-label">
                    Orari e giorni
                  </p>
                  <p className="font-medium">
                    {formatOreGiorniLabel(
                      card.oreSettimanali,
                      card.giorniSettimanali,
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="ui-type-label">
                    Orario di lavoro
                  </p>
                  <p className="font-medium">{card.orarioDiLavoro}</p>
                </div>
                <div className="space-y-1">
                  <p className="ui-type-label">Luogo</p>
                  <p className="font-medium">{card.zona}</p>
                </div>
                <div className="space-y-1">
                  <p className="ui-type-label">Tipo profilo</p>
                  {card.tipoLavoroBadge ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 w-fit px-2 text-[11px] font-medium",
                        getBadgeClassName(card.tipoLavoroColor),
                      )}
                    >
                      {formatRoleBadgeLabel(card.tipoLavoroBadge)}
                    </Badge>
                  ) : (
                    <p className="font-medium">-</p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="ui-type-label">Tipo lavoro</p>
                  {card.tipoRapportoBadge ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 w-fit px-2 text-[11px] font-medium",
                        getBadgeClassName(card.tipoRapportoColor),
                      )}
                    >
                      {formatBadgeLabel(card.tipoRapportoBadge)}
                    </Badge>
                  ) : (
                    <p className="font-medium">-</p>
                  )}
                </div>
              </div>
            </DetailSectionBlock>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

type CrmAssegnazioneViewProps = {
  onOpenRicercaDetail?: (processId: string) => void;
};

export function CrmAssegnazioneView({
  onOpenRicercaDetail,
}: CrmAssegnazioneViewProps = {}) {
  const { loading, error, cards, assignCardToDate, patchCard } =
    useCrmAssegnazione();
  const { options: operatorOptions } = useOperatoriOptions({
    role: "recruiter",
    activeOnly: true,
  });
  const [visibleWindowStart, setVisibleWindowStart] = React.useState(() =>
    addDays(startOfDay(new Date()), -1),
  );
  const [draggingProcessId, setDraggingProcessId] = React.useState<
    string | null
  >(null);
  const [dropTarget, setDropTarget] = React.useState<string | null>(null);
  const [selectedCard, setSelectedCard] =
    React.useState<AssegnazioneCardData | null>(null);
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [assigneesByProcessId, setAssigneesByProcessId] = React.useState<
    Record<string, AssigneeValue>
  >({});
  const [assigneeFilter, setAssigneeFilter] = React.useState<
    AssigneeValue | "all"
  >("all");
  const [tipoRicercaFilter, setTipoRicercaFilter] = React.useState<
    "all" | "nuova" | "sostituzione"
  >("all");
  const cardPointerStateRef = React.useRef<
    Map<string, { x: number; y: number; exceededThreshold: boolean }>
  >(new Map());

  React.useEffect(() => {
    setAssigneesByProcessId((current) => {
      const next = { ...current };
      for (const card of cards) {
        if (next[card.id]) continue;
        next[card.id] = card.recruiterId ?? "none";
      }
      return next;
    });
  }, [cards]);

  const visibleDays = React.useMemo(
    () => buildVisibleDays(visibleWindowStart),
    [visibleWindowStart],
  );

  const getCardAssigneeId = React.useCallback(
    (card: AssegnazioneCardData): AssigneeValue =>
      assigneesByProcessId[card.id] ?? card.recruiterId ?? "none",
    [assigneesByProcessId],
  );

  const filteredCards = React.useMemo(() => {
    return cards.filter((card) => {
      const assigneeId = getCardAssigneeId(card);
      if (assigneeFilter !== "all" && assigneeId !== assigneeFilter)
        return false;
      if (
        tipoRicercaFilter !== "all" &&
        card.tipoRicerca !== tipoRicercaFilter
      ) {
        return false;
      }
      return true;
    });
  }, [assigneeFilter, cards, getCardAssigneeId, tipoRicercaFilter]);

  const assigneeById = React.useMemo(() => {
    const map = new Map<string, { label: string; avatar: string }>();
    for (const option of operatorOptions) {
      map.set(option.id, { label: option.label, avatar: option.avatar });
    }
    return map;
  }, [operatorOptions]);

  const compareByAssigneeName = React.useCallback(
    (first: AssegnazioneCardData, second: AssegnazioneCardData) => {
      const firstAssigneeId = getCardAssigneeId(first);
      const secondAssigneeId = getCardAssigneeId(second);
      const firstLabel = assigneeById.get(firstAssigneeId)?.label ?? "";
      const secondLabel = assigneeById.get(secondAssigneeId)?.label ?? "";
      const assigneeDelta = firstLabel.localeCompare(secondLabel, "it");
      if (assigneeDelta !== 0) return assigneeDelta;
      return first.nomeFamiglia.localeCompare(second.nomeFamiglia, "it");
    },
    [assigneeById, getCardAssigneeId],
  );

  const cardsByDate = React.useMemo(() => {
    const map = new Map<string, AssegnazioneCardData[]>();
    for (const day of visibleDays) {
      map.set(day.key, []);
    }
    for (const card of filteredCards) {
      if (!card.dataAssegnazione) continue;
      if (!map.has(card.dataAssegnazione)) continue;
      map.get(card.dataAssegnazione)?.push(card);
    }
    for (const dayCards of map.values()) {
      dayCards.sort(compareByAssigneeName);
    }
    return map;
  }, [compareByAssigneeName, visibleDays, filteredCards]);

  const unassignedCards = React.useMemo(
    () =>
      filteredCards
        .filter(
          (card) => card.statoRes === "da_assegnare" && !card.dataAssegnazione,
        )
        .sort(compareByDeadlineAsc),
    [filteredCards],
  );
  const unassignedGroupedByTipoRicerca = React.useMemo(() => {
    const nuove = unassignedCards.filter(
      (card) => card.tipoRicerca === "nuova",
    );
    const sostituzioni = unassignedCards.filter(
      (card) => card.tipoRicerca === "sostituzione",
    );
    return { nuove, sostituzioni };
  }, [unassignedCards]);

  const applyAssigneeChange = React.useCallback(
    async (card: AssegnazioneCardData, nextAssigneeId: AssigneeValue) => {
      setAssigneesByProcessId((current) => ({
        ...current,
        [card.id]: nextAssigneeId,
      }));

      try {
        await patchCard(card.id, {
          recruiter_ricerca_e_selezione_id:
            nextAssigneeId === "none" ? null : nextAssigneeId,
        });
      } catch {
        setAssigneesByProcessId((current) => ({
          ...current,
          [card.id]: card.recruiterId ?? "none",
        }));
      }
    },
    [patchCard],
  );

  const handleDrop = React.useCallback(
    (targetDate: string | null, droppedProcessId: string | null) => {
      const processId = droppedProcessId || draggingProcessId;
      setDropTarget(null);
      setDraggingProcessId(null);
      cardPointerStateRef.current.clear();
      if (!processId) return;

      if (targetDate) {
        const matchingCard = cards.find((card) => card.id === processId);
        const assignee = matchingCard
          ? getCardAssigneeId(matchingCard)
          : "none";
        if (!assignee || assignee === "none") {
          toast.error(
            "Per assegnare una ricerca a una data devi prima selezionare il recruiter.",
          );
          return;
        }
      }

      void assignCardToDate(processId, targetDate);
    },
    [assignCardToDate, cards, draggingProcessId, getCardAssigneeId],
  );

  const handleOpenCardDetails = React.useCallback(
    (card: AssegnazioneCardData) => {
      setSelectedCard(card);
      setIsSheetOpen(true);
    },
    [],
  );

  const onCardDragStart = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>, processId: string) => {
      event.dataTransfer.setData("text/plain", processId);
      event.dataTransfer.effectAllowed = "move";
      cardPointerStateRef.current.delete(processId);
      setDraggingProcessId(processId);
    },
    [],
  );

  const onCardDragEnd = React.useCallback(() => {
    setDraggingProcessId(null);
    setDropTarget(null);
    cardPointerStateRef.current.clear();
  }, []);

  const onCardPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>, processId: string) => {
      if (event.button !== 0) return;
      cardPointerStateRef.current.set(processId, {
        x: event.clientX,
        y: event.clientY,
        exceededThreshold: false,
      });
    },
    [],
  );

  const onCardPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>, processId: string) => {
      const pointerState = cardPointerStateRef.current.get(processId);
      if (!pointerState || pointerState.exceededThreshold) return;
      const deltaX = Math.abs(event.clientX - pointerState.x);
      const deltaY = Math.abs(event.clientY - pointerState.y);
      if (deltaX > DRAG_POINTER_THRESHOLD || deltaY > DRAG_POINTER_THRESHOLD) {
        pointerState.exceededThreshold = true;
      }
    },
    [],
  );

  const onCardPointerUp = React.useCallback((processId: string) => {
    cardPointerStateRef.current.delete(processId);
  }, []);

  const onCardPointerCancel = React.useCallback((processId: string) => {
    cardPointerStateRef.current.delete(processId);
  }, []);

  const selectedCardFromState = React.useMemo(
    () => cards.find((card) => card.id === selectedCard?.id) ?? selectedCard,
    [cards, selectedCard],
  );

  const handleOpenRicerca = React.useCallback(
    (processId: string) => {
      if (onOpenRicercaDetail) {
        onOpenRicercaDetail(processId);
        return;
      }

      window.location.assign(`/ricerca/${encodeURIComponent(processId)}`);
    },
    [onOpenRicercaDetail],
  );

  return (
    <section className="ui-next flex h-full min-h-0 w-full min-w-0 flex-col gap-4 overflow-hidden">
      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento assegnazione: {error}
        </div>
      ) : null}

      <SectionHeader>
        <SectionHeader.Title
          badge={
            <Badge>
              {filteredCards.length}{" "}
              {filteredCards.length === 1 ? "ricerca" : "ricerche"}
            </Badge>
          }
        >
          Assegnazione
        </SectionHeader.Title>
        <SectionHeader.Actions>
          <Select
            value={assigneeFilter}
            onValueChange={(value) =>
              setAssigneeFilter(value as AssigneeValue | "all")
            }
          >
            <SelectTrigger className="w-55">
              <UsersIcon className="size-4" />
              <SelectValue placeholder="Tutti i recruiter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti i recruiter</SelectItem>
              <SelectItem value="none">Non assegnato</SelectItem>
              {operatorOptions.map((operator) => (
                <SelectItem key={operator.id} value={operator.id}>
                  {operator.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={tipoRicercaFilter}
            onValueChange={(value) =>
              setTipoRicercaFilter(value as "all" | "nuova" | "sostituzione")
            }
          >
            <SelectTrigger className="w-47.5">
              <FilterIcon className="size-4" />
              <SelectValue placeholder="Tutte le ricerche" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le ricerche</SelectItem>
              <SelectItem value="nuova">Nuove ricerche</SelectItem>
              <SelectItem value="sostituzione">Sostituzioni</SelectItem>
            </SelectContent>
          </Select>

          {(assigneeFilter !== "all" || tipoRicercaFilter !== "all") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setAssigneeFilter("all");
                setTipoRicercaFilter("all");
              }}
            >
              <FilterXIcon className="size-4" />
              Reset filtri
            </Button>
          )}
        </SectionHeader.Actions>
      </SectionHeader>

      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-3 overflow-hidden px-6 xl:grid-cols-[292px_minmax(0,1fr)]">
        <SideCardsPanel
          title="Da assegnare"
          icon={CalendarDaysIcon}
          subtitle={
            loading
              ? "Caricamento..."
              : `${unassignedCards.length} ricerche senza giorno assegnato`
          }
          headerClassName="px-5"
          contentClassName="space-y-2 px-5 py-3"
          className={cn(
            "h-full",
            dropTarget === "UNASSIGNED" && "ring-primary/40 ring-2",
          )}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDropTarget("UNASSIGNED");
          }}
          onDragLeave={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const stillInside =
              event.clientX >= rect.left &&
              event.clientX <= rect.right &&
              event.clientY >= rect.top &&
              event.clientY <= rect.bottom;
            if (stillInside) return;
            setDropTarget(null);
          }}
          onDrop={(event) => {
            event.preventDefault();
            const droppedProcessId =
              event.dataTransfer.getData("text/plain") || null;
            handleDrop(null, droppedProcessId);
          }}
        >
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-muted h-20 animate-pulse rounded-lg border"
                />
              ))}
            </div>
          ) : unassignedCards.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nessuna ricerca in stato da assegnare.
            </p>
          ) : (
            <Accordion
              type="multiple"
              defaultValue={["nuove", "sostituzioni"]}
              className="gap-2"
            >
              <AccordionItem
                value="nuove"
                className="not-last:border-0 bg-transparent"
              >
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <Badge className="border-sky-200 bg-sky-100 text-sky-700">
                      Nuove
                    </Badge>
                    <span className="text-muted-foreground font-normal">
                      ({unassignedGroupedByTipoRicerca.nuove.length})
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pt-1">
                  {unassignedGroupedByTipoRicerca.nuove.map((card) => {
                    const assigneeId = getCardAssigneeId(card);
                    const assigneeMeta = assigneeById.get(assigneeId);
                    return (
                      <div
                        key={card.id}
                        draggable
                        onClick={() => handleOpenCardDetails(card)}
                        onDragStart={(event) => onCardDragStart(event, card.id)}
                        onDragEnd={onCardDragEnd}
                        onPointerDown={(event) =>
                          onCardPointerDown(event, card.id)
                        }
                        onPointerMove={(event) =>
                          onCardPointerMove(event, card.id)
                        }
                        onPointerUp={() => onCardPointerUp(card.id)}
                        onPointerCancel={() => onCardPointerCancel(card.id)}
                        className={cn(
                          "cursor-grab transition-opacity active:cursor-grabbing",
                          draggingProcessId === card.id && "opacity-40",
                        )}
                      >
                        <AssegnazioneSearchCard
                          data={card}
                          assigneeId={assigneeId}
                          assigneeLabel={assigneeMeta?.label ?? "Non assegnato"}
                          assigneeAvatar={assigneeMeta?.avatar ?? "-"}
                          accentClassName={getDeadlineAccentClass(
                            card.deadlineMobile,
                          )}
                          assigneeOptions={operatorOptions.map((option) => ({
                            id: option.id,
                            label: option.label,
                          }))}
                          onAssigneeChange={(nextAssigneeId) => {
                            void applyAssigneeChange(card, nextAssigneeId);
                          }}
                        />
                      </div>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="sostituzioni"
                className="not-last:border-0 bg-transparent"
              >
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <Badge className="border-amber-200 bg-amber-100 text-amber-700">
                      Sostituzioni
                    </Badge>
                    <span className="text-muted-foreground font-normal">
                      ({unassignedGroupedByTipoRicerca.sostituzioni.length})
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pt-1">
                  {unassignedGroupedByTipoRicerca.sostituzioni.map((card) => {
                    const assigneeId = getCardAssigneeId(card);
                    const assigneeMeta = assigneeById.get(assigneeId);
                    return (
                      <div
                        key={card.id}
                        draggable
                        onClick={() => handleOpenCardDetails(card)}
                        onDragStart={(event) => onCardDragStart(event, card.id)}
                        onDragEnd={onCardDragEnd}
                        onPointerDown={(event) =>
                          onCardPointerDown(event, card.id)
                        }
                        onPointerMove={(event) =>
                          onCardPointerMove(event, card.id)
                        }
                        onPointerUp={() => onCardPointerUp(card.id)}
                        onPointerCancel={() => onCardPointerCancel(card.id)}
                        className={cn(
                          "cursor-grab transition-opacity active:cursor-grabbing",
                          draggingProcessId === card.id && "opacity-40",
                        )}
                      >
                        <AssegnazioneSearchCard
                          data={card}
                          assigneeId={assigneeId}
                          assigneeLabel={assigneeMeta?.label ?? "Non assegnato"}
                          assigneeAvatar={assigneeMeta?.avatar ?? "-"}
                          accentClassName={getDeadlineAccentClass(
                            card.deadlineMobile,
                          )}
                          assigneeOptions={operatorOptions.map((option) => ({
                            id: option.id,
                            label: option.label,
                          }))}
                          onAssigneeChange={(nextAssigneeId) => {
                            void applyAssigneeChange(card, nextAssigneeId);
                          }}
                        />
                      </div>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </SideCardsPanel>

        <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2">
            <div>
              <p className="text-sm font-semibold">Giorni assegnazione</p>
              <p className="text-muted-foreground text-xs">
                {visibleDays.map((day) => day.label).join(" · ")}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => {
                  setVisibleWindowStart((current) => addDays(current, -1));
                }}
                aria-label="Giorno precedente"
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => {
                  setVisibleWindowStart((current) => addDays(current, 1));
                }}
                aria-label="Giorno successivo"
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 rounded-lg border p-2">
            <div className="grid h-full min-h-0 grid-cols-3 gap-2">
              {visibleDays.map((day) => {
                const dayCards = cardsByDate.get(day.key) ?? [];
                return (
                  <div
                    key={day.key}
                    className={cn(
                      "bg-muted/30 flex h-full min-h-0 flex-col rounded-lg border p-2 transition-all",
                      dropTarget === day.key && "ring-primary/40 ring-2",
                    )}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDropTarget(day.key);
                    }}
                    onDragLeave={(event) => {
                      const rect =
                        event.currentTarget.getBoundingClientRect();
                      const stillInside =
                        event.clientX >= rect.left &&
                        event.clientX <= rect.right &&
                        event.clientY >= rect.top &&
                        event.clientY <= rect.bottom;
                      if (stillInside) return;
                      setDropTarget(null);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const droppedProcessId =
                        event.dataTransfer.getData("text/plain") || null;
                      handleDrop(day.key, droppedProcessId);
                    }}
                  >
                    <div className="mb-2 shrink-0 border-b pb-2">
                      <p className="text-xs font-semibold">{day.label}</p>
                      <p className="text-muted-foreground text-[11px]">
                        {dayCards.length}{" "}
                        {dayCards.length === 1 ? "ricerca" : "ricerche"}
                      </p>
                    </div>

                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                      {dayCards.length === 0 ? (
                        <p className="text-muted-foreground text-xs">
                          Nessuna assegnazione
                        </p>
                      ) : (
                        dayCards.map((card) => {
                          const assigneeId = getCardAssigneeId(card);
                          const assigneeMeta = assigneeById.get(assigneeId);
                          return (
                            <div
                              key={card.id}
                              draggable
                              onClick={() => handleOpenCardDetails(card)}
                              onDragStart={(event) =>
                                onCardDragStart(event, card.id)
                              }
                              onDragEnd={onCardDragEnd}
                              onPointerDown={(event) =>
                                onCardPointerDown(event, card.id)
                              }
                              onPointerMove={(event) =>
                                onCardPointerMove(event, card.id)
                              }
                              onPointerUp={() => onCardPointerUp(card.id)}
                              onPointerCancel={() =>
                                onCardPointerCancel(card.id)
                              }
                              className={cn(
                                "cursor-grab transition-opacity active:cursor-grabbing",
                                draggingProcessId === card.id && "opacity-40",
                              )}
                            >
                              <AssegnazioneSearchCard
                                data={card}
                                assigneeId={assigneeId}
                                assigneeLabel={
                                  assigneeMeta?.label ?? "Non assegnato"
                                }
                                assigneeAvatar={assigneeMeta?.avatar ?? "-"}
                                accentClassName={getAssigneeAccentClass(
                                  assigneeId,
                                )}
                                assigneeOptions={operatorOptions.map(
                                  (option) => ({
                                    id: option.id,
                                    label: option.label,
                                  }),
                                )}
                                onAssigneeChange={(nextAssigneeId) => {
                                  void applyAssigneeChange(
                                    card,
                                    nextAssigneeId,
                                  );
                                }}
                              />
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <AssegnazioneDetailSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        card={selectedCardFromState}
        operatorOptions={operatorOptions.map((operator) => ({
          id: operator.id,
          label: operator.label,
        }))}
        onPatchCard={async (patch) => {
          if (!selectedCardFromState?.id) return;
          await patchCard(selectedCardFromState.id, patch);
        }}
        onOpenRicerca={handleOpenRicerca}
      />
    </section>
  );
}
