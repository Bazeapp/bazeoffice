import { normalizeInvolvementToken } from "@/features/lavoratori/lib/involvement-utils";

// Ordinamento semantico dei gruppi `stato_selezione` per la sezione
// «Ricerche coinvolte» del dettaglio lavoratore.
//
// Schema a 3 tier:
//   - Tier 0 (cima):   "no match"
//   - Tier centrale:   funnel degli stati attivi/aperti
//                      candidati -> da colloquiare -> colloqui/prove -> post-colloquio positivi
//   - Sconosciuti / "Senza stato": subito prima dell'archivio
//   - Tier archivio (fondo): "non selezionato", "archivio", "nascosto - oot"
//
// La conoscenza dei macro-gruppi rispecchia quella del pipeline
// (`src/hooks/use-ricerca-workers-pipeline.ts`); qui è isolata in un modulo puro
// e testabile. Il confronto avviene su token normalizzato, riusando
// `normalizeInvolvementToken` (stessa normalizzazione del resto del dominio).

function bucket(...tokens: string[]): ReadonlySet<string> {
  return new Set(tokens.map((token) => normalizeInvolvementToken(token)));
}

// Bucket ordinati: l'indice è il rank. L'ordine è significativo — "no match"
// deve stare prima del bucket archivio, altrimenti vi ricadrebbe.
const SELECTION_STATE_BUCKETS: readonly ReadonlySet<string>[] = [
  // Tier 0 — in cima
  bucket("no match"),
  // Tier centrale — funnel attivi
  bucket("candidato - good fit", "prospetto", "candidato - poor fit"),
  bucket("da colloquiare", "invitato a colloquio", "non risponde"),
  bucket(
    "colloquio schedulato",
    "colloquio rimandato",
    "colloquio fatto",
    "prova schedulata",
    "prova rimandata",
    "prova in corso",
    "prova fatta",
    "prova con cliente", // legacy
  ),
  bucket(
    "selezionato",
    "inviato al cliente",
    "inviato al cliente in attesa di feedback",
    "match",
  ),
];

const ARCHIVE_BUCKET = bucket("non selezionato", "archivio", "nascosto - oot");

/** Rank degli stati sconosciuti / "Senza stato": dopo gli attivi, prima dell'archivio. */
const UNKNOWN_RANK = SELECTION_STATE_BUCKETS.length;
/** Rank del tier archivio: sempre in fondo. */
const ARCHIVE_RANK = SELECTION_STATE_BUCKETS.length + 1;

/** Rank ordinale di uno `stato_selezione` secondo lo schema a 3 tier
 *  (più basso = più in alto nell'elenco). */
export function getSelectionStateRank(stato: string | null | undefined): number {
  const token = normalizeInvolvementToken(stato);
  for (let index = 0; index < SELECTION_STATE_BUCKETS.length; index += 1) {
    if (SELECTION_STATE_BUCKETS[index].has(token)) return index;
  }
  if (ARCHIVE_BUCKET.has(token)) return ARCHIVE_RANK;
  return UNKNOWN_RANK;
}

/** Ordina in modo stabile una lista `[etichetta, elementi]` per rank di stato.
 *  A parità di rank preserva l'ordine di input (Array.prototype.sort è stabile,
 *  ES2019+). Non muta l'array in ingresso. */
export function sortSelectionGroupsByRank<T>(
  entries: [string, T][],
): [string, T][] {
  return [...entries].sort(
    (a, b) => getSelectionStateRank(a[0]) - getSelectionStateRank(b[0]),
  );
}
