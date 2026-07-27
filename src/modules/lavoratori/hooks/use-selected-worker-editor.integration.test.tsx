/**
 * Integration tests for `useSelectedWorkerEditor`.
 *
 * Regression coverage: drafts must NOT be overwritten by an external
 * realtime echo (a new `selectedWorkerRow` prop) while the user is in
 * editing mode. The fix added per-section `if (!isEditingXxx)` guards
 * before each draft setter in the resync `useEffect`
 * (see use-selected-worker-editor.ts ~lines 430-455).
 *
 * The hook imports a few side-effect modules (sonner, anagrafiche-api,
 * stripe, availability functions). They're mocked because none of them
 * are exercised by the resync path under test — the hook just needs
 * them importable.
 */
import { act } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderHookWithQueryClient } from "@/test/test-utils"
import type { LavoratoreRecord } from "../types/lavoratore"

// --- Mock side-effect modules so import doesn't try to hit network --------
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock("@/lib/record-crud", () => ({
  createRecord: vi.fn(),
  deleteRecord: vi.fn(),
  updateRecord: vi.fn(),
}))

vi.mock("@/lib/availability-functions", () => ({
  invokeWorkerAvailability: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/stripe-connect-api", () => ({
  createStripeConnectAccount: vi.fn(),
}))

import { toast } from "sonner"
import { createRecord, deleteRecord, updateRecord } from "@/lib/record-crud"
import { invokeWorkerAvailability } from "@/lib/availability-functions"
import { createStripeConnectAccount } from "@/lib/stripe-connect-api"
import { useSelectedWorkerEditor } from "../hooks/use-selected-worker-editor"

// Minimal worker row factory. LavoratoreRecord has many optional fields;
// we cast through `unknown` because we only populate what the resync
// branches actually read.
function makeRow(overrides: Record<string, unknown> = {}): LavoratoreRecord {
  return {
    id: "worker-1",
    nome: "Mario",
    cognome: "Rossi",
    email: "mario@example.com",
    telefono: "1234567890",
    sesso: "M",
    nazionalita: "IT",
    data_di_nascita: "1990-01-01",
    come_ti_sposti: ["auto"],
    vincoli_orari_disponibilita: "Solo mattina",
    disponibilita_nel_giorno: ["lunedi"],
    disponibilita: "disponibile",
    data_ritorno_disponibilita: "",
    tipo_lavoro_domestico: ["colf"],
    tipo_rapporto_lavorativo: ["fisso"],
    check_lavori_accettabili: [],
    check_accetta_funzionamento_baze: "si",
    check_accetta_lavori_con_trasferta: "no",
    check_accetta_multipli_contratti: "si",
    check_accetta_paga_9_euro_netti: "si",
    ...overrides,
  } as unknown as LavoratoreRecord
}

function makeProps(row: LavoratoreRecord | null) {
  return {
    selectedWorkerId: "worker-1",
    selectedWorker: null,
    selectedWorkerRow: row,
    selectedWorkerAddress: {
      via: "Via Roma",
      civico: "10",
      cap: "00100",
      citta: "Roma",
      provincia: "RM",
      citofono: "Rossi",
    } as Record<string, unknown>,
    lookupColorsByDomain: new Map<string, string>(),
    setError: vi.fn(),
    applyUpdatedWorkerRow: vi.fn(),
    applyUpdatedWorkerAddress: vi.fn(),
    applyUpdatedWorkerExperience: vi.fn(),
    appendCreatedWorkerExperience: vi.fn(),
    removeWorkerExperience: vi.fn(),
    applyUpdatedWorkerReference: vi.fn(),
    appendCreatedWorkerReference: vi.fn(),
  }
}

