import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { useBoardQueryCache } from "@/hooks/use-board-query-cache"
import { fetchLookupValues } from "@/lib/lookup-values"
import { createRecord, updateRecord } from "@/lib/record-crud"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import type { RichiestaAttivazioneRecord } from "@/types"
import { fetchCrmPipelineFamigliaDetail } from "../queries/fetch-crm-pipeline-famiglia-detail"
import { updateProcessoMatchingStatoSales } from "../mutations/update-processo-matching-stato-sales"
import type { CrmPipelineFilters, LookupOptionsByField } from "../types"
import type { CrmPipelinePreviewState, FetchBoardDataResult } from "../types/crm-pipeline-preview"
import {
  CRM_REALTIME_RELOAD_DEBOUNCE_MS,
  CRM_REALTIME_TABLES,
  CLOSED_STAGE_IDS,
} from "../lib/constants"
import {
  fetchBoardData,
  fetchProcessAddressesByIds,
  serializeCrmPipelineFilters,
} from "../lib/board-fetch"
import { mapBoardEntryToCard } from "../lib/card-mapper"
import {
  buildLookupColorMap,
  buildStageDefinitions,
  normalizeLookupPatchLabels,
  resolveLookupOptionColor,
  sortCardsForStage,
} from "../lib/lookup-utils"
import {
  displayValue,
  formatItalianDate,
  formatItalianDateTime,
  getCallAttemptCount,
  getFirstArrayValue,
  getStringArrayValue,
  normalizeLookupToken,
  toBooleanValue,
  toStringValue,
} from "../lib/value-utils"

