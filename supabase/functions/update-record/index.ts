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
  | "presenze_mensili"
  | "rapporti_lavorativi"
  | "richieste_attivazione"
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
  "presenze_mensili",
  "rapporti_lavorativi",
  "richieste_attivazione",
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
  presenze_mensili: new Set(["id", "creato_il"]),
  rapporti_lavorativi: new Set(["id", "creato_il"]),
  richieste_attivazione: new Set(["id", "creato_il"]),
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
  presenze_mensili: "aggiornato_il",
  rapporti_lavorativi: "aggiornato_il",
  richieste_attivazione: "aggiornato_il",
  ticket: "aggiornato_il",
  variazioni_contrattuali: "aggiornato_il",
  selezioni_lavoratori: "aggiornato_il",
  documenti_lavoratori: "aggiornato_il",
  esperienze_lavoratori: "aggiornato_il",
  referenze_lavoratori: "aggiornato_il",
  processi_matching: "aggiornato_il",
};

const CREATE_RAPPORTO_TARGET_STATUSES = new Set(["prova schedulata"]);
const CREATE_RAPPORTO_AFTER_MATCH_WEBHOOK_URL =
  "https://hook.eu1.make.com/a9ypx6tn63mtik4nycuvhjvfz6qibgy9";

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

type LookupValueRow = {
  entity_field: string;
  value_key: string | null;
  value_label: string | null;
};

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

async function normalizeLookupBackedPatch(
  supabase: any,
  table: SupportedTable,
  patch: Record<string, unknown>
) {
  const fields = Object.keys(patch);
  if (fields.length === 0) return { patch, error: null as string | null };

  const { data: lookupRows, error } = await supabase
    .from("lookup_values")
    .select("entity_field, value_key, value_label")
    .eq("entity_table", table)
    .eq("is_active", true)
    .in("entity_field", fields);

  if (error) {
    return { patch, error: error.message };
  }

  const lookupRowsByField = groupLookupRows((lookupRows ?? []) as LookupValueRow[]);

  for (const [field, value] of Object.entries(patch)) {
    patch[field] = normalizeLookupBackedValue(lookupRowsByField.get(field), value);
  }

  return { patch, error: null };
}

function isSafeColumnName(field: string) {
  return /^[\p{L}_][\p{L}\p{N}_]*$/u.test(field);
}

function toTrimmedText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeContactPhone(value: string) {
  const compact = value.replace(/[\s().-]/g, "");
  if (!compact) return "";
  if (compact.startsWith("00")) return `+${compact.slice(2)}`;
  if (compact.startsWith("+")) return compact;
  return `+39${compact}`;
}

function normalizePersonName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function validateAndNormalizeFamilyContactPatch(patch: Record<string, unknown>) {
  if ("email" in patch) {
    const email = toTrimmedText(patch.email).toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "Invalid famiglia email";
    }
    patch.email = email;
  }

  if ("telefono" in patch) {
    const telefono = normalizeContactPhone(toTrimmedText(patch.telefono));
    if (!telefono || !/^\+[1-9]\d{7,14}$/.test(telefono)) {
      return "Invalid famiglia telefono";
    }
    patch.telefono = telefono;
  }

  if ("nome" in patch) {
    const nome = normalizePersonName(toTrimmedText(patch.nome));
    if (!nome) {
      return "Invalid famiglia nome";
    }
    patch.nome = nome;
  }

  if ("cognome" in patch) {
    const cognome = normalizePersonName(toTrimmedText(patch.cognome));
    patch.cognome = cognome || null;
  }

  return null;
}

function toDisplayText(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => toTrimmedText(item))
      .filter(Boolean)
      .join(", ");
  }

  return toTrimmedText(value);
}

function hasDisplayText(value: unknown) {
  return Boolean(toDisplayText(value));
}

function equalsDisplayText(value: unknown, expected: string) {
  return toDisplayText(value).toLowerCase() === expected.toLowerCase();
}

function buildSeoPositionLabel(
  processRow: Record<string, unknown>,
  addressRow: Record<string, unknown> | null
) {
  return [
    toTrimmedText(addressRow?.indirizzo_formattato),
    toTrimmedText(processRow.indirizzo_prova_via),
    toTrimmedText(processRow.indirizzo_prova_civico),
    toTrimmedText(addressRow?.citta) ||
      toTrimmedText(processRow.indirizzo_prova_comune),
    toTrimmedText(addressRow?.cap) ||
      toTrimmedText(processRow.indirizzo_prova_cap),
  ]
    .filter(Boolean)
    .join(" - ");
}

