/**
 * Filtri avanzati della mappa ricerca (BAZ-27).
 *
 * Modulo PURO: opzioni statiche, stato (`string[]` per gruppo — coerente col
 * pattern chip già in `ricerca-workers-map-view.tsx`), derivazioni e predicati.
 * Nessun React qui, così la logica di filtro è unit-testabile in isolamento.
 *
 * Semantica **pass-through**: un dato mancante o non classificabile NON nasconde
 * il lavoratore. Un gruppo a chip esclude solo i lavoratori positivamente
 * classificabili in un'opzione **deselezionata**; una selezione vuota non pone
 * alcun vincolo. Unica eccezione: una selezione Nazionalità attiva esclude chi
 * non ha quella nazionalità (inclusi i null), perché lì l'utente sta filtrando
 * esplicitamente per un valore che dev'essere presente.
 */

// --- Forma minima del lavoratore su cui filtriamo ----------------------------
export type MapFilterableWorker = {
  sesso?: string | null
  nazionalita?: string | null
  comeTiSposti?: string[]
  eta?: number | null
}

// --- Opzioni -----------------------------------------------------------------

export const GENERE_FILTER_OPTIONS = ["Donna", "Uomo"] as const

export const AUTOMUNITI_FILTER_OPTIONS = ["Automunito", "Non automunito"] as const

/**
 * Valore lookup di `come_ti_sposti` che qualifica un lavoratore come automunito.
 * NB: accoppiato alla label ESATTA in `lookup_values` (entity_field
 * `come_ti_sposti`). Se lo staff rinomina la label nel dizionario va aggiornata
 * qui — il pass-through maschererebbe silenziosamente il disallineamento.
 */
export const AUTOMUNITO_TRANSPORT_LABEL = "Ho la patente e la macchina"

export type EtaBucket = { key: string; label: string; min: number; max: number }

export const ETA_FILTER_BUCKETS: EtaBucket[] = [
  { key: "18-29", label: "18–29", min: 18, max: 29 },
  { key: "30-39", label: "30–39", min: 30, max: 39 },
  { key: "40-49", label: "40–49", min: 40, max: 49 },
  { key: "50-59", label: "50–59", min: 50, max: 59 },
  { key: "60+", label: "60+", min: 60, max: Number.POSITIVE_INFINITY },
]

// --- Stato -------------------------------------------------------------------

export type MapAdvancedFilters = {
  genere: string[]
  automuniti: string[]
  eta: string[] // chiavi bucket (ETA_FILTER_BUCKETS[].key)
  nazionalita: string[]
}

/** Stato iniziale: chip tutti selezionati, Nazionalità nessuna (= nessun vincolo). */
export function createDefaultAdvancedFilters(): MapAdvancedFilters {
  return {
    genere: [...GENERE_FILTER_OPTIONS],
    automuniti: [...AUTOMUNITI_FILTER_OPTIONS],
    eta: ETA_FILTER_BUCKETS.map((bucket) => bucket.key),
    nazionalita: [],
  }
}

// --- Derivazioni (pure) ------------------------------------------------------

/** `null` quando `come_ti_sposti` è assente/vuoto → non classificabile (pass-through). */
export function deriveAutomuniti(
  comeTiSposti: readonly string[] | null | undefined
): "Automunito" | "Non automunito" | null {
  if (!comeTiSposti || comeTiSposti.length === 0) return null
  return comeTiSposti.some((value) => value.trim() === AUTOMUNITO_TRANSPORT_LABEL)
    ? "Automunito"
    : "Non automunito"
}

/** Chiave del bucket d'età, o `null` se età mancante o fuori dalle fasce. */
export function deriveEtaBucket(eta: number | null | undefined): string | null {
  if (eta == null || !Number.isFinite(eta)) return null
  const bucket = ETA_FILTER_BUCKETS.find((b) => eta >= b.min && eta <= b.max)
  return bucket ? bucket.key : null
}

/** Genere canonico ("Donna"/"Uomo") case-insensitive, o `null` se altro/mancante. */
export function deriveGenere(sesso: string | null | undefined): "Donna" | "Uomo" | null {
  const token = String(sesso ?? "").trim().toLowerCase()
  return (
    GENERE_FILTER_OPTIONS.find((option) => option.toLowerCase() === token) ?? null
  )
}

// --- Predicati (pass-through) ------------------------------------------------

/**
 * Gruppo a chip: passa se la selezione è vuota (nessun vincolo), se il valore
 * derivato è `null` (non classificabile → pass-through), o se la selezione
 * contiene il valore derivato.
 */
function matchesChipGroup(derived: string | null, selected: readonly string[]): boolean {
  if (selected.length === 0) return true
  if (derived == null) return true
  return selected.includes(derived)
}

export function matchesGenere(worker: MapFilterableWorker, selected: readonly string[]): boolean {
  return matchesChipGroup(deriveGenere(worker.sesso), selected)
}

export function matchesAutomuniti(worker: MapFilterableWorker, selected: readonly string[]): boolean {
  return matchesChipGroup(deriveAutomuniti(worker.comeTiSposti), selected)
}

export function matchesEta(worker: MapFilterableWorker, selected: readonly string[]): boolean {
  return matchesChipGroup(deriveEtaBucket(worker.eta), selected)
}

export function matchesNazionalita(
  worker: MapFilterableWorker,
  selected: readonly string[]
): boolean {
  if (selected.length === 0) return true
  // Trim per allinearsi a deriveNazionalitaOptions (che costruisce le opzioni
  // già trimmate): una nazionalità con spazi combacia comunque con l'opzione.
  const nazionalita = (worker.nazionalita ?? "").trim()
  return nazionalita.length > 0 && selected.includes(nazionalita)
}

/** `true` se il lavoratore passa TUTTI e 4 i gruppi (AND). */
export function workerMatchesAdvancedFilters(
  worker: MapFilterableWorker,
  filters: MapAdvancedFilters
): boolean {
  return (
    matchesGenere(worker, filters.genere) &&
    matchesAutomuniti(worker, filters.automuniti) &&
    matchesEta(worker, filters.eta) &&
    matchesNazionalita(worker, filters.nazionalita)
  )
}

// --- Supporto pallino blu / reset --------------------------------------------

export function isSameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const setB = new Set(b)
  return a.every((value) => setB.has(value))
}

/** `true` se lo stato differisce dal default (→ pallino blu sul toggle). */
export function hasActiveAdvancedFilters(filters: MapAdvancedFilters): boolean {
  const defaults = createDefaultAdvancedFilters()
  return (
    !isSameSet(filters.genere, defaults.genere) ||
    !isSameSet(filters.automuniti, defaults.automuniti) ||
    !isSameSet(filters.eta, defaults.eta) ||
    filters.nazionalita.length > 0
  )
}

// --- Opzioni Nazionalità dai lavoratori caricati -----------------------------

/** Nazionalità distinte presenti tra i lavoratori caricati, ordinate (it). */
export function deriveNazionalitaOptions(
  workers: readonly MapFilterableWorker[]
): string[] {
  const values = new Set<string>()
  for (const worker of workers) {
    const nazionalita = (worker.nazionalita ?? "").trim()
    if (nazionalita.length > 0) values.add(nazionalita)
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b, "it"))
}
