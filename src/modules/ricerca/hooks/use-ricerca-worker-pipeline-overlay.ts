import * as React from "react"
import { useController } from "react-hook-form"
import { toast } from "sonner"

import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import type { RealtimeRowEvent } from "@/hooks/use-realtime-rows"
import { invokeAiGenerationFunction } from "@/lib/ai-generation"
import {
  getSelectionAvailabilityWorkerIds,
  invokeWorkerAvailabilityForIds,
} from "@/lib/availability-functions"
import { delay } from "@/lib/async-utils"
import {
  isBlacklistValue,
  normalizeLookupColors,
  normalizeLookupOptions,
  resolveLookupColor,
  type LookupOption,
} from "@/lib/lookup-utils"
import { fetchLookupValues } from "@/lib/lookup-values"
import { updateRecord } from "@/lib/record-crud"
import { uniqueNonEmptyStrings } from "@/lib/value-utils"
import { type WorkerOtherSelectionSummaryItem } from "@/modules/lavoratori/components/lavoratore-card"
import { useSelectedWorkerEditor } from "@/modules/lavoratori/hooks"
import {
  asString,
  getAgeFromBirthDate,
  getDefaultWorkerAvatar,
  LAVORATORI_REALTIME_TABLES,
  normalizeDomesticRoleLabels,
  readArrayStrings,
  shouldReloadLavoratoriOpenDetail,
  toAvatarImage,
  toWorkerStatusFlags,
} from "@/modules/lavoratori/lib"
import { fetchLavoratoriByIds } from "@/modules/lavoratori/queries"
import type {
  DocumentoLavoratoreRecord,
  EsperienzaLavoratoreRecord,
  LavoratoreRecord,
  ReferenzaLavoratoreRecord,
} from "@/modules/lavoratori/types"
import type { RicercaWorkerPipelineOverlayProps } from "../components/ricerca-worker-pipeline-overlay"
import {
  buildRelatedSearchGroups,
  fetchRelatedSearchLookupMaps,
  toWorkerOtherSelectionSummaryItems,
} from "../lib/related-active-searches"
import {
  fetchAllSelectionsForWorker,
} from "../lib/worker-pipeline-view-data"
import {
  extractGeneratedMessage,
  buildFamilyAddressDisplayDraft,
  mergeWorkerResidenceAddress,
  normalizeToken,
} from "../lib/worker-pipeline-view-utils"
import { fetchRicercaWorkerScheda } from "../queries/fetch-ricerca-worker-scheda"
import { fetchSelezioniLookup } from "../queries/fetch-selezioni-lookup"
import type { RicercaWorkerSelectionCard, RelatedSearchGroups } from "../types"

