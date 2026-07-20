import { describe, expect, it } from "vitest"

import { resolveCommentStack } from "../resolve-comment-stack"
import {
  assunzioneCommentRow,
  candidaturaCommentRow,
  cedolinoCommentRow,
  chiusuraCommentRow,
  contributiCommentRow,
  crmProcessoDisplayNames,
  formatRicercaDisplayName,
  rapportoCommentRow,
  PENDING_ASSUNZIONE_SECTION_ID,
  resolveAssunzioneCommentFocusId,
  resolveAssunzioniBoardCommentPageFocus,
  resolveAssunzioniBoardCommentStack,
  variazioneCommentRow,
} from "../comment-route-helpers"
import type { EntityRef } from "../../types/entity"
import type { RapportoLavorativoRecord } from "@/types"

const IDS = {
  famiglia: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  lavoratore: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  ricerca: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  candidatura: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  rapporto: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  assunzione: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  chiusura: "22222222-2222-4222-8222-222222222222",
} as const

function focus(entityType: EntityRef["entityType"], entityId: string): EntityRef {
  return { entityType, entityId }
}

function minimalRapportoRecord(
  overrides: Pick<
    RapportoLavorativoRecord,
    "id" | "famiglia_id" | "lavoratore_id" | "processi_matching_id"
  > &
    Partial<RapportoLavorativoRecord>,
): RapportoLavorativoRecord {
  return {
    id_rapporto: null,
    accordo_di_lavoro_allegati: null,
    codice_datore_webcolf: null,
    codice_dipendente_webcolf: null,
    cognome_nome_datore_proper: null,
    creata: null,
    data_inizio_rapporto: null,
    dichiarazione_ospitalita_allegati: null,
    distribuzione_ore_settimana: null,
    fine_rapporto_lavorativo_id: null,
    nome_lavoratore_per_url: null,
    ore_a_settimana: null,
    paga_mensile_lorda: null,
    paga_oraria_lorda: null,
    assunzione_datore_id: null,
    assunzione_lavoratore_id: null,
    processo_res: null,
    prova_data_checkin: null,
    prova_feedback_famiglia: null,
    prova_feedback_lavoratore: null,
    prova_note_cs_famiglia: null,
    prova_note_cs_lavoratore: null,
    prova_priorita_famiglia: null,
    prova_ramo_d2: null,
    ...overrides,
  } as RapportoLavorativoRecord
}

function entitySectionKinds(result: ReturnType<typeof resolveCommentStack>) {
  return result.sections
    .filter((section) => section.kind !== "descendants")
    .map((section) => section.entityRef?.entityType)
}

