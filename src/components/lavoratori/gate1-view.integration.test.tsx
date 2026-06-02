/**
 * Regression tests for the draft-resync guard added to `gate1-view.tsx`.
 *
 * Background: the `useEffect` around line 3742 used to call `setGateDraft`
 * unconditionally on every `selectedWorkerRow` change. A realtime echo (own
 * debounced save round-tripping back, or a colleague's edit on another tab)
 * would wipe in-progress edits across ~17 controlled inputs.
 *
 * The fix uses a `lastSyncedGateDraftRef` + per-field merge: a field is only
 * overwritten by the new server snapshot when the local draft value still
 * matches the previously synced server value (i.e. the user has NOT typed a
 * new value locally yet).
 *
 * Why a SIMPLIFIED test rather than rendering the real `Gate1View`:
 * `Gate1View` is ~5500 LOC and pulls in dozens of providers (Supabase,
 * realtime board sync, React Query hooks, Stripe, sonner, anagrafiche
 * lookups, lots of context hooks). Setting up enough mocks to render it in
 * isolation just to exercise one `useEffect` would be high-cost and brittle.
 * Instead we extract the exact resync pattern into a tiny inline component
 * and assert against its observable behavior. This mirrors the suggested
 * fallback in the task description.
 */
import * as React from "react"
import { act } from "react"
import { describe, expect, it } from "vitest"

import { renderWithProviders } from "@/test/test-utils"

// --- Same shape as gate1-view's `gateDraft` (subset, enough for the test) -
type GateDraft = {
  descrizionePubblica: string
  pagaOrariaRichiesta: string
  assessmentFeedback: string
  ratingAtteggiamento: string
}

type WorkerRow = {
  descrizione_pubblica?: string | null
  paga_oraria_richiesta?: string | null
  feedback_recruiter?: string | null
  rating_atteggiamento?: string | null
}

function asString(v: unknown): string {
  return v == null ? "" : String(v)
}

function buildSnapshot(row: WorkerRow | null): GateDraft {
  return {
    descrizionePubblica: asString(row?.descrizione_pubblica),
    pagaOrariaRichiesta: asString(row?.paga_oraria_richiesta),
    assessmentFeedback: asString(row?.feedback_recruiter),
    ratingAtteggiamento: asString(row?.rating_atteggiamento),
  }
}

/**
 * Inline component that mirrors the exact resync pattern now used in
 * `gate1-view.tsx` (see comment above `lastSyncedGateDraftRef`). Exposes the
 * current draft and a `setField` helper for the test.
 */
function GateDraftHarness({
  workerRow,
  workerId,
  onDraft,
  registerSetField,
}: {
  workerRow: WorkerRow | null
  workerId: string
  onDraft: (d: GateDraft) => void
  registerSetField: (fn: (key: keyof GateDraft, value: string) => void) => void
}) {
  const [gateDraft, setGateDraft] = React.useState<GateDraft>({
    descrizionePubblica: "",
    pagaOrariaRichiesta: "",
    assessmentFeedback: "",
    ratingAtteggiamento: "",
  })
  const lastSyncedGateDraftRef = React.useRef<GateDraft | null>(null)

  // Reset baseline on worker switch — matches the sibling effect in gate1-view.
  React.useEffect(() => {
    lastSyncedGateDraftRef.current = null
  }, [workerId])

  // The resync effect under test.
  React.useEffect(() => {
    const nextSnapshot = buildSnapshot(workerRow)
    const previousSynced = lastSyncedGateDraftRef.current
    lastSyncedGateDraftRef.current = nextSnapshot
    if (previousSynced === null) {
      setGateDraft(nextSnapshot)
      return
    }
    setGateDraft((current) => {
      let changed = false
      const merged: GateDraft = { ...current }
      ;(Object.keys(nextSnapshot) as Array<keyof GateDraft>).forEach((key) => {
        const previousValue = previousSynced[key]
        const nextValue = nextSnapshot[key]
        if (previousValue === nextValue) return
        if (current[key] !== previousValue) return // user edit pending
        merged[key] = nextValue
        changed = true
      })
      return changed ? merged : current
    })
  }, [workerRow])

  React.useEffect(() => {
    onDraft(gateDraft)
  }, [gateDraft, onDraft])

  React.useEffect(() => {
    registerSetField((key, value) => {
      setGateDraft((current) => ({ ...current, [key]: value }))
    })
  }, [registerSetField])

  return null
}

