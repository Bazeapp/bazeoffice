import * as React from "react"
import { toast } from "sonner"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import {
  useDeleteBoardRecordMutation,
  useMoveMutation,
  usePatchMutation,
} from "@/hooks/use-board-mutations"

import { fetchLookupValues } from "@/lib/lookup-values"
import { createRecord, updateRecord } from "@/lib/record-crud"
import { fetchAssunzioniNamesByRapportoIds } from "../queries/fetch-assunzioni-names-by-rapporto-ids"
import { fetchChiusureBoard } from "../queries/fetch-chiusure-board"
import type { RapportoAssunzioneNames } from "../types/gestione-rpc"
import type {
  ChiusureBoardCardData,
  ChiusureBoardColumnData,
  TipoLicenziamentoOption,
} from "../types"
import { useRealtimeBoardSync } from "@/hooks/use-realtime-board-sync"
import { getRapportoTitle } from "@/modules/rapporti/lib"
import type { ChiusuraContrattoRecord, LookupValueRecord, RapportoLavorativoRecord } from "@/types"

const CHIUSURE_BOARD_QUERY_KEY = ["chiusure-board"] as const

type ChiusureBoardData = {
  columns: ChiusureBoardColumnData[]
  rapportoOptions: Array<{ id: string; label: string; rapporto: RapportoLavorativoRecord }>
  tipoLicenziamentoOptions: TipoLicenziamentoOption[]
}

/**
 * Pattern A field bindings — see `docs/realtime-board-pattern.md`.
 *
 * The Chiusure board has a "narrow board fetch + separate detail loader +
 * shared cache" shape (chiusure-board-view.tsx writes detail results back
 * into the board's React Query cache via `updateCard`). Without preservation,
 * a board refetch triggered by realtime would blank out every column that
 * the board RPC does NOT return (but the detail RPC does).
 *
 * The chiusura card stores two sub-source rows as full objects: `record`
 * (chiusure_contratti row) and `rapporto` (rapporti_lavorativi row). The
 * bindings below are the column names within each sub-source that need
 * preservation when the column is absent from the fresh board payload.
 *
 * Treatment mirrors `preserveMissingFields`: if `column in freshRow` is
 * false, restore previous; if the column is present (even when null),
 * fresh wins so DB clears propagate.
 */
export const CHIUSURA_RECORD_FIELD_BINDINGS: ReadonlyArray<
  keyof ChiusuraContrattoRecord
> = [
  "motivazione_cessazione_rapporto",
  "data_fine_rapporto",
  "tipo_licenziamento",
  "tipo_decesso",
  "email",
  "nome",
  "cognome",
  "informazioni_aggiuntive",
  "stato",
] as const

export const CHIUSURA_RAPPORTO_FIELD_BINDINGS: ReadonlyArray<
  keyof RapportoLavorativoRecord
> = [
  "assunzione_datore_id",
  "assunzione_lavoratore_id",
  "fine_rapporto_lavorativo_id",
  "data_inizio_rapporto",
  "data_fine_rapporto",
  "stato_rapporto",
] as const

/**
 * For each binding column, if the column is NOT present in `freshRow`,
 * restore the value from `previousRow`. Mutates `targetRow` in place. If
 * `freshRow` is missing entirely, every bound column falls back to
 * `previousRow`. Mirrors the helper of the same name in
 * `use-crm-pipeline-preview.ts` (Pattern A reference).
 */
export function preserveMissingFields<T extends Record<string, unknown>>(
  targetRow: T,
  previousRow: T | undefined | null,
  freshRow: Record<string, unknown> | undefined | null,
  columns: ReadonlyArray<keyof T>,
) {
  if (!previousRow) return
  for (const column of columns) {
    if (freshRow && (column as string) in freshRow) continue
    ;(targetRow as Record<string, unknown>)[column as string] =
      previousRow[column]
  }
}

const CHIUSURE_REALTIME_TABLES = [
  "chiusure_contratti",
  "rapporti_lavorativi",
  "famiglie",
  "lavoratori",
]

type ChiusuraStageDefinition = {
  id: string
  label: string
  color: string
}

