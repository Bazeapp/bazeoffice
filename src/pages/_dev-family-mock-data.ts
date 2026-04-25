/**
 * DEV MOCK DATA — solo per playground, rimovibile dopo test.
 * 14 stage Pipeline CRM Famiglie + ~30 lead mock + tipi domain.
 */

// ============================================================
// Domain types (coerenti con spec Fase 4)
// ============================================================

export type FamilyStageId =
  | "warm_lead"
  | "hot_ingresso"
  | "hot_in_attesa_di_primo_contatto"
  | "hot_contatto_avvenuto"
  | "hot_callback_programmato"
  | "hot_decisione_rimandata"
  | "hot_call_attivazione_prenotata"
  | "hot_call_attivazione_fatta"
  | "hot_follow_up_post_call"
  | "hot_no_show"
  | "cold_ricerca_futura"
  | "won_ricerca_attivata"
  | "lost"
  | "out_of_target"

export type FamilyStage = {
  id: FamilyStageId
  name: string
  color: string
  soft: string
  ink: string
  iconName?: string
}

export type FamilyJobKey = "colf" | "badante" | "babysitter"
export type FamilyContractKey = "parttime" | "fulltime" | "convivente" | "orario"

export type FamilyTag<K extends string> = {
  key: K
  label: string
}

export type FamilyComment = {
  id: string
  authorInitials: string
  authorName: string
  timestamp: string
  text: string
}

export type FamilyAnnuncioStatus = "idle" | "loading" | "created" | "error"

export type FamilyDetailData = {
  // Orari
  orarioLavoro?: string
  oreSettimanali?: number
  giorniSettimanali?: number
  giornatePreferite?: string[]

  // Luogo
  provincia?: string
  cap?: string
  quartiere?: string
  indirizzo?: string
  mapsUrl?: string

  // Famiglia
  composizione?: string
  neonatiPresenti?: boolean
  piuBambini?: boolean
  quattroPiu?: boolean

  // Casa
  descrizioneCasa?: string
  metraturaCasa?: string

  // Animali
  descrizioneAnimali?: string
  cani?: "media" | "grande" | null
  gatti?: boolean

  // Mansioni
  descrizioneMansioni?: string
  pulizieAlte?: boolean
  stirare?: "si" | "si_diff" | null
  cucinare?: "si" | "si_elab" | null
  giardino?: boolean

  // Richieste
  notePrivate?: string
  italiano?: boolean
  inglese?: boolean
  genere?: "donna" | "uomo" | null
  trasferte?: boolean
  trasferteNote?: string
  ferie?: boolean
  ferieNote?: string
  patente?: boolean
  automunita?: boolean
  nazionalitaEscluse?: string[]
  nazionalitaObbligatorie?: string[]
  etaMin?: number
  etaMax?: number
  profilo?: Array<"esigente" | "autonomia" | "presente" | "discrezione">

  // Tempistiche
  deadline?: string // "15/05/2026"
  tipologiaIncontro?: "presenza" | "video" | "telefono"
  disponibilita?: string
  preventivoUrl?: string

  // Annuncio
  annuncioStatus: FamilyAnnuncioStatus
  annuncioUrl?: string
}

export type FamilyLead = {
  id: string
  stage: FamilyStageId
  name: string
  email: string
  phone: string
  oreGiorni: string
  creationDate: string
  province: string
  jobs: FamilyJobKey[]
  contract: FamilyContractKey | null

  // Conditional meta per card
  scheduledCallAt?: string
  recontactDate?: string
  callAttemptCount?: number
  preventivoAccettato: boolean

  // Detail
  detail: FamilyDetailData
  comments: FamilyComment[]
}

// ============================================================
// 14 stage (triplette da tokens.md §1.3)
// ============================================================

