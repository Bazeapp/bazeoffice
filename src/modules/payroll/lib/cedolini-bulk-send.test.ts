import { describe, expect, it } from "vitest"

import type { PayrollBoardCardData, PayrollBoardColumnData } from "../types"
import type { CedolinoCheckCard } from "./cedolini-check-warnings"
import type { CedolinoBulkJobDryRunOutcome, CedolinoBulkJobRecord } from "../types/cedolino-bulk-job"
import {
  buildBoardStageMap,
  deriveBulkSendPhase,
  getBulkJobProgressPercent,
  getBulkSendRemainingCount,
  getSendEligibleMeseLavorativoIds,
  isSendDryRunSuccess,
} from "./cedolini-bulk-send"

function makeCard(overrides: Partial<CedolinoCheckCard> = {}): CedolinoCheckCard {
  return {
    resultId: "res-1",
    meseLavorativoId: "m-1",
    status: "ok",
    warnings: [],
    details: null,
    info: null,
    ...overrides,
  }
}

function makeBoardCard(overrides: Partial<PayrollBoardCardData> = {}): PayrollBoardCardData {
  return {
    id: "m-1",
    stage: "Cedolino da controllare",
    record: { id: "m-1", caso_particolare: "no" } as PayrollBoardCardData["record"],
    famiglia: null,
    pagamento: null,
    transazione: null,
    presenze: null,
    presenzeRegolari: null,
    rapporto: { id: "r-1" } as PayrollBoardCardData["rapporto"],
    mese: null,
    richiestaAttivazione: null,
    presenzeIrregolari: false,
    nomeCompleto: "Rossi – Maria",
    importoLabel: null,
    dataInvioLabel: null,
    ...overrides,
  }
}

function makeColumns(cards: PayrollBoardCardData[]): PayrollBoardColumnData[] {
  return [{ id: "Cedolino da controllare", label: "Cedolino da controllare", color: "yellow", cards }]
}

describe("buildBoardStageMap", () => {
  it("mappa id → stage dalle colonne board", () => {
    const columns = makeColumns([makeBoardCard({ id: "m-1", stage: "Cedolino Pronto" })])
    expect(buildBoardStageMap(columns).get("m-1")).toBe("Cedolino Pronto")
  })
})

describe("getSendEligibleMeseLavorativoIds", () => {
  it("include le card Pronti ancora 'Cedolino da controllare' sulla board", () => {
    const pronti = [makeCard({ meseLavorativoId: "m-1" }), makeCard({ resultId: "res-2", meseLavorativoId: "m-2" })]
    const columns = makeColumns([
      makeBoardCard({ id: "m-1", stage: "Cedolino da controllare" }),
      makeBoardCard({ id: "m-2", stage: "Cedolino da controllare" }),
    ])
    expect(getSendEligibleMeseLavorativoIds(pronti, columns)).toEqual(["m-1", "m-2"])
  })

  it("EDGE: esclude una card spostata via drag su un'altra colonna board", () => {
    const pronti = [makeCard({ meseLavorativoId: "m-1" }), makeCard({ resultId: "res-2", meseLavorativoId: "m-2" })]
    const columns = makeColumns([
      makeBoardCard({ id: "m-1", stage: "Cedolino da controllare" }),
      makeBoardCard({ id: "m-2", stage: "Cedolino Pronto" }),
    ])
    expect(getSendEligibleMeseLavorativoIds(pronti, columns)).toEqual(["m-1"])
  })

  it("EDGE: non blocca un id assente dalla board (nessun segnale contrario)", () => {
    const pronti = [makeCard({ meseLavorativoId: "m-missing" })]
    expect(getSendEligibleMeseLavorativoIds(pronti, [])).toEqual(["m-missing"])
  })
})

describe("isSendDryRunSuccess (A-S7)", () => {
  it("success + details.updated true → successo", () => {
    const outcome: CedolinoBulkJobDryRunOutcome = {
      mese_lavorativo_id: "m-1",
      status: "success",
      details: { updated: true },
    }
    expect(isSendDryRunSuccess(outcome)).toBe(true)
  })

  it("EDGE: status skipped → fallimento (AE2)", () => {
    const outcome: CedolinoBulkJobDryRunOutcome = {
      mese_lavorativo_id: "m-1",
      status: "skipped",
      error: "missing_cedolino",
    }
    expect(isSendDryRunSuccess(outcome)).toBe(false)
  })

  it("EDGE: status error → fallimento", () => {
    const outcome: CedolinoBulkJobDryRunOutcome = { mese_lavorativo_id: "m-1", status: "error", error: "boom" }
    expect(isSendDryRunSuccess(outcome)).toBe(false)
  })

  it("EDGE: status success ma details.updated assente → fallimento difensivo", () => {
    const outcome: CedolinoBulkJobDryRunOutcome = { mese_lavorativo_id: "m-1", status: "success", details: {} }
    expect(isSendDryRunSuccess(outcome)).toBe(false)
  })

  it("EDGE: nessun outcome (job senza item da elaborare) → fallimento", () => {
    expect(isSendDryRunSuccess(null)).toBe(false)
  })
})

