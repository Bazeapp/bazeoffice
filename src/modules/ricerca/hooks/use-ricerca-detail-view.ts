import * as React from "react"

import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import { useOperatoriOptions } from "@/hooks/use-operatori-options"
import { useProvincieOptions } from "@/hooks/use-provincie"
import type { LookupOptionsByField } from "@/modules/crm/types"
import { normalizeLookupPatchLabels } from "@/modules/crm/lib"
import { createRecord, updateRecord } from "@/lib/record-crud"
import { buildFamilyPrivateAreaUrl } from "@/lib/private-area-url"
import { invokeEdgeFunction } from "@/lib/supabase-edge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

import {
  RICERCA_DETAIL_EDIT_ADDRESS_KEYS,
  RICERCA_DETAIL_EDIT_BOOLEAN_KEYS,
  RICERCA_DETAIL_EDIT_DATE_KEYS,
  RICERCA_DETAIL_EDIT_FAMILY_KEYS,
} from "../lib/ricerca-detail-view.constants"
import {
  applyAddressPatchToCard,
  applyFamilyPatchToCard,
  applyProcessPatchToCard,
  loadRicercaDetailCard,
} from "../lib/ricerca-detail-view.mappers"
import type {
  RicercaDetailCardData,
  RicercaDetailSectionEdit,
  RicercaDetailViewProps,
} from "../lib/ricerca-detail-view.types"
import {
  buildCanonicalStatoRicercaOptions,
  editableValue,
  normalizeLookupToken,
  normalizeWeekdayList,
  selectedLookupOptionValue,
  toIsoDateInputValue,
  toStringValue,
} from "../lib/ricerca-detail-view.utils"
import { useRicercaWorkersPipeline } from "./use-ricerca-workers-pipeline"

export type { RicercaDetailViewProps } from "../lib/ricerca-detail-view.types"

function buildSectionEdit(
  section: string,
  editingSections: Set<string>,
  toggleEditingSection: (section: string) => void,
  extra?: Pick<RicercaDetailSectionEdit, "onSave" | "saving">,
): RicercaDetailSectionEdit {
  return {
    editing: editingSections.has(section),
    onToggle: () => toggleEditingSection(section),
    ...extra,
  }
}

