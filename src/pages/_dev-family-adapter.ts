/**
 * Adapter per convertire i dati dell'hook `useCrmPipelinePreview`
 * (CrmPipelineCardData) nel tipo FamilyLead usato dai componenti del playground.
 *
 * Bridge temporaneo Fase 5 — in Fase 5 vera i componenti accetteranno direttamente
 * il tipo di dominio dal backend o un view model più vicino.
 */
import type {
  CrmPipelineCardData,
  LookupOptionsByField,
} from "@/hooks/use-crm-pipeline-preview"

import {
  CONTRACT_OPTIONS,
  JOB_OPTIONS,
  type FamilyAnnuncioStatus,
  type FamilyContractKey,
  type FamilyDetailData,
  type FamilyJobKey,
  type FamilyLead,
  type FamilyStageId,
} from "./_dev-family-mock-data"

// ============================================================
// Normalization helpers
// ============================================================

function normalizeToken(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase()
}

function parseNumberOrUndefined(value: string | null | undefined): number | undefined {
  if (!value) return undefined
  const n = Number(String(value).replace(/[^\d.-]/g, ""))
  return Number.isFinite(n) ? n : undefined
}

function nonEmpty(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const t = String(value).trim()
  if (!t || t === "-") return undefined
  return t
}

// ============================================================
// Label/key mapping — job & contract
// ============================================================

/**
 * Mappa una label o key del backend alla JobKey canonica del design system.
 * Matching case-insensitive prima per key, poi per label.
 */
function mapJobKey(input: string | null | undefined): FamilyJobKey | null {
  if (!input) return null
  const t = normalizeToken(input)
  const byKey = JOB_OPTIONS.find((o) => normalizeToken(o.key) === t)
  if (byKey) return byKey.key
  const byLabel = JOB_OPTIONS.find((o) => normalizeToken(o.label) === t)
  if (byLabel) return byLabel.key
  // Fallback: matching su prefissi noti
  if (t.includes("colf") || t.includes("pulizi")) return "colf"
  if (t.includes("badant") || t.includes("assistenza")) return "badante"
  if (t.includes("babysitter") || t.includes("tata")) return "babysitter"
  return null
}

function mapContractKey(input: string | null | undefined): FamilyContractKey | null {
  if (!input) return null
  const t = normalizeToken(input)
  const byKey = CONTRACT_OPTIONS.find((o) => normalizeToken(o.key) === t)
  if (byKey) return byKey.key
  const byLabel = CONTRACT_OPTIONS.find((o) => normalizeToken(o.label) === t)
  if (byLabel) return byLabel.key
  if (t.includes("part")) return "parttime"
  if (t.includes("full")) return "fulltime"
  if (t.includes("ore") || t.includes("orari")) return "orario"
  if (t.includes("conviv")) return "convivente"
  return null
}

function mapStageId(input: string | null | undefined): FamilyStageId {
  const t = normalizeToken(input)
  const known: FamilyStageId[] = [
    "warm_lead",
    "hot_ingresso",
    "hot_in_attesa_di_primo_contatto",
    "hot_contatto_avvenuto",
    "hot_callback_programmato",
    "hot_decisione_rimandata",
    "hot_call_attivazione_prenotata",
    "hot_call_attivazione_fatta",
    "hot_follow_up_post_call",
    "hot_no_show",
    "cold_ricerca_futura",
    "won_ricerca_attivata",
    "lost",
    "out_of_target",
  ]
  const match = known.find((k) => k === t)
  return match ?? "warm_lead"
}

function mapTipologiaIncontro(
  input: string | null | undefined,
): "presenza" | "video" | "telefono" | undefined {
  if (!input) return undefined
  const t = normalizeToken(input)
  if (t.includes("presenz")) return "presenza"
  if (t.includes("video")) return "video"
  if (t.includes("telef")) return "telefono"
  return undefined
}

function mapGenere(input: string | null | undefined): "donna" | "uomo" | null {
  if (!input) return null
  const t = normalizeToken(input)
  if (t.includes("donna") || t === "f" || t === "female") return "donna"
  if (t.includes("uomo") || t === "m" || t === "male") return "uomo"
  return null
}

// ============================================================
// Format helpers
// ============================================================

function formatOreGiorni(ore: string, giorni: string): string {
  const o = nonEmpty(ore)
  const g = nonEmpty(giorni)
  if (!o && !g) return "-"
  return `${o ?? "-"}h | ${g ?? "-"}gg`
}