export const STAGES: FamilyStage[] = [
  {
    id: "warm_lead",
    name: "Warm · Lead",
    color: "#f5b544",
    soft: "#fbf1d8",
    ink: "#866211",
    iconName: "flame",
  },
  {
    id: "hot_ingresso",
    name: "Hot · Ingresso",
    color: "#ef6a4b",
    soft: "#fbe4dc",
    ink: "#8e3a2a",
    iconName: "phone-forwarded",
  },
  {
    id: "hot_in_attesa_di_primo_contatto",
    name: "Hot · In attesa contatto",
    color: "#d9534a",
    soft: "#fadcd9",
    ink: "#812b24",
    iconName: "clock",
  },
  {
    id: "hot_contatto_avvenuto",
    name: "Hot · Contatto avvenuto",
    color: "#3f9d5d",
    soft: "#dfefe3",
    ink: "#235d39",
    iconName: "phone-call",
  },
  {
    id: "hot_callback_programmato",
    name: "Hot · Callback programmato",
    color: "#5fbf78",
    soft: "#e8f4ec",
    ink: "#2d6b3f",
    iconName: "calendar-clock",
  },
  {
    id: "hot_decisione_rimandata",
    name: "Hot · Decisione rimandata",
    color: "#e69285",
    soft: "#fae7e3",
    ink: "#7a3a30",
    iconName: "clock",
  },
  {
    id: "hot_call_attivazione_prenotata",
    name: "Hot · Call prenotata",
    color: "#8a6cf1",
    soft: "#e7e1fb",
    ink: "#3f337e",
    iconName: "calendar-plus",
  },
  {
    id: "hot_call_attivazione_fatta",
    name: "Hot · Call fatta",
    color: "#6b4fd6",
    soft: "#ddd4f3",
    ink: "#35287a",
    iconName: "check-circle",
  },
  {
    id: "hot_follow_up_post_call",
    name: "Hot · Follow-up",
    color: "#4fb09f",
    soft: "#e0f2ee",
    ink: "#265a53",
    iconName: "calendar-clock",
  },
  {
    id: "hot_no_show",
    name: "Hot · No-show",
    color: "#a87d7a",
    soft: "#ebddd9",
    ink: "#5a3d39",
    iconName: "user-x",
  },
  {
    id: "cold_ricerca_futura",
    name: "Cold · Ricerca futura",
    color: "#4f8cbf",
    soft: "#dfe9f2",
    ink: "#265073",
    iconName: "snowflake",
  },
  {
    id: "won_ricerca_attivata",
    name: "Vinto",
    color: "#2e7d5b",
    soft: "#d9ebe1",
    ink: "#1c4c38",
    iconName: "trophy",
  },
  {
    id: "lost",
    name: "Perso",
    color: "#8a8a83",
    soft: "#ecece9",
    ink: "#52524d",
    iconName: "circle-x",
  },
  {
    id: "out_of_target",
    name: "Out of target",
    color: "#9e9995",
    soft: "#e9e7e4",
    ink: "#525049",
    iconName: "ban",
  },
]

export const JOB_OPTIONS: Array<FamilyTag<FamilyJobKey>> = [
  { key: "colf", label: "Colf / Pulizie" },
  { key: "badante", label: "Badante" },
  { key: "babysitter", label: "Babysitter" },
]

export const CONTRACT_OPTIONS: Array<FamilyTag<FamilyContractKey>> = [
  { key: "parttime", label: "Part-time" },
  { key: "fulltime", label: "Full-time" },
  { key: "convivente", label: "Convivente" },
  { key: "orario", label: "Lavoro ad ore" },
]

export const PROVINCE_OPTIONS = [
  { value: "MI", label: "Milano" },
  { value: "RM", label: "Roma" },
  { value: "TO", label: "Torino" },
  { value: "BO", label: "Bologna" },
  { value: "NA", label: "Napoli" },
  { value: "FI", label: "Firenze" },
  { value: "VR", label: "Verona" },
  { value: "PD", label: "Padova" },
  { value: "BG", label: "Bergamo" },
  { value: "GE", label: "Genova" },
]

export const NAZIONALITA_OPTIONS = [
  { value: "IT", label: "Italia" },
  { value: "FR", label: "Francia" },
  { value: "ES", label: "Spagna" },
  { value: "DE", label: "Germania" },
  { value: "UK", label: "Regno Unito" },
  { value: "RO", label: "Romania" },
  { value: "PL", label: "Polonia" },
  { value: "UA", label: "Ucraina" },
  { value: "PH", label: "Filippine" },
  { value: "PE", label: "Perù" },
]

// ============================================================
// Lead mock factory
// ============================================================

