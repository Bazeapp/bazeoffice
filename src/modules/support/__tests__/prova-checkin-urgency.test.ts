import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  getCheckinDaysLabel,
  getCheckinDaysRemaining,
  getCheckinUrgency,
} from "../lib/colloqui-calendar-utils"
import { isProvaCheckinColumn } from "../lib/prove-colloqui-data.utils"

describe("check-in prova: giorni mancanti", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-08-13T09:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("conta i giorni che mancano al check-in", () => {
    expect(getCheckinDaysRemaining("2026-08-13")).toBe(0)
    expect(getCheckinDaysRemaining("2026-08-14")).toBe(1)
    expect(getCheckinDaysRemaining("2026-08-27")).toBe(14)
  })

  it("restituisce valori negativi per un check-in già passato", () => {
    expect(getCheckinDaysRemaining("2026-08-10")).toBe(-3)
  })

  it("gestisce date assenti o non valide", () => {
    expect(getCheckinDaysRemaining(null)).toBeNull()
    expect(getCheckinDaysRemaining("")).toBeNull()
    expect(getCheckinDaysRemaining("non-una-data")).toBeNull()
  })
})

describe("check-in prova: urgenza", () => {
  it("segna urgente da 3 giorni in giù", () => {
    expect(getCheckinUrgency(3)).toBe("urgent")
    expect(getCheckinUrgency(0)).toBe("urgent")
  })

  it("segna in ritardo i check-in passati", () => {
    expect(getCheckinUrgency(-1)).toBe("overdue")
  })

  it("segna in avvicinamento fra 4 e 7 giorni", () => {
    expect(getCheckinUrgency(4)).toBe("soon")
    expect(getCheckinUrgency(7)).toBe("soon")
  })

  it("resta neutro oltre i 7 giorni e senza data", () => {
    expect(getCheckinUrgency(8)).toBe("normal")
    expect(getCheckinUrgency(null)).toBe("normal")
  })
})

describe("check-in prova: etichetta", () => {
  it("usa parole per oggi e domani", () => {
    expect(getCheckinDaysLabel(0)).toBe("oggi")
    expect(getCheckinDaysLabel(1)).toBe("domani")
  })

  it("indica il ritardo al singolare e al plurale", () => {
    expect(getCheckinDaysLabel(-1)).toBe("in ritardo di 1 giorno")
    expect(getCheckinDaysLabel(-4)).toBe("in ritardo di 4 giorni")
  })

  it("conta i giorni futuri", () => {
    expect(getCheckinDaysLabel(5)).toBe("tra 5 giorni")
  })
})

describe("colonna Check-in programmato", () => {
  it("riconosce la colonna a prescindere da maiuscole e trattini", () => {
    expect(isProvaCheckinColumn({ id: "Check-in programmato", label: "Check-in programmato" })).toBe(
      true,
    )
    expect(isProvaCheckinColumn({ id: "check in programmato", label: "Altro" })).toBe(true)
  })

  it("non tocca le altre colonne", () => {
    expect(isProvaCheckinColumn({ id: "Prova in corso oggi", label: "Prova in corso oggi" })).toBe(
      false,
    )
    expect(isProvaCheckinColumn({ id: "Chiamare famiglia — D2", label: "Chiamare famiglia — D2" })).toBe(
      false,
    )
  })
})
