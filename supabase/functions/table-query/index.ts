import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function serverMisconfigured(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type SupportedTable =
  | "famiglie"
  | "lavoratori"
  | "processi_matching"
  | "lookup_values";

type QuerySort = {
  field: string;
  ascending?: boolean;
};

type QueryPayload = {
  table: SupportedTable;
  select?: string[];
  limit?: number;
  offset?: number;
  orderBy?: QuerySort[];
};

const ALLOWED_FIELDS: Record<SupportedTable, string[]> = {
  famiglie: [
    "id",
    "nome",
    "cognome",
    "email",
    "telefono",
    "data_call_prenotata",
    "preventivi",
    "base_codice_otp",
    "lavoratore_match",
    "rapporti_lavorativi",
    "creato_il",
    "aggiornato_il",
  ],
  lavoratori: [
    "id",
    "nome",
    "cognome",
    "disponibilita",
    "stato_lavoratore",
    "creato_il",
    "aggiornato_il",
  ],
  processi_matching: [
    "id",
    "titolo_annuncio",
    "referente_ricerca_e_selezione_id",
    "recruiter_ricerca_e_selezione_id",
    "stato_res",
    "creato_il",
    "aggiornato_il",
  ],
  lookup_values: [
    "id",
    "entity_table",
    "entity_field",
    "value_key",
    "value_label",
    "sort_order",
    "is_active",
    "metadata",
  ],
};

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizeFields(tableName: SupportedTable, fields: string[]) {
  const allowed = new Set(ALLOWED_FIELDS[tableName]);
  return fields.filter((field) => allowed.has(field));
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
    return badRequest("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  let payload: QueryPayload;
  try {
    payload = (await req.json()) as QueryPayload;
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!payload.table || !(payload.table in ALLOWED_FIELDS)) {
    return badRequest("Invalid or unsupported table");
  }

  const requestedFields = payload.select ?? [];
  const wantsAllFields =
    requestedFields.length === 0 || requestedFields.includes("*");
  const selectFields = wantsAllFields
    ? ["*"]
    : sanitizeFields(payload.table, requestedFields);
  if (!wantsAllFields && selectFields.length === 0) {
    return badRequest("No valid fields in 'select'");
  }

  const limit = Math.max(1, Math.min(payload.limit ?? 200, 500));
  const offset = Math.max(0, payload.offset ?? 0);
  const orderBy = payload.orderBy ?? [];

  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let query = supabase
    .from(payload.table)
    .select(selectFields.join(","), { count: "exact" })
    .range(offset, offset + limit - 1);

  const allowedSortFields = new Set(ALLOWED_FIELDS[payload.table]);
  for (const sort of orderBy) {
    if (!allowedSortFields.has(sort.field)) continue;
    query = query.order(sort.field, { ascending: sort.ascending ?? true });
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
      limit,
      offset,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
