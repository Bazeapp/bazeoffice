export const RICERCA_WORKERS_REALTIME_TABLES = [
  "selezioni_lavoratori",
  "processi_matching",
  "lavoratori",
] as const

export const WORKER_BATCH_SIZE = 250
export const ADDRESS_BATCH_SIZE = 120

export const CANDIDATI_GROUP_KEYS = {
  good: "candidato - good fit",
  prospetto: "prospetto",
  poor: "candidato - poor fit",
} as const

export const ARCHIVIO_GROUP_KEYS = {
  archivio: "archivio",
  nonSelezionato: "non selezionato",
  nascostoOot: "nascosto - oot",
  noMatch: "no match",
} as const

export const DA_COLLOQUIARE_GROUP_KEYS = {
  daColloquiare: "da colloquiare",
  invitatoColloquio: "invitato a colloquio",
  nonRisponde: "non risponde",
} as const

export const COLLOQUI_GROUP_KEYS = {
  colloquioSchedulato: "colloquio schedulato",
  colloquioRimandato: "colloquio rimandato",
  colloquioFatto: "colloquio fatto",
  provaSchedulata: "prova schedulata",
  provaRimandata: "prova rimandata",
  provaInCorso: "prova in corso",
  provaFatta: "prova fatta",
} as const

export const LEGACY_PROVA_CON_CLIENTE_STATUS = "prova con cliente"
