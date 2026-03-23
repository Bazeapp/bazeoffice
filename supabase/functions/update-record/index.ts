import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SupportedTable =
  | "famiglie"
  | "lavoratori"
  | "selezioni_lavoratori"
  | "documenti_lavoratori"
  | "esperienze_lavoratori"
  | "referenze_lavoratori"
  | "processi_matching";

type UpdateRecordPayload = {
  table?: SupportedTable;
  id?: string;
  patch?: Record<string, unknown>;
};

const SUPPORTED_TABLES = new Set<SupportedTable>([
  "famiglie",
  "lavoratori",
  "selezioni_lavoratori",
  "documenti_lavoratori",
  "esperienze_lavoratori",
  "referenze_lavoratori",
  "processi_matching",
]);

const PROTECTED_FIELDS_BY_TABLE: Record<SupportedTable, Set<string>> = {
  famiglie: new Set(["id", "creato_il"]),
  lavoratori: new Set(["id", "creato_il"]),
  selezioni_lavoratori: new Set(["id", "creato_il"]),
  documenti_lavoratori: new Set(["id", "creato_il"]),
  esperienze_lavoratori: new Set(["id", "creato_il"]),
  referenze_lavoratori: new Set(["id", "creato_il"]),
  processi_matching: new Set(["id", "creato_il"]),
};

const AUTO_UPDATED_AT_FIELD: Record<SupportedTable, string> = {
  famiglie: "aggiornato_il",
  lavoratori: "aggiornato_il",
  selezioni_lavoratori: "aggiornato_il",
  documenti_lavoratori: "aggiornato_il",
  esperienze_lavoratori: "aggiornato_il",
  referenze_lavoratori: "aggiornato_il",
  processi_matching: "aggiornato_il",
};

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

function serverError(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeToken(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
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

  let payload: UpdateRecordPayload = {};
  try {
    payload = (await req.json()) as UpdateRecordPayload;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const table = payload.table;
  const id = payload.id?.trim();
  const patch = payload.patch;

  if (!table || !SUPPORTED_TABLES.has(table)) {
    return badRequest("Invalid table");
  }
  if (!id) {
    return badRequest("Missing id");
  }
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return badRequest("patch must be an object");
  }

  const entries = Object.entries(patch);
  if (entries.length === 0) {
    return badRequest("patch cannot be empty");
  }

  const protectedFields = PROTECTED_FIELDS_BY_TABLE[table];
  const sanitizedPatch: Record<string, unknown> = {};

  for (const [field, value] of entries) {
    if (!isSafeColumnName(field)) {
      return badRequest(`Invalid field name: ${field}`);
    }
    if (protectedFields.has(field)) {
      return badRequest(`Field '${field}' is protected`);
    }
    sanitizedPatch[field] = value;
  }

  const supabase = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const currentRecordSelect =
    table === "processi_matching" ? "id, stato_sales" : "id";

  const { data: currentRecord, error: currentRecordError } = await supabase
    .from(table)
    .select(currentRecordSelect)
    .eq("id", id)
    .maybeSingle();

  if (currentRecordError) {
    return serverError(currentRecordError.message);
  }
  if (!currentRecord) {
    return notFound("Record not found");
  }

  // Process-level validation/derivations:
  if (table === "processi_matching" && "stato_sales" in sanitizedPatch) {
    const requestedToken = normalizeToken(sanitizedPatch.stato_sales);
    if (!requestedToken) {
      return badRequest("Invalid stato_sales");
    }

    const { data: validStatuses, error: statusesError } = await supabase
      .from("lookup_values")
      .select("value_key, value_label")
      .eq("entity_table", "processi_matching")
      .eq("entity_field", "stato_sales")
      .eq("is_active", true);

    if (statusesError) {
      return serverError(statusesError.message);
    }

    const matchedStatus = (validStatuses ?? []).find((row) => {
      return (
        normalizeToken(row.value_key) === requestedToken ||
        normalizeToken(row.value_label) === requestedToken
      );
    });

    if (!matchedStatus?.value_key) {
      return badRequest("Invalid stato_sales");
    }

    sanitizedPatch.old_stato_sales =
      (currentRecord as { stato_sales?: string | null }).stato_sales ?? null;
    sanitizedPatch.stato_sales = matchedStatus.value_key;
  }

  const updatedAtField = AUTO_UPDATED_AT_FIELD[table];
  sanitizedPatch[updatedAtField] = new Date().toISOString();

  const { data: updatedRecord, error: updateError } = await supabase
    .from(table)
    .update(sanitizedPatch)
    .eq("id", id)
    .select("*")
    .single();

  if (updateError) {
    return serverError(updateError.message);
  }

  return new Response(
    JSON.stringify({
      table,
      id,
      row: updatedRecord,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
