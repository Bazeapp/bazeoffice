/**
 * U2: esperienze/referenze FieldTextarea identity wiring.
 * Typing past debounce must persist the full string; row identity switch must
 * show the next row's committed value (not clipped prior draft).
 */
import * as React from "react"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/test-utils"
import type { EsperienzaLavoratoreRecord } from "../../types/esperienza-lavoratore"
import { EditableExperienceCard } from "../experience-references-edit"

function makeExperience(
  overrides: Partial<EsperienzaLavoratoreRecord> = {},
): EsperienzaLavoratoreRecord {
  return {
    id: "exp-1",
    lavoratore_id: "worker-1",
    tipo_lavoro: ["Colf"],
    tipo_rapporto: "Domestico",
    data_inizio: "2020-01-01",
    data_fine: null,
    stato_esperienza_attiva: true,
    descrizione: "Descrizione iniziale",
    descrizione_contesto_lavorativo: "Contesto iniziale",
    motivazione_fine_rapporto: null,
    ...overrides,
  }
}

function renderEditable(
  experience: EsperienzaLavoratoreRecord,
  onExperiencePatch = vi.fn().mockResolvedValue(undefined),
) {
  return renderWithProviders(
    <EditableExperienceCard
      experience={experience}
      references={[]}
      referencesLoading={false}
      disabled={false}
      experienceTipoLavoroOptions={[{ value: "colf", label: "Colf" }]}
      experienceTipoRapportoOptions={[{ value: "dom", label: "Domestico" }]}
      referenceStatusOptions={[]}
      onExperiencePatch={onExperiencePatch}
      onReferencePatch={vi.fn().mockResolvedValue(undefined)}
      onReferenceCreate={vi.fn().mockResolvedValue(undefined)}
    />,
  )
}

describe("EditableExperienceCard — textarea identity (U2)", () => {
  it("saves the full descrizione string after typing past debounce", async () => {
    const onExperiencePatch = vi.fn().mockResolvedValue(undefined)
    renderEditable(makeExperience(), onExperiencePatch)

    const textarea = screen.getByDisplayValue("Descrizione iniziale")
    fireEvent.change(textarea, {
      target: { value: "Descrizione iniziale e ancora testo finale" },
    })

    await waitFor(() => {
      expect(onExperiencePatch).toHaveBeenCalledWith(
        "exp-1",
        expect.objectContaining({
          descrizione: "Descrizione iniziale e ancora testo finale",
        }),
      )
    })
    expect(textarea).toHaveValue("Descrizione iniziale e ancora testo finale")
  })

  it("keeps in-progress descrizione when a different field updates remotely", async () => {
    const onExperiencePatch = vi.fn().mockResolvedValue(undefined)
    const view = renderEditable(makeExperience(), onExperiencePatch)

    const textarea = screen.getByDisplayValue("Descrizione iniziale")
    fireEvent.change(textarea, {
      target: { value: "Sto ancora digitando qui" },
    })
    expect(textarea).toHaveValue("Sto ancora digitando qui")

    // Remote peer updates tipo_rapporto on the same experience row.
    view.rerender(
      <EditableExperienceCard
        experience={makeExperience({ tipo_rapporto: "Convivente" })}
        references={[]}
        referencesLoading={false}
        disabled={false}
        experienceTipoLavoroOptions={[{ value: "colf", label: "Colf" }]}
        experienceTipoRapportoOptions={[
          { value: "dom", label: "Domestico" },
          { value: "conv", label: "Convivente" },
        ]}
        referenceStatusOptions={[]}
        onExperiencePatch={onExperiencePatch}
        onReferencePatch={vi.fn().mockResolvedValue(undefined)}
        onReferenceCreate={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    expect(screen.getByDisplayValue("Sto ancora digitando qui")).toBeInTheDocument()
  })

  it("switches textarea to the new row value when experience identity changes", async () => {
    const onExperiencePatch = vi.fn().mockResolvedValue(undefined)
    const view = renderEditable(makeExperience(), onExperiencePatch)

    const textarea = screen.getByDisplayValue("Descrizione iniziale")
    fireEvent.change(textarea, {
      target: { value: "Bozza su esperienza 1" },
    })

    view.rerender(
      <EditableExperienceCard
        experience={makeExperience({
          id: "exp-2",
          descrizione: "Descrizione esperienza 2",
        })}
        references={[]}
        referencesLoading={false}
        disabled={false}
        experienceTipoLavoroOptions={[{ value: "colf", label: "Colf" }]}
        experienceTipoRapportoOptions={[{ value: "dom", label: "Domestico" }]}
        referenceStatusOptions={[]}
        onExperiencePatch={onExperiencePatch}
        onReferencePatch={vi.fn().mockResolvedValue(undefined)}
        onReferenceCreate={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue("Descrizione esperienza 2")).toBeInTheDocument()
    })
    expect(screen.queryByDisplayValue("Bozza su esperienza 1")).not.toBeInTheDocument()
  })
})
