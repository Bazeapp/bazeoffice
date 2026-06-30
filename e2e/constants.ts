import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Local Supabase + E2E fixture constants.
 *
 * Keys are populated automatically by `e2e/ensure-supabase.mjs` into
 * `e2e/.runtime-env.json` before Playwright runs. Manual override: set
 * VITE_SUPABASE_* env vars or run ensure-supabase first.
 */

const e2eDir = path.dirname(fileURLToPath(import.meta.url))
const RUNTIME_ENV_PATH = path.join(e2eDir, ".runtime-env.json")

const DEFAULT_SUPABASE_URL = "http://127.0.0.1:54321"
const DEFAULT_FUNCTIONS_URL = "http://127.0.0.1:54321/functions/v1"

type RuntimeEnv = {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
  VITE_SUPABASE_FUNCTIONS_URL: string
  LOCAL_SERVICE_ROLE_KEY: string
}

let cachedConfig: RuntimeEnv | null = null

function loadRuntimeEnvFile(): RuntimeEnv | null {
  if (!fs.existsSync(RUNTIME_ENV_PATH)) {
    return null
  }
  return JSON.parse(fs.readFileSync(RUNTIME_ENV_PATH, "utf8")) as RuntimeEnv
}

export function getLocalSupabaseConfig(): RuntimeEnv {
  if (cachedConfig) {
    return cachedConfig
  }

  const fromFile = loadRuntimeEnvFile()

  cachedConfig = {
    VITE_SUPABASE_URL:
      process.env.VITE_SUPABASE_URL ??
      fromFile?.VITE_SUPABASE_URL ??
      DEFAULT_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY:
      process.env.VITE_SUPABASE_ANON_KEY ??
      fromFile?.VITE_SUPABASE_ANON_KEY ??
      "",
    VITE_SUPABASE_FUNCTIONS_URL:
      process.env.VITE_SUPABASE_FUNCTIONS_URL ??
      fromFile?.VITE_SUPABASE_FUNCTIONS_URL ??
      DEFAULT_FUNCTIONS_URL,
    LOCAL_SERVICE_ROLE_KEY:
      process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ??
      fromFile?.LOCAL_SERVICE_ROLE_KEY ??
      "",
  }

  return cachedConfig
}

export const PREVIEW_HOST = "127.0.0.1"
export const PREVIEW_PORT = 4173
export const DEV_PORT = 5173
export const BASE_PATH = "/bazeoffice/"
export const PREVIEW_ORIGIN = `http://${PREVIEW_HOST}:${PREVIEW_PORT}`

/**
 * Active app origin for the current run: the Vite dev server (DEV_PORT) when
 * `E2E_WEB_SERVER=dev`, otherwise the preview build (PREVIEW_PORT). The
 * storageState origin (global-setup) and Playwright `baseURL` must both derive
 * from this — Playwright injects storageState localStorage only into a matching
 * origin, so a hardcoded origin breaks auth on the other server.
 */
export function getAppPort() {
  return process.env.E2E_WEB_SERVER === "dev" ? DEV_PORT : PREVIEW_PORT
}

export function getAppOrigin() {
  return `http://${PREVIEW_HOST}:${getAppPort()}`
}

export const OPERATOR_ROLES = [
  "customer",
  "sales",
  "recruiter",
  "payroll",
] as const

export type OperatorRole = (typeof OPERATOR_ROLES)[number]

const E2E_PASSWORD = "password123"

export const OPERATORS: Record<
  OperatorRole,
  { email: string; password: string; storageStatePath: string }
> = {
  customer: {
    email: "e2e-customer@local.test",
    password: E2E_PASSWORD,
    storageStatePath: "e2e/.auth/customer.json",
  },
  sales: {
    email: "e2e-sales@local.test",
    password: E2E_PASSWORD,
    storageStatePath: "e2e/.auth/sales.json",
  },
  recruiter: {
    email: "e2e-recruiter@local.test",
    password: E2E_PASSWORD,
    storageStatePath: "e2e/.auth/recruiter.json",
  },
  payroll: {
    email: "e2e-payroll@local.test",
    password: E2E_PASSWORD,
    storageStatePath: "e2e/.auth/payroll.json",
  },
}