// ============================================================
// Main adapter: CrmPipelineCardData → FamilyLead
// ============================================================

export function adaptCardToLead(card: CrmPipelineCardData): FamilyLead {
  const stage = mapStageId(card.stage)
  const jobKey = mapJobKey(card.tipoLavoroBadge)
  const contractKey = mapContractKey(card.tipoRapportoBadge)

  const annuncioCreato = nonEmpty(card.testoAnnuncioWhatsapp)
  const annuncioStatus: FamilyAnnuncioStatus = annuncioCreato ? "created" : "idle"

  const detail: FamilyDetailData = {
    // Orari
    orarioLavoro: nonEmpty(card.orarioDiLavoro),
    oreSettimanali: parseNumberOrUndefined(card.oreSettimana),
    giorniSettimanali: parseNumberOrUndefined(card.giorniSettimana),
    giornatePreferite: card.giornatePreferite ?? [],

    // Luogo
    provincia: nonEmpty(card.indirizzoProvincia),
    cap: nonEmpty(card.indirizzoCap),
    quartiere: nonEmpty(card.indirizzoNote),
    indirizzo: nonEmpty(card.indirizzoCompleto),
    mapsUrl: nonEmpty(card.srcEmbedMapsAnnucio),

    // Famiglia
    composizione: nonEmpty(card.nucleoFamigliare),
    neonatiPresenti: false, // campi non presenti in CrmPipelineCardData — default
    piuBambini: false,
    quattroPiu: false,

    // Casa
    descrizioneCasa: nonEmpty(card.descrizioneCasa),
    metraturaCasa: nonEmpty(card.metraturaCasa),

    // Animali
    descrizioneAnimali: nonEmpty(card.descrizioneAnimaliInCasa),
    cani: null,
    gatti: false,

    // Mansioni
    descrizioneMansioni: nonEmpty(card.mansioniRichieste),
    pulizieAlte: false,
    stirare: null,
    cucinare: null,
    giardino: false,

    // Richieste
    notePrivate: nonEmpty(card.informazioniExtraRiservate),
    italiano: true,
    inglese: false,
    genere: mapGenere(card.sesso),
    trasferte: !!card.richiestaTrasferte,
    trasferteNote: nonEmpty(card.descrizioneRichiestaTrasferte),
    ferie: !!card.richiestaFerie,
    ferieNote: nonEmpty(card.descrizioneRichiestaFerie),
    patente: !!card.richiestaPatente,
    automunita: false,
    nazionalitaEscluse: [],
    nazionalitaObbligatorie: [],
    etaMin: parseNumberOrUndefined(card.etaMinima),
    etaMax: parseNumberOrUndefined(card.etaMassima),
    profilo: [],

    // Tempistiche
    deadline: nonEmpty(card.deadlineMobile),
    tipologiaIncontro: mapTipologiaIncontro(card.tipoIncontroFamigliaLavoratore),
    disponibilita: nonEmpty(card.disponibilitaColloquiInPresenza),
    preventivoUrl: undefined,

    // Annuncio
    annuncioStatus,
    annuncioUrl: undefined, // live URL non disponibile in CrmPipelineCardData
  }

  return {
    id: card.id,
    stage,
    name: nonEmpty(card.nomeFamiglia) ?? "(senza nome)",
    email: nonEmpty(card.email) ?? "-",
    phone: nonEmpty(card.telefono) ?? "-",
    oreGiorni: formatOreGiorni(card.oreSettimana, card.giorniSettimana),
    creationDate: nonEmpty(card.dataLead) ?? "-",
    province: nonEmpty(card.indirizzoProvincia) ?? "-",
    jobs: jobKey ? [jobKey] : [],
    contract: contractKey,
    scheduledCallAt: nonEmpty(card.dataCallPrenotata),
    recontactDate: nonEmpty(card.dataPerRicercaFutura),
    callAttemptCount:
      card.tentativiChiamataCount && card.tentativiChiamataCount > 0
        ? card.tentativiChiamataCount
        : undefined,
    preventivoAccettato: !!card.preventivoAccettato,
    detail,
    // Commenti non presenti in CrmPipelineCardData — array vuoto per ora
    comments: [],
  }
}

// ============================================================
// Reverse mapping: FamilyLead changes → backend patches
// ============================================================

