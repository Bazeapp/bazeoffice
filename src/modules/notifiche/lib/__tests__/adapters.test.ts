import { describe, expect, it } from "vitest"

import { adaptNotificaCounts, adaptNotificaList, adaptNotificaRow } from "../adapters"

const baseRow = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  actor_id: "33333333-3333-4333-8333-333333333333",
  actor_nome: "Giulia",
  actor_cognome: "Bianchi",
  type: "menzione" as const,
  comment_id: "44444444-4444-4444-8444-444444444444",
  entity_type: "candidatura" as const,
  entity_id: "55555555-5555-4555-8555-555555555555",
  body: "Ciao @[Nicolò Gori](22222222-2222-4222-8222-222222222222)",
  created_at: "2026-07-17T10:00:00.000Z",
}

describe("adaptNotificaRow", () => {
  it("maps non_letta when read_at and resolved_at are null", () => {
    const notifica = adaptNotificaRow(baseRow)
    expect(notifica.status).toBe("non_letta")
    expect(notifica.actor.name).toBe("Giulia Bianchi")
    expect(notifica.type).toBe("menzione")
  })

  it("maps letta when read_at is set", () => {
    const notifica = adaptNotificaRow({
      ...baseRow,
      read_at: "2026-07-17T11:00:00.000Z",
    })
    expect(notifica.status).toBe("letta")
  })

  it("maps risolta when resolved_at is set", () => {
    const notifica = adaptNotificaRow({
      ...baseRow,
      read_at: "2026-07-17T11:00:00.000Z",
      resolved_at: "2026-07-17T12:00:00.000Z",
    })
    expect(notifica.status).toBe("risolta")
  })

  it("falls back to Operatore when actor name is missing", () => {
    const notifica = adaptNotificaRow({
      ...baseRow,
      actor_nome: null,
      actor_cognome: null,
    })
    expect(notifica.actor.name).toBe("Operatore")
  })
})

describe("adaptNotificaCounts / adaptNotificaList", () => {
  it("adapts counts", () => {
    expect(adaptNotificaCounts({ unread: 2, da_risolvere: 4 })).toEqual({
      unread: 2,
      daRisolvere: 4,
    })
  })

  it("adapts list payload", () => {
    const result = adaptNotificaList({
      items: [baseRow],
      next_cursor: "cursor|id",
    })
    expect(result.items).toHaveLength(1)
    expect(result.nextCursor).toBe("cursor|id")
  })
})