const FIRST = [
  "Cecilia",
  "Eleonora",
  "Ludovica",
  "Monica",
  "Arianna",
  "Marisa",
  "Federica",
  "Giulia",
  "Paolo",
  "Barbara",
  "Silvia",
  "Rosa",
  "Alessio",
  "Francesca",
  "Chiara",
  "Laura",
  "Giuseppe",
  "Andrea",
  "Valeria",
  "Stefano",
]
const LAST = [
  "D'Elia",
  "Bono",
  "Lombardi",
  "Massi",
  "Cantobelli",
  "Sorrentino",
  "Gatti",
  "Bernardi",
  "Coppola",
  "Grasso",
  "D'Angelo",
  "Neri",
  "Basile",
  "Gallo",
  "Bruno",
  "Rossi",
  "Ferrari",
  "Esposito",
  "Romano",
  "Marino",
]

const DISTRIBUTION: Record<FamilyStageId, number> = {
  warm_lead: 5,
  hot_ingresso: 4,
  hot_in_attesa_di_primo_contatto: 3,
  hot_contatto_avvenuto: 3,
  hot_callback_programmato: 2,
  hot_decisione_rimandata: 1,
  hot_call_attivazione_prenotata: 2,
  hot_call_attivazione_fatta: 2,
  hot_follow_up_post_call: 1,
  hot_no_show: 1,
  cold_ricerca_futura: 2,
  won_ricerca_attivata: 2,
  lost: 2,
  out_of_target: 1,
}

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i)
  return Math.abs(h)
}

function pick<T>(arr: T[], seed: number): T {
  return arr[hash(String(seed)) % arr.length]!
}