/** Seeded in baze-supabase/supabase/seed_e2e_famiglia.sql */
export const E2E_FAMIGLIA = {
  id: "00000000-0000-0000-0000-00000000f001",
  nome: "E2E",
  cognome: "Famiglia Rossi",
  displayName: "Famiglia Rossi",
  searchText: "Famiglia Rossi",
  processoId: "00000000-0000-0000-0000-00000000b001",
} as const

/** Seeded in baze-supabase/supabase/seed_e2e_pipeline.sql */
export const E2E_PIPELINE = {
  famiglie: {
    rossi: E2E_FAMIGLIA,
    bianchi: {
      id: "00000000-0000-0000-0000-00000000f002",
      nome: "E2E",
      cognome: "Famiglia Bianchi",
      displayName: "Famiglia Bianchi",
      searchText: "Famiglia Bianchi",
      email: "e2e-bianchi@local.test",
      hasChiamataPrenotata: true,
    },
  },
  stages: {
    warmLead: "warm_lead",
    hotAttesaPrimoContatto: "hot_in_attesa_di_primo_contatto",
    hotCallAttivazionePrenotata: "hot_call_attivazione_prenotata",
    hotIngresso: "hot_ingresso",
    coldRicercaFutura: "cold_ricerca_futura",
    wonInAttesaConferma: "won_in_attesa_di_conferma",
  },
  stageLabels: {
    warmLead: "WARM - Lead",
    hotAttesaPrimoContatto: "HOT - In attesa di primo contatto",
    hotIngresso: "HOT - Ingresso",
    coldRicercaFutura: "COLD - Ricerca futura",
    wonInAttesaConferma: "WON - In attesa di conferma",
  },
  tipoLavoro: {
    colf: "Colf / Pulizie",
    babysitter: "Babysitter / Tata-Colf",
  },
  processi: {
    template: {
      id: "00000000-0000-0000-0000-00000000b001",
      famigliaId: E2E_FAMIGLIA.id,
      stage: "warm_lead",
      preventivoAccettato: false,
      tipoLavoro: "Colf / Pulizie",
      creatoRecent: true,
    },
    warmPreventivo: {
      id: "00000000-0000-0000-0000-00000000b002",
      famigliaId: E2E_FAMIGLIA.id,
      stage: "warm_lead",
      preventivoAccettato: true,
      tipoLavoro: "Babysitter / Tata-Colf",
      creatoRecent: false,
    },
    mover: {
      id: "00000000-0000-0000-0000-00000000b003",
      famigliaId: E2E_FAMIGLIA.id,
      stage: "warm_lead",
      preventivoAccettato: false,
      tipoLavoro: "Colf / Pulizie",
      creatoRecent: true,
    },
    hotAttesa: {
      id: "00000000-0000-0000-0000-00000000b004",
      famigliaId: E2E_FAMIGLIA.id,
      stage: "hot_in_attesa_di_primo_contatto",
      preventivoAccettato: false,
      tipoLavoro: "Colf / Pulizie",
      creatoRecent: true,
    },
    bianchiWarm: {
      id: "00000000-0000-0000-0000-00000000b005",
      famigliaId: "00000000-0000-0000-0000-00000000f002",
      stage: "warm_lead",
      preventivoAccettato: false,
      tipoLavoro: "Colf / Pulizie",
      creatoRecent: true,
      chiamataPrenotata: true,
    },
    cold: {
      id: "00000000-0000-0000-0000-00000000b006",
      famigliaId: E2E_FAMIGLIA.id,
      stage: "cold_ricerca_futura",
      preventivoAccettato: false,
      tipoLavoro: "Colf / Pulizie",
      creatoRecent: true,
    },
    wonAttesa: {
      id: "00000000-0000-0000-0000-00000000b007",
      famigliaId: E2E_FAMIGLIA.id,
      stage: "won_in_attesa_di_conferma",
      preventivoAccettato: true,
      tipoLavoro: "Colf / Pulizie",
      creatoRecent: true,
    },
    acquisition: {
      id: "00000000-0000-0000-0000-00000000b008",
      famigliaId: E2E_FAMIGLIA.id,
      stage: "warm_lead",
      preventivoAccettato: false,
      tipoLavoro: "Babysitter / Tata-Colf",
      creatoRecent: true,
    },
  },
} as const

