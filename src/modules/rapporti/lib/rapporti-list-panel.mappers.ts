import { evaluateGroup, type FilterField, type FilterGroup } from "@/components/data-table/data-table-filters"
import { resolveLookupColor } from "@/lib/lookup-utils"
import type { RapportoAssunzioneNames } from "@/modules/gestione-contrattuale/types"
import {
  getRapportoFamilyLabel,
  getRapportoWorkerLabel,
  resolveRapportoStatus,
} from "@/modules/rapporti/lib"
import type { RapportoLavorativoRecord } from "@/types"

import {
  sortByOperationalStatus,
  sortItems,
  type RapportiListItem,
} from "./list-panel-utils"

export function getRapportiListStatusBadgeLabel(value: string | null | undefined) {
  const normalized = String(value ?? "").trim()
  return normalized || "Sconosciuto"
}

export function getRapportiListStatusColor(
  lookupColorsByDomain: Map<string, string>,
  domain: string,
  value: string | null,
) {
  return resolveLookupColor(lookupColorsByDomain, domain, value)
}

export function getRapportiListGroupLookupColor(
  groupField: string,
  groupValue: string,
  lookupColorsByDomain: Map<string, string>,
) {
  if (groupField === "stato_rapporto") {
    return getRapportiListStatusColor(
      lookupColorsByDomain,
      "rapporti_lavorativi.stato_rapporto",
      groupValue,
    )
  }

  if (groupField === "stato_assunzione") {
    return getRapportiListStatusColor(
      lookupColorsByDomain,
      "rapporti_lavorativi.stato_assunzione",
      groupValue,
    )
  }

  if (groupField === "stato_riattivazione") {
    return getRapportiListStatusColor(
      lookupColorsByDomain,
      "rapporti_lavorativi.stato_riattivazione",
      groupValue,
    )
  }

  return null
}

function uniqueSortedValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))),
  ).sort((left, right) => left.localeCompare(right))
}

export function mapRapportiToListItems(
  rapporti: RapportoLavorativoRecord[],
  assunzioneNamesByRapporto?: Record<string, RapportoAssunzioneNames>,
): RapportiListItem[] {
  return rapporti.map((rapporto) => {
    const statoRapporto = resolveRapportoStatus(rapporto)
    const assunzioneNames = assunzioneNamesByRapporto?.[rapporto.id] ?? null

    return {
      id: rapporto.id,
      famigliaLabel: getRapportoFamilyLabel(rapporto, null, assunzioneNames?.datore),
      lavoratoreLabel: getRapportoWorkerLabel(rapporto, null, assunzioneNames?.lavoratore),
      stato_rapporto: statoRapporto,
      stato_servizio: rapporto.stato_servizio,
      stato_assunzione: rapporto.stato_assunzione,
      stato_riattivazione: rapporto.stato_riattivazione,
      tipo_contratto: rapporto.tipo_contratto,
      tipo_rapporto: rapporto.tipo_rapporto,
      ore_a_settimana: rapporto.ore_a_settimana,
      data_inizio_rapporto: rapporto.data_inizio_rapporto,
      distribuzione_ore_settimana: rapporto.distribuzione_ore_settimana,
      raw: { ...rapporto, stato_rapporto: statoRapporto },
    }
  })
}

export function buildRapportiListFilterFields(
  items: RapportiListItem[],
  rapporti: RapportoLavorativoRecord[],
): FilterField[] {
  const uniqueAssunzioni = uniqueSortedValues(rapporti.map((rapporto) => rapporto.stato_assunzione))
  const uniqueTipiContratto = uniqueSortedValues(rapporti.map((rapporto) => rapporto.tipo_contratto))
  const uniqueTipiRapporto = uniqueSortedValues(rapporti.map((rapporto) => rapporto.tipo_rapporto))

  return [
    {
      label: "Stato rapporto",
      value: "stato_rapporto",
      type: "enum",
      options: uniqueSortedValues(items.map((item) => item.stato_rapporto)).map((value) => ({
        label: value,
        value,
      })),
    },
    {
      label: "Stato servizio",
      value: "stato_servizio",
      type: "enum",
      options: uniqueSortedValues(items.map((item) => item.stato_servizio)).map((value) => ({
        label: value,
        value,
      })),
    },
    {
      label: "Stato assunzione",
      value: "stato_assunzione",
      type: "enum",
      options: uniqueAssunzioni.map((value) => ({ label: value, value })),
    },
    {
      label: "Tipo contratto",
      value: "tipo_contratto",
      type: "enum",
      options: uniqueTipiContratto.map((value) => ({ label: value, value })),
    },
    {
      label: "Tipo rapporto",
      value: "tipo_rapporto",
      type: "enum",
      options: uniqueTipiRapporto.map((value) => ({ label: value, value })),
    },
  ]
}

export function filterVisibleRapportiListItems(
  items: RapportiListItem[],
  filters: FilterGroup,
  filterFields: FilterField[],
  sorting: Array<{ id: string; desc: boolean }>,
) {
  const filtered = items.filter((rapporto) =>
    evaluateGroup(rapporto as unknown as Record<string, unknown>, filters, filterFields),
  )

  return sorting.length > 0 ? sortItems(filtered, sorting) : sortByOperationalStatus(filtered)
}
