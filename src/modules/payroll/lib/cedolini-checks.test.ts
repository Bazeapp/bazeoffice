import { describe, expect, it } from "vitest"

import type { CedolinoPdfFields, ClassifyChecksInput } from "./cedolini-checks"
import {
  classifyCedolinoChecks,
  compareOre,
  comparePaga,
  evaluatePaymentUrlResult,
  formatPaymentUrlReasonMessage,
  formatPresenzeEventLabel,
  isBazePay,
  resolveCedolinoWarningMessage,
  sumPresenzeOre,
  WARNING_CATEGORIES,
} from "./cedolini-checks"

function presenza(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const base: Record<string, unknown> = {}
  for (let day = 1; day <= 22; day += 1) {
    base[`ore_day_${day}`] = 8
  }
  return { ...base, ...overrides }
}

function pdfFields(overrides: Partial<CedolinoPdfFields> = {}): CedolinoPdfFields {
  return {
    paga_oraria: 10,
    ore_ordinarie: 176,
    ore_straordinarie: 0,
    permessi_retribuiti: 0,
    totale_ore: 176,
    ...overrides,
  }
}

function baseInput(overrides: Partial<ClassifyChecksInput> = {}): ClassifyChecksInput {
  return {
    pdfFields: pdfFields(),
    pdfExtractOk: true,
    hasCedolinoAttachment: true,
    cedolinoUrl: "https://example.com/cedolino.pdf",
    rapportoPagaOraria: 10,
    presenze: presenza(),
    casoParticolare: null,
    note: null,
    isBazePayFlag: false,
    paymentUrlResult: null,
    ...overrides,
  }
}

describe("sumPresenzeOre", () => {
  it("sums ordinary days with no events", () => {
    const { totaleOre, eventiWarning } = sumPresenzeOre(presenza())
    expect(totaleOre).toBe(176)
    expect(eventiWarning).toEqual([])
  })

  it("overtime counts toward hours AND raises a warning event", () => {
    const record = presenza({ evento_day_1: "overtime", ore_day_1: 10 })
    const { totaleOre, eventiWarning } = sumPresenzeOre(record)
    expect(totaleOre).toBe(176 - 8 + 10)
    expect(eventiWarning).toEqual(["overtime"])
  })

  it("paidLeave counts toward hours but does NOT raise a warning", () => {
    const record = presenza({ evento_day_1: "paidLeave", ore_day_1: 8 })
    const { totaleOre, eventiWarning } = sumPresenzeOre(record)
    expect(totaleOre).toBe(176)
    expect(eventiWarning).toEqual([])
  })

  it("unpaidLeave/vacation/sickness are excluded from hours but raise warnings", () => {
    const record = presenza({
      evento_day_1: "unpaidLeave",
      evento_day_2: "vacation",
      evento_day_3: "sickness",
    })
    const { totaleOre, eventiWarning } = sumPresenzeOre(record)
    expect(totaleOre).toBe(176 - 8 - 8 - 8)
    expect(eventiWarning.sort()).toEqual(["sickness", "unpaidLeave", "vacation"])
  })
})

describe("comparePaga / compareOre", () => {
  it("comparePaga: within tolerance -> no warning", () => {
    expect(comparePaga(10, 10.005)).toBeNull()
  })

  it("comparePaga: outside tolerance -> Paga oraria warning", () => {
    const warning = comparePaga(10, 12)
    expect(warning).not.toBeNull()
    expect(warning?.category).toBe(WARNING_CATEGORIES.PAGA_ORARIA)
  })

  it("comparePaga: missing value on either side -> skipped (null)", () => {
    expect(comparePaga(null, 10)).toBeNull()
    expect(comparePaga(10, null)).toBeNull()
  })

  it("compareOre: within tolerance -> no warning", () => {
    expect(compareOre(176, 176.3)).toBeNull()
  })

  it("compareOre: outside tolerance -> Ore non coerenti warning", () => {
    const warning = compareOre(176, 150)
    expect(warning).not.toBeNull()
    expect(warning?.category).toBe(WARNING_CATEGORIES.ORE_NON_COERENTI)
  })
})

