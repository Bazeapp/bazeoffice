import * as React from "react";
import { toast } from "sonner";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleDotIcon,
  XIcon,
} from "lucide-react";

import { FamigliaProcessoDetailContent } from "@/components/crm/famiglia-processo-detail-content";
import { LavoratoreCard } from "@/components/lavoratori/lavoratore-card";
import { WorkerProfileHeader } from "@/components/lavoratori/worker-profile-header";
import { SchedaColloquioPanel } from "@/components/ricerca/scheda-colloquio-panel";
import {
  type RelatedActiveSearchItem,
  WorkerPipelineSummaryCards,
} from "@/components/ricerca/worker-pipeline-summary-cards";
import { DetailSectionBlock } from "@/components/shared/detail-section-card";
import { SideCardsPanel } from "@/components/shared/side-cards-panel";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatAvailabilityComputedAt } from "@/features/lavoratori/lib/availability-utils";
import {
  asString,
  asStringArrayFirst,
  getAgeFromBirthDate,
  getDefaultWorkerAvatar,
  normalizeDomesticRoleLabels,
  readArrayStrings,
  toAvatarUrl,
} from "@/features/lavoratori/lib/base-utils";
import {
  isBlacklistValue,
  normalizeLookupColors,
  normalizeLookupOptions,
  type LookupOption,
} from "@/features/lavoratori/lib/lookup-utils";
import { toWorkerStatusFlags } from "@/features/lavoratori/lib/status-utils";
import {
  getLookupDropZoneActiveClassName,
  getLookupDropZoneClassName,
  getLookupPanelClassName,
  getLookupToneTextClassName,
} from "@/lib/lookup-color-styles";
import { cn } from "@/lib/utils";
import { invokeAiGenerationFunction } from "@/lib/ai-generation";
import {
  type CrmPipelineCardData,
  type LookupOptionsByField,
} from "@/hooks/use-crm-pipeline-preview";
import {
  type RicercaWorkerSelectionColumn,
  type RicercaWorkerSelectionCard,
  useRicercaWorkersPipeline,
} from "@/hooks/use-ricerca-workers-pipeline";
import { useOperatoriOptions } from "@/hooks/use-operatori-options";
import { useSelectedWorkerEditor } from "@/hooks/use-selected-worker-editor";
import {
  fetchEsperienzeLavoratoriByWorker,
  fetchDocumentiLavoratoriByWorker,
  fetchFamiglie,
  fetchLavoratori,
  fetchLookupValues,
  fetchProcessiMatching,
  fetchReferenzeLavoratoriByWorker,
  fetchSelezioniLavoratori,
  updateRecord,
} from "@/lib/anagrafiche-api";
import type { EsperienzaLavoratoreRecord } from "@/types/entities/esperienza-lavoratore";
import type { DocumentoLavoratoreRecord } from "@/types/entities/documento-lavoratore";
import type { LavoratoreRecord } from "@/types/entities/lavoratore";
import type { ReferenzaLavoratoreRecord } from "@/types/entities/referenza-lavoratore";

