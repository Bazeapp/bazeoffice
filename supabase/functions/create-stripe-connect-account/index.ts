import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type CreateStripeConnectAccountPayload = {
  lavoratore_id?: string;
};

type WorkerRow = {
  id: string;
  nome: string | null;
  cognome: string | null;
  email: string | null;
  telefono: string | null;
  data_di_nascita: string | null;
  provincia: string | null;
  iban: string | null;
  id_stripe_account: string | null;
};

type AddressRow = {
  tipo_indirizzo: string | null;
  via: string | null;
  civico: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  paese: string | null;
  indirizzo_formattato: string | null;
};

type AssunzioneRow = {
  id: string;
  dati_bancari_lavoratore: string | null;
  aggiornato_il: string | null;
};

type StripeAccountResponse = {
  id?: string;
  object?: string;
  requirements?: unknown;
  future_requirements?: unknown;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function badRequest(message: string) {
  return jsonResponse({ error: message }, 400);
}

function unauthorized(message: string) {
  return jsonResponse({ error: message }, 401);
}

function serverError(message: string) {
  return jsonResponse({ error: message }, 500);
}

function toText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAddressType(value: unknown) {
  return toText(value).toLowerCase();
}

function extractIban(value: unknown) {
  const raw = toText(value);
  const match = raw.match(/[A-Z]{2}\d{2}[A-Z0-9]{11,30}/i);
  return match?.[0]?.replace(/\s+/g, "").toUpperCase() ?? "";
}

function pickWorkerAddress(addresses: AddressRow[]) {
  return (
    addresses.find((address) => normalizeAddressType(address.tipo_indirizzo) === "residenza") ??
    addresses.find((address) => normalizeAddressType(address.tipo_indirizzo) === "domicilio") ??
    addresses[0] ??
    null
  );
}

function buildAddressLine(address: AddressRow | null) {
  if (!address) return "";
  const formatted = toText(address.indirizzo_formattato);
  if (formatted) return formatted;
  return [toText(address.via), toText(address.civico)].filter(Boolean).join(" ").trim();
}

function parseBirthDate(value: unknown) {
  const raw = toText(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  return { day, month, year };
}

function appendParam(params: URLSearchParams, key: string, value: string | number | boolean) {
  params.append(key, String(value));
}

function isDryRunEnabled() {
  return toText(Deno.env.get("STRIPE_CONNECT_DRY_RUN")).toLowerCase() === "true";
}

function buildStripeAccountParams({
  worker,
  address,
  iban,
}: {
  worker: WorkerRow;
  address: AddressRow;
  iban: string;
}) {
  const dob = parseBirthDate(worker.data_di_nascita);
  const firstName = toText(worker.nome);
  const lastName = toText(worker.cognome);
  const email = toText(worker.email);
  const phone = toText(worker.telefono);
  const line1 = buildAddressLine(address);
  const postalCode = toText(address.cap);
  const state = toText(address.provincia) || toText(worker.provincia);
  const city = toText(address.citta) || state;
  const country = toText(address.paese) || "IT";
  const missing: string[] = [];

  if (!firstName) missing.push("nome");
  if (!lastName) missing.push("cognome");
  if (!email) missing.push("email");
  if (!phone) missing.push("telefono");
  if (!dob) missing.push("data_di_nascita");
  if (!line1) missing.push("indirizzo");
  if (!postalCode) missing.push("cap");
  if (!city) missing.push("citta/provincia");
  if (!iban) missing.push("iban");

  if (missing.length > 0) {
    return {
      error: `Dati mancanti per creare account Stripe: ${missing.join(", ")}`,
      params: null,
    };
  }

  const params = new URLSearchParams();
  appendParam(params, "type", "express");
  appendParam(params, "country", "IT");
  appendParam(params, "default_currency", "eur");
  appendParam(params, "business_type", "individual");
  appendParam(params, "business_profile[mcc]", "7349");
  appendParam(params, "business_profile[product_description]", "Collaboratore domestico");
  appendParam(params, "capabilities[card_payments][requested]", true);
  appendParam(params, "capabilities[transfers][requested]", true);
  appendParam(params, "individual[first_name]", firstName);
  appendParam(params, "individual[last_name]", lastName);
  appendParam(params, "individual[email]", email);
  appendParam(params, "individual[phone]", phone);
  appendParam(params, "individual[dob][day]", dob!.day);
  appendParam(params, "individual[dob][month]", dob!.month);
  appendParam(params, "individual[dob][year]", dob!.year);
  appendParam(params, "individual[address][line1]", line1);
  appendParam(params, "individual[address][city]", city);
  appendParam(params, "individual[address][state]", state || city);
  appendParam(params, "individual[address][country]", country);
  appendParam(params, "individual[address][postal_code]", postalCode);
  appendParam(params, "individual[relationship][representative]", true);
  appendParam(params, "external_account[object]", "bank_account");
  appendParam(params, "external_account[country]", "IT");
  appendParam(params, "external_account[currency]", "eur");
  appendParam(params, "external_account[account_number]", iban);
  appendParam(params, "external_account[account_holder_name]", `${firstName} ${lastName}`);
  appendParam(params, "external_account[account_holder_type]", "individual");
  appendParam(params, "metadata[lavoratore_id]", worker.id);
  appendParam(params, "metadata[source]", "bazeoffice");

  return { error: null, params };
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
  const dryRun = isDryRunEnabled();
  const stripeSecretKey =
    Deno.env.get("STRIPE_CONNECT_SECRET_KEY") ?? Deno.env.get("STRIPE_SECRET_KEY");

  if (!url || !serviceRole) {
    return serverError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!dryRun && !stripeSecretKey) {
    return serverError("Missing STRIPE_CONNECT_SECRET_KEY or STRIPE_SECRET_KEY");
  }

  const authorization = req.headers.get("Authorization") ?? "";
  const jwt = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) {
    return unauthorized("Missing authenticated session");
  }

  const supabase = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData.user) {
    return unauthorized("Invalid authenticated session");
  }

  let payload: CreateStripeConnectAccountPayload = {};
  try {
    payload = (await req.json()) as CreateStripeConnectAccountPayload;
  } catch {
    return badRequest("Invalid JSON body");
  }

  const workerId = toText(payload.lavoratore_id);
  if (!workerId) {
    return badRequest("lavoratore_id is required");
  }

  const { data: worker, error: workerError } = await supabase
    .from("lavoratori")
    .select("id,nome,cognome,email,telefono,data_di_nascita,provincia,iban,id_stripe_account")
    .eq("id", workerId)
    .maybeSingle<WorkerRow>();

  if (workerError) return serverError(workerError.message);
  if (!worker) return badRequest("Lavoratore non trovato");

  if (toText(worker.id_stripe_account)) {
    return jsonResponse({
      id_stripe_account: toText(worker.id_stripe_account),
      created: false,
      row: worker,
    });
  }

  const [
    { data: rapporti, error: rapportiError },
    { data: addresses, error: addressesError },
  ] = await Promise.all([
    supabase
      .from("rapporti_lavorativi")
      .select("id")
      .eq("lavoratore_id", workerId)
      .limit(100),
    supabase
      .from("indirizzi")
      .select("tipo_indirizzo,via,civico,cap,citta,provincia,paese,indirizzo_formattato")
      .eq("entita_tabella", "lavoratori")
      .eq("entita_id", workerId)
      .order("aggiornato_il", { ascending: false })
      .limit(10),
  ]);

  if (rapportiError) return serverError(rapportiError.message);
  if (addressesError) return serverError(addressesError.message);

  const rapportoIds = (rapporti ?? [])
    .map((row) => toText((row as { id?: unknown }).id))
    .filter(Boolean);

  let assunzioniIban = "";
  if (rapportoIds.length > 0) {
    const { data: assunzioni, error: assunzioniError } = await supabase
      .from("assunzioni")
      .select("id,dati_bancari_lavoratore,aggiornato_il")
      .in("rapporto_lavorativo_lavoratore_id", rapportoIds)
      .order("aggiornato_il", { ascending: false })
      .limit(20);

    if (assunzioniError) return serverError(assunzioniError.message);

    const sourceAssunzione =
      ((assunzioni ?? []) as AssunzioneRow[]).find((row) =>
        Boolean(extractIban(row.dati_bancari_lavoratore))
      ) ?? null;
    assunzioniIban = extractIban(sourceAssunzione?.dati_bancari_lavoratore);
  }

  const iban = extractIban(worker.iban) || assunzioniIban;

  if (!iban) {
    return badRequest("IBAN mancante in lavoratori.iban");
  }

  const address = pickWorkerAddress((addresses ?? []) as AddressRow[]);
  if (!address) {
    return badRequest("Indirizzo lavoratore mancante nella tabella indirizzi");
  }

  const { error: validationError, params } = buildStripeAccountParams({
    worker,
    address,
    iban,
  });

  if (validationError || !params) {
    return badRequest(validationError ?? "Dati non validi per Stripe");
  }

  if (dryRun) {
    return jsonResponse({
      id_stripe_account: `acct_dry_run_${workerId}`,
      created: false,
      dry_run: true,
      would_update_lavoratore_id: workerId,
      would_use_connect_secret_override: Boolean(Deno.env.get("STRIPE_CONNECT_SECRET_KEY")),
      required_fields_valid: true,
    });
  }

  const stripeResponse = await fetch("https://api.stripe.com/v1/accounts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": `create-stripe-connect-account:${workerId}`,
      "Stripe-Version": "2022-11-15",
    },
    body: params.toString(),
  });

  const stripeBody = (await stripeResponse.json()) as StripeAccountResponse;

  if (!stripeResponse.ok) {
    return jsonResponse(
      {
        error:
          stripeBody.error?.message ??
          `Stripe account creation failed with status ${stripeResponse.status}`,
        stripe_error: stripeBody.error ?? null,
      },
      400
    );
  }

  const stripeAccountId = toText(stripeBody.id);
  if (!stripeAccountId) {
    return serverError("Stripe non ha restituito un ID account");
  }

  const { data: updatedWorker, error: updateError } = await supabase
    .from("lavoratori")
    .update({ id_stripe_account: stripeAccountId })
    .eq("id", workerId)
    .select("*")
    .single();

  if (updateError) {
    return serverError(updateError.message);
  }

  return jsonResponse({
    id_stripe_account: stripeAccountId,
    created: true,
    requirements: stripeBody.requirements ?? null,
    future_requirements: stripeBody.future_requirements ?? null,
    row: updatedWorker,
  });
});
