import { describe, expect, it } from "vitest"

import { onboardingDecisioneLavoroFormSchema } from "../onboarding-schemas"
import {
  newWorkerExperienceFormSchema,
  newWorkerReferenceFormSchema,
} from "@/modules/lavoratori/lib/worker-creation-schemas"

describe("onboardingDecisioneLavoroFormSchema — cross-field eta", () => {
  it("rejects eta_minima greater than eta_massima", () => {
    const result = onboardingDecisioneLavoroFormSchema.safeParse({
      nucleo_famigliare: "",
      descrizione_casa: "",
      metratura_casa: "",
      descrizione_animali_in_casa: "",
      mansioni_richieste: "",
      informazioni_extra_riservate: "",
      descrizione_richiesta_trasferte: "",
      descrizione_richiesta_ferie: "",
      eta_minima: "50",
      eta_massima: "30",
      sesso: "",
      patenteDettaglio: "",
      nazionalita_escluse: [],
      nazionalita_obbligatorie: [],
      richiesta_trasferte: false,
      richiesta_ferie: false,
      richiesta_patente: false,
      presenza_neonati: false,
      piu_bambini: false,
      famiglia_4_persone: false,
      cani_piccoli: false,
      cani_grandi: false,
      gatti: false,
      pulire_ripiani_alti: false,
      stirare: false,
      stirare_abiti_difficili: false,
      cucinare: false,
      cucinare_elaborato: false,
      cura_piante: false,
      comunicare_bene_italiano: false,
      comunicare_bene_inglese: false,
      famiglia_molto_esigente: false,
      richiesta_autonomia: false,
      datore_spesso_presente: false,
      richiesta_discrezione: false,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("eta_massima"))).toBe(
        true,
      )
    }
  })
})

describe("newWorkerReferenceFormSchema", () => {
  it("requires telefono and at least one identity field", () => {
    const result = newWorkerReferenceFormSchema.safeParse({
      nome_datore: "",
      cognome_datore: "",
      telefono_datore: "",
    })

    expect(result.success).toBe(false)
  })
})

describe("newWorkerExperienceFormSchema", () => {
  it("rejects data_fine before data_inizio when rapporto is not active", () => {
    const result = newWorkerExperienceFormSchema.safeParse({
      tipo_lavoro: [],
      tipo_rapporto: "",
      data_inizio: "2024-06-01",
      data_fine: "2024-01-01",
      stato_esperienza_attiva: false,
      descrizione: "",
      descrizione_contesto_lavorativo: "",
      motivazione_fine_rapporto: "",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("data_fine"))).toBe(true)
    }
  })
})
