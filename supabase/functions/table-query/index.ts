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
  | "selezioni_lavoratori"
  | "operatori"
  | "esperienze_lavoratori"
  | "referenze_lavoratori"
  | "processi_matching"
  | "lookup_values";

type QuerySort = {
  field: string;
  ascending?: boolean;
};

type FilterOperator =
  | "is"
  | "is_not"
  | "has"
  | "not_has"
  | "starts_with"
  | "ends_with"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "is_true"
  | "is_false"
  | "has_any"
  | "has_all"
  | "not_has_any"
  | "is_empty"
  | "is_not_empty";

type FilterCondition = {
  kind: "condition";
  id: string;
  field: string;
  operator: FilterOperator;
  value: string;
  valueTo?: string;
};

type FilterGroup = {
  kind: "group";
  id: string;
  logic: "and" | "or";
  nodes: FilterNode[];
};

type FilterNode = FilterCondition | FilterGroup;

type QueryPayload = {
  table: SupportedTable;
  select?: string[];
  limit?: number;
  offset?: number;
  orderBy?: QuerySort[];
  includeSchema?: boolean;
  search?: string;
  searchFields?: string[];
  filters?: FilterGroup;
};

type FilterFieldType =
  | "text"
  | "number"
  | "date"
  | "boolean"
  | "enum"
  | "multi_enum"
  | "id";

type ColumnMeta = {
  name: string;
  dataType: string;
  udtName: string | null;
  filterType: FilterFieldType;
};

