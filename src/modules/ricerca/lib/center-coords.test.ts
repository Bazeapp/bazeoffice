import { describe, it, expect } from 'vitest'
import {
  hasCoords,
  getRicercaCenter,
  type IndirizzoRow,
  type ProcessoForCenter,
} from '../lib/center-coords'

describe('hasCoords', () => {
  it('returns false for null', () => {
    expect(hasCoords(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(hasCoords(undefined)).toBe(false)
  })

  it('returns false for empty object', () => {
    expect(hasCoords({} as IndirizzoRow)).toBe(false)
  })

  it('returns true for valid numeric coords', () => {
    expect(hasCoords({ latitudine: 45.4, longitudine: 9.2 })).toBe(true)
  })

  it('returns true for numeric-string coords', () => {
    expect(hasCoords({ latitudine: '45.4', longitudine: '9.2' })).toBe(true)
  })

  it('returns false when latitudine is non-numeric string', () => {
    expect(hasCoords({ latitudine: 'abc', longitudine: 9.2 })).toBe(false)
  })

  it('returns false when lat is out of range (>90)', () => {
    expect(hasCoords({ latitudine: 91, longitudine: 9.2 })).toBe(false)
  })

  it('returns false when lng is out of range (>180)', () => {
    expect(hasCoords({ latitudine: 45, longitudine: 181 })).toBe(false)
  })

  it('returns true at boundary -90/-180', () => {
    expect(hasCoords({ latitudine: -90, longitudine: -180 })).toBe(true)
  })

  it('returns false when latitudine is null', () => {
    expect(hasCoords({ latitudine: null, longitudine: 9.2 })).toBe(false)
  })

  it('returns false for whitespace-only string lat', () => {
    expect(hasCoords({ latitudine: '   ', longitudine: '9.2' })).toBe(false)
  })
})

describe('getRicercaCenter', () => {
  const provaProcesso: ProcessoForCenter = {
    tipo_incontro_famiglia_lavoratore: 'Prova diretta',
    indirizzo_prova_via: 'Via Roma 1',
  }
  const luogoRow: IndirizzoRow = {
    tipo_indirizzo: 'luogo',
    latitudine: 45.4,
    longitudine: 9.2,
  }
  const provaRow: IndirizzoRow = {
    tipo_indirizzo: 'prova',
    latitudine: 41.9,
    longitudine: 12.5,
  }

  it('returns null with null processo and empty indirizzi', () => {
    expect(getRicercaCenter(null, [])).toBeNull()
  })

  it('returns prova center for Prova diretta with valid prova row', () => {
    const result = getRicercaCenter(provaProcesso, [provaRow, luogoRow])
    expect(result).toEqual({ lat: 41.9, lng: 12.5, source: 'prova' })
  })

  it('falls back to luogo when Prova diretta but no prova row', () => {
    const result = getRicercaCenter(provaProcesso, [luogoRow])
    expect(result).toEqual({ lat: 45.4, lng: 9.2, source: 'luogo' })
  })

  it('falls back to luogo when prova row lacks valid coords', () => {
    const badProva: IndirizzoRow = {
      tipo_indirizzo: 'prova',
      latitudine: null,
      longitudine: null,
    }
    const result = getRicercaCenter(provaProcesso, [badProva, luogoRow])
    expect(result).toEqual({ lat: 45.4, lng: 9.2, source: 'luogo' })
  })

  it('uses luogo when Prova diretta but indirizzo_prova_via empty', () => {
    const proc: ProcessoForCenter = {
      tipo_incontro_famiglia_lavoratore: 'Prova diretta',
      indirizzo_prova_via: null,
    }
    const result = getRicercaCenter(proc, [provaRow, luogoRow])
    expect(result).toEqual({ lat: 45.4, lng: 9.2, source: 'luogo' })
  })

  it('uses luogo when tipo_incontro is not Prova diretta', () => {
    const proc: ProcessoForCenter = {
      tipo_incontro_famiglia_lavoratore: 'Colloquio video',
      indirizzo_prova_via: 'Via Roma 1',
    }
    const result = getRicercaCenter(proc, [provaRow, luogoRow])
    expect(result).toEqual({ lat: 45.4, lng: 9.2, source: 'luogo' })
  })

  it('returns luogo when processo is null and only luogo present', () => {
    expect(getRicercaCenter(null, [luogoRow])).toEqual({
      lat: 45.4,
      lng: 9.2,
      source: 'luogo',
    })
  })

  it('returns prova center even when no luogo present', () => {
    const result = getRicercaCenter(provaProcesso, [provaRow])
    expect(result).toEqual({ lat: 41.9, lng: 12.5, source: 'prova' })
  })

  it('returns null when no address has valid coords', () => {
    const badProva: IndirizzoRow = {
      tipo_indirizzo: 'prova',
      latitudine: null,
      longitudine: null,
    }
    expect(getRicercaCenter(provaProcesso, [badProva])).toBeNull()
  })

  it('matches tipo_indirizzo case-insensitively (LUOGO)', () => {
    const upperLuogo: IndirizzoRow = {
      tipo_indirizzo: 'LUOGO',
      latitudine: 45.4,
      longitudine: 9.2,
    }
    expect(getRicercaCenter(null, [upperLuogo])).toEqual({
      lat: 45.4,
      lng: 9.2,
      source: 'luogo',
    })
  })
})
