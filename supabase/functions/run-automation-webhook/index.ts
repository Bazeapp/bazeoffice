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
  | "workflow-create-whatsapp-text"
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
    url: "https://hook.eu1.make.com/a9ypx6tn63mtik4nycuvhjvfz6qibgy9",
  },
  "workflow-create-whatsapp-text": {
    url: "https://hook.eu1.make.com/a9ypx6tn63mtik4nycuvhjvfz6qibgy9",
  },
  "workflow-create-rapporto-after-match": {
    url: "https://hook.eu1.make.com/a9ypx6tn63mtik4nycuvhjvfz6qibgy9",
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

function toDisplayText(value: unknown) {
  if (Array.isArray(value)) {
    return toStringArray(value).join(", ");
  }

  return toTrimmedString(value) ?? "";
}

function hasDisplayText(value: unknown) {
  return Boolean(toDisplayText(value));
}

function equalsDisplayText(value: unknown, expected: string) {
  return toDisplayText(value).toLowerCase() === expected.toLowerCase();
}

function buildSeoPositionLabel(
  processRow: Record<string, unknown>,
  addressRow: Record<string, unknown> | null,
) {
  return [
    toTrimmedString(addressRow?.indirizzo_formattato),
    toTrimmedString(processRow.indirizzo_prova_via),
    toTrimmedString(processRow.indirizzo_prova_civico),
    toTrimmedString(addressRow?.citta) ??
      toTrimmedString(processRow.indirizzo_prova_comune),
    toTrimmedString(addressRow?.cap) ??
      toTrimmedString(processRow.indirizzo_prova_cap),
  ]
    .filter(Boolean)
    .join(" - ");
}

function buildWhatsappDescription(
  processRow: Record<string, unknown>,
  addressRow: Record<string, unknown> | null,
) {
  const tipoRapporto = toDisplayText(processRow.tipo_rapporto);
  const provincia =
    toTrimmedString(addressRow?.provincia) ??
    toTrimmedString(processRow.indirizzo_prova_provincia) ??
    "";
  const riferimentoPubblico =
    toTrimmedString(addressRow?.indirizzo_formattato) ??
    toTrimmedString(addressRow?.citta) ??
    toTrimmedString(processRow.indirizzo_prova_comune) ??
    "";
  const cap =
    toTrimmedString(addressRow?.cap) ??
    toTrimmedString(processRow.indirizzo_prova_cap) ??
    "";
  const descrizioneGiorniRiposo = toDisplayText(
    processRow.descrizione_richiesta_giorni_riposo,
  );
  const descrizioneTrasferte = toDisplayText(
    processRow.descrizione_richiesta_trasferte,
  );
  const descrizioneFerie = toDisplayText(processRow.descrizione_richiesta_ferie);
  const pagaOraria = toDisplayText(processRow.paga_oraria);
  const descrizioneAnimali = toDisplayText(processRow.descrizione_animali_in_casa);
  const patente = toDisplayText(processRow.patente);

  let description =
    `Il cliente è alla ricerca di una ${toDisplayText(processRow.tipo_lavoro)} ` +
    `per un rapporto di lavoro ${tipoRapporto}, idealmente dovrebbe lavorare di ` +
    `${toDisplayText(processRow.momento_disponibilita)}, nell'orario specifico ` +
    `${toDisplayText(processRow.orario_di_lavoro)}.\n\n` +
    `☀️Sono richiesti ${toDisplayText(processRow.numero_giorni_settimanali)} ` +
    `giorni di lavoro a settimana, per un totale di ${toDisplayText(processRow.ore_settimanale)} ` +
    `ore settimanali.`;

  if (equalsDisplayText(processRow.tipo_rapporto, "Convivente")) {
    description += descrizioneGiorniRiposo;
  }

  description +=
    `\n\n📍 La posizione lavorativa è a ${provincia}, con precisione in ${riferimentoPubblico} ` +
    `nel CAP ${cap}.` +
    `\n\n💪 Le mansioni richieste nello specifico sono: \n${toDisplayText(processRow.mansioni_richieste)}` +
    `\n Altri aspetti importanti da considerare: \n${toDisplayText(processRow.descrizione_lavoratore_ideale)}` +
    `\n\n🏡 Ecco una descrizione della casa: \n${toDisplayText(processRow.descrizione_casa)} ` +
    `La casa è di ${toDisplayText(processRow.metratura_casa)} metri quadri.` +
    `\n\n👨‍👩‍👧 Il nucleo familiare presente in casa è: \n${toDisplayText(processRow.nucleo_famigliare)}` +
    `\n\nEcco una descrizione del contesto della famiglia: \n${toDisplayText(processRow.appunti_generali_sul_cliente)}`;

  description += descrizioneAnimali
    ? `\n🐾 In casa ci sono animali: ${descrizioneAnimali}`
    : "\n🐾 Non ci sono animali in casa.";

  if (patente) {
    description += `\n🚗${patente}.`;
  }

  description += pagaOraria === "-"
    ? ` \n\n💰 La paga netta mensile è di ${toDisplayText(processRow.paga_mensile)}.`
    : ` \n\n💰 La paga netta oraria è di ${pagaOraria}, per un netto mensile  di ${
      toDisplayText(processRow.paga_mensile)
    }.`;

  if (
    hasDisplayText(processRow.descrizione_richiesta_trasferte) ||
    hasDisplayText(processRow.descrizione_richiesta_ferie)
  ) {
    description +=
      ` Dettagli extra: \n\n✈️ Trasferte: ${descrizioneTrasferte}` +
      `\n\n🥱 Giorni di riposo: ${descrizioneGiorniRiposo}` +
      `\n\n🏝 Ferie: ${descrizioneFerie}.`;
  }

  return description;
}

async function buildWhatsappTextAutomationRequestBody(
  supabase: any,
  recordId: string,
) {
  const { data: processRow, error } = await supabase
    .from("processi_matching")
    .select(`
      id,
      tipo_lavoro,
      tipo_rapporto,
      momento_disponibilita,
      orario_di_lavoro,
      numero_giorni_settimanali,
      ore_settimanale,
      descrizione_richiesta_giorni_riposo,
      indirizzo_prova_provincia,
      indirizzo_prova_via,
      indirizzo_prova_civico,
      indirizzo_prova_comune,
      indirizzo_prova_cap,
      mansioni_richieste,
      descrizione_lavoratore_ideale,
      descrizione_casa,
      metratura_casa,
      nucleo_famigliare,
      appunti_generali_sul_cliente,
      descrizione_animali_in_casa,
      patente,
      paga_oraria,
      paga_mensile,
      descrizione_richiesta_trasferte,
      descrizione_richiesta_ferie
    `)
    .eq("id", recordId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!processRow) {
    throw new Error("Processo non trovato");
  }

  const { data: addressRow, error: addressError } = await supabase
    .from("indirizzi")
    .select("cap, citta, provincia, indirizzo_formattato")
    .eq("entita_tabella", "processi_matching")
    .eq("entita_id", recordId)
    .in("tipo_indirizzo", ["luogo", "prova"])
    .order("tipo_indirizzo", { ascending: true })
    .order("aggiornato_il", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (addressError) {
    throw new Error(addressError.message);
  }

  const typedAddressRow = addressRow as Record<string, unknown> | null;
  const provincia =
    toTrimmedString(typedAddressRow?.provincia) ??
    toTrimmedString(processRow.indirizzo_prova_provincia) ??
    "";

  return {
    record_id: recordId,
    processo_res_id: recordId,
    descrizione_ricerca_famiglia: buildWhatsappDescription(
      processRow,
      typedAddressRow,
    ),
    tipo_lavoro: toStringArray(processRow.tipo_lavoro),
    tipo_rapporto: toStringArray(processRow.tipo_rapporto),
    orario_di_lavoro: toTrimmedString(processRow.orario_di_lavoro) ?? "",
    paga_oraria: toTrimmedString(processRow.paga_oraria) ?? "",
    provincia,
    posizione_specifica_lavoro: buildSeoPositionLabel(
      processRow,
      typedAddressRow,
    ),
  };
}

async function buildAutomationRequestBody(
  automationId: AutomationId,
  recordId: string,
  context: Record<string, unknown>,
  supabase: any | null,
) {
  switch (automationId) {
    case "workflow-smart-matching":
      return {
        processo_matching_id: recordId,
        execution_mode: "v2.1",
        ...context,
      };
    case "workflow-create-job-offer-seo":
    case "workflow-create-whatsapp-text":
      if (!supabase) {
        throw new Error("Missing Supabase client for announcement workflow");
      }
      return await buildWhatsappTextAutomationRequestBody(supabase, recordId);
    default:
      return {
        record_id: recordId,
        ...context,
      };
  }
}

function buildAutomationRequestUrl(
  automationId: AutomationId,
  baseUrl: string,
  recordId: string,
) {
  const url = new URL(baseUrl);

  if (automationId === "workflow-create-rapporto-after-match") {
    url.searchParams.set("record_id", recordId);
  }

  return url.toString();
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
    const requestUrl = buildAutomationRequestUrl(
      automationId,
      config.url,
      recordId,
    );

    const response = await fetch(requestUrl, {
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