describe("comment-route-helpers", () => {
  it("prefers family name over ricerca number for display labels", () => {
    expect(
      formatRicercaDisplayName({
        nomeFamiglia: "Famiglia Rossi",
        numeroRicercaAttivata: "1",
      }),
    ).toBe("Famiglia Rossi")

    const names = crmProcessoDisplayNames({
      id: IDS.ricerca,
      famigliaId: IDS.famiglia,
      nomeFamiglia: "Famiglia Rossi",
      numeroRicercaAttivata: "1",
    })

    expect(names[`ricerca:${IDS.ricerca}`]).toBe("Famiglia Rossi")
  })

  it("builds candidatura rows compatible with resolveCommentStack", () => {
    const row = candidaturaCommentRow({
      selectionId: IDS.candidatura,
      processId: IDS.ricerca,
      famigliaId: IDS.famiglia,
      lavoratoreId: IDS.lavoratore,
    })

    const stack = resolveCommentStack({
      focus: focus("candidatura", IDS.candidatura),
      row,
      displayNames: {},
    })

    expect(entitySectionKinds(stack)).toEqual([
      "candidatura",
      "lavoratore",
      "ricerca",
      "famiglia",
    ])
  })

  it("builds rapporto rows with nested rapporto chain", () => {
    const row = rapportoCommentRow(
      IDS.rapporto,
      minimalRapportoRecord({
        id: IDS.rapporto,
        famiglia_id: IDS.famiglia,
        lavoratore_id: IDS.lavoratore,
        processi_matching_id: IDS.ricerca,
        id_rapporto: "RAP-001",
      }),
    )

    const stack = resolveCommentStack({
      focus: focus("rapporto", IDS.rapporto),
      row,
      displayNames: {},
    })

    expect(entitySectionKinds(stack)).toEqual([
      "rapporto",
      "lavoratore",
      "ricerca",
      "famiglia",
    ])
  })

  it("resolves assunzione comment focus from lavoratore assunzione, never rapporto card id", () => {
    const lavoratoreOnly = {
      assunzione: null,
      lavoratoreAssunzione: { id: IDS.assunzione } as never,
      rapporto: null,
    }
    expect(resolveAssunzioneCommentFocusId(lavoratoreOnly)).toBe(IDS.assunzione)
    expect(
      resolveAssunzioneCommentFocusId({
        assunzione: null,
        lavoratoreAssunzione: null,
        rapporto: null,
      }),
    ).toBeNull()
    expect(
      resolveAssunzioneCommentFocusId({
        assunzione: null,
        lavoratoreAssunzione: null,
        rapporto: minimalRapportoRecord({
          id: IDS.rapporto,
          famiglia_id: IDS.famiglia,
          lavoratore_id: IDS.lavoratore,
          processi_matching_id: IDS.ricerca,
          assunzione_lavoratore_id: IDS.assunzione,
        }),
      }),
    ).toBe(IDS.assunzione)
  })

  it("falls back to rapporto page focus on Assunzioni cards without an assunzione", () => {
    const card = {
      id: IDS.rapporto,
      processId: null,
      stage: "stage",
      process: null,
      assunzione: null,
      lavoratoreAssunzione: null,
      richiestaAttivazione: null,
      rapporto: minimalRapportoRecord({
        id: IDS.rapporto,
        famiglia_id: IDS.famiglia,
        lavoratore_id: IDS.lavoratore,
        processi_matching_id: null,
      }),
      lavoratore: null,
      famiglia: null,
      famigliaId: IDS.famiglia,
      nomeFamiglia: "Famiglia Rossi",
      nomeLavoratore: "Luigi Bianchi",
      email: "",
      telefono: "",
      titoloAnnuncio: null,
      tipoRapporto: null,
      deadline: "",
    }

    expect(resolveAssunzioniBoardCommentPageFocus(card)).toEqual({
      entityType: "rapporto",
      entityId: IDS.rapporto,
    })
    expect(
      resolveAssunzioniBoardCommentPageFocus({
        ...card,
        lavoratoreAssunzione: { id: IDS.assunzione } as never,
      }),
    ).toEqual({
      entityType: "assunzione",
      entityId: IDS.assunzione,
    })
  })

  it("prepends pending ASSUNZIONE and keeps RAPPORTO when no assunzione row", () => {
    const pageFocus = { entityType: "rapporto" as const, entityId: IDS.rapporto }
    const stack = resolveAssunzioniBoardCommentStack({
      pageFocus,
      row: rapportoCommentRow(
        IDS.rapporto,
        minimalRapportoRecord({
          id: IDS.rapporto,
          famiglia_id: IDS.famiglia,
          lavoratore_id: IDS.lavoratore,
          processi_matching_id: null,
        }),
      ),
      displayNames: {
        [`rapporto:${IDS.rapporto}`]: "Luigi Bianchi",
      },
    })

    expect(stack.sections[0]).toMatchObject({
      id: PENDING_ASSUNZIONE_SECTION_ID,
      kind: "focus",
      typeLabel: "ASSUNZIONE",
      entityRef: null,
      displayName: "Luigi Bianchi",
    })
    expect(
      stack.sections
        .filter((section) => section.kind !== "descendants")
        .map((section) => section.typeLabel),
    ).toEqual(["ASSUNZIONE", "RAPPORTO", "LAVORATORE", "FAMIGLIA"])
    expect(stack.sections[1]).toMatchObject({
      kind: "ancestor",
      typeLabel: "RAPPORTO",
      entityRef: pageFocus,
    })
  })

  it("includes RICERCA from card.processId when rapporto FK is null (Assunzioni board)", () => {
    // Board RPC often attaches `process` even when rapporti.processi_matching_id is null.
    const card = {
      id: IDS.rapporto,
      processId: IDS.ricerca,
      stage: "stage",
      process: null,
      assunzione: null,
      lavoratoreAssunzione: null,
      richiestaAttivazione: null,
      rapporto: minimalRapportoRecord({
        id: IDS.rapporto,
        famiglia_id: IDS.famiglia,
        lavoratore_id: IDS.lavoratore,
        processi_matching_id: null,
      }),
      lavoratore: { id: IDS.lavoratore } as never,
      famiglia: null,
      famigliaId: IDS.famiglia,
      nomeFamiglia: "Famiglia Rossi",
      nomeLavoratore: "Luigi Bianchi",
      email: "",
      telefono: "",
      titoloAnnuncio: "Badante Milano",
      tipoRapporto: null,
      deadline: "",
    }

    const row = assunzioneCommentRow(card)
    expect(row.processi_matching_id).toBe(IDS.ricerca)
    expect(
      (row.rapporto as { processi_matching_id: string | null }).processi_matching_id,
    ).toBe(IDS.ricerca)

    const pageFocus = resolveAssunzioniBoardCommentPageFocus(card)!
    expect(pageFocus.entityType).toBe("rapporto")

    const stack = resolveAssunzioniBoardCommentStack({
      pageFocus,
      row,
      displayNames: {
        [`rapporto:${IDS.rapporto}`]: "Luigi Bianchi",
        [`ricerca:${IDS.ricerca}`]: "Famiglia Rossi",
      },
    })

    expect(
      stack.sections
        .filter((section) => section.kind !== "descendants")
        .map((section) => section.typeLabel),
    ).toEqual(["ASSUNZIONE", "RAPPORTO", "LAVORATORE", "RICERCA", "FAMIGLIA"])
  })

  it("keeps real assunzione focus with separate RAPPORTO ancestor", () => {
    const pageFocus = { entityType: "assunzione" as const, entityId: IDS.assunzione }
    const stack = resolveAssunzioniBoardCommentStack({
      pageFocus,
      row: {
        id: IDS.assunzione,
        rapporto_lavorativo_id: IDS.rapporto,
        rapporto: {
          id: IDS.rapporto,
          lavoratore_id: IDS.lavoratore,
          famiglia_id: IDS.famiglia,
          processi_matching_id: IDS.ricerca,
        },
      },
    })

    expect(stack.sections[0]).toMatchObject({
      kind: "focus",
      typeLabel: "ASSUNZIONE",
      entityRef: pageFocus,
    })
    expect(
      stack.sections
        .filter((section) => section.kind !== "descendants")
        .map((section) => section.entityRef?.entityType),
    ).toEqual(["assunzione", "rapporto", "lavoratore", "ricerca", "famiglia"])
  })

  it("builds assunzione rows with rapporto_lavorativo_id", () => {
    const row = assunzioneCommentRow({
      id: IDS.rapporto,
      processId: IDS.ricerca,
      stage: "stage",
      process: null,
      assunzione: {
        id: IDS.assunzione,
        famiglia_id: IDS.famiglia,
        lavoratore_id: IDS.lavoratore,
        delega_inps_allegati: null,
        civico_se_diverso_residenza: null,
        codice_fiscale_allegati: null,
        comune_se_diverso_residenza: null,
        dati_bancari_lavoratore: null,
        documento_identita_allegati: null,
        documento_identita_numero: null,
        documento_identita_scadenza: null,
        documento_identita_tipo: null,
        cittadino_extracomunitario: null,
        info_anagrafiche_cap: null,
        info_anagrafiche_cittadidanza: null,
        info_anagrafiche_civico: null,
        info_anagrafiche_codice_fiscale: null,
        info_anagrafiche_cognome: null,
        info_anagrafiche_data_di_nascita: null,
        info_anagrafiche_email: null,
        info_anagrafiche_indirizzo: null,
        info_anagrafiche_localita: null,
        info_anagrafiche_luogo_di_nascita: null,
        info_anagrafiche_nome: null,
        info_anagrafiche_numero_fisso: null,
        info_anagrafiche_numero_mobile: null,
        luogo_lavoro_se_diverso_da_residenza: null,
        mansione_lavoratore: null,
        mezza_giornata_di_riposo: null,
        ore_di_lavoro: null,
        ore_giovedi: null,
        ore_lunedi: null,
        ore_martedi: null,
        ore_mercoledi: null,
        ore_sabato: null,
        ore_venerdi: null,
        provincia: null,
        permesso_di_soggiorno_allegati: null,
        rapporto_di_lavoro_residenza: null,
        regime_convivenza: null,
        ricevuta_rinnovo_permesso_allegati: null,
        telecamere_posto_lavoro: null,
        tredicesima_rateizzata_mensile: null,
        note_aggiuntive: null,
        data_assunzione: null,
        type_of_compilazione_form: null,
      },
      lavoratoreAssunzione: null,
      richiestaAttivazione: null,
      rapporto: minimalRapportoRecord({
        id: IDS.rapporto,
        famiglia_id: IDS.famiglia,
        lavoratore_id: IDS.lavoratore,
        processi_matching_id: IDS.ricerca,
      }),
      lavoratore: null,
      famiglia: null,
      famigliaId: IDS.famiglia,
      nomeFamiglia: "Famiglia Rossi",
      nomeLavoratore: "Luigi Bianchi",
      email: "",
      telefono: "",
      titoloAnnuncio: null,
      tipoRapporto: null,
      deadline: "",
    })

    expect(row.id).toBe(IDS.assunzione)
    expect(row.rapporto_lavorativo_id).toBe(IDS.rapporto)
    expect(row.processi_matching_id).toBe(IDS.ricerca)

    const stack = resolveCommentStack({
      focus: focus("assunzione", IDS.assunzione),
      row,
      displayNames: {},
    })

    expect(entitySectionKinds(stack)).toEqual([
      "assunzione",
      "rapporto",
      "lavoratore",
      "ricerca",
      "famiglia",
    ])
  })

  it("builds chiusura rows with nested record and rapporto", () => {
    const row = chiusuraCommentRow({
      id: IDS.chiusura,
      stage: "stage",
      record: {
        id: IDS.chiusura,
        creato_il: null,
      } as never,
      rapporto: minimalRapportoRecord({
        id: IDS.rapporto,
        famiglia_id: IDS.famiglia,
        lavoratore_id: IDS.lavoratore,
        processi_matching_id: IDS.ricerca,
      }),
      nomeCompleto: "Mario Verdi",
      email: "",
      motivazione: null,
      dataFineRapporto: "",
      tipoLabel: "",
      tipoColor: null,
      hasAssunzioneDatore: false,
      hasAssunzioneLavoratore: false,
    })

    expect(row.processi_matching_id).toBe(IDS.ricerca)

    const stack = resolveCommentStack({
      focus: focus("chiusura", IDS.chiusura),
      row,
      displayNames: {},
    })

    expect(entitySectionKinds(stack)).toEqual([
      "chiusura",
      "rapporto",
      "lavoratore",
      "ricerca",
      "famiglia",
    ])
  })

  it("builds variazione rows with ricerca from nested rapporto", () => {
    const row = variazioneCommentRow({
      id: "11111111-1111-4111-8111-111111111111",
      stage: "stage",
      record: { id: "11111111-1111-4111-8111-111111111111" } as never,
      rapporto: minimalRapportoRecord({
        id: IDS.rapporto,
        famiglia_id: IDS.famiglia,
        lavoratore_id: IDS.lavoratore,
        processi_matching_id: IDS.ricerca,
      }),
      famiglia: null,
      lavoratore: null,
      nomeCompleto: "Mario Verdi",
      dataVariazione: "",
      variazioneDaApplicare: null,
    })

    expect(row.processi_matching_id).toBe(IDS.ricerca)

    const stack = resolveCommentStack({
      focus: focus("variazione", "11111111-1111-4111-8111-111111111111"),
      row,
      displayNames: {},
    })

    expect(entitySectionKinds(stack)).toEqual([
      "variazione",
      "rapporto",
      "lavoratore",
      "ricerca",
      "famiglia",
    ])
  })

  it("includes ricerca on rapporto comment rows from processId fallback", () => {
    const row = rapportoCommentRow(
      IDS.rapporto,
      minimalRapportoRecord({
        id: IDS.rapporto,
        famiglia_id: IDS.famiglia,
        lavoratore_id: IDS.lavoratore,
        processi_matching_id: null,
      }),
      { processId: IDS.ricerca },
    )

    expect(row.processi_matching_id).toBe(IDS.ricerca)
    expect(entitySectionKinds(resolveCommentStack({
      focus: focus("rapporto", IDS.rapporto),
      row,
      displayNames: {},
    }))).toEqual(["rapporto", "lavoratore", "ricerca", "famiglia"])
  })

  it("builds cedolino and contributi rows with ricerca from nested rapporto", () => {
    const rapporto = minimalRapportoRecord({
      id: IDS.rapporto,
      famiglia_id: IDS.famiglia,
      lavoratore_id: IDS.lavoratore,
      processi_matching_id: IDS.ricerca,
    })
    const cedolinoId = "33333333-3333-4333-8333-333333333333"
    const contributiId = "44444444-4444-4444-8444-444444444444"

    const cedolinoRow = cedolinoCommentRow({
      id: cedolinoId,
      stage: "stage",
      record: { id: cedolinoId } as never,
      famiglia: null,
      pagamento: null,
      transazione: null,
      presenze: null,
      presenzeRegolari: null,
      rapporto,
      mese: null,
      richiestaAttivazione: null,
      presenzeIrregolari: false,
      nomeCompleto: "Mario Verdi",
      importoLabel: null,
      dataInvioLabel: null,
    })

    const contributiRow = contributiCommentRow({
      id: contributiId,
      stage: "stage",
      record: { id: contributiId } as never,
      rapporto,
      trimestre: null,
      nomeFamiglia: "Famiglia",
      nomeLavoratore: "Mario",
      nomeCompleto: "Mario Verdi",
      trimestreLabel: "Q1",
      importoLabel: null,
      pagopaLabel: null,
    })

    expect(cedolinoRow.processi_matching_id).toBe(IDS.ricerca)
    expect(contributiRow.processi_matching_id).toBe(IDS.ricerca)
    expect(
      entitySectionKinds(
        resolveCommentStack({
          focus: focus("cedolino", cedolinoId),
          row: cedolinoRow,
          displayNames: {},
        }),
      ),
    ).toEqual(["cedolino", "rapporto", "lavoratore", "ricerca", "famiglia"])
    expect(
      entitySectionKinds(
        resolveCommentStack({
          focus: focus("contributi", contributiId),
          row: contributiRow,
          displayNames: {},
        }),
      ),
    ).toEqual(["contributi", "rapporto", "lavoratore", "ricerca", "famiglia"])
  })
})
