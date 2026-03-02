import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type UpdateProcessStatoSalesPayload = {
  process_id?: string;
  stato_sales?: string;
};

function toToken(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function notFound(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function serverMisconfigured(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return badRequest("Only POST is supported");
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRole) {
    return serverMisconfigured(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  let payload: UpdateProcessStatoSalesPayload = {};
  try {
    payload = (await req.json()) as UpdateProcessStatoSalesPayload;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const processId = payload.process_id?.trim();
  const requestedStatoSales = payload.stato_sales?.trim();
  if (!processId || !requestedStatoSales) {
    return badRequest("Missing process_id or stato_sales");
  }

  const supabase = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: validStatuses, error: statusError } = await supabase
    .from("lookup_values")
    .select("value_key, value_label")
    .eq("entity_table", "processi_matching")
    .eq("entity_field", "stato_sales")
    .eq("is_active", true);

  if (statusError) {
    return new Response(JSON.stringify({ error: statusError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const requestedToken = toToken(requestedStatoSales);
  const matchedStatus = (validStatuses ?? []).find((row) => {
    return (
      toToken(row.value_key) === requestedToken ||
      toToken(row.value_label) === requestedToken
    );
  });

  if (!matchedStatus?.value_key) {
    return badRequest("Invalid stato_sales");
  }

  const { data: processRow, error: processError } = await supabase
    .from("processi_matching")
    .select("id, stato_sales")
    .eq("id", processId)
    .maybeSingle();

  if (processError) {
    return new Response(JSON.stringify({ error: processError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!processRow) {
    return notFound("Processo non trovato");
  }

  const { data: updatedProcess, error: updateError } = await supabase
    .from("processi_matching")
    .update({
      old_stato_sales: processRow.stato_sales ?? null,
      stato_sales: matchedStatus.value_key,
      aggiornato_il: new Date().toISOString(),
    })
    .eq("id", processId)
    .select("id, stato_sales")
    .single();

  if (updateError) {
    return new Response(JSON.stringify({ error: updateError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      id: updatedProcess.id,
      stato_sales: updatedProcess.stato_sales,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