describe("isBazePay / evaluatePaymentUrlResult", () => {
  it("isBazePay: richiesta_attivazione present -> true", () => {
    expect(isBazePay({ richiestaAttivazioneId: "abc", hasTransazione: false })).toBe(true)
  })

  it("isBazePay: only a linked transazione -> true (KTD6 OR semantics)", () => {
    expect(isBazePay({ richiestaAttivazioneId: null, hasTransazione: true })).toBe(true)
  })

  it("isBazePay: neither signal -> false (Abbonamento)", () => {
    expect(isBazePay({ richiestaAttivazioneId: null, hasTransazione: false })).toBe(false)
  })

  it("evaluatePaymentUrlResult: ok -> no warning", () => {
    expect(
      evaluatePaymentUrlResult({ ok: true, http_status: 200, final_url: "https://pay", reason: null }),
    ).toBeNull()
  })

  it("evaluatePaymentUrlResult: not ok -> Pagamento Stripe warning with readable message", () => {
    const warning = evaluatePaymentUrlResult({
      ok: false,
      http_status: 404,
      final_url: "https://pay",
      reason: "http_404",
    })
    expect(warning).not.toBeNull()
    expect(warning?.category).toBe(WARNING_CATEGORIES.PAGAMENTO_STRIPE)
    expect(warning?.message).toBe("Link di pagamento non trovato (HTTP 404).")
  })

  it("evaluatePaymentUrlResult: missing_payment_link -> readable message", () => {
    const warning = evaluatePaymentUrlResult({
      ok: false,
      http_status: null,
      final_url: null,
      reason: "missing_payment_link",
    })
    expect(warning?.message).toBe("Link di pagamento mancante.")
  })
})

describe("formatPaymentUrlReasonMessage / formatPresenzeEventLabel", () => {
  it("maps every known payment reason code to a readable Italian message", () => {
    expect(formatPaymentUrlReasonMessage("missing_payment_link")).toBe("Link di pagamento mancante.")
    expect(formatPaymentUrlReasonMessage("http_404")).toBe("Link di pagamento non trovato (HTTP 404).")
    expect(formatPaymentUrlReasonMessage("http_410")).toBe(
      "Link di pagamento non più disponibile (HTTP 410).",
    )
    expect(formatPaymentUrlReasonMessage("http_500")).toBe(
      "Link di pagamento non raggiungibile (HTTP 500).",
    )
    expect(formatPaymentUrlReasonMessage("redirect_without_location_302")).toBe(
      "Redirect senza destinazione (HTTP 302).",
    )
    expect(formatPaymentUrlReasonMessage("too_many_redirects")).toBe(
      "Troppi redirect nel link di pagamento.",
    )
    expect(formatPaymentUrlReasonMessage("fetch_error:AbortError")).toBe(
      "Verifica del link di pagamento scaduta per timeout.",
    )
    expect(formatPaymentUrlReasonMessage("fetch_error:DNS failed")).toBe(
      "Errore di rete durante la verifica del link di pagamento (DNS failed).",
    )
    expect(formatPaymentUrlReasonMessage("expired")).toBe("Link di pagamento scaduto.")
    expect(formatPaymentUrlReasonMessage("already_paid")).toBe("Pagamento già effettuato.")
    expect(formatPaymentUrlReasonMessage(null)).toBe(
      "Link di pagamento non valido o non raggiungibile.",
    )
  })

  it("maps presenze event codes to Italian labels", () => {
    expect(formatPresenzeEventLabel("overtime")).toBe("Straordinario")
    expect(formatPresenzeEventLabel("unpaidLeave")).toBe("Permesso non retribuito")
    expect(formatPresenzeEventLabel("vacation")).toBe("Ferie")
    expect(formatPresenzeEventLabel("sickness")).toBe("Malattia")
  })

  it("resolveCedolinoWarningMessage rebuilds from details for legacy stored messages", () => {
    expect(
      resolveCedolinoWarningMessage({
        category: WARNING_CATEGORIES.PAGAMENTO_STRIPE,
        message: "Link di pagamento non valido: missing_payment_link.",
        details: { reason: "missing_payment_link" },
      }),
    ).toBe("Link di pagamento mancante.")

    expect(
      resolveCedolinoWarningMessage({
        category: WARNING_CATEGORIES.EVENTI_PRESENZE,
        message: "Eventi presenza da verificare: overtime, sickness.",
        details: { eventi: ["overtime", "sickness"] },
      }),
    ).toBe("Eventi presenza da verificare: Straordinario, Malattia.")
  })
})