function makeLead(stage: FamilyStageId, idx: number): FamilyLead {
  const id = `BZ-${String(1000 + idx).padStart(4, "0")}`
  const h = hash(id)
  const first = pick(FIRST, h)
  const last = pick(LAST, h + 7)
  const job = pick(JOB_OPTIONS, h + 1)
  const contract = pick(CONTRACT_OPTIONS, h + 5)
  const province = pick(PROVINCE_OPTIONS, h + 3)
  const ore = 4 + (h % 44)
  const giorni = 1 + (h % 6)

  const scheduledCallAt =
    stage === "hot_call_attivazione_prenotata"
      ? `${15 + (h % 15)}/05 alle ${10 + (h % 8)}:${h % 2 === 0 ? "30" : "00"}`
      : undefined

  const recontactDate =
    stage === "cold_ricerca_futura"
      ? `${15 + (h % 15)}/11/2026`
      : undefined

  const callAttemptCount =
    stage === "hot_in_attesa_di_primo_contatto" ? 1 + (h % 3) : undefined

  const preventivoAccettato = ["won_ricerca_attivata", "hot_contatto_avvenuto", "hot_call_attivazione_fatta"].includes(stage)
    ? h % 2 === 0
    : false

  return {
    id,
    stage,
    name: `Famiglia ${last} ${first}`,
    email: `${last.replace(/['\s]/g, "").toLowerCase()}@famiglie.baze.it`,
    phone: `+39 3${30 + (h % 20)} ${100 + (h % 900)} ${1000 + (h % 9000)}`,
    oreGiorni: `${ore}h | ${giorni}gg`,
    creationDate: `${10 + (h % 18)}/0${1 + (h % 9)}/2025`,
    province: province.value,
    jobs: [job.key],
    contract: contract.key,
    scheduledCallAt,
    recontactDate,
    callAttemptCount,
    preventivoAccettato,

    detail: {
      orarioLavoro: "Lun-Ven, tra le 8 e le 19\nOPPURE Sabato mattina",
      oreSettimanali: ore,
      giorniSettimanali: giorni,
      giornatePreferite: ["lun", "mer", "ven"].filter((_, i) => (h >> i) & 1),

      provincia: province.value,
      cap: String(10000 + (h % 80000)).slice(0, 5),
      quartiere: pick(["Porta Nuova", "Prati", "Crocetta", "Santo Stefano", "Centro"], h),
      indirizzo: `Via ${pick(["Torino", "Roma", "Garibaldi", "Dante", "Manzoni"], h)} ${h % 120 + 1}`,
      mapsUrl: "https://www.google.com/maps/embed?pb=!1m18...",

      composizione: pick(
        ["2 adulti, 1 bimba (3 anni)", "Coppia anziani (78 e 82 anni)", "3 adulti + cane", "Famiglia 4 persone, 2 bimbi"],
        h,
      ),
      neonatiPresenti: h % 5 === 0,
      piuBambini: h % 3 === 0,
      quattroPiu: h % 4 === 0,

      descrizioneCasa: pick(
        ["Appartamento su 2 piani", "Villa con giardino", "Bilocale ristrutturato", "Trilocale luminoso"],
        h,
      ),
      metraturaCasa: String([85, 120, 180, 95, 150][h % 5]),

      descrizioneAnimali:
        h % 3 === 0 ? "1 gatto" : h % 3 === 1 ? "Nessun animale" : "1 cane taglia media",
      cani: h % 3 === 2 ? "media" : null,
      gatti: h % 3 === 0,

      descrizioneMansioni:
        "Pulizie ordinarie, stiratura, cura generale della casa. Qualche volta a settimana preparazione pasti semplici.",
      pulizieAlte: h % 2 === 0,
      stirare: h % 3 !== 0 ? "si" : null,
      cucinare: h % 4 === 0 ? "si_elab" : h % 4 === 1 ? "si" : null,
      giardino: h % 5 === 0,

      notePrivate:
        "Famiglia già cliente Baze via referral (Fam. Rossi). Budget flessibile, preferiscono profilo over 35.",
      italiano: true,
      inglese: h % 4 === 0,
      genere: h % 2 === 0 ? "donna" : null,
      trasferte: h % 4 === 0,
      trasferteNote: h % 4 === 0 ? "Trasferte occasionali in Liguria nei weekend estivi" : "",
      ferie: h % 3 === 0,
      ferieNote: h % 3 === 0 ? "Ferie concordate almeno 30 giorni prima" : "",
      patente: h % 2 === 0,
      automunita: h % 3 === 0,
      nazionalitaEscluse: [],
      nazionalitaObbligatorie: h % 5 === 0 ? ["IT", "FR"] : [],
      etaMin: 25,
      etaMax: 55,
      profilo: (["autonomia", h % 2 ? "discrezione" : null] as const).filter(
        (x): x is "autonomia" | "discrezione" => x !== null,
      ),

      deadline: `${10 + (h % 18)}/06/2026`,
      tipologiaIncontro: (["presenza", "video", "telefono"] as const)[h % 3],
      disponibilita:
        "22/04 dalle 10 alle 12\n23/04 dalle 15 alle 17\n24/04 dalle 9 alle 11",
      preventivoUrl: h % 2 === 0 ? `https://docs.baze.it/preventivo/${id}` : "",

      annuncioStatus: stage === "won_ricerca_attivata" ? "created" : "idle",
      annuncioUrl:
        stage === "won_ricerca_attivata"
          ? `https://baze.it/annuncio/${id.toLowerCase()}`
          : undefined,
    },

    comments: [
      {
        id: "1",
        authorInitials: "NG",
        authorName: "Nicolò Gori",
        timestamp: "oggi 10:14",
        text: "Confermata chiamata di follow-up per venerdì. Famiglia molto interessata.",
      },
      {
        id: "2",
        authorInitials: "LE",
        authorName: "Lisandro Enrici",
        timestamp: "ieri 17:32",
        text: "Ho mandato la brochure completa via email. Aspetto riscontro.",
      },
      {
        id: "3",
        authorInitials: "MR",
        authorName: "Marta Rossi",
        timestamp: "2 gg fa",
        text: "Budget conferma fascia standard. Niente criticità.",
      },
    ],
  }
}

export function buildInitialBoard(): Record<FamilyStageId, FamilyLead[]> {
  const out = {} as Record<FamilyStageId, FamilyLead[]>
  let idx = 0
  for (const stage of STAGES) {
    const count = DISTRIBUTION[stage.id] ?? 1
    out[stage.id] = Array.from({ length: count }, () => makeLead(stage.id, idx++))
  }
  return out
}

// ============================================================
// Stage guide config (mock — versione completa CRM-012 richiede product)
// ============================================================

export type StageGuideField = {
  key: string
  label: string
  type: "checkbox" | "datetime" | "textarea" | "radio" | "date"
  options?: Array<{ value: string; label: string }>
  warning?: string
}

export type StageGuideEntry = {
  title: string
  description: string
  transitions: Array<{ description: string; targetStageLabel: string }>
  editableFields: StageGuideField[]
}

