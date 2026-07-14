import { ENTITY_SECTION_META } from "./consts"
import type { EntityRef, EntityType } from "../types/entity"
import { entityRefKey } from "./entity-ref"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value)
}

export function readObject(
  row: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  const value = row[key]
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function readStringId(
  row: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = row[key]
    if (isUuid(value)) return value
  }
  return null
}

export function readPersonName(row: Record<string, unknown>): string | null {
  const nome = typeof row.nome === "string" ? row.nome.trim() : ""
  const cognome = typeof row.cognome === "string" ? row.cognome.trim() : ""
  const fullName = [nome, cognome].filter(Boolean).join(" ").trim()
  return fullName || null
}

export function readRapportoRow(row: Record<string, unknown>): Record<string, unknown> | null {
  const nested = readObject(row, "rapporto")
  if (nested) return nested

  const rapportoId = readStringId(row, ["rapporto_lavorativo_id", "rapporto_id"])
  if (!rapportoId) return null

  return {
    id: rapportoId,
    lavoratore_id: row.lavoratore_id,
    famiglia_id: row.famiglia_id,
    processi_matching_id: row.processi_matching_id ?? row.processo_matching_id,
  }
}

export function resolveDisplayName(
  ref: EntityRef,
  row: Record<string, unknown>,
  displayNames?: Record<string, string>,
): string {
  const override = displayNames?.[entityRefKey(ref)]
  if (override) return override

  if (ref.entityType === "famiglia") {
    const famigliaRow =
      readObject(row, "famiglia") ??
      (ref.entityId === readStringId(row, ["famiglia_id", "id_famiglia"]) ? row : null)
    const name = famigliaRow ? readPersonName(famigliaRow) : null
    if (name) return name
  }

  if (ref.entityType === "lavoratore") {
    const workerRow =
      readObject(row, "lavoratore") ??
      (ref.entityId === readStringId(row, ["lavoratore_id", "id_lavoratore"]) ? row : null)
    const name = workerRow ? readPersonName(workerRow) : null
    if (name) return name
  }

  if (ref.entityType === "ricerca") {
    const processRow =
      readObject(row, "process") ??
      readObject(row, "processo") ??
      (ref.entityId ===
      readStringId(row, ["processo_matching_id", "processi_matching_id", "id_processo_matching"])
        ? row
        : null)
    const title =
      (typeof processRow?.titolo_annuncio === "string" && processRow.titolo_annuncio.trim()) ||
      (typeof processRow?.titolo === "string" && processRow.titolo.trim()) ||
      null
    if (title) return title
  }

  if (ref.entityType === "rapporto") {
    const rapportoRow = readRapportoRow(row)
    const label =
      (typeof rapportoRow?.id_rapporto === "string" && rapportoRow.id_rapporto.trim()) ||
      (typeof rapportoRow?.nome_lavoratore_per_url === "string" &&
        rapportoRow.nome_lavoratore_per_url.trim()) ||
      null
    if (label) return label
  }

  if (ref.entityType === "candidatura") {
    const label =
      (typeof row.stato_selezione === "string" && row.stato_selezione.trim()) || null
    if (label) return label
  }

  if (ref.entityType === "assunzione") {
    const label =
      (typeof row.mansione_lavoratore === "string" && row.mansione_lavoratore.trim()) ||
      readPersonName(row) ||
      null
    if (label) return label
  }

  if (ref.entityType === "variazione") {
    const label =
      (typeof row.variazione_da_applicare === "string" && row.variazione_da_applicare.trim()) ||
      null
    if (label) return label
  }

  if (ref.entityType === "chiusura") {
    const chiusuraRow = readObject(row, "record") ?? row
    const label = readPersonName(chiusuraRow)
    if (label) return label
  }

  if (ref.entityType === "cedolino") {
    const label = (typeof row.mese_id === "string" && row.mese_id.trim()) || null
    if (label) return label
  }

  if (ref.entityType === "contributi") {
    const label =
      (typeof row.stato_contributi_inps === "string" && row.stato_contributi_inps.trim()) ||
      null
    if (label) return label
  }

  if (ref.entityType === "ticket") {
    const label =
      (typeof row.causale === "string" && row.causale.trim()) ||
      (typeof row.tipo === "string" && row.tipo.trim()) ||
      null
    if (label) return label
  }

  return ENTITY_SECTION_META[ref.entityType].typeLabel
}

export function pushUniqueRef(
  refs: EntityRef[],
  seen: Set<string>,
  entityType: EntityType,
  entityId: string | null,
): void {
  if (!entityId || seen.has(entityType)) return
  seen.add(entityType)
  refs.push({ entityType, entityId })
}

export function pushRefFromRow(
  refs: EntityRef[],
  seen: Set<string>,
  entityType: EntityType,
  sourceRow: Record<string, unknown>,
  keys: readonly string[],
): void {
  pushUniqueRef(refs, seen, entityType, readStringId(sourceRow, keys))
}

export function collectRapportoChainRefs(
  rapportoRow: Record<string, unknown>,
  seen: Set<string>,
): EntityRef[] {
  const refs: EntityRef[] = []
  pushRefFromRow(refs, seen, "rapporto", rapportoRow, ["id"])
  pushRefFromRow(refs, seen, "lavoratore", rapportoRow, ["lavoratore_id", "id_lavoratore"])
  pushRefFromRow(refs, seen, "ricerca", rapportoRow, [
    "processi_matching_id",
    "processo_matching_id",
    "id_processo_matching",
  ])
  pushRefFromRow(refs, seen, "famiglia", rapportoRow, ["famiglia_id", "id_famiglia"])
  return refs
}
