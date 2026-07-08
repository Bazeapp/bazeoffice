export type StatoRicercaDefinition = {
  id: string;
  label: string;
  color: string;
  sortOrder: number;
};

export const STATI_RICERCA_CANONICI = [
  {
    id: "da_assegnare",
    label: "da assegnare",
    color: "amber",
    sortOrder: 10,
  },
  {
    id: "fare_ricerca",
    label: "fare ricerca",
    color: "yellow",
    sortOrder: 20,
  },
  {
    id: "in_preparazione_per_invio",
    label: "in preparazione per invio",
    color: "cyan",
    sortOrder: 30,
  },
  {
    id: "inviare_selezione",
    label: "inviare selezione",
    color: "sky",
    sortOrder: 40,
  },
  {
    id: "selezione_inviata,_in_attesa_di_feedback",
    label: "selezione inviata, in attesa di feedback",
    color: "blue",
    sortOrder: 50,
  },
  {
    id: "fase_di_colloqui",
    label: "fase di colloqui",
    color: "red",
    sortOrder: 60,
  },
  {
    id: "in_prova_con_lavoratore",
    label: "in prova con lavoratore",
    color: "orange",
    sortOrder: 70,
  },
  {
    id: "match",
    label: "match",
    color: "emerald",
    sortOrder: 80,
  },
  {
    id: "no_match",
    label: "no match",
    color: "red",
    sortOrder: 90,
  },
  {
    id: "stand_by",
    label: "stand by",
    color: "green",
    sortOrder: 100,
  },
] as const satisfies readonly StatoRicercaDefinition[];

export const STATO_RICERCA_CANONICO_IDS = new Set(
  STATI_RICERCA_CANONICI.map((stato) => stato.id),
);

export const STATO_RICERCA_CANONICO_LABELS = new Set(
  STATI_RICERCA_CANONICI.map((stato) => stato.label),
);

