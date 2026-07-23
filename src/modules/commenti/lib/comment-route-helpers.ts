import { ENTITY_SECTION_META } from "./consts"
import { entityRefKey } from "./entity-ref"
import { resolveCommentStack } from "./resolve-comment-stack"
import { resolveRapportoRicercaId } from "./resolve-rapporto-ricerca-id"
import type { EntityRef } from "../types/entity"
import type { ResolveCommentStackResult } from "../types/section"
import type { AssunzioniBoardCardData } from "@/modules/gestione-contrattuale/types"
import type { ChiusureBoardCardData } from "@/modules/gestione-contrattuale/types"
import type { VariazioniBoardCardData } from "@/modules/gestione-contrattuale/types"
import type { PayrollBoardCardData } from "@/modules/payroll/types"
import type { ContributoInpsBoardCardData } from "@/modules/payroll/types"
import type { SupportTicketBoardCardData } from "@/modules/support/types"
import type { RapportoLavorativoRecord } from "@/types"

export function buildDisplayNames(
  entries: Array<{ ref: EntityRef; name: string }>,
): Record<string, string> {
  return Object.fromEntries(
    entries
      .filter((entry) => entry.name.trim().length > 0)
      .map((entry) => [entityRefKey(entry.ref), entry.name]),
  )
}

export function formatRicercaDisplayName(options: {
  nomeFamiglia?: string | null
  titoloAnnuncio?: string | null
  numeroRicercaAttivata?: string | null
}): string {
  return (
    options.nomeFamiglia?.trim() ||
    options.titoloAnnuncio?.trim() ||
    options.numeroRicercaAttivata?.trim() ||
    "Ricerca"
  )
}

export function crmProcessoCommentRow(card: {
  id: string
  famigliaId: string
  nomeFamiglia?: string | null
}): Record<string, unknown> {
  return {
    id: card.id,
    famiglia_id: card.famigliaId,
    processi_matching_id: card.id,
  }
}

export function crmProcessoDisplayNames(card: {
  id: string
  famigliaId: string
  nomeFamiglia?: string | null
  numeroRicercaAttivata?: string | null
  titoloAnnuncio?: string | null
}): Record<string, string> {
  return buildDisplayNames([
    {
      ref: { entityType: "ricerca", entityId: card.id },
      name: formatRicercaDisplayName({
        nomeFamiglia: card.nomeFamiglia,
        titoloAnnuncio: card.titoloAnnuncio,
        numeroRicercaAttivata: card.numeroRicercaAttivata,
      }),
    },
    {
      ref: { entityType: "famiglia", entityId: card.famigliaId },
      name: card.nomeFamiglia?.trim() || "Famiglia",
    },
  ])
}

export function lavoratoreCommentRow(
  workerId: string,
  row?: Record<string, unknown> | null,
): Record<string, unknown> {
  return {
    ...(row ?? {}),
    id: workerId,
    lavoratore_id: workerId,
  }
}

export function lavoratoreDisplayName(
  workerId: string,
  name?: string | null,
): Record<string, string> {
  return buildDisplayNames([
    {
      ref: { entityType: "lavoratore", entityId: workerId },
      name: name?.trim() || "Lavoratore",
    },
  ])
}

function serializeRapportoRow(
  rapporto: RapportoLavorativoRecord | null | undefined,
  processiMatchingId?: string | null,
): Record<string, unknown> | null {
  if (!rapporto) return null

  return {
    id: rapporto.id,
    lavoratore_id: rapporto.lavoratore_id,
    famiglia_id: rapporto.famiglia_id,
    processi_matching_id: processiMatchingId ?? rapporto.processi_matching_id,
    nome_lavoratore_per_url: rapporto.nome_lavoratore_per_url,
    id_rapporto: rapporto.id_rapporto,
  }
}

export function rapportoCommentRow(
  rapportoId: string,
  rapporto?: RapportoLavorativoRecord | null,
  options?: { processId?: string | null },
): Record<string, unknown> {
  const processiMatchingId = resolveRapportoRicercaId(rapporto, options?.processId)
  const serialized = serializeRapportoRow(rapporto, processiMatchingId)
  return {
    ...(serialized ?? {}),
    id: rapportoId,
    rapporto_lavorativo_id: rapportoId,
    processi_matching_id: processiMatchingId,
    rapporto: serialized,
  }
}