/** Seeded in baze-supabase/supabase/seed_e2e_assegnazione.sql */
export const E2E_ASSEGNAZIONE = {
  operatori: {
    recruiter: {
      id: "00000000-0000-0000-0000-000000000e03",
      displayName: "E2E Recruiter",
    },
    sales: {
      id: "00000000-0000-0000-0000-000000000e02",
      displayName: "E2E Sales",
    },
  },
  famiglie: {
    rossi: E2E_FAMIGLIA.displayName,
    bianchi: E2E_PIPELINE.famiglie.bianchi.displayName,
  },
  processi: {
    unassignedNuova: {
      id: "00000000-0000-0000-0000-00000000b009",
      famigliaDisplayName: E2E_FAMIGLIA.displayName,
      tipoRicerca: "nuova" as const,
      hasRecruiter: false,
      hasAssignmentDate: false,
    },
    unassignedWithRecruiter: {
      id: "00000000-0000-0000-0000-00000000b00a",
      famigliaDisplayName: E2E_FAMIGLIA.displayName,
      tipoRicerca: "nuova" as const,
      hasRecruiter: true,
      hasAssignmentDate: false,
    },
    unassignedSostituzione: {
      id: "00000000-0000-0000-0000-00000000b00b",
      famigliaDisplayName: E2E_PIPELINE.famiglie.bianchi.displayName,
      tipoRicerca: "sostituzione" as const,
      hasRecruiter: false,
      hasAssignmentDate: false,
    },
    assignedToday: {
      id: "00000000-0000-0000-0000-00000000b00c",
      famigliaDisplayName: E2E_FAMIGLIA.displayName,
      tipoRicerca: "nuova" as const,
      hasRecruiter: true,
      hasAssignmentDate: true,
    },
    assignedTomorrow: {
      id: "00000000-0000-0000-0000-00000000b00d",
      famigliaDisplayName: E2E_PIPELINE.famiglie.bianchi.displayName,
      tipoRicerca: "sostituzione" as const,
      hasRecruiter: true,
      hasAssignmentDate: true,
    },
  },
} as const

/** Seeded in baze-supabase/supabase/seed_e2e_assegnazione.sql — same rows on the Ricerca board. */
export const E2E_RICERCA = {
  stages: {
    daAssegnare: "da_assegnare",
    fareRicerca: "fare_ricerca",
    match: "match",
    noMatch: "no_match",
  },
  stageLabels: {
    daAssegnare: "da assegnare",
    fareRicerca: "fare ricerca",
    match: "match",
    noMatch: "no match",
  },
  operatori: E2E_ASSEGNAZIONE.operatori,
  famiglie: E2E_ASSEGNAZIONE.famiglie,
  processi: E2E_ASSEGNAZIONE.processi,
} as const