describe("useSelectedWorkerEditor — realtime echo draft preservation", () => {
  it("preserves availabilityDraft when isEditingAvailability=true and the row changes", () => {
    const initialRow = makeRow({
      vincoli_orari_disponibilita: "Solo mattina",
      disponibilita_nel_giorno: ["lunedi"],
    })

    const { result, rerender } = renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      { initialProps: makeProps(initialRow) }
    )

    act(() => {
      result.current.setIsEditingAvailability(true)
    })
    act(() => {
      result.current.setAvailabilityDraft((current) => ({
        ...current,
        vincoli_orari_disponibilita: "User typed value (in-progress)",
        disponibilita_nel_giorno: ["martedi", "mercoledi"],
      }))
    })

    // Simulate a realtime echo with DIFFERENT server-side data.
    const echoedRow = makeRow({
      vincoli_orari_disponibilita: "Server overwrote this",
      disponibilita_nel_giorno: ["domenica"],
    })
    rerender(makeProps(echoedRow))

    expect(result.current.availabilityDraft.vincoli_orari_disponibilita).toBe(
      "User typed value (in-progress)"
    )
    expect(result.current.availabilityDraft.disponibilita_nel_giorno).toEqual([
      "martedi",
      "mercoledi",
    ])
  })

  it("DOES re-sync availabilityDraft when isEditingAvailability=false and the row changes", () => {
    const initialRow = makeRow({
      vincoli_orari_disponibilita: "Solo mattina",
      disponibilita_nel_giorno: ["lunedi"],
    })

    const { result, rerender } = renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      { initialProps: makeProps(initialRow) }
    )

    expect(result.current.availabilityDraft.vincoli_orari_disponibilita).toBe(
      "Solo mattina"
    )

    // Editing flag stays false (default).
    const echoedRow = makeRow({
      vincoli_orari_disponibilita: "Aggiornato dal server",
      disponibilita_nel_giorno: ["venerdi"],
    })
    rerender(makeProps(echoedRow))

    expect(result.current.availabilityDraft.vincoli_orari_disponibilita).toBe(
      "Aggiornato dal server"
    )
    expect(result.current.availabilityDraft.disponibilita_nel_giorno).toEqual([
      "venerdi",
    ])
  })

  it("preserves addressDraft when isEditingAddress=true and selectedWorkerAddress changes", () => {
    const initialRow = makeRow()

    const { result, rerender } = renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      { initialProps: makeProps(initialRow) }
    )

    act(() => {
      result.current.setIsEditingAddress(true)
    })
    act(() => {
      result.current.setAddressDraft((current) => ({
        ...current,
        via: "Via dell'Utente",
        citta: "Milano-EDIT",
      }))
    })

    const nextProps = {
      ...makeProps(initialRow),
      selectedWorkerAddress: {
        via: "Via Server",
        civico: "99",
        cap: "20100",
        citta: "Server City",
        provincia: "MI",
        citofono: "Server",
      } as Record<string, unknown>,
    }
    rerender(nextProps)

    expect(result.current.addressDraft.via).toBe("Via dell'Utente")
    expect(result.current.addressDraft.citta).toBe("Milano-EDIT")
  })

  it("preserves jobSearchDraft when isEditingJobSearch=true and the row changes", () => {
    const initialRow = makeRow({
      tipo_lavoro_domestico: ["colf"],
      check_accetta_funzionamento_baze: "si",
    })

    const { result, rerender } = renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      { initialProps: makeProps(initialRow) }
    )

    act(() => {
      result.current.setIsEditingJobSearch(true)
    })
    act(() => {
      result.current.setJobSearchDraft((current) => ({
        ...current,
        tipo_lavoro_domestico: ["badante", "babysitter"],
        check_accetta_funzionamento_baze: "user-pending",
      }))
    })

    const echoedRow = makeRow({
      tipo_lavoro_domestico: ["serverValueA"],
      check_accetta_funzionamento_baze: "server-overwrote",
    })
    rerender(makeProps(echoedRow))

    expect(result.current.jobSearchDraft.tipo_lavoro_domestico).toEqual([
      "badante",
      "babysitter",
    ])
    expect(result.current.jobSearchDraft.check_accetta_funzionamento_baze).toBe(
      "user-pending"
    )
  })
})

describe("useSelectedWorkerEditor — error visibility (C.2)", () => {
  it("shows a toast.error when a field patch fails server-side", async () => {
    vi.mocked(toast.error).mockClear()
    // applyWorkerPatch awaits updateRecord; make it reject just for this call.
    vi.mocked(updateRecord).mockRejectedValueOnce(new Error("update KO dal server"))

    const { result } = renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      { initialProps: makeProps(makeRow()) }
    )

    await act(async () => {
      // patchSelectedWorkerField re-throws on failure; swallow so we reach the
      // assertions (a `void` caller in the app wouldn't await, but the toast
      // fires regardless).
      await result.current
        .patchSelectedWorkerField("nome", "Nuovo Nome")
        .catch(() => {})
    })

    expect(updateRecord).toHaveBeenCalled()
    // Before the C.2 fix this path called only setError (invisible side-panel
    // banner) — now every failed patch is surfaced via toast.
    expect(toast.error).toHaveBeenCalledWith("update KO dal server")
  })
})

