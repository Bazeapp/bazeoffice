import * as React from "react"
import { useController } from "react-hook-form"
import { toast } from "sonner"

import { type WorkerOtherSelectionSummaryItem } from "@/modules/lavoratori/components/lavoratore-card"
import {
  type RelatedActiveSearchItem,
  type RelatedSearchGroups,
} from "../components/worker-pipeline-summary-cards"
import {
  asString,
  getAgeFromBirthDate,
  getDefaultWorkerAvatar,
  isBlacklistValue,
  isDirectInvolvementSelection,
  normalizeDomesticRoleLabels,
  normalizeLookupColors,
  normalizeLookupOptions,
  readArrayStrings,
  resolveLookupColor,
  toAvatarUrl,
  toWorkerStatusFlags,
  type LookupOption,
} from "@/modules/lavoratori/lib"
import {
  extractGeneratedMessage,
  formatRelatedFamilyName,
  formatRelatedSearchLabel,
  formatRelatedZona,
  mergeWorkerResidenceAddress,
  normalizeToken,
} from "../lib/worker-pipeline-view-utils"
import { invokeAiGenerationFunction } from "@/lib/ai-generation"
import {
  getSelectionAvailabilityWorkerIds,
  invokeWorkerAvailabilityForIds,
} from "@/lib/availability-functions"
import type { RicercaWorkerSelectionCard } from "../types"
import { useSelectedWorkerEditor } from "@/modules/lavoratori/hooks"
import { useCurrentOperatorName } from "@/hooks/use-current-operator-name"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import { fetchLookupValues } from "@/lib/lookup-values"
import { updateRecord } from "@/lib/record-crud"
import { fetchLavoratoriByIds } from "@/modules/lavoratori/queries"
import { fetchRicercaWorkerScheda } from "../queries/fetch-ricerca-worker-scheda"
import { fetchSelezioniLookup } from "../queries/fetch-selezioni-lookup"
import type {
  DocumentoLavoratoreRecord,
  EsperienzaLavoratoreRecord,
  LavoratoreRecord,
  ReferenzaLavoratoreRecord,
} from "@/modules/lavoratori/types"
import {
  fetchAllSelectionsForWorker,
  fetchRelatedFamiliesByIds,
  fetchRelatedProcessesByIds,
} from "../lib/worker-pipeline-view-data"
import type { RicercaWorkerPipelineOverlayProps } from "../components/ricerca-worker-pipeline-overlay"

export type PipelineDetailFormDraft = {
  data_ritorno_disponibilita: string
  data_scadenza_naspi: string
  iban: string
  id_stripe_account: string
}