describe("gate1-view gateDraft resync — realtime echo regression", () => {
  it("preserves in-progress edits when the worker row changes (simulated remote echo)", () => {
    let latestDraft: GateDraft = {
      descrizionePubblica: "",
      pagaOrariaRichiesta: "",
      assessmentFeedback: "",
      ratingAtteggiamento: "",
    }
    let setField: (key: keyof GateDraft, value: string) => void = () => {}

    const initialRow: WorkerRow = {
      descrizione_pubblica: "Server descrizione",
      paga_oraria_richiesta: "9",
      feedback_recruiter: "ok",
      rating_atteggiamento: "3",
    }

    const { rerender } = renderWithProviders(
      <GateDraftHarness
        workerRow={initialRow}
        workerId="w1"
        onDraft={(d) => {
          latestDraft = d
        }}
        registerSetField={(fn) => {
          setField = fn
        }}
      />,
    )

    expect(latestDraft.descrizionePubblica).toBe("Server descrizione")

    // Simulate user typing into descrizionePubblica + pagaOrariaRichiesta.
    act(() => {
      setField("descrizionePubblica", "User typed text in progress")
      setField("pagaOrariaRichiesta", "11.5")
    })

    // Simulated realtime echo: another field changed server-side, but our
    // typed fields are still "dirty" (don't match previously-synced value).
    const echoedRow: WorkerRow = {
      ...initialRow,
      // Same descrizione/paga as before (still "Server descrizione" / "9")…
      feedback_recruiter: "feedback updated by colleague",
      rating_atteggiamento: "5",
    }
    rerender(
      <GateDraftHarness
        workerRow={echoedRow}
        workerId="w1"
        onDraft={(d) => {
          latestDraft = d
        }}
        registerSetField={(fn) => {
          setField = fn
        }}
      />,
    )

    // User's in-progress edits MUST survive.
    expect(latestDraft.descrizionePubblica).toBe("User typed text in progress")
    expect(latestDraft.pagaOrariaRichiesta).toBe("11.5")
    // Fields the user did NOT touch DID resync from the new snapshot.
    expect(latestDraft.assessmentFeedback).toBe("feedback updated by colleague")
    expect(latestDraft.ratingAtteggiamento).toBe("5")
  })

  it("re-syncs every field on worker switch (baseline reset path)", () => {
    let latestDraft: GateDraft = {
      descrizionePubblica: "",
      pagaOrariaRichiesta: "",
      assessmentFeedback: "",
      ratingAtteggiamento: "",
    }
    let setField: (key: keyof GateDraft, value: string) => void = () => {}

    const firstRow: WorkerRow = {
      descrizione_pubblica: "first worker text",
      paga_oraria_richiesta: "8",
      feedback_recruiter: "",
      rating_atteggiamento: "",
    }

    const { rerender } = renderWithProviders(
      <GateDraftHarness
        workerRow={firstRow}
        workerId="w1"
        onDraft={(d) => {
          latestDraft = d
        }}
        registerSetField={(fn) => {
          setField = fn
        }}
      />,
    )

    // User edits something on worker 1.
    act(() => {
      setField("descrizionePubblica", "dirty text on worker 1")
    })
    expect(latestDraft.descrizionePubblica).toBe("dirty text on worker 1")

    // Switch to worker 2 — the baseline ref is cleared, so a fresh sync runs.
    const secondRow: WorkerRow = {
      descrizione_pubblica: "second worker server text",
      paga_oraria_richiesta: "12",
      feedback_recruiter: "feedback 2",
      rating_atteggiamento: "4",
    }
    rerender(
      <GateDraftHarness
        workerRow={secondRow}
        workerId="w2"
        onDraft={(d) => {
          latestDraft = d
        }}
        registerSetField={(fn) => {
          setField = fn
        }}
      />,
    )

    expect(latestDraft.descrizionePubblica).toBe("second worker server text")
    expect(latestDraft.pagaOrariaRichiesta).toBe("12")
    expect(latestDraft.assessmentFeedback).toBe("feedback 2")
    expect(latestDraft.ratingAtteggiamento).toBe("4")
  })

  it("re-syncs unedited fields when the row changes (no dirty edits in flight)", () => {
    let latestDraft: GateDraft = {
      descrizionePubblica: "",
      pagaOrariaRichiesta: "",
      assessmentFeedback: "",
      ratingAtteggiamento: "",
    }

    const firstRow: WorkerRow = {
      descrizione_pubblica: "v1",
      paga_oraria_richiesta: "9",
      feedback_recruiter: "fb1",
      rating_atteggiamento: "3",
    }

    const { rerender } = renderWithProviders(
      <GateDraftHarness
        workerRow={firstRow}
        workerId="w1"
        onDraft={(d) => {
          latestDraft = d
        }}
        registerSetField={() => {}}
      />,
    )
    expect(latestDraft.descrizionePubblica).toBe("v1")

    // No user input — every field changes server-side. All should resync.
    const echoedRow: WorkerRow = {
      descrizione_pubblica: "v2",
      paga_oraria_richiesta: "10",
      feedback_recruiter: "fb2",
      rating_atteggiamento: "5",
    }
    rerender(
      <GateDraftHarness
        workerRow={echoedRow}
        workerId="w1"
        onDraft={(d) => {
          latestDraft = d
        }}
        registerSetField={() => {}}
      />,
    )

    expect(latestDraft).toEqual({
      descrizionePubblica: "v2",
      pagaOrariaRichiesta: "10",
      assessmentFeedback: "fb2",
      ratingAtteggiamento: "5",
    })
  })
})