export function useCrmPipelinePreview(
  searchQuery = "",
  filters: CrmPipelineFilters = {},
  openProcessId: string | null = null
): CrmPipelinePreviewState {
  const queryClient = useQueryClient()
  const [error, setError] = React.useState<string | null>(null)
  const [loadedClosedStageIds, setLoadedClosedStageIds] = React.useState<Set<string>>(
    () => new Set()
  )
  const filtersKey = React.useMemo(() => serializeCrmPipelineFilters(filters), [filters])
  const stableFilters = React.useMemo(
    () => JSON.parse(filtersKey) as CrmPipelineFilters,
    [filtersKey]
  )

  const boardQueryKey = React.useMemo(
    () =>
      [
        "crm-pipeline-board",
        filtersKey,
        searchQuery,
        Array.from(loadedClosedStageIds).sort().join(","),
      ] as const,
    [filtersKey, searchQuery, loadedClosedStageIds],
  )

  const {
    data,
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: boardQueryKey,
    queryFn: () =>
      fetchBoardData(
        loadedClosedStageIds,
        searchQuery,
        stableFilters,
        // Read the latest cached card at mapping time (after the fetch) so
        // any concurrent setBoardData (e.g. loadProcessDetail completing
        // mid-fetch) is observed and we never reinstate a stale snapshot.
        (processId) => {
          const latest = queryClient.getQueryData<FetchBoardDataResult>(boardQueryKey)
          if (!latest) return undefined
          for (const column of latest.columns) {
            const card = column.cards.find((c) => c.id === processId)
            if (card) return card
          }
          return undefined
        },
      ),
  })

  const columns = React.useMemo(() => data?.columns ?? [], [data?.columns])
  const lookupOptionsByField = React.useMemo(
    () => data?.lookupOptionsByField ?? ({} as LookupOptionsByField),
    [data?.lookupOptionsByField],
  )

  type CrmBoardData = NonNullable<typeof data>

  const { setBoardData, invalidateBoard } = useBoardQueryCache<CrmBoardData>(boardQueryKey)

  const loadClosedStage = React.useCallback((stageId: string) => {
    if (!CLOSED_STAGE_IDS.has(stageId)) return
    setLoadedClosedStageIds((current) => {
      if (current.has(stageId)) return current
      const next = new Set(current)
      next.add(stageId)
      return next
    })
  }, [])

  const loadProcessDetail = React.useCallback(async (processId: string) => {
    setError(null)

    try {
      const [detailRow, lookupResult] = await Promise.all([
        fetchCrmPipelineFamigliaDetail(processId),
        fetchLookupValues(),
      ])
      if (!detailRow?.process) return

      const lookupColors = buildLookupColorMap(lookupResult.rows)
      const statusToken = normalizeLookupToken(toStringValue(detailRow.process.stato_sales))
      const { tokenToStageId } = buildStageDefinitions(lookupResult.rows)
      const stageId = tokenToStageId.get(statusToken)
      if (!stageId) return

      let address = detailRow.address
      if (!toStringValue(address?.id)) {
        address = (await fetchProcessAddressesByIds([processId])).get(processId) ?? address
      }

      const card = mapBoardEntryToCard(
        {
          process: detailRow.process,
          family: detailRow.family,
          address,
          richiestaAttivazione:
            (detailRow.richiesta_attivazione ?? null) as RichiestaAttivazioneRecord | null,
        },
        stageId,
        lookupColors
      )
      if (!card) return

      setBoardData((previous) => {
        if (!previous) return previous
        return {
          ...previous,
          columns: previous.columns.map((column) => ({
            ...column,
            cards: sortCardsForStage(
              column.cards.map((currentCard) =>
                currentCard.id === processId ? card : currentCard,
              ),
              column.id,
            ),
          })),
        }
      })
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Errore caricando dettaglio ricerca"
      setError(message)
    }
  }, [setBoardData])

  const moveCard = React.useCallback(
    async (processId: string, targetStageId: string) => {
      setError(null)

      const sourceColumnIndex = columns.findIndex((column) =>
        column.cards.some((card) => card.id === processId)
      )
      if (sourceColumnIndex === -1) return

      const targetColumnIndex = columns.findIndex(
        (column) => column.id === targetStageId
      )
      if (targetColumnIndex === -1) return

      const sourceColumn = columns[sourceColumnIndex]
      const cardIndex = sourceColumn.cards.findIndex(
        (card) => card.id === processId
      )
      if (cardIndex === -1) return

      if (sourceColumn.id === targetStageId) {
        return
      }

      const movedCard = sourceColumn.cards[cardIndex]

      const updatedSourceCards = sourceColumn.cards.filter(
        (card) => card.id !== processId
      )
      const targetColumn = columns[targetColumnIndex]
      const updatedTargetCards = [
        { ...movedCard, stage: targetStageId },
        ...targetColumn.cards,
      ]

      const previousColumns = columns
      const optimisticColumns = columns.map((column) => {
        if (column.id === sourceColumn.id) {
          return {
            ...column,
            totalCount: Math.max(0, column.totalCount - 1),
            cards: sortCardsForStage(updatedSourceCards, sourceColumn.id),
          }
        }
        if (column.id === targetStageId) {
          return {
            ...column,
            totalCount: column.totalCount + 1,
            cards: sortCardsForStage(updatedTargetCards, targetStageId),
          }
        }
        return column
      })

      setBoardData((prev) => (prev ? { ...prev, columns: optimisticColumns } : prev))

      try {
        await updateProcessoMatchingStatoSales(processId, targetStageId)
      } catch (caughtError) {
        setBoardData((prev) => (prev ? { ...prev, columns: previousColumns } : prev))

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando stato ricerca su Supabase"
        setError(message)
      }
    },
    [columns, setBoardData]
  )

  const updateProcessCard = React.useCallback(
    async (processId: string, patch: Record<string, unknown>) => {
      setError(null)
      const normalizedPatch = normalizeLookupPatchLabels(
        patch,
        lookupOptionsByField
      )

      const previousColumns = columns

      const optimisticColumns = columns.map((column) => ({
        ...column,
        cards: sortCardsForStage(column.cards.map((card) => {
          if (card.id !== processId) return card

          const nextCard = { ...card }

          if (typeof patch.stato_sales === "string" && patch.stato_sales.trim()) {
            nextCard.stage = patch.stato_sales.trim()
          }
          if ("tipo_lavoro" in normalizedPatch) {
            const nextTipoLavori = getStringArrayValue(normalizedPatch.tipo_lavoro)
            const nextTipoLavoro = getFirstArrayValue(normalizedPatch.tipo_lavoro)
            nextCard.tipoLavoroBadges = nextTipoLavori
            nextCard.tipoLavoroColors = Object.fromEntries(
              nextTipoLavori.map((value) => [
                value,
                resolveLookupOptionColor(
                  lookupOptionsByField,
                  "tipo_lavoro",
                  value
                ),
              ])
            )
            nextCard.tipoLavoroBadge = nextTipoLavoro
            nextCard.tipoLavoroColor = resolveLookupOptionColor(
              lookupOptionsByField,
              "tipo_lavoro",
              nextTipoLavoro
            )
          }
          if ("tipo_rapporto" in normalizedPatch) {
            const nextTipoRapporto = getFirstArrayValue(normalizedPatch.tipo_rapporto)
            nextCard.tipoRapportoBadge = nextTipoRapporto
            nextCard.tipoRapportoColor = resolveLookupOptionColor(
              lookupOptionsByField,
              "tipo_rapporto",
              nextTipoRapporto
            )
          }
          if ("sales_cold_call_followup" in normalizedPatch) {
            nextCard.salesColdCallFollowup = displayValue(
              normalizedPatch.sales_cold_call_followup
            )
            nextCard.tentativiChiamataCount = getCallAttemptCount(
              normalizedPatch.sales_cold_call_followup
            )
          }
          if ("sales_no_show_followup" in normalizedPatch) {
            nextCard.salesNoShowFollowup = displayValue(
              normalizedPatch.sales_no_show_followup
            )
          }
          if ("motivazione_lost" in normalizedPatch) {
            nextCard.motivazioneLost = displayValue(normalizedPatch.motivazione_lost)
          }
          if ("motivazione_oot" in normalizedPatch) {
            nextCard.motivazioneOot = displayValue(normalizedPatch.motivazione_oot)
          }
          if ("appunti_chiamata_sales" in patch) {
            nextCard.appuntiChiamataSales = displayValue(
              patch.appunti_chiamata_sales
            )
          }
          if ("data_per_ricerca_futura" in patch) {
            nextCard.dataPerRicercaFutura = formatItalianDate(
              patch.data_per_ricerca_futura
            )
            nextCard.dataPerRicercaFuturaRaw = toStringValue(
              patch.data_per_ricerca_futura
            )
          }
          if ("orario_di_lavoro" in patch) {
            nextCard.orarioDiLavoro = displayValue(patch.orario_di_lavoro)
          }
          if ("stato_res" in normalizedPatch) {
            nextCard.statoRes = displayValue(normalizedPatch.stato_res)
          }
          if ("qualificazione_lead" in normalizedPatch) {
            nextCard.qualificazioneLead = displayValue(normalizedPatch.qualificazione_lead)
          }
          if ("motivo_no_match" in normalizedPatch) {
            nextCard.motivoNoMatch = displayValue(normalizedPatch.motivo_no_match)
          }
          if ("modello_smartmatching" in patch) {
            nextCard.modelloSmartmatching = displayValue(
              patch.modello_smartmatching
            )
          }
          if ("ore_settimanale" in patch) {
            nextCard.oreSettimana = displayValue(patch.ore_settimanale)
          }
          if ("numero_giorni_settimanali" in patch) {
            nextCard.giorniSettimana = displayValue(
              patch.numero_giorni_settimanali
            )
          }
          if ("preferenza_giorno" in normalizedPatch) {
            nextCard.giornatePreferite = getStringArrayValue(normalizedPatch.preferenza_giorno)
          }
          if ("nucleo_famigliare" in patch) {
            nextCard.nucleoFamigliare = displayValue(patch.nucleo_famigliare)
          }
          if ("descrizione_casa" in patch) {
            nextCard.descrizioneCasa = displayValue(patch.descrizione_casa)
          }
          if ("metratura_casa" in patch) {
            nextCard.metraturaCasa = displayValue(patch.metratura_casa)
          }
          if ("descrizione_animali_in_casa" in patch) {
            nextCard.descrizioneAnimaliInCasa = displayValue(
              patch.descrizione_animali_in_casa
            )
          }
          if ("mansioni_richieste" in patch) {
            nextCard.mansioniRichieste = displayValue(patch.mansioni_richieste)
          }
          if ("sesso" in patch) {
            nextCard.sesso = toStringValue(patch.sesso)
          }
          if ("nazionalita_escluse" in patch) {
            nextCard.nazionalitaEscluse = getStringArrayValue(patch.nazionalita_escluse)
          }
          if ("nazionalita_obbligatorie" in patch) {
            nextCard.nazionalitaObbligatorie = getStringArrayValue(
              patch.nazionalita_obbligatorie
            )
          }
          if ("famiglia_molto_esigente" in patch) {
            nextCard.famigliaMoltoEsigente =
              toBooleanValue(patch.famiglia_molto_esigente) ?? false
          }
          if ("richiesta_autonomia" in patch) {
            nextCard.richiestaAutonomia =
              toBooleanValue(patch.richiesta_autonomia) ?? false
          }
          if ("datore_spesso_presente" in patch) {
            nextCard.datoreSpessoPresente =
              toBooleanValue(patch.datore_spesso_presente) ?? false
          }
          if ("richiesta_discrezione" in patch) {
            nextCard.richiestaDiscrezione =
              toBooleanValue(patch.richiesta_discrezione) ?? false
          }
          if ("comunicare_bene_italiano" in patch) {
            nextCard.comunicareBeneItaliano =
              toBooleanValue(patch.comunicare_bene_italiano) ?? false
          }
          if ("comunicare_bene_inglese" in patch) {
            nextCard.comunicareBeneInglese =
              toBooleanValue(patch.comunicare_bene_inglese) ?? false
          }
          if ("presenza_neonati" in patch) {
            nextCard.presenzaNeonati = toBooleanValue(patch.presenza_neonati) ?? false
          }
          if ("piu_bambini" in patch) {
            nextCard.piuBambini = toBooleanValue(patch.piu_bambini) ?? false
          }
          if ("famiglia_4_persone" in patch) {
            nextCard.famiglia4Persone =
              toBooleanValue(patch.famiglia_4_persone) ?? false
          }
          if ("cani_piccoli" in patch) {
            nextCard.caniPiccoli = toBooleanValue(patch.cani_piccoli) ?? false
          }
          if ("cani_grandi" in patch) {
            nextCard.caniGrandi = toBooleanValue(patch.cani_grandi) ?? false
          }
          if ("gatti" in patch) {
            nextCard.gatti = toBooleanValue(patch.gatti) ?? false
          }
          if ("pulire_ripiani_alti" in patch) {
            nextCard.pulireRipianiAlti =
              toBooleanValue(patch.pulire_ripiani_alti) ?? false
          }
          if ("stirare" in patch) {
            nextCard.stirare = toBooleanValue(patch.stirare) ?? false
          }
          if ("stirare_abiti_difficili" in patch) {
            nextCard.stirareAbitiDifficili =
              toBooleanValue(patch.stirare_abiti_difficili) ?? false
          }
          if ("cucinare" in patch) {
            nextCard.cucinare = toBooleanValue(patch.cucinare) ?? false
          }
          if ("cucinare_elaborato" in patch) {
            nextCard.cucinareElaborato =
              toBooleanValue(patch.cucinare_elaborato) ?? false
          }
          if ("cura_piante" in patch) {
            nextCard.curaPiante = toBooleanValue(patch.cura_piante) ?? false
          }
          if ("richiesta_patente" in patch) {
            nextCard.richiestaPatente =
              toBooleanValue(patch.richiesta_patente) ?? false
          }
          if ("richiesta_trasferte" in patch) {
            nextCard.richiestaTrasferte =
              toBooleanValue(patch.richiesta_trasferte) ?? false
          }
          if ("richiesta_ferie" in patch) {
            nextCard.richiestaFerie = toBooleanValue(patch.richiesta_ferie) ?? false
          }
          if ("preventivo_firmato" in patch) {
            nextCard.preventivoAccettato =
              toBooleanValue(patch.preventivo_firmato) ?? false
          }
          if ("offerta" in patch) {
            nextCard.scontoApplicatoRaw = toStringValue(patch.offerta)
            nextCard.scontoApplicato = displayValue(patch.offerta)
          }
          if ("source_url" in patch) {
            nextCard.origineUrl = toStringValue(patch.source_url)
          }
          if ("descrizione_richiesta_trasferte" in patch) {
            nextCard.descrizioneRichiestaTrasferte = displayValue(
              patch.descrizione_richiesta_trasferte
            )
          }
          if ("descrizione_richiesta_ferie" in patch) {
            nextCard.descrizioneRichiestaFerie = displayValue(
              patch.descrizione_richiesta_ferie
            )
          }
          if ("patente" in patch) {
            nextCard.patenteDettaglio = getFirstArrayValue(patch.patente) ?? "-"
          }
          if ("eta_minima" in patch) {
            nextCard.etaMinima = displayValue(patch.eta_minima)
          }
          if ("eta_massima" in patch) {
            nextCard.etaMassima = displayValue(patch.eta_massima)
          }
          if ("informazioni_extra_riservate" in patch) {
            nextCard.informazioniExtraRiservate = displayValue(
              patch.informazioni_extra_riservate
            )
          }
          if ("indirizzo_prova_provincia" in patch) {
            nextCard.indirizzoProvincia = displayValue(patch.indirizzo_prova_provincia)
          }
          if ("indirizzo_prova_cap" in patch) {
            nextCard.indirizzoCap = displayValue(patch.indirizzo_prova_cap)
          }
          if ("indirizzo_prova_note" in patch) {
            nextCard.indirizzoNote = displayValue(patch.indirizzo_prova_note)
          }
          if ("src_embed_maps_annucio" in patch) {
            nextCard.srcEmbedMapsAnnucio = displayValue(patch.src_embed_maps_annucio)
          }
          if ("deadline_mobile" in patch) {
            nextCard.deadlineMobile = formatItalianDate(patch.deadline_mobile)
          }
          if ("disponibilita_colloqui_in_presenza" in patch) {
            nextCard.disponibilitaColloquiInPresenza = displayValue(
              patch.disponibilita_colloqui_in_presenza
            )
          }
          if ("family_availability_json" in patch) {
            nextCard.familyAvailabilityJson = toStringValue(patch.family_availability_json)
          }
          if ("tipo_incontro_famiglia_lavoratore" in patch) {
            nextCard.tipoIncontroFamigliaLavoratore = displayValue(
              patch.tipo_incontro_famiglia_lavoratore
            )
          }
          if ("testo_annuncio_whatsapp" in patch) {
            nextCard.testoAnnuncioWhatsapp = displayValue(
              patch.testo_annuncio_whatsapp
            )
          }

          return nextCard
        }), column.id),
      }))

      setBoardData((prev) => (prev ? { ...prev, columns: optimisticColumns } : prev))

      try {
        await updateRecord("processi_matching", processId, normalizedPatch)
      } catch (caughtError) {
        setBoardData((prev) => (prev ? { ...prev, columns: previousColumns } : prev))
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando ricerca su Supabase"
        setError(message)
        throw caughtError
      }
    },
    [columns, lookupOptionsByField, setBoardData]
  )

  const updateFamilyCard = React.useCallback(
    async (familyId: string, patch: Record<string, unknown>) => {
      setError(null)

      const previousColumns = columns

      const optimisticColumns = columns.map((column) => ({
        ...column,
        cards: sortCardsForStage(
          column.cards.map((card) => {
            if (card.famigliaId !== familyId) return card

            const nextCard = { ...card }

            if ("data_call_prenotata" in patch) {
              nextCard.dataCallPrenotata = formatItalianDateTime(
                patch.data_call_prenotata
              )
              nextCard.dataCallPrenotataRaw = toStringValue(
                patch.data_call_prenotata
              )
            }
            if ("email" in patch) {
              nextCard.email = displayValue(patch.email)
            }
            if ("telefono" in patch) {
              nextCard.telefono = displayValue(patch.telefono)
            }
            if ("nome" in patch || "cognome" in patch) {
              const nome = toStringValue(patch.nome)
              const cognome = toStringValue(patch.cognome)
              nextCard.nomeFamiglia = [nome, cognome]
                .filter((value): value is string => Boolean(value))
                .join(" ") || "-"
            }

            return nextCard
          }),
          column.id
        ),
      }))

      setBoardData((prev) => (prev ? { ...prev, columns: optimisticColumns } : prev))

      try {
        await updateRecord("famiglie", familyId, patch)
      } catch (caughtError) {
        setBoardData((prev) => (prev ? { ...prev, columns: previousColumns } : prev))
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando famiglia su Supabase"
        setError(message)
        throw caughtError
      }
    },
    [columns, setBoardData]
  )

  // Serialize concurrent address-create calls per process so that field
  // patches firing before the first INSERT returns don't each create a
  // new `indirizzi` row.
  const pendingAddressCreateRef = React.useRef<Map<string, Promise<string | null>>>(new Map())

  const updateAddressCard = React.useCallback(
    async (
      processId: string,
      addressId: string | null,
      patch: Record<string, unknown>
    ) => {
      setError(null)

      if (!addressId && !Object.values(patch).some((value) => toStringValue(value))) {
        return
      }

      const previousColumns = columns

      const optimisticColumns = columns.map((column) => ({
        ...column,
        cards: sortCardsForStage(
          column.cards.map((card) => {
            if (card.id !== processId) return card

            const nextCard = { ...card }
            if (addressId) {
              nextCard.indirizzoId = addressId
            }
            if ("provincia" in patch) {
              nextCard.indirizzoProvincia = displayValue(patch.provincia)
            }
            if ("provincia_sigla" in patch) {
              nextCard.indirizzoProvinciaSigla = displayValue(patch.provincia_sigla)
              nextCard.indirizzoProvincia = displayValue(patch.provincia_sigla)
            }
            if ("cap" in patch) {
              nextCard.indirizzoCap = displayValue(patch.cap)
            }
            if ("note" in patch) {
              nextCard.indirizzoNote = displayValue(patch.note)
            }
            if ("via" in patch) {
              nextCard.indirizzoVia = displayValue(patch.via)
            }

            return nextCard
          }),
          column.id
        ),
      }))

      setBoardData((prev) => (prev ? { ...prev, columns: optimisticColumns } : prev))

      try {
        if (addressId) {
          await updateRecord("indirizzi", addressId, patch)
          return
        }

        const pending = pendingAddressCreateRef.current.get(processId)
        if (pending) {
          const existingId = await pending
          if (existingId) {
            await updateRecord("indirizzi", existingId, patch)
            return
          }
        }

        const createPromise = createRecord("indirizzi", {
          entita_tabella: "processi_matching",
          entita_id: processId,
          tipo_indirizzo: "luogo",
          ...patch,
        }).then((response) => toStringValue(response.row.id))

        pendingAddressCreateRef.current.set(processId, createPromise)
        let createdAddressId: string | null = null
        try {
          createdAddressId = await createPromise
        } finally {
          if (pendingAddressCreateRef.current.get(processId) === createPromise) {
            pendingAddressCreateRef.current.delete(processId)
          }
        }
        if (!createdAddressId) return

        setBoardData((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            columns: prev.columns.map((column) => ({
              ...column,
              cards: column.cards.map((card) =>
                card.id === processId
                  ? { ...card, indirizzoId: createdAddressId }
                  : card,
              ),
            })),
          }
        })
      } catch (caughtError) {
        setBoardData((prev) => (prev ? { ...prev, columns: previousColumns } : prev))
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando indirizzo su Supabase"
        setError(message)
        throw caughtError
      }
    },
    [columns, setBoardData]
  )

  // Track the currently-open detail card so the realtime reload can re-enrich
  // its detail-only fields instead of leaving them stale.
  const openProcessIdRef = React.useRef<string | null>(openProcessId)
  React.useEffect(() => {
    openProcessIdRef.current = openProcessId
  }, [openProcessId])

  useRealtimeBoardSync({
    tables: CRM_REALTIME_TABLES,
    reload: invalidateBoard,
    reloadOpenDetail: () => {
      const openId = openProcessIdRef.current
      return openId ? loadProcessDetail(openId) : undefined
    },
    debounceMs: CRM_REALTIME_RELOAD_DEBOUNCE_MS,
  })

  const combinedError =
    error ?? (queryError instanceof Error ? queryError.message : null)

  return {
    loading,
    error: combinedError,
    columns,
    lookupOptionsByField,
    loadedClosedStageIds,
    loadClosedStage,
    loadProcessDetail,
    moveCard,
    updateProcessCard,
    updateFamilyCard,
    updateAddressCard,
  }
}