export function rapportoDisplayNames(
  rapportoId: string,
  options: {
    lavoratoreName?: string | null
    famigliaName?: string | null
    ricercaLabel?: string | null
    processId?: string | null
    rapporto?: RapportoLavorativoRecord | null
  },
): Record<string, string> {
  const entries: Array<{ ref: EntityRef; name: string }> = [
    {
      ref: { entityType: "rapporto", entityId: rapportoId },
      name:
        options.rapporto?.id_rapporto?.trim() ||
        options.lavoratoreName?.trim() ||
        "Rapporto",
    },
  ]

  const lavoratoreId = options.rapporto?.lavoratore_id
  if (lavoratoreId) {
    entries.push({
      ref: { entityType: "lavoratore", entityId: lavoratoreId },
      name: options.lavoratoreName?.trim() || "Lavoratore",
    })
  }

  const ricercaId = resolveRapportoRicercaId(options.rapporto, options.processId)
  if (ricercaId) {
    entries.push({
      ref: { entityType: "ricerca", entityId: ricercaId },
      name: formatRicercaDisplayName({
        nomeFamiglia: options.famigliaName,
        numeroRicercaAttivata: options.ricercaLabel,
      }),
    })
  }

  const famigliaId = options.rapporto?.famiglia_id
  if (famigliaId) {
    entries.push({
      ref: { entityType: "famiglia", entityId: famigliaId },
      name: options.famigliaName?.trim() || "Famiglia",
    })
  }

  return buildDisplayNames(entries)
}

export function resolveAssunzioneCommentFocusId(
  card:
    | Pick<AssunzioniBoardCardData, "assunzione" | "lavoratoreAssunzione" | "rapporto">
    | null
    | undefined,
): string | null {
  // Assunzioni board cards are keyed by rapporto id (`card.id`). Never use that
  // as an `assunzione` page focus — scope rows are written for real `assunzioni.id`.
  return (
    card?.assunzione?.id ??
    card?.lavoratoreAssunzione?.id ??
    card?.rapporto?.assunzione_datore_id ??
    card?.rapporto?.assunzione_lavoratore_id ??
    null
  )
}

/** Synthetic focus section when Assunzioni has no `assunzioni` row yet. */
export const PENDING_ASSUNZIONE_SECTION_ID = "assunzione:pending"

/**
 * Page focus for the Assunzioni board sheet. Prefer a real assunzione id; when
 * the card has no assunzione yet (common — the board is indexed by rapporto),
 * fall back to rapporto focus so the messages pill still mounts and parent
 * comments remain listable. The UI stack then prepends a pending ASSUNZIONE
 * focus via {@link resolveAssunzioniBoardCommentStack} so both sections show.
 */
export function resolveAssunzioniBoardCommentPageFocus(
  card: AssunzioniBoardCardData | null | undefined,
): EntityRef | null {
  if (!card) return null

  const assunzioneId = resolveAssunzioneCommentFocusId(card)
  if (assunzioneId) {
    return { entityType: "assunzione", entityId: assunzioneId }
  }

  const rapportoId = card.rapporto?.id ?? card.id
  if (!rapportoId) return null
  return { entityType: "rapporto", entityId: rapportoId }
}

/**
 * Assunzioni board always shows ASSUNZIONE and RAPPORTO as separate sections.
 *
 * - Real assunzione id → normal stack (ASSUNZIONE focus + RAPPORTO ancestor).
 *   Writes on each section stay on that entity.
 * - No assunzione yet → page scope stays on `rapporto` (so RAPPORTO comments
 *   load), and we prepend a pending ASSUNZIONE focus (`entityRef: null`). That
 *   section is focus/empty and not writable until an assunzione row exists;
 *   users open RAPPORTO to read/write rapporto comments.
 */
