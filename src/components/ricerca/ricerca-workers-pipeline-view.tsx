import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon, CircleDotIcon, XIcon } from "lucide-react";

import { OnboardingCard } from "@/components/crm/cards/onboarding-card";
import { LavoratoreCard } from "@/components/lavoratori/lavoratore-card";
import { WorkerProfileHeader } from "@/components/lavoratori/worker-profile-header";
import { SchedaColloquioPanel } from "@/components/ricerca/scheda-colloquio-panel";
import { WorkerPipelineSummaryCards } from "@/components/ricerca/worker-pipeline-summary-cards";
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
  getTagClassName,
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
import {
  type CrmPipelineCardData,
  type LookupOptionsByField,
} from "@/hooks/use-crm-pipeline-preview";
import {
  type RicercaWorkerSelectionColumn,
  type RicercaWorkerSelectionCard,
  useRicercaWorkersPipeline,
} from "@/hooks/use-ricerca-workers-pipeline";
import { useSelectedWorkerEditor } from "@/hooks/use-selected-worker-editor";
import {
  fetchEsperienzeLavoratoriByWorker,
  fetchLavoratori,
  fetchLookupValues,
  fetchReferenzeLavoratoriByWorker,
  fetchSelezioniLavoratori,
  updateRecord,
} from "@/lib/anagrafiche-api";
import type { EsperienzaLavoratoreRecord } from "@/types/entities/esperienza-lavoratore";
import type { LavoratoreRecord } from "@/types/entities/lavoratore";
import type { ReferenzaLavoratoreRecord } from "@/types/entities/referenza-lavoratore";

type RicercaWorkersPipelineViewProps = {
  processId: string;
  card: CrmPipelineCardData;
  lookupOptionsByField: LookupOptionsByField;
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
                  className={getTagClassName(groupColor)}
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
                        className={getTagClassName(groupColor)}
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
  className,
}: RicercaWorkersPipelineViewProps) {
  const { loading, error, columns, moveCard } =
    useRicercaWorkersPipeline(processId);
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

  const {
    availabilityPayload,
    availabilityReadOnlyRows,
    isEditingAvailability,
    setIsEditingAvailability,
    isEditingExperience,
    setIsEditingExperience,
    isEditingSkills,
    setIsEditingSkills,
    updatingAvailability,
    updatingExperience,
    updatingSkills,
    availabilityDraft,
    setAvailabilityDraft,
    experienceDraft,
    setExperienceDraft,
    skillsDraft,
    setSkillsDraft,
    handleAvailabilityMatrixChange,
    commitAvailabilityField,
    patchExperienceRecord,
    createExperienceRecord,
    patchReferenceRecord,
    createReferenceRecord,
    commitExperienceField,
    patchSkillsField,
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

  const handleCloseWorkerOverlay = React.useCallback(() => {
    setIsWorkerOverlayOpen(false);
    setSelectedCard(null);
  }, []);

  React.useEffect(() => {
    if (!selectedCard || !isWorkerOverlayOpen) {
      setSelectedWorkerRow(null);
      setSelectedWorkerExperiences([]);
      setSelectedWorkerReferences([]);
      setSelectedSelectionRow(null);
      setSelectedWorkerLoading(false);
      setLoadingSelectedWorkerExperiences(false);
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
      setLoadingSelectedWorkerReferences(true);
      setSelectedWorkerError(null);

      try {
        const [
          workerResult,
          lookupResult,
          experiencesResult,
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
        setSelectedWorkerReferences(referencesResult.rows);
      } catch (error) {
        if (isCancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setSelectedWorkerError(message || "Errore caricamento profilo");
        setSelectedWorkerRow(null);
        setSelectedWorkerExperiences([]);
        setSelectedWorkerReferences([]);
        setSelectedSelectionRow(null);
      } finally {
        if (!isCancelled) {
          setSelectedWorkerLoading(false);
          setLoadingSelectedWorkerExperiences(false);
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
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
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

                <OnboardingCard
                  card={card}
                  lookupOptionsByField={lookupOptionsByField}
                  showTitle={false}
                  showTempistiche={false}
                  readOnly
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
        <div className="bg-background fixed inset-0 z-50 flex flex-col animate-in fade-in-0">
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

          {selectedWorkerLoading ? (
            <div className="text-muted-foreground p-4 text-sm">
              Caricamento profilo...
            </div>
          ) : null}
          {selectedWorkerError ? (
            <div className="mx-4 mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              Errore caricamento lavoratore: {selectedWorkerError}
            </div>
          ) : null}

          {selectedCard && selectedWorkerRow && selectedSelectionRow ? (
            <div className="grid min-h-0 flex-1 grid-cols-[minmax(280px,1fr)_minmax(560px,2fr)_minmax(320px,1fr)] overflow-hidden">
              <div className="scrollbar-hidden min-w-0 overflow-y-auto border-r border-border">
                <div className="p-3">
                  <OnboardingCard
                    card={card}
                    lookupOptionsByField={lookupOptionsByField}
                    showTitle={false}
                    showTempistiche={false}
                    readOnly
                  />
                </div>
              </div>

              <div className="min-w-0 overflow-hidden">
                <SchedaColloquioPanel
                  ricerca={card}
                  selectionCard={{
                    ...selectedCard,
                    worker: selectedWorker ?? selectedCard.worker,
                  }}
                  selectionRow={selectedSelectionRow}
                  workerRow={selectedWorkerRow}
                  statusOptions={
                    lookupOptionsByDomain.get(
                      "selezioni_lavoratori.stato_selezione",
                    ) ??
                    lookupOptionsByDomain.get("lavoratori.stato_selezione") ??
                    []
                  }
                  lookupColorsByDomain={lookupColorsByDomain}
                  disabled={updatingSelectionDetails}
                  onMoveStatus={handleMoveSelectionStatus}
                  onPatchField={patchSelectedSelectionField}
                />
              </div>

              <div className="scrollbar-hidden min-w-0 overflow-y-auto border-l border-border">
                <div className="space-y-6 p-4">
                  <div>
                    <WorkerProfileHeader
                      worker={selectedWorker ?? selectedCard.worker}
                      workerRow={selectedWorkerRow}
                      headerLayout="stacked"
                      statoLavoratoreOptions={
                        lookupOptionsByDomain.get(
                          "lavoratori.stato_lavoratore",
                        ) ?? []
                      }
                      disponibilitaOptions={
                        lookupOptionsByDomain.get("lavoratori.disponibilita") ??
                        []
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
                  </div>

                  <WorkerPipelineSummaryCards
                    workerRow={selectedWorkerRow}
                    selectionRow={selectedSelectionRow}
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
                      lookupOptionsByDomain.get("processi_matching.indirizzo_prova_provincia") ??
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
                    referenceStatusOptions={
                      lookupOptionsByDomain.get(
                        "referenze_lavoratori.referenza_verificata",
                      ) ?? []
                    }
                    experiences={selectedWorkerExperiences}
                    experiencesLoading={loadingSelectedWorkerExperiences}
                    references={selectedWorkerReferences}
                    referencesLoading={loadingSelectedWorkerReferences}
                    isEditingAvailability={isEditingAvailability}
                    onToggleAvailabilityEdit={() =>
                      setIsEditingAvailability((current) => !current)
                    }
                    updatingAvailability={updatingAvailability}
                    availabilityMatrix={availabilityDraft.matrix}
                    availabilityVincoli={availabilityDraft.vincoli_orari_disponibilita}
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
