import {
  E2E_PIPELINE,
  assertLocalKeysConfigured,
  getLocalSupabaseConfig,
} from "../constants"
import { getSupabaseAdmin } from "./supabase-admin"

export type ProcessoPatchField =
  | "stato_sales"
  | "preventivo_firmato"
  | "tipo_lavoro"
  | "creato_il"

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
  value: string | boolean | string[] | null,
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
