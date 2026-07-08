import { matchesSearchQuery } from "@/lib/search-utils"
import { asInputValue, asString } from "@/modules/lavoratori/lib"
import type { LavoratoreRecord } from "@/modules/lavoratori/types"
import type {
  RicercaWorkerSelectionCard,
  RicercaWorkerSelectionColumn,
} from "../types"

export function normalizeToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatCardDateTime(value: string | null | undefined) {
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

export function formatRelativeTime(value: string | null | undefined) {
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

export function getCardOperationalTiming(card: RicercaWorkerSelectionCard) {
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

export function buildWorkerResidenceAddress(row: Record<string, unknown> | undefined) {
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

export function mergeWorkerResidenceAddress(
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

export type GroupedColumnGroup = {
  key: string;
  label: string;
  dropStatusId: string;
};

export const CANDIDATI_GROUPS: GroupedColumnGroup[] = [
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

export const ARCHIVIO_GROUPS: GroupedColumnGroup[] = [
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

export const DA_COLLOQUIARE_GROUPS: GroupedColumnGroup[] = [
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

export const COLLOQUI_PROVE_GROUPS: GroupedColumnGroup[] = [
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

export const GROUPED_COLUMN_GROUPS: Record<string, GroupedColumnGroup[]> = {
  __candidati__: CANDIDATI_GROUPS,
  __da_colloquiare__: DA_COLLOQUIARE_GROUPS,
  __archivio__: ARCHIVIO_GROUPS,
  __colloqui_prove__: COLLOQUI_PROVE_GROUPS,
};

export const DEFAULT_BLUE_BADGE_CLASS_NAME =
  "border-blue-200 bg-blue-100 text-blue-700";

export const RELATED_PROCESS_BATCH_SIZE = 150;
export const RELATED_FAMILY_BATCH_SIZE = 150;
export const ADD_WORKER_SEARCH_LIMIT = 8;
export const ADD_WORKER_SEARCH_FETCH_LIMIT = 24;

export function normalizeWorkerSearchText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}@._+-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeWorkerSearchQuery(value: string) {
  return normalizeWorkerSearchText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

export function buildWorkerSearchHaystack(row: Record<string, unknown>) {
  return normalizeWorkerSearchText(
    [
      row.nome,
      row.cognome,
      [row.nome, row.cognome].filter(Boolean).join(" "),
      row.email,
    ].join(" "),
  );
}

export function workerMatchesCombinedQuery(
  row: Record<string, unknown>,
  tokens: string[],
) {
  if (tokens.length === 0) return true;
  const haystack = buildWorkerSearchHaystack(row);
  return tokens.every((token) => haystack.includes(token));
}

export function scoreWorkerSearchResult(row: Record<string, unknown>, query: string) {
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

export function formatRelatedFamilyName(row: Record<string, unknown> | null | undefined) {
  const familyName = [asString(row?.nome), asString(row?.cognome)]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .trim();

  return familyName || "Famiglia senza nome";
}

export function formatRelatedSearchLabel(processRow: Record<string, unknown>) {
  const searchNumber = asInputValue(processRow.numero_ricerca_attivata);
  if (searchNumber) return `Ricerca #${searchNumber}`;

  const relatedProcessId = asString(processRow.id);
  return relatedProcessId ? `Ricerca ${relatedProcessId.slice(0, 8)}` : "Ricerca";
}

export function extractGeneratedMessage(value: unknown): string {
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

export function formatRelatedZona(processRow: Record<string, unknown>) {
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

export function resolveGroupColor(
  column: RicercaWorkerSelectionColumn,
  group: GroupedColumnGroup,
) {
  return column.groupColors?.[normalizeToken(group.key)] ?? null;
}

export function resolveGroupDropStatusId(
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

export function normalizeColumnLabelToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ");
}

export function getWorkerColumnVisual(
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

export type VisibleGroupedColumnSection = {
  group: GroupedColumnGroup
  groupCards: RicercaWorkerSelectionCard[]
  groupColor: string | null
  groupStatusId: string
}

export function buildVisibleGroupedColumnSections(
  column: RicercaWorkerSelectionColumn,
): VisibleGroupedColumnSection[] {
  const groups = GROUPED_COLUMN_GROUPS[column.id] ?? null
  if (!groups) return []

  return groups
    .map((group) => {
      const groupStatusId = resolveGroupDropStatusId(column, group)
      const groupCards = column.cards.filter(
        (card) =>
          normalizeToken(card.status) === normalizeToken(groupStatusId) ||
          normalizeToken(card.status) === normalizeToken(group.key),
      )

      return {
        group,
        groupCards,
        groupColor: resolveGroupColor(column, group),
        groupStatusId,
      }
    })
    .filter((entry) => entry.groupCards.length > 0)
}

export function filterPipelineColumnsBySearch(
  columns: RicercaWorkerSelectionColumn[],
  searchQuery: string,
): RicercaWorkerSelectionColumn[] {
  return columns.map((column) => ({
    ...column,
    cards: column.cards.filter((cardItem) => {
      const worker = cardItem.worker
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
      )
    }),
  }))
}
