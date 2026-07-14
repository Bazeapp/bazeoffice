import { describe, expect, it } from "vitest"

import { resolveCommentStack } from "../resolve-comment-stack"
import {
  assunzioneCommentRow,
  candidaturaCommentRow,
  chiusuraCommentRow,
  crmProcessoDisplayNames,
  formatRicercaDisplayName,
  rapportoCommentRow,
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

    const stack = resolveCommentStack({
      focus: focus("chiusura", IDS.chiusura),
      row,
      displayNames: {},
    })

    expect(stack.sections[0]?.entityRef?.entityType).toBe("chiusura")
    expect(stack.sections.some((section) => section.entityRef?.entityType === "rapporto")).toBe(
      true,
    )
  })
})
