import { formatInTimeZone, fromZonedTime } from "date-fns-tz"

/**
 * Fuso orario applicativo. Tutte le date con orario sono salvate sul DB in UTC
 * e mostrate/inserite in ora italiana, indipendentemente dal fuso del browser.
 */
export const APP_TIME_ZONE = "Europe/Rome"

/**
 * Converte un orario "wall-clock" italiano (stringa naive senza fuso, es.
 * "2026-05-22T16:30" oppure "2026-05-22 16:30") nell'istante UTC corrispondente,
 * tenendo conto automaticamente di ora solare/legale.
 * Ritorna una stringa ISO (UTC) pronta da salvare, o null se input non valido.
 */
export function romaWallclockToUtcIso(value: string | null | undefined): string | null {
  if (!value) return null
  const utc = fromZonedTime(value, APP_TIME_ZONE)
  return Number.isNaN(utc.getTime()) ? null : utc.toISOString()
}

/**
 * Variante con data e ora separate (es. "2026-05-22" + "16:30").
 */
export function romaDateTimeToUtcIso(
  date: string | null | undefined,
  time: string | null | undefined,
): string | null {
  if (!date || !time) return null
  return romaWallclockToUtcIso(`${date}T${time}`)
}

/**
 * Converte un istante salvato (ISO UTC) nella stringa per un input
 * datetime-local in ora italiana: "yyyy-MM-ddTHH:mm".
 */
export function utcIsoToRomaInput(value: string | null | undefined): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return formatInTimeZone(date, APP_TIME_ZONE, "yyyy-MM-dd'T'HH:mm")
}

/**
 * Converte un istante salvato (ISO UTC) nelle parti data/ora in ora italiana,
 * per popolare input separati di data e orario.
 */
export function utcIsoToRomaParts(value: string | null | undefined): { date: string; time: string } {
  if (!value) return { date: "", time: "" }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { date: "", time: "" }
  return {
    date: formatInTimeZone(date, APP_TIME_ZONE, "yyyy-MM-dd"),
    time: formatInTimeZone(date, APP_TIME_ZONE, "HH:mm"),
  }
}
