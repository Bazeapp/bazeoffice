/**
 * Filtro disponibilità lavoratore nel contesto "ricerca" (mappa + matching).
 *
 * Regola: un lavoratore passa il filtro se è "Disponibile", oppure se la
 * disponibilità è NULL (dato mancante → non escludere), oppure se è
 * "Non disponibile" ma rientra entro 14 giorni.
 *
 * Implementato come helper centrale per evitare drift tra mappa, board
 * ricerca e altre liste filtrate sullo stesso concetto.
 */

const DISPONIBILITA_RIENTRO_WINDOW_DAYS = 14

export type LavoratoreDisponibilitaInput = {
  disponibilita: string | null | undefined
  data_ritorno_disponibilita: string | Date | null | undefined
}

function normalizeStatus(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function parseReturnDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null
  }
  const parsed = new Date(value)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

function addDaysUTC(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function isDisponibileRicerca(
  lavoratore: LavoratoreDisponibilitaInput,
  now: Date = new Date(),
): boolean {
  const status = normalizeStatus(lavoratore.disponibilita)

  if (status === '') return true
  if (status === 'disponibile') return true

  if (status === 'non disponibile') {
    const returnDate = parseReturnDate(lavoratore.data_ritorno_disponibilita)
    if (!returnDate) return false
    const today = startOfUtcDay(now)
    const threshold = addDaysUTC(today, DISPONIBILITA_RIENTRO_WINDOW_DAYS)
    return startOfUtcDay(returnDate).getTime() <= threshold.getTime()
  }

  return true
}
