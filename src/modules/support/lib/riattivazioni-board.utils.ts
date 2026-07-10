import { matchesSearchQuery } from "@/lib/search-utils"
import { formatItalianDate } from "@/lib/value-utils"
import { fetchAssunzioniNamesByRapportoIds } from "@/modules/gestione-contrattuale/queries"
import type { RapportoAssunzioneNames } from "@/modules/gestione-contrattuale/types"
import {
  formatPersonName,
  getRapportoFamilyLabel,
  getRapportoTitle,
  getRapportoWorkerLabel,
} from "@/modules/rapporti/lib"
import type {
  ChiusuraContrattoRecord,
  FamigliaRecord,
  LavoratoreRecord,
  RapportoLavorativoRecord,
} from "@/types"

import { fetchRiattivazioniBoard } from "../queries/fetch-riattivazioni-board"
import type {
  RiattivazioneStageId,
  RiattivazioniBoardCardData,
  RiattivazioniBoardColumnData,
} from "../types"
import type { RiattivazioniBoardRpcCard } from "../types/support-rpc"
import {
  getChiusuraTipoLabel,
  resolveStage,
  RIATTIVAZIONI_STAGE_DEFINITIONS,
  shouldIncludeRiattivazioneCard,
} from "./riattivazioni-stage"

type RiattivazioneFamigliaLookup = Pick<FamigliaRecord, "id" | "nome" | "cognome" | "email">

type RiattivazioneLavoratoreLookup = Pick<LavoratoreRecord, "id" | "nome" | "cognome" | "email">

export function mapRiattivazioneBoardCard(input: {
  record: ChiusuraContrattoRecord
  rapporto: RapportoLavorativoRecord | null
  stage: RiattivazioneStageId
  famiglia: RiattivazioneFamigliaLookup | null
  lavoratore: RiattivazioneLavoratoreLookup | null
  assunzioneNames: RapportoAssunzioneNames | null
}): RiattivazioniBoardCardData {
  const { record, rapporto, stage, famiglia, lavoratore, assunzioneNames } = input
  const famigliaLabel = rapporto
    ? getRapportoFamilyLabel(rapporto, famiglia, assunzioneNames?.datore)
    : (formatPersonName(record) ?? "Famiglia senza nome")
  const lavoratoreLabel = rapporto
    ? getRapportoWorkerLabel(rapporto, lavoratore, assunzioneNames?.lavoratore)
    : "Lavoratore non associato"
  const nomeCompleto = rapporto
    ? getRapportoTitle(rapporto, {
        famiglia,
        lavoratore,
        assunzioneDatore: assunzioneNames?.datore,
        assunzioneLavoratore: assunzioneNames?.lavoratore,
      })
    : famigliaLabel

  return {
    id: record.id,
    stage,
    record,
    rapporto,
    nomeCompleto,
    famigliaLabel,
    lavoratoreLabel,
    email: record.email ?? famiglia?.email ?? "-",
    motivazione: record.motivazione_lost,
    dataFineRapporto: formatItalianDate(record.data_fine_rapporto),
    tipoLabel: getChiusuraTipoLabel(record),
  }
}

function collectRiattivazioneLookups(rows: RiattivazioniBoardRpcCard[]) {
  const famigliaById = new Map<string, RiattivazioneFamigliaLookup>()
  const lavoratoreById = new Map<string, RiattivazioneLavoratoreLookup>()
  const includedRows: Array<{
    record: ChiusuraContrattoRecord
    rapporto: RapportoLavorativoRecord | null
    stage: RiattivazioneStageId
  }> = []

  for (const row of rows) {
    const record = row.record
    const rapporto = row.rapporto ?? null
    if (!shouldIncludeRiattivazioneCard(record, rapporto)) continue

    includedRows.push({
      record,
      rapporto,
      stage: resolveStage(record.stato_riattivazione_famiglia),
    })
    if (row.famiglia) famigliaById.set(row.famiglia.id, row.famiglia)
    if (row.lavoratore) lavoratoreById.set(row.lavoratore.id, row.lavoratore)
  }

  return { includedRows, famigliaById, lavoratoreById }
}

export async function fetchRiattivazioniBoardData(): Promise<{
  columns: RiattivazioniBoardColumnData[]
}> {
  const boardResult = await fetchRiattivazioniBoard()
  const { includedRows, famigliaById, lavoratoreById } = collectRiattivazioneLookups(
    boardResult.cards,
  )

  const assunzioneNamesByRapporto = await fetchAssunzioniNamesByRapportoIds(
    includedRows
      .map(({ rapporto }) => rapporto?.id)
      .filter((id): id is string => Boolean(id)),
  )

  const cardsByStage = new Map<RiattivazioneStageId, RiattivazioniBoardCardData[]>(
    RIATTIVAZIONI_STAGE_DEFINITIONS.map((stage) => [stage.id, []]),
  )

  for (const { record, rapporto, stage } of includedRows) {
    const famiglia = rapporto?.famiglia_id ? famigliaById.get(rapporto.famiglia_id) ?? null : null
    const lavoratore = rapporto?.lavoratore_id
      ? lavoratoreById.get(rapporto.lavoratore_id) ?? null
      : null
    const assunzioneNames = rapporto ? assunzioneNamesByRapporto[rapporto.id] ?? null : null

    const card = mapRiattivazioneBoardCard({
      record,
      rapporto,
      stage,
      famiglia,
      lavoratore,
      assunzioneNames,
    })
    cardsByStage.get(stage)?.push(card)
  }

  return {
    columns: RIATTIVAZIONI_STAGE_DEFINITIONS.map((stage) => ({
      id: stage.id,
      label: stage.label,
      color: stage.color,
      cards: cardsByStage.get(stage.id) ?? [],
    })),
  }
}

export function riattivazioniStageTestId(stageId: string) {
  return `kanban-column-${stageId.replace(/\s+/g, "_")}`
}

export function getStageColor(stageId: RiattivazioneStageId) {
  return (
    RIATTIVAZIONI_STAGE_DEFINITIONS.find((stage) => stage.id === stageId)?.color ?? "sky"
  )
}

function getRiattivazioneSearchFields(card: RiattivazioniBoardCardData) {
  return [
    card.id,
    card.nomeCompleto,
    card.famigliaLabel,
    card.lavoratoreLabel,
    card.email,
    card.motivazione,
    card.tipoLabel,
    card.dataFineRapporto,
    card.record.data_per_riattivazione,
    card.record.sconto_proposto_riattivazione,
    card.stage,
    card.rapporto?.id,
    card.rapporto?.id_rapporto,
    card.rapporto?.cognome_nome_datore_proper,
    card.rapporto?.nome_lavoratore_per_url,
    card.rapporto?.tipo_rapporto,
    card.rapporto?.tipo_contratto,
  ]
}

export function filterRiattivazioniColumns(
  columns: RiattivazioniBoardColumnData[],
  searchValue: string,
) {
  return columns.map((column) => ({
    ...column,
    cards: column.cards.filter((card) =>
      matchesSearchQuery(getRiattivazioneSearchFields(card), searchValue),
    ),
  }))
}

export function countRiattivazioniCards(columns: RiattivazioniBoardColumnData[]) {
  return columns.reduce((sum, column) => sum + column.cards.length, 0)
}