export type PipelineDetailFormDraft = {
  data_ritorno_disponibilita: string
  data_scadenza_naspi: string
  iban: string
  id_stripe_account: string
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
  onOpenLavoratoreCercaPage?: (workerId: string) => void
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
  onOpenLavoratoreCercaPage,
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
  const [familyAddressDraft, setFamilyAddressDraft] = React.useState(() =>
    buildFamilyAddressDisplayDraft(card),
  );
  const [selectedWorkerError, setSelectedWorkerError] = React.useState<
    string | null
  >(null);
  const selectedWorkerLoadingToastIdRef = React.useRef<string | number | null>(
    null,
  );
  /** `workerId:selectionId` whose scheda is on screen — realtime refreshes stay silent. */
  const loadedSchedaKeyRef = React.useRef<string | null>(null);
  const relatedLoadedWorkerIdRef = React.useRef<string | null>(null);
  const openWorkerIdRef = React.useRef<string | null>(null);
  const [schedaReloadVersion, setSchedaReloadVersion] = React.useState(0);
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
    const avatarImage = toAvatarImage(selectedWorkerRow);

    return {
      ...selectedCard.worker,
      id: asString(selectedWorkerRow.id) || selectedCard.worker.id,
      nomeCompleto,
      immagineUrl:
        avatarImage?.url ??
        selectedCard.worker.immagineUrl ??
        getDefaultWorkerAvatar(
          asString(selectedWorkerRow.id) || selectedCard.worker.id,
        ),
      immagineType:
        avatarImage?.type ?? selectedCard.worker.immagineType ?? null,
      hasRealPhoto: avatarImage != null || selectedCard.worker.hasRealPhoto === true,
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
    openWorkerIdRef.current =
      isWorkerOverlayOpen && selectedCard ? selectedCard.worker.id : null;
  }, [isWorkerOverlayOpen, selectedCard]);

  const reloadSelectedWorkerSchedaSilently = React.useCallback(() => {
    if (!openWorkerIdRef.current) return;
    setSchedaReloadVersion((current) => current + 1);
  }, []);

  const shouldReloadOpenWorkerDetail = React.useCallback(
    (event: RealtimeRowEvent) =>
      shouldReloadLavoratoriOpenDetail(event, openWorkerIdRef.current),
    [],
  );

  // Pattern B — open worker overlay scheda (profile, address, experiences,
  // documents, references, selection). Board kanban stays on
  // useRicercaWorkersPipeline; BAZ-19 focus-restore must not re-fire.
  useRealtimeBoardSync({
    tables: [...LAVORATORI_REALTIME_TABLES],
    reload: () => {},
    reloadOpenDetail: reloadSelectedWorkerSchedaSilently,
    shouldReloadBoard: () => false,
    shouldReloadOpenDetail: shouldReloadOpenWorkerDetail,
  });

  React.useEffect(() => {
    if (!selectedCard || !isWorkerOverlayOpen) {
      loadedSchedaKeyRef.current = null;
      setSelectedWorkerRow(null);
      setSelectedWorkerAddress(null);
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
    const schedaKey = `${workerId}:${selectionId}`;
    // Keep the open overlay mounted during realtime refresh: flipping loading
    // re-shows "Caricamento profilo..." and can unmount section editors.
    const silentRefresh = loadedSchedaKeyRef.current === schedaKey;

    async function loadWorkerRow() {
      if (!silentRefresh) {
        setSelectedWorkerLoading(true);
        setLoadingSelectedWorkerExperiences(true);
        setLoadingSelectedWorkerDocuments(true);
        setLoadingSelectedWorkerReferences(true);
        setSelectedWorkerError(null);
      }

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
        loadedSchedaKeyRef.current = schedaKey;
      } catch (error) {
        if (isCancelled) return;
        if (silentRefresh) return;
        const message = error instanceof Error ? error.message : String(error);
        setSelectedWorkerError(message || "Errore caricamento profilo");
        setSelectedWorkerRow(null);
        setSelectedWorkerExperiences([]);
        setSelectedWorkerDocuments([]);
        setSelectedWorkerReferences([]);
        setSelectedSelectionRow(null);
      } finally {
        if (!isCancelled && !silentRefresh) {
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
  }, [selectedCard, isWorkerOverlayOpen, schedaReloadVersion]);

  React.useEffect(() => {
    if (!selectedWorkerId || !isWorkerOverlayOpen) {
      if (relatedLoadedWorkerIdRef.current != null) {
        relatedLoadedWorkerIdRef.current = null;
        setRelatedActiveSearches({ direct: [], other: [] });
        setLoadingRelatedActiveSearches(false);
      }
      return;
    }

    let isCancelled = false;
    const workerId = selectedWorkerId;
    const silentRefresh = relatedLoadedWorkerIdRef.current === workerId;

    async function loadRelatedActiveSearches() {
      if (!silentRefresh) {
        setLoadingRelatedActiveSearches(true);
      }

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

        const processIds = uniqueNonEmptyStrings(
          filteredSelections.map((selection) =>
            asString(selection.processo_matching_id),
          ),
        );

        const { processRowsById, familyRowsById } =
          await fetchRelatedSearchLookupMaps(processIds);
        if (isCancelled) return;

        setRelatedActiveSearches(
          buildRelatedSearchGroups({
            selections: filteredSelections,
            processRowsById,
            familyRowsById,
            recruiterLabelsById,
            currentProcessId: processId,
            currentSelectionId: selectedCard?.id,
          }),
        );
        relatedLoadedWorkerIdRef.current = workerId;
      } catch {
        if (isCancelled) return;
        if (silentRefresh) return;
        setRelatedActiveSearches({ direct: [], other: [] });
      } finally {
        if (!isCancelled && !silentRefresh) {
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
    schedaReloadVersion,
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

        const processIds = uniqueNonEmptyStrings(
          filteredSelections.map((selection) =>
            asString(selection.processo_matching_id),
          ),
        );
        const { processRowsById, familyRowsById } =
          await fetchRelatedSearchLookupMaps(processIds);

        const { direct } = buildRelatedSearchGroups({
          selections: filteredSelections,
          processRowsById,
          familyRowsById,
          recruiterLabelsById,
          currentProcessId: processId,
          directInvolvementOnly: true,
        });

        return toWorkerOtherSelectionSummaryItems(direct);
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
    setFamilyAddressDraft(buildFamilyAddressDisplayDraft(card));
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
        await delay(500);
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
    onOpenLavoratoreCercaPage,
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
