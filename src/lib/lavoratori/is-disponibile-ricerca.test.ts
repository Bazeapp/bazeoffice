import { describe, it, expect } from "vitest"
import { isDisponibileRicerca } from "./is-disponibile-ricerca"

// Fixed "now" used across date-sensitive tests to make math deterministic.
const NOW = new Date("2026-05-25T12:00:00Z")

/**
 * Build a UTC date offset by `days` from NOW's UTC day start.
 * Returns an ISO string suitable for the `data_ritorno_disponibilita` field.
 */
function isoDaysFromNow(days: number): string {
  const base = new Date(
    Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth(), NOW.getUTCDate()),
  )
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString()
}

describe("isDisponibileRicerca — status normalization", () => {
  it("returns true for 'Disponibile'", () => {
    expect(
      isDisponibileRicerca({
        disponibilita: "Disponibile",
        data_ritorno_disponibilita: null,
      }),
    ).toBe(true)
  })

  it("returns true for 'disponibile' (lowercase)", () => {
    expect(
      isDisponibileRicerca({
        disponibilita: "disponibile",
        data_ritorno_disponibilita: null,
      }),
    ).toBe(true)
  })

  it("returns true for 'DISPONIBILE' (uppercase)", () => {
    expect(
      isDisponibileRicerca({
        disponibilita: "DISPONIBILE",
        data_ritorno_disponibilita: null,
      }),
    ).toBe(true)
  })

  it("returns true for '  Disponibile  ' (surrounding whitespace)", () => {
    expect(
      isDisponibileRicerca({
        disponibilita: "  Disponibile  ",
        data_ritorno_disponibilita: null,
      }),
    ).toBe(true)
  })

  it("returns true for 'Disponibile  con  spazi  multipli' (other status, default branch)", () => {
    // Not "disponibile" exactly and not "non disponibile" → default branch returns true.
    expect(
      isDisponibileRicerca({
        disponibilita: "Disponibile  con  spazi  multipli",
        data_ritorno_disponibilita: null,
      }),
    ).toBe(true)
  })
})

describe("isDisponibileRicerca — missing data", () => {
  it("returns true when disponibilita is null", () => {
    expect(
      isDisponibileRicerca({
        disponibilita: null,
        data_ritorno_disponibilita: null,
      }),
    ).toBe(true)
  })

  it("returns true when disponibilita is undefined", () => {
    expect(
      isDisponibileRicerca({
        disponibilita: undefined,
        data_ritorno_disponibilita: null,
      }),
    ).toBe(true)
  })

  it("returns true when disponibilita is an empty string", () => {
    expect(
      isDisponibileRicerca({
        disponibilita: "",
        data_ritorno_disponibilita: null,
      }),
    ).toBe(true)
  })
})

describe("isDisponibileRicerca — 'Non disponibile' with return-date window", () => {
  it("returns false when 'Non disponibile' and no return date", () => {
    expect(
      isDisponibileRicerca(
        {
          disponibilita: "Non disponibile",
          data_ritorno_disponibilita: null,
        },
        NOW,
      ),
    ).toBe(false)
  })

  it("returns true when 'Non disponibile' and return date is today", () => {
    expect(
      isDisponibileRicerca(
        {
          disponibilita: "Non disponibile",
          data_ritorno_disponibilita: isoDaysFromNow(0),
        },
        NOW,
      ),
    ).toBe(true)
  })

  it("returns true when 'Non disponibile' and return date is 7 days away", () => {
    expect(
      isDisponibileRicerca(
        {
          disponibilita: "Non disponibile",
          data_ritorno_disponibilita: isoDaysFromNow(7),
        },
        NOW,
      ),
    ).toBe(true)
  })

  it("returns true when 'Non disponibile' and return date is exactly 14 days away (boundary)", () => {
    expect(
      isDisponibileRicerca(
        {
          disponibilita: "Non disponibile",
          data_ritorno_disponibilita: isoDaysFromNow(14),
        },
        NOW,
      ),
    ).toBe(true)
  })

  it("returns false when 'Non disponibile' and return date is 15 days away (past boundary)", () => {
    expect(
      isDisponibileRicerca(
        {
          disponibilita: "Non disponibile",
          data_ritorno_disponibilita: isoDaysFromNow(15),
        },
        NOW,
      ),
    ).toBe(false)
  })

  it("returns true when 'Non disponibile' and return date is in the past (5 days ago)", () => {
    // Past dates are within (i.e., <=) the threshold window.
    expect(
      isDisponibileRicerca(
        {
          disponibilita: "Non disponibile",
          data_ritorno_disponibilita: isoDaysFromNow(-5),
        },
        NOW,
      ),
    ).toBe(true)
  })

  it("returns false when 'Non disponibile' and return date is an invalid string", () => {
    expect(
      isDisponibileRicerca(
        {
          disponibilita: "Non disponibile",
          data_ritorno_disponibilita: "not-a-date",
        },
        NOW,
      ),
    ).toBe(false)
  })

  it("returns true when 'Non disponibile' and return date is a Date object within the window", () => {
    const dateObj = new Date(isoDaysFromNow(3))
    expect(
      isDisponibileRicerca(
        {
          disponibilita: "Non disponibile",
          data_ritorno_disponibilita: dateObj,
        },
        NOW,
      ),
    ).toBe(true)
  })

  it("normalizes 'NON  DISPONIBILE' (uppercase + extra spaces) to the non-disponibile branch", () => {
    // Without a return date the non-disponibile branch returns false; this
    // doubles as a guard that case + whitespace normalization is applied.
    expect(
      isDisponibileRicerca(
        {
          disponibilita: "NON  DISPONIBILE",
          data_ritorno_disponibilita: null,
        },
        NOW,
      ),
    ).toBe(false)
  })
})

describe("isDisponibileRicerca — other statuses fall through to true", () => {
  it("returns true for 'In ferie'", () => {
    expect(
      isDisponibileRicerca({
        disponibilita: "In ferie",
        data_ritorno_disponibilita: null,
      }),
    ).toBe(true)
  })

  it("returns true for 'Bloccato'", () => {
    expect(
      isDisponibileRicerca({
        disponibilita: "Bloccato",
        data_ritorno_disponibilita: null,
      }),
    ).toBe(true)
  })
})

describe("isDisponibileRicerca — deterministic `now` injection", () => {
  it("uses the injected `now` to compute the 14-day window", () => {
    // With NOW = 2026-05-25, a return date of 2026-06-08 is exactly +14 days (UTC).
    expect(
      isDisponibileRicerca(
        {
          disponibilita: "Non disponibile",
          data_ritorno_disponibilita: "2026-06-08T00:00:00Z",
        },
        NOW,
      ),
    ).toBe(true)

    // 2026-06-09 is +15 days → outside window.
    expect(
      isDisponibileRicerca(
        {
          disponibilita: "Non disponibile",
          data_ritorno_disponibilita: "2026-06-09T00:00:00Z",
        },
        NOW,
      ),
    ).toBe(false)
  })
})
