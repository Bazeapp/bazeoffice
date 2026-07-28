import {
  E2E_CEDOLINI_BULK,
  assertLocalKeysConfigured,
  getLocalSupabaseConfig,
} from "../constants"
import { getSupabaseAdmin } from "./supabase-admin"
import { readCedolinoStato, setCedolinoStato } from "./cedolini-mutations"

export async function readReminderFlag(cedolinoId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("mesi_lavorati")
    .select("check_reminder_pagamento_inviato")
    .eq("id", cedolinoId)
    .maybeSingle()

  if (error) {
    throw new Error(`E2E readReminderFlag failed for ${cedolinoId}: ${error.message}`)
  }

  const row = data as { check_reminder_pagamento_inviato: boolean | null } | null
  return row?.check_reminder_pagamento_inviato ?? null
}

export async function setReminderFlag(cedolinoId: string, value: boolean) {
  assertLocalKeysConfigured()
  const { VITE_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY } = getLocalSupabaseConfig()

  const response = await fetch(
    `${VITE_SUPABASE_URL}/rest/v1/mesi_lavorati?id=eq.${cedolinoId}`,
    {
      method: "PATCH",
      headers: {
        apikey: LOCAL_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${LOCAL_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        check_reminder_pagamento_inviato: value,
        aggiornato_il: new Date().toISOString(),
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `E2E setReminderFlag failed for ${cedolinoId}: HTTP ${response.status} ${body}`,
    )
  }
}

export type CedolinoCheckResultSnapshot = {
  id: string
  status: string
  warnings: unknown[]
  runId: string
}

/** Latest check-result row for a mese (by parent run started_at). */
export async function readLatestCheckResultForMese(
  meseLavorativoId: string,
): Promise<CedolinoCheckResultSnapshot | null> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("cedolino_check_results")
    .select("id, status, warnings, run_id, cedolino_check_runs!inner(started_at)")
    .eq("mese_lavorativo_id", meseLavorativoId)
    .order("started_at", { ascending: false, foreignTable: "cedolino_check_runs" })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(
      `E2E readLatestCheckResultForMese failed for ${meseLavorativoId}: ${error.message}`,
    )
  }
  if (!data) return null

  const row = data as {
    id: string
    status: string
    warnings: unknown[] | null
    run_id: string
  }
  return {
    id: row.id,
    status: row.status,
    warnings: row.warnings ?? [],
    runId: row.run_id,
  }
}

export async function deleteCheckRunsForMonth(yearMonth: string) {
  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from("cedolino_check_runs")
    .delete()
    .eq("year_month", yearMonth)

  if (error) {
    throw new Error(`E2E deleteCheckRunsForMonth failed: ${error.message}`)
  }
}

export async function deleteBulkJobsForMonth(yearMonth: string) {
  const admin = getSupabaseAdmin()
  const { error } = await admin
    .from("cedolino_bulk_jobs")
    .delete()
    .eq("year_month", yearMonth)

  if (error) {
    throw new Error(`E2E deleteBulkJobsForMonth failed: ${error.message}`)
  }
}

