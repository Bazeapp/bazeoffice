import {
  E2E_TICKET_CUSTOMER,
  E2E_TICKET_CUSTOMER_FIXTURE_IDS,
  E2E_TICKET_PAYROLL,
  E2E_TICKET_PAYROLL_FIXTURE_IDS,
  assertLocalKeysConfigured,
  getLocalSupabaseConfig,
} from "../constants"
import { getSupabaseAdmin } from "./supabase-admin"

export async function readTicketStato(ticketId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("ticket")
    .select("stato")
    .eq("id", ticketId)
    .maybeSingle()

  if (error) {
    throw new Error(`E2E readTicketStato failed for ${ticketId}: ${error.message}`)
  }

  const row = data as { stato: string | null } | null
  return row?.stato ?? null
}

export async function setTicketStato(ticketId: string, stato: string | null) {
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
      stato,
      aggiornato_il: new Date().toISOString(),
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `E2E ticket mutation failed (stato=${String(stato)}): HTTP ${response.status} ${body}`,
    )
  }
}

export async function deleteTicket(ticketId: string) {
  if (
    E2E_TICKET_CUSTOMER_FIXTURE_IDS.includes(ticketId) ||
    E2E_TICKET_PAYROLL_FIXTURE_IDS.includes(ticketId)
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
  await Promise.all(
    Object.values(E2E_TICKET_CUSTOMER.tickets).map((fixture) =>
      setTicketStato(fixture.id, fixture.stato),
    ),
  )
}

/** Restore payroll ticket board fixture rows to their db reset state. */
export async function resetTicketPayrollFixture() {
  await Promise.all(
    Object.values(E2E_TICKET_PAYROLL.tickets).map((fixture) =>
      setTicketStato(fixture.id, fixture.stato),
    ),
  )
}
