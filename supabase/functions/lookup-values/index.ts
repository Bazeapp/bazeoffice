import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function serverMisconfigured(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type LookupValuesPayload = {
  entity_table?: string;
  entity_field?: string;
  is_active?: boolean;
};

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

  let payload: LookupValuesPayload = {};
  try {
    payload = (await req.json()) as LookupValuesPayload;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const supabase = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let query = supabase
    .from("lookup_values")
    .select(
      "id, entity_table, entity_field, value_key, value_label, sort_order, is_active, metadata",
      { count: "exact" }
    )
    .order("entity_table", { ascending: true })
    .order("entity_field", { ascending: true })
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("value_label", { ascending: true });

  if (payload.entity_table) {
    query = query.eq("entity_table", payload.entity_table);
  }

  if (payload.entity_field) {
    query = query.eq("entity_field", payload.entity_field);
  }

  if (typeof payload.is_active === "boolean") {
    query = query.eq("is_active", payload.is_active);
  }

  const { data, error, count } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      rows: data ?? [],
      total: count ?? 0,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