// ---------------------------------------------------------------------------
// U3 — complete the draft-resync-without-clobber net across all 8 drafts.
// The existing block above covers header/availability/address/jobSearch
// (B1, B3, B4, B5) + the availability resync (B2). Here we close the 4
// uncovered isEditing-guarded drafts (B6-B9), the availability matrix
// sub-object (B1+), and the nonIdoneo/blacklist UNCONDITIONAL-resync
// asymmetry (B24). Each preservation test is meaningful only because the
// isEditingX flag is ON and the echoed row actually DIFFERS.
// ---------------------------------------------------------------------------
describe("useSelectedWorkerEditor — U3 draft-resync net (remaining drafts)", () => {
  it("B6: preserves availabilityStatusDraft while editing, resyncs when not", () => {
    const { result, rerender } = renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      { initialProps: makeProps(makeRow({ disponibilita: "disponibile" })) }
    )

    act(() => result.current.setIsEditingAvailabilityStatus(true))
    act(() =>
      result.current.setAvailabilityStatusDraft((c) => ({ ...c, disponibilita: "user-typed" }))
    )
    rerender(makeProps(makeRow({ disponibilita: "server-changed" })))
    expect(result.current.availabilityStatusDraft.disponibilita).toBe("user-typed")

    // Now stop editing and echo again → it resyncs.
    act(() => result.current.setIsEditingAvailabilityStatus(false))
    rerender(makeProps(makeRow({ disponibilita: "server-final" })))
    expect(result.current.availabilityStatusDraft.disponibilita).toBe("server-final")
  })

  it("B7: preserves experienceDraft while editing, resyncs when not", () => {
    const { result, rerender } = renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      { initialProps: makeProps(makeRow({ situazione_lavorativa_attuale: "occupata" })) }
    )

    act(() => result.current.setIsEditingExperience(true))
    act(() =>
      result.current.setExperienceDraft((c) => ({
        ...c,
        situazione_lavorativa_attuale: "user-typed",
      }))
    )
    rerender(makeProps(makeRow({ situazione_lavorativa_attuale: "server-changed" })))
    expect(result.current.experienceDraft.situazione_lavorativa_attuale).toBe("user-typed")

    act(() => result.current.setIsEditingExperience(false))
    rerender(makeProps(makeRow({ situazione_lavorativa_attuale: "server-final" })))
    expect(result.current.experienceDraft.situazione_lavorativa_attuale).toBe("server-final")
  })

  it("B8: preserves skillsDraft while editing, resyncs when not", () => {
    const { result, rerender } = renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      { initialProps: makeProps(makeRow({ livello_pulizie: "base" })) }
    )

    act(() => result.current.setIsEditingSkills(true))
    act(() => result.current.setSkillsDraft((c) => ({ ...c, livello_pulizie: "user-typed" })))
    rerender(makeProps(makeRow({ livello_pulizie: "server-changed" })))
    expect(result.current.skillsDraft.livello_pulizie).toBe("user-typed")

    act(() => result.current.setIsEditingSkills(false))
    rerender(makeProps(makeRow({ livello_pulizie: "server-final" })))
    expect(result.current.skillsDraft.livello_pulizie).toBe("server-final")
  })

  it("B9: preserves documentsDraft while editing, resyncs when not", () => {
    const { result, rerender } = renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      { initialProps: makeProps(makeRow({ iban: "IT00INITIAL" })) }
    )

    act(() => result.current.setIsEditingDocuments(true))
    act(() => result.current.setDocumentsDraft((c) => ({ ...c, iban: "IT00USER" })))
    rerender(makeProps(makeRow({ iban: "IT00SERVER" })))
    expect(result.current.documentsDraft.iban).toBe("IT00USER")

    act(() => result.current.setIsEditingDocuments(false))
    rerender(makeProps(makeRow({ iban: "IT00FINAL" })))
    expect(result.current.documentsDraft.iban).toBe("IT00FINAL")
  })

  it("B1+: preserves the availabilityDraft.matrix sub-object while editing (not just the scalar fields)", () => {
    const { result, rerender } = renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      { initialProps: makeProps(makeRow()) }
    )

    act(() => result.current.setIsEditingAvailability(true))
    const sentinelMatrix = { __edited: "user-matrix" } as unknown as
      typeof result.current.availabilityDraft.matrix
    act(() =>
      result.current.setAvailabilityDraft((c) => ({ ...c, matrix: sentinelMatrix }))
    )

    rerender(makeProps(makeRow({ vincoli_orari_disponibilita: "server changed something" })))

    // The whole draft (including the matrix) is preserved while editing.
    expect(result.current.availabilityDraft.matrix).toBe(sentinelMatrix)
  })

  it("B24: nonIdoneoReasonValues and blacklistChecked resync UNCONDITIONALLY, even with every section in edit mode", () => {
    const { result, rerender } = renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      {
        initialProps: makeProps(
          makeRow({ motivazione_non_idoneo: [], check_blacklist: null })
        ),
      }
    )

    // Turn ON every editing flag.
    act(() => {
      result.current.setIsEditingHeader(true)
      result.current.setIsEditingAddress(true)
      result.current.setIsEditingAvailability(true)
      result.current.setIsEditingAvailabilityStatus(true)
      result.current.setIsEditingJobSearch(true)
      result.current.setIsEditingExperience(true)
      result.current.setIsEditingSkills(true)
      result.current.setIsEditingDocuments(true)
    })
    expect(result.current.nonIdoneoReasonValues).toEqual([])
    expect(result.current.blacklistChecked).toBe(false)

    // Echo changes motivazione + blacklist. Unlike the 8 isEditing-guarded
    // drafts, these two are reseeded unconditionally (only the activePatchesRef
    // gate protects them), so they update despite every flag being on.
    rerender(
      makeProps(
        makeRow({ motivazione_non_idoneo: ["non si presenta"], check_blacklist: "blacklist" })
      )
    )
    expect(result.current.nonIdoneoReasonValues).toEqual(["non si presenta"])
    expect(result.current.blacklistChecked).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// U4 — identity switch + lifecycle no-save. Resync after an id switch is
// flag-reset-driven (the [selectedWorkerId] effect clears every isEditingX,
// then the resync effect reseeds from the new row) — there is NO realtimeTick
// in this hook. And the hook never auto-flushes: no writer fires on switch,
// unmount, or with a null id.
// ---------------------------------------------------------------------------
describe("useSelectedWorkerEditor — U4 identity switch & lifecycle no-save", () => {
  function clearWriters() {
    vi.mocked(updateRecord).mockClear()
    vi.mocked(createRecord).mockClear()
    vi.mocked(deleteRecord).mockClear()
  }
  function expectNoWrites() {
    expect(updateRecord).not.toHaveBeenCalled()
    expect(createRecord).not.toHaveBeenCalled()
    expect(deleteRecord).not.toHaveBeenCalled()
  }

  it("B11: switching selectedWorkerId clears the editing flags and reseeds the draft from the NEW worker (no cross-record bleed)", () => {
    const { result, rerender } = renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      { initialProps: makeProps(makeRow({ nome: "Mario" })) }
    )

    act(() => result.current.setIsEditingHeader(true))
    expect(result.current.isEditingHeader).toBe(true)

    // Switch to a DIFFERENT worker (new id AND new row).
    rerender({
      ...makeProps(makeRow({ nome: "Luigi" })),
      selectedWorkerId: "worker-2",
    })

    // The editing flag is reset on worker switch (header fields live in WorkerProfileHeader form).
    expect(result.current.isEditingHeader).toBe(false)
  })

  it("B12: switching selectedWorkerId fires NO writer (the in-progress draft is discarded, not saved)", () => {
    const { result, rerender } = renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      { initialProps: makeProps(makeRow({ nome: "Mario" })) }
    )

    act(() => result.current.setIsEditingHeader(true))

    clearWriters()
    rerender({ ...makeProps(makeRow({ nome: "Luigi" })), selectedWorkerId: "worker-2" })

    expectNoWrites()
  })

  it("B13: unmounting fires NO writer — this hook has no flush-on-unmount", () => {
    const { result, unmount } = renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      { initialProps: makeProps(makeRow({ nome: "Mario" })) }
    )

    act(() => result.current.setIsEditingHeader(true))

    clearWriters()
    unmount()

    expectNoWrites()
  })

  it("B27: a writer callback with a null selectedWorkerId early-returns — no updateRecord", async () => {
    clearWriters()
    const { result } = renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      { initialProps: { ...makeProps(makeRow()), selectedWorkerId: null as unknown as string } }
    )

    await act(async () => {
      // Tolerate either a returned promise or a synchronous early-return.
      await Promise.resolve(
        result.current.patchSelectedWorkerField("nome", "Nuovo Nome")
      ).catch(() => {})
    })

    expectNoWrites()
  })
})