function buildAnnouncementDescription(
  processRow: Record<string, unknown>,
  addressRow: Record<string, unknown> | null
) {
  const tipoRapporto = toDisplayText(processRow.tipo_rapporto);
  const provincia =
    toTrimmedText(addressRow?.provincia) ||
    toTrimmedText(processRow.indirizzo_prova_provincia);
  const riferimentoPubblico =
    toTrimmedText(addressRow?.indirizzo_formattato) ||
    toTrimmedText(addressRow?.citta) ||
    toTrimmedText(processRow.indirizzo_prova_comune);
  const cap =
    toTrimmedText(addressRow?.cap) ||
    toTrimmedText(processRow.indirizzo_prova_cap);
  const descrizioneGiorniRiposo = toDisplayText(
    processRow.descrizione_richiesta_giorni_riposo
  );
  const descrizioneTrasferte = toDisplayText(
    processRow.descrizione_richiesta_trasferte
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

async function runCreateRapportoAfterMatchAutomation(
  supabase: any,
  row: Record<string, unknown>
) {
  const selezioneRecordId =
    typeof row.id === "string" && row.id.trim()
      ? row.id.trim()
      : null;
  const processoMatchingId =
    typeof row.processo_matching_id === "string" && row.processo_matching_id.trim()
      ? row.processo_matching_id.trim()
      : null;

  if (!selezioneRecordId) {
    throw new Error("Missing selezione_lavoratori id for post-match workflow");
  }

  if (!processoMatchingId) {
    throw new Error("Missing processo_matching_id for post-match workflow");
  }

  const { data: processRow, error: processError } = await supabase
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
    .eq("id", processoMatchingId)
    .maybeSingle();

  if (processError) {
    throw new Error(processError.message);
  }

  if (!processRow) {
    throw new Error("Processo non trovato");
  }

  const { data: addressRow, error: addressError } = await supabase
    .from("indirizzi")
    .select("cap, citta, provincia, indirizzo_formattato")
    .eq("entita_tabella", "processi_matching")
    .eq("entita_id", processoMatchingId)
    .in("tipo_indirizzo", ["luogo", "prova"])
    .order("tipo_indirizzo", { ascending: true })
    .order("aggiornato_il", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (addressError) {
    throw new Error(addressError.message);
  }

  const typedProcessRow = processRow as Record<string, unknown>;
  const typedAddressRow = addressRow as Record<string, unknown> | null;
  const provincia =
    toTrimmedText(typedAddressRow?.provincia) ||
    toTrimmedText(typedProcessRow.indirizzo_prova_provincia);

  const webhookUrl = new URL(CREATE_RAPPORTO_AFTER_MATCH_WEBHOOK_URL);
  webhookUrl.searchParams.set("record_id", processoMatchingId);

  const response = await fetch(webhookUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      record_id: processoMatchingId,
      processo_res_id: processoMatchingId,
      descrizione_ricerca_famiglia: buildAnnouncementDescription(
        typedProcessRow,
        typedAddressRow
      ),
      tipo_lavoro: Array.isArray(typedProcessRow.tipo_lavoro)
        ? typedProcessRow.tipo_lavoro
        : [],
      tipo_rapporto: Array.isArray(typedProcessRow.tipo_rapporto)
        ? typedProcessRow.tipo_rapporto
        : [],
      orario_di_lavoro: toTrimmedText(typedProcessRow.orario_di_lavoro),
      paga_oraria: toTrimmedText(typedProcessRow.paga_oraria),
      provincia,
      posizione_specifica_lavoro: buildSeoPositionLabel(
        typedProcessRow,
        typedAddressRow
      ),
    }),
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

  if (table === "famiglie") {
    const familyContactError = validateAndNormalizeFamilyContactPatch(sanitizedPatch);
    if (familyContactError) {
      return badRequest(familyContactError);
    }
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

  const normalizedPatchResult = await normalizeLookupBackedPatch(
    supabase,
    table,
    sanitizedPatch
  );
  if (normalizedPatchResult.error) {
    return serverError(normalizedPatchResult.error);
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

    if (!matchedStatus?.value_label) {
      return badRequest("Invalid stato_sales");
    }

    sanitizedPatch.old_stato_sales =
      (currentRecord as { stato_sales?: string | null }).stato_sales ?? null;
    sanitizedPatch.stato_sales = matchedStatus.value_label;
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
      CREATE_RAPPORTO_TARGET_STATUSES.has(nextStatus) &&
      !CREATE_RAPPORTO_TARGET_STATUSES.has(previousStatus)
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
