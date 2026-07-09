import {
  E2E_TICKET_CUSTOMER,
  E2E_TICKET_CUSTOMER_FIXTURE_IDS,
  E2E_TICKET_PAYROLL,
  E2E_TICKET_PAYROLL_FIXTURE_IDS,
  assertLocalKeysConfigured,
  getLocalSupabaseConfig,
} from "../constants"
import { getSupabaseAdmin } from "./supabase-admin"

type TicketFixturePatch = {
  stato?: string | null
  rapporto_id?: string | null
}

export async function readTicketStato(ticketId: string) {
  return readTicketField(ticketId, "stato")
}

export async function readTicketRapportoId(ticketId: string) {
  return readTicketField(ticketId, "rapporto_id")
}

export async function readTicketField(
  ticketId: string,
  field: "stato" | "rapporto_id",
) {
  const { data, error } = await getSupabaseAdmin()
    .from("ticket")
    .select(field)
    .eq("id", ticketId)
    .maybeSingle()

  if (error) {
    throw new Error(`E2E readTicketField(${field}) failed for ${ticketId}: ${error.message}`)
  }

  const row = data as Record<string, string | null> | null
  return row?.[field] ?? null
}

export async function setTicketStato(ticketId: string, stato: string | null) {
  await setTicketFields(ticketId, { stato })
}

export async function setTicketFields(ticketId: string, patch: TicketFixturePatch) {
  assertLocalKeysConfigured()
  const { VITE_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY } = getLocalSupabaseConfig()

  const response = await fetch(`${VITE_SUPABASE_URL}/rest/v1/ticket?id=eq.${ticketId}`, {
    method: "PATCH",
    headers: {
      apikey: LOCAL_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${LOCAL_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      ...patch,
      aggiornato_il: new Date().toISOString(),
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `E2E ticket mutation failed (${JSON.stringify(patch)}): HTTP ${response.status} ${body}`,
    )
  }
}

export async function deleteTicket(ticketId: string) {
  if (
    (E2E_TICKET_CUSTOMER_FIXTURE_IDS as readonly string[]).includes(ticketId) ||
    (E2E_TICKET_PAYROLL_FIXTURE_IDS as readonly string[]).includes(ticketId)
  ) {
    return
  }

  const { error } = await getSupabaseAdmin().from("ticket").delete().eq("id", ticketId)
  if (error) {
    throw new Error(`E2E deleteTicket failed for ${ticketId}: ${error.message}`)
  }
}

/** Restore customer ticket board fixture rows to their db reset state. */
export async function resetTicketCustomerFixture() {
  const { chiusuraAperto, rapportoPresoInCarico, chiuso } = E2E_TICKET_CUSTOMER.tickets

  await Promise.all([
    setTicketFields(chiusuraAperto.id, {
      stato: chiusuraAperto.stato,
      rapporto_id: chiusuraAperto.rapportoId,
    }),
    setTicketFields(rapportoPresoInCarico.id, {
      stato: rapportoPresoInCarico.stato,
      rapporto_id: rapportoPresoInCarico.rapportoId,
    }),
    setTicketStato(chiuso.id, chiuso.stato),
  ])
}

/** Restore payroll ticket board fixture rows to their db reset state. */
export async function resetTicketPayrollFixture() {
  await Promise.all(
    Object.values(E2E_TICKET_PAYROLL.tickets).map((fixture) =>
      setTicketStato(fixture.id, fixture.stato),
    ),
  )
}
