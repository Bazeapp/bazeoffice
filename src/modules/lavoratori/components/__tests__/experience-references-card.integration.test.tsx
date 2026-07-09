import * as React from "react"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/test-utils"
import type { EsperienzaLavoratoreRecord } from "../../types/esperienza-lavoratore"
import { ExperienceReferencesCard } from "../experience-references-card"

const experience: EsperienzaLavoratoreRecord = {
  id: "exp-1",
  lavoratore_id: "worker-1",
  tipo_lavoro: ["Colf"],
  tipo_rapporto: "Domestico",
  data_inizio: "2020-01-01",
  data_fine: null,
  stato_esperienza_attiva: true,
  descrizione: "Esperienza test",
  descrizione_contesto_lavorativo: null,
  motivazione_fine_rapporto: null,
}

const noop = () => undefined

function renderCard(
  overrides: Partial<React.ComponentProps<typeof ExperienceReferencesCard>> = {},
) {
  return renderWithProviders(
    <ExperienceReferencesCard
      workerId="worker-1"
      isEditing={false}
      isUpdating={false}
      experiences={[experience]}
      experiencesLoading={false}
      references={[]}
      referencesLoading={false}
      lookupColorsByDomain={new Map()}
      experienceTipoLavoroOptions={[{ value: "colf", label: "Colf" }]}
      experienceTipoRapportoOptions={[{ value: "dom", label: "Domestico" }]}
      referenceStatusOptions={[]}
      selectedAnniEsperienzaColf=""
      selectedAnniEsperienzaBadante=""
      selectedAnniEsperienzaBabysitter=""
      selectedSituazioneLavorativaAttuale=""
      onToggleEdit={noop}
      onAnniEsperienzaColfChange={noop}
      onAnniEsperienzaBadanteChange={noop}
      onAnniEsperienzaBabysitterChange={noop}
      onSituazioneLavorativaAttualeChange={noop}
      onExperiencePatch={vi.fn().mockResolvedValue(undefined)}
      onReferencePatch={vi.fn().mockResolvedValue(undefined)}
      onReferenceCreate={vi.fn().mockResolvedValue(undefined)}
      showReferencesSection
      {...overrides}
    />,
  )
}

describe("ExperienceReferencesCard creation modals (FASE 5 QUATER)", () => {
  it("blocks reference submit until telefono and identity are provided", async () => {
    const onReferenceCreate = vi.fn().mockResolvedValue(undefined)
    renderCard({ onReferenceCreate })

    fireEvent.click(screen.getByRole("button", { name: /colf/i }))
    fireEvent.click(screen.getByRole("button", { name: /aggiungi referenza/i }))

    const dialog = await screen.findByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: /^aggiungi referenza$/i }))

    await waitFor(() => {
      expect(onReferenceCreate).not.toHaveBeenCalled()
    })
  })

  it("submits reference modal with zod-validated payload", async () => {
    const onReferenceCreate = vi.fn().mockResolvedValue(undefined)
    renderCard({ onReferenceCreate })

    fireEvent.click(screen.getByRole("button", { name: /colf/i }))
    fireEvent.click(screen.getByRole("button", { name: /aggiungi referenza/i }))

    const dialog = await screen.findByRole("dialog")
    const inputs = within(dialog).getAllByRole("textbox")
    fireEvent.change(inputs[0]!, { target: { value: "Anna" } })
    fireEvent.change(inputs[2]!, { target: { value: "3331234567" } })

    fireEvent.click(within(dialog).getByRole("button", { name: /^aggiungi referenza$/i }))

    await waitFor(() => {
      expect(onReferenceCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          esperienza_lavoratore_id: "exp-1",
          nome_datore: "Anna",
          telefono_datore: "3331234567",
        }),
      )
    })
  })
})