/** Seeded in baze-supabase/supabase/seed_e2e_lavoratori.sql */
export const E2E_LAVORATORI = {
  lavoratori: {
    qualificatoMi: {
      id: "00000000-0000-0000-0000-00000000c001",
      displayName: "E2E Lavoratore Rossi",
      searchText: "Lavoratore Rossi",
      stato: "Qualificato",
      provinciaSigla: "MI",
      followup: null,
      inGate1: true,
      inGate2Idonei: false,
      inGate2IdoneiQualificati: true,
    },
    qualificatoTo: {
      id: "00000000-0000-0000-0000-00000000c002",
      displayName: "E2E Lavoratore Bianchi",
      searchText: "Lavoratore Bianchi",
      stato: "Qualificato",
      provinciaSigla: "TO",
      followup: "1° chiamata senza risposta",
      inGate1: true,
      inGate2Idonei: false,
      inGate2IdoneiQualificati: true,
    },
    idoneoMi: {
      id: "00000000-0000-0000-0000-00000000c003",
      displayName: "E2E Lavoratore Verdi",
      searchText: "Lavoratore Verdi",
      stato: "Idoneo",
      provinciaSigla: "MI",
      followup: null,
      inGate1: false,
      inGate2Idonei: true,
      inGate2IdoneiQualificati: true,
    },
    nonQualificatoMi: {
      id: "00000000-0000-0000-0000-00000000c004",
      displayName: "E2E Lavoratore Neri",
      searchText: "Lavoratore Neri",
      stato: "Non qualificato",
      provinciaSigla: "MI",
      followup: null,
      inGate1: false,
      inGate2Idonei: false,
      inGate2IdoneiQualificati: false,
    },
  },
  province: {
    milano: "MI",
    torino: "TO",
  },
  followup: {
    primaChiamata: "1° chiamata senza risposta",
  },
} as const

export function getE2eLavoratoreIdsMatching(
  predicate: (lavoratore: (typeof E2E_LAVORATORI.lavoratori)[keyof typeof E2E_LAVORATORI.lavoratori]) => boolean,
) {
  return Object.values(E2E_LAVORATORI.lavoratori)
    .filter(predicate)
    .map((lavoratore) => lavoratore.id)
}

export const E2E_LAVORATORI_FIXTURE_COUNT = Object.values(E2E_LAVORATORI.lavoratori).length

/** Seeded in baze-supabase/supabase/seed_e2e_rapporti.sql */
export const E2E_RAPPORTI = {
  famiglie: {
    rossi: E2E_FAMIGLIA,
    bianchi: E2E_PIPELINE.famiglie.bianchi,
  },
  lavoratori: {
    rossi: E2E_LAVORATORI.lavoratori.qualificatoMi,
    bianchi: E2E_LAVORATORI.lavoratori.qualificatoTo,
    verdi: E2E_LAVORATORI.lavoratori.idoneoMi,
    neri: E2E_LAVORATORI.lavoratori.nonQualificatoMi,
  },
  statoRapporto: {
    inAttivazione: "In attivazione",
    attivo: "Attivo",
    terminato: "Terminato",
    errore: "Errore",
  },
  rapporti: {
    inAttivazione: {
      id: "00000000-0000-0000-0000-00000000d001",
      famigliaId: E2E_FAMIGLIA.id,
      lavoratoreId: E2E_LAVORATORI.lavoratori.qualificatoMi.id,
      famigliaSearchText: "Famiglia Rossi",
      lavoratoreSearchText: "Lavoratore Rossi",
      statoRapporto: "In attivazione" as const,
      oreSettimanali: 20,
    },
    attivo: {
      id: "00000000-0000-0000-0000-00000000d002",
      famigliaId: E2E_PIPELINE.famiglie.bianchi.id,
      lavoratoreId: E2E_LAVORATORI.lavoratori.qualificatoTo.id,
      famigliaSearchText: "Famiglia Bianchi",
      lavoratoreSearchText: "Lavoratore Bianchi",
      statoRapporto: "Attivo" as const,
      oreSettimanali: 15,
    },
    terminato: {
      id: "00000000-0000-0000-0000-00000000d003",
      famigliaId: E2E_FAMIGLIA.id,
      lavoratoreId: E2E_LAVORATORI.lavoratori.idoneoMi.id,
      famigliaSearchText: "Famiglia Rossi",
      lavoratoreSearchText: "Lavoratore Verdi",
      statoRapporto: "Terminato" as const,
      oreSettimanali: 40,
    },
    errore: {
      id: "00000000-0000-0000-0000-00000000d004",
      famigliaId: E2E_PIPELINE.famiglie.bianchi.id,
      lavoratoreId: E2E_LAVORATORI.lavoratori.nonQualificatoMi.id,
      famigliaSearchText: "Famiglia Bianchi",
      lavoratoreSearchText: "Lavoratore Neri",
      statoRapporto: "Errore" as const,
      oreSettimanali: 10,
    },
  },
} as const

