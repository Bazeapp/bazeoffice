import { entityRefKey } from "./entity-ref"
import type { EntityRef } from "../types/entity"
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
): Record<string, unknown> | null {
  if (!rapporto) return null

  return {
    id: rapporto.id,
    lavoratore_id: rapporto.lavoratore_id,
    famiglia_id: rapporto.famiglia_id,
    processi_matching_id: rapporto.processi_matching_id,
    nome_lavoratore_per_url: rapporto.nome_lavoratore_per_url,
    id_rapporto: rapporto.id_rapporto,
  }
}

export function rapportoCommentRow(
  rapportoId: string,
  rapporto?: RapportoLavorativoRecord | null,
): Record<string, unknown> {
  const serialized = serializeRapportoRow(rapporto)
  return {
    ...(serialized ?? {}),
    id: rapportoId,
    rapporto_lavorativo_id: rapportoId,
    rapporto: serialized,
  }
}

export function rapportoDisplayNames(
  rapportoId: string,
  options: {
    lavoratoreName?: string | null
    famigliaName?: string | null
    ricercaLabel?: string | null
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

  const ricercaId = options.rapporto?.processi_matching_id
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

export function assunzioneCommentRow(card: AssunzioniBoardCardData): Record<string, unknown> {
  const assunzioneId = card.assunzione?.id ?? card.id
  const rapporto = serializeRapportoRow(card.rapporto)

  return {
    id: assunzioneId,
    lavoratore_id: card.assunzione?.lavoratore_id ?? card.lavoratore?.id ?? card.rapporto?.lavoratore_id,
    famiglia_id: card.famigliaId ?? card.assunzione?.famiglia_id ?? card.rapporto?.famiglia_id,
    rapporto_lavorativo_id: card.rapporto?.id ?? card.id,
    rapporto,
  }
}

export function assunzioneDisplayNames(card: AssunzioniBoardCardData): Record<string, string> {
  const assunzioneId = card.assunzione?.id ?? card.id
  const entries: Array<{ ref: EntityRef; name: string }> = [
    {
      ref: { entityType: "assunzione", entityId: assunzioneId },
      name: card.nomeLavoratore?.trim() || "Assunzione",
    },
  ]

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

  if (card.processId) {
    entries.push({
      ref: { entityType: "ricerca", entityId: card.processId },
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
  const rapporto = serializeRapportoRow(card.rapporto)

  return {
    record: card.record,
    id: card.id,
    rapporto_lavorativo_id: card.rapporto?.id,
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

  return buildDisplayNames(entries)
}

export function variazioneCommentRow(card: VariazioniBoardCardData): Record<string, unknown> {
  const rapporto = serializeRapportoRow(card.rapporto)

  return {
    id: card.id,
    record: card.record,
    rapporto_lavorativo_id: card.rapporto?.id,
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
  const rapporto = serializeRapportoRow(card.rapporto)

  return {
    id: card.id,
    record: card.record,
    rapporto_lavorativo_id: card.rapporto?.id,
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

  return buildDisplayNames(entries)
}

export function contributiCommentRow(
  card: ContributoInpsBoardCardData,
): Record<string, unknown> {
  const rapporto = serializeRapportoRow(card.rapporto)

  return {
    id: card.id,
    record: card.record,
    rapporto_lavorativo_id: card.rapporto?.id,
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
