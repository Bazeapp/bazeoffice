/**
 * Tier 2 draft-resync regression tests.
 *
 * Guards against the class of bug audited in
 * `docs/audits/audit-draft-resync.md` (Tier 2 findings 4-8): a useEffect
 * that resyncs a local draft from server state on every prop change wipes
 * in-progress user edits when a realtime echo arrives.
 *
 * Each test renders a tiny inline component that reproduces the resync
 * pattern + the new guard (isEditing flag, identity-pin, or dirty ref)
 * and asserts the draft survives a sibling-field realtime echo.
 */
import * as React from "react"
import { describe, it, expect } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { renderWithProviders } from "./test-utils"

// ---------------------------------------------------------------------------
// Pattern A: isEditing flag (worker-pipeline-summary-cards)
// ---------------------------------------------------------------------------

type ServerAddress = { via: string; cap: string }

function AddressCard({ server }: { server: ServerAddress }) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [draft, setDraft] = React.useState({ via: server.via, cap: server.cap })

  React.useEffect(() => {
    // Skip resync while editing: a realtime echo on a sibling field would
    // otherwise wipe the user's in-progress input.
    if (isEditing) return
    setDraft({ via: server.via, cap: server.cap })
  }, [isEditing, server.via, server.cap])

  return (
    <div>
      <button type="button" onClick={() => setIsEditing((v) => !v)}>
        toggle
      </button>
      <input
        aria-label="via"
        value={draft.via}
        onChange={(e) => setDraft((c) => ({ ...c, via: e.target.value }))}
      />
      <input
        aria-label="cap"
        value={draft.cap}
        onChange={(e) => setDraft((c) => ({ ...c, cap: e.target.value }))}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pattern B: identity-pin (selection-details-card, scheda-colloquio-panel,
// assunzioni-detail-sheet `practiceDraft`)
// ---------------------------------------------------------------------------

type ServerRow = { id: string; nota: string; stato: string }

function IdentityPinnedDraft({ row }: { row: ServerRow }) {
  const [draft, setDraft] = React.useState({ nota: row.nota, stato: row.stato })

  React.useEffect(() => {
    // Identity-pin: only rebuild when a different record is loaded, not on
    // every field-level realtime echo.
    setDraft({ nota: row.nota, stato: row.stato })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.id])

  return (
    <div>
      <input
        aria-label="nota"
        value={draft.nota}
        onChange={(e) => setDraft((c) => ({ ...c, nota: e.target.value }))}
      />
      <span data-testid="stato">{draft.stato}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pattern C: per-field dirty ref (onboarding-context-card)
// ---------------------------------------------------------------------------

type ServerCard = { id: string; dataCall: string; dataRicontatto: string }

function DirtyRefCard({ card }: { card: ServerCard }) {
  const [dataCall, setDataCall] = React.useState(card.dataCall)
  const [dataRicontatto, setDataRicontatto] = React.useState(card.dataRicontatto)
  const isEditingDataCallRef = React.useRef(false)
  const isEditingDataRicontattoRef = React.useRef(false)
  const previousIdRef = React.useRef(card.id)

  React.useEffect(() => {
    const idChanged = previousIdRef.current !== card.id
    if (idChanged) {
      previousIdRef.current = card.id
      isEditingDataCallRef.current = false
      isEditingDataRicontattoRef.current = false
    }
    if (!isEditingDataCallRef.current) setDataCall(card.dataCall)
    if (!isEditingDataRicontattoRef.current) setDataRicontatto(card.dataRicontatto)
  }, [card.id, card.dataCall, card.dataRicontatto])

  return (
    <div>
      <input
        aria-label="data-call"
        value={dataCall}
        onChange={(e) => {
          isEditingDataCallRef.current = true
          setDataCall(e.target.value)
        }}
      />
      <input
        aria-label="data-ricontatto"
        value={dataRicontatto}
        onChange={(e) => {
          isEditingDataRicontattoRef.current = true
          setDataRicontatto(e.target.value)
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pattern D: derived-from-prop (onboarding-card — dropped useState mirrors)
// ---------------------------------------------------------------------------

function DerivedFromProp({
  card,
  onChange,
}: {
  card: { provincia: string }
  onChange: (next: string) => void
}) {
  // No useState mirror: input value comes straight from the prop.
  // A realtime echo on `card.provincia` shows up immediately; there's no
  // "in-progress draft" to wipe.
  return (
    <select
      aria-label="provincia"
      value={card.provincia}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">—</option>
      <option value="MI">MI</option>
      <option value="TO">TO</option>
      <option value="RM">RM</option>
    </select>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Tier 2 draft-resync guards", () => {
  it("worker-pipeline-summary-cards pattern: isEditing flag preserves draft during sibling echo", async () => {
    const user = userEvent.setup()
    const { rerender } = renderWithProviders(
      <AddressCard server={{ via: "Roma 1", cap: "20100" }} />
    )

    // Enter edit mode.
    await user.click(screen.getByRole("button", { name: /toggle/i }))

    // Type a new value in `via`.
    const via = screen.getByLabelText("via") as HTMLInputElement
    await user.clear(via)
    await user.type(via, "Roma 999")
    expect(via.value).toBe("Roma 999")

    // Realtime echo on a sibling field (`cap`).
    rerender(<AddressCard server={{ via: "Roma 1", cap: "20200" }} />)

    // BUG would be: via reset to "Roma 1". With the guard, draft is preserved.
    expect((screen.getByLabelText("via") as HTMLInputElement).value).toBe("Roma 999")
  })

  it("worker-pipeline-summary-cards pattern: leaving edit mode resyncs from server", async () => {
    const user = userEvent.setup()
    const { rerender } = renderWithProviders(
      <AddressCard server={{ via: "Roma 1", cap: "20100" }} />
    )

    // Server change while not editing — draft should follow.
    rerender(<AddressCard server={{ via: "Milano 2", cap: "20200" }} />)
    expect((screen.getByLabelText("via") as HTMLInputElement).value).toBe("Milano 2")

    // Enter edit mode, type, then exit edit mode after a new server value.
    await user.click(screen.getByRole("button", { name: /toggle/i }))
    const via = screen.getByLabelText("via") as HTMLInputElement
    await user.clear(via)
    await user.type(via, "Draft")
    rerender(<AddressCard server={{ via: "Server 3", cap: "30000" }} />)
    expect((screen.getByLabelText("via") as HTMLInputElement).value).toBe("Draft")

    // Leave edit mode → next render resyncs.
    await user.click(screen.getByRole("button", { name: /toggle/i }))
    rerender(<AddressCard server={{ via: "Server 3", cap: "30000" }} />)
    expect((screen.getByLabelText("via") as HTMLInputElement).value).toBe("Server 3")
  })

  it("selection-details-card / scheda-colloquio-panel pattern: identity-pin preserves draft", async () => {
    const user = userEvent.setup()
    const { rerender } = renderWithProviders(
      <IdentityPinnedDraft row={{ id: "sel-1", nota: "original", stato: "aperta" }} />
    )

    // Type into `nota`.
    const nota = screen.getByLabelText("nota") as HTMLInputElement
    await user.clear(nota)
    await user.type(nota, "scratch note")

    // Realtime echo on a sibling field (`stato`) of the same record — id unchanged.
    rerender(
      <IdentityPinnedDraft row={{ id: "sel-1", nota: "original", stato: "chiusa" }} />
    )

    // BUG would be: nota reset to "original". With identity-pin, preserved.
    expect((screen.getByLabelText("nota") as HTMLInputElement).value).toBe("scratch note")
  })

  it("identity-pin: switching records resyncs the draft", () => {
    const { rerender } = renderWithProviders(
      <IdentityPinnedDraft row={{ id: "sel-1", nota: "A", stato: "aperta" }} />
    )
    expect((screen.getByLabelText("nota") as HTMLInputElement).value).toBe("A")

    rerender(
      <IdentityPinnedDraft row={{ id: "sel-2", nota: "B", stato: "aperta" }} />
    )
    expect((screen.getByLabelText("nota") as HTMLInputElement).value).toBe("B")
  })

  it("assunzioni-detail-sheet practiceDraft pattern: identity-pin on (card.id, rapporto.id) survives realtime echo", async () => {
    // Same identity-pin pattern as Pattern B, reused with a different id.
    const user = userEvent.setup()
    const { rerender } = renderWithProviders(
      <IdentityPinnedDraft row={{ id: "card-1", nota: "id_inps_123", stato: "draft" }} />
    )

    const inps = screen.getByLabelText("nota") as HTMLInputElement
    await user.clear(inps)
    await user.type(inps, "id_inps_typing")

    // Realtime echo on tipo_contratto (a sibling of practiceDraft sources).
    rerender(
      <IdentityPinnedDraft
        row={{ id: "card-1", nota: "id_inps_123", stato: "indeterminato" }}
      />
    )
    expect((screen.getByLabelText("nota") as HTMLInputElement).value).toBe("id_inps_typing")
  })

  it("onboarding-context-card pattern: per-field dirty ref preserves in-progress field, resyncs others", async () => {
    const user = userEvent.setup()
    const { rerender } = renderWithProviders(
      <DirtyRefCard card={{ id: "c-1", dataCall: "2026-01-01T10:00", dataRicontatto: "2026-02-01" }} />
    )

    // User types into data-call (sets dirty ref).
    const dataCall = screen.getByLabelText("data-call") as HTMLInputElement
    await user.clear(dataCall)
    await user.type(dataCall, "2026-12-31T23:59")
    expect(dataCall.value).toBe("2026-12-31T23:59")

    // Realtime echo arrives: data_ricontatto changed on server, dataCall echo too.
    rerender(
      <DirtyRefCard
        card={{ id: "c-1", dataCall: "2026-01-01T10:00", dataRicontatto: "2026-03-15" }}
      />
    )

    // dataCall preserved (dirty), dataRicontatto resynced (clean).
    expect((screen.getByLabelText("data-call") as HTMLInputElement).value).toBe(
      "2026-12-31T23:59"
    )
    expect((screen.getByLabelText("data-ricontatto") as HTMLInputElement).value).toBe(
      "2026-03-15"
    )
  })

  it("onboarding-context-card pattern: switching card id clears dirty refs and full resync", async () => {
    const user = userEvent.setup()
    const { rerender } = renderWithProviders(
      <DirtyRefCard card={{ id: "c-1", dataCall: "2026-01-01T10:00", dataRicontatto: "2026-02-01" }} />
    )
    const dataCall = screen.getByLabelText("data-call") as HTMLInputElement
    await user.clear(dataCall)
    await user.type(dataCall, "2026-12-31T23:59")

    // Different card loaded.
    rerender(
      <DirtyRefCard card={{ id: "c-2", dataCall: "2026-06-01T09:00", dataRicontatto: "2026-07-01" }} />
    )

    expect((screen.getByLabelText("data-call") as HTMLInputElement).value).toBe(
      "2026-06-01T09:00"
    )
    expect((screen.getByLabelText("data-ricontatto") as HTMLInputElement).value).toBe(
      "2026-07-01"
    )
  })

  it("onboarding-card pattern: dropping the useState mirror makes the field directly reflect prop changes", async () => {
    const user = userEvent.setup()
    let lastValue = "MI"
    const onChange = (next: string) => {
      lastValue = next
    }

    const { rerender } = renderWithProviders(
      <DerivedFromProp card={{ provincia: "MI" }} onChange={onChange} />
    )

    const select = screen.getByLabelText("provincia") as HTMLSelectElement
    expect(select.value).toBe("MI")

    await user.selectOptions(select, "TO")
    expect(lastValue).toBe("TO")

    // Server confirms: prop updates → input reflects it (no stale local mirror).
    rerender(<DerivedFromProp card={{ provincia: "TO" }} onChange={onChange} />)
    expect((screen.getByLabelText("provincia") as HTMLSelectElement).value).toBe("TO")

    // Realtime echo from another tab — value changes → reflected immediately.
    rerender(<DerivedFromProp card={{ provincia: "RM" }} onChange={onChange} />)
    expect((screen.getByLabelText("provincia") as HTMLSelectElement).value).toBe("RM")
  })
})
