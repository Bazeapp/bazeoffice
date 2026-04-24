import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SupportedTable =
  | "famiglie"
  | "chiusure_contratti"
  | "contributi_inps"
  | "lavoratori"
  | "mesi_lavorati"
  | "rapporti_lavorativi"
  | "ticket"
  | "variazioni_contrattuali"
  | "selezioni_lavoratori"
  | "documenti_lavoratori"
  | "esperienze_lavoratori"
  | "referenze_lavoratori"
  | "processi_matching";

type DeleteRecordPayload = {
  table?: SupportedTable;
  id?: string;
};

const SUPPORTED_TABLES = new Set<SupportedTable>([
  "famiglie",
  "chiusure_contratti",
  "contributi_inps",
  "lavoratori",
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

  let payload: DeleteRecordPayload = {};
  try {
    payload = (await req.json()) as DeleteRecordPayload;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const table = payload.table;
  const id = payload.id?.trim();

  if (!table || !SUPPORTED_TABLES.has(table)) {
    return badRequest("Invalid table");
  }

  if (!id) {
    return badRequest("Missing id");
  }

  const supabase = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existingRow, error: existingError } = await supabase
    .from(table)
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (existingError) {
    return serverError(existingError.message);
  }

  if (!existingRow) {
    return notFound("Record not found");
  }

  if (table === "esperienze_lavoratori") {
    const { error: referencesDeleteError } = await supabase
      .from("referenze_lavoratori")
      .delete()
      .eq("esperienza_lavoratore_id", id);

    if (referencesDeleteError) {
      return serverError(referencesDeleteError.message);
    }
  }

  const { error: deleteError } = await supabase.from(table).delete().eq("id", id);

  if (deleteError) {
    return serverError(deleteError.message);
  }

  return new Response(
    JSON.stringify({
      table,
      id,
      deleted: true,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
