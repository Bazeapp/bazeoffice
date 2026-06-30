import {
  E2E_ASSEGNAZIONE,
  E2E_PIPELINE,
  assertLocalKeysConfigured,
  getLocalSupabaseConfig,
} from "../constants"
import { getTodayUtcDateKey, getTomorrowUtcDateKey } from "./assegnazione"
import { getSupabaseAdmin } from "./supabase-admin"

export type ProcessoPatchField =
  | "stato_sales"
  | "stato_res"
  | "preventivo_firmato"
  | "tipo_lavoro"
  | "creato_il"
  | "recruiter_ricerca_e_selezione_id"
  | "data_assegnazione"
  | "numero_ricerca_attivata"

const STAGE_ID_TO_LABEL: Record<string, string> = {
  [E2E_PIPELINE.stages.warmLead]: E2E_PIPELINE.stageLabels.warmLead,
  [E2E_PIPELINE.stages.hotAttesaPrimoContatto]:
    E2E_PIPELINE.stageLabels.hotAttesaPrimoContatto,
  [E2E_PIPELINE.stages.hotIngresso]: E2E_PIPELINE.stageLabels.hotIngresso,
  [E2E_PIPELINE.stages.hotCallAttivazionePrenotata]: "HOT - Call attivazione prenotata",
  [E2E_PIPELINE.stages.coldRicercaFutura]: E2E_PIPELINE.stageLabels.coldRicercaFutura,
  [E2E_PIPELINE.stages.wonInAttesaConferma]:
    E2E_PIPELINE.stageLabels.wonInAttesaConferma,
}

function stageIdToSalesLabel(stageId: string) {
  return STAGE_ID_TO_LABEL[stageId] ?? stageId
}

function creatoIlForSeed(creatoRecent: boolean) {
  const date = new Date()
  date.setDate(date.getDate() - (creatoRecent ? 2 : 90))
  return date.toISOString()
}

export async function readProcessoStatoSales(processId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("processi_matching")
    .select("stato_sales")
    .eq("id", processId)
    .maybeSingle()

  if (error) {
    throw new Error(
      `E2E readProcessoStatoSales failed for ${processId}: ${error.message}`,
    )
  }

  const row = data as { stato_sales: string | null } | null
  return row?.stato_sales ?? null
}

export async function setProcessoField(
  processId: string,
  field: ProcessoPatchField,
  value: string | boolean | number | string[] | null,
) {
  assertLocalKeysConfigured()
  const { VITE_SUPABASE_URL, LOCAL_SERVICE_ROLE_KEY } = getLocalSupabaseConfig()

  const response = await fetch(
    `${VITE_SUPABASE_URL}/rest/v1/processi_matching?id=eq.${processId}`,
    {
      method: "PATCH",
      headers: {
        apikey: LOCAL_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${LOCAL_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        [field]: value,
        aggiornato_il: new Date().toISOString(),
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `E2E processo mutation failed (${field}=${String(value)}): HTTP ${response.status} ${body}`,
    )
  }
}

export async function readProcessoAssegnazioneFields(processId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("processi_matching")
    .select("stato_res, data_assegnazione, recruiter_ricerca_e_selezione_id")
    .eq("id", processId)
    .maybeSingle()

  if (error) {
    throw new Error(
      `E2E readProcessoAssegnazioneFields failed for ${processId}: ${error.message}`,
    )
  }

  const row = data as {
    stato_res: string | null
    data_assegnazione: string | null
    recruiter_ricerca_e_selezione_id: string | null
  } | null

  return {
    statoRes: row?.stato_res ?? null,
    dataAssegnazione: row?.data_assegnazione?.slice(0, 10) ?? null,
    recruiterId: row?.recruiter_ricerca_e_selezione_id ?? null,
  }
}

/** Restore all seeded assegnazione processi to their db reset state. */
export async function resetAssegnazioneFixture() {
  const today = getTodayUtcDateKey()
  const tomorrow = getTomorrowUtcDateKey()
  const { recruiter, sales } = E2E_ASSEGNAZIONE.operatori
  const {
    unassignedNuova,
    unassignedWithRecruiter,
    unassignedSostituzione,
    assignedToday,
    assignedTomorrow,
  } = E2E_ASSEGNAZIONE.processi

  await Promise.all([
    setProcessoField(unassignedNuova.id, "stato_res", "da assegnare"),
    setProcessoField(unassignedNuova.id, "recruiter_ricerca_e_selezione_id", null),
    setProcessoField(unassignedNuova.id, "data_assegnazione", null),
    setProcessoField(unassignedNuova.id, "numero_ricerca_attivata", 1),

    setProcessoField(unassignedWithRecruiter.id, "stato_res", "da assegnare"),
    setProcessoField(
      unassignedWithRecruiter.id,
      "recruiter_ricerca_e_selezione_id",
      recruiter.id,
    ),
    setProcessoField(unassignedWithRecruiter.id, "data_assegnazione", null),
    setProcessoField(unassignedWithRecruiter.id, "numero_ricerca_attivata", 1),

    setProcessoField(unassignedSostituzione.id, "stato_res", "da assegnare"),
    setProcessoField(unassignedSostituzione.id, "recruiter_ricerca_e_selezione_id", null),
    setProcessoField(unassignedSostituzione.id, "data_assegnazione", null),
    setProcessoField(unassignedSostituzione.id, "numero_ricerca_attivata", 2),

    setProcessoField(assignedToday.id, "stato_res", "fare ricerca"),
    setProcessoField(assignedToday.id, "recruiter_ricerca_e_selezione_id", recruiter.id),
    setProcessoField(assignedToday.id, "data_assegnazione", today),
    setProcessoField(assignedToday.id, "numero_ricerca_attivata", 1),

    setProcessoField(assignedTomorrow.id, "stato_res", "fare ricerca"),
    setProcessoField(assignedTomorrow.id, "recruiter_ricerca_e_selezione_id", sales.id),
    setProcessoField(assignedTomorrow.id, "data_assegnazione", tomorrow),
    setProcessoField(assignedTomorrow.id, "numero_ricerca_attivata", 2),
  ])
}

/** Restore all seeded pipeline processi to their db reset state. */
export async function resetPipelineFixture() {
  await Promise.all(
    Object.values(E2E_PIPELINE.processi).map(async (processo) => {
      const creatoIl = creatoIlForSeed(processo.creatoRecent)
      await Promise.all([
        setProcessoField(
          processo.id,
          "stato_sales",
          stageIdToSalesLabel(processo.stage),
        ),
        setProcessoField(processo.id, "preventivo_firmato", processo.preventivoAccettato),
        setProcessoField(processo.id, "tipo_lavoro", [processo.tipoLavoro]),
        setProcessoField(processo.id, "creato_il", creatoIl),
      ])
    }),
  )
}