type RicercaWorkersPipelineViewProps = {
  processId: string;
  card: CrmPipelineCardData;
  lookupOptionsByField: LookupOptionsByField;
  focusSelectionId?: string | null;
  onOpenRelatedSearch?: (processId: string, selectionId: string) => void;
  onPatchProcess?: (
    processId: string,
    patch: Record<string, unknown>,
  ) => Promise<void> | void;
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

const COLLOQUI_MATCH_GROUPS: GroupedColumnGroup[] = [
  {
    key: "colloquio schedulato",
    label: "Colloquio schedulato",
    dropStatusId: "Colloquio schedulato",
  },
  {
    key: "colloquio fatto",
    label: "Colloquio fatto",
    dropStatusId: "Colloquio fatto",
  },
  {
    key: "prova con cliente",
    label: "Prova con cliente",
    dropStatusId: "Prova con cliente",
  },
  {
    key: "match",
    label: "Match",
    dropStatusId: "Match",
  },
];

const GROUPED_COLUMN_GROUPS: Record<string, GroupedColumnGroup[]> = {
  __candidati__: CANDIDATI_GROUPS,
  __da_colloquiare__: DA_COLLOQUIARE_GROUPS,
  __archivio__: ARCHIVIO_GROUPS,
  __colloqui_match__: COLLOQUI_MATCH_GROUPS,
};

const DEFAULT_BLUE_BADGE_CLASS_NAME =
  "border-blue-200 bg-blue-100 text-blue-700";

const RELATED_SELECTIONS_PAGE_SIZE = 500;
const RELATED_PROCESS_BATCH_SIZE = 150;
const RELATED_FAMILY_BATCH_SIZE = 150;
const ACTIVE_RELATED_SEARCH_STATUS_TOKENS = new Set([
  "fare ricerca",
  "selezione inviata",
  "selezione inviata in attesa di feedback",
  "fase di colloqui",
  "in prova con lavoratore",
  "match",
  "stand by",
]);

function isActiveRelatedSearch(value: unknown) {
  return ACTIVE_RELATED_SEARCH_STATUS_TOKENS.has(normalizeToken(asString(value)));
}

function formatRelatedFamilyName(row: Record<string, unknown> | null | undefined) {
  const familyName = [asString(row?.nome), asString(row?.cognome)]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .trim();

  return familyName || "Famiglia senza nome";
}

function formatRelatedSearchLabel(processRow: Record<string, unknown>) {
  const searchNumber = asString(processRow.numero_ricerca_attivata);
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
  const rows: Record<string, unknown>[] = [];
  let offset = 0;

  while (true) {
    const result = await fetchSelezioniLavoratori({
      limit: RELATED_SELECTIONS_PAGE_SIZE,
      offset,
      orderBy: [{ field: "aggiornato_il", ascending: false }],
      filters: {
        kind: "group",
        id: "related-active-searches-by-worker",
        logic: "and",
        nodes: [
          {
            kind: "condition",
            id: "related-active-searches-worker-id",
            field: "lavoratore_id",
            operator: "is",
            value: workerId,
          },
        ],
      },
    });

    const pageRows = Array.isArray(result.rows)
      ? (result.rows as Record<string, unknown>[])
      : [];
    rows.push(...pageRows);

    if (pageRows.length < RELATED_SELECTIONS_PAGE_SIZE) break;
    offset += RELATED_SELECTIONS_PAGE_SIZE;
  }

  return rows;
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
    const result = await fetchProcessiMatching({
      limit: batch.length,
      offset: 0,
      filters: {
        kind: "group",
        id: `related-processes-batch-${index}`,
        logic: "and",
        nodes: [
          {
            kind: "condition",
            id: `related-processes-ids-${index}`,
            field: "id",
            operator: "in",
            value: batch.join(","),
          },
        ],
      },
    });

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
    const result = await fetchFamiglie({
      limit: batch.length,
      offset: 0,
      filters: {
        kind: "group",
        id: `related-families-batch-${index}`,
        logic: "and",
        nodes: [
          {
            kind: "condition",
            id: `related-families-ids-${index}`,
            field: "id",
            operator: "in",
            value: batch.join(","),
          },
        ],
      },
    });

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
}) {
  const groups = GROUPED_COLUMN_GROUPS[column.id] ?? null;
  const isGroupedColumn = Boolean(groups);
  const showDropZones =
    isGroupedColumn &&
    Boolean(draggingSelectionId) &&
    (draggingFromColumnId !== column.id || isDropTarget);

  return (
    <div
      className={cn(
        "relative flex h-full w-[292px] shrink-0 flex-col rounded-xl border transition-all duration-150",
        getLookupPanelClassName(column.color),
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
                <Badge
                  variant="outline"
                  className={DEFAULT_BLUE_BADGE_CLASS_NAME}
                >
                  {group.label}
                </Badge>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="space-y-1 border-b px-3 py-2.5">
        <div className="flex items-start gap-2">
          <CircleDotIcon className="text-muted-foreground size-3.5 pt-0.5" />
          <h3 className="min-h-8 text-sm leading-5 font-semibold line-clamp-2">
            {column.label}
          </h3>
        </div>
        <p className="text-muted-foreground text-[11px]">
          {column.cards.length}{" "}
          {column.cards.length === 1 ? "lavoratore" : "lavoratori"}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
        {column.cards.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed border-border/60 p-3 text-xs">
            Nessun lavoratore
          </div>
        ) : groups ? (
          <Accordion
            type="multiple"
            defaultValue={groups.map((group) => group.key)}
            className="gap-1.5"
          >
            {groups.map((group) => {
              const groupStatusId = resolveGroupDropStatusId(column, group);
              const groupCards = column.cards.filter(
                (card) =>
                  normalizeToken(card.status) ===
                    normalizeToken(groupStatusId) ||
                  normalizeToken(card.status) === normalizeToken(group.key),
              );
              const groupColor = resolveGroupColor(column, group);

              return (
                <AccordionItem
                  key={group.key}
                  value={group.key}
                  className="not-last:border-0 bg-transparent"
                >
                  <AccordionTrigger
                    className={cn(
                      "py-1.5 text-sm font-semibold no-underline hover:no-underline",
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
                  <AccordionContent className="space-y-2 pt-1">
                    {groupCards.length === 0 ? (
                      <div className="text-muted-foreground rounded-md border border-dashed border-border/60 p-2 text-xs">
                        Nessun lavoratore
                      </div>
                    ) : (
                      groupCards.map((card) => (
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
                          <LavoratoreCard
                            worker={card.worker}
                            isActive={false}
                            onClick={() => onOpenWorker(card)}
                          />
                        </div>
                      ))
                    )}
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
              <LavoratoreCard
                worker={card.worker}
                isActive={false}
                onClick={() => onOpenWorker(card)}
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
  lookupOptionsByField,
  focusSelectionId = null,
  onOpenRelatedSearch,
  className,
}: RicercaWorkersPipelineViewProps) {
  const { loading, error, columns, moveCard } =
    useRicercaWorkersPipeline(processId);
  const { options: recruiterOptions } = useOperatoriOptions({
    role: "recruiter",
    activeOnly: true,
  });
  const [isOnboardingCollapsed, setIsOnboardingCollapsed] =
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
    province: card.indirizzoProvincia,
    cap: card.indirizzoCap,
    address: card.indirizzoCompleto,
    note: card.indirizzoNote,
  });
  const [selectedWorkerError, setSelectedWorkerError] = React.useState<
    string | null
  >(null);
  const selectedWorkerLoadingToastIdRef = React.useRef<string | number | null>(
    null,
  );
  const [relatedActiveSearches, setRelatedActiveSearches] = React.useState<
    RelatedActiveSearchItem[]
  >([]);
  const [loadingRelatedActiveSearches, setLoadingRelatedActiveSearches] =
    React.useState(false);
  const selectedWorkerId = selectedWorkerRow?.id ?? null;
  const recruiterLabelsById = React.useMemo(
    () => new Map(recruiterOptions.map((option) => [option.id, option.label])),
    [recruiterOptions],
  );
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
      tipoLavoro:
        asStringArrayFirst(selectedWorkerRow.tipo_rapporto_lavorativo) || null,
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
  }, [selectedCard, selectedWorkerRow]);

  const applyUpdatedWorkerRow = React.useCallback((row: LavoratoreRecord) => {
    setSelectedWorkerRow(row);
  }, []);

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
    handleAvailabilityMatrixChange,
    commitAvailabilityField,
    patchJobSearchField,
    patchExperienceRecord,
    createExperienceRecord,
    deleteExperienceRecord,
    patchReferenceRecord,
    createReferenceRecord,
    commitExperienceField,
    patchSkillsField,
    patchDocumentField,
    commitDocumentField,
    patchSelectedWorkerField,
  } = useSelectedWorkerEditor({
    selectedWorkerId,
    selectedWorker,
    selectedWorkerRow,
    lookupColorsByDomain,
    setError: setSelectedWorkerError,
    applyUpdatedWorkerRow,
    applyUpdatedWorkerExperience,
    appendCreatedWorkerExperience,
    removeWorkerExperience,
    applyUpdatedWorkerReference,
    appendCreatedWorkerReference,
  });

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
        const [
          workerResult,
          lookupResult,
          experiencesResult,
          documentsResult,
          referencesResult,
          selectionResult,
        ] = await Promise.all([
          fetchLavoratori({
            limit: 1,
            offset: 0,
            filters: {
              kind: "group",
              id: "pipeline-selected-worker",
              logic: "and",
              nodes: [
                {
                  kind: "condition",
                  id: "pipeline-selected-worker-id",
                  field: "id",
                  operator: "is",
                  value: workerId,
                },
              ],
            },
          }),
          fetchLookupValues(),
          fetchEsperienzeLavoratoriByWorker(workerId),
          fetchDocumentiLavoratoriByWorker(workerId),
          fetchReferenzeLavoratoriByWorker(workerId),
          fetchSelezioniLavoratori({
            limit: 1,
            offset: 0,
            filters: {
              kind: "group",
              id: "pipeline-selected-selection",
              logic: "and",
              nodes: [
                {
                  kind: "condition",
                  id: "pipeline-selected-selection-id",
                  field: "id",
                  operator: "is",
                  value: selectionId,
                },
              ],
            },
          }),
        ]);

        const row = Array.isArray(workerResult.rows)
          ? workerResult.rows[0]
          : null;
        const selectionRow = Array.isArray(selectionResult.rows)
          ? selectionResult.rows[0]
          : null;
        if (isCancelled) return;
        setSelectedWorkerRow((row as LavoratoreRecord | undefined) ?? null);
        setSelectedSelectionRow(selectionRow ?? null);
        setLookupOptionsByDomain(normalizeLookupOptions(lookupResult.rows));
        setLookupColorsByDomain(normalizeLookupColors(lookupResult.rows));
        setSelectedWorkerExperiences(experiencesResult.rows);
        setSelectedWorkerDocuments(documentsResult.rows);
        setSelectedWorkerReferences(referencesResult.rows);
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
      setRelatedActiveSearches([]);
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

        const activeProcessRows = processRows.filter((row) =>
          isActiveRelatedSearch(row.stato_res),
        );
        const processRowsById = new Map(
          activeProcessRows
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
            activeProcessRows
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
        const nextItems: RelatedActiveSearchItem[] = [];

        for (const selection of filteredSelections) {
          const selectionId = asString(selection.id);
          const selectionProcessId = asString(selection.processo_matching_id);
          if (!selectionId || !selectionProcessId) continue;
          if (seenProcessIds.has(selectionProcessId)) continue;

          const processRow = processRowsById.get(selectionProcessId);
          if (!processRow) continue;

          const familyRow = familyRowsById.get(asString(processRow.famiglia_id) ?? "");
          const recruiterId = asString(processRow.recruiter_ricerca_e_selezione_id);

          nextItems.push({
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
          });
          seenProcessIds.add(selectionProcessId);
        }

        if (isCancelled) return;
        setRelatedActiveSearches(nextItems);
      } catch {
        if (isCancelled) return;
        setRelatedActiveSearches([]);
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

  const handleOpenRelatedSearchCard = React.useCallback(
    (nextProcessId: string, nextSelectionId: string) => {
      onOpenRelatedSearch?.(nextProcessId, nextSelectionId);
    },
    [onOpenRelatedSearch],
  );

  React.useEffect(() => {
    setFamilyAddressDraft({
      province: card.indirizzoProvincia,
      cap: card.indirizzoCap,
      address: card.indirizzoCompleto,
      note: card.indirizzoNote,
    });
  }, [card.indirizzoProvincia, card.indirizzoCap, card.indirizzoCompleto, card.indirizzoNote]);

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
        const response = await updateRecord(
          "selezioni_lavoratori",
          selectedCard.id,
          {
            [field]: value,
          },
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
    [selectedCard],
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

      const result = await fetchLavoratori({
        limit: 1,
        offset: 0,
        filters: {
          kind: "group",
          id: "ai-generated-worker-summary",
          logic: "and",
          nodes: [
            {
              kind: "condition",
              id: "ai-generated-worker-summary-id",
              field: "id",
              operator: "is",
              value: selectedWorkerId,
            },
          ],
        },
      });
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

      const fetchSelection = () => fetchSelezioniLavoratori({
        limit: 1,
        offset: 0,
        filters: {
          kind: "group",
          id: "ai-generated-selection-feedback",
          logic: "and",
          nodes: [
            {
              kind: "condition",
              id: "ai-generated-selection-feedback-id",
              field: "id",
              operator: "is",
              value: selectedCard.id,
            },
          ],
        },
      });
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

  return (
    <div className={cn("relative flex min-h-0 flex-col gap-3", className)}>
      {loading ? (
        <span className="text-muted-foreground text-xs">Caricamento...</span>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          Errore caricamento pipeline lavoratori: {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2">
        <div className="flex h-full min-h-0 min-w-max gap-4">
              <div
                className={cn(
                  "flex h-full min-h-0 shrink-0 pt-2",
                  isOnboardingCollapsed ? "w-10" : "w-105",
            )}
          >
            {isOnboardingCollapsed ? (
              <div className="bg-background/90 flex h-full w-10 shrink-0 items-start justify-center rounded-lg border">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Espandi onboarding"
                  title="Espandi onboarding"
                  onClick={() => setIsOnboardingCollapsed(false)}
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            ) : null}

            {!isOnboardingCollapsed ? (
              <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 pl-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="bg-background/95 absolute top-3 right-4 z-20 border shadow-sm"
                  aria-label="Comprimi onboarding"
                  title="Comprimi onboarding"
                  onClick={() => setIsOnboardingCollapsed(true)}
                >
                  <ChevronLeftIcon />
                </Button>

                <FamigliaProcessoDetailContent
                  card={card}
                  lookupOptionsByField={lookupOptionsByField}
                  editMode="toggle"
                  showHeaderMeta={false}
                  showPrimaryControls={false}
                  showContextCard={false}
                  showAnnuncio
                  readOnly
                  isActive
                />
              </div>
            ) : null}
          </div>

          {columns.map((column) => (
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
            />
          ))}
        </div>
      </div>

      {isWorkerOverlayOpen ? (
        <div className="bg-background absolute inset-0 z-50 flex flex-col overflow-y-auto animate-in fade-in-0">
          <div className="bg-card flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
            <Breadcrumb className="min-w-0">
              <BreadcrumbList className="text-xs">
                <BreadcrumbItem>
                  <BreadcrumbLink
                    asChild
                  >
                    <button
                      type="button"
                      onClick={handleCloseWorkerOverlay}
                      className="cursor-pointer"
                    >
                      Ricerca
                    </button>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink
                    asChild
                  >
                    <button
                      type="button"
                      onClick={handleCloseWorkerOverlay}
                      className="cursor-pointer truncate"
                    >
                      {card.nomeFamiglia}
                    </button>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {selectedWorker?.nomeCompleto ?? "Lavoratore"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
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
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(280px,1fr)_minmax(640px,2fr)_minmax(340px,1fr)] overflow-hidden">
              <div className="scrollbar-hidden min-w-0 overflow-y-auto border-r border-border">
                <SideCardsPanel
                  title=""
                  className="h-full rounded-none border-0 shadow-none"
                  headerClassName="hidden"
                  contentClassName="px-4 pt-0 pb-4"
                >
                  <FamigliaProcessoDetailContent
                    card={card}
                    lookupOptionsByField={lookupOptionsByField}
                    editMode="toggle"
                    showHeaderMeta={false}
                    showPrimaryControls={false}
                    showContextCard={false}
                    showAnnuncio
                    readOnly
                    isActive
                    className="bg-transparent"
                  />
                </SideCardsPanel>
              </div>

              <div className="scrollbar-hidden min-w-0 overflow-y-auto border-r border-border">
                <div className="space-y-4 p-4">
                  <DetailSectionBlock
                    title="Profilo lavoratore"
                    showDefaultAction={false}
                    collapsible
                    className="space-y-2"
                    contentClassName="space-y-0 px-1 pt-1"
                  >
                    <WorkerProfileHeader
                      worker={selectedWorker ?? selectedCard.worker}
                      workerRow={selectedWorkerRow}
                      headerLayout="stacked"
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
                    showDefaultAction={false}
                    collapsible
                    className="space-y-2"
                    contentClassName="space-y-0 px-1 pt-1"
                  >
                    <SchedaColloquioPanel
                      selectionRow={selectedSelectionRow}
                      statusOptions={
                        lookupOptionsByDomain.get(
                          "selezioni_lavoratori.stato_selezione",
                        ) ??
                        lookupOptionsByDomain.get("lavoratori.stato_selezione") ??
                        []
                      }
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
                      lookupColorsByDomain={lookupColorsByDomain}
                      disabled={updatingSelectionDetails}
                      isGeneratingFeedback={generatingSelectionFeedback}
                      onGenerateFeedback={handleGenerateSelectionFeedback}
                      onMoveStatus={handleMoveSelectionStatus}
                      onPatchField={patchSelectedSelectionField}
                    />
                  </DetailSectionBlock>
                </div>
              </div>

              <div className="scrollbar-hidden min-w-0 overflow-y-auto">
                <div className="space-y-6 p-4">
                  <WorkerPipelineSummaryCards
                    workerRow={selectedWorkerRow}
                    selectionRow={selectedSelectionRow}
                    relatedActiveSearches={relatedActiveSearches}
                    relatedActiveSearchesLoading={loadingRelatedActiveSearches}
                    onOpenRelatedSearch={handleOpenRelatedSearchCard}
                    onPatchWorkerField={patchSelectedWorkerField}
                    onPatchProcessField={patchSelectedProcessAddressField}
                    processWeeklyHours={card.oreSettimana}
                    familyAddress={familyAddressDraft.address}
                    familyCap={familyAddressDraft.cap}
                    familyProvince={familyAddressDraft.province}
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
                    onAvailabilityVincoliBlur={() =>
                      void commitAvailabilityField("vincoli_orari_disponibilita")
                    }
                    isEditingExperience={isEditingExperience}
                    onToggleExperienceEdit={() =>
                      setIsEditingExperience((current) => !current)
                    }
                    updatingExperience={updatingExperience}
                    experienceDraft={experienceDraft}
                    onExperienceDraftChange={(patch) =>
                      setExperienceDraft((current) => ({ ...current, ...patch }))
                    }
                    onExperienceFieldBlur={(field) =>
                      void commitExperienceField(field)
                    }
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
                    onDocumentNaspiChange={(value) =>
                      setDocumentsDraft((current) => ({
                        ...current,
                        data_scadenza_naspi: value,
                      }))
                    }
                    onDocumentNaspiBlur={() =>
                      void commitDocumentField("data_scadenza_naspi")
                    }
                    onDocumentUpsert={upsertSelectedWorkerDocument}
                    onDocumentUploadError={setSelectedWorkerError}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
