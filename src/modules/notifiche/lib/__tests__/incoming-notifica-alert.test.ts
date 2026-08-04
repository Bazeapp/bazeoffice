import { describe, expect, it } from "vitest"

import {
  incomingNotificaToastCopy,
  isIncomingNotificaInsert,
} from "../incoming-notifica-alert"

describe("isIncomingNotificaInsert", () => {
  it("accepts notifiche INSERT events with a new row", () => {
    expect(
      isIncomingNotificaInsert({
        table: "notifiche",
        eventType: "INSERT",
        newRow: { type: "menzione" },
        oldRow: null,
      }),
    ).toBe(true)
  })

  it("rejects updates and non-notifiche tables", () => {
    expect(
      isIncomingNotificaInsert({
        table: "notifiche",
        eventType: "UPDATE",
        newRow: { type: "menzione" },
        oldRow: null,
      }),
    ).toBe(false)
    expect(
      isIncomingNotificaInsert({
        table: "commenti",
        eventType: "INSERT",
        newRow: { type: "menzione" },
        oldRow: null,
      }),
    ).toBe(false)
  })
})

describe("incomingNotificaToastCopy", () => {
  it("builds menzione and risposta copy", () => {
    expect(incomingNotificaToastCopy("menzione")).toEqual({
      title: "Nuova menzione",
      description: "Qualcuno ti ha menzionato",
    })
    expect(incomingNotificaToastCopy("risposta_thread")).toEqual({
      title: "Nuova risposta",
      description: "Qualcuno ha risposto nel tuo thread",
    })
  })
})
