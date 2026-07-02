import { describe, expect, it } from "vitest"

import {
  AUTOMUNITI_FILTER_OPTIONS,
  AUTOMUNITO_TRANSPORT_LABEL,
  ETA_FILTER_BUCKETS,
  GENERE_FILTER_OPTIONS,
  createDefaultAdvancedFilters,
  deriveAutomuniti,
  deriveEtaBucket,
  deriveGenere,
  deriveNazionalitaOptions,
  hasActiveAdvancedFilters,
  matchesAutomuniti,
  matchesEta,
  matchesGenere,
  matchesNazionalita,
  workerMatchesAdvancedFilters,
  type MapAdvancedFilters,
  type MapFilterableWorker,
} from "./ricerca-workers-map-filters"

function makeWorker(overrides: Partial<MapFilterableWorker> = {}): MapFilterableWorker {
  return {
    sesso: "Donna",
    nazionalita: "Italiana",
    comeTiSposti: [AUTOMUNITO_TRANSPORT_LABEL],
    eta: 35,
    ...overrides,
  }
}

/** Filtri di default con le sostituzioni indicate. */
function filtersWith(overrides: Partial<MapAdvancedFilters> = {}): MapAdvancedFilters {
  return { ...createDefaultAdvancedFilters(), ...overrides }
}

describe("createDefaultAdvancedFilters", () => {
  it("seleziona tutti i chip e nessuna nazionalità", () => {
    const filters = createDefaultAdvancedFilters()
    expect([...filters.genere].sort()).toEqual([...GENERE_FILTER_OPTIONS].sort())
    expect([...filters.automuniti].sort()).toEqual([...AUTOMUNITI_FILTER_OPTIONS].sort())
    expect(filters.eta).toEqual(ETA_FILTER_BUCKETS.map((b) => b.key))
    expect(filters.nazionalita).toEqual([])
  })
})

describe("deriveEtaBucket — confini delle fasce", () => {
  it("mappa le età nei bucket corretti (inclusi i confini)", () => {
    expect(deriveEtaBucket(18)).toBe("18-29")
    expect(deriveEtaBucket(29)).toBe("18-29")
    expect(deriveEtaBucket(30)).toBe("30-39")
    expect(deriveEtaBucket(39)).toBe("30-39")
    expect(deriveEtaBucket(40)).toBe("40-49")
    expect(deriveEtaBucket(49)).toBe("40-49")
    expect(deriveEtaBucket(50)).toBe("50-59")
    expect(deriveEtaBucket(59)).toBe("50-59")
    expect(deriveEtaBucket(60)).toBe("60+")
    expect(deriveEtaBucket(85)).toBe("60+")
  })

  it("restituisce null per età mancante o sotto la prima fascia (pass-through)", () => {
    expect(deriveEtaBucket(null)).toBeNull()
    expect(deriveEtaBucket(undefined)).toBeNull()
    expect(deriveEtaBucket(16)).toBeNull()
    expect(deriveEtaBucket(Number.NaN)).toBeNull()
  })
})

describe("deriveAutomuniti", () => {
  it("è automunito solo se ha la patente e la macchina", () => {
    expect(deriveAutomuniti([AUTOMUNITO_TRANSPORT_LABEL])).toBe("Automunito")
    expect(deriveAutomuniti(["Mi sposto con i mezzi"])).toBe("Non automunito")
    expect(
      deriveAutomuniti([AUTOMUNITO_TRANSPORT_LABEL, "Mi sposto con i mezzi"])
    ).toBe("Automunito")
  })

  it("restituisce null se come_ti_sposti manca/è vuoto (pass-through)", () => {
    expect(deriveAutomuniti(undefined)).toBeNull()
    expect(deriveAutomuniti(null)).toBeNull()
    expect(deriveAutomuniti([])).toBeNull()
  })
})

describe("deriveGenere", () => {
  it("canonizza case-insensitive, altrimenti null", () => {
    expect(deriveGenere("Donna")).toBe("Donna")
    expect(deriveGenere("uomo")).toBe("Uomo")
    expect(deriveGenere("  DONNA ")).toBe("Donna")
    expect(deriveGenere("Preferisco non dire")).toBeNull()
    expect(deriveGenere(null)).toBeNull()
    expect(deriveGenere("")).toBeNull()
  })
})

describe("matchesGenere — pass-through", () => {
  it("nasconde solo il genere deselezionato tra Donna/Uomo", () => {
    const soloDonna = ["Donna"]
    expect(matchesGenere(makeWorker({ sesso: "Donna" }), soloDonna)).toBe(true)
    expect(matchesGenere(makeWorker({ sesso: "Uomo" }), soloDonna)).toBe(false)
  })

  it("lascia passare 'Preferisco non dire' e null sotto qualsiasi selezione", () => {
    const soloDonna = ["Donna"]
    expect(matchesGenere(makeWorker({ sesso: "Preferisco non dire" }), soloDonna)).toBe(true)
    expect(matchesGenere(makeWorker({ sesso: null }), soloDonna)).toBe(true)
  })

  it("selezione vuota non pone vincoli", () => {
    expect(matchesGenere(makeWorker({ sesso: "Uomo" }), [])).toBe(true)
  })
})

