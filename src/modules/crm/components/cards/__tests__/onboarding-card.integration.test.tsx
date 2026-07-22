import { act, fireEvent, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/test-utils"
import type { CrmPipelineCardData } from "../../../types"
import { onboardingCardFormSchema } from "../../../lib/onboarding-schemas"
import { OnboardingCard } from "../onboarding-card"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}))

vi.mock("@/hooks/use-provincie", () => ({
  useProvincie: () => ({
    data: [{ sigla: "MI", nome: "Milano" }],
    isLoading: false,
  }),
}))

vi.mock("@/lib/supabase-edge", () => ({
  invokeEdgeFunction: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock("@/lib/record-crud", () => ({
  updateRecord: vi.fn().mockResolvedValue({ ok: true }),
}))

function makeOnboardingCard(
  overrides: Partial<CrmPipelineCardData> = {},
): CrmPipelineCardData {
  return {
    id: "process-1",
    famigliaId: "fam-1",
    numeroRicercaAttivata: "42",
    stage: "onboarding",
    nomeFamiglia: "Famiglia Rossi",
    email: "famiglia@example.com",
    telefono: "02123456",
    dataLead: "01/01/2026",
    tipoLavoroBadge: "Colf",
    tipoLavoroColor: "blue",
    tipoRapportoBadge: null,
    tipoRapportoColor: null,
    statoRes: "attivo",
    qualificazioneLead: "",
    motivoNoMatch: "",
    modelloSmartmatching: "",
    oreSettimana: "20",
    giorniSettimana: "4",
    giornatePreferite: ["Lunedì"],
    salesColdCallFollowup: "",
    salesNoShowFollowup: "",
    motivazioneLost: "",
    motivazioneOot: "",
    appuntiChiamataSales: "",
    dataPerRicercaFutura: "",
    dataCallPrenotata: "",
    dataLeadRaw: null,
    dataPerRicercaFuturaRaw: null,
    dataCallPrenotataRaw: null,
    tentativiChiamataCount: 0,
    preventivoAccettato: true,
    richiestaAttivazioneId: null,
    preventivoUrl: null,
    preventivoTitolo: null,
    preventivoSessionId: null,
    preventivoAcceptanceUrl: "",
    feeConcordata: null,
    origineUrl: null,
    scontoApplicatoRaw: null,
    scontoApplicato: "",
    orarioDiLavoro: "9-18",
    nucleoFamigliare: "",
    descrizioneCasa: "",
    metraturaCasa: "",
    descrizioneAnimaliInCasa: "",
    mansioniRichieste: "",
    informazioniExtraRiservate: "",
    etaMinima: "",
    etaMassima: "",
    indirizzoProvincia: "",
    indirizzoProvinciaSigla: "",
    indirizzoCap: "",
    indirizzoNote: "",
    indirizzoId: null,
    indirizzoCompleto: "",
    indirizzoVia: "",
    indirizzoCivico: "",
    indirizzoComune: "",
    indirizzoCitofono: "",
    srcEmbedMapsAnnucio: "",
    deadlineMobile: "",
    disponibilitaColloquiInPresenza: "",
    tipoIncontroFamigliaLavoratore: "",
    richiestaPatente: false,
    richiestaTrasferte: false,
    richiestaFerie: false,
    descrizioneRichiestaTrasferte: "",
    descrizioneRichiestaFerie: "",
    patenteDettaglio: "",
    sesso: null,
    nazionalitaEscluse: [],
    nazionalitaObbligatorie: [],
    famigliaMoltoEsigente: false,
    richiestaAutonomia: false,
    datoreSpessoPresente: false,
    richiestaDiscrezione: false,
    comunicareBeneItaliano: false,
    comunicareBeneInglese: false,
    presenzaNeonati: false,
    piuBambini: false,
    famiglia4Persone: false,
    caniPiccoli: false,
    caniGrandi: false,
    gatti: false,
    pulireRipianiAlti: false,
    stirare: false,
    stirareAbitiDifficili: false,
    cucinare: false,
    cucinareElaborato: false,
    curaPiante: false,
    testoAnnuncioWhatsapp: "",
    ...overrides,
  }
}

describe("onboardingCardFormSchema", () => {
  it("accepts the onboarding card default field shape", () => {
    const parsed = onboardingCardFormSchema.parse({
      orario_di_lavoro: "9-18",
      ore_settimanale: "20",
      numero_giorni_settimanali: "4",
      preferenza_giorno: ["Lunedì"],
      provincia_sigla: "",
      cap: "",
      via: "",
      note: "",
      src_embed_maps_annucio: "",
      deadline_mobile: "",
      disponibilita_colloqui_in_presenza: "",
      tipo_incontro_famiglia_lavoratore: "",
      fee_concordata: "",
      offerta: "",
    })

    expect(parsed.orario_di_lavoro).toBe("9-18")
  })
})

describe("OnboardingCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("autosaves orario_di_lavoro via onPatchProcess with the process patch", async () => {
    const onPatchProcess = vi.fn().mockResolvedValue(undefined)
    const card = makeOnboardingCard({ orarioDiLavoro: "9-13" })

    const { getByPlaceholderText } = renderWithProviders(
      <OnboardingCard
        card={card}
        flattenSections
        showLuogoLavoro={false}
        showFamiglia={false}
        showCasa={false}
        showAnimali={false}
        showMansioni={false}
        showRichiesteSpecifiche={false}
        showTempistiche={false}
        onPatchProcess={onPatchProcess}
      />,
    )

    const input = getByPlaceholderText("da lunedì a venerdì, dalle 9:00 alle 19:00")
    await act(async () => {
      fireEvent.change(input, { target: { value: "10-18 lun-ven" } })
    })

    await waitFor(
      () => {
        expect(onPatchProcess).toHaveBeenCalledWith("process-1", {
          orario_di_lavoro: "10-18 lun-ven",
        })
      },
      { timeout: 3000 },
    )
  })
})