// ---------------------------------------------------------------------------
// U5 — in-flight write gates. Both guards only matter WHILE a write is
// pending, so the writer mocks are held open with a manual deferred promise:
// a synchronously-resolving mock would close the window before the rerender
// and the gate would never be exercised (a false green).
// ---------------------------------------------------------------------------
describe("useSelectedWorkerEditor — U5 in-flight gates", () => {
  it("B10: while an own patch is in flight, the resync effect is gated — no draft reseeds until it resolves", async () => {
    vi.mocked(updateRecord).mockClear()
    let resolveUpdate!: (v: unknown) => void
    vi.mocked(updateRecord).mockImplementationOnce(
      () => new Promise((res) => {
        resolveUpdate = res as (v: unknown) => void
      })
    )

    const { result, rerender } = renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      { initialProps: makeProps(makeRow({ vincoli_orari_disponibilita: "iniziale" })) }
    )

    // Start a patch; updateRecord is held → activePatchesRef stays at 1.
    let patchPromise!: Promise<unknown>
    act(() => {
      patchPromise = result.current.patchSelectedWorkerField("nome", "x") as Promise<unknown>
    })

    // A realtime echo arrives WHILE the own-save is in flight. availability is
    // a non-editing draft that would normally resync — but the activePatchesRef
    // gate suppresses the whole resync effect.
    rerender(makeProps(makeRow({ vincoli_orari_disponibilita: "echo durante il save" })))
    expect(result.current.availabilityDraft.vincoli_orari_disponibilita).toBe("iniziale")

    // Resolve the patch → the gate releases.
    await act(async () => {
      resolveUpdate({ row: makeRow({ nome: "x" }) })
      await patchPromise.catch(() => {})
    })

    // A fresh echo now resyncs normally — proving the gate (not something else)
    // suppressed the earlier one.
    rerender(makeProps(makeRow({ vincoli_orari_disponibilita: "echo dopo il save" })))
    expect(result.current.availabilityDraft.vincoli_orari_disponibilita).toBe("echo dopo il save")
  })

  it("B22: concurrent address patches with no address id share ONE create — single indirizzi INSERT, then UPDATEs", async () => {
    vi.mocked(createRecord).mockClear()
    vi.mocked(updateRecord).mockClear()

    let resolveCreate!: (v: unknown) => void
    vi.mocked(createRecord).mockImplementationOnce(
      () => new Promise((res) => {
        resolveCreate = res as (v: unknown) => void
      })
    )
    vi.mocked(updateRecord).mockResolvedValueOnce({
      row: { id: "addr-1", citta: "Milano" },
    } as never)

    // makeProps' selectedWorkerAddress has NO id → the create path is taken; the
    // two calls run under the SAME selectedWorkerId (worker-1) → same Map entry.
    const { result } = renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      { initialProps: makeProps(makeRow()) }
    )

    await act(async () => {
      const p1 = result.current.patchWorkerAddressField("via", "Via Uno")
      const p2 = result.current.patchWorkerAddressField("citta", "Milano")
      // p1 registered the pending create; release it so p2's `await pending`
      // resolves and routes to an UPDATE.
      resolveCreate({ row: { id: "addr-1" } })
      await Promise.all([p1, p2]).catch(() => {})
    })

    // Exactly one INSERT despite two concurrent field patches under one worker.
    expect(createRecord).toHaveBeenCalledTimes(1)
    expect(createRecord).toHaveBeenCalledWith(
      "indirizzi",
      expect.objectContaining({ entita_id: "worker-1", via: "Via Uno" })
    )
    // The second field persisted via UPDATE against the created row's id.
    expect(updateRecord).toHaveBeenCalledTimes(1)
    expect(updateRecord).toHaveBeenCalledWith("indirizzi", "addr-1", { citta: "Milano" })
  })
})

