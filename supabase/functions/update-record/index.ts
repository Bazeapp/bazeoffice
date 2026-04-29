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
  | "contributi_inps"
  | "lavoratori"
  | "indirizzi"
  | "mesi_lavorati"
  | "rapporti_lavorativi"
  | "ticket"
  | "variazioni_contrattuali"
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
  "assunzioni",
  "famiglie",
  "chiusure_contratti",
  "contributi_inps",
  "lavoratori",
  "indirizzi",
  "mesi_lavorati",
  "rapporti_lavorativi",
  "ticket",
  "variazioni_contrattuali",
  "selezioni_lavoratori",
  "documenti_lavoratori",
  "esperienze_lavoratori",
  "referenze_lavoratori",
  "processi_matching",
]);

const PROTECTED_FIELDS_BY_TABLE: Record<SupportedTable, Set<string>> = {
  assunzioni: new Set(["id", "creato_il"]),
  famiglie: new Set(["id", "creato_il"]),
  chiusure_contratti: new Set(["id", "creato_il"]),
  contributi_inps: new Set(["id", "creato_il"]),
  lavoratori: new Set(["id", "creato_il"]),
  indirizzi: new Set(["id", "creato_il"]),
  mesi_lavorati: new Set(["id", "creato_il"]),
  rapporti_lavorativi: new Set(["id", "creato_il"]),
  ticket: new Set(["id", "creato_il"]),
  variazioni_contrattuali: new Set(["id", "creato_il"]),
  selezioni_lavoratori: new Set(["id", "creato_il"]),
  documenti_lavoratori: new Set(["id", "creato_il"]),
  esperienze_lavoratori: new Set(["id", "creato_il"]),
  referenze_lavoratori: new Set(["id", "creato_il"]),
  processi_matching: new Set(["id", "creato_il"]),
};

const AUTO_UPDATED_AT_FIELD: Record<SupportedTable, string> = {
  assunzioni: "aggiornato_il",
  famiglie: "aggiornato_il",
  chiusure_contratti: "aggiornato_il",
  contributi_inps: "aggiornato_il",
  lavoratori: "aggiornato_il",
  indirizzi: "aggiornato_il",
  mesi_lavorati: "aggiornato_il",
  rapporti_lavorativi: "aggiornato_il",
  ticket: "aggiornato_il",
  variazioni_contrattuali: "aggiornato_il",
  selezioni_lavoratori: "aggiornato_il",
  documenti_lavoratori: "aggiornato_il",
  esperienze_lavoratori: "aggiornato_il",
  referenze_lavoratori: "aggiornato_il",
  processi_matching: "aggiornato_il",
};

const MATCH_WORKFLOW_TARGET_STATUSES = new Set(["match", "prova con cliente"]);
const CREATE_RAPPORTO_AFTER_MATCH_WEBHOOK_URL =
  "https://hook.eu1.make.com/aq1sq4aa3tc6ujccbqq9dodx9pt3uxni";

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
  return /^[\p{L}_][\p{L}\p{N}_]*$/u.test(field);
}

async function runCreateRapportoAfterMatchAutomation(
  supabase: ReturnType<typeof createClient>,
  row: Record<string, unknown>
) {
  const processoMatchingId =
    typeof row.processo_matching_id === "string" && row.processo_matching_id.trim()
      ? row.processo_matching_id.trim()
      : null;
  const lavoratoreId =
    typeof row.lavoratore_id === "string" && row.lavoratore_id.trim()
      ? row.lavoratore_id.trim()
      : null;

  if (!processoMatchingId) {
    throw new Error("Missing processo_matching_id for post-match workflow");
  }

  if (!lavoratoreId) {
    throw new Error("Missing lavoratore_id for post-match workflow");
  }

  const { data: processRow, error: processError } = await supabase
    .from("processi_matching")
    .select("famiglia_id")
    .eq("id", processoMatchingId)
    .maybeSingle();

  if (processError) {
    throw new Error(processError.message);
  }

  const famigliaId =
    processRow &&
    typeof processRow.famiglia_id === "string" &&
    processRow.famiglia_id.trim()
      ? processRow.famiglia_id.trim()
      : null;

  if (!famigliaId) {
    throw new Error("Missing famiglia_id for post-match workflow");
  }

  const response = await fetch(CREATE_RAPPORTO_AFTER_MATCH_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      {
        famigliaId: [famigliaId],
        lavoratoreId: [lavoratoreId],
      },
    ]),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
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

  const currentRecordSelect = "*";

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

  if (table === "selezioni_lavoratori" && "stato_selezione" in sanitizedPatch) {
    const previousStatus = normalizeToken(
      (currentRecord as { stato_selezione?: unknown }).stato_selezione
    );
    const nextStatus = normalizeToken(
      (updatedRecord as { stato_selezione?: unknown }).stato_selezione
    );

    if (
      MATCH_WORKFLOW_TARGET_STATUSES.has(nextStatus) &&
      !MATCH_WORKFLOW_TARGET_STATUSES.has(previousStatus)
    ) {
      try {
        await runCreateRapportoAfterMatchAutomation(
          supabase,
          updatedRecord as Record<string, unknown>
        );
      } catch (error) {
        return serverError(
          error instanceof Error
            ? `Post-match workflow failed: ${error.message}`
            : "Post-match workflow failed"
        );
      }
    }
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