export function useRicercaDetailView({
  processId,
  selectionId = null,
  onBack,
  onOpenRelatedRicerca,
  onFocusSelection,
}: RicercaDetailViewProps) {
  const [currentProcessId, setCurrentProcessId] = React.useState(processId);
  const [focusedSelectionId, setFocusedSelectionId] = React.useState<
    string | null
  >(selectionId ?? null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [card, setCard] = React.useState<RicercaDetailCardData | null>(null);
  // Incrementato dalla mappa quando il geocoding on-demand popola lat/lng:
  // forza il reload della card cosi' che `indirizzoProvaLatitudine` arrivi
  // valorizzato e il map view riceva `searchCoordinates`.
  const [reloadVersion, setReloadVersion] = React.useState(0);
  const [lookupOptionsByField, setLookupOptionsByField] =
    React.useState<LookupOptionsByField>({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [editingSections, setEditingSections] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [orariDraft, setOrariDraft] = React.useState<{
    orarioDiLavoro: string;
    oreSettimana: string;
    giorniSettimana: string;
    giornatePreferite: string[];
  }>({
    orarioDiLavoro: editableValue(card?.orarioDiLavoro),
    oreSettimana: editableValue(card?.oreSettimana),
    giorniSettimana: editableValue(card?.giorniSettimana),
    giornatePreferite: normalizeWeekdayList(card?.giornatePreferite),
  });
  const [isSavingOrari, setIsSavingOrari] = React.useState(false);
  // Serialize concurrent address-create calls per process so that field
  // patches firing before the first INSERT returns don't each create a
  // new `indirizzi` row.
  const pendingAddressCreateRef = React.useRef<Map<string, Promise<string | null>>>(new Map());
  const provincieOptions = useProvincieOptions();
  const { options: operatorOptions, loading: operatorOptionsLoading } =
    useOperatoriOptions();
  const { options: recruiterOptions } = useOperatoriOptions({
    role: "recruiter",
    activeOnly: true,
  });
  const recruiterLabelsById = React.useMemo(
    () => new Map(recruiterOptions.map((option) => [option.id, option.label])),
    [recruiterOptions],
  );
  const pipelineState = useRicercaWorkersPipeline(currentProcessId)

  React.useEffect(() => {
    setCurrentProcessId(processId)
    setEditingSections(new Set())
  }, [processId])

  React.useEffect(() => {
    setFocusedSelectionId(selectionId ?? null)
  }, [selectionId])

  React.useEffect(() => {
    if (editingSections.has("orari")) return
    setOrariDraft({
      orarioDiLavoro: editableValue(card?.orarioDiLavoro),
      oreSettimana: editableValue(card?.oreSettimana),
      giorniSettimana: editableValue(card?.giorniSettimana),
      giornatePreferite: normalizeWeekdayList(card?.giornatePreferite),
    })
  }, [card, editingSections])

  const resolveLookupValueKey = React.useCallback(
    (field: string, rawValue: string) => {
      const options = lookupOptionsByField[field] ?? []
      const token = normalizeLookupToken(rawValue)
      if (!token || token === "-") return ""

      const matched = options.find(
        (option) =>
          normalizeLookupToken(option.valueKey) === token ||
          normalizeLookupToken(option.valueLabel) === token,
      )
      return matched?.valueKey ?? rawValue
    },
    [lookupOptionsByField],
  )

  const isNoMatchState = React.useMemo(() => {
    const token = normalizeLookupToken(card?.statoRes)
    return token === "no_match" || token === "no match"
  }, [card])

  const assignedRecruiter = React.useMemo(() => {
    const recruiterId = toStringValue(card?.recruiterId)
    if (!recruiterId) return null
    return operatorOptions.find((operator) => operator.id === recruiterId) ?? null
  }, [card?.recruiterId, operatorOptions])

  const recruiterSelectOptions = React.useMemo(() => {
    if (
      !assignedRecruiter ||
      recruiterOptions.some((operator) => operator.id === assignedRecruiter.id)
    ) {
      return recruiterOptions
    }

    return [assignedRecruiter, ...recruiterOptions]
  }, [assignedRecruiter, recruiterOptions])

  const toggleEditingSection = React.useCallback((section: string) => {
    setEditingSections((current) => {
      const next = new Set(current)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }, [])

  React.useEffect(() => {
    let cancelled = false

    const loadDetail = async () => {
      setLoading(true)
      setError(null)
      try {
        const result = await loadRicercaDetailCard(currentProcessId)
        if (cancelled) return
        setCard(result.card)
        setLookupOptionsByField(result.lookupOptionsByField)
      } catch (caughtError) {
        if (cancelled) return
        setCard(null)
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore caricamento dettaglio ricerca",
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadDetail()

    return () => {
      cancelled = true
    }
  }, [currentProcessId, reloadVersion])

  const updateProcessCard = React.useCallback(
    async (targetProcessId: string, patch: Record<string, unknown>) => {
      setError(null);
      const normalizedPatch = normalizeLookupPatchLabels(
        patch,
        lookupOptionsByField,
      );
      const previousCard = card;

      if (targetProcessId === currentProcessId) {
        setCard((current) =>
          current ? applyProcessPatchToCard(current, normalizedPatch) : current,
        );
      }

      try {
        await updateRecord("processi_matching", targetProcessId, normalizedPatch);
      } catch (caughtError) {
        if (targetProcessId === currentProcessId) {
          setCard(previousCard);
        }
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando ricerca",
        );
        throw caughtError;
      }
    },
    [card, currentProcessId, lookupOptionsByField],
  );

  const updateFamilyCard = React.useCallback(
    async (familyId: string, patch: Record<string, unknown>) => {
      setError(null);
      const previousCard = card;

      setCard((current) =>
        current ? applyFamilyPatchToCard(current, patch) : current,
      );

      try {
        await updateRecord("famiglie", familyId, patch);
      } catch (caughtError) {
        setCard(previousCard);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando famiglia",
        );
        throw caughtError;
      }
    },
    [card],
  );

  const updateAddressCard = React.useCallback(
    async (targetProcessId: string, patch: Record<string, unknown>) => {
      setError(null);
      const previousCard = card;
      const addressId = toStringValue(card?.indirizzoId);

      if (!addressId && !Object.values(patch).some((value) => toStringValue(value))) {
        return;
      }

      setCard((current) =>
        current ? applyAddressPatchToCard(current, patch, addressId) : current,
      );

      try {
        if (addressId) {
          await updateRecord("indirizzi", addressId, patch);
          return;
        }

        const pending = pendingAddressCreateRef.current.get(targetProcessId);
        if (pending) {
          const existingId = await pending;
          if (existingId) {
            await updateRecord("indirizzi", existingId, patch);
            return;
          }
        }

        const createPromise = createRecord("indirizzi", {
          entita_tabella: "processi_matching",
          entita_id: targetProcessId,
          tipo_indirizzo: "luogo",
          ...patch,
        }).then((response) => toStringValue(response.row.id));

        pendingAddressCreateRef.current.set(targetProcessId, createPromise);
        let createdAddressId: string | null = null;
        try {
          createdAddressId = await createPromise;
        } finally {
          if (pendingAddressCreateRef.current.get(targetProcessId) === createPromise) {
            pendingAddressCreateRef.current.delete(targetProcessId);
          }
        }
        if (createdAddressId) {
          setCard((current) =>
            current ? { ...current, indirizzoId: createdAddressId } : current,
          );
        }
      } catch (caughtError) {
        setCard(previousCard);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando indirizzo",
        );
        throw caughtError;
      }
    },
    [card],
  );

  const saveProcessPatch = React.useCallback(
    async (_section: string, patch: Record<string, unknown>) => {
      if (!currentProcessId) return;
      try {
        await updateProcessCard(currentProcessId, patch);
      } catch {
        // Error state is already surfaced by updateProcessCard.
      }
    },
    [currentProcessId, updateProcessCard],
  );

  const saveOrariSection = React.useCallback(async () => {
    if (!currentProcessId) return;
    setIsSavingOrari(true);
    try {
      await saveProcessPatch("orari", {
        orario_di_lavoro: orariDraft.orarioDiLavoro.trim() || null,
        ore_settimanale: orariDraft.oreSettimana.trim() || null,
        numero_giorni_settimanali: orariDraft.giorniSettimana.trim() || null,
        preferenza_giorno:
          orariDraft.giornatePreferite.length > 0
            ? orariDraft.giornatePreferite
            : null,
      });
      await invokeEdgeFunction("family-availability", {
        processo_matching_id: currentProcessId,
      });
      toast.success("Orari e frequenza salvati");
      toggleEditingSection("orari");
    } catch {
      toast.error("Errore salvando orari e frequenza");
    } finally {
      setIsSavingOrari(false);
    }
  }, [currentProcessId, orariDraft, saveProcessPatch, toggleEditingSection]);

  const saveFamilyPatch = React.useCallback(
    async (_section: string, patch: Record<string, unknown>) => {
      const familyId = toStringValue(card?.famigliaId);
      if (!familyId || familyId === "-") return;
      try {
        await updateFamilyCard(familyId, patch);
      } catch {
        // Error state is already surfaced by updateFamilyCard.
      }
    },
    [card?.famigliaId, updateFamilyCard],
  );

  const saveAddressPatch = React.useCallback(
    async (_section: string, patch: Record<string, unknown>) => {
      if (!currentProcessId) return;
      try {
        await updateAddressCard(currentProcessId, patch);
      } catch {
        // Error state is already surfaced by updateAddressCard.
      }
    },
    [currentProcessId, updateAddressCard],
  );

  // FASE 5 BIS — form + autosave: source of truth unica per i campi testo/data/
  // checkbox editabili (sostituisce i useDebouncedSave/DebouncedInput dentro
  // Editable*). onSave instrada per chiave ai 3 target originali (processo,
  // famiglia, indirizzo) con le STESSE trasformazioni: ""→null per i testi,
  // data→null se vuota (il type=date dà già ISO), booleano grezzo per i check.
  // Resync realtime senza clobber: keepDirtyValues dentro useAutoSaveForm.
  const editForm = useAutoSaveForm({
    defaults: {
      // famiglia
      telefono: editableValue(card?.telefono),
      email: editableValue(card?.email),
      // indirizzo (luogo di lavoro) — la provincia resta una Select inline
      cap: editableValue(card?.indirizzoCap),
      note: editableValue(card?.indirizzoNote),
      via: editableValue(card?.indirizzoVia),
      civico: editableValue(card?.indirizzoCivico),
      citta: editableValue(card?.indirizzoComune),
      citofono: editableValue(card?.indirizzoCitofono),
      // processo — testi
      nucleo_famigliare: editableValue(card?.nucleoFamigliare),
      descrizione_casa: editableValue(card?.descrizioneCasa),
      metratura_casa: editableValue(card?.metraturaCasa),
      descrizione_animali_in_casa: editableValue(card?.descrizioneAnimaliInCasa),
      mansioni_richieste: editableValue(card?.mansioniRichieste),
      eta_minima: editableValue(card?.etaMinima),
      eta_massima: editableValue(card?.etaMassima),
      descrizione_richiesta_trasferte: editableValue(
        card?.descrizioneRichiestaTrasferte,
      ),
      descrizione_richiesta_ferie: editableValue(
        card?.descrizioneRichiestaFerie,
      ),
      informazioni_extra_riservate: editableValue(
        card?.informazioniExtraRiservate,
      ),
      disponibilita_colloqui_in_presenza: editableValue(
        card?.disponibilitaColloquiInPresenza,
      ),
      testo_annuncio_whatsapp: editableValue(card?.testoAnnuncioWhatsapp),
      // processo — date (type=date → ISO yyyy-mm-dd)
      deadline_mobile: toIsoDateInputValue(
        card?.deadlineMobileRaw || card?.deadlineMobile,
      ),
      data_assegnazione: toIsoDateInputValue(
        card?.dataAssegnazioneRaw || card?.dataAssegnazione,
      ),
      // processo — checkbox
      richiesta_patente: Boolean(card?.richiestaPatente),
      richiesta_trasferte: Boolean(card?.richiestaTrasferte),
      richiesta_ferie: Boolean(card?.richiestaFerie),
      comunicare_bene_italiano: Boolean(card?.comunicareBeneItaliano),
      comunicare_bene_inglese: Boolean(card?.comunicareBeneInglese),
      famiglia_molto_esigente: Boolean(card?.famigliaMoltoEsigente),
      richiesta_autonomia: Boolean(card?.richiestaAutonomia),
      datore_spesso_presente: Boolean(card?.datoreSpessoPresente),
      richiesta_discrezione: Boolean(card?.richiestaDiscrezione),
    },
    onSave: async (patch) => {
      if (!card) return;
      const familyPatch: Record<string, unknown> = {};
      const addressPatch: Record<string, unknown> = {};
      const processPatch: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(patch)) {
        if (RICERCA_DETAIL_EDIT_FAMILY_KEYS.has(key)) {
          familyPatch[key] = (value as string).trim() || null;
        } else if (RICERCA_DETAIL_EDIT_ADDRESS_KEYS.has(key)) {
          addressPatch[key] = (value as string).trim() || null;
        } else if (RICERCA_DETAIL_EDIT_DATE_KEYS.has(key)) {
          processPatch[key] = (value as string) || null;
        } else if (RICERCA_DETAIL_EDIT_BOOLEAN_KEYS.has(key)) {
          processPatch[key] = Boolean(value);
        } else {
          processPatch[key] = (value as string).trim() || null;
        }
      }
      if (Object.keys(familyPatch).length > 0) {
        await saveFamilyPatch("form", familyPatch);
      }
      if (Object.keys(addressPatch).length > 0) {
        await saveAddressPatch("form", addressPatch);
      }
      if (Object.keys(processPatch).length > 0) {
        await saveProcessPatch("form", processPatch);
      }
    },
  });

  const resolvedCard = React.useMemo<RicercaDetailCardData | null>(() => {
    return card;
  }, [card]);
  const resolvedPrivateAreaUrl = buildFamilyPrivateAreaUrl(
    resolvedCard?.email,
    resolvedCard?.famigliaId,
  );
  const statoRicercaOptions = React.useMemo(
    () => buildCanonicalStatoRicercaOptions(lookupOptionsByField.stato_res),
    [lookupOptionsByField.stato_res],
  );
  const selectedStatoRicercaValue = selectedLookupOptionValue(
    resolvedCard?.statoRes ?? null,
    statoRicercaOptions,
  );

  const handleOpenRelatedSearch = React.useCallback(
    (nextProcessId: string, nextSelectionId: string) => {
      // BAZ-19: passa dallo shell (push di history) invece di mutare solo lo
      // stato locale, così il Back del browser torna a questa ricerca con il
      // lavoratore precedente ancora focalizzato.
      onOpenRelatedRicerca?.(nextProcessId, nextSelectionId);
    },
    [onOpenRelatedRicerca],
  );

  const headerTitle = resolvedCard?.nomeFamiglia
    ? `Famiglia ${resolvedCard.nomeFamiglia}`
    : "Ricerca";

  const oreGiorniLabel = (() => {
    const ore = resolvedCard?.oreSettimana ?? "-";
    const giorni = resolvedCard?.giorniSettimana ?? "-";
    if ((ore === "-" || !ore) && (giorni === "-" || !giorni)) return "-";
    const oreLabel = ore && ore !== "-" ? `${ore}h` : "—";
    const giorniLabel = giorni && giorni !== "-" ? `${giorni}gg` : "—";
    return `${oreLabel} / sett · ${giorniLabel}`;
  })();

  const isDeadlineUrgent = (() => {
    const value = resolvedCard?.deadlineMobile;
    if (!value || value === "-") return false;
    const parts = value.split("/");
    if (parts.length !== 3) return false;
    const [day, month, year] = parts;
    const deadline = new Date(`${year}-${month}-${day}T00:00:00`);
    if (Number.isNaN(deadline.getTime())) return false;
    const now = new Date();
    return deadline.getTime() - now.getTime() <= 1000 * 60 * 60 * 24 * 7;
  })();

  const tipoIncontroOptions =
    lookupOptionsByField.tipo_incontro_famiglia_lavoratore ?? [];
  const nazionalitaEscluseOptions = lookupOptionsByField.nazionalita_escluse ?? [];
  const nazionalitaObbligatorieOptions =
    lookupOptionsByField.nazionalita_obbligatorie ?? [];

  return {
    asyncState: { loading, error },
    form: editForm,
    card: resolvedCard,
    header: {
      title: headerTitle,
      onBack,
    },
    layout: {
      isSidebarCollapsed,
      setIsSidebarCollapsed,
      gridClassName: cn(
        "grid min-h-0 flex-1 gap-3 overflow-hidden p-3",
        isSidebarCollapsed
          ? "grid-cols-[40px_minmax(0,1fr)]"
          : "grid-cols-1 xl:grid-cols-[clamp(300px,18vw,360px)_minmax(0,1fr)]",
      ),
    },
    summary: {
      card: resolvedCard,
      sectionEdit: buildSectionEdit("header", editingSections, toggleEditingSection),
      isNoMatchState,
      statoRicercaOptions,
      selectedStatoRicercaValue,
      assignedRecruiter,
      recruiterSelectOptions,
      operatorOptionsLoading,
      tipoIncontroOptions,
      lookupOptionsByField,
      resolveLookupValueKey,
      updateProcessCard,
      currentProcessId,
      oreGiorniLabel,
      isDeadlineUrgent,
      privateAreaUrl: resolvedPrivateAreaUrl,
    },
    sections: {
      orari: {
        card: resolvedCard,
        sectionEdit: buildSectionEdit("orari", editingSections, toggleEditingSection, {
          onSave: saveOrariSection,
          saving: isSavingOrari,
        }),
        draft: orariDraft,
        setDraft: setOrariDraft,
      },
      luogoLavoro: {
        card: resolvedCard,
        sectionEdit: buildSectionEdit("luogo-lavoro", editingSections, toggleEditingSection),
        provincieOptions,
        saveAddressPatch,
      },
      famiglia: {
        card: resolvedCard,
        sectionEdit: buildSectionEdit("famiglia", editingSections, toggleEditingSection),
        privateAreaUrl: resolvedPrivateAreaUrl,
      },
      mansioni: {
        card: resolvedCard,
        sectionEdit: buildSectionEdit("mansioni", editingSections, toggleEditingSection),
      },
      richiesteSpecifiche: {
        card: resolvedCard,
        sectionEdit: buildSectionEdit(
          "richieste-specifiche",
          editingSections,
          toggleEditingSection,
        ),
        nazionalitaEscluseOptions,
        nazionalitaObbligatorieOptions,
        saveProcessPatch,
      },
      recruiter: {
        card: resolvedCard,
        sectionEdit: buildSectionEdit("recruiter", editingSections, toggleEditingSection),
        assignedRecruiter,
        recruiterSelectOptions,
        saveProcessPatch,
      },
      tempistiche: {
        card: resolvedCard,
        sectionEdit: buildSectionEdit("tempistiche", editingSections, toggleEditingSection),
      },
      annuncio: {
        card: resolvedCard,
        sectionEdit: buildSectionEdit("annuncio", editingSections, toggleEditingSection),
      },
    },
    tabs: {
      pipeline: {
        processId: currentProcessId,
        card: resolvedCard,
        focusedSelectionId,
        onOpenRelatedSearch: handleOpenRelatedSearch,
        onFocusSelection,
        onPatchProcess: updateProcessCard,
        pipelineState,
        recruiterLabelsById,
      },
      mappa: {
        processId: currentProcessId,
        card: resolvedCard,
        pipelineState,
        onCoordinatesGeocoded: () => setReloadVersion((current) => current + 1),
      },
    },
  }
}
