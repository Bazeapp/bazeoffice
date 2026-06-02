import * as React from "react";
import { toast } from "sonner";
import {
  CalendarDaysIcon,
  ClipboardListIcon,
  LoaderCircleIcon,
  PlusIcon,
  SparklesIcon,
  UserIcon,
  XIcon,
} from "lucide-react";

import {
  LavoratoreCard,
  type WorkerOtherSelectionSummaryItem,
} from "@/components/lavoratori/lavoratore-card";
import { WorkerProfileHeader } from "@/components/lavoratori/worker-profile-header";
import { SchedaColloquioPanel } from "@/components/ricerca/scheda-colloquio-panel";
import {
  type RelatedActiveSearchItem,
  type RelatedSearchGroups,
  WorkerPipelineSummaryCards,
} from "@/components/ricerca/worker-pipeline-summary-cards";
import { SectionHeader } from "@/components/shared-next/section-header";
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchInput } from "@/components/ui/search-input";
import { Textarea } from "@/components/ui/textarea";
import { formatAvailabilityComputedAt } from "@/features/lavoratori/lib/availability-utils";
import {
  asInputValue,
  asString,
  getAgeFromBirthDate,
  getDefaultWorkerAvatar,
  normalizeDomesticRoleLabels,
  parseNumberValue,
  readArrayStrings,
  toAvatarUrl,
} from "@/features/lavoratori/lib/base-utils";
import { isDirectInvolvementSelection } from "@/features/lavoratori/lib/involvement-utils";
import {
  getLookupSelectValue,
  isBlacklistValue,
  normalizeLookupColors,
  normalizeLookupOptions,
  resolveLookupColor,
  type LookupOption,
} from "@/features/lavoratori/lib/lookup-utils";
import { toWorkerStatusFlags } from "@/features/lavoratori/lib/status-utils";
import {
  getLookupDropZoneActiveClassName,
  getLookupDropZoneClassName,
  getLookupToneTextClassName,
} from "@/lib/lookup-color-styles";
import { matchesSearchQuery } from "@/lib/search-utils";
import { cn } from "@/lib/utils";
import { invokeAiGenerationFunction } from "@/lib/ai-generation";
import {
  getSelectionAvailabilityWorkerIds,
  invokeWorkerAvailabilityForIds,
} from "@/lib/availability-functions";
import { type CrmPipelineCardData } from "@/hooks/use-crm-pipeline-preview";
import {
  type RicercaWorkerSelectionColumn,
  type RicercaWorkerSelectionCard,
  type RicercaWorkersPipelineState,
} from "@/hooks/use-ricerca-workers-pipeline";
import { useSelectedWorkerEditor } from "@/hooks/use-selected-worker-editor";
import { useDebouncedSave } from "@/hooks/use-debounced-save";
import {
  createRecord,
  fetchFamiglieByIds,
  fetchLavoratoriByIds,
  fetchLavoratoriSearch,
  fetchLookupValues,
  fetchProcessiMatchingByIds,
  fetchRicercaWorkerScheda,
  fetchSelezioniLookup,
  runSmartMatchingForwardPreview,
  updateRecord,
} from "@/lib/anagrafiche-api";
import type { EsperienzaLavoratoreRecord } from "@/types/entities/esperienza-lavoratore";
import type { DocumentoLavoratoreRecord } from "@/types/entities/documento-lavoratore";
import type { LavoratoreRecord } from "@/types/entities/lavoratore";
import type { ReferenzaLavoratoreRecord } from "@/types/entities/referenza-lavoratore";

type RicercaWorkersPipelineViewProps = {
  processId: string;
  card: CrmPipelineCardData &
    Partial<{
      indirizzoProvaProvincia: string;
      indirizzoProvaCap: string;
      indirizzoProvaNote: string;
      indirizzoProvaVia: string;
      indirizzoProvaCivico: string;
      indirizzoProvaComune: string;
      indirizzoProvaCitofono: string;
    }>;
  focusSelectionId?: string | null;
  onOpenRelatedSearch?: (processId: string, selectionId: string) => void;
  onPatchProcess?: (
    processId: string,
    patch: Record<string, unknown>,
  ) => Promise<void> | void;
  pipelineState: RicercaWorkersPipelineState;
  recruiterLabelsById: Map<string, string>;
  className?: string;
};

function normalizeToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatCardDateTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRelativeTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const formatter = new Intl.RelativeTimeFormat("it-IT", { numeric: "auto" });

  if (absMs < 60 * 60 * 1000) {
    return formatter.format(Math.round(diffMs / (60 * 1000)), "minute");
  }
  if (absMs < 48 * 60 * 60 * 1000) {
    return formatter.format(Math.round(diffMs / (60 * 60 * 1000)), "hour");
  }
  return formatter.format(Math.round(diffMs / (24 * 60 * 60 * 1000)), "day");
}

function getCardOperationalTiming(card: RicercaWorkerSelectionCard) {
  const statusToken = normalizeToken(card.status);
  const isTrial = statusToken.includes("prova");
  const isInterview = statusToken.includes("colloquio");
  if (!isTrial && !isInterview) return null;

  const scheduledAt = formatCardDateTime(card.scheduledAt);
  if (!scheduledAt) return null;

  const eventLabel = isTrial ? "Prova" : "Colloquio";
  const relativeValue = card.endedAt ?? card.scheduledAt;
  const relativeLabel = formatRelativeTime(relativeValue);
  const relativePrefix = card.endedAt ? "fine" : "inizio";

  return {
    label: `${eventLabel}: ${scheduledAt}`,
    relativeLabel: relativeLabel ? `${relativePrefix} ${relativeLabel}` : null,
  };
}

function buildWorkerResidenceAddress(row: Record<string, unknown> | undefined) {
  if (!row) return null;

  const formatted = asString(row.indirizzo_formattato);
  const street = [asString(row.via), asString(row.civico)]
    .filter(Boolean)
    .join(" ")
    .trim();
  const locality = [asString(row.cap), asString(row.citta)]
    .filter(Boolean)
    .join(" ")
    .trim();
  const address =
    formatted ||
    [street, locality, asString(row.provincia), asString(row.paese)]
      .filter((value, index, values) => Boolean(value) && values.indexOf(value) === index)
      .join(", ");

  return {
    address: address || null,
    cap: asString(row.cap) || null,
    province: asString(row.provincia) || null,
  };
}

function mergeWorkerResidenceAddress(
  worker: LavoratoreRecord,
  addressRow: Record<string, unknown> | undefined,
) {
  const address = buildWorkerResidenceAddress(addressRow);
  if (!address) return worker;

  return {
    ...worker,
    cap: asString(worker.cap) || address.cap,
    provincia: asString(worker.provincia) || address.province,
    indirizzo_residenza_completo:
      asString(worker.indirizzo_residenza_completo) || address.address,
  } as LavoratoreRecord;
}

type GroupedColumnGroup = {
  key: string;
  label: string;
  dropStatusId: string;
};

const CANDIDATI_GROUPS: GroupedColumnGroup[] = [
  {
    key: "candidato - good fit",
    label: "Good fit",
    dropStatusId: "Candidato - Good fit",
  },
  {
    key: "prospetto",
    label: "Prospetto",
    dropStatusId: "Prospetto",
  },
  {
    key: "candidato - poor fit",
    label: "Poor fit",
    dropStatusId: "Candidato - Poor fit",
  },
] as const;

const ARCHIVIO_GROUPS: GroupedColumnGroup[] = [
  {
    key: "no match",
    label: "No match",
    dropStatusId: "No match",
  },
  {
    key: "archivio",
    label: "Archivio",
    dropStatusId: "Archivio",
  },
  {
    key: "non selezionato",
    label: "Non selezionato",
    dropStatusId: "Non selezionato",
  },
  {
    key: "nascosto - oot",
    label: "Nascosto - OOT",
    dropStatusId: "Nascosto - OOT",
  },
];

const DA_COLLOQUIARE_GROUPS: GroupedColumnGroup[] = [
  {
    key: "da colloquiare",
    label: "Da colloquiare",
    dropStatusId: "Da colloquiare",
  },
  {
    key: "invitato a colloquio",
    label: "Invitato a colloquio",
    dropStatusId: "Invitato a colloquio",
  },
  {
    key: "non risponde",
    label: "Non risponde",
    dropStatusId: "Non risponde",
  },
];

const COLLOQUI_PROVE_GROUPS: GroupedColumnGroup[] = [
  {
    key: "colloquio schedulato",
    label: "Colloquio schedulato",
    dropStatusId: "Colloquio schedulato",
  },
  {
    key: "colloquio rimandato",
    label: "Colloquio rimandato",
    dropStatusId: "Colloquio rimandato",
  },
  {
    key: "colloquio fatto",
    label: "Colloquio fatto",
    dropStatusId: "Colloquio fatto",
  },
  {
    key: "prova schedulata",
    label: "Prova schedulata",
    dropStatusId: "Prova schedulata",
  },
  {
    key: "prova rimandata",
    label: "Prova rimandata",
    dropStatusId: "Prova rimandata",
  },
  {
    key: "prova in corso",
    label: "Prova in corso",
    dropStatusId: "Prova in corso",
  },
  {
    key: "prova fatta",
    label: "Prova fatta",
    dropStatusId: "Prova fatta",
  },
];

const GROUPED_COLUMN_GROUPS: Record<string, GroupedColumnGroup[]> = {
  __candidati__: CANDIDATI_GROUPS,
  __da_colloquiare__: DA_COLLOQUIARE_GROUPS,
  __archivio__: ARCHIVIO_GROUPS,
  __colloqui_prove__: COLLOQUI_PROVE_GROUPS,
};

const DEFAULT_BLUE_BADGE_CLASS_NAME =
  "border-blue-200 bg-blue-100 text-blue-700";

const RELATED_PROCESS_BATCH_SIZE = 150;
const RELATED_FAMILY_BATCH_SIZE = 150;
const ADD_WORKER_SEARCH_LIMIT = 8;
const ADD_WORKER_SEARCH_FETCH_LIMIT = 24;