type StageMetadata = {
  definitions: ChiusuraStageDefinition[]
  aliases: Map<string, string>
}

type TipoMetadata = {
  labels: Map<string, string>
  colors: Map<string, string>
  tipoLicenziamentoOptions: TipoLicenziamentoOption[]
}

type UseChiusureBoardState = {
  loading: boolean
  error: string | null
  columns: ChiusureBoardColumnData[]
  rapportoOptions: Array<{ id: string; label: string; rapporto: RapportoLavorativoRecord }>
  tipoLicenziamentoOptions: TipoLicenziamentoOption[]
  createChiusura: (input: {
    rapportoId: string
    tipo: "licenziamento" | "dimissione" | "annullamento"
    dataFineRapporto: string
    note: string
  }) => Promise<void>
  linkRapporto: (chiusuraId: string, rapportoId: string | null) => Promise<void>
  moveCard: (recordId: string, targetStageId: string) => Promise<void>
  /**
   * Persist an arbitrary patch on a chiusura record. Optimistic update via the
   * React Query cache, then invalidate on settle so Realtime stays consistent.
   */
  patchChiusura: (recordId: string, patch: Partial<ChiusuraContrattoRecord>) => Promise<void>
  /**
   * @deprecated Mutations + cache invalidation keep card state in sync now.
   * Kept as a no-op for backwards compatibility with callers that haven't been
   * migrated yet.
   */
  updateCard: (
    recordId: string,
    updater: (card: ChiusureBoardCardData) => ChiusureBoardCardData
  ) => void
  deleteChiusura: (recordId: string) => Promise<void>
}

const LICENZIAMENTO_STAGE_ID = "Datore comunica licenziamento"

const DEFAULT_STAGE_DEFINITIONS: ChiusuraStageDefinition[] = [
  { id: "Lavoratore comunica dimissioni", label: "Lavoratore comunica dimissioni", color: "violet" },
  { id: "Datore comunica licenziamento", label: "Datore comunica licenziamento", color: "zinc" },
  { id: "Chiusura pronta", label: "Chiusura pronta", color: "cyan" },
  { id: "Inviato comunicazione per firma documento", label: "Inviato comunicazione per firma documento", color: "sky" },
  { id: "Ricevuto documento firmato", label: "Ricevuto documento firmato", color: "lime" },
  { id: "Chiusura elaborata", label: "Chiusura elaborata", color: "amber" },
  { id: "Inviato documenti di chiusura", label: "Inviato documenti di chiusura", color: "lime" },
  { id: "Richiesta chiarimenti famiglia", label: "Richiesta chiarimenti famiglia", color: "orange" },
  { id: "Chiusura terminata", label: "Chiusura terminata", color: "green" },
]

function normalizeToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
}

function toStringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }
  return null
}

function readLookupColor(metadata: LookupValueRecord["metadata"]) {
  if (!metadata || typeof metadata !== "object") return null
  const color = metadata.color
  return typeof color === "string" && color.trim() ? color.trim() : null
}

function formatItalianDate(value: unknown) {
  const raw = toStringValue(value)
  if (!raw) return "-"

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return "-"

  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed)
}

function buildStageMetadata(rows: LookupValueRecord[]): StageMetadata {
  const aliases = new Map<string, string>()
  const colorByStage = new Map<string, string>()
  const labelByStage = new Map<string, string>()

  for (const stage of DEFAULT_STAGE_DEFINITIONS) {
    aliases.set(normalizeToken(stage.id), stage.id)
    aliases.set(normalizeToken(stage.label), stage.id)
    colorByStage.set(stage.id, stage.color)
    labelByStage.set(stage.id, stage.label)
  }

  const lookupRows = rows.filter(
    (row) =>
      row.is_active &&
      row.entity_table === "chiusure_contratti" &&
      row.entity_field === "stato"
  )

  for (const row of lookupRows) {
    const valueKey = toStringValue(row.value_key)
    const valueLabel = toStringValue(row.value_label)
    const resolvedId =
      aliases.get(normalizeToken(valueKey)) ??
      aliases.get(normalizeToken(valueLabel)) ??
      null

    if (!resolvedId) continue

    if (valueKey) aliases.set(normalizeToken(valueKey), resolvedId)
    if (valueLabel) aliases.set(normalizeToken(valueLabel), resolvedId)

    const color = readLookupColor(row.metadata)
    if (color) colorByStage.set(resolvedId, color)
    if (valueLabel) labelByStage.set(resolvedId, valueLabel)
  }

  return {
    definitions: DEFAULT_STAGE_DEFINITIONS.map((stage) => ({
      id: stage.id,
      label: labelByStage.get(stage.id) ?? stage.label,
      color: colorByStage.get(stage.id) ?? stage.color,
    })),
    aliases,
  }
}