export const E2E_RAPPORTI_FIXTURE_IDS = Object.values(E2E_RAPPORTI.rapporti).map(
  (rapporto) => rapporto.id,
)

export function rapportiIdsWithStatoRapporto(
  stato: (typeof E2E_RAPPORTI.statoRapporto)[keyof typeof E2E_RAPPORTI.statoRapporto],
) {
  return Object.values(E2E_RAPPORTI.rapporti)
    .filter((rapporto) => rapporto.statoRapporto === stato)
    .map((rapporto) => rapporto.id)
}

/** Assunzioni board fixtures — subset of E2E_RAPPORTI with stato_assunzione. */
export const E2E_ASSUNZIONI = {
  stages: {
    avviarePratica: "Avviare pratica",
    inviataRichiestaDati: "Inviata richiesta dati",
    inAttesaDatiFamiglia: "In attesa di dati famiglia",
    inAttesaDatiLavoratore: "In attesa di dati lavoratore",
    datiPronti: "Dati pronti per assunzione",
    assunzioneFatta: "Assunzione fatta",
    documentiInviati: "Documenti assunzione inviati",
    contrattoFirmato: "Contratto firmato",
    nonAssumeConBaze: "Non assume con Baze",
  },
  /** Rapporti shown on the board without loading deferred columns. */
  rapporti: {
    inviataRichiestaDati: {
      id: "00000000-0000-0000-0000-00000000d001",
      famigliaSearchText: "Famiglia Rossi",
      lavoratoreSearchText: "Lavoratore Rossi",
      statoAssunzione: "Inviata richiesta dati" as const,
    },
    avviarePratica: {
      id: "00000000-0000-0000-0000-00000000d005",
      famigliaSearchText: "Famiglia Bianchi",
      lavoratoreSearchText: "Lavoratore Neri",
      statoAssunzione: "Avviare pratica" as const,
    },
    inAttesaDatiFamiglia: {
      id: "00000000-0000-0000-0000-00000000d006",
      famigliaSearchText: "Famiglia Rossi",
      lavoratoreSearchText: "Lavoratore Verdi",
      statoAssunzione: "In attesa di dati famiglia" as const,
    },
    contrattoFirmatoAttivo: {
      id: "00000000-0000-0000-0000-00000000d002",
      famigliaSearchText: "Famiglia Bianchi",
      lavoratoreSearchText: "Lavoratore Bianchi",
      statoAssunzione: "Contratto firmato" as const,
    },
    contrattoFirmatoTerminato: {
      id: "00000000-0000-0000-0000-00000000d003",
      famigliaSearchText: "Famiglia Rossi",
      lavoratoreSearchText: "Lavoratore Verdi",
      statoAssunzione: "Contratto firmato" as const,
    },
    nonAssumeConBaze: {
      id: "00000000-0000-0000-0000-00000000d007",
      famigliaSearchText: "Famiglia Bianchi",
      lavoratoreSearchText: "Lavoratore Bianchi",
      statoAssunzione: "Non assume con Baze" as const,
    },
  },
} as const

export const E2E_ASSUNZIONI_VISIBLE_FIXTURE_IDS = [
  E2E_ASSUNZIONI.rapporti.avviarePratica.id,
  E2E_ASSUNZIONI.rapporti.inviataRichiestaDati.id,
  E2E_ASSUNZIONI.rapporti.inAttesaDatiFamiglia.id,
] as const

