import { vi } from "vitest"

import type { LavoratoreListItem } from "@/modules/lavoratori/components/lavoratore-card"
import type { CrmPipelineCardData } from "@/modules/crm/types"
import type {
  RicercaWorkerSelectionCard,
  RicercaWorkerSelectionColumn,
  RicercaWorkersPipelineState,
} from "../../types"

export function makePipelineWorker(
  overrides: Partial<LavoratoreListItem> = {},
): LavoratoreListItem {
  return {
    id: "worker-1",
    nomeCompleto: "Maria Rossi",
    immagineUrl: null,
    locationLabel: "Milano",
    telefono: "3331234567",
    isBlacklisted: false,
    tipoRuolo: "Colf",
    tipoRuoloColor: null,
    tipoLavoro: "Part-time",
    tipoLavoroColor: null,
    statoLavoratore: "qualificato",
    statoLavoratoreColor: null,
    disponibilita: "disponibile",
    disponibilitaColor: null,
    ...overrides,
  } as LavoratoreListItem
}

export function makeSelectionCard(
  overrides: Partial<RicercaWorkerSelectionCard> = {},
): RicercaWorkerSelectionCard {
  return {
    id: "sel-1",
    status: "Candidato - Good fit",
    punteggio: "80",
    scheduledAt: null,
    endedAt: null,
    worker: makePipelineWorker(),
    ...overrides,
  }
}

export function makePipelineColumn(
  overrides: Partial<RicercaWorkerSelectionColumn> = {},
): RicercaWorkerSelectionColumn {
  return {
    id: "col-1",
    label: "Candidati",
    color: "blue",
    cards: [makeSelectionCard()],
    ...overrides,
  }
}

export function makeGroupedCandidatiColumn(
  cards: RicercaWorkerSelectionCard[],
): RicercaWorkerSelectionColumn {
  return {
    id: "__candidati__",
    label: "Candidati",
    color: "blue",
    cards,
  }
}

export function makePipelineState(
  overrides: Partial<RicercaWorkersPipelineState> = {},
): RicercaWorkersPipelineState {
  return {
    loading: false,
    error: null,
    columns: [makePipelineColumn()],
    moveCard: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn(),
    ...overrides,
  }
}

export function makeProcessCard(
  overrides: Partial<CrmPipelineCardData> = {},
): CrmPipelineCardData {
  return {
    id: "process-1",
    famigliaId: "fam-1",
    numeroRicercaAttivata: "42",
    stage: "ricerca",
    nomeFamiglia: "Famiglia Rossi",
    email: "famiglia@example.com",
    telefono: "02123456",
    dataLead: "2026-01-01",
    tipoLavoroBadge: null,
    tipoLavoroColor: null,
    tipoRapportoBadge: null,
    tipoRapportoColor: null,
    statoRes: "attivo",
    qualificazioneLead: "",
    motivoNoMatch: "",
    modelloSmartmatching: "",
    oreSettimana: "",
    giorniSettimana: "",
    giornatePreferite: [],
    salesColdCallFollowup: "",
    salesNoShowFollowup: "",
    motivazioneLost: "",
    motivazioneOot: "",
    appuntiChiamataSales: "",
    dataPerRicercaFutura: "",
    dataCallPrenotata: "",
    dataLeadRaw: null,
    dataPerRicercaFuturaRaw: null,
    ...overrides,
  } as CrmPipelineCardData
}