function buildTipoMetadata(rows: LookupValueRecord[]): TipoMetadata {
  const labels = new Map<string, string>()
  const colors = new Map<string, string>()

  const lookupRows = rows.filter(
    (row) =>
      row.is_active &&
      row.entity_table === "chiusure_contratti" &&
      (row.entity_field === "tipo_licenziamento" || row.entity_field === "tipo_decesso")
  )

  // Opzioni ordinate per la select "Tipo licenziamento/dimissione".
  const tipoLicenziamentoOptions: TipoLicenziamentoOption[] = rows
    .filter(
      (row) =>
        row.is_active &&
        row.entity_table === "chiusure_contratti" &&
        row.entity_field === "tipo_licenziamento"
    )
    .map((row) => ({
      value: toStringValue(row.value_key) ?? toStringValue(row.value_label) ?? "",
      label: toStringValue(row.value_label) ?? toStringValue(row.value_key) ?? "",
      sortOrder: typeof row.sort_order === "number" ? row.sort_order : Number.MAX_SAFE_INTEGER,
    }))
    .filter((option) => option.value)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map(({ value, label }) => ({ value, label }))

  for (const row of lookupRows) {
    const valueKey = toStringValue(row.value_key)
    const valueLabel = toStringValue(row.value_label)
    const color = readLookupColor(row.metadata)

    if (valueKey) {
      const normalizedKey = normalizeToken(valueKey)
      if (valueLabel) labels.set(normalizedKey, valueLabel)
      if (color) colors.set(normalizedKey, color)
    }

    if (valueLabel) {
      const normalizedLabel = normalizeToken(valueLabel)
      labels.set(normalizedLabel, valueLabel)
      if (color) colors.set(normalizedLabel, color)
    }
  }

  return { labels, colors, tipoLicenziamentoOptions }
}

type ChiusuraBoardRow = {
  record: ChiusuraContrattoRecord
  rapporto?: RapportoLavorativoRecord | null
  famiglia?: { cognome: string | null; nome: string | null } | null
  lavoratore?: { cognome: string | null; nome: string | null } | null
}

/**
 * Map a board row to a card. If `previousCard` is provided, columns of
 * `record` and `rapporto` that are absent from the fresh board payload are
 * restored from the previous card. This is Pattern A — see
 * `docs/realtime-board-pattern.md`.
 */
