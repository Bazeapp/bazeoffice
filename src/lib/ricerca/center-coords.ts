/**
 * Risolve il centro mappa per il pannello ricerca a partire dal processo e
 * dai record `indirizzi` collegati.
 *
 * Regola: usa l'indirizzo di prova SOLO se il tipo incontro è "Prova diretta"
 * E il processo ha effettivamente i campi prova compilati E il record indirizzi
 * di tipo "prova" esiste con coordinate valide. Altrimenti fallback su "luogo".
 *
 * Senza questo fallback la mappa si centra su NULL e mostra "0 dentro 0 fuori"
 * anche quando ci sono lavoratori validi entro il raggio (vedi processi
 * Luigi Duci f19b0120-... e Speziale c9bef4d9-...).
 */

export type IndirizzoRow = {
  tipo_indirizzo?: string | null
  latitudine?: number | string | null
  longitudine?: number | string | null
  [key: string]: unknown
}

export type ProcessoForCenter = {
  tipo_incontro_famiglia_lavoratore?: string | null
  indirizzo_prova_via?: string | null
}

export type RicercaCenter = {
  lat: number
  lng: number
  source: 'prova' | 'luogo'
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function hasCoords(
  row: IndirizzoRow | null | undefined,
): row is IndirizzoRow & { latitudine: number | string; longitudine: number | string } {
  if (!row) return false
  const lat = toNumber(row.latitudine)
  const lng = toNumber(row.longitudine)
  if (lat === null || lng === null) return false
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180
}

function findByTipo(
  indirizzi: readonly IndirizzoRow[],
  tipo: 'prova' | 'luogo',
): IndirizzoRow | null {
  return (
    indirizzi.find(
      (row) => String(row.tipo_indirizzo ?? '').trim().toLowerCase() === tipo,
    ) ?? null
  )
}

function toCenter(
  row: IndirizzoRow | null,
  source: 'prova' | 'luogo',
): RicercaCenter | null {
  if (!hasCoords(row)) return null
  const lat = toNumber(row.latitudine)
  const lng = toNumber(row.longitudine)
  if (lat === null || lng === null) return null
  return { lat, lng, source }
}

export function getRicercaCenter(
  processo: ProcessoForCenter | null | undefined,
  indirizzi: readonly IndirizzoRow[] | null | undefined,
): RicercaCenter | null {
  const rows = indirizzi ?? []

  const isProvaDiretta =
    String(processo?.tipo_incontro_famiglia_lavoratore ?? '').trim() ===
    'Prova diretta'
  const hasProvaViaInProcess = Boolean(processo?.indirizzo_prova_via)

  if (isProvaDiretta && hasProvaViaInProcess) {
    const prova = findByTipo(rows, 'prova')
    if (prova && hasCoords(prova)) {
      const center = toCenter(prova, 'prova')
      if (center) return center
    }
  }

  const luogo = findByTipo(rows, 'luogo')
  const fromLuogo = toCenter(luogo, 'luogo')
  if (fromLuogo) return fromLuogo

  return null
}