describe("classifyCedolinoChecks", () => {
  it("happy path — all checks ok", () => {
    const result = classifyCedolinoChecks(baseInput())
    expect(result.status).toBe("ok")
    expect(result.warnings).toEqual([])
  })

  it("Abbonamento skips Stripe even if the payment link is bad", () => {
    const result = classifyCedolinoChecks(
      baseInput({
        isBazePayFlag: false,
        paymentUrlResult: { ok: false, http_status: 404, final_url: "https://pay", reason: "http_404" },
      }),
    )
    expect(result.status).toBe("ok")
    expect(result.warnings.some((w) => w.category === WARNING_CATEGORIES.PAGAMENTO_STRIPE)).toBe(false)
  })

  it("Baze Pay with a bad payment link -> Pagamento Stripe warning", () => {
    const result = classifyCedolinoChecks(
      baseInput({
        isBazePayFlag: true,
        paymentUrlResult: { ok: false, http_status: 404, final_url: "https://pay", reason: "http_404" },
      }),
    )
    expect(result.status).toBe("warning")
    expect(result.warnings.some((w) => w.category === WARNING_CATEGORIES.PAGAMENTO_STRIPE)).toBe(true)
  })

  it("overtime -> Eventi warning even when ore still match", () => {
    const record = presenza({ evento_day_1: "overtime", ore_day_1: 8 })
    const result = classifyCedolinoChecks(
      baseInput({ presenze: record, pdfFields: pdfFields({ totale_ore: 176 }) }),
    )
    expect(result.status).toBe("warning")
    const eventiWarning = result.warnings.find((w) => w.category === WARNING_CATEGORIES.EVENTI_PRESENZE)
    expect(eventiWarning).toBeDefined()
    expect(result.warnings.some((w) => w.category === WARNING_CATEGORIES.ORE_NON_COERENTI)).toBe(false)
  })

  it("missing PDF fields -> Cedolino o PDF warning", () => {
    const result = classifyCedolinoChecks(
      baseInput({ pdfFields: pdfFields({ paga_oraria: null, totale_ore: null }) }),
    )
    expect(result.status).toBe("warning")
    expect(result.warnings.some((w) => w.category === WARNING_CATEGORIES.CEDOLINO_O_PDF)).toBe(true)
  })

  it("empty cedolino_url alone (PDF present) -> Cedolino o PDF warning (PRD §6.5)", () => {
    const result = classifyCedolinoChecks(baseInput({ cedolinoUrl: null }))
    expect(result.status).toBe("warning")
    const pdfWarnings = result.warnings.filter((w) => w.category === WARNING_CATEGORIES.CEDOLINO_O_PDF)
    expect(pdfWarnings).toHaveLength(1)
    expect(pdfWarnings[0]?.message).toMatch(/cedolino_url/i)
  })

  it("whitespace-only cedolino_url -> Cedolino o PDF warning", () => {
    const result = classifyCedolinoChecks(baseInput({ cedolinoUrl: "   " }))
    expect(result.status).toBe("warning")
    expect(result.warnings.some((w) => w.category === WARNING_CATEGORIES.CEDOLINO_O_PDF)).toBe(true)
  })

  it("no cedolino attachment alone (URL present) -> Cedolino o PDF warning", () => {
    const result = classifyCedolinoChecks(
      baseInput({
        hasCedolinoAttachment: false,
        cedolinoUrl: "https://example.com/cedolino.pdf",
        pdfExtractOk: false,
        pdfFields: null,
      }),
    )
    expect(result.status).toBe("warning")
    const pdfWarnings = result.warnings.filter((w) => w.category === WARNING_CATEGORIES.CEDOLINO_O_PDF)
    expect(pdfWarnings).toHaveLength(1)
    expect(pdfWarnings[0]?.message).toMatch(/allegato/i)
  })

  it("no attachment and empty cedolino_url -> two independent Cedolino o PDF warnings", () => {
    const result = classifyCedolinoChecks(
      baseInput({
        hasCedolinoAttachment: false,
        cedolinoUrl: null,
        pdfExtractOk: false,
        pdfFields: null,
      }),
    )
    expect(result.status).toBe("warning")
    const pdfWarnings = result.warnings.filter((w) => w.category === WARNING_CATEGORIES.CEDOLINO_O_PDF)
    expect(pdfWarnings).toHaveLength(2)
    expect(pdfWarnings.some((w) => /cedolino_url/i.test(w.message))).toBe(true)
    expect(pdfWarnings.some((w) => /allegato/i.test(w.message))).toBe(true)
  })

  it("PDF extraction failed -> Cedolino o PDF warning", () => {
    const result = classifyCedolinoChecks(baseInput({ pdfExtractOk: false, pdfFields: null }))
    expect(result.status).toBe("warning")
    expect(result.warnings.some((w) => w.category === WARNING_CATEGORIES.CEDOLINO_O_PDF)).toBe(true)
  })

  it("caso_particolare present -> Note/casi particolari warning", () => {
    const result = classifyCedolinoChecks(baseInput({ casoParticolare: "Caso particolare" }))
    expect(result.status).toBe("warning")
    expect(result.warnings.some((w) => w.category === WARNING_CATEGORIES.NOTE_CASI_PARTICOLARI)).toBe(true)
  })

  it("caso_particolare 'no' / regolare -> no Note warning", () => {
    const result = classifyCedolinoChecks(baseInput({ casoParticolare: "no" }))
    expect(result.status).toBe("ok")
    expect(result.warnings.some((w) => w.category === WARNING_CATEGORIES.NOTE_CASI_PARTICOLARI)).toBe(false)
  })

  it("a mismatched paga oraria -> Paga oraria warning", () => {
    const result = classifyCedolinoChecks(baseInput({ rapportoPagaOraria: 8 }))
    expect(result.status).toBe("warning")
    expect(result.warnings.some((w) => w.category === WARNING_CATEGORIES.PAGA_ORARIA)).toBe(true)
  })

  it("multiple failing checks all surface (AND semantics)", () => {
    const record = presenza({ evento_day_1: "sickness" })
    const result = classifyCedolinoChecks(
      baseInput({
        presenze: record,
        rapportoPagaOraria: 999,
        isBazePayFlag: true,
        paymentUrlResult: { ok: false, http_status: 410, final_url: null, reason: "expired" },
      }),
    )
    expect(result.status).toBe("warning")
    const categories = result.warnings.map((w) => w.category).sort()
    expect(categories.includes(WARNING_CATEGORIES.PAGA_ORARIA)).toBe(true)
    expect(categories.includes(WARNING_CATEGORIES.EVENTI_PRESENZE)).toBe(true)
    expect(categories.includes(WARNING_CATEGORIES.PAGAMENTO_STRIPE)).toBe(true)
  })

  it("criticalError short-circuits to status error", () => {
    const result = classifyCedolinoChecks(baseInput({ criticalError: "mesi_lavorativo non trovato" }))
    expect(result.status).toBe("error")
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]?.category).toBe(WARNING_CATEGORIES.ALTRI)
  })
})