export function mapChiusuraBoardCard(
  row: ChiusuraBoardRow,
  stage: string,
  tipoMetadata: TipoMetadata,
  previousCard?: ChiusureBoardCardData,
  assunzioneNames?: RapportoAssunzioneNames | null,
): ChiusureBoardCardData {
  const freshRecord = row.record
  const freshRapporto = row.rapporto ?? null

  // Merge missing columns from previous card's record/rapporto into the
  // fresh row objects. We mutate shallow clones so we don't mutate the RPC
  // response.
  const record = { ...freshRecord } as ChiusuraContrattoRecord
  if (previousCard) {
    preserveMissingFields(
      record as unknown as Record<string, unknown>,
      previousCard.record as unknown as Record<string, unknown>,
      freshRecord as unknown as Record<string, unknown>,
      CHIUSURA_RECORD_FIELD_BINDINGS as ReadonlyArray<string>,
    )
  }

  let rapporto: RapportoLavorativoRecord | null = freshRapporto
  if (previousCard) {
    if (freshRapporto && previousCard.rapporto) {
      const merged = { ...freshRapporto } as RapportoLavorativoRecord
      preserveMissingFields(
        merged as unknown as Record<string, unknown>,
        previousCard.rapporto as unknown as Record<string, unknown>,
        freshRapporto as unknown as Record<string, unknown>,
        CHIUSURA_RAPPORTO_FIELD_BINDINGS as ReadonlyArray<string>,
      )
      rapporto = merged
    } else if (!freshRapporto && previousCard.rapporto) {
      // Board fetch dropped the rapporto entirely (e.g. RPC returns no
      // rapporto join). Keep the previously known one so the detail panel
      // doesn't blank out — a subsequent invalidate with rapporto present
      // will overwrite cleanly.
      rapporto = previousCard.rapporto
    }
  }

  const nomeCompleto =
    (rapporto
      ? getRapportoTitle(rapporto, {
          famiglia: row.famiglia ? { cognome: row.famiglia.cognome, nome: row.famiglia.nome } : null,
          lavoratore: row.lavoratore ? { cognome: row.lavoratore.cognome, nome: row.lavoratore.nome } : null,
          assunzioneDatore: assunzioneNames?.datore,
          assunzioneLavoratore: assunzioneNames?.lavoratore,
        })
      : null) ||
    [record.nome, record.cognome].filter(Boolean).join(" ").trim() ||
    "Nominativo non disponibile"
  const rawTipo = record.tipo_licenziamento ?? record.tipo_decesso ?? "-"
  const normalizedTipo = normalizeToken(rawTipo)

  return {
    id: record.id,
    stage,
    record,
    rapporto,
    nomeCompleto,
    email: record.email ?? "-",
    motivazione: record.motivazione_cessazione_rapporto,
    dataFineRapporto: formatItalianDate(record.data_fine_rapporto),
    tipoLabel: tipoMetadata.labels.get(normalizedTipo) ?? rawTipo,
    tipoColor: tipoMetadata.colors.get(normalizedTipo) ?? null,
    hasAssunzioneDatore: Boolean(rapporto?.assunzione_datore_id),
    hasAssunzioneLavoratore: Boolean(rapporto?.assunzione_lavoratore_id),
  }
}

