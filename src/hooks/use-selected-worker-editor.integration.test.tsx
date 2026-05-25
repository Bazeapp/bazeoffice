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
import { describe, expect, it, vi } from "vitest"

import { renderHookWithQueryClient } from "@/test/test-utils"
import type { LavoratoreRecord } from "@/types/entities/lavoratore"

// --- Mock side-effect modules so import doesn't try to hit network --------
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock("@/lib/anagrafiche-api", () => ({
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

import { useSelectedWorkerEditor } from "@/hooks/use-selected-worker-editor"

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

  it("preserves headerDraft when isEditingHeader=true regardless of other section changes", () => {
    const initialRow = makeRow({ nome: "Mario", cognome: "Rossi" })

    const { result, rerender } = renderHookWithQueryClient(
      (props: ReturnType<typeof makeProps>) => useSelectedWorkerEditor(props),
      { initialProps: makeProps(initialRow) }
    )

    act(() => {
      result.current.setIsEditingHeader(true)
    })
    act(() => {
      result.current.setHeaderDraft((current) => ({
        ...current,
        nome: "Mario-EDIT",
        cognome: "Rossi-EDIT",
      }))
    })

    // Echo changes availability (different section) AND header server-side.
    const echoedRow = makeRow({
      nome: "Server Name",
      cognome: "Server Surname",
      vincoli_orari_disponibilita: "qualcosa di nuovo",
    })
    rerender(makeProps(echoedRow))

    expect(result.current.headerDraft.nome).toBe("Mario-EDIT")
    expect(result.current.headerDraft.cognome).toBe("Rossi-EDIT")
    // And availability (not in edit mode) DID resync.
    expect(result.current.availabilityDraft.vincoli_orari_disponibilita).toBe(
      "qualcosa di nuovo"
    )
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
