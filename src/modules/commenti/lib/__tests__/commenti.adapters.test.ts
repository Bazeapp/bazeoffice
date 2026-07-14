import { describe, expect, it } from "vitest"

import { adaptCommentRow } from "../../commenti.adapters"

describe("commenti.adapters", () => {
  it("maps an RPC row to a Comment with author pill precedence", () => {
    const comment = adaptCommentRow({
      id: "11111111-1111-4111-8111-111111111111",
      entity_type: "ricerca",
      entity_id: "22222222-2222-4222-8222-222222222222",
      thread_root_id: null,
      author_id: "33333333-3333-4333-8333-333333333333",
      author_nome: "Mario",
      author_cognome: "Rossi",
      author_ruolo: ["payroll", "recruiter"],
      author_attivo: true,
      body: "Nota su @Luigi Bianchi",
      comment_type: "free",
      created_at: "2026-07-14T08:00:00.000Z",
      reply_count: 0,
      is_unread: true,
    })

    expect(comment.author.name).toBe("Mario Rossi")
    expect(comment.author.rolePill).toBe("Recruiter")
    expect(comment.anchor).toEqual({
      entityType: "ricerca",
      entityId: "22222222-2222-4222-8222-222222222222",
    })
    expect(comment.body).toBe("Nota su @Luigi Bianchi")
    expect(comment.isUnread).toBe(true)
  })
})
