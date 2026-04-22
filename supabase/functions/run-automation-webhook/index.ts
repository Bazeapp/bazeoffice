import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type AutomationId =
  | "finance-request-invoice-data"
  | "finance-invoice-payment"
  | "workflow-smart-matching"
  | "workflow-create-job-offer-seo"
  | "workflow-create-rapporto-after-match";

type RunAutomationWebhookPayload = {
  automationId?: AutomationId;
  recordId?: string;
  context?: Record<string, unknown>;
};

type AutomationConfig = {
  url: string;
};

const AUTOMATION_CONFIG: Record<AutomationId, AutomationConfig> = {
  "finance-request-invoice-data": {
    url: "https://hook.eu1.make.com/n9da858heakx93wfugrkyurxdo98dytk",
  },
  "finance-invoice-payment": {
    url: "https://hook.eu1.make.com/5n4i3i1jhohjs0dwhcy6k41x85dqnba2",
  },
  "workflow-smart-matching": {
    url: "https://europe-west3-baze-app-prod.cloudfunctions.net/smart-matching-v2",
  },
  "workflow-create-job-offer-seo": {
    url: "https://hook.eu1.make.com/ddfdcjxkyum49gb6h8izhmixz5wgg5mb",
  },
  "workflow-create-rapporto-after-match": {
    url: "https://hook.eu1.make.com/aq1sq4aa3tc6ujccbqq9dodx9pt3uxni",
  },
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function badRequest(message: string) {
  return jsonResponse(400, { error: message });
}

function toTrimmedString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => toTrimmedString(item))
    .filter((item): item is string => Boolean(item));
}

function buildSeoPositionLabel(processRow: Record<string, unknown>) {
  return [
    toTrimmedString(processRow.indirizzo_prova_via),
    toTrimmedString(processRow.indirizzo_prova_civico),
    toTrimmedString(processRow.indirizzo_prova_comune),
    toTrimmedString(processRow.indirizzo_prova_cap),
  ]
    .filter(Boolean)
    .join(" - ");
}

async function buildSeoAutomationRequestBody(
  supabase: ReturnType<typeof createClient>,
  recordId: string,
) {
  const { data: processRow, error } = await supabase
    .from("processi_matching")
    .select(`
      id,
      dettagli_o_specifiche_aggiuntive,
      mansioni_richieste,
      descrizione_lavoratore_ideale,
      offerta,
      tipo_lavoro,
      tipo_rapporto,
      orario_di_lavoro,
      paga_oraria,
      indirizzo_prova_provincia,
      indirizzo_prova_via,
      indirizzo_prova_civico,
      indirizzo_prova_comune,
      indirizzo_prova_cap
    `)
    .eq("id", recordId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!processRow) {
    throw new Error("Processo non trovato");
  }

  return [
    {
      processo_res_id: recordId,
      descrizione_ricerca_famiglia:
        toTrimmedString(processRow.dettagli_o_specifiche_aggiuntive) ??
        toTrimmedString(processRow.mansioni_richieste) ??
        toTrimmedString(processRow.descrizione_lavoratore_ideale) ??
        toTrimmedString(processRow.offerta) ??
        "",
      tipo_lavoro: toStringArray(processRow.tipo_lavoro),
      tipo_rapporto: toStringArray(processRow.tipo_rapporto),
      orario_di_lavoro: toTrimmedString(processRow.orario_di_lavoro) ?? "",
      paga_oraria: toTrimmedString(processRow.paga_oraria) ?? "",
      provincia: toTrimmedString(processRow.indirizzo_prova_provincia) ?? "",
      posizione_specifica_lavoro: buildSeoPositionLabel(processRow),
    },
  ];
}

async function buildAutomationRequestBody(
  automationId: AutomationId,
  recordId: string,
  context: Record<string, unknown>,
  supabase: ReturnType<typeof createClient> | null,
) {
  switch (automationId) {
    case "workflow-smart-matching":
      return {
        processo_matching_id: recordId,
        execution_mode: "v2.1",
        ...context,
      };
    case "workflow-create-job-offer-seo":
      if (!supabase) {
        throw new Error("Missing Supabase client for SEO workflow");
      }
      return await buildSeoAutomationRequestBody(supabase, recordId);
    default:
      return {
        record_id: recordId,
        ...context,
      };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return badRequest("Only POST is supported");
  }

  let payload: RunAutomationWebhookPayload = {};
  try {
    payload = (await req.json()) as RunAutomationWebhookPayload;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const automationId = payload.automationId;
  const recordId = payload.recordId?.trim();
  const context =
    payload.context && typeof payload.context === "object" && !Array.isArray(payload.context)
      ? payload.context
      : {};

  if (!automationId || !(automationId in AUTOMATION_CONFIG)) {
    return badRequest("Invalid automationId");
  }

  if (!recordId) {
    return badRequest("Missing recordId");
  }

  const config = AUTOMATION_CONFIG[automationId];
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase =
    url && serviceRole
      ? createClient(url, serviceRole, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : null;

  try {
    const requestBody = await buildAutomationRequestBody(
      automationId,
      recordId,
      context,
      supabase,
    );

    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return jsonResponse(500, {
        error: `Automation '${automationId}' failed`,
        status: response.status,
        body: responseText,
      });
    }

    return jsonResponse(200, {
      ok: true,
      automationId,
      recordId,
      responseBody: responseText,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse(500, {
      error: `Automation '${automationId}' failed`,
      message,
    });
  }
});