export function resolveAssunzioniBoardCommentStack(input: {
  pageFocus: EntityRef
  row: Record<string, unknown>
  displayNames?: Record<string, string>
}): ResolveCommentStackResult {
  const stack = resolveCommentStack({
    focus: input.pageFocus,
    row: input.row,
    displayNames: input.displayNames,
  })

  if (input.pageFocus.entityType !== "rapporto") return stack

  const assunzioneMeta = ENTITY_SECTION_META.assunzione
  const displayName =
    input.displayNames?.[entityRefKey(input.pageFocus)]?.trim() || "Assunzione"

  const pendingFocus = {
    id: PENDING_ASSUNZIONE_SECTION_ID,
    kind: "focus" as const,
    entityRef: null,
    typeLabel: assunzioneMeta.typeLabel,
    displayName,
    icon: assunzioneMeta.icon,
    visibilityHint: null as string | null,
  }

  const entitySections = [
    pendingFocus,
    ...stack.sections
      .filter((section) => section.kind !== "descendants")
      .map((section) =>
        section.kind === "focus"
          ? { ...section, kind: "ancestor" as const, visibilityHint: null }
          : { ...section, visibilityHint: null },
      ),
  ]

  const descendants = stack.sections.filter((section) => section.kind === "descendants")

  const sections = [
    ...entitySections.map((section, index) => {
      if (index <= 0) return { ...section, visibilityHint: null }
      const names = entitySections
        .slice(0, index)
        .map((item) => item.displayName)
        .filter(Boolean)
      return {
        ...section,
        visibilityHint: names.length > 0 ? names.join(", ") : null,
      }
    }),
    ...descendants,
  ]

  const visibilityHintsByTarget: Record<string, string> = {}
  for (const section of sections) {
    if (!section.entityRef || !section.visibilityHint) continue
    visibilityHintsByTarget[entityRefKey(section.entityRef)] = section.visibilityHint
  }

  return {
    sections,
    chipOptions: stack.chipOptions,
    visibilityHintsByTarget,
  }
}

export function assunzioneCommentRow(card: AssunzioniBoardCardData): Record<string, unknown> {
  const assunzioneId = resolveAssunzioneCommentFocusId(card)
  const rapportiId = card.rapporto?.id ?? card.id
  const processiMatchingId = resolveRapportoRicercaId(card.rapporto, card.processId)
  const rapporto = serializeRapportoRow(card.rapporto, processiMatchingId)

  return {
    id: assunzioneId ?? rapportiId,
    lavoratore_id:
      card.assunzione?.lavoratore_id ??
      card.lavoratoreAssunzione?.lavoratore_id ??
      card.lavoratore?.id ??
      card.rapporto?.lavoratore_id,
    famiglia_id:
      card.famigliaId ??
      card.assunzione?.famiglia_id ??
      card.lavoratoreAssunzione?.famiglia_id ??
      card.rapporto?.famiglia_id,
    rapporto_lavorativo_id: rapportiId,
    processi_matching_id: processiMatchingId,
    rapporto,
  }
}

export function assunzioneDisplayNames(card: AssunzioniBoardCardData): Record<string, string> {
  const assunzioneId = resolveAssunzioneCommentFocusId(card)
  const entries: Array<{ ref: EntityRef; name: string }> = []

  if (assunzioneId) {
    entries.push({
      ref: { entityType: "assunzione", entityId: assunzioneId },
      name: card.nomeLavoratore?.trim() || "Assunzione",
    })
  }

  if (card.rapporto?.id) {
    entries.push({
      ref: { entityType: "rapporto", entityId: card.rapporto.id },
      name: card.nomeLavoratore?.trim() || "Rapporto",
    })
  }

  if (card.lavoratore?.id) {
    entries.push({
      ref: { entityType: "lavoratore", entityId: card.lavoratore.id },
      name: card.nomeLavoratore?.trim() || "Lavoratore",
    })
  }

  const ricercaId = resolveRapportoRicercaId(card.rapporto, card.processId)
  if (ricercaId) {
    entries.push({
      ref: { entityType: "ricerca", entityId: ricercaId },
      name: formatRicercaDisplayName({
        nomeFamiglia: card.nomeFamiglia,
        titoloAnnuncio: card.titoloAnnuncio,
      }),
    })
  }

  if (card.famigliaId) {
    entries.push({
      ref: { entityType: "famiglia", entityId: card.famigliaId },
      name: card.nomeFamiglia?.trim() || "Famiglia",
    })
  }

  return buildDisplayNames(entries)
}

export function chiusuraCommentRow(card: ChiusureBoardCardData): Record<string, unknown> {
  const processiMatchingId = resolveRapportoRicercaId(card.rapporto)
  const rapporto = serializeRapportoRow(card.rapporto, processiMatchingId)

  return {
    record: card.record,
    id: card.id,
    rapporto_lavorativo_id: card.rapporto?.id,
    processi_matching_id: processiMatchingId,
    rapporto,
  }
}

