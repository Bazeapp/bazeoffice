import { toIsoDateInputValue } from "@/lib/format-utils"

import type { PayrollBoardCardData } from "../types"
import { normalizeCaseFlag } from "./cedolini-filters"
import {
  EMPTY_PRESENCE_SELECT_VALUE,
  PRESENCE_DAY_FIELD_REGEX,
  type PresenceDayRow,
} from "./payroll-display-utils"

export function buildPresenceFieldDefaults(
  presenceRows: PresenceDayRow[],
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of presenceRows) {
    out[`ore_day_${row.day}`] = row.hours
    out[`evento_day_${row.day}`] = row.event || EMPTY_PRESENCE_SELECT_VALUE
    out[`codice_malattia_day_${row.day}`] = row.sicknessCode
    out[`note_day_${row.day}`] = row.note
  }
  return out
}

export function buildCedolinoFormDefaults(
  card: PayrollBoardCardData | null,
  presenceFieldDefaults: Record<string, string>,
): Record<string, string> {
  return {
    data_invio_famiglia: toIsoDateInputValue(card?.record.data_invio_famiglia),
    caso_particolare: normalizeCaseFlag(card?.record.caso_particolare),
    cedolino_url: card?.record.cedolino_url ?? "",
    importo_busta_estratto: String(card?.record.importo_busta_estratto ?? ""),
    note: card?.record.note ?? "",
    ...presenceFieldDefaults,
  }
}

export function splitCedolinoAutosavePatch(patch: Partial<Record<string, string>>) {
  const cardPatch: Record<string, unknown> = {}
  const presencePatch: Record<string, unknown> = {}

  for (const [key, raw] of Object.entries(patch)) {
    const value = raw as string
    if (PRESENCE_DAY_FIELD_REGEX.test(key)) {
      presencePatch[key] =
        key.startsWith("evento_day_")
          ? value === EMPTY_PRESENCE_SELECT_VALUE
            ? null
            : value
          : value || null
      continue
    }

    switch (key) {
      case "data_invio_famiglia":
      case "cedolino_url":
      case "note":
        cardPatch[key] = value || null
        break
      case "importo_busta_estratto":
        cardPatch[key] = value ? Number(value) : null
        break
      case "caso_particolare":
        cardPatch[key] =
          value === "chiusura"
            ? "Chiusura rapporto"
            : value === "si"
              ? "Caso particolare"
              : null
        break
      default:
        cardPatch[key] = value || null
    }
  }

  return { cardPatch, presencePatch }
}