export function assunzioniStageTestId(stageLabel: string) {
  return stageLabel.replace(/\s+/g, "_")
}

/** Chiusure board fixtures — seeded in baze-supabase/supabase/seed_e2e_rapporti.sql */
export const E2E_CHIUSURE = {
  stages: {
    lavoratoreComunicaDimissioni: "Lavoratore comunica dimissioni",
    datoreComunicaLicenziamento: "Datore comunica licenziamento",
    chiusuraPronta: "Chiusura pronta",
    inviatoComunicazioneFirma: "Inviato comunicazione per firma documento",
    ricevutoDocumentoFirmato: "Ricevuto documento firmato",
    chiusuraElaborata: "Chiusura elaborata",
    inviatoDocumentiChiusura: "Inviato documenti di chiusura",
    richiestaChiarimenti: "Richiesta chiarimenti famiglia",
    chiusuraTerminata: "Chiusura terminata",
  },
  chiusure: {
    dimissioni: {
      id: "00000000-0000-0000-0000-00000000d0c2",
      rapportoId: "00000000-0000-0000-0000-00000000d002",
      famigliaSearchText: "Famiglia Bianchi",
      lavoratoreSearchText: "Lavoratore Bianchi",
      emailSearchText: "e2e-chiusura-dimissioni@local.test",
      motivazioneSearchText: "E2E dimissioni fixture",
      stato: "Lavoratore comunica dimissioni" as const,
    },
    licenziamento: {
      id: "00000000-0000-0000-0000-00000000d0c3",
      rapportoId: "00000000-0000-0000-0000-00000000d001",
      famigliaSearchText: "Famiglia Rossi",
      lavoratoreSearchText: "Lavoratore Rossi",
      emailSearchText: "e2e-chiusura-licenziamento@local.test",
      motivazioneSearchText: "E2E licenziamento fixture",
      stato: "Datore comunica licenziamento" as const,
    },
    elaborata: {
      id: "00000000-0000-0000-0000-00000000d0c1",
      rapportoId: "00000000-0000-0000-0000-00000000d003",
      famigliaSearchText: "Famiglia Rossi",
      lavoratoreSearchText: "Lavoratore Verdi",
      emailSearchText: "e2e-chiusura-terminato@local.test",
      motivazioneSearchText: "E2E chiusura terminata fixture",
      stato: "Chiusura elaborata" as const,
    },
  },
  annullamentoRapporto: {
    id: "00000000-0000-0000-0000-00000000d005",
    famigliaSearchText: "Famiglia Bianchi",
    lavoratoreSearchText: "Lavoratore Neri",
  },
} as const

export const E2E_CHIUSURE_VISIBLE_FIXTURE_IDS = [
  E2E_CHIUSURE.chiusure.dimissioni.id,
  E2E_CHIUSURE.chiusure.licenziamento.id,
] as const

export function chiusureStageTestId(stageLabel: string) {
  return stageLabel.replace(/\s+/g, "_")
}

export function getViteEnv() {
  const config = getLocalSupabaseConfig()
  return {
    VITE_SUPABASE_URL: config.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: config.VITE_SUPABASE_ANON_KEY,
    VITE_SUPABASE_FUNCTIONS_URL: config.VITE_SUPABASE_FUNCTIONS_URL,
  }
}

export function assertLocalKeysConfigured() {
  const config = getLocalSupabaseConfig()
  if (!config.VITE_SUPABASE_ANON_KEY) {
    throw new Error(
      "E2E: missing Supabase anon/publishable key. Run `npm run e2e` (runs ensure-supabase) or `node e2e/ensure-supabase.mjs` first.",
    )
  }
  if (!config.LOCAL_SERVICE_ROLE_KEY) {
    throw new Error(
      "E2E: missing Supabase service-role key. Run `node e2e/ensure-supabase.mjs` first.",
    )
  }
}