export function chiusuraDisplayNames(card: ChiusureBoardCardData): Record<string, string> {
  const entries: Array<{ ref: EntityRef; name: string }> = [
    {
      ref: { entityType: "chiusura", entityId: card.id },
      name: card.nomeCompleto?.trim() || "Chiusura",
    },
  ]

  if (card.rapporto?.id) {
    entries.push({
      ref: { entityType: "rapporto", entityId: card.rapporto.id },
      name: card.nomeCompleto?.trim() || "Rapporto",
    })
  }

  if (card.rapporto?.lavoratore_id) {
    entries.push({
      ref: { entityType: "lavoratore", entityId: card.rapporto.lavoratore_id },
      name: card.nomeCompleto?.trim() || "Lavoratore",
    })
  }

  const ricercaId = resolveRapportoRicercaId(card.rapporto)
  if (ricercaId) {
    entries.push({
      ref: { entityType: "ricerca", entityId: ricercaId },
      name: formatRicercaDisplayName({ nomeFamiglia: card.nomeCompleto }),
    })
  }

  if (card.rapporto?.famiglia_id) {
    entries.push({
      ref: { entityType: "famiglia", entityId: card.rapporto.famiglia_id },
      name: card.nomeCompleto?.trim() || "Famiglia",
    })
  }

  return buildDisplayNames(entries)
}

export function variazioneCommentRow(card: VariazioniBoardCardData): Record<string, unknown> {
  const processiMatchingId = resolveRapportoRicercaId(card.rapporto)
  const rapporto = serializeRapportoRow(card.rapporto, processiMatchingId)

  return {
    id: card.id,
    record: card.record,
    rapporto_lavorativo_id: card.rapporto?.id,
    processi_matching_id: processiMatchingId,
    rapporto,
  }
}

export function variazioneDisplayNames(card: VariazioniBoardCardData): Record<string, string> {
  const entries: Array<{ ref: EntityRef; name: string }> = [
    {
      ref: { entityType: "variazione", entityId: card.id },
      name: card.nomeCompleto?.trim() || "Variazione",
    },
  ]

  if (card.rapporto?.id) {
    entries.push({
      ref: { entityType: "rapporto", entityId: card.rapporto.id },
      name: card.nomeCompleto?.trim() || "Rapporto",
    })
  }

  const lavoratoreId =
    card.rapporto?.lavoratore_id ??
    (typeof card.lavoratore?.id === "string" ? card.lavoratore.id : null)
  if (lavoratoreId) {
    entries.push({
      ref: { entityType: "lavoratore", entityId: lavoratoreId },
      name: card.nomeCompleto?.trim() || "Lavoratore",
    })
  }

  const ricercaId = resolveRapportoRicercaId(card.rapporto)
  if (ricercaId) {
    entries.push({
      ref: { entityType: "ricerca", entityId: ricercaId },
      name: formatRicercaDisplayName({ nomeFamiglia: card.nomeCompleto }),
    })
  }

  const famigliaId =
    card.rapporto?.famiglia_id ??
    (typeof card.famiglia?.id === "string" ? card.famiglia.id : null)
  if (famigliaId) {
    entries.push({
      ref: { entityType: "famiglia", entityId: famigliaId },
      name: card.nomeCompleto?.trim() || "Famiglia",
    })
  }

  return buildDisplayNames(entries)
}

export function candidaturaCommentRow(input: {
  selectionId: string
  processId: string
  famigliaId?: string | null
  lavoratoreId?: string | null
  workerName?: string | null
  ricercaLabel?: string | null
  famigliaName?: string | null
}): Record<string, unknown> {
  return {
    id: input.selectionId,
    lavoratore_id: input.lavoratoreId,
    processo_matching_id: input.processId,
    processi_matching_id: input.processId,
    famiglia_id: input.famigliaId,
    process: input.famigliaId ? { famiglia_id: input.famigliaId } : undefined,
  }
}

export function candidaturaDisplayNames(input: {
  selectionId: string
  processId: string
  famigliaId?: string | null
  lavoratoreId?: string | null
  workerName?: string | null
  ricercaLabel?: string | null
  famigliaName?: string | null
}): Record<string, string> {
  const entries: Array<{ ref: EntityRef; name: string }> = [
    {
      ref: { entityType: "candidatura", entityId: input.selectionId },
      name: input.workerName?.trim() || "Candidatura",
    },
  ]

  if (input.lavoratoreId) {
    entries.push({
      ref: { entityType: "lavoratore", entityId: input.lavoratoreId },
      name: input.workerName?.trim() || "Lavoratore",
    })
  }

  entries.push({
    ref: { entityType: "ricerca", entityId: input.processId },
    name: formatRicercaDisplayName({
      nomeFamiglia: input.famigliaName,
      numeroRicercaAttivata: input.ricercaLabel,
    }),
  })

  if (input.famigliaId) {
    entries.push({
      ref: { entityType: "famiglia", entityId: input.famigliaId },
      name: input.famigliaName?.trim() || "Famiglia",
    })
  }

  return buildDisplayNames(entries)
}

