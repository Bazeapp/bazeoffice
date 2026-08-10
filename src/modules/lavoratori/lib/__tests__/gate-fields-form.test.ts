import { describe, expect, it, vi } from "vitest"

import {
  buildGateFieldsDefaults,
  createGateFieldsOnSave,
  type GateFieldsSaveDeps,
} from "../gate-fields-form"
import { makeWorkerRow } from "../../components/__tests__/gate1-view-test-fixtures"

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
    availabilityStatusDraft: {
      disponibilita: "",
      data_ritorno_disponibilita: "",
    },
    ...overrides,
  }
}

describe("buildGateFieldsDefaults — disponibilita", () => {
  it("normalizes disponibilita to the lookup label (same as Select save)", () => {
    const defaults = buildGateFieldsDefaults({
      selectedWorkerRow: makeWorkerRow({ disponibilita: "disponibile" }),
      selectedWorkerAddress: null,
      lookupOptionsByDomain: new Map([
        [
          "lavoratori.disponibilita",
          [{ label: "Disponibile", value: "disponibile" }],
        ],
      ]),
      resolvedIban: "",
    })

    expect(defaults.disponibilita).toBe("Disponibile")
  })
})

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

  it("persists disponibilita_nel_giorno via patchSelectedWorkerField (not draft-only)", async () => {
    const deps = makeDeps()
    const onSave = createGateFieldsOnSave(deps)

    await onSave({ disponibilita_nel_giorno: ["Mattina", "Pomeriggio"] })

    expect(deps.setAvailabilityDraft).toHaveBeenCalled()
    expect(deps.patchSelectedWorkerField).toHaveBeenCalledWith(
      "disponibilita_nel_giorno",
      ["Mattina", "Pomeriggio"],
    )
  })

  it("clears disponibilita_nel_giorno with null when the selection is empty", async () => {
    const deps = makeDeps()
    const onSave = createGateFieldsOnSave(deps)

    await onSave({ disponibilita_nel_giorno: [] })

    expect(deps.patchSelectedWorkerField).toHaveBeenCalledWith(
      "disponibilita_nel_giorno",
      null,
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

  it("defers Non disponibile until a return date is present (Gate 1 filter)", async () => {
    const deps = makeDeps({
      availabilityStatusDraft: {
        disponibilita: "Non disponibile",
        data_ritorno_disponibilita: "",
      },
    })
    const onSave = createGateFieldsOnSave(deps)

    const result = await onSave({ disponibilita: "Non disponibile" })

    expect(deps.patchWorkerAvailabilityStatus).not.toHaveBeenCalled()
    expect(result).toEqual({ skippedKeys: ["disponibilita"] })
  })

  it("flushes Non disponibile together with the return date", async () => {
    const deps = makeDeps({
      availabilityStatusDraft: {
        disponibilita: "Non disponibile",
        data_ritorno_disponibilita: "",
      },
    })
    const onSave = createGateFieldsOnSave(deps)

    const result = await onSave({ data_ritorno_disponibilita: "2026-08-15" })

    expect(deps.patchWorkerAvailabilityStatus).toHaveBeenCalledWith({
      disponibilita: "Non disponibile",
      data_ritorno_disponibilita: "2026-08-15",
    })
    expect(result).toEqual({ alsoCommitKeys: ["disponibilita"] })
  })

  it("saves Non disponibile immediately when return date already exists", async () => {
    const deps = makeDeps({
      availabilityStatusDraft: {
        disponibilita: "Disponibile",
        data_ritorno_disponibilita: "2026-08-01",
      },
    })
    const onSave = createGateFieldsOnSave(deps)

    const result = await onSave({ disponibilita: "Non disponibile" })

    expect(deps.patchWorkerAvailabilityStatus).toHaveBeenCalledWith({
      disponibilita: "Non disponibile",
    })
    expect(result).toBeUndefined()
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

  it("BAZ-181: routes provincia through patchWorkerAddressField (provincia_sigla path)", async () => {
    const deps = makeDeps()
    const onSave = createGateFieldsOnSave(deps)

    await onSave({ provincia: "MB" })

    expect(deps.setAddressDraft).toHaveBeenCalled()
    expect(deps.patchWorkerAddressField).toHaveBeenCalledWith("provincia", "MB")
    expect(deps.commitAddressField).not.toHaveBeenCalled()
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