export async function setCedolinoAttachment(
  cedolinoId: string,
  cedolino: unknown[] | null,
) {
  assertLocalKeysConfigured()
  const { VITE_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY } = getLocalSupabaseConfig()

  const response = await fetch(
    `${VITE_SUPABASE_URL}/rest/v1/mesi_lavorati?id=eq.${cedolinoId}`,
    {
      method: "PATCH",
      headers: {
        apikey: LOCAL_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${LOCAL_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        cedolino,
        aggiornato_il: new Date().toISOString(),
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `E2E setCedolinoAttachment failed for ${cedolinoId}: HTTP ${response.status} ${body}`,
    )
  }
}

export async function updateCheckResultStatus(
  resultId: string,
  status: "ok" | "warning" | "error",
  warnings: unknown[] = [],
) {
  assertLocalKeysConfigured()
  const { VITE_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY } = getLocalSupabaseConfig()

  const response = await fetch(
    `${VITE_SUPABASE_URL}/rest/v1/cedolino_check_results?id=eq.${resultId}`,
    {
      method: "PATCH",
      headers: {
        apikey: LOCAL_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${LOCAL_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        status,
        warnings,
        checked_at: new Date().toISOString(),
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `E2E updateCheckResultStatus failed for ${resultId}: HTTP ${response.status} ${body}`,
    )
  }
}

function pdfAttachment() {
  return [
    {
      name: "cedpag-example.pdf",
      path: E2E_CEDOLINI_BULK.storagePdf24h,
      type: "application/pdf",
    },
  ]
}

/** Restore bulk Controlli/Pagamenti fixture rows after mutating specs. */
export async function resetCedoliniBulkFixture() {
  const { controlli, pagamenti, checkRun, checkResults, warningCategories } =
    E2E_CEDOLINI_BULK

  await deleteBulkJobsForMonth(checkRun.yearMonth)
  await deleteCheckRunsForMonth(checkRun.yearMonth)

  await Promise.all([
    setCedolinoStato(controlli.prontoCandidate.id, controlli.prontoCandidate.stato),
    setCedolinoStato(controlli.oreMismatch.id, controlli.oreMismatch.stato),
    setCedolinoStato(controlli.eventiPresenze.id, controlli.eventiPresenze.stato),
    setCedolinoStato(controlli.urlMissing.id, controlli.urlMissing.stato),
    setCedolinoStato(controlli.pagaOraria.id, controlli.pagaOraria.stato),
    setCedolinoStato(controlli.pagamentoStripe.id, controlli.pagamentoStripe.stato),
    setCedolinoStato(controlli.noteCasiParticolari.id, controlli.noteCasiParticolari.stato),
    setCedolinoStato(controlli.chiusuraExcluded.id, controlli.chiusuraExcluded.stato),
    setReminderFlag(pagamenti.reminderDaFare.id, pagamenti.reminderDaFare.checkReminderInviato),
    setReminderFlag(pagamenti.reminderFatto.id, pagamenti.reminderFatto.checkReminderInviato),
  ])

  await Promise.all([
    setCedolinoAttachment(controlli.prontoCandidate.id, pdfAttachment()),
    setCedolinoAttachment(controlli.urlMissing.id, null),
    setCedolinoAttachment(controlli.pagaOraria.id, pdfAttachment()),
    setCedolinoAttachment(controlli.pagamentoStripe.id, pdfAttachment()),
    setCedolinoAttachment(controlli.noteCasiParticolari.id, pdfAttachment()),
  ])

  assertLocalKeysConfigured()
  const { VITE_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY } = getLocalSupabaseConfig()
  const headers = {
    apikey: LOCAL_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${LOCAL_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  }

  const eligibleCount = E2E_CEDOLINI_BULK.analisiEligibleIds.length
  const runResponse = await fetch(`${VITE_SUPABASE_URL}/rest/v1/cedolino_check_runs`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      id: checkRun.id,
      year_month: checkRun.yearMonth,
      status: "completata",
      total_count: eligibleCount,
      checked_count: eligibleCount,
      started_at: new Date(Date.now() - 3_600_000).toISOString(),
      completed_at: new Date(Date.now() - 1_800_000).toISOString(),
    }),
  })
  if (!runResponse.ok) {
    throw new Error(`E2E reset check run insert failed: ${await runResponse.text()}`)
  }

  const resultRows = [
    {
      id: checkResults.ok,
      mese_lavorativo_id: controlli.prontoCandidate.id,
      status: "ok",
      warnings: [] as unknown[],
    },
    {
      id: checkResults.oreMismatch,
      mese_lavorativo_id: controlli.oreMismatch.id,
      status: "warning",
      warnings: [
        {
          category: warningCategories.oreNonCoerenti,
          message: "E2E: ore PDF (24) diverse dalle presenze (20).",
        },
      ],
    },
    {
      id: checkResults.eventi,
      mese_lavorativo_id: controlli.eventiPresenze.id,
      status: "warning",
      warnings: [
        {
          category: warningCategories.eventiPresenze,
          message: "E2E: presenza con evento overtime.",
          details: { eventi: ["overtime"] },
        },
      ],
    },
    {
      id: checkResults.pdfUrl,
      mese_lavorativo_id: controlli.urlMissing.id,
      status: "warning",
      warnings: [
        {
          category: warningCategories.cedolinoOPdf,
          message: "Nessun cedolino allegato e nessun cedolino_url disponibile.",
        },
      ],
    },
    {
      id: checkResults.pagaOraria,
      mese_lavorativo_id: controlli.pagaOraria.id,
      status: "warning",
      warnings: [
        {
          category: warningCategories.pagaOraria,
          message: "Paga oraria sul cedolino (9.5) diversa da quella del rapporto (12).",
          details: { pdf_paga_oraria: 9.5, rapporto_paga_oraria: 12, diff: 2.5 },
        },
      ],
    },
    {
      id: checkResults.pagamentoStripe,
      mese_lavorativo_id: controlli.pagamentoStripe.id,
      status: "warning",
      warnings: [
        {
          category: warningCategories.pagamentoStripe,
          message: "Link di pagamento mancante.",
          details: {
            reason: "missing_payment_link",
            ok: false,
            http_status: null,
            final_url: null,
          },
        },
      ],
    },
    {
      id: checkResults.noteCasiParticolari,
      mese_lavorativo_id: controlli.noteCasiParticolari.id,
      status: "warning",
      warnings: [
        {
          category: warningCategories.noteCasiParticolari,
          message: "Caso particolare segnalato: si.",
          details: { caso_particolare: "si", note: null },
        },
      ],
    },
  ]

  for (const row of resultRows) {
    const response = await fetch(`${VITE_SUPABASE_URL}/rest/v1/cedolino_check_results`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...row,
        run_id: checkRun.id,
        details: { source: "e2e-reset" },
        checked_at: new Date().toISOString(),
      }),
    })
    if (!response.ok) {
      throw new Error(`E2E reset check result insert failed: ${await response.text()}`)
    }
  }
}

export { readCedolinoStato, setCedolinoStato }
