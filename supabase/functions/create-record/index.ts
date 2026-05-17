import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SupportedTable =
  | "assunzioni"
  | "famiglie"
  | "chiusure_contratti"
  | "lavoratori"
  | "indirizzi"
  | "selezioni_lavoratori"
  | "documenti_lavoratori"
  | "esperienze_lavoratori"
  | "referenze_lavoratori"
  | "processi_matching"
  | "ticket"
  | "variazioni_contrattuali";

type CreateRecordPayload = {
  table?: SupportedTable;
  values?: Record<string, unknown>;
};

const SUPPORTED_TABLES = new Set<SupportedTable>([
  "assunzioni",
  "famiglie",
  "chiusure_contratti",
  "lavoratori",
  "indirizzi",
  "selezioni_lavoratori",
  "documenti_lavoratori",
  "esperienze_lavoratori",
  "referenze_lavoratori",
  "processi_matching",
  "ticket",
  "variazioni_contrattuali",
]);

const PROTECTED_FIELDS_BY_TABLE: Record<SupportedTable, Set<string>> = {
  assunzioni: new Set(["id", "creato_il", "aggiornato_il"]),
  famiglie: new Set(["id", "creato_il", "aggiornato_il"]),
  chiusure_contratti: new Set(["id", "creato_il", "aggiornato_il"]),
  lavoratori: new Set(["id", "creato_il", "aggiornato_il"]),
  indirizzi: new Set(["id", "creato_il", "aggiornato_il"]),
  selezioni_lavoratori: new Set(["id", "creato_il", "aggiornato_il"]),
  documenti_lavoratori: new Set(["id", "creato_il", "aggiornato_il"]),
  esperienze_lavoratori: new Set(["id", "creato_il", "aggiornato_il"]),
  referenze_lavoratori: new Set(["id", "creato_il", "aggiornato_il"]),
  processi_matching: new Set(["id", "creato_il", "aggiornato_il"]),
  ticket: new Set(["id", "creato_il", "aggiornato_il"]),
  variazioni_contrattuali: new Set(["id", "creato_il", "aggiornato_il"]),
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

type LookupValueRow = {
  entity_field: string;
  value_key: string | null;
  value_label: string | null;
};

function normalizeToken(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function groupLookupRows(rows: LookupValueRow[]) {
  const byField = new Map<string, LookupValueRow[]>();

  for (const row of rows) {
    const current = byField.get(row.entity_field) ?? [];
    current.push(row);
    byField.set(row.entity_field, current);
  }

  return byField;
}

function findLookupLabel(rows: LookupValueRow[] | undefined, value: unknown) {
  if (typeof value !== "string") return null;
  const requestedToken = normalizeToken(value);
  if (!requestedToken) return null;

  const matchedRow = rows?.find((row) => {
    return (
      normalizeToken(row.value_key) === requestedToken ||
      normalizeToken(row.value_label) === requestedToken
    );
  });

  return matchedRow?.value_label?.trim() || null;
}

function normalizeLookupBackedValue(
  rows: LookupValueRow[] | undefined,
  value: unknown
) {
  if (!rows?.length || value == null) return value;

  if (Array.isArray(value)) {
    return value.map((item) => findLookupLabel(rows, item) ?? item);
  }

  if (typeof value !== "string") return value;

  const directLabel = findLookupLabel(rows, value);
  if (directLabel) return directLabel;

  if (!value.includes(",")) return value;

  return value
    .split(",")
    .map((item) => {
      const trimmed = item.trim();
      return findLookupLabel(rows, trimmed) ?? trimmed;
    })
    .filter(Boolean)
    .join(", ");
}

async function normalizeLookupBackedValues(
  supabase: ReturnType<typeof createClient>,
  table: SupportedTable,
  values: Record<string, unknown>
) {
  const fields = Object.keys(values);
  if (fields.length === 0) return { values, error: null as string | null };

  const { data: lookupRows, error } = await supabase
    .from("lookup_values")
    .select("entity_field, value_key, value_label")
    .eq("entity_table", table)
    .eq("is_active", true)
    .in("entity_field", fields);

  if (error) {
    return { values, error: error.message };
  }

  const lookupRowsByField = groupLookupRows((lookupRows ?? []) as LookupValueRow[]);

  for (const [field, value] of Object.entries(values)) {
    values[field] = normalizeLookupBackedValue(lookupRowsByField.get(field), value);
  }

  return { values, error: null };
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

  const normalizedValuesResult = await normalizeLookupBackedValues(
    supabase,
    table,
    sanitizedValues
  );
  if (normalizedValuesResult.error) {
    return serverError(normalizedValuesResult.error);
  }

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
