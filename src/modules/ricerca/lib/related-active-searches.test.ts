import { describe, expect, it } from "vitest"

import {
  buildRelatedActiveSearchItem,
  buildRelatedSearchGroups,
  resolveRecruiterLabel,
  toWorkerOtherSelectionSummaryItems,
} from "./related-active-searches"

describe("related-active-searches", () => {
  const recruiterLabelsById = new Map([["rec-1", "Mario Rossi"]])

  it("resolveRecruiterLabel falls back when recruiter is missing", () => {
    expect(resolveRecruiterLabel(null, recruiterLabelsById)).toBe(
      "Recruiter non assegnato",
    )
    expect(resolveRecruiterLabel("missing", recruiterLabelsById)).toBe(
      "Recruiter non assegnato",
    )
    expect(resolveRecruiterLabel("rec-1", recruiterLabelsById)).toBe(
      "Mario Rossi",
    )
  })

  it("buildRelatedSearchGroups splits direct and other involvement", () => {
    const selections = [
      {
        id: "sel-1",
        processo_matching_id: "proc-1",
        stato_selezione: "Selezionato",
        stato_situazione_lavorativa: "Attivo",
        note_selezione: "Nota diretta",
      },
      {
        id: "sel-2",
        processo_matching_id: "proc-2",
        stato_selezione: "Candidato",
        stato_situazione_lavorativa: "Attivo",
        note_selezione: "Nota indiretta",
      },
    ]
    const processRowsById = new Map([
      [
        "proc-1",
        {
          id: "proc-1",
          famiglia_id: "fam-1",
          stato_res: "Attiva",
          orario_di_lavoro: "Full time",
          recruiter_ricerca_e_selezione_id: "rec-1",
          numero_ricerca_attivata: 12,
        },
      ],
      [
        "proc-2",
        {
          id: "proc-2",
          famiglia_id: "fam-2",
          stato_res: "Chiusa",
          orario_di_lavoro: "Part time",
        },
      ],
    ])
    const familyRowsById = new Map([
      ["fam-1", { id: "fam-1", nome: "Anna", cognome: "Bianchi" }],
      ["fam-2", { id: "fam-2", nome: "Luca", cognome: "Verdi" }],
    ])

    const groups = buildRelatedSearchGroups({
      selections,
      processRowsById,
      familyRowsById,
      recruiterLabelsById,
      currentProcessId: "current-proc",
    })

    expect(groups.direct).toHaveLength(1)
    expect(groups.other).toHaveLength(1)
    expect(groups.direct[0]?.ricercaLabel).toBe("Ricerca #12")
    expect(groups.direct[0]?.familyName).toBe("Anna Bianchi")
  })

  it("toWorkerOtherSelectionSummaryItems maps process id to summary id", () => {
    const item = buildRelatedActiveSearchItem(
      {
        id: "sel-1",
        processo_matching_id: "proc-1",
        stato_selezione: "Candidato",
        note_selezione: "Nota",
      },
      {
        id: "proc-1",
        famiglia_id: "fam-1",
        stato_res: "Attiva",
        orario_di_lavoro: "Full time",
      },
      { id: "fam-1", nome: "Anna", cognome: "Bianchi" },
      recruiterLabelsById,
    )

    expect(toWorkerOtherSelectionSummaryItems([item])).toEqual([
      {
        id: "proc-1",
        familyName: "Anna Bianchi",
        ricercaLabel: "Ricerca proc-1",
        recruiterLabel: "Recruiter non assegnato",
        statoSelezione: "Candidato",
        statoRicerca: "Attiva",
        orarioDiLavoro: "Full time",
        zona: "-",
        appunti: "Nota",
      },
    ])
  })
})