async function fetchChiusureBoardData(
  /**
   * Read latest cached card at mapping time (after the network fetch) so any
   * concurrent `setQueryData` (e.g. from `loadSelectedCard` in the view
   * completing mid-fetch) is observed and we never reinstate a stale
   * snapshot. Reading a snapshot at queryFn start would race against detail
   * refetches.
   */
  getPreviousCard?: (cardId: string) => ChiusureBoardCardData | undefined,
): Promise<{
  columns: ChiusureBoardColumnData[]
  rapportoOptions: Array<{ id: string; label: string; rapporto: RapportoLavorativoRecord }>
  tipoLicenziamentoOptions: TipoLicenziamentoOption[]
}> {
  const [boardResult, lookupResult] = await Promise.all([
    fetchChiusureBoard(),
    fetchLookupValues(),
  ])

  // Nomi dalle assunzioni collegate (priorità sul nome del rapporto) per tutti
  // i rapporti coinvolti: card delle chiusure + opzioni della modale.
  const rapportoIds = [
    ...boardResult.cards.map((row) => row.rapporto?.id),
    ...boardResult.rapporti.map((row) => row.rapporto.id),
  ].filter((id): id is string => Boolean(id))
  const assunzioneNamesByRapporto = await fetchAssunzioniNamesByRapportoIds(rapportoIds)

  const stageMetadata = buildStageMetadata(lookupResult.rows)
  const tipoMetadata = buildTipoMetadata(lookupResult.rows)
  const stages = stageMetadata.definitions
  const aliases = stageMetadata.aliases
  const cardsByStage = new Map<string, ChiusureBoardCardData[]>(
    stages.map((stage) => [stage.id, []])
  )

  for (const row of boardResult.cards) {
    const record = row.record
    const stage = aliases.get(normalizeToken(record.stato))
    if (!stage) continue

    const previousCard = getPreviousCard?.(record.id)
    const assunzioneNames = row.rapporto?.id
      ? assunzioneNamesByRapporto[row.rapporto.id] ?? null
      : null
    const card = mapChiusuraBoardCard(row, stage, tipoMetadata, previousCard, assunzioneNames)
    cardsByStage.get(stage)?.push(card)
  }

  const columns = stages.map((stage) => ({
    id: stage.id,
    label: stage.label,
    color: stage.color,
    cards: cardsByStage.get(stage.id) ?? [],
  }))
  const rapportoOptions = boardResult.rapporti
    .map((row) => {
      const assunzioneNames = assunzioneNamesByRapporto[row.rapporto.id] ?? null
      return {
        id: row.rapporto.id,
        label: getRapportoTitle(row.rapporto, {
          famiglia: row.famiglia ? { cognome: row.famiglia.cognome, nome: row.famiglia.nome } : null,
          lavoratore: row.lavoratore ? { cognome: row.lavoratore.cognome, nome: row.lavoratore.nome } : null,
          assunzioneDatore: assunzioneNames?.datore,
          assunzioneLavoratore: assunzioneNames?.lavoratore,
        }),
        rapporto: row.rapporto,
      }
    })
    .sort((left, right) => left.label.localeCompare(right.label, "it"))

  return { columns, rapportoOptions, tipoLicenziamentoOptions: tipoMetadata.tipoLicenziamentoOptions }
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function useChiusureBoard(): UseChiusureBoardState {
  const queryClient = useQueryClient()
  const [mutationError, setMutationError] = React.useState<string | null>(null)

  const {
    data,
    isLoading,
    error: queryError,
  } = useQuery<ChiusureBoardData>({
    queryKey: CHIUSURE_BOARD_QUERY_KEY,
    queryFn: () =>
      fetchChiusureBoardData((cardId) => {
        // Read latest cached card at mapping time (Pattern A — see doc) so
        // any concurrent setQueryData from the view-level detail loader is
        // observed and we never reinstate a stale snapshot.
        const latest = queryClient.getQueryData<ChiusureBoardData>(
          CHIUSURE_BOARD_QUERY_KEY,
        )
        if (!latest) return undefined
        for (const column of latest.columns) {
          const card = column.cards.find((c) => c.id === cardId)
          if (card) return card
        }
        return undefined
      }),
  })

  const columns = React.useMemo(() => data?.columns ?? [], [data?.columns])
  const rapportoOptions = React.useMemo(
    () => data?.rapportoOptions ?? [],
    [data?.rapportoOptions],
  )
  const tipoLicenziamentoOptions = React.useMemo(
    () => data?.tipoLicenziamentoOptions ?? [],
    [data?.tipoLicenziamentoOptions],
  )

  const setBoardData = React.useCallback(
    (updater: (previous: ChiusureBoardData) => ChiusureBoardData) => {
      queryClient.setQueryData<ChiusureBoardData>(CHIUSURE_BOARD_QUERY_KEY, (previous) =>
        previous ? updater(previous) : previous
      )
    },
    [queryClient]
  )

  const invalidateBoard = React.useCallback(
    () => queryClient.invalidateQueries({ queryKey: CHIUSURE_BOARD_QUERY_KEY }),
    [queryClient]
  )

  const moveMutation = useMoveMutation<
    { recordId: string; targetStageId: string },
    unknown,
    ChiusureBoardData
  >({
    queryKey: CHIUSURE_BOARD_QUERY_KEY,
    mutationFn: ({ recordId, targetStageId }) =>
      updateRecord("chiusure_contratti", recordId, { stato: targetStageId }),
    applyOptimistic: (previous, { recordId, targetStageId }) => {
      setMutationError(null)
      if (!previous) return previous
      return {
        ...previous,
        columns: moveCardInColumns(previous.columns, recordId, targetStageId),
      }
    },
  })
  React.useEffect(() => {
    if (moveMutation.error) {
      setMutationError(errorMessage(moveMutation.error, "Errore aggiornando stato chiusura"))
    }
  }, [moveMutation.error])

  const moveCard = React.useCallback(
    async (recordId: string, targetStageId: string) => {
      const movingCard = columns.flatMap((column) => column.cards).find((card) => card.id === recordId)
      const licenziamentoIndex = columns.findIndex((column) => column.id === LICENZIAMENTO_STAGE_ID)
      const targetIndex = columns.findIndex((column) => column.id === targetStageId)
      const isAfterLicenziamento =
        licenziamentoIndex >= 0 && targetIndex > licenziamentoIndex

      if (movingCard && isAfterLicenziamento) {
        const missing: string[] = []
        if (!movingCard.hasAssunzioneLavoratore) missing.push("assunzione lavoratore")
        if (!movingCard.hasAssunzioneDatore) missing.push("assunzione datore")
        if (missing.length > 0) {
          toast.error(`Mancano i dati di: ${missing.join(" e ")}`)
          return
        }
      }

      await moveMutation.mutateAsync({ recordId, targetStageId })
    },
    [columns, moveMutation]
  )

  const patchMutation = usePatchMutation<
    { recordId: string; patch: Partial<ChiusuraContrattoRecord> },
    unknown,
    ChiusureBoardData
  >({
    queryKey: CHIUSURE_BOARD_QUERY_KEY,
    mutationFn: ({ recordId, patch }) =>
      updateRecord("chiusure_contratti", recordId, patch),
    applyOptimistic: (previous, { recordId, patch }) => {
      setMutationError(null)
      if (!previous) return previous
      return { ...previous, columns: applyPatchInColumns(previous.columns, recordId, patch) }
    },
  })
  React.useEffect(() => {
    if (patchMutation.error) {
      setMutationError(errorMessage(patchMutation.error, "Errore aggiornando chiusura"))
    }
  }, [patchMutation.error])

  const patchChiusura = React.useCallback(
    async (recordId: string, patch: Partial<ChiusuraContrattoRecord>) => {
      await patchMutation.mutateAsync({ recordId, patch })
    },
    [patchMutation]
  )

  const createChiusura = React.useCallback(
    async (input: {
      rapportoId: string
      tipo: "licenziamento" | "dimissione" | "annullamento"
      dataFineRapporto: string
      note: string
    }) => {
      setMutationError(null)
      const stage =
        input.tipo === "dimissione"
          ? "Lavoratore comunica dimissioni"
          : input.tipo === "licenziamento"
            ? "Datore comunica licenziamento"
            : "Chiusura elaborata"
      try {
        const response = await createRecord("chiusure_contratti", {
          stato: stage,
          data_fine_rapporto: input.dataFineRapporto || null,
          tipo_licenziamento:
            input.tipo === "licenziamento"
              ? "Licenziamento"
              : input.tipo === "annullamento"
                ? "Annullamento contratto"
                : null,
          motivazione_cessazione_rapporto:
            input.tipo === "dimissione" ? "Dimissioni" : input.note || null,
          informazioni_aggiuntive: input.note || null,
        })
        const record = response.row as ChiusuraContrattoRecord
        await updateRecord("rapporti_lavorativi", input.rapportoId, {
          fine_rapporto_lavorativo_id: record.id,
        })
      } catch (caughtError) {
        setMutationError(errorMessage(caughtError, "Errore creando chiusura"))
        throw caughtError
      } finally {
        await invalidateBoard()
      }
    },
    [invalidateBoard]
  )

  const linkRapporto = React.useCallback(
    async (chiusuraId: string, rapportoId: string | null) => {
      setMutationError(null)
      const previous = queryClient.getQueryData<ChiusureBoardData>(CHIUSURE_BOARD_QUERY_KEY)

      // Resolve the chiusura's previously linked rapporto from the cache so we
      // can unlink it server-side too.
      let previousRapportoId: string | null = null
      if (previous) {
        for (const column of previous.columns) {
          for (const card of column.cards) {
            if (card.id === chiusuraId && card.rapporto) {
              previousRapportoId = card.rapporto.id
            }
          }
        }
      }

      try {
        if (rapportoId) {
          if (previousRapportoId && previousRapportoId !== rapportoId) {
            await updateRecord("rapporti_lavorativi", previousRapportoId, {
              fine_rapporto_lavorativo_id: null,
            })
          }
          await updateRecord("rapporti_lavorativi", rapportoId, {
            fine_rapporto_lavorativo_id: chiusuraId,
          })
        } else if (previousRapportoId) {
          await updateRecord("rapporti_lavorativi", previousRapportoId, {
            fine_rapporto_lavorativo_id: null,
          })
        }
      } catch (caughtError) {
        setMutationError(errorMessage(caughtError, "Errore collegando rapporto"))
        throw caughtError
      } finally {
        await invalidateBoard()
      }
    },
    [queryClient, invalidateBoard]
  )

  // Optimistic in-memory updater backed by the React Query cache. Kept so
  // legacy callers (e.g. attachment upload/remove) can still patch a card
  // without going through a full mutation. Memoised so consumers that put it
  // in effect dependencies don't re-render-loop.
  const updateCard = React.useCallback(
    (
      recordId: string,
      updater: (card: ChiusureBoardCardData) => ChiusureBoardCardData
    ) => {
      setBoardData((current) => ({
        ...current,
        columns: current.columns.map((column) => ({
          ...column,
          cards: column.cards.map((card) =>
            card.id === recordId ? updater(card) : card
          ),
        })),
      }))
    },
    [setBoardData]
  )

  const deleteMutation = useDeleteBoardRecordMutation<
    { recordId: string },
    ChiusureBoardData
  >({
    queryKey: CHIUSURE_BOARD_QUERY_KEY,
    table: "chiusure_contratti",
    getRecordId: ({ recordId }) => recordId,
    applyOptimistic: (previous, { recordId }) => {
      if (!previous) return previous
      return {
        ...previous,
        columns: previous.columns.map((column) => ({
          ...column,
          cards: column.cards.filter((card) => card.id !== recordId),
        })),
      }
    },
  })

  const deleteChiusura = React.useCallback(
    async (recordId: string) => {
      await deleteMutation.mutateAsync({ recordId })
    },
    [deleteMutation],
  )

  // Realtime → invalidate the query. React Query then refetches the board
  // and re-renders consumers. The orchestrator still debounces and defers
  // while local writes are pending so we don't clobber optimistic state.
  useRealtimeBoardSync({
    tables: CHIUSURE_REALTIME_TABLES,
    reload: invalidateBoard,
  })

  const error =
    mutationError ?? (queryError ? errorMessage(queryError, "Errore caricamento chiusure") : null)

  return {
    loading: isLoading,
    error,
    columns,
    rapportoOptions,
    tipoLicenziamentoOptions,
    createChiusura,
    linkRapporto,
    moveCard,
    patchChiusura,
    updateCard,
    deleteChiusura,
  }
}

function moveCardInColumns(
  columns: ChiusureBoardColumnData[],
  recordId: string,
  targetStageId: string
): ChiusureBoardColumnData[] {
  let movedCard: ChiusureBoardCardData | null = null

  const withoutCard = columns.map((column) => {
    if (column.cards.some((card) => card.id === recordId)) {
      const remainingCards = column.cards.filter((card) => {
        if (card.id !== recordId) return true
        movedCard = { ...card, stage: targetStageId }
        return false
      })
      return { ...column, cards: remainingCards }
    }
    return column
  })

  if (!movedCard) return columns

  return withoutCard.map((column) =>
    column.id === targetStageId
      ? { ...column, cards: [movedCard as ChiusureBoardCardData, ...column.cards] }
      : column
  )
}

function applyPatchInColumns(
  columns: ChiusureBoardColumnData[],
  recordId: string,
  patch: Partial<ChiusuraContrattoRecord>
): ChiusureBoardColumnData[] {
  return columns.map((column) => ({
    ...column,
    cards: column.cards.map((card) => {
      if (card.id !== recordId) return card
      const nextRecord = { ...card.record, ...patch }
      return {
        ...card,
        record: nextRecord,
        motivazione:
          "motivazione_cessazione_rapporto" in patch
            ? nextRecord.motivazione_cessazione_rapporto
            : card.motivazione,
        email: "email" in patch ? (nextRecord.email ?? "-") : card.email,
        dataFineRapporto:
          "data_fine_rapporto" in patch
            ? formatItalianDate(nextRecord.data_fine_rapporto)
            : card.dataFineRapporto,
      }
    }),
  }))
}
