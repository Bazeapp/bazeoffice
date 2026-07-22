import { describe, expect, it, vi } from "vitest"

import {
  buildFamigliaProcessoHeaderFormSaveHandler,
  buildFamigliaProcessoHeaderFormDefaults,
} from "../famiglia-processo-header-form"

describe("buildFamigliaProcessoHeaderFormDefaults", () => {
  it("normalizes empty display values to editable strings", () => {
    expect(
      buildFamigliaProcessoHeaderFormDefaults({
        nomeFamiglia: "-",
        email: null,
        telefono: "   ",
        tipoLavoroBadges: ["Colf"],
        tipoRapportoBadge: "Part time",
      } as never)
    ).toEqual({
      nomeFamiglia: "",
      email: "",
      telefono: "",
      tipo_lavoro: ["Colf"],
      tipo_rapporto: "Part time",
    })
  })
})

describe("buildFamigliaProcessoHeaderFormSaveHandler", () => {
  it("routes family and process patches to the right callbacks", async () => {
    const onPatchFamily = vi.fn()
    const onPatchProcess = vi.fn()
    const onSave = buildFamigliaProcessoHeaderFormSaveHandler({
      familyId: "family-1",
      processId: "process-1",
      onPatchFamily,
      onPatchProcess,
    })

    await onSave({
      nomeFamiglia: "Rossi Mario",
      email: "mario@example.com",
      telefono: "+39 333 1234567",
      tipo_lavoro: ["Colf / Pulizie"],
      tipo_rapporto: "Part time",
    })

    expect(onPatchFamily).toHaveBeenCalledWith("family-1", {
      nome: "Rossi",
      cognome: "Mario",
      email: "mario@example.com",
      telefono: "+393331234567",
    })
    expect(onPatchProcess).toHaveBeenCalledWith("process-1", {
      tipo_lavoro: ["Colf / Pulizie"],
      tipo_rapporto: ["Part time"],
    })
  })

  it("skips invalid email without calling patch callbacks", async () => {
    const onPatchFamily = vi.fn()
    const onPatchProcess = vi.fn()
    const onSave = buildFamigliaProcessoHeaderFormSaveHandler({
      familyId: "family-1",
      processId: "process-1",
      onPatchFamily,
      onPatchProcess,
    })

    await onSave({ email: "not-an-email" })

    expect(onPatchFamily).not.toHaveBeenCalled()
    expect(onPatchProcess).not.toHaveBeenCalled()
  })
})