function waitFor(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

export type UseRicercaWorkerPipelineOverlayParams = {
  processId: string
  card: RicercaWorkerPipelineOverlayProps["card"]
  columns: import("../types").RicercaWorkerSelectionColumn[]
  loading: boolean
  focusSelectionId?: string | null
  moveCard: (selectionId: string, targetStatusId: string) => Promise<void>
  recruiterLabelsById: Map<string, string>
  onOpenRelatedSearch?: (processId: string, selectionId: string) => void
  onFocusSelectionChange?: (selectionId: string | null) => void
}

export function useRicercaWorkerPipelineOverlay({
  processId,
  card,
  columns,
  loading,
  focusSelectionId = null,
  moveCard,
  recruiterLabelsById,
  onOpenRelatedSearch,
  onFocusSelectionChange,
}: UseRicercaWorkerPipelineOverlayParams) {
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
  // familyAddressDraft è un MIRROR DI DISPLAY dell'indirizzo del processo: NON è
  // un campo editato localmente. Gli edit passano da patchSelectedProcessAddressField
  // (save esplicito su processi_matching, poi update ottimistico del mirror) e il
  // mirror viene ri-sincronizzato dai prop server `card.*` dall'effetto più sotto.
  // Non esiste quindi un "edit locale in volo" che l'echo realtime possa clobberare:
  // l'anti-pattern che le regole form-context targettizzano qui non si applica.
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

  const operatorName = useCurrentOperatorName();

  // FASE 5 BIS — form autosave per i campi di dettaglio che alimentano card
  // presentazionali condivise (header + documenti/amministrativi). Le card
  // espongono value/onChange: ogni campo è agganciato via useController, così
  // `field.onChange` emette un vero evento "change" e l'autosave scatta (a
  // differenza di setValue), senza clobber sul resync realtime. onSave instrada
  // alla STESSA patch fn con le STESSE trasformazioni dei vecchi useDebouncedSave.
  const pipelineDetailForm = useAutoSaveForm<PipelineDetailFormDraft>({
    defaults: {
      data_ritorno_disponibilita: asString(
        selectedWorkerRow?.data_ritorno_disponibilita,
      ),
      data_scadenza_naspi: asString(selectedWorkerRow?.data_scadenza_naspi),
      iban: resolvedIban,
      id_stripe_account: asString(selectedWorkerRow?.id_stripe_account),
    },
    onSave: async (patch) => {
      for (const [key, rawValue] of Object.entries(patch)) {
        const v = typeof rawValue === "string" ? rawValue : "";
        switch (key) {
          case "data_ritorno_disponibilita":
            await patchSelectedWorkerField(
              "data_ritorno_disponibilita",
              v || null,
            );
            break;
          case "data_scadenza_naspi":
            await patchDocumentField("data_scadenza_naspi", v || null);
            break;
          case "iban":
            await patchDocumentField("iban", v || null);
            break;
          case "id_stripe_account":
            await patchDocumentField("id_stripe_account", v || null);
            break;
        }
      }
    },
  });
  const dataRitornoPipelineCtrl = useController({
    name: "data_ritorno_disponibilita",
    control: pipelineDetailForm.control,
  });
  const naspiCtrl = useController({
    name: "data_scadenza_naspi",
    control: pipelineDetailForm.control,
  });
  const ibanCtrl = useController({
    name: "iban",
    control: pipelineDetailForm.control,
  });
  const stripeCtrl = useController({
    name: "id_stripe_account",
    control: pipelineDetailForm.control,
  });
  const dataRitornoPipelineValue = dataRitornoPipelineCtrl.field.value;
  const documentNaspiValue = naspiCtrl.field.value;
  const documentIbanValue = ibanCtrl.field.value;
  const documentStripeValue = stripeCtrl.field.value;

  const handleOpenWorker = React.useCallback(
    (card: RicercaWorkerSelectionCard) => {
      setSelectedCard(card);
      setIsWorkerOverlayOpen(true);
      // BAZ-19: codifica la selezione aperta nella URL (via shell) per il Back.
      onFocusSelectionChange?.(card.id);
    },
    [onFocusSelectionChange],
  );

  // BAZ-19: `focusSelectionId` now persists for the whole time the worker
  // overlay is open (it lives in the URL). Open the worker ONCE per selection —
  // do NOT re-sync `selectedCard` on every realtime `columns` refresh, which
  // would re-fire the profile fetch + "Caricamento profilo..." toast and could
  // reopen a just-closed overlay. The ref resets when the focus clears.
  const openedFocusRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!focusSelectionId) {
      openedFocusRef.current = null;
      return;
    }
    if (loading) return;
    if (openedFocusRef.current === focusSelectionId) return;

    const nextCard =
      columns
        .flatMap((column) => column.cards)
        .find((columnCard) => columnCard.id === focusSelectionId) ?? null;

    if (!nextCard) return;

    openedFocusRef.current = focusSelectionId;
    setSelectedCard(nextCard);
    setIsWorkerOverlayOpen(true);
  }, [columns, focusSelectionId, loading]);

  const handleCloseWorkerOverlay = React.useCallback(() => {
    setIsWorkerOverlayOpen(false);
    setSelectedCard(null);
    // BAZ-19: chiudendo il lavoratore, rimuovi la selezione dalla URL.
    onFocusSelectionChange?.(null);
  }, [onFocusSelectionChange]);

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
    // Re-sync del mirror di display dai prop server (card.*). Nessun edit locale
    // in volo da preservare: gli edit passano dal save esplicito (vedi nota sulla
    // useState di familyAddressDraft).
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
  const overlayProps: Omit<RicercaWorkerPipelineOverlayProps, "onClose"> = {
    card,
    selectedWorkerError,
    selectedCard,
    selectedWorker,
    selectedWorkerRow,
    selectedSelectionRow,
    selectedWorkerAddress,
    lookupOptionsByDomain,
    lookupColorsByDomain,
    relatedActiveSearches,
    loadingRelatedActiveSearches,
    familyAddressDraft,
    updatingFamilyAddress,
    updatingSelectionDetails,
    generatingSelectionFeedback,
    generatingWorkerSummary,
    loadingSelectedWorkerExperiences,
    loadingSelectedWorkerDocuments,
    loadingSelectedWorkerReferences,
    selectedWorkerExperiences,
    selectedWorkerDocuments,
    selectedWorkerReferences,
    operatorName,
    dataRitornoPipelineValue,
    documentNaspiValue,
    documentIbanValue,
    documentStripeValue,
    dataRitornoPipelineField: dataRitornoPipelineCtrl.field,
    naspiField: naspiCtrl.field,
    ibanField: ibanCtrl.field,
    stripeField: stripeCtrl.field,
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
    patchSelectedSelectionField,
    patchSelectedProcessAddressField,
    handleMoveSelectionStatus,
    handleGenerateSelectionFeedback,
    handleGenerateWorkerSummary,
    handleOpenRelatedSearchCard,
    upsertSelectedWorkerDocument,
    setSelectedWorkerError,
  }

  return {
    isWorkerOverlayOpen,
    handleOpenWorker,
    handleCloseWorkerOverlay,
    loadOtherActiveSelectionDetails,
    overlayProps,
  }
}
