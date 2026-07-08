import {
  ARCHIVIO_GROUP_KEYS,
  CANDIDATI_GROUP_KEYS,
  COLLOQUI_GROUP_KEYS,
  DA_COLLOQUIARE_GROUP_KEYS,
  LEGACY_PROVA_CON_CLIENTE_STATUS,
} from "./pipeline-constants"
import { normalizeLookupToken } from "./pipeline-value-utils"

export function normalizeStatusToken(value: string | null | undefined) {
  return normalizeLookupToken(value)
    .replaceAll("_", " ")
    .replaceAll(",", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function isCandidatiStatus(value: string | null | undefined) {
  const token = normalizeStatusToken(value)
  return (
    token === normalizeStatusToken(CANDIDATI_GROUP_KEYS.good) ||
    token === normalizeStatusToken(CANDIDATI_GROUP_KEYS.prospetto) ||
    token === normalizeStatusToken(CANDIDATI_GROUP_KEYS.poor)
  )
}

export function isArchivioStatus(value: string | null | undefined) {
  const token = normalizeStatusToken(value)
  return (
    token === normalizeStatusToken(ARCHIVIO_GROUP_KEYS.archivio) ||
    token === normalizeStatusToken(ARCHIVIO_GROUP_KEYS.nonSelezionato) ||
    token === normalizeStatusToken(ARCHIVIO_GROUP_KEYS.nascostoOot) ||
    token === normalizeStatusToken(ARCHIVIO_GROUP_KEYS.noMatch) ||
    (token.includes("nascosto") && token.includes("oot"))
  )
}

export function isDaColloquiareStatus(value: string | null | undefined) {
  const token = normalizeStatusToken(value)
  return (
    token === normalizeStatusToken(DA_COLLOQUIARE_GROUP_KEYS.daColloquiare) ||
    token === normalizeStatusToken(DA_COLLOQUIARE_GROUP_KEYS.invitatoColloquio) ||
    (token.includes("invitat") && token.includes("colloquio")) ||
    token === normalizeStatusToken(DA_COLLOQUIARE_GROUP_KEYS.nonRisponde)
  )
}

export function isLegacyProvaConClienteStatus(value: string | null | undefined) {
  return (
    normalizeStatusToken(value) ===
    normalizeStatusToken(LEGACY_PROVA_CON_CLIENTE_STATUS)
  )
}

export function canonicalizeSelectionStatus(value: string) {
  return isLegacyProvaConClienteStatus(value) ? "Prova in corso" : value
}

export function isColloquiStatus(value: string | null | undefined) {
  const token = normalizeStatusToken(value)
  return (
    token === normalizeStatusToken(COLLOQUI_GROUP_KEYS.colloquioSchedulato) ||
    token === normalizeStatusToken(COLLOQUI_GROUP_KEYS.colloquioRimandato) ||
    token === normalizeStatusToken(COLLOQUI_GROUP_KEYS.colloquioFatto) ||
    token === normalizeStatusToken(COLLOQUI_GROUP_KEYS.provaSchedulata) ||
    token === normalizeStatusToken(COLLOQUI_GROUP_KEYS.provaRimandata) ||
    token === normalizeStatusToken(COLLOQUI_GROUP_KEYS.provaInCorso) ||
    token === normalizeStatusToken(LEGACY_PROVA_CON_CLIENTE_STATUS) ||
    token === normalizeStatusToken(COLLOQUI_GROUP_KEYS.provaFatta)
  )
}