/**
 * Converte cambio jobs (multi) in patch per updateProcessCard.
 * Il backend si aspetta array di label (valueLabel del lookup).
 */
export function buildJobsPatch(
  jobs: FamilyJobKey[],
  lookupOptions: LookupOptionsByField,
): Record<string, unknown> {
  const options = lookupOptions.tipo_lavoro ?? []
  const labels = jobs
    .map((k) => {
      const option = JOB_OPTIONS.find((o) => o.key === k)
      if (!option) return null
      // Preferisci valueLabel del backend, fallback a label locale
      const backendOption = options.find(
        (o) => normalizeToken(o.valueLabel) === normalizeToken(option.label),
      )
      return backendOption?.valueLabel ?? option.label
    })
    .filter((l): l is string => l !== null)

  return { tipo_lavoro: labels }
}

export function buildContractPatch(
  contract: FamilyContractKey,
  lookupOptions: LookupOptionsByField,
): Record<string, unknown> {
  const options = lookupOptions.tipo_rapporto ?? []
  const contractOpt = CONTRACT_OPTIONS.find((o) => o.key === contract)
  if (!contractOpt) return {}
  const backendOption = options.find(
    (o) => normalizeToken(o.valueLabel) === normalizeToken(contractOpt.label),
  )
  return { tipo_rapporto: [backendOption?.valueLabel ?? contractOpt.label] }
}

/**
 * Converte patch FamilyDetailData in patch snake_case per il backend.
 * Solo i campi effettivamente mutati (undefined → non inviato).
 */
export function buildDetailPatch(
  patch: Partial<FamilyDetailData>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}

  // Orari
  if ("orarioLavoro" in patch) out.orario_di_lavoro = patch.orarioLavoro ?? ""
  if ("oreSettimanali" in patch) out.ore_settimana = String(patch.oreSettimanali ?? "")
  if ("giorniSettimanali" in patch)
    out.giorni_settimana = String(patch.giorniSettimanali ?? "")
  if ("giornatePreferite" in patch) out.giornate_preferite = patch.giornatePreferite ?? []

  // Luogo
  if ("provincia" in patch) out.indirizzo_provincia = patch.provincia ?? ""
  if ("cap" in patch) out.indirizzo_cap = patch.cap ?? ""
  if ("quartiere" in patch) out.indirizzo_note = patch.quartiere ?? ""
  if ("indirizzo" in patch) out.indirizzo_completo = patch.indirizzo ?? ""
  if ("mapsUrl" in patch) out.src_embed_maps_annucio = patch.mapsUrl ?? ""

  // Famiglia
  if ("composizione" in patch) out.nucleo_famigliare = patch.composizione ?? ""

  // Casa
  if ("descrizioneCasa" in patch) out.descrizione_casa = patch.descrizioneCasa ?? ""
  if ("metraturaCasa" in patch) out.metratura_casa = patch.metraturaCasa ?? ""

  // Animali
  if ("descrizioneAnimali" in patch)
    out.descrizione_animali_in_casa = patch.descrizioneAnimali ?? ""

  // Mansioni
  if ("descrizioneMansioni" in patch)
    out.mansioni_richieste = patch.descrizioneMansioni ?? ""

  // Richieste
  if ("notePrivate" in patch)
    out.informazioni_extra_riservate = patch.notePrivate ?? ""
  if ("genere" in patch) out.sesso = patch.genere ?? null
  if ("trasferte" in patch) out.richiesta_trasferte = !!patch.trasferte
  if ("trasferteNote" in patch)
    out.descrizione_richiesta_trasferte = patch.trasferteNote ?? ""
  if ("ferie" in patch) out.richiesta_ferie = !!patch.ferie
  if ("ferieNote" in patch)
    out.descrizione_richiesta_ferie = patch.ferieNote ?? ""
  if ("patente" in patch) out.richiesta_patente = !!patch.patente
  if ("etaMin" in patch) out.eta_minima = String(patch.etaMin ?? "")
  if ("etaMax" in patch) out.eta_massima = String(patch.etaMax ?? "")

  // Tempistiche
  if ("deadline" in patch) out.deadline_mobile = patch.deadline ?? ""
  if ("tipologiaIncontro" in patch)
    out.tipo_incontro_famiglia_lavoratore = patch.tipologiaIncontro ?? ""
  if ("disponibilita" in patch)
    out.disponibilita_colloqui_in_presenza = patch.disponibilita ?? ""

  return out
}