export function cedolinoCommentRow(card: PayrollBoardCardData): Record<string, unknown> {
  const processiMatchingId = resolveRapportoRicercaId(card.rapporto)
  const rapporto = serializeRapportoRow(card.rapporto, processiMatchingId)

  return {
    id: card.id,
    record: card.record,
    rapporto_lavorativo_id: card.rapporto?.id,
    processi_matching_id: processiMatchingId,
    rapporto,
  }
}

export function cedolinoDisplayNames(card: PayrollBoardCardData): Record<string, string> {
  const entries: Array<{ ref: EntityRef; name: string }> = [
    {
      ref: { entityType: "cedolino", entityId: card.id },
      name: card.nomeCompleto?.trim() || "Cedolino",
    },
  ]

  if (card.rapporto?.id) {
    entries.push({
      ref: { entityType: "rapporto", entityId: card.rapporto.id },
      name: card.nomeCompleto?.trim() || "Rapporto",
    })
  }

  if (card.rapporto?.lavoratore_id) {
    entries.push({
      ref: { entityType: "lavoratore", entityId: card.rapporto.lavoratore_id },
      name: card.nomeCompleto?.trim() || "Lavoratore",
    })
  }

  const ricercaId = resolveRapportoRicercaId(card.rapporto)
  if (ricercaId) {
    entries.push({
      ref: { entityType: "ricerca", entityId: ricercaId },
      name: formatRicercaDisplayName({ nomeFamiglia: card.nomeCompleto }),
    })
  }

  if (card.rapporto?.famiglia_id) {
    entries.push({
      ref: { entityType: "famiglia", entityId: card.rapporto.famiglia_id },
      name: card.nomeCompleto?.trim() || "Famiglia",
    })
  }

  return buildDisplayNames(entries)
}

export function contributiCommentRow(
  card: ContributoInpsBoardCardData,
): Record<string, unknown> {
  const processiMatchingId = resolveRapportoRicercaId(card.rapporto)
  const rapporto = serializeRapportoRow(card.rapporto, processiMatchingId)

  return {
    id: card.id,
    record: card.record,
    rapporto_lavorativo_id: card.rapporto?.id,
    processi_matching_id: processiMatchingId,
    rapporto,
  }
}

export function contributiDisplayNames(
  card: ContributoInpsBoardCardData,
): Record<string, string> {
  const entries: Array<{ ref: EntityRef; name: string }> = [
    {
      ref: { entityType: "contributi", entityId: card.id },
      name: card.nomeCompleto?.trim() || "Contributi INPS",
    },
  ]

  if (card.rapporto?.id) {
    entries.push({
      ref: { entityType: "rapporto", entityId: card.rapporto.id },
      name: card.nomeCompleto?.trim() || "Rapporto",
    })
  }

  if (card.rapporto?.lavoratore_id) {
    entries.push({
      ref: { entityType: "lavoratore", entityId: card.rapporto.lavoratore_id },
      name: card.nomeCompleto?.trim() || "Lavoratore",
    })
  }

  const ricercaId = resolveRapportoRicercaId(card.rapporto)
  if (ricercaId) {
    entries.push({
      ref: { entityType: "ricerca", entityId: ricercaId },
      name: formatRicercaDisplayName({ nomeFamiglia: card.nomeCompleto }),
    })
  }

  if (card.rapporto?.famiglia_id) {
    entries.push({
      ref: { entityType: "famiglia", entityId: card.rapporto.famiglia_id },
      name: card.nomeCompleto?.trim() || "Famiglia",
    })
  }

  return buildDisplayNames(entries)
}

export function ticketCommentRow(card: SupportTicketBoardCardData): Record<string, unknown> {
  const rapporto = serializeRapportoRow(card.rapporto)

  return {
    id: card.id,
    record: card.record,
    rapporto_id: card.rapporto?.id,
    rapporto,
  }
}

export function ticketDisplayNames(card: SupportTicketBoardCardData): Record<string, string> {
  const entries: Array<{ ref: EntityRef; name: string }> = [
    {
      ref: { entityType: "ticket", entityId: card.id },
      name: card.causale?.trim() || card.nomeCompleto?.trim() || "Ticket",
    },
  ]

  if (card.rapporto?.id) {
    entries.push({
      ref: { entityType: "rapporto", entityId: card.rapporto.id },
      name: card.nomeCompleto?.trim() || "Rapporto",
    })
  }

  return buildDisplayNames(entries)
}
