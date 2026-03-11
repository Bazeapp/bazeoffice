import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type SupportedTable =
  | "famiglie"
  | "lavoratori"
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
    "nome",
    "cognome",
    "disponibilita",
    "stato_lavoratore",
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
    ? ["*"]
    : sanitizeFields(payload.table, requestedFields);
  const fallbackSchemaFields = wantsAllFields
    ? ALLOWED_FIELDS[payload.table]
    : selectFields;

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
    const rows = await fetchAllRows(supabase, payload.table, selectFields.join(","));
    const columns = inferColumnsFromRows(rows, fallbackSchemaFields);
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