const MAX_SERVER_SCAN_ROWS = 25000;
const BATCH_SIZE = 1000;

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
    "anni_esperienza_babysitter",
    "anni_esperienza_badante",
    "anni_esperienza_colf",
    "check_accetta_babysitting_multipli_bambini",
    "check_accetta_babysitting_neonati",
    "check_accetta_case_con_cani",
    "check_accetta_case_con_cani_grandi",
    "check_accetta_case_con_gatti",
    "check_accetta_funzionamento_baze",
    "check_accetta_lavori_con_trasferta",
    "check_accetta_multipli_contratti",
    "check_accetta_paga_9_euro_netti",
    "check_accetta_salire_scale_o_soffitti_alti",
    "check_blacklist",
    "check_lavori_accettabili",
    "nome",
    "cognome",
    "colloquio_in_presenza",
    "come_ti_sposti",
    "compatibilita_babysitting_neonati",
    "compatibilita_con_animali_in_casa",
    "compatibilita_con_case_di_grandi_dimensioni",
    "compatibilita_con_contesti_pacati",
    "compatibilita_con_cucina_strutturata",
    "compatibilita_con_elevata_autonomia_richiesta",
    "compatibilita_con_stiro_esigente",
    "compatibilita_famiglie_molto_esigenti",
    "compatibilita_famiglie_numerose",
    "compatibilita_lavoro_con_datore_presente_in_casa",
    "conoscenza_dellitaliano",
    "data_di_nascita",
    "data_ora_di_creazione",
    "data_ritorno_disponibilita",
    "data_scadenza_naspi",
    "data_ultima_candidatura",
    "data_ultima_modifica_profilo",
    "descrizione_pubblica",
    "descrizione_rivista",
    "disponibilita",
    "disponibilita_domenica_mattina",
    "disponibilita_domenica_pomeriggio",
    "disponibilita_domenica_sera",
    "disponibilita_giovedi_mattina",
    "disponibilita_giovedi_pomeriggio",
    "disponibilita_giovedi_sera",
    "disponibilita_lunedi_mattina",
    "disponibilita_lunedi_pomeriggio",
    "disponibilita_lunedi_sera",
    "disponibilita_martedi_mattina",
    "disponibilita_martedi_pomeriggio",
    "disponibilita_martedi_sera",
    "disponibilita_mercoledi_mattina",
    "disponibilita_mercoledi_pomeriggio",
    "disponibilita_mercoledi_sera",
    "disponibilita_sabato_mattina",
    "disponibilita_sabato_pomeriggio",
    "disponibilita_sabato_sera",
    "disponibilita_venerdi_mattina",
    "disponibilita_venerdi_pomeriggio",
    "disponibilita_venerdi_sera",
    "documenti_in_regola",
    "email",
    "fbclid",
    "feedback_recruiter",
    "followup_chiamata_idoneita",
    "foto",
    "gclid",
    "hai_referenze",
    "iban",
    "id_stripe_account",
    "livello_babysitting",
    "livello_cucina",
    "livello_dogsitting",
    "livello_giardinaggio",
    "livello_inglese",
    "livello_italiano",
    "livello_pulizie",
    "livello_stiro",
    "motivazione_non_idoneo",
    "nazionalita",
    "paga_oraria_richiesta",
    "provincia",
    "rating_atteggiamento",
    "rating_capacita_comunicative",
    "rating_corporatura",
    "rating_cura_personale",
    "rating_precisione_puntualita",
    "riassunto_profilo_breve",
    "sesso",
    "situazione_lavorativa_attuale",
    "stato_lavoratore",
    "stato_profilo",
    "stato_selezioni",
    "stato_verifica_documenti",
    "telefono",
    "tipo_lavoro_domestico",
    "tipo_rapporto_lavorativo",
    "ultima_modifica",
    "url_onboarding_stripe",
    "utm_campaign",
    "utm_content",
    "utm_medium",
    "utm_source",
    "utm_term",
    "vincoli_orari_disponibilita",
    "creato_il",
    "aggiornato_il",
  ],
  documenti_lavoratori: [
    "id",
    "lavoratore_id",
    "tipo_documento",
    "stato_documento",
    "status",
    "data_scadenza",
    "data_scadenza_permesso_di_soggiorno",
    "allegato_codice_fiscale_fronte",
    "allegato_codice_fiscale_retro",
    "allegato_documento_identita_fronte",
    "allegato_documento_identita_retro",
    "allegato_permesso_di_soggiorno_fronte",
    "allegato_permesso_di_soggiorno_retro",
    "allegato_ricevuta_rinnovo_permesso",
    "airtable_id",
    "airtable_record_id",
    "creato_il",
    "aggiornato_il",
  ],
  selezioni_lavoratori: [
    "id",
    "processo_matching_id",
    "lavoratore_id",
    "stato_selezione",
    "motivo_no_match",
    "note_selezione",
    "punteggio",
    "creato_il",
    "aggiornato_il",
  ],
  operatori: [
    "id",
    "nome",
    "cognome",
    "email",
    "telefono",
    "creato_il",
    "aggiornato_il",
  ],
  esperienze_lavoratori: [
    "id",
    "lavoratore_id",
    "tipo_lavoro",
    "tipo_rapporto",
    "descrizione",
    "descrizione_contesto_lavorativo",
    "stato_esperienza_attiva",
    "data_inizio",
    "data_fine",
    "creato_il",
    "aggiornato_il",
  ],
  referenze_lavoratori: [
    "id",
    "esperienza_lavoratore_id",
    "lavoratore_id",
    "referenza_verificata",
    "referenza_verificata_da_baze",
    "nome_datore",
    "cognome_datore",
    "telefono_datore",
    "valutazione",
    "data_inzio",
    "data_fine",
    "rapporto_ancora_attivo",
    "commento_esperienza",
    "assunto_tramite_baze",
    "ruolo",
    "creato_il",
    "aggiornato_il",
  ],
  processi_matching: [
    "id",
    "annuncio_webflow",
    "appunti_chiamata_sales",
    "channel_grouped",
    "check_synced_looker_studio",
    "data_assegnazione",
    "data_chiusura",
    "data_limite_invio_selezione",
    "data_ora_di_creazione",
    "data_per_ricerca_futura",
    "data_ultima_modifica",
    "deadline_mobile",
    "descrizione_animali_in_casa",
    "descrizione_casa",
    "descrizione_lavoratore_ideale",
    "descrizione_richiesta_ferie",
    "descrizione_richiesta_giorni_riposo",
    "descrizione_richiesta_trasferte",
    "disponibilita_colloqui_in_presenza",
    "eta_massima",
    "eta_minima",
    "famiglia_id",
    "fbclid",
    "frequenza_rapporto",
    "gclid",
    "indirizzo_prova_cap",
    "indirizzo_prova_citofono",
    "indirizzo_prova_civico",
    "indirizzo_prova_comune",
    "indirizzo_prova_note",
    "indirizzo_prova_provincia",
    "indirizzo_prova_via",
    "informazioni_extra_riservate",
    "log_sales",
    "mansioni_richieste",
    "mansioni_richieste_transformed_ai",
    "metratura_casa",
    "modalita_tariffa",
    "modello_smartmatching",
    "momento_disponibilita",
    "motivazione_lost",
    "motivazione_oot",
    "motivo_no_match",
    "nucleo_famigliare",
    "numero_giorni_settimanali",
    "numero_ricerca_attivata",
    "orario_di_lavoro",
    "ore_settimanale",
    "paga_mensile",
    "paga_oraria",
    "patente",
    "preferenza_giorno",
    "presenza_animali_in_casa",
    "preventivo_firmato",
    "recruiter_ricerca_e_selezione_id",
    "referente_ricerca_e_selezione_id",
    "richiesta_ferie",
    "richiesta_patente",
    "richiesta_trasferte",
    "sales_cold_call_followup",
    "sales_no_show_followup",
    "sesso",
    "source_question",
    "source_url",
    "src_embed_maps_annucio",
    "titolo_annuncio",
    "stato_res",
    "stato_sales",
    "testo_annuncio_webflow",
    "testo_annuncio_whatsapp",
    "tipo_incontro_famiglia_lavoratore",
    "tipo_lavoro",
    "tipo_rapporto",
    "urgenza",
    "utm_campaign",
    "utm_content",
    "utm_medium",
    "utm_source",
    "utm_term",
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

function serverError(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sanitizeFields(tableName: SupportedTable, fields: string[]) {
  const allowed = new Set(ALLOWED_FIELDS[tableName]);
  return fields.filter((field) => allowed.has(field));
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

function isIsoLikeDate(value: string) {
  const normalizedValue = value.trim();
  if (!normalizedValue) return false;
  const parsed = Date.parse(normalizedValue);
  if (Number.isNaN(parsed)) return false;
  return /^\d{4}-\d{2}-\d{2}/.test(normalizedValue);
}

function inferColumnMeta(
  fieldName: string,
  values: unknown[],
): Pick<ColumnMeta, "dataType" | "udtName" | "filterType"> {
  const sample = values.find((value) => value !== null && value !== undefined);

  if (fieldName === "id") {
    return { dataType: "uuid", udtName: "uuid", filterType: "id" };
  }

  if (Array.isArray(sample)) {
    return { dataType: "array", udtName: null, filterType: "multi_enum" };
  }

  if (typeof sample === "boolean") {
    return { dataType: "boolean", udtName: "bool", filterType: "boolean" };
  }

  if (typeof sample === "number" && Number.isFinite(sample)) {
    return { dataType: "numeric", udtName: "numeric", filterType: "number" };
  }

  if (typeof sample === "string") {
    if (isUuidLike(sample)) {
      return { dataType: "uuid", udtName: "uuid", filterType: "id" };
    }
    if (isIsoLikeDate(sample)) {
      return { dataType: "timestamp with time zone", udtName: "timestamptz", filterType: "date" };
    }
  }

  return { dataType: "text", udtName: null, filterType: "text" };
}

function inferColumnsFromRows(
  rows: Record<string, unknown>[],
  fallbackFields: string[],
): ColumnMeta[] {
  const firstRowKeys = Object.keys(rows[0] ?? {});
  const additionalKeys = rows
    .slice(1)
    .flatMap((row) => Object.keys(row))
    .filter((key, index, array) => array.indexOf(key) === index && !firstRowKeys.includes(key));
  const orderedKeys =
    firstRowKeys.length > 0
      ? [...firstRowKeys, ...additionalKeys]
      : fallbackFields.filter((field, index, array) => array.indexOf(field) === index);

  return orderedKeys.map((name) => {
    const values = rows.map((row) => row[name]);
    return {
      name,
      ...inferColumnMeta(name, values),
    };
  });
}

function normalize(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const token = value.trim().toLowerCase();
    if (["true", "1", "si", "sì", "yes", "y"].includes(token)) return true;
    if (["false", "0", "no", "n"].includes(token)) return false;
  }
  return null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalizedValue = value.trim().replace(",", ".");
    if (!normalizedValue) return null;
    const parsed = Number.parseFloat(normalizedValue);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseDate(value: unknown): number | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getTime();
  }

  if (typeof value !== "string") return null;
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;

  const slashParts = normalizedValue.split("/");
  if (slashParts.length === 3) {
    const [day, month, year] = slashParts;
    const parsed = new Date(
      Number.parseInt(year ?? "", 10),
      Number.parseInt(month ?? "", 10) - 1,
      Number.parseInt(day ?? "", 10),
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
  }

  const parsed = new Date(normalizedValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function toArrayTokens(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((token) => token.trim().toLowerCase())
      .filter(Boolean);
  }

  const normalizedValue = normalize(value);
  if (!normalizedValue) return [];
  return [normalizedValue];
}

function parseFilterList(value: string) {
  return value
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function evaluateCondition(
  row: Record<string, unknown>,
  condition: FilterCondition,
  fieldTypes: Map<string, FilterFieldType>,
): boolean {
  const raw = row[condition.field];
  const fieldType = fieldTypes.get(condition.field) ?? "text";
  const left = normalize(raw);
  const right = normalize(condition.value);

  if (condition.operator === "is_empty") return isEmptyValue(raw);
  if (condition.operator === "is_not_empty") return !isEmptyValue(raw);

  if (condition.operator === "is_true") return parseBoolean(raw) === true;
  if (condition.operator === "is_false") return parseBoolean(raw) === false;

  if (fieldType === "number") {
    const leftNum = parseNumber(raw);
    const rightNum = parseNumber(condition.value);
    const rightToNum = parseNumber(condition.valueTo);

    switch (condition.operator) {
      case "is":
        return leftNum !== null && rightNum !== null && leftNum === rightNum;
      case "is_not":
        return leftNum !== null && rightNum !== null && leftNum !== rightNum;
      case "gt":
        return leftNum !== null && rightNum !== null && leftNum > rightNum;
      case "gte":
        return leftNum !== null && rightNum !== null && leftNum >= rightNum;
      case "lt":
        return leftNum !== null && rightNum !== null && leftNum < rightNum;
      case "lte":
        return leftNum !== null && rightNum !== null && leftNum <= rightNum;
      case "between":
        return (
          leftNum !== null &&
          rightNum !== null &&
          rightToNum !== null &&
          leftNum >= Math.min(rightNum, rightToNum) &&
          leftNum <= Math.max(rightNum, rightToNum)
        );
      default:
        return true;
    }
  }

  if (fieldType === "date") {
    const leftDate = parseDate(raw);
    const rightDate = parseDate(condition.value);
    const rightToDate = parseDate(condition.valueTo);
    const leftDay = leftDate !== null ? new Date(leftDate).toDateString() : null;
    const rightDay = rightDate !== null ? new Date(rightDate).toDateString() : null;

    switch (condition.operator) {
      case "is":
        return leftDay !== null && rightDay !== null && leftDay === rightDay;
      case "is_not":
        return leftDay !== null && rightDay !== null && leftDay !== rightDay;
      case "gt":
        return leftDate !== null && rightDate !== null && leftDate > rightDate;
      case "gte":
        return leftDate !== null && rightDate !== null && leftDate >= rightDate;
      case "lt":
        return leftDate !== null && rightDate !== null && leftDate < rightDate;
      case "lte":
        return leftDate !== null && rightDate !== null && leftDate <= rightDate;
      case "between":
        return (
          leftDate !== null &&
          rightDate !== null &&
          rightToDate !== null &&
          leftDate >= Math.min(rightDate, rightToDate) &&
          leftDate <= Math.max(rightDate, rightToDate)
        );
      default:
        return true;
    }
  }

  if (fieldType === "boolean") {
    const leftBoolean = parseBoolean(raw);
    const rightBoolean = parseBoolean(condition.value);

    switch (condition.operator) {
      case "is":
        return leftBoolean !== null && rightBoolean !== null && leftBoolean === rightBoolean;
      case "is_not":
        return leftBoolean !== null && rightBoolean !== null && leftBoolean !== rightBoolean;
      default:
        return true;
    }
  }

  if (fieldType === "multi_enum") {
    const tokens = toArrayTokens(raw);
    const list = parseFilterList(condition.value);

    switch (condition.operator) {
      case "is":
      case "has":
        return tokens.includes(right);
      case "is_not":
      case "not_has":
        return !tokens.includes(right);
      case "has_any":
        return list.some((token) => tokens.includes(token));
      case "has_all":
        return list.every((token) => tokens.includes(token));
      case "not_has_any":
        return !list.some((token) => tokens.includes(token));
      default:
        return true;
    }
  }

  switch (condition.operator) {
    case "is":
      return left === right;
    case "is_not":
      return left !== right;
    case "has":
      return left.includes(right);
    case "not_has":
      return !left.includes(right);
    case "starts_with":
      return left.startsWith(right);
    case "ends_with":
      return left.endsWith(right);
    default:
      return true;
  }
}

function evaluateGroup(
  row: Record<string, unknown>,
  group: FilterGroup,
  fieldTypes: Map<string, FilterFieldType>,
): boolean {
  function evaluateNested(currentGroup: FilterGroup): boolean {
    if (!Array.isArray(currentGroup.nodes) || currentGroup.nodes.length === 0) {
      return true;
    }

    const results = currentGroup.nodes.map((node) => {
      if (node.kind === "condition") {
        return evaluateCondition(row, node, fieldTypes);
      }

      return evaluateNested(node);
    });

    if (currentGroup.logic === "and") return results.every(Boolean);
    return results.some(Boolean);
  }

  return evaluateNested(group);
}

function applySearch(
  rows: Record<string, unknown>[],
  query: string,
  searchFields: string[] | undefined,
): Record<string, unknown>[] {
  const token = query.trim().toLowerCase();
  if (!token) return rows;

  return rows.filter((row) => {
    const fields =
      searchFields && searchFields.length > 0
        ? searchFields
        : Object.keys(row);

    return fields.some((field) =>
      String(row[field] ?? "").toLowerCase().includes(token)
    );
  });
}

function compareValues(
  left: unknown,
  right: unknown,
  type: FilterFieldType,
  ascending: boolean,
): number {
  const direction = ascending ? 1 : -1;

  const leftEmpty = left === null || left === undefined || left === "";
  const rightEmpty = right === null || right === undefined || right === "";
  if (leftEmpty && rightEmpty) return 0;
  if (leftEmpty) return 1;
  if (rightEmpty) return -1;

  if (type === "number") {
    const leftNum = parseNumber(left);
    const rightNum = parseNumber(right);
    if (leftNum === null && rightNum === null) return 0;
    if (leftNum === null) return 1;
    if (rightNum === null) return -1;
    return leftNum === rightNum ? 0 : leftNum > rightNum ? direction : -direction;
  }

  if (type === "date") {
    const leftDate = parseDate(left);
    const rightDate = parseDate(right);
    if (leftDate === null && rightDate === null) return 0;
    if (leftDate === null) return 1;
    if (rightDate === null) return -1;
    return leftDate === rightDate ? 0 : leftDate > rightDate ? direction : -direction;
  }

  if (type === "boolean") {
    const leftBoolean = parseBoolean(left);
    const rightBoolean = parseBoolean(right);
    if (leftBoolean === null && rightBoolean === null) return 0;
    if (leftBoolean === null) return 1;
    if (rightBoolean === null) return -1;
    if (leftBoolean === rightBoolean) return 0;
    return leftBoolean ? -direction : direction;
  }

  const leftText = normalize(left);
  const rightText = normalize(right);
  return leftText.localeCompare(rightText) * direction;
}

function applySorting(
  rows: Record<string, unknown>[],
  orderBy: QuerySort[],
  fieldTypes: Map<string, FilterFieldType>,
): Record<string, unknown>[] {
  if (!orderBy.length) return rows;

  const sorted = [...rows];
  sorted.sort((a, b) => {
    for (const item of orderBy) {
      const field = item.field;
      const type = fieldTypes.get(field) ?? "text";
      const result = compareValues(a[field], b[field], type, item.ascending ?? true);
      if (result !== 0) return result;
    }
    return 0;
  });

  return sorted;
}

function escapeLikeValue(value: string) {
  return value.replace(/[%_]/g, (token) => `\\${token}`);
}

function collectFlatAndConditions(group: FilterGroup | undefined): FilterCondition[] | null {
  if (!group) return [];
  if (group.logic !== "and") return null;

  const output: FilterCondition[] = [];
  for (const node of group.nodes ?? []) {
    if (node.kind === "condition") {
      output.push(node);
      continue;
    }
    const nested = collectFlatAndConditions(node);
    if (!nested) return null;
    output.push(...nested);
  }

  return output;
}

function supportsServerCondition(operator: FilterOperator) {
  return (
    operator === "is" ||
    operator === "is_not" ||
    operator === "gt" ||
    operator === "gte" ||
    operator === "lt" ||
    operator === "lte" ||
    operator === "is_true" ||
    operator === "is_false" ||
    operator === "starts_with" ||
    operator === "ends_with"
  );
}

function applyServerCondition(
  query: any,
  condition: FilterCondition,
) {
  const field = condition.field;
  const value = condition.value;

  switch (condition.operator) {
    case "is":
      return query.eq(field, value);
    case "is_not":
      return query.neq(field, value);
    case "gt":
      return query.gt(field, value);
    case "gte":
      return query.gte(field, value);
    case "lt":
      return query.lt(field, value);
    case "lte":
      return query.lte(field, value);
    case "is_true":
      return query.eq(field, true);
    case "is_false":
      return query.eq(field, false);
    case "starts_with":
      return query.ilike(field, `${escapeLikeValue(value)}%`);
    case "ends_with":
      return query.ilike(field, `%${escapeLikeValue(value)}`);
    default:
      return null;
  }
}

async function fetchAllRows(
  supabase: ReturnType<typeof createClient>,
  table: SupportedTable,
  selectClause: string,
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let offset = 0;

  while (rows.length < MAX_SERVER_SCAN_ROWS) {
    const from = offset;
    const to = offset + BATCH_SIZE - 1;

    const { data, error } = await supabase
      .from(table)
      .select(selectClause)
      .range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    const chunk = (data ?? []) as Record<string, unknown>[];
    rows.push(...chunk);

    if (chunk.length < BATCH_SIZE) {
      break;
    }

    offset += BATCH_SIZE;
  }

  if (rows.length >= MAX_SERVER_SCAN_ROWS) {
    throw new Error(
      `Server scan limit reached (${MAX_SERVER_SCAN_ROWS} rows). Narrow filters or move to SQL filtering.`
    );
  }

  return rows;
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
  const wantsAllFields = requestedFields.length === 0 || requestedFields.includes("*");
  const selectFields = wantsAllFields
    ? ALLOWED_FIELDS[payload.table]
    : sanitizeFields(payload.table, requestedFields);
  const fallbackSchemaFields = selectFields;
  const includeSchema = payload.includeSchema ?? true;

  if (!wantsAllFields && selectFields.length === 0) {
    return badRequest("No valid fields in 'select'");
  }

  const limit = Math.max(1, Math.min(payload.limit ?? 200, 500));
  const offset = Math.max(0, payload.offset ?? 0);
  const orderBy = Array.isArray(payload.orderBy) ? payload.orderBy : [];
  const search = String(payload.search ?? "").trim();
  const searchFields = Array.isArray(payload.searchFields)
    ? payload.searchFields.filter((field) => typeof field === "string" && field.trim())
    : undefined;
  const filters = payload.filters;

  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const flatConditions = collectFlatAndConditions(filters);
    const canUseServerQuery =
      !search &&
      flatConditions !== null &&
      flatConditions.every((condition) => supportsServerCondition(condition.operator));

    if (canUseServerQuery) {
      let serverQuery = supabase
        .from(payload.table)
        .select(selectFields.join(","), { count: "exact" });

      for (const condition of flatConditions) {
        const nextQuery = applyServerCondition(serverQuery, condition);
        if (!nextQuery) {
          throw new Error(`Unsupported server condition: ${condition.operator}`);
        }
        serverQuery = nextQuery;
      }

      const safeOrderBy = orderBy.filter(
        (item) => typeof item.field === "string" && selectFields.includes(item.field)
      );
      for (const item of safeOrderBy) {
        serverQuery = serverQuery.order(item.field, { ascending: item.ascending ?? true });
      }

      const { data, error, count } = await serverQuery.range(offset, offset + limit - 1);
      if (error) {
        throw new Error(error.message);
      }

      const rows = (data ?? []) as Record<string, unknown>[];
      const columns = includeSchema ? inferColumnsFromRows(rows, fallbackSchemaFields) : [];

      return new Response(
        JSON.stringify({
          rows,
          total: count ?? rows.length,
          limit,
          offset,
          columns,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const rows = await fetchAllRows(supabase, payload.table, selectFields.join(","));
    const columns = includeSchema ? inferColumnsFromRows(rows, fallbackSchemaFields) : [];
    const fieldTypes = new Map<string, FilterFieldType>(
      columns.map((column) => [column.name, column.filterType]),
    );

    const safeSearchFields =
      searchFields && searchFields.length > 0
        ? searchFields.filter((field) => field in (rows[0] ?? {}))
        : undefined;

    const rowsAfterSearch = search
      ? applySearch(rows, search, safeSearchFields)
      : rows;

    const rowsAfterFilter =
      filters && filters.kind === "group"
        ? rowsAfterSearch.filter((row) => evaluateGroup(row, filters, fieldTypes))
        : rowsAfterSearch;

    const safeOrderBy = orderBy.filter((item) =>
      typeof item.field === "string" && item.field in (rowsAfterFilter[0] ?? {})
    );

    const rowsAfterSort = applySorting(rowsAfterFilter, safeOrderBy, fieldTypes);
    const total = rowsAfterSort.length;
    const paginatedRows = rowsAfterSort.slice(offset, offset + limit);

    return new Response(
      JSON.stringify({
        rows: paginatedRows,
        total,
        limit,
        offset,
        columns,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return serverError(message);
  }
});
