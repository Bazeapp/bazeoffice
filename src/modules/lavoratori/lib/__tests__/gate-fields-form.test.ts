import { describe, expect, it, vi } from "vitest"

import { createGateFieldsOnSave } from "../gate-fields-form"
import type { GateFieldsSaveDeps } from "../gate-fields-form"

function makeDraftSetter() {
  return vi.fn((updater: unknown) => {
    if (typeof updater === "function") {
      ;(updater as (current: Record<string, unknown>) => unknown)({})
    }
  })
}

function makeDeps(overrides: Partial<GateFieldsSaveDeps> = {}): GateFieldsSaveDeps {
  return {
    setAvailabilityDraft: makeDraftSetter(),
    setAddressDraft: makeDraftSetter(),
    setJobSearchDraft: makeDraftSetter(),
    setSkillsDraft: makeDraftSetter(),
    setAvailabilityStatusDraft: makeDraftSetter(),
    setDocumentsDraft: makeDraftSetter(),
    setGateDraft: makeDraftSetter(),
    patchSelectedWorkerField: vi.fn().mockResolvedValue(undefined),
    patchSkillsField: vi.fn().mockResolvedValue(undefined),
    patchWorkerAvailabilityStatus: vi.fn().mockResolvedValue(undefined),
    patchDocumentField: vi.fn().mockResolvedValue(undefined),
    commitAddressField: vi.fn().mockResolvedValue(undefined),
    patchWorkerAddressField: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe("createGateFieldsOnSave", () => {
  it("routes array job-search fields through patchSelectedWorkerField", async () => {
    const deps = makeDeps()
    const onSave = createGateFieldsOnSave(deps)

    await onSave({ tipo_rapporto_lavorativo: ["fisso", "convivenza"] })

    expect(deps.setJobSearchDraft).toHaveBeenCalled()
    expect(deps.setSkillsDraft).not.toHaveBeenCalled()
    expect(deps.patchSelectedWorkerField).toHaveBeenCalledWith(
      "tipo_rapporto_lavorativo",
      ["fisso", "convivenza"],
    )
  })

  it("routes skill fields through patchSkillsField", async () => {
    const deps = makeDeps()
    const onSave = createGateFieldsOnSave(deps)

    await onSave({ livello_inglese: "B1" })

    expect(deps.setSkillsDraft).toHaveBeenCalled()
    expect(deps.setJobSearchDraft).not.toHaveBeenCalled()
    expect(deps.patchSkillsField).toHaveBeenCalledWith("livello_inglese", "B1")
    expect(deps.patchSelectedWorkerField).not.toHaveBeenCalled()
  })

  it("routes availability status through patchWorkerAvailabilityStatus", async () => {
    const deps = makeDeps()
    const onSave = createGateFieldsOnSave(deps)

    await onSave({ disponibilita: "disponibile" })

    expect(deps.setAvailabilityStatusDraft).toHaveBeenCalled()
    expect(deps.patchWorkerAvailabilityStatus).toHaveBeenCalledWith({
      disponibilita: "disponibile",
    })
  })

  it("parses numeric experience fields before patching", async () => {
    const deps = makeDeps()
    const onSave = createGateFieldsOnSave(deps)

    await onSave({ anni_esperienza_colf: "5" })

    expect(deps.patchSelectedWorkerField).toHaveBeenCalledWith(
      "anni_esperienza_colf",
      5,
    )
  })

  it("routes address fields through commitAddressField", async () => {
    const deps = makeDeps()
    const onSave = createGateFieldsOnSave(deps)

    await onSave({ via: "Via Roma" })

    expect(deps.setAddressDraft).toHaveBeenCalled()
    expect(deps.commitAddressField).toHaveBeenCalledWith("via", "Via Roma")
  })

  it("routes document fields through patchDocumentField", async () => {
    const deps = makeDeps()
    const onSave = createGateFieldsOnSave(deps)

    await onSave({ iban: "IT60X0542811101000000123456" })

    expect(deps.patchDocumentField).toHaveBeenCalledWith(
      "iban",
      "IT60X0542811101000000123456",
    )
  })
})
