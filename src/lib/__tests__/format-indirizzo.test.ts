import { describe, expect, it } from "vitest"

import { formatIndirizzo } from "@/lib/format-indirizzo"

describe("formatIndirizzo", () => {
  it("composes a full address from indirizzi parts", () => {
    expect(
      formatIndirizzo({
        citofono: "Rossi",
        via: "Via Roma",
        civico: "12",
        citta: "Milano",
        cap: "20100",
        provincia_sigla: "MI",
        paese: "Italia",
      }),
    ).toBe("Cit. Rossi, Via Roma 12, 20100 Milano (MI), Italia")
  })

  it("skips missing parts without reading indirizzo_formattato", () => {
    expect(
      formatIndirizzo({
        via: "Via Torino",
        civico: null,
        citta: "Torino",
        cap: "",
        provincia_sigla: "TO",
        indirizzo_formattato: "SHOULD_NOT_USE",
      } as Record<string, unknown>),
    ).toBe("Via Torino, Torino (TO)")
  })

  it("returns null for empty address", () => {
    expect(formatIndirizzo({})).toBeNull()
    expect(formatIndirizzo(null)).toBeNull()
  })

  it("supports street-only style", () => {
    expect(
      formatIndirizzo(
        { via: "Via Roma", civico: "1", citta: "Milano" },
        { style: "street" },
      ),
    ).toBe("Via Roma 1")
  })

  it("supports compact style with note fallback", () => {
    expect(
      formatIndirizzo(
        { note: "Isola - dettaglio", citta: "Milano", cap: "20154" },
        { style: "compact", fallbackNote: true },
      ),
    ).toBe("Isola • Milano • 20154")
  })
})