export const STAGE_GUIDE_CONFIG: Partial<Record<FamilyStageId, StageGuideEntry>> = {
  warm_lead: {
    title: "Warm · Lead",
    description: "Nuovo lead in ingresso. Verifica i dati essenziali e passa allo stato successivo.",
    transitions: [
      { description: "Dati verificati, procedi con il contatto", targetStageLabel: "Hot · Ingresso" },
      { description: "Lead non qualificato", targetStageLabel: "Out of target" },
    ],
    editableFields: [],
  },
  hot_ingresso: {
    title: "Hot · Ingresso",
    description: "Lead qualificato, primo contatto da effettuare.",
    transitions: [
      { description: "Prima chiamata da fare", targetStageLabel: "Hot · In attesa contatto" },
    ],
    editableFields: [],
  },
  hot_in_attesa_di_primo_contatto: {
    title: "Hot · In attesa di primo contatto",
    description: "Lead chiamato ma non risponde. Traccia i tentativi.",
    transitions: [
      { description: "Lead risponde", targetStageLabel: "Hot · Contatto avvenuto" },
      { description: "Nessuna risposta dopo 3 tentativi", targetStageLabel: "Hot · No-show" },
      { description: "Lead perso", targetStageLabel: "Lost" },
    ],
    editableFields: [
      { key: "tentativo_1", label: "1° chiamata senza risposta", type: "checkbox" },
      { key: "tentativo_2", label: "2° chiamata senza risposta", type: "checkbox" },
      { key: "tentativo_3", label: "3° chiamata senza risposta", type: "checkbox" },
    ],
  },
  hot_callback_programmato: {
    title: "Hot · Callback breve",
    description: "Il lead ha chiesto di essere richiamato a breve.",
    transitions: [
      { description: "Call effettuata", targetStageLabel: "Hot · Contatto avvenuto" },
    ],
    editableFields: [
      {
        key: "data_callback",
        label: "Data e ora del callback",
        type: "datetime",
        warning: "Segna sul tuo calendario",
      },
    ],
  },
  hot_call_attivazione_prenotata: {
    title: "Hot · Call attivazione prenotata",
    description: "Call di attivazione fissata. Prepara brief e materiali.",
    transitions: [{ description: "Call effettuata", targetStageLabel: "Hot · Call fatta" }],
    editableFields: [
      { key: "data_call_prenotata", label: "Data e ora call prenotata", type: "datetime" },
    ],
  },
  cold_ricerca_futura: {
    title: "Cold · Ricerca futura",
    description: "Famiglia che ha chiesto di essere ricontattata tra X mesi.",
    transitions: [{ description: "Ricontatto e riapertura", targetStageLabel: "Hot · Ingresso" }],
    editableFields: [
      { key: "data_ricontatto", label: "Data ricontatto prevista", type: "date" },
      { key: "nota_ricontatto", label: "Note ricontatto", type: "textarea" },
    ],
  },
  lost: {
    title: "Perso",
    description: "Lead perso. Registra la motivazione per analisi aggregata.",
    transitions: [],
    editableFields: [
      {
        key: "motivazione_lost",
        label: "Motivazione",
        type: "radio",
        options: [
          { value: "prezzo", label: "Prezzo" },
          { value: "non_risponde", label: "Non risponde" },
          { value: "ha_trovato", label: "Ha trovato" },
          { value: "stand_by", label: "Stand by decisionale" },
          { value: "feature_mancante", label: "Feature mancante" },
          { value: "red_flag", label: "Red flag cliente" },
          { value: "generale", label: "Generale" },
        ],
      },
      { key: "note_lost", label: "Note", type: "textarea" },
    ],
  },
  out_of_target: {
    title: "Out of target",
    description: "Lead fuori dal target operativo. Motivazione richiesta.",
    transitions: [],
    editableFields: [
      {
        key: "motivazione_oot",
        label: "Motivazione",
        type: "radio",
        options: [
          { value: "lavoratore", label: "Lavoratore" },
          { value: "area_geo", label: "Area geografica" },
          { value: "frequenza", label: "Frequenza non compatibile" },
          { value: "figura", label: "Figura non coperta" },
          { value: "fuori_target", label: "Ricerca fuori target" },
          { value: "doppione", label: "Doppione" },
        ],
      },
      { key: "note_oot", label: "Note", type: "textarea" },
    ],
  },
}