describe("matchesAutomuniti — pass-through", () => {
  it("filtra per automunito derivato", () => {
    const soloAutomuniti = ["Automunito"]
    expect(
      matchesAutomuniti(makeWorker({ comeTiSposti: [AUTOMUNITO_TRANSPORT_LABEL] }), soloAutomuniti)
    ).toBe(true)
    expect(
      matchesAutomuniti(makeWorker({ comeTiSposti: ["Mi sposto con i mezzi"] }), soloAutomuniti)
    ).toBe(false)
  })

  it("lascia passare chi non ha come_ti_sposti", () => {
    expect(matchesAutomuniti(makeWorker({ comeTiSposti: [] }), ["Automunito"])).toBe(true)
    expect(matchesAutomuniti(makeWorker({ comeTiSposti: undefined }), ["Automunito"])).toBe(true)
  })
})

describe("matchesEta — pass-through", () => {
  it("filtra per fascia d'età", () => {
    const solo18_29 = ["18-29"]
    expect(matchesEta(makeWorker({ eta: 25 }), solo18_29)).toBe(true)
    expect(matchesEta(makeWorker({ eta: 45 }), solo18_29)).toBe(false)
  })

  it("lascia passare età mancante o fuori fascia", () => {
    expect(matchesEta(makeWorker({ eta: null }), ["18-29"])).toBe(true)
    expect(matchesEta(makeWorker({ eta: 16 }), ["18-29"])).toBe(true)
  })
})

describe("matchesNazionalita — selezione attiva esclude gli sconosciuti", () => {
  it("selezione vuota passa tutti (inclusi i null)", () => {
    expect(matchesNazionalita(makeWorker({ nazionalita: "Romania" }), [])).toBe(true)
    expect(matchesNazionalita(makeWorker({ nazionalita: null }), [])).toBe(true)
  })

  it("con selezione attiva passa solo la nazionalità scelta; null escluso", () => {
    const soloItaliana = ["Italiana"]
    expect(matchesNazionalita(makeWorker({ nazionalita: "Italiana" }), soloItaliana)).toBe(true)
    expect(matchesNazionalita(makeWorker({ nazionalita: "Romania" }), soloItaliana)).toBe(false)
    expect(matchesNazionalita(makeWorker({ nazionalita: null }), soloItaliana)).toBe(false)
  })

  it("combacia ignorando gli spazi attorno alla nazionalità del lavoratore", () => {
    expect(matchesNazionalita(makeWorker({ nazionalita: "Italiana " }), ["Italiana"])).toBe(true)
    expect(matchesNazionalita(makeWorker({ nazionalita: "  " }), ["Italiana"])).toBe(false)
  })
})

describe("workerMatchesAdvancedFilters — AND tra gruppi", () => {
  it("con i filtri di default mostra qualsiasi lavoratore", () => {
    const filters = createDefaultAdvancedFilters()
    const workers = [
      makeWorker(),
      makeWorker({ sesso: "Uomo", eta: 62, comeTiSposti: ["Mi sposto con i mezzi"] }),
      makeWorker({ sesso: "Preferisco non dire", eta: null, comeTiSposti: [], nazionalita: null }),
    ]
    for (const worker of workers) {
      expect(workerMatchesAdvancedFilters(worker, filters)).toBe(true)
    }
  })

  it("esclude il lavoratore se fallisce anche un solo gruppo", () => {
    const worker = makeWorker({ sesso: "Uomo", eta: 25, comeTiSposti: [AUTOMUNITO_TRANSPORT_LABEL] })
    // tutto coerente tranne il genere (chiedo solo Donna) → escluso
    expect(workerMatchesAdvancedFilters(worker, filtersWith({ genere: ["Donna"] }))).toBe(false)
    // tutti i gruppi coerenti → incluso
    expect(
      workerMatchesAdvancedFilters(
        worker,
        filtersWith({ genere: ["Uomo"], eta: ["18-29"], automuniti: ["Automunito"] })
      )
    ).toBe(true)
  })
})

describe("hasActiveAdvancedFilters", () => {
  it("è false al default", () => {
    expect(hasActiveAdvancedFilters(createDefaultAdvancedFilters())).toBe(false)
  })

  it("è true quando un chip è deselezionato o una nazionalità è selezionata", () => {
    expect(hasActiveAdvancedFilters(filtersWith({ genere: ["Donna"] }))).toBe(true)
    expect(hasActiveAdvancedFilters(filtersWith({ eta: ["18-29", "30-39"] }))).toBe(true)
    expect(hasActiveAdvancedFilters(filtersWith({ nazionalita: ["Italiana"] }))).toBe(true)
  })

  it("è true quando un gruppo chip è completamente deselezionato", () => {
    expect(hasActiveAdvancedFilters(filtersWith({ genere: [] }))).toBe(true)
    expect(hasActiveAdvancedFilters(filtersWith({ automuniti: [] }))).toBe(true)
    expect(hasActiveAdvancedFilters(filtersWith({ eta: [] }))).toBe(true)
  })
})

describe("deriveNazionalitaOptions", () => {
  it("deduplica, scarta i vuoti/null e ordina", () => {
    const workers = [
      makeWorker({ nazionalita: "Romania" }),
      makeWorker({ nazionalita: "Italiana" }),
      makeWorker({ nazionalita: "Perù" }),
      makeWorker({ nazionalita: "Romania" }),
      makeWorker({ nazionalita: "  " }),
      makeWorker({ nazionalita: null }),
    ]
    expect(deriveNazionalitaOptions(workers)).toEqual(["Italiana", "Perù", "Romania"])
  })

  it("input vuoto → []", () => {
    expect(deriveNazionalitaOptions([])).toEqual([])
  })
})