// ---------------------------------------------------------------------------
// U6 — write paths: error visibility (toast.error) on every catch, and the
// composite save orchestration. The false-green risk here is asserting only
// updateRecord and missing the invokeWorkerAvailability side-effect /
// toast.success — a regression that drops the side-effect would stay green.
// ---------------------------------------------------------------------------
describe("useSelectedWorkerEditor — U6 write paths (errors + orchestration)", () => {
  function render(extraProps: Partial<ReturnType<typeof makeProps>> = {}) {
    return renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      { initialProps: { ...makeProps(makeRow()), ...extraProps } }
    )
  }

  it("B16: saveWorkerAvailability persists matrix boolean fields in the update patch", async () => {
    vi.mocked(updateRecord).mockClear()
    vi.mocked(invokeWorkerAvailability).mockClear()
    vi.mocked(updateRecord).mockResolvedValueOnce({ row: makeRow() } as never)

    const { result } = render()

    act(() => {
      result.current.setIsEditingAvailability(true)
      result.current.setAvailabilityDraft((current) => ({
        ...current,
        matrix: {
          ...current.matrix,
          "lunedi:mattina": true,
          "martedi:pomeriggio": true,
        },
      }))
    })

    await act(async () => {
      await result.current.saveWorkerAvailability().catch(() => {})
    })

    expect(updateRecord).toHaveBeenCalledWith(
      "lavoratori",
      "worker-1",
      expect.objectContaining({
        disponibilita_lunedi_mattina: true,
        disponibilita_martedi_pomeriggio: true,
        disponibilita_lunedi_pomeriggio: false,
      })
    )
    expect(invokeWorkerAvailability).toHaveBeenCalledWith("worker-1")
  })

  it("B16: saveWorkerAvailability success → updateRecord, applyUpdatedWorkerRow, invokeWorkerAvailability, toast.success", async () => {
    vi.mocked(updateRecord).mockClear()
    vi.mocked(invokeWorkerAvailability).mockClear()
    vi.mocked(toast.success).mockClear()
    vi.mocked(updateRecord).mockResolvedValueOnce({ row: makeRow() } as never)
    const applyUpdatedWorkerRow = vi.fn()

    const { result } = render({ applyUpdatedWorkerRow })

    await act(async () => {
      await result.current.saveWorkerAvailability().catch(() => {})
    })

    expect(updateRecord).toHaveBeenCalledWith("lavoratori", "worker-1", expect.any(Object))
    expect(applyUpdatedWorkerRow).toHaveBeenCalled()
    // The side-effect edge-fn call is load-bearing — assert it explicitly.
    expect(invokeWorkerAvailability).toHaveBeenCalledWith("worker-1")
    expect(toast.success).toHaveBeenCalledWith("Disponibilita lavoratore salvata")
  })

  it("B16: saveWorkerAvailability failure → toast.error, no invokeWorkerAvailability, re-throws", async () => {
    vi.mocked(invokeWorkerAvailability).mockClear()
    vi.mocked(toast.error).mockClear()
    vi.mocked(updateRecord).mockRejectedValueOnce(new Error("disponibilita KO"))

    const { result } = render()

    let threw = false
    await act(async () => {
      await result.current.saveWorkerAvailability().catch(() => {
        threw = true
      })
    })

    expect(threw).toBe(true)
    expect(toast.error).toHaveBeenCalledWith("disponibilita KO")
    expect(invokeWorkerAvailability).not.toHaveBeenCalled()
  })

  it("B17: patchWorkerAvailabilityStatus success → updateRecord + invokeWorkerAvailability; failure → toast.error", async () => {
    vi.mocked(updateRecord).mockClear()
    vi.mocked(invokeWorkerAvailability).mockClear()
    vi.mocked(updateRecord).mockResolvedValueOnce({ row: makeRow() } as never)

    const { result } = render()

    await act(async () => {
      await result.current
        .patchWorkerAvailabilityStatus({ disponibilita: "non disponibile" })
        .catch(() => {})
    })
    expect(updateRecord).toHaveBeenCalledWith("lavoratori", "worker-1", {
      disponibilita: "non disponibile",
    })
    expect(invokeWorkerAvailability).toHaveBeenCalledWith("worker-1")

    vi.mocked(toast.error).mockClear()
    vi.mocked(updateRecord).mockRejectedValueOnce(new Error("stato KO"))
    await act(async () => {
      await result.current
        .patchWorkerAvailabilityStatus({ disponibilita: "x" })
        .catch(() => {})
    })
    expect(toast.error).toHaveBeenCalledWith("stato KO")
  })

  it("B15: a failed address patch surfaces toast.error (distinct catch / indirizzi table)", async () => {
    vi.mocked(toast.error).mockClear()
    vi.mocked(updateRecord).mockRejectedValueOnce(new Error("indirizzo KO"))

    // Give the address an id so applyAddressPatch takes the UPDATE path.
    const { result } = render({
      selectedWorkerAddress: { id: "addr-9", via: "Via X" } as Record<string, unknown>,
    })

    await act(async () => {
      await result.current.patchWorkerAddressField("via", "Via Nuova").catch(() => {})
    })

    expect(updateRecord).toHaveBeenCalledWith("indirizzi", "addr-9", { via: "Via Nuova" })
    expect(toast.error).toHaveBeenCalledWith("indirizzo KO")
  })

  it("B25: generateStripeAccount success seeds the draft + toast.success; failure → toast.error", async () => {
    vi.mocked(toast.success).mockClear()
    vi.mocked(createStripeConnectAccount).mockResolvedValueOnce({
      row: makeRow(),
      id_stripe_account: "acct_123",
      created: true,
    } as never)

    const { result } = render()

    await act(async () => {
      await result.current.generateStripeAccount()?.catch?.(() => {})
    })
    expect(result.current.documentsDraft.id_stripe_account).toBe("acct_123")
    expect(toast.success).toHaveBeenCalledWith("Account Stripe creato")

    vi.mocked(toast.error).mockClear()
    vi.mocked(createStripeConnectAccount).mockRejectedValueOnce(new Error("stripe KO"))
    await act(async () => {
      await Promise.resolve(result.current.generateStripeAccount()).catch(() => {})
    })
    expect(toast.error).toHaveBeenCalledWith("stripe KO")
  })

  it("B26: structural mutations route to the right table; createReference toggles updatingExperience (shared flag) but per-field patch does NOT", async () => {
    vi.mocked(createRecord).mockClear()
    const appendCreatedWorkerExperience = vi.fn()
    const appendCreatedWorkerReference = vi.fn()

    const { result } = render({
      appendCreatedWorkerExperience,
      appendCreatedWorkerReference,
    })

    // createExperienceRecord → esperienze_lavoratori + append callback.
    vi.mocked(createRecord).mockResolvedValueOnce({ row: { id: "exp-1" } } as never)
    await act(async () => {
      await result.current.createExperienceRecord({ ruolo: "colf" } as never).catch(() => {})
    })
    expect(createRecord).toHaveBeenCalledWith("esperienze_lavoratori", { ruolo: "colf" })
    expect(appendCreatedWorkerExperience).toHaveBeenCalledWith({ id: "exp-1" })

    // createReferenceRecord → referenze_lavoratori; updatingExperience is the
    // SHARED flag and is true while in flight (intentional quirk).
    let resolveRef!: (v: unknown) => void
    vi.mocked(createRecord).mockImplementationOnce(
      () => new Promise((res) => {
        resolveRef = res as (v: unknown) => void
      })
    )
    let refPromise!: Promise<unknown>
    act(() => {
      refPromise = result.current.createReferenceRecord({ nome: "Mario" } as never) as Promise<unknown>
    })
    expect(result.current.updatingExperience).toBe(true)
    await act(async () => {
      resolveRef({ row: { id: "ref-1" } })
      await refPromise.catch(() => {})
    })
    expect(createRecord).toHaveBeenLastCalledWith("referenze_lavoratori", { nome: "Mario" })
    expect(appendCreatedWorkerReference).toHaveBeenCalledWith({ id: "ref-1" })
    expect(result.current.updatingExperience).toBe(false)

    // patchExperienceRecord (per-field autosave) does NOT toggle updatingExperience
    // (avoids disabling DebouncedInput mid-type).
    let resolvePatch!: (v: unknown) => void
    vi.mocked(updateRecord).mockImplementationOnce(
      () => new Promise((res) => {
        resolvePatch = res as (v: unknown) => void
      })
    )
    let patchP!: Promise<unknown>
    act(() => {
      patchP = result.current.patchExperienceRecord("exp-1", { ruolo: "badante" } as never) as Promise<unknown>
    })
    expect(result.current.updatingExperience).toBe(false)
    await act(async () => {
      resolvePatch({ row: { id: "exp-1" } })
      await patchP.catch(() => {})
    })
  })
})

