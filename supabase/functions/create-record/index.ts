import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SupportedTable =
  | "famiglie"
  | "lavoratori"
  | "documenti_lavoratori"
  | "esperienze_lavoratori"
  | "referenze_lavoratori"
  | "processi_matching";

type CreateRecordPayload = {
  table?: SupportedTable;
  values?: Record<string, unknown>;
};

const SUPPORTED_TABLES = new Set<SupportedTable>([
  "famiglie",
  "lavoratori",
  "documenti_lavoratori",
  "esperienze_lavoratori",
  "referenze_lavoratori",
  "processi_matching",
]);

const PROTECTED_FIELDS_BY_TABLE: Record<SupportedTable, Set<string>> = {
  famiglie: new Set(["id", "creato_il", "aggiornato_il"]),
  lavoratori: new Set(["id", "creato_il", "aggiornato_il"]),
  documenti_lavoratori: new Set(["id", "creato_il", "aggiornato_il"]),
  esperienze_lavoratori: new Set(["id", "creato_il", "aggiornato_il"]),
  referenze_lavoratori: new Set(["id", "creato_il", "aggiornato_il"]),
  processi_matching: new Set(["id", "creato_il", "aggiornato_il"]),
};

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function serverError(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isSafeColumnName(field: string) {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field);
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
    return serverError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  let payload: CreateRecordPayload = {};
  try {
    payload = (await req.json()) as CreateRecordPayload;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const table = payload.table;
  const values = payload.values;

  if (!table || !SUPPORTED_TABLES.has(table)) {
    return badRequest("Invalid table");
  }
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return badRequest("values must be an object");
  }

  const entries = Object.entries(values);
  if (entries.length === 0) {
    return badRequest("values cannot be empty");
  }

  const protectedFields = PROTECTED_FIELDS_BY_TABLE[table];
  const sanitizedValues: Record<string, unknown> = {};

  for (const [field, value] of entries) {
    if (!isSafeColumnName(field)) {
      return badRequest(`Invalid field name: ${field}`);
    }
    if (protectedFields.has(field)) {
      return badRequest(`Field '${field}' is protected`);
    }
    sanitizedValues[field] = value;
  }

  const supabase = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: createdRecord, error: createError } = await supabase
    .from(table)
    .insert(sanitizedValues)
    .select("*")
    .single();

  if (createError) {
    return serverError(createError.message);
  }

  return new Response(
    JSON.stringify({
      table,
      row: createdRecord,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