describe("deriveBulkSendPhase", () => {
  it("idle: nessun job avviato", () => {
    expect(
      deriveBulkSendPhase({ isStartingDryRun: false, jobId: null, dryRunOutcome: null, jobStatus: null }),
    ).toBe("idle")
  })

  it("dry_running: invio di prova in corso ha priorità su tutto", () => {
    expect(
      deriveBulkSendPhase({
        isStartingDryRun: true,
        jobId: "job-1",
        dryRunOutcome: null,
        jobStatus: "in_corso",
      }),
    ).toBe("dry_running")
  })

  it("dry_run_failed: outcome fallito, job non ancora in_corso", () => {
    expect(
      deriveBulkSendPhase({
        isStartingDryRun: false,
        jobId: "job-1",
        dryRunOutcome: { mese_lavorativo_id: "m-1", status: "error", error: "boom" },
        jobStatus: "pending",
      }),
    ).toBe("dry_run_failed")
  })

  it("confirm_pending: outcome riuscito, in attesa di conferma", () => {
    expect(
      deriveBulkSendPhase({
        isStartingDryRun: false,
        jobId: "job-1",
        dryRunOutcome: { mese_lavorativo_id: "m-1", status: "success", details: { updated: true } },
        jobStatus: "pending",
      }),
    ).toBe("confirm_pending")
  })

  it("processing: il job polled è in_corso (priorità sullo stato locale del dry run)", () => {
    expect(
      deriveBulkSendPhase({
        isStartingDryRun: false,
        jobId: "job-1",
        dryRunOutcome: { mese_lavorativo_id: "m-1", status: "success", details: { updated: true } },
        jobStatus: "in_corso",
      }),
    ).toBe("processing")
  })

  it("completata / interrotta / error rispecchiano lo stato del job", () => {
    const base = { isStartingDryRun: false, jobId: "job-1", dryRunOutcome: null } as const
    expect(deriveBulkSendPhase({ ...base, jobStatus: "completata" })).toBe("completata")
    expect(deriveBulkSendPhase({ ...base, jobStatus: "interrotta" })).toBe("interrotta")
    expect(deriveBulkSendPhase({ ...base, jobStatus: "failed" })).toBe("error")
  })

  it("EXTRACTION (U6): isDryRunSuccess iniettabile — un altro kind può ridefinire il successo del dry run", () => {
    const outcome: CedolinoBulkJobDryRunOutcome = { mese_lavorativo_id: "m-1", status: "success", details: {} }
    // Per "send" questo stesso outcome fallirebbe (manca details.updated), ma
    // un predicato iniettato (es. quello del reminder, U6) lo considera un successo.
    expect(
      deriveBulkSendPhase({
        isStartingDryRun: false,
        jobId: "job-1",
        dryRunOutcome: outcome,
        jobStatus: "pending",
      }),
    ).toBe("dry_run_failed")
    expect(
      deriveBulkSendPhase({
        isStartingDryRun: false,
        jobId: "job-1",
        dryRunOutcome: outcome,
        jobStatus: "pending",
        isDryRunSuccess: (o) => o.status === "success",
      }),
    ).toBe("confirm_pending")
  })
})

describe("getBulkJobProgressPercent", () => {
  function makeJob(overrides: Partial<CedolinoBulkJobRecord> = {}): CedolinoBulkJobRecord {
    return {
      id: "job-1",
      kind: "send",
      year_month: "2026-07",
      status: "in_corso",
      stop_requested: false,
      started_at: null,
      completed_at: null,
      total_count: 10,
      processed_count: 3,
      success_count: 3,
      skipped_count: 0,
      error_count: 0,
      ...overrides,
    }
  }

  it("calcola la percentuale arrotondata", () => {
    expect(getBulkJobProgressPercent(makeJob({ processed_count: 3, total_count: 10 }))).toBe(30)
  })

  it("EDGE: job null → 0", () => {
    expect(getBulkJobProgressPercent(null)).toBe(0)
  })

  it("EDGE: total_count 0 → 0 (nessuna divisione per zero)", () => {
    expect(getBulkJobProgressPercent(makeJob({ processed_count: 0, total_count: 0 }))).toBe(0)
  })
})

describe("getBulkSendRemainingCount", () => {
  it("prima che il job sia stato letto: totalCount - 1 (l'item del dry run)", () => {
    expect(getBulkSendRemainingCount({ totalCount: 5, job: null })).toBe(4)
  })

  it("con job letto: total_count - processed_count", () => {
    expect(
      getBulkSendRemainingCount({ totalCount: 5, job: { processed_count: 2 } }),
    ).toBe(3)
  })

  it("EDGE: non scende sotto zero", () => {
    expect(getBulkSendRemainingCount({ totalCount: 1, job: { processed_count: 5 } })).toBe(0)
    expect(getBulkSendRemainingCount({ totalCount: 0, job: null })).toBe(0)
  })
})