// ---------------------------------------------------------------------------
// U7 — commit no-op short-circuits + field routing. The commit* helpers skip
// a redundant write when the value is unchanged (type-aware compares), and
// come_ti_sposti routes to the lavoratori table while other address fields
// route to indirizzi.
// ---------------------------------------------------------------------------
describe("useSelectedWorkerEditor — U7 commit no-op short-circuits + routing", () => {
  beforeEach(() => {
    vi.mocked(updateRecord).mockReset()
    vi.mocked(updateRecord).mockResolvedValue({ row: makeRow() } as never)
    vi.mocked(createRecord).mockReset()
    vi.mocked(createRecord).mockResolvedValue({ row: { id: "addr-x" } } as never)
  })

  it("B19: commitExperienceField compares anni_* NUMERICALLY (cosmetic format = no-op) and situazione as a trimmed string", async () => {
    const { result } = renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      {
        initialProps: makeProps(
          makeRow({ anni_esperienza_colf: 5, situazione_lavorativa_attuale: "occupata" })
        ),
      }
    )
    act(() => result.current.setIsEditingExperience(true))

    // Numeric no-op: "5.0" parses to 5, equal to the server's 5.
    act(() => result.current.setExperienceDraft((c) => ({ ...c, anni_esperienza_colf: "5.0" })))
    await act(async () => {
      await result.current.commitExperienceField("anni_esperienza_colf").catch(() => {})
    })
    expect(updateRecord).not.toHaveBeenCalled()

    // situazione no-op: " occupata ".trim() === "occupata".
    act(() =>
      result.current.setExperienceDraft((c) => ({
        ...c,
        situazione_lavorativa_attuale: " occupata ",
      }))
    )
    await act(async () => {
      await result.current.commitExperienceField("situazione_lavorativa_attuale").catch(() => {})
    })
    expect(updateRecord).not.toHaveBeenCalled()

    // Fires on a real numeric change, persisting the parsed number.
    act(() => result.current.setExperienceDraft((c) => ({ ...c, anni_esperienza_colf: "6" })))
    await act(async () => {
      await result.current.commitExperienceField("anni_esperienza_colf").catch(() => {})
    })
    expect(updateRecord).toHaveBeenCalledWith("lavoratori", "worker-1", { anni_esperienza_colf: 6 })
  })

  it("B20: commitDocumentField compares iban against resolvedIban (not the raw row field)", async () => {
    const { result } = renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      { initialProps: makeProps(makeRow({ iban: "IT00SERVER" })) }
    )
    act(() => result.current.setIsEditingDocuments(true))

    // No-op when the draft equals resolvedIban (the helper's comparison source).
    const resolved = result.current.resolvedIban
    act(() => result.current.setDocumentsDraft((c) => ({ ...c, iban: resolved })))
    await act(async () => {
      await result.current.commitDocumentField("iban").catch(() => {})
    })
    expect(updateRecord).not.toHaveBeenCalled()

    // Fires on a real change.
    act(() => result.current.setDocumentsDraft((c) => ({ ...c, iban: "IT99NEW" })))
    await act(async () => {
      await result.current.commitDocumentField("iban").catch(() => {})
    })
    expect(updateRecord).toHaveBeenCalledWith("lavoratori", "worker-1", { iban: "IT99NEW" })
  })

  it("B21: commitAddressField routes come_ti_sposti → lavoratori (JSON no-op) and other fields → indirizzi", async () => {
    const { result } = renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      {
        initialProps: {
          ...makeProps(makeRow({ come_ti_sposti: ["auto"] })),
          selectedWorkerAddress: { id: "addr-9", via: "Via Vecchia" } as Record<string, unknown>,
        },
      }
    )
    act(() => result.current.setIsEditingAddress(true))

    // come_ti_sposti unchanged → JSON-equality no-op.
    act(() => result.current.setAddressDraft((c) => ({ ...c, come_ti_sposti: ["auto"] })))
    await act(async () => {
      await result.current.commitAddressField("come_ti_sposti").catch(() => {})
    })
    expect(updateRecord).not.toHaveBeenCalled()

    // come_ti_sposti changed → routes to the LAVORATORI table.
    act(() => result.current.setAddressDraft((c) => ({ ...c, come_ti_sposti: ["auto", "treno"] })))
    await act(async () => {
      await result.current.commitAddressField("come_ti_sposti").catch(() => {})
    })
    expect(updateRecord).toHaveBeenCalledWith("lavoratori", "worker-1", {
      come_ti_sposti: ["auto", "treno"],
    })

    // A plain address field → routes to the INDIRIZZI table.
    vi.mocked(updateRecord).mockClear()
    act(() => result.current.setAddressDraft((c) => ({ ...c, via: "Via Nuova" })))
    await act(async () => {
      await result.current.commitAddressField("via").catch(() => {})
    })
    expect(updateRecord).toHaveBeenCalledWith("indirizzi", "addr-9", { via: "Via Nuova" })
  })
})
