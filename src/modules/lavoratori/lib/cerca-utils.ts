import type { RicercaBoardCardData } from "@/modules/ricerca/types"
import { fetchFamiglieByIds, fetchFamiglieSearch } from "@/modules/crm/queries"
import {
  fetchProcessiMatchingByIds,
  fetchProcessiMatchingSearch,
} from "@/modules/ricerca/queries"

import { asInputValue, asString, readArrayStrings } from "./base-utils"

export type WorkerRelatedSearchItem = {
  selectionId: string
  processId: string
  familyName: string
  ricercaLabel: string
  recruiterLabel: string
  statoSelezione: string
  statoRicerca: string
  orarioDiLavoro: string
  zona: string
  appunti: string
  boardCard: RicercaBoardCardData
}

export type SearchProcessResult = {
  processId: string
  familyId: string
  familyName: string
  familyEmail: string
  searchLabel: string
  statoRicerca: string
  tipoLavoro: string
  tipoRapporto: string
  orarioDiLavoro: string
  zona: string
}

const RELATED_FAMILY_BATCH_SIZE = 150

export function sanitizeFileName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
}

export function formatRelatedFamilyName(
  row: Record<string, unknown> | null | undefined,
) {
  const familyName = [asString(row?.nome), asString(row?.cognome)]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .trim()

  return familyName || "Famiglia senza nome"
}

export function formatRelatedSearchLabel(processRow: Record<string, unknown>) {
  const searchNumber = asInputValue(processRow.numero_ricerca_attivata)
  if (searchNumber) return `Ricerca #${searchNumber}`

  const processId = asString(processRow.id)
  return processId ? `Ricerca ${processId.slice(0, 8)}` : "Ricerca"
}

export function formatRelatedZona(processRow: Record<string, unknown>) {
  const parts = [
    asString(processRow.indirizzo_prova_comune),
    asString(processRow.indirizzo_prova_provincia),
    asString(processRow.indirizzo_prova_cap),
    asString(processRow.indirizzo_prova_note),
  ].filter(
    (value, index, values): value is string =>
      Boolean(value) && values.indexOf(value) === index,
  )

  return parts.join(" • ") || "-"
}

export function getFirstLookupArrayValue(value: unknown) {
  return readArrayStrings(value)[0] ?? null
}

export function getLookupArrayValues(value: unknown) {
  return readArrayStrings(value)
}

export function formatSearchProcessResult(
  processRow: Record<string, unknown>,
  familyRow: Record<string, unknown> | null | undefined,
): SearchProcessResult | null {
  const processId = asString(processRow.id)
  if (!processId) return null

  const familyId = asString(processRow.famiglia_id) ?? ""
  const familyEmail =
    asString(familyRow?.email) ??
    asString(familyRow?.customer_email) ??
    asString(familyRow?.secondary_email) ??
    "-"

  return {
    processId,
    familyId,
    familyName: formatRelatedFamilyName(familyRow),
    familyEmail,
    searchLabel: formatRelatedSearchLabel(processRow),
    statoRicerca: asString(processRow.stato_res) || "-",
    tipoLavoro: getLookupArrayValues(processRow.tipo_lavoro).join(", ") || "-",
    tipoRapporto: getFirstLookupArrayValue(processRow.tipo_rapporto) ?? "-",
    orarioDiLavoro: asString(processRow.orario_di_lavoro) || "-",
    zona: formatRelatedZona(processRow),
  }
}

async function fetchRelatedFamiliesByIds(familyIds: string[]) {
  if (familyIds.length === 0) return []

  const rows: Record<string, unknown>[] = []

  for (
    let index = 0;
    index < familyIds.length;
    index += RELATED_FAMILY_BATCH_SIZE
  ) {
    const batch = familyIds.slice(index, index + RELATED_FAMILY_BATCH_SIZE)
    const result = await fetchFamiglieByIds(batch)

    if (Array.isArray(result.rows)) {
      rows.push(...(result.rows as Record<string, unknown>[]))
    }
  }

  return rows
}

export async function searchProcessesForWorkerAdd(query: string) {
  const normalizedQuery = query.trim()
  if (normalizedQuery.length < 2) return []

  const familyRowsResult = await fetchFamiglieSearch(normalizedQuery, 10)

  const familyRows = Array.isArray(familyRowsResult.rows)
    ? (familyRowsResult.rows as Record<string, unknown>[])
    : []
  const familyRowsById = new Map<string, Record<string, unknown>>()

  for (const familyRow of familyRows) {
    const familyId = asString(familyRow.id)
    if (familyId) familyRowsById.set(familyId, familyRow)
  }

  const familyIds = familyRows
    .map((familyRow) => asString(familyRow.id))
    .filter((value): value is string => Boolean(value))

  const processRowsById = new Map<string, Record<string, unknown>>()

  if (familyIds.length > 0) {
    const familyProcesses = await fetchProcessiMatchingByIds({
      famigliaIds: familyIds,
    })

    for (const processRow of (
      familyProcesses.rows as Record<string, unknown>[]
    ).slice(0, 25)) {
      const processId = asString(processRow.id)
      if (processId) processRowsById.set(processId, processRow)
    }
  }

  const directProcesses = await fetchProcessiMatchingSearch(normalizedQuery, 12)

  for (const processRow of directProcesses.rows as Record<string, unknown>[]) {
    const processId = asString(processRow.id)
    if (processId) processRowsById.set(processId, processRow)
  }

  const missingFamilyIds = Array.from(
    new Set(
      Array.from(processRowsById.values())
        .map((processRow) => asString(processRow.famiglia_id))
        .filter(
          (value): value is string =>
            Boolean(value) && !familyRowsById.has(value),
        ),
    ),
  )
  const missingFamilyRows = await fetchRelatedFamiliesByIds(missingFamilyIds)
  for (const familyRow of missingFamilyRows) {
    const familyId = asString(familyRow.id)
    if (familyId) familyRowsById.set(familyId, familyRow)
  }

  return Array.from(processRowsById.values())
    .map((processRow) =>
      formatSearchProcessResult(
        processRow,
        familyRowsById.get(asString(processRow.famiglia_id) ?? ""),
      ),
    )
    .filter((result): result is SearchProcessResult => Boolean(result))
    .slice(0, 12)
}