function normalizeWorkerSearchText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}@._+-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeWorkerSearchQuery(value: string) {
  return normalizeWorkerSearchText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function buildWorkerSearchHaystack(row: Record<string, unknown>) {
  return normalizeWorkerSearchText(
    [
      row.nome,
      row.cognome,
      [row.nome, row.cognome].filter(Boolean).join(" "),
      row.email,
    ].join(" "),
  );
}

function workerMatchesCombinedQuery(
  row: Record<string, unknown>,
  tokens: string[],
) {
  if (tokens.length === 0) return true;
  const haystack = buildWorkerSearchHaystack(row);
  return tokens.every((token) => haystack.includes(token));
}

function scoreWorkerSearchResult(row: Record<string, unknown>, query: string) {
  const normalizedQuery = normalizeWorkerSearchText(query);
  const fullName = normalizeWorkerSearchText([row.nome, row.cognome].join(" "));
  const email = normalizeWorkerSearchText(row.email);

  if (fullName === normalizedQuery) return 0;
  if (fullName.startsWith(normalizedQuery)) return 1;
  if (email === normalizedQuery) return 2;
  if (email.startsWith(normalizedQuery)) return 3;
  if (fullName.includes(normalizedQuery)) return 4;
  if (email.includes(normalizedQuery)) return 5;
  return 6;
}

function formatRelatedFamilyName(row: Record<string, unknown> | null | undefined) {
  const familyName = [asString(row?.nome), asString(row?.cognome)]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .trim();

  return familyName || "Famiglia senza nome";
}

function formatRelatedSearchLabel(processRow: Record<string, unknown>) {
  const searchNumber = asInputValue(processRow.numero_ricerca_attivata);
  if (searchNumber) return `Ricerca #${searchNumber}`;

  const relatedProcessId = asString(processRow.id);
  return relatedProcessId ? `Ricerca ${relatedProcessId.slice(0, 8)}` : "Ricerca";
}

function extractGeneratedMessage(value: unknown): string {
  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  const directValue = asString(record.messaggio_famiglia_selezione_lavoratore);
  if (directValue) return directValue;

  return (
    extractGeneratedMessage(record.row) ||
    extractGeneratedMessage(record.data) ||
    extractGeneratedMessage(record.result)
  );
}

function waitFor(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function formatRelatedZona(processRow: Record<string, unknown>) {
  const parts = [
    asString(processRow.indirizzo_prova_comune),
    asString(processRow.indirizzo_prova_provincia),
    asString(processRow.indirizzo_prova_cap),
    asString(processRow.indirizzo_prova_note),
  ].filter(
    (value, index, values): value is string =>
      Boolean(value) && values.indexOf(value) === index,
  );

  return parts.join(" • ") || "-";
}

async function fetchAllSelectionsForWorker(workerId: string) {
  const result = await fetchSelezioniLookup({ lavoratoreIds: [workerId] });
  return Array.isArray(result.rows)
    ? (result.rows as Record<string, unknown>[])
    : [];
}

async function fetchRelatedProcessesByIds(processIds: string[]) {
  if (processIds.length === 0) return [];

  const rows: Record<string, unknown>[] = [];

  for (
    let index = 0;
    index < processIds.length;
    index += RELATED_PROCESS_BATCH_SIZE
  ) {
    const batch = processIds.slice(index, index + RELATED_PROCESS_BATCH_SIZE);
    const result = await fetchProcessiMatchingByIds({ ids: batch });

    if (Array.isArray(result.rows)) {
      rows.push(...(result.rows as Record<string, unknown>[]));
    }
  }

  return rows;
}

async function fetchRelatedFamiliesByIds(familyIds: string[]) {
  if (familyIds.length === 0) return [];

  const rows: Record<string, unknown>[] = [];

  for (
    let index = 0;
    index < familyIds.length;
    index += RELATED_FAMILY_BATCH_SIZE
  ) {
    const batch = familyIds.slice(index, index + RELATED_FAMILY_BATCH_SIZE);
    const result = await fetchFamiglieByIds(batch);

    if (Array.isArray(result.rows)) {
      rows.push(...(result.rows as Record<string, unknown>[]));
    }
  }

  return rows;
}

function resolveGroupColor(
  column: RicercaWorkerSelectionColumn,
  group: GroupedColumnGroup,
) {
  return column.groupColors?.[normalizeToken(group.key)] ?? null;
}

function resolveGroupDropStatusId(
  column: RicercaWorkerSelectionColumn,
  group: GroupedColumnGroup,
) {
  const statusIds = column.groupStatusIds ?? {};
  return (
    statusIds[normalizeToken(group.key)] ??
    statusIds[normalizeToken(group.dropStatusId)] ??
    group.dropStatusId
  );
}

function normalizeColumnLabelToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

function getWorkerColumnVisual(
  columnId: string,
  columnLabel: string,
  color: string | null,
) {
  const token = normalizeColumnLabelToken(columnLabel || columnId);
  switch (token) {
    case "candidati":
      return {
        columnClassName: "bg-blue-400",
        headerClassName: "",
        iconClassName: "text-blue-500",
      };
    case "da colloquiare":
      return {
        columnClassName: "bg-violet-400",
        headerClassName: "",
        iconClassName: "text-violet-500",
      };
    case "colloqui match":
    case "colloqui  match":
    case "colloqui":
      return {
        columnClassName: "bg-emerald-400",
        headerClassName: "",
        iconClassName: "text-emerald-500",
      };
    case "selezionato":
    case "selezionati":
      return {
        columnClassName: "bg-amber-400",
        headerClassName: "",
        iconClassName: "text-amber-500",
      };
    case "scartati":
    case "archivio":
      return {
        columnClassName: "bg-zinc-400",
        headerClassName: "",
        iconClassName: "text-zinc-500",
      };
    default:
      break;
  }

  switch ((color ?? "").toLowerCase()) {
    case "red":
      return { columnClassName: "bg-red-400", headerClassName: "", iconClassName: "text-red-500" };
    case "rose":
      return { columnClassName: "bg-rose-400", headerClassName: "", iconClassName: "text-rose-500" };
    case "orange":
      return { columnClassName: "bg-orange-400", headerClassName: "", iconClassName: "text-orange-500" };
    case "amber":
      return { columnClassName: "bg-amber-400", headerClassName: "", iconClassName: "text-amber-500" };
    case "yellow":
      return { columnClassName: "bg-yellow-400", headerClassName: "", iconClassName: "text-yellow-500" };
    case "lime":
      return { columnClassName: "bg-lime-400", headerClassName: "", iconClassName: "text-lime-500" };
    case "green":
      return { columnClassName: "bg-green-400", headerClassName: "", iconClassName: "text-green-500" };
    case "emerald":
      return { columnClassName: "bg-emerald-400", headerClassName: "", iconClassName: "text-emerald-500" };
    case "teal":
      return { columnClassName: "bg-teal-400", headerClassName: "", iconClassName: "text-teal-500" };
    case "cyan":
      return { columnClassName: "bg-cyan-400", headerClassName: "", iconClassName: "text-cyan-500" };
    case "sky":
      return { columnClassName: "bg-sky-400", headerClassName: "", iconClassName: "text-sky-500" };
    case "blue":
      return { columnClassName: "bg-blue-400", headerClassName: "", iconClassName: "text-blue-500" };
    case "indigo":
      return { columnClassName: "bg-indigo-400", headerClassName: "", iconClassName: "text-indigo-500" };
    case "violet":
      return { columnClassName: "bg-violet-400", headerClassName: "", iconClassName: "text-violet-500" };
    case "purple":
      return { columnClassName: "bg-purple-400", headerClassName: "", iconClassName: "text-purple-500" };
    case "fuchsia":
      return { columnClassName: "bg-fuchsia-400", headerClassName: "", iconClassName: "text-fuchsia-500" };
    case "pink":
      return { columnClassName: "bg-pink-400", headerClassName: "", iconClassName: "text-pink-500" };
    case "slate":
      return { columnClassName: "bg-slate-400", headerClassName: "", iconClassName: "text-slate-500" };
    case "gray":
      return { columnClassName: "bg-gray-400", headerClassName: "", iconClassName: "text-gray-500" };
    case "zinc":
    case "muted":
      return { columnClassName: "bg-zinc-400", headerClassName: "", iconClassName: "text-zinc-500" };
    default:
      return { columnClassName: "", headerClassName: "", iconClassName: "text-muted-foreground/80" };
  }
}

function PipelineWorkerCard({
  card,
  onOpenWorker,
  onLoadOtherActiveSelectionDetails,
}: {
  card: RicercaWorkerSelectionCard;
  onOpenWorker: (card: RicercaWorkerSelectionCard) => void;
  onLoadOtherActiveSelectionDetails: (
    workerId: string
  ) => Promise<WorkerOtherSelectionSummaryItem[]>;
}) {
  const timing = getCardOperationalTiming(card);

  return (
    <LavoratoreCard
      worker={card.worker}
      isActive={false}
      onClick={() => onOpenWorker(card)}
      onLoadOtherActiveSelectionDetails={onLoadOtherActiveSelectionDetails}
      bottomSlot={
        timing ? (
        <div className="text-muted-foreground flex min-w-0 items-start gap-1.5 text-2xs leading-snug">
          <CalendarDaysIcon className="size-3 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{timing.label}</span>
            {timing.relativeLabel ? (
              <span className="block">{timing.relativeLabel}</span>
            ) : null}
          </span>
        </div>
        ) : null
      }
    />
  );
}

const WorkerPipelineColumn = React.memo(function WorkerPipelineColumn({
  column,
  isDropTarget,
  activeGroupDropId,
  draggingSelectionId,
  draggingFromColumnId,
  onDragEnterColumn,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropToColumn,
  onDragStartCard,
  onDragEndCard,
  onOpenWorker,
  onLoadOtherActiveSelectionDetails,
}: {
  column: RicercaWorkerSelectionColumn;
  isDropTarget: boolean;
  activeGroupDropId: string | null;
  draggingSelectionId: string | null;
  draggingFromColumnId: string | null;
  onDragEnterColumn: (columnId: string) => void;
  onDragOverColumn: (columnId: string) => void;
  onDragLeaveColumn: (event: React.DragEvent<HTMLDivElement>) => void;
  onDropToColumn: (columnId: string, selectionId: string | null) => void;
  onDragStartCard: (selectionId: string, sourceColumnId: string) => void;
  onDragEndCard: () => void;
  onOpenWorker: (card: RicercaWorkerSelectionCard) => void;
  onLoadOtherActiveSelectionDetails: (
    workerId: string
  ) => Promise<WorkerOtherSelectionSummaryItem[]>;
}) {
  const groups = GROUPED_COLUMN_GROUPS[column.id] ?? null;
  const isGroupedColumn = Boolean(groups);
  const showDropZones =
    isGroupedColumn &&
    Boolean(draggingSelectionId) &&
    (draggingFromColumnId !== column.id || isDropTarget);
  const visual = getWorkerColumnVisual(column.id, column.label, column.color);
  const countLabel = `${column.cards.length} ${
    column.cards.length === 1 ? "lavoratore" : "lavoratori"
  }`;
  const visibleGroups = React.useMemo(() => {
    if (!groups) return [];

    return groups
      .map((group) => {
        const groupStatusId = resolveGroupDropStatusId(column, group);
        const groupCards = column.cards.filter(
          (card) =>
            normalizeToken(card.status) === normalizeToken(groupStatusId) ||
            normalizeToken(card.status) === normalizeToken(group.key),
        );

        return {
          group,
          groupCards,
          groupColor: resolveGroupColor(column, group),
          groupStatusId,
        };
      })
      .filter((entry) => entry.groupCards.length > 0);
  }, [column, groups]);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-surface flex h-full w-73 shrink-0 flex-col rounded-xl border transition-all duration-150",
        isDropTarget && "ring-primary/50 ring-2 shadow-md",
      )}
      onDragEnter={() => onDragEnterColumn(column.id)}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        onDragOverColumn(column.id);
      }}
      onDragLeave={onDragLeaveColumn}
      onDrop={(event) => {
        event.preventDefault();
        const droppedSelectionId =
          event.dataTransfer.getData("text/plain") || null;
        onDropToColumn(column.dropStatusId ?? column.id, droppedSelectionId);
      }}
    >
      {visual.columnClassName ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-0 left-0 right-0 h-1",
            visual.columnClassName,
          )}
        />
      ) : null}

      {groups ? (
        <div
          className={cn(
            "absolute inset-0 z-20 flex flex-col gap-1.5 rounded-xl p-2 transition-opacity",
            showDropZones
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0",
          )}
        >
          {groups.map((group) => {
            const groupDropId = `${column.id}::${group.key}`;
            const isGroupDropTarget = activeGroupDropId === groupDropId;
            const groupColor = resolveGroupColor(column, group);
            const groupStatusId = resolveGroupDropStatusId(column, group);

            return (
              <div
                key={group.key}
                onDragEnter={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onDragEnterColumn(groupDropId);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  event.dataTransfer.dropEffect = "move";
                  onDragOverColumn(groupDropId);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const droppedSelectionId =
                    event.dataTransfer.getData("text/plain") || null;
                  onDropToColumn(groupStatusId, droppedSelectionId);
                }}
                className={cn(
                  "flex min-h-0 flex-1 items-center justify-center rounded-md border-2 border-dashed transition-transform duration-150",
                  getLookupDropZoneClassName(groupColor),
                  isGroupDropTarget &&
                    cn(
                      getLookupDropZoneActiveClassName(groupColor),
                      "scale-[1.03]",
                    ),
                )}
              >
                <Badge className={DEFAULT_BLUE_BADGE_CLASS_NAME}>
                  {group.label}
                </Badge>
              </div>
            );
          })}
        </div>
      ) : null}

      <div
        className={cn(
          "flex items-center gap-2 px-4 py-3.5",
          visual.headerClassName,
        )}
      >
        <span
          aria-hidden
          className={cn(
            "shrink-0 size-2 rounded-full bg-current",
            visual.iconClassName,
          )}
        />
        <h2 className="text-foreground min-w-0 flex-1 truncate text-[15px] leading-5 font-semibold">
          {column.label}
        </h2>
        <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2 py-0.5 text-2xs font-medium">
          {countLabel}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {column.cards.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed border-border/60 p-3 text-xs">
            Nessun lavoratore
          </div>
        ) : groups ? (
          <Accordion
            type="multiple"
            defaultValue={visibleGroups.map(({ group }) => group.key)}
            className="-mx-3 gap-1.5"
          >
            {visibleGroups.map(({ group, groupCards, groupColor }) => {
              return (
                <AccordionItem
                  key={group.key}
                  value={group.key}
                  className="not-last:border-0 rounded-none bg-transparent shadow-none data-[state=open]:shadow-none"
                >
                  <AccordionTrigger
                    className={cn(
                      "px-1.5 py-1.5 text-sm font-semibold no-underline hover:bg-transparent hover:no-underline",
                      getLookupToneTextClassName(groupColor),
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={DEFAULT_BLUE_BADGE_CLASS_NAME}
                      >
                        {group.label}
                      </Badge>
                      <span className="text-muted-foreground font-normal">
                        ({groupCards.length})
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-2 border-t-0 px-1.5 pt-1">
                    {groupCards.map((card) => (
                      <div
                        key={card.id}
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", card.id);
                          event.dataTransfer.effectAllowed = "move";
                          onDragStartCard(card.id, column.id);
                        }}
                        onDragEnd={onDragEndCard}
                        className={cn(
                          "cursor-grab transition-opacity active:cursor-grabbing",
                          draggingSelectionId === card.id && "opacity-40",
                        )}
                      >
                        <PipelineWorkerCard
                          card={card}
                          onOpenWorker={onOpenWorker}
                          onLoadOtherActiveSelectionDetails={
                            onLoadOtherActiveSelectionDetails
                          }
                        />
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        ) : (
          column.cards.map((card) => (
            <div
              key={card.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", card.id);
                event.dataTransfer.effectAllowed = "move";
                onDragStartCard(card.id, column.id);
              }}
              onDragEnd={onDragEndCard}
              className={cn(
                "cursor-grab transition-opacity active:cursor-grabbing",
                draggingSelectionId === card.id && "opacity-40",
              )}
            >
              <PipelineWorkerCard
                card={card}
                onOpenWorker={onOpenWorker}
                onLoadOtherActiveSelectionDetails={
                  onLoadOtherActiveSelectionDetails
                }
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
});

export function RicercaWorkersPipelineView({
  processId,
  card,
  focusSelectionId = null,
  onOpenRelatedSearch,
  pipelineState,
  recruiterLabelsById,
  className,
}: RicercaWorkersPipelineViewProps) {
  const { loading, error, columns, moveCard, refresh } = pipelineState;
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isRunningSmartMatching, setIsRunningSmartMatching] =
    React.useState(false);
  const [isAddWorkerDialogOpen, setIsAddWorkerDialogOpen] =
    React.useState(false);
  const [workerSearchQuery, setWorkerSearchQuery] = React.useState("");
  const [workerSearchResults, setWorkerSearchResults] = React.useState<
    Record<string, unknown>[]
  >([]);
  const [isWorkerSearchLoading, setIsWorkerSearchLoading] =
    React.useState(false);
  const [selectedWorkerToAdd, setSelectedWorkerToAdd] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [manualInsertReason, setManualInsertReason] = React.useState("");
  const [isSubmittingAddWorker, setIsSubmittingAddWorker] =
    React.useState(false);
  const [draggingSelectionId, setDraggingSelectionId] = React.useState<
    string | null
  >(null);
  const [draggingFromColumnId, setDraggingFromColumnId] = React.useState<
    string | null
  >(null);
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<
    string | null
  >(null);
  const [selectedCard, setSelectedCard] =
    React.useState<RicercaWorkerSelectionCard | null>(null);
  const [isWorkerOverlayOpen, setIsWorkerOverlayOpen] = React.useState(false);
  const [selectedWorkerRow, setSelectedWorkerRow] =
    React.useState<LavoratoreRecord | null>(null);
  const [selectedWorkerAddress, setSelectedWorkerAddress] =
    React.useState<Record<string, unknown> | null>(null);
  const [selectedWorkerExperiences, setSelectedWorkerExperiences] =
    React.useState<EsperienzaLavoratoreRecord[]>([]);
  const [selectedWorkerDocuments, setSelectedWorkerDocuments] =
    React.useState<DocumentoLavoratoreRecord[]>([]);
  const [selectedSelectionRow, setSelectedSelectionRow] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [selectedWorkerReferences, setSelectedWorkerReferences] =
    React.useState<ReferenzaLavoratoreRecord[]>([]);
  const [
    loadingSelectedWorkerExperiences,
    setLoadingSelectedWorkerExperiences,
  ] = React.useState(false);
  const [loadingSelectedWorkerDocuments, setLoadingSelectedWorkerDocuments] =
    React.useState(false);
  const [loadingSelectedWorkerReferences, setLoadingSelectedWorkerReferences] =
    React.useState(false);
  const [lookupOptionsByDomain, setLookupOptionsByDomain] = React.useState<
    Map<string, LookupOption[]>
  >(new Map());
  const [lookupColorsByDomain, setLookupColorsByDomain] = React.useState<
    Map<string, string>
  >(new Map());
  const [selectedWorkerLoading, setSelectedWorkerLoading] =
    React.useState(false);
  const [updatingSelectionDetails, setUpdatingSelectionDetails] =
    React.useState(false);
  const [generatingWorkerSummary, setGeneratingWorkerSummary] =
    React.useState(false);
  const [generatingSelectionFeedback, setGeneratingSelectionFeedback] =
    React.useState(false);
  const [updatingFamilyAddress, setUpdatingFamilyAddress] = React.useState(false);
  const [familyAddressDraft, setFamilyAddressDraft] = React.useState({
    province: card.indirizzoProvaProvincia ?? "-",
    cap: card.indirizzoProvaCap ?? "-",
    address: card.indirizzoProvaVia ?? "-",
    street: card.indirizzoProvaVia ?? "-",
    civicNumber: card.indirizzoProvaCivico ?? "-",
    city: card.indirizzoProvaComune ?? "-",
    intercom: card.indirizzoProvaCitofono ?? "-",
    note: card.indirizzoProvaNote ?? "-",
  });
  const [selectedWorkerError, setSelectedWorkerError] = React.useState<
    string | null
  >(null);
  const selectedWorkerLoadingToastIdRef = React.useRef<string | number | null>(
    null,
  );
  const [relatedActiveSearches, setRelatedActiveSearches] =
    React.useState<RelatedSearchGroups>({ direct: [], other: [] });
  const [loadingRelatedActiveSearches, setLoadingRelatedActiveSearches] =
    React.useState(false);
  const otherSelectionDetailsCacheRef = React.useRef(
    new Map<string, Promise<WorkerOtherSelectionSummaryItem[]>>(),
  );
  const selectedWorkerId = selectedWorkerRow?.id ?? null;
  const selectedWorker = React.useMemo(() => {
    if (!selectedCard) return null;
    if (!selectedWorkerRow) return selectedCard.worker;

    const nome = asString(selectedWorkerRow.nome);
    const cognome = asString(selectedWorkerRow.cognome);
    const nomeCompleto =
      `${nome} ${cognome}`.trim() || selectedCard.worker.nomeCompleto;
    const ruoliDomestici = normalizeDomesticRoleLabels(
      readArrayStrings(selectedWorkerRow.tipo_lavoro_domestico),
    );
    const tipoLavori = readArrayStrings(selectedWorkerRow.tipo_rapporto_lavorativo);
    const statoLavoratore = asString(selectedWorkerRow.stato_lavoratore) || null;
    const disponibilita = asString(selectedWorkerRow.disponibilita) || null;
    const statusFlags = toWorkerStatusFlags(statoLavoratore);

    return {
      ...selectedCard.worker,
      id: asString(selectedWorkerRow.id) || selectedCard.worker.id,
      nomeCompleto,
      immagineUrl:
        toAvatarUrl(selectedWorkerRow) ??
        selectedCard.worker.immagineUrl ??
        getDefaultWorkerAvatar(
          asString(selectedWorkerRow.id) || selectedCard.worker.id,
        ),
      cap: asString(selectedWorkerRow.cap) || null,
      telefono: asString(selectedWorkerRow.telefono) || null,
      isBlacklisted: isBlacklistValue(selectedWorkerRow.check_blacklist),
      tipoRuolo: ruoliDomestici[0] ?? null,
      tipoLavori,
      tipoLavoriColors: Object.fromEntries(
        tipoLavori.map((tipo) => [
          tipo,
          resolveLookupColor(
            lookupColorsByDomain,
            "lavoratori.tipo_rapporto_lavorativo",
            tipo,
          ),
        ]),
      ),
      tipoLavoro: tipoLavori[0] ?? null,
      ruoliDomestici,
      eta: getAgeFromBirthDate(selectedWorkerRow.data_di_nascita),
      anniEsperienzaColf:
        typeof selectedWorkerRow.anni_esperienza_colf === "number"
          ? selectedWorkerRow.anni_esperienza_colf
          : 0,
      anniEsperienzaBabysitter:
        typeof selectedWorkerRow.anni_esperienza_babysitter === "number"
          ? selectedWorkerRow.anni_esperienza_babysitter
          : 0,
      statoLavoratore,
      disponibilita,
      isQualified: statusFlags.isQualified,
      isIdoneo: statusFlags.isIdoneo,
      isCertificato: statusFlags.isCertificato,
    };
  }, [lookupColorsByDomain, selectedCard, selectedWorkerRow]);

  const applyUpdatedWorkerRow = React.useCallback((row: LavoratoreRecord) => {
    setSelectedWorkerRow(row);
  }, []);

  const applyUpdatedWorkerAddress = React.useCallback(
    (row: Record<string, unknown>) => {
      setSelectedWorkerAddress(row);
    },
    [],
  );

  const applyUpdatedWorkerExperience = React.useCallback(
    (row: EsperienzaLavoratoreRecord) => {
      setSelectedWorkerExperiences((current) =>
        current.map((item) => (item.id === row.id ? row : item)),
      );
    },
    [],
  );

  const appendCreatedWorkerExperience = React.useCallback(
    (row: EsperienzaLavoratoreRecord) => {
      setSelectedWorkerExperiences((current) => [row, ...current]);
    },
    [],
  );

  const removeWorkerExperience = React.useCallback((experienceId: string) => {
    setSelectedWorkerExperiences((current) =>
      current.filter((item) => item.id !== experienceId),
    );
  }, []);

  const applyUpdatedWorkerReference = React.useCallback(
    (row: ReferenzaLavoratoreRecord) => {
      setSelectedWorkerReferences((current) =>
        current.map((item) => (item.id === row.id ? row : item)),
      );
    },
    [],
  );

  const appendCreatedWorkerReference = React.useCallback(
    (row: ReferenzaLavoratoreRecord) => {
      setSelectedWorkerReferences((current) => [row, ...current]);
    },
    [],
  );

  const upsertSelectedWorkerDocument = React.useCallback(
    (row: DocumentoLavoratoreRecord) => {
      setSelectedWorkerDocuments((current) => {
        const existingIndex = current.findIndex((item) => item.id === row.id);
        if (existingIndex === -1) {
          return [row, ...current];
        }

        return current.map((item) => (item.id === row.id ? row : item));
      });
    },
    [],
  );

  const {
    availabilityPayload,
    availabilityReadOnlyRows,
    isEditingAvailability,
    setIsEditingAvailability,
    isEditingJobSearch,
    setIsEditingJobSearch,
    isEditingExperience,
    setIsEditingExperience,
    isEditingSkills,
    setIsEditingSkills,
    isEditingDocuments,
    setIsEditingDocuments,
    updatingAvailability,
    updatingJobSearch,
    updatingExperience,
    updatingSkills,
    updatingDocuments,
    availabilityDraft,
    setAvailabilityDraft,
    jobSearchDraft,
    setJobSearchDraft,
    experienceDraft,
    setExperienceDraft,
    skillsDraft,
    setSkillsDraft,
    documentsDraft,
    setDocumentsDraft,
    resolvedIban,
    handleAvailabilityMatrixChange,
    saveWorkerAvailability,
    patchJobSearchField,
    patchExperienceRecord,
    createExperienceRecord,
    deleteExperienceRecord,
    patchReferenceRecord,
    createReferenceRecord,
    patchSkillsField,
    patchDocumentField,
    patchSelectedWorkerField,
    patchWorkerAddressField,
  } = useSelectedWorkerEditor({
    selectedWorkerId,
    selectedWorker,
    selectedWorkerRow,
    selectedWorkerAddress,
    lookupColorsByDomain,
    setError: setSelectedWorkerError,
    applyUpdatedWorkerRow,
    applyUpdatedWorkerAddress,
    applyUpdatedWorkerExperience,
    appendCreatedWorkerExperience,
    removeWorkerExperience,
    applyUpdatedWorkerReference,
    appendCreatedWorkerReference,
  });

  const { value: dataRitornoPipelineValue, onChange: saveDataRitornoPipeline } = useDebouncedSave(
    asString(selectedWorkerRow?.data_ritorno_disponibilita),
    async (v) => { await patchSelectedWorkerField("data_ritorno_disponibilita", v || null); },
  );
  const { value: documentNaspiValue, onChange: saveDocumentNaspi } = useDebouncedSave(
    asString(selectedWorkerRow?.data_scadenza_naspi),
    async (v) => { await patchDocumentField("data_scadenza_naspi", v || null); },
  );
  const { value: documentIbanValue, onChange: saveDocumentIban } = useDebouncedSave(
    resolvedIban,
    async (v) => { await patchDocumentField("iban", v || null); },
  );
  const { value: documentStripeValue, onChange: saveDocumentStripeAccount } = useDebouncedSave(
    asString(selectedWorkerRow?.id_stripe_account),
    async (v) => { await patchDocumentField("id_stripe_account", v || null); },
  );

  const updateDropTargetColumnId = React.useCallback((next: string | null) => {
    setDropTargetColumnId((current) => (current === next ? current : next));
  }, []);
  const handleOpenWorker = React.useCallback(
    (card: RicercaWorkerSelectionCard) => {
      setSelectedCard(card);
      setIsWorkerOverlayOpen(true);
    },
    [],
  );

  React.useEffect(() => {
    if (!focusSelectionId || loading) return;

    const nextCard =
      columns
        .flatMap((column) => column.cards)
        .find((columnCard) => columnCard.id === focusSelectionId) ?? null;

    if (!nextCard) return;

    setSelectedCard(nextCard);
    setIsWorkerOverlayOpen(true);
  }, [columns, focusSelectionId, loading]);

  const handleCloseWorkerOverlay = React.useCallback(() => {
    setIsWorkerOverlayOpen(false);
    setSelectedCard(null);
  }, []);

  React.useEffect(() => {
    if (selectedWorkerLoading) {
      if (selectedWorkerLoadingToastIdRef.current == null) {
        selectedWorkerLoadingToastIdRef.current =
          toast.loading("Caricamento profilo...");
      }
      return;
    }

    if (selectedWorkerLoadingToastIdRef.current != null) {
      toast.dismiss(selectedWorkerLoadingToastIdRef.current);
      selectedWorkerLoadingToastIdRef.current = null;
    }
  }, [selectedWorkerLoading]);

  React.useEffect(() => {
    return () => {
      if (selectedWorkerLoadingToastIdRef.current != null) {
        toast.dismiss(selectedWorkerLoadingToastIdRef.current);
        selectedWorkerLoadingToastIdRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (!selectedCard || !isWorkerOverlayOpen) {
      setSelectedWorkerRow(null);
      setSelectedWorkerExperiences([]);
      setSelectedWorkerDocuments([]);
      setSelectedWorkerReferences([]);
      setSelectedSelectionRow(null);
      setSelectedWorkerLoading(false);
      setLoadingSelectedWorkerExperiences(false);
      setLoadingSelectedWorkerDocuments(false);
      setLoadingSelectedWorkerReferences(false);
      setSelectedWorkerError(null);
      return;
    }

    let isCancelled = false;
    const workerId = selectedCard.worker.id;
    const selectionId = selectedCard.id;

    async function loadWorkerRow() {
      setSelectedWorkerLoading(true);
      setLoadingSelectedWorkerExperiences(true);
      setLoadingSelectedWorkerDocuments(true);
      setLoadingSelectedWorkerReferences(true);
      setSelectedWorkerError(null);

      try {
        const [scheda, lookupResult] = await Promise.all([
          fetchRicercaWorkerScheda(workerId, selectionId),
          fetchLookupValues(),
        ]);

        const row = scheda.worker;
        const selectionRow = scheda.selezione;
        const addressRows = scheda.indirizzi as Record<string, unknown>[];
        const residenceAddressRow =
          addressRows.find(
            (address) =>
              normalizeToken(asString(address.tipo_indirizzo)) === "residenza",
          ) ??
          addressRows[0];
        if (isCancelled) return;
        setSelectedWorkerAddress(residenceAddressRow ?? null);
        setSelectedWorkerRow(
          row
            ? mergeWorkerResidenceAddress(
                row as LavoratoreRecord,
                residenceAddressRow,
              )
            : null,
        );
        setSelectedSelectionRow(selectionRow ?? null);
        setLookupOptionsByDomain(normalizeLookupOptions(lookupResult.rows));
        setLookupColorsByDomain(normalizeLookupColors(lookupResult.rows));
        setSelectedWorkerExperiences(
          scheda.esperienze as typeof selectedWorkerExperiences,
        );
        setSelectedWorkerDocuments(
          scheda.documenti as typeof selectedWorkerDocuments,
        );
        setSelectedWorkerReferences(
          scheda.referenze as typeof selectedWorkerReferences,
        );
      } catch (error) {
        if (isCancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setSelectedWorkerError(message || "Errore caricamento profilo");
        setSelectedWorkerRow(null);
        setSelectedWorkerExperiences([]);
        setSelectedWorkerDocuments([]);
        setSelectedWorkerReferences([]);
        setSelectedSelectionRow(null);
      } finally {
        if (!isCancelled) {
          setSelectedWorkerLoading(false);
          setLoadingSelectedWorkerExperiences(false);
          setLoadingSelectedWorkerDocuments(false);
          setLoadingSelectedWorkerReferences(false);
        }
      }
    }

    void loadWorkerRow();

    return () => {
      isCancelled = true;
    };
  }, [selectedCard, isWorkerOverlayOpen]);

  React.useEffect(() => {
    if (!selectedWorkerId || !isWorkerOverlayOpen) {
      setRelatedActiveSearches({ direct: [], other: [] });
      setLoadingRelatedActiveSearches(false);
      return;
    }

    let isCancelled = false;
    const workerId = selectedWorkerId;

    async function loadRelatedActiveSearches() {
      setLoadingRelatedActiveSearches(true);

      try {
        const workerSelections = await fetchAllSelectionsForWorker(workerId);
        if (isCancelled) return;

        const filteredSelections = workerSelections.filter((selection) => {
          const selectionId = asString(selection.id);
          const selectionProcessId = asString(selection.processo_matching_id);

          return Boolean(selectionProcessId) &&
            selectionId !== selectedCard?.id &&
            selectionProcessId !== processId;
        });

        const processIds = Array.from(
          new Set(
            filteredSelections
              .map((selection) => asString(selection.processo_matching_id))
              .filter((value): value is string => Boolean(value)),
          ),
        );

        const processRows = await fetchRelatedProcessesByIds(processIds);
        if (isCancelled) return;

        const processRowsById = new Map(
          processRows
            .map((row) => {
              const rowId = asString(row.id);
              if (!rowId) return null;
              return [rowId, row] as const;
            })
            .filter(
              (entry): entry is readonly [string, Record<string, unknown>] =>
                Boolean(entry),
            ),
        );

        const familyIds = Array.from(
          new Set(
            processRows
              .map((row) => asString(row.famiglia_id))
              .filter((value): value is string => Boolean(value)),
          ),
        );

        const familyRows = await fetchRelatedFamiliesByIds(familyIds);
        if (isCancelled) return;

        const familyRowsById = new Map(
          familyRows
            .map((row) => {
              const rowId = asString(row.id);
              if (!rowId) return null;
              return [rowId, row] as const;
            })
            .filter(
              (entry): entry is readonly [string, Record<string, unknown>] =>
                Boolean(entry),
            ),
        );

        const seenProcessIds = new Set<string>();
        const nextDirectItems: RelatedActiveSearchItem[] = [];
        const nextOtherItems: RelatedActiveSearchItem[] = [];

        for (const selection of filteredSelections) {
          const selectionId = asString(selection.id);
          const selectionProcessId = asString(selection.processo_matching_id);
          if (!selectionId || !selectionProcessId) continue;
          if (seenProcessIds.has(selectionProcessId)) continue;

          const processRow = processRowsById.get(selectionProcessId);
          if (!processRow) continue;

          const familyRow = familyRowsById.get(asString(processRow.famiglia_id) ?? "");
          const recruiterId = asString(processRow.recruiter_ricerca_e_selezione_id);

          const nextItem: RelatedActiveSearchItem = {
            selectionId,
            processId: selectionProcessId,
            familyName: formatRelatedFamilyName(familyRow),
            ricercaLabel: formatRelatedSearchLabel(processRow),
            recruiterLabel: recruiterId
              ? recruiterLabelsById.get(recruiterId) ?? "Recruiter non assegnato"
              : "Recruiter non assegnato",
            statoSelezione: asString(selection.stato_selezione) || "-",
            statoRicerca: asString(processRow.stato_res) || "-",
            orarioDiLavoro: asString(processRow.orario_di_lavoro) || "-",
            zona: formatRelatedZona(processRow),
            appunti: asString(selection.note_selezione) || "",
          };

          if (isDirectInvolvementSelection(selection)) {
            nextDirectItems.push(nextItem);
          } else {
            nextOtherItems.push(nextItem);
          }
          seenProcessIds.add(selectionProcessId);
        }

        if (isCancelled) return;
        setRelatedActiveSearches({ direct: nextDirectItems, other: nextOtherItems });
      } catch {
        if (isCancelled) return;
        setRelatedActiveSearches({ direct: [], other: [] });
      } finally {
        if (!isCancelled) {
          setLoadingRelatedActiveSearches(false);
        }
      }
    }

    void loadRelatedActiveSearches();

    return () => {
      isCancelled = true;
    };
  }, [
    isWorkerOverlayOpen,
    processId,
    recruiterLabelsById,
    selectedCard?.id,
    selectedWorkerId,
  ]);

  const loadOtherActiveSelectionDetails = React.useCallback(
    (workerId: string) => {
      const cached = otherSelectionDetailsCacheRef.current.get(workerId);
      if (cached) return cached;

      const promise = (async () => {
        const workerSelections = await fetchAllSelectionsForWorker(workerId);
        const filteredSelections = workerSelections.filter((selection) => {
          const selectionProcessId = asString(selection.processo_matching_id);

          return Boolean(selectionProcessId) && selectionProcessId !== processId;
        });

        const processIds = Array.from(
          new Set(
            filteredSelections
              .map((selection) => asString(selection.processo_matching_id))
              .filter((value): value is string => Boolean(value)),
          ),
        );
        const processRows = await fetchRelatedProcessesByIds(processIds);
        const processRowsById = new Map(
          processRows
            .map((row) => {
              const rowId = asString(row.id);
              if (!rowId) return null;
              return [rowId, row] as const;
            })
            .filter(
              (entry): entry is readonly [string, Record<string, unknown>] =>
                Boolean(entry),
            ),
        );
        const familyIds = Array.from(
          new Set(
            processRows
              .map((row) => asString(row.famiglia_id))
              .filter((value): value is string => Boolean(value)),
          ),
        );
        const familyRows = await fetchRelatedFamiliesByIds(familyIds);
        const familyRowsById = new Map(
          familyRows
            .map((row) => {
              const rowId = asString(row.id);
              if (!rowId) return null;
              return [rowId, row] as const;
            })
            .filter(
              (entry): entry is readonly [string, Record<string, unknown>] =>
                Boolean(entry),
            ),
        );
        const seenProcessIds = new Set<string>();
        const details: WorkerOtherSelectionSummaryItem[] = [];

        for (const selection of filteredSelections) {
          const selectionProcessId = asString(selection.processo_matching_id);
          if (!selectionProcessId || seenProcessIds.has(selectionProcessId)) {
            continue;
          }

          const processRow = processRowsById.get(selectionProcessId);
          if (!processRow || !isDirectInvolvementSelection(selection)) continue;

          const familyRow = familyRowsById.get(
            asString(processRow.famiglia_id) ?? "",
          );
          const recruiterId = asString(
            processRow.recruiter_ricerca_e_selezione_id,
          );

          details.push({
            id: selectionProcessId,
            familyName: formatRelatedFamilyName(familyRow),
            ricercaLabel: formatRelatedSearchLabel(processRow),
            recruiterLabel: recruiterId
              ? recruiterLabelsById.get(recruiterId) ?? "Recruiter non assegnato"
              : "Recruiter non assegnato",
            statoSelezione: asString(selection.stato_selezione) || "-",
            statoRicerca: asString(processRow.stato_res) || "-",
            orarioDiLavoro: asString(processRow.orario_di_lavoro) || "-",
            zona: formatRelatedZona(processRow),
            appunti: asString(selection.note_selezione) || "",
          });
          seenProcessIds.add(selectionProcessId);
        }

        return details;
      })();

      otherSelectionDetailsCacheRef.current.set(workerId, promise);
      return promise;
    },
    [processId, recruiterLabelsById],
  );

  const handleOpenRelatedSearchCard = React.useCallback(
    (nextProcessId: string, nextSelectionId: string) => {
      onOpenRelatedSearch?.(nextProcessId, nextSelectionId);
    },
    [onOpenRelatedSearch],
  );

  React.useEffect(() => {
    setFamilyAddressDraft({
      province: card.indirizzoProvaProvincia ?? "-",
      cap: card.indirizzoProvaCap ?? "-",
      address: card.indirizzoProvaVia ?? "-",
      street: card.indirizzoProvaVia ?? "-",
      civicNumber: card.indirizzoProvaCivico ?? "-",
      city: card.indirizzoProvaComune ?? "-",
      intercom: card.indirizzoProvaCitofono ?? "-",
      note: card.indirizzoProvaNote ?? "-",
    });
  }, [
    card.indirizzoProvaCap,
    card.indirizzoProvaCitofono,
    card.indirizzoProvaCivico,
    card.indirizzoProvaComune,
    card.indirizzoProvaNote,
    card.indirizzoProvaProvincia,
    card.indirizzoProvaVia,
  ]);

  const handleDropToColumn = React.useCallback(
    (columnId: string, droppedSelectionId: string | null) => {
      const selectionId = droppedSelectionId || draggingSelectionId;
      setDropTargetColumnId(null);
      setDraggingSelectionId(null);
      setDraggingFromColumnId(null);
      if (!selectionId) return;
      void moveCard(selectionId, columnId);
    },
    [draggingSelectionId, moveCard],
  );

  const handleDragLeaveColumn = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const stillInside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      if (stillInside) return;
      updateDropTargetColumnId(null);
    },
    [updateDropTargetColumnId],
  );

  const patchSelectedSelectionField = React.useCallback(
    async (field: string, value: unknown) => {
      if (!selectedCard?.id) return;

      setUpdatingSelectionDetails(true);
      setSelectedWorkerError(null);

      try {
        const previousSelectionRow = selectedSelectionRow;
        const response = await updateRecord(
          "selezioni_lavoratori",
          selectedCard.id,
          {
            [field]: value,
          },
        );
        await invokeWorkerAvailabilityForIds(
          getSelectionAvailabilityWorkerIds(previousSelectionRow, {
            [field]: value,
          }),
        );

        setSelectedSelectionRow((current) => {
          const base =
            current && typeof current === "object"
              ? current
              : ({ id: selectedCard.id } as Record<string, unknown>);
          return {
            ...base,
            ...(response.row as Record<string, unknown>),
          };
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setSelectedWorkerError(message || "Errore aggiornamento selezione");
      } finally {
        setUpdatingSelectionDetails(false);
      }
    },
    [selectedCard, selectedSelectionRow],
  );

  const handleGenerateWorkerSummary = React.useCallback(async () => {
    if (!selectedWorkerId) return;

    setGeneratingWorkerSummary(true);
    setSelectedWorkerError(null);
    const toastId = toast.loading("Generazione riassunto esperienze...");

    try {
      await invokeAiGenerationFunction(
        "generare-lavoratore-riassunto-profilo-breve",
        { id: selectedWorkerId },
      );

      const result = await fetchLavoratoriByIds([selectedWorkerId]);
      const row = result.rows[0] as LavoratoreRecord | undefined;
      if (row) {
        applyUpdatedWorkerRow(row);
      }
      toast.success("Riassunto esperienze generato", { id: toastId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSelectedWorkerError(message || "Errore generazione riassunto");
      toast.error("Errore generazione riassunto", {
        id: toastId,
        description: message,
      });
    } finally {
      setGeneratingWorkerSummary(false);
    }
  }, [applyUpdatedWorkerRow, selectedWorkerId]);

  const handleGenerateSelectionFeedback = React.useCallback(async () => {
    if (!selectedCard?.id) return null;

    setGeneratingSelectionFeedback(true);
    setSelectedWorkerError(null);
    const toastId = toast.loading("Generazione feedback Baze...");

    try {
      const functionResult = await invokeAiGenerationFunction(
        "generare-selezioni-lavoratori-messaggio-famiglia",
        { id: selectedCard.id },
      );
      const generatedFromFunction = extractGeneratedMessage(functionResult);

      const fetchSelection = () =>
        fetchSelezioniLookup({ ids: [selectedCard.id] });
      let result = await fetchSelection();
      let row = result.rows[0] ?? null;
      let generatedText =
        asString(row?.messaggio_famiglia_selezione_lavoratore) ||
        generatedFromFunction;

      if (!generatedText) {
        await waitFor(500);
        result = await fetchSelection();
        row = result.rows[0] ?? null;
        generatedText = asString(row?.messaggio_famiglia_selezione_lavoratore);
      }

      if (row) {
        setSelectedSelectionRow({
          ...row,
          ...(generatedText
            ? { messaggio_famiglia_selezione_lavoratore: generatedText }
            : {}),
        });
      } else if (generatedText) {
        setSelectedSelectionRow((current) =>
          current
            ? {
                ...current,
                messaggio_famiglia_selezione_lavoratore: generatedText,
              }
            : current,
        );
      }
      toast.success("Feedback Baze generato", { id: toastId });
      return generatedText;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSelectedWorkerError(message || "Errore generazione feedback");
      toast.error("Errore generazione feedback", {
        id: toastId,
        description: message,
      });
      return null;
    } finally {
      setGeneratingSelectionFeedback(false);
    }
  }, [selectedCard?.id]);

  const handleMoveSelectionStatus = React.useCallback(
    async (value: string) => {
      if (!selectedCard?.id) return;
      await moveCard(selectedCard.id, value);
      setSelectedSelectionRow((current) =>
        current
          ? {
              ...current,
              stato_selezione: value,
            }
          : current,
      );
      setSelectedCard((current) =>
        current
          ? {
              ...current,
              status: value,
            }
          : current,
      );
    },
    [moveCard, selectedCard],
  );

  const patchSelectedProcessAddressField = React.useCallback(
    async (
      field:
        | "indirizzo_prova_provincia"
        | "indirizzo_prova_cap"
        | "indirizzo_prova_via"
        | "indirizzo_prova_civico"
        | "indirizzo_prova_comune"
        | "indirizzo_prova_citofono"
        | "indirizzo_prova_note",
      value: unknown,
    ) => {
      if (!processId) return;
      setUpdatingFamilyAddress(true);
      setSelectedWorkerError(null);

      try {
        await updateRecord("processi_matching", processId, { [field]: value });
        setFamilyAddressDraft((current) => {
          if (field === "indirizzo_prova_provincia") {
            return { ...current, province: String(value ?? "").trim() || "-" };
          }
          if (field === "indirizzo_prova_cap") {
            return { ...current, cap: String(value ?? "").trim() || "-" };
          }
          if (field === "indirizzo_prova_via") {
            return { ...current, address: String(value ?? "").trim() || "-" };
          }
          if (field === "indirizzo_prova_civico") {
            return { ...current, civicNumber: String(value ?? "").trim() || "-" };
          }
          if (field === "indirizzo_prova_comune") {
            return { ...current, city: String(value ?? "").trim() || "-" };
          }
          if (field === "indirizzo_prova_citofono") {
            return { ...current, intercom: String(value ?? "").trim() || "-" };
          }
          return { ...current, note: String(value ?? "").trim() || "-" };
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setSelectedWorkerError(message || "Errore aggiornamento indirizzo famiglia");
      } finally {
        setUpdatingFamilyAddress(false);
      }
    },
    [processId],
  );

  React.useEffect(() => {
    if (!isAddWorkerDialogOpen) {
      setWorkerSearchQuery("");
      setWorkerSearchResults([]);
      setSelectedWorkerToAdd(null);
      setManualInsertReason("");
      setIsWorkerSearchLoading(false);
      return;
    }

    const normalizedQuery = workerSearchQuery.trim();
    if (normalizedQuery.length < 2) {
      setWorkerSearchResults([]);
      setIsWorkerSearchLoading(false);
      return;
    }

    let cancelled = false;
    setIsWorkerSearchLoading(true);

    const timeoutId = window.setTimeout(() => {
      const tokens = tokenizeWorkerSearchQuery(normalizedQuery);
      const searchTerms = Array.from(
        new Set([normalizedQuery, ...tokens].filter(Boolean)),
      );
      void Promise.all(
        searchTerms.map((searchTerm) =>
          fetchLavoratoriSearch(searchTerm, ADD_WORKER_SEARCH_FETCH_LIMIT),
        ),
      )
        .then((results) => {
          if (cancelled) return;
          const rowsById = new Map<string, Record<string, unknown>>();
          for (const result of results) {
            for (const row of result.rows ?? []) {
              if (!row || typeof row !== "object") continue;
              const rowId = asString(row.id);
              if (!rowId || rowsById.has(rowId)) continue;
              rowsById.set(rowId, row as Record<string, unknown>);
            }
          }

          const rows = Array.from(rowsById.values())
            .filter((row) => workerMatchesCombinedQuery(row, tokens))
            .sort((left, right) => {
              const scoreDelta =
                scoreWorkerSearchResult(left, normalizedQuery) -
                scoreWorkerSearchResult(right, normalizedQuery);
              if (scoreDelta !== 0) return scoreDelta;
              return buildWorkerSearchHaystack(left).localeCompare(
                buildWorkerSearchHaystack(right),
                "it",
              );
            })
            .slice(0, ADD_WORKER_SEARCH_LIMIT);

          setWorkerSearchResults(rows);
        })
        .catch(() => {
          if (cancelled) return;
          setWorkerSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsWorkerSearchLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isAddWorkerDialogOpen, workerSearchQuery]);

  const handleRunSmartMatching = React.useCallback(async () => {
    if (!processId) {
      toast.error("Il processo non ha id");
      return;
    }
    setIsRunningSmartMatching(true);
    try {
      const result = await runSmartMatchingForwardPreview(processId);
      const selectedCount =
        typeof result.selected_count === "number"
          ? result.selected_count
          : result.selected_workers?.length ?? 0;

      toast.success(
        `Smart Matching completato: ${selectedCount} ${
          selectedCount === 1 ? "lavoratore trovato" : "lavoratori trovati"
        }`,
      );
      refresh();
    } catch (caughtError) {
      toast.error(
        caughtError instanceof Error
          ? caughtError.message
          : "Errore avvio Smart Matching",
      );
    } finally {
      setIsRunningSmartMatching(false);
    }
  }, [processId, refresh]);

  const handleAddWorkerToSearch = React.useCallback(async () => {
    const workerId =
      typeof selectedWorkerToAdd?.id === "string" ||
      typeof selectedWorkerToAdd?.id === "number"
        ? String(selectedWorkerToAdd.id)
        : null;
    const reason = manualInsertReason.trim();

    if (!processId || !workerId) {
      toast.error("Seleziona un lavoratore");
      return;
    }
    if (!reason) {
      toast.error("La motivazione è obbligatoria");
      return;
    }

    setIsSubmittingAddWorker(true);
    try {
      const existingSelections = await fetchSelezioniLookup({
        processoIds: [processId],
        lavoratoreIds: [workerId],
      });

      if ((existingSelections.rows ?? []).length > 0) {
        throw new Error("Lavoratore già presente in questa ricerca");
      }

      await createRecord("selezioni_lavoratori", {
        processo_matching_id: processId,
        lavoratore_id: workerId,
        stato_selezione: "Prospetto",
        motivo_inserimento_manuale: reason,
        source: "manuale",
      });
      await invokeWorkerAvailabilityForIds(
        getSelectionAvailabilityWorkerIds(null, {
          processo_matching_id: processId,
          lavoratore_id: workerId,
          stato_selezione: "Prospetto",
        }),
      );

      setIsAddWorkerDialogOpen(false);
      refresh();
      toast.success("Lavoratore aggiunto in Prospetto");
    } catch (caughtError) {
      toast.error(
        caughtError instanceof Error
          ? caughtError.message
          : "Errore aggiungendo il lavoratore",
      );
    } finally {
      setIsSubmittingAddWorker(false);
    }
  }, [processId, manualInsertReason, selectedWorkerToAdd, refresh]);

  const totalWorkers = React.useMemo(
    () =>
      columns.reduce((sum, column) => sum + column.cards.length, 0),
    [columns],
  );

  const filteredColumns = React.useMemo(() => {
    const mappedColumns = columns.map((column) => ({
      ...column,
      cards: column.cards.filter((cardItem) => {
        const worker = cardItem.worker;
        return matchesSearchQuery(
          [
            cardItem.id,
            worker.id,
            worker.nomeCompleto,
            worker.telefono,
            worker.locationLabel,
            worker.tipoRuolo,
            worker.tipoLavoro,
            cardItem.status,
          ],
          searchQuery,
        );
      }),
    }));

    return mappedColumns;
  }, [columns, searchQuery]);

  return (
    <div className={cn("relative flex min-h-0 flex-col", className)}>
      <SectionHeader className="px-0">
        <SectionHeader.Title
          size="nested"
          subtitle={`${totalWorkers} ${
            totalWorkers === 1 ? "lavoratore" : "lavoratori"
          }`}
        >
          Lavoratori per questa ricerca
        </SectionHeader.Title>
        <SectionHeader.Actions>
          <Button
            type="button"
            variant="outline"
            disabled={isRunningSmartMatching}
            onClick={() => void handleRunSmartMatching()}
          >
            {isRunningSmartMatching ? (
              <LoaderCircleIcon className="animate-spin" />
            ) : (
              <SparklesIcon />
            )}
            {isRunningSmartMatching ? "Calcolo in corso..." : "Smart Matching"}
          </Button>
          <Button
            type="button"
            onClick={() => setIsAddWorkerDialogOpen(true)}
          >
            <PlusIcon />
            Aggiungi
          </Button>
        </SectionHeader.Actions>
        <SectionHeader.Toolbar>
          <div className="min-w-0 flex-1 max-w-105">
            <SearchInput
              placeholder="Cerca candidato..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onClear={() => setSearchQuery("")}
            />
          </div>
        </SectionHeader.Toolbar>
      </SectionHeader>

      {loading ? (
        <span className="text-muted-foreground px-4 pt-3 text-xs">
          Caricamento...
        </span>
      ) : null}

      {error ? (
        <div className="mx-4 mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Errore caricamento pipeline lavoratori: {error}
        </div>
      ) : null}

      <div className="scrollbar-visible min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-4 pt-4 [scrollbar-gutter:stable]">
        <div className="flex h-full min-h-0 min-w-max gap-4">
          {filteredColumns.map((column) => (
            <WorkerPipelineColumn
              key={column.id}
              column={column}
              isDropTarget={
                dropTargetColumnId === column.id ||
                dropTargetColumnId?.startsWith(`${column.id}::`) === true
              }
              activeGroupDropId={
                dropTargetColumnId?.startsWith(`${column.id}::`)
                  ? dropTargetColumnId
                  : null
              }
              draggingSelectionId={draggingSelectionId}
              draggingFromColumnId={draggingFromColumnId}
              onDragEnterColumn={updateDropTargetColumnId}
              onDragOverColumn={updateDropTargetColumnId}
              onDragLeaveColumn={handleDragLeaveColumn}
              onDropToColumn={handleDropToColumn}
              onDragStartCard={(selectionId, sourceColumnId) => {
                setDraggingSelectionId(selectionId);
                setDraggingFromColumnId(sourceColumnId);
              }}
              onDragEndCard={() => {
                setDraggingSelectionId(null);
                setDraggingFromColumnId(null);
                setDropTargetColumnId(null);
              }}
              onOpenWorker={handleOpenWorker}
              onLoadOtherActiveSelectionDetails={loadOtherActiveSelectionDetails}
            />
          ))}
        </div>
      </div>

      {isWorkerOverlayOpen ? (
        <div className="bg-background absolute inset-0 z-50 flex flex-col overflow-y-auto animate-in fade-in-0">
          <div className="bg-card flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
            <Breadcrumb className="min-w-0">
              <BreadcrumbItem asChild>
                <button
                  type="button"
                  onClick={handleCloseWorkerOverlay}
                  className="cursor-pointer"
                >
                  Ricerca
                </button>
              </BreadcrumbItem>
              <BreadcrumbItem asChild>
                <button
                  type="button"
                  onClick={handleCloseWorkerOverlay}
                  className="cursor-pointer truncate"
                >
                  {card.nomeFamiglia}
                </button>
              </BreadcrumbItem>
              <BreadcrumbItem current>
                {selectedWorker?.nomeCompleto ?? "Lavoratore"}
              </BreadcrumbItem>
            </Breadcrumb>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleCloseWorkerOverlay}
            >
              <XIcon />
            </Button>
          </div>

          {selectedWorkerError ? (
            <div className="mx-4 mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              Errore caricamento lavoratore: {selectedWorkerError}
            </div>
          ) : null}

          {selectedCard && selectedWorkerRow && selectedSelectionRow ? (
            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] 2xl:grid-cols-[minmax(0,1fr)_minmax(480px,0.85fr)]">
              <div className="scrollbar-hidden min-w-0 overflow-y-auto xl:border-r xl:border-border">
                <div className="space-y-4 p-4">
                  <DetailSectionBlock
                    title="Profilo lavoratore"
                    icon={<UserIcon className="size-4" />}
                    collapsible
                  >
                    <WorkerProfileHeader
                      key={selectedWorkerRow?.id ?? "__empty__"}
                      worker={selectedWorker ?? selectedCard.worker}
                      workerRow={{ ...selectedWorkerRow, data_ritorno_disponibilita: dataRitornoPipelineValue }}
                      statoLavoratoreOptions={
                        lookupOptionsByDomain.get("lavoratori.stato_lavoratore") ??
                        []
                      }
                      disponibilitaOptions={
                        lookupOptionsByDomain.get("lavoratori.disponibilita") ?? []
                      }
                      motivazioniOptions={
                        lookupOptionsByDomain.get(
                          "lavoratori.motivazione_non_idoneo",
                        ) ?? []
                      }
                      sessoOptions={
                        lookupOptionsByDomain.get("lavoratori.sesso") ?? []
                      }
                      nazionalitaOptions={
                        lookupOptionsByDomain.get("lavoratori.nazionalita") ?? []
                      }
                      onPatchField={(field, value) =>
                        patchSelectedWorkerField(field, value)
                      }
                      onStatoLavoratoreChange={(value) =>
                        patchSelectedWorkerField("stato_lavoratore", value)
                      }
                      onDisponibilitaChange={(value) =>
                        patchSelectedWorkerField("disponibilita", value)
                      }
                      onDataRitornoDisponibilitaChange={saveDataRitornoPipeline}
                      onMotivazioneChange={(value) =>
                        patchSelectedWorkerField(
                          "motivazione_non_idoneo",
                          value ? [value] : [],
                        )
                      }
                    />
                  </DetailSectionBlock>

                  <DetailSectionBlock
                    title="Scheda colloquio"
                    icon={<ClipboardListIcon className="size-4" />}
                    collapsible
                    action={(() => {
                      const statoOptions =
                        lookupOptionsByDomain.get(
                          "selezioni_lavoratori.stato_selezione",
                        ) ?? [];
                      const currentStato = asString(
                        selectedSelectionRow.stato_selezione,
                      );
                      return (
                        <Select
                          value={getLookupSelectValue(currentStato, statoOptions, "none")}
                          onValueChange={(value) => {
                            if (!value || value === "none") return;
                            void handleMoveSelectionStatus(value);
                          }}
                          disabled={updatingSelectionDetails}
                        >
                          <SelectTrigger className="h-8 w-45 text-xs">
                            <SelectValue placeholder="Stato selezione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              Nessuno stato
                            </SelectItem>
                            {statoOptions.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    })()}
                  >
                    <SchedaColloquioPanel
                      key={asString(selectedSelectionRow?.id) || "__empty__"}
                      selectionRow={selectedSelectionRow}
                      nonSelezionatoOptions={
                        lookupOptionsByDomain.get(
                          "selezioni_lavoratori.motivo_non_selezionato",
                        ) ?? []
                      }
                      noMatchOptions={
                        lookupOptionsByDomain.get(
                          "selezioni_lavoratori.motivo_no_match",
                        ) ?? []
                      }
                      isGeneratingFeedback={generatingSelectionFeedback}
                      onGenerateFeedback={handleGenerateSelectionFeedback}
                      onPatchField={patchSelectedSelectionField}
                    />
                  </DetailSectionBlock>
                </div>
              </div>

              <div className="scrollbar-hidden min-w-0 overflow-y-auto border-t border-border xl:border-t-0">
                <div className="space-y-6 p-4">
                  <WorkerPipelineSummaryCards
                    key={selectedWorkerRow?.id ?? "__empty__"}
                    workerRow={selectedWorkerRow}
                    selectionRow={selectedSelectionRow}
                    relatedActiveSearches={relatedActiveSearches}
                    relatedActiveSearchesLoading={loadingRelatedActiveSearches}
                    onOpenRelatedSearch={handleOpenRelatedSearchCard}
                    onPatchWorkerField={patchSelectedWorkerField}
                    onPatchWorkerAddress={patchWorkerAddressField}
                    onPatchProcessField={patchSelectedProcessAddressField}
                    workerVia={asString(selectedWorkerAddress?.via) || null}
                    workerCivico={asString(selectedWorkerAddress?.civico) || null}
                    workerCap={asString(selectedWorkerAddress?.cap) || null}
                    workerCitta={asString(selectedWorkerAddress?.citta) || null}
                    workerProvincia={asString(selectedWorkerAddress?.provincia_sigla) || null}
                    workerCitofono={asString(selectedWorkerAddress?.citofono) || null}
                    processWeeklyHours={card.oreSettimana}
                    familyAddress={familyAddressDraft.address}
                    familyCap={familyAddressDraft.cap}
                    familyProvince={familyAddressDraft.province}
                    familyStreet={familyAddressDraft.street}
                    familyCivicNumber={familyAddressDraft.civicNumber}
                    familyCity={familyAddressDraft.city}
                    familyIntercom={familyAddressDraft.intercom}
                    familyAddressNote={familyAddressDraft.note}
                    familyAvailabilityJson={card.familyAvailabilityJson}
                    familyWorkSchedule={card.orarioDiLavoro}
                    familyWeeklyFrequency={card.giorniSettimana}
                    provinceOptions={
                      lookupOptionsByDomain.get(
                        "processi_matching.indirizzo_prova_provincia",
                      ) ??
                      lookupOptionsByDomain.get("processi_matching.provincia") ??
                      lookupOptionsByDomain.get("lavoratori.provincia") ??
                      []
                    }
                    updatingProcessAddress={updatingFamilyAddress}
                    availabilityTitleMeta={
                      formatAvailabilityComputedAt(availabilityPayload?.computed_at) ?? "-"
                    }
                    availabilityReadOnlyRows={availabilityReadOnlyRows}
                    lookupOptionsByDomain={lookupOptionsByDomain}
                    lookupColorsByDomain={lookupColorsByDomain}
                    experienceTipoLavoroOptions={
                      lookupOptionsByDomain.get(
                        "esperienze_lavoratori.tipo_lavoro",
                      ) ??
                      lookupOptionsByDomain.get(
                        "lavoratori.tipo_lavoro_domestico",
                      ) ??
                      []
                    }
                    experienceTipoRapportoOptions={
                      lookupOptionsByDomain.get(
                        "esperienze_lavoratori.tipo_rapporto",
                      ) ?? []
                    }
                    tipoLavoroOptions={
                      lookupOptionsByDomain.get(
                        "lavoratori.tipo_lavoro_domestico",
                      ) ?? []
                    }
                    tipoRapportoOptions={
                      lookupOptionsByDomain.get(
                        "lavoratori.tipo_rapporto_lavorativo",
                      ) ?? []
                    }
                    referenceStatusOptions={
                      lookupOptionsByDomain.get(
                        "referenze_lavoratori.referenza_verificata",
                      ) ?? []
                    }
                    experiences={selectedWorkerExperiences}
                    experiencesLoading={loadingSelectedWorkerExperiences}
                    isGeneratingAiSummary={generatingWorkerSummary}
                    onGenerateAiSummary={handleGenerateWorkerSummary}
                    references={selectedWorkerReferences}
                    referencesLoading={loadingSelectedWorkerReferences}
                    documents={selectedWorkerDocuments}
                    documentsLoading={loadingSelectedWorkerDocuments}
                    isEditingAvailability={isEditingAvailability}
                    onToggleAvailabilityEdit={() =>
                      setIsEditingAvailability((current) => !current)
                    }
                    updatingAvailability={updatingAvailability}
                    isEditingJobSearch={isEditingJobSearch}
                    onToggleJobSearchEdit={() =>
                      setIsEditingJobSearch((current) => !current)
                    }
                    updatingJobSearch={updatingJobSearch}
                    jobSearchDraft={jobSearchDraft}
                    funzionamentoBazeOptions={
                      lookupOptionsByDomain.get(
                        "lavoratori.check_accetta_funzionamento_baze",
                      ) ?? []
                    }
                    trasfertaOptions={
                      lookupOptionsByDomain.get(
                        "lavoratori.check_accetta_lavori_con_trasferta",
                      ) ?? []
                    }
                    multipliContrattiOptions={
                      lookupOptionsByDomain.get(
                        "lavoratori.check_accetta_multipli_contratti",
                      ) ?? []
                    }
                    paga9Options={
                      lookupOptionsByDomain.get(
                        "lavoratori.check_accetta_paga_9_euro_netti",
                      ) ?? []
                    }
                    onJobSearchDraftChange={(patch) =>
                      setJobSearchDraft((current) => ({ ...current, ...patch }))
                    }
                    onJobSearchFieldPatch={patchJobSearchField}
                    lavoriAccettabili={readArrayStrings(
                      selectedWorkerRow?.check_lavori_accettabili,
                    )}
                    lavoriAccettabiliOptions={
                      lookupOptionsByDomain.get(
                        "lavoratori.check_lavori_accettabili",
                      ) ?? []
                    }
                    availabilityMatrix={availabilityDraft.matrix}
                    availabilityVincoli={availabilityDraft.vincoli_orari_disponibilita}
                    onLavoriAccettabiliChange={(values) =>
                      void patchSelectedWorkerField(
                        "check_lavori_accettabili",
                        values.length > 0 ? values : null,
                      )
                    }
                    onAvailabilityMatrixChange={(
                      dayField,
                      bandField,
                      checked,
                    ) => handleAvailabilityMatrixChange(dayField, bandField, checked)}
                    onAvailabilityVincoliChange={(value) =>
                      setAvailabilityDraft((current) => ({
                        ...current,
                        vincoli_orari_disponibilita: value,
                      }))
                    }
                    onAvailabilitySave={() => void saveWorkerAvailability()}
                    isEditingExperience={isEditingExperience}
                    onToggleExperienceEdit={() =>
                      setIsEditingExperience((current) => !current)
                    }
                    updatingExperience={updatingExperience}
                    experienceDraft={experienceDraft}
                    onExperienceDraftChange={(patch) =>
                      setExperienceDraft((current) => ({ ...current, ...patch }))
                    }
                    onExperienceFieldSave={(field, value) => {
                      if (field === "situazione_lavorativa_attuale") {
                        void patchSelectedWorkerField(field, value.trim() || null);
                      } else {
                        void patchSelectedWorkerField(field as keyof LavoratoreRecord, parseNumberValue(value));
                      }
                    }}
                    onExperiencePatch={patchExperienceRecord}
                    onExperienceCreate={createExperienceRecord}
                    onExperienceDelete={deleteExperienceRecord}
                    onReferencePatch={patchReferenceRecord}
                    onReferenceCreate={createReferenceRecord}
                    isEditingSkills={isEditingSkills}
                    onToggleSkillsEdit={() =>
                      setIsEditingSkills((current) => !current)
                    }
                    updatingSkills={updatingSkills}
                    skillsDraft={skillsDraft}
                    onSkillsDraftChange={(patch) =>
                      setSkillsDraft((current) => ({ ...current, ...patch }))
                    }
                    onSkillsFieldPatch={patchSkillsField}
                    isEditingDocuments={isEditingDocuments}
                    onToggleDocumentsEdit={() =>
                      setIsEditingDocuments((current) => !current)
                    }
                    updatingDocuments={updatingDocuments}
                    documentsDraft={documentsDraft}
                    resolvedIban={resolvedIban}
                    documentiVerificatiOptions={
                      lookupOptionsByDomain.get(
                        "lavoratori.stato_verifica_documenti",
                      ) ?? []
                    }
                    documentiInRegolaOptions={
                      lookupOptionsByDomain.get("lavoratori.documenti_in_regola") ??
                      []
                    }
                    onDocumentVerificationChange={(value) => {
                      setDocumentsDraft((current) => ({
                        ...current,
                        stato_verifica_documenti: value,
                      }));
                      void patchDocumentField(
                        "stato_verifica_documenti",
                        value || null,
                      );
                    }}
                    onDocumentStatusChange={(value) => {
                      setDocumentsDraft((current) => ({
                        ...current,
                        documenti_in_regola: value,
                      }));
                      void patchDocumentField("documenti_in_regola", value || null);
                    }}
                    naspiInputValue={documentNaspiValue}
                    ibanInputValue={documentIbanValue}
                    stripeAccountInputValue={documentStripeValue}
                    onDocumentNaspiChange={saveDocumentNaspi}
                    onDocumentIbanChange={saveDocumentIban}
                    onDocumentStripeAccountChange={saveDocumentStripeAccount}
                    onDocumentUpsert={upsertSelectedWorkerDocument}
                    onDocumentUploadError={setSelectedWorkerError}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <Dialog
        open={isAddWorkerDialogOpen}
        onOpenChange={(nextOpen) => {
          if (isSubmittingAddWorker) return;
          setIsAddWorkerDialogOpen(nextOpen);
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Aggiungi lavoratore</DialogTitle>
            <DialogDescription>
              Cerca un lavoratore per nome o email e inseriscilo in Prospetto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Cerca lavoratore</p>
              <SearchInput
                value={workerSearchQuery}
                onChange={(event) => setWorkerSearchQuery(event.target.value)}
                onClear={() => setWorkerSearchQuery("")}
                placeholder="Nome, cognome o email"
              />
              {workerSearchQuery.trim().length < 2 ? (
                <p className="text-muted-foreground text-xs">
                  Inserisci almeno 2 caratteri.
                </p>
              ) : isWorkerSearchLoading ? (
                <p className="text-muted-foreground text-xs">
                  Caricamento risultati...
                </p>
              ) : workerSearchResults.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  Nessun lavoratore trovato.
                </p>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-2">
                  {workerSearchResults.map((workerRow) => {
                    const workerId =
                      typeof workerRow.id === "string" ||
                      typeof workerRow.id === "number"
                        ? String(workerRow.id)
                        : "";
                    const workerName =
                      [
                        typeof workerRow.nome === "string"
                          ? workerRow.nome
                          : null,
                        typeof workerRow.cognome === "string"
                          ? workerRow.cognome
                          : null,
                      ]
                        .filter((value): value is string => Boolean(value))
                        .join(" ")
                        .trim() || "Lavoratore";
                    const workerEmail =
                      typeof workerRow.email === "string"
                        ? workerRow.email
                        : null;
                    const isSelected =
                      typeof selectedWorkerToAdd?.id === "string" ||
                      typeof selectedWorkerToAdd?.id === "number"
                        ? String(selectedWorkerToAdd.id) === workerId
                        : false;

                    return (
                      <button
                        key={workerId}
                        type="button"
                        onClick={() => setSelectedWorkerToAdd(workerRow)}
                        className={cn(
                          "w-full rounded-md border px-3 py-2 text-left text-sm transition",
                          isSelected
                            ? "border-emerald-400 bg-emerald-50"
                            : "border-border hover:bg-muted/50",
                        )}
                      >
                        <div className="font-medium">{workerName}</div>
                        {workerEmail ? (
                          <div className="text-muted-foreground text-xs">
                            {workerEmail}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Motivazione</p>
              <Textarea
                value={manualInsertReason}
                onChange={(event) => setManualInsertReason(event.target.value)}
                placeholder="Scrivi perché l'hai selezionato per questa ricerca"
                className="min-h-28"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddWorkerDialogOpen(false)}
              disabled={isSubmittingAddWorker}
            >
              Annulla
            </Button>
            <Button
              type="button"
              onClick={() => void handleAddWorkerToSearch()}
              disabled={
                isSubmittingAddWorker ||
                !selectedWorkerToAdd ||
                !manualInsertReason.trim()
              }
            >
              {isSubmittingAddWorker ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : null}
              Aggiungi lavoratore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
