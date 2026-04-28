type QueryProfilerStatus = "success" | "error";

export type QueryProfilerRequestSummary = {
  functionName?: string;
  table?: string;
  operation?: string;
  limit?: number;
  offset?: number;
  selectCount?: number;
  filtersCount?: number;
  orderByCount?: number;
  groupByCount?: number;
  includeSchema?: boolean;
  hasSearch?: boolean;
  patchFieldsCount?: number;
  valuesFieldsCount?: number;
  contextFieldsCount?: number;
};

export type QueryProfilerEvent = {
  id: string;
  name: string;
  kind: string;
  method: string;
  url: string;
  path: string;
  page: string;
  status: QueryProfilerStatus;
  statusCode?: number;
  durationMs: number;
  rows?: number;
  responseBytes?: number;
  request?: QueryProfilerRequestSummary;
  startedAt: string;
  endedAt: string;
  error?: string;
};

type QueryProfilerApi = {
  clear: () => void;
  disable: () => void;
  enable: () => void;
  export: () => QueryProfilerEvent[];
  getEvents: () => QueryProfilerEvent[];
};

const QUERY_PROFILER_FLAG = "baze:query-profiler";
const QUERY_PROFILER_MAX_EVENTS = 500;
const RESPONSE_JSON_PARSE_MAX_BYTES = 1_000_000;

const events: QueryProfilerEvent[] = [];

declare global {
  interface Window {
    __BAZE_QUERY_PROFILER__?: QueryProfilerApi;
  }
}

function canUseBrowserApis() {
  return typeof window !== "undefined" && typeof performance !== "undefined";
}

function getPageLabel() {
  if (!canUseBrowserApis()) return "unknown";
  return `${window.location.pathname}${window.location.hash}`;
}

function getFlagFromUrl() {
  if (!canUseBrowserApis()) return null;
  return new URLSearchParams(window.location.search).get("queryProfiler");
}

export function isQueryProfilerEnabled() {
  if (import.meta.env.DEV) return true;
  if (!canUseBrowserApis()) return false;

  const flagFromUrl = getFlagFromUrl();
  if (flagFromUrl === "1") {
    window.localStorage.setItem(QUERY_PROFILER_FLAG, "1");
    return true;
  }
  if (flagFromUrl === "0") {
    window.localStorage.removeItem(QUERY_PROFILER_FLAG);
    return false;
  }

  return window.localStorage.getItem(QUERY_PROFILER_FLAG) === "1";
}

function ensureProfilerApi() {
  if (!canUseBrowserApis() || window.__BAZE_QUERY_PROFILER__) return;

  window.__BAZE_QUERY_PROFILER__ = {
    clear: () => {
      events.splice(0, events.length);
      console.info("[query-profiler] cleared");
    },
    disable: () => {
      window.localStorage.removeItem(QUERY_PROFILER_FLAG);
      console.info("[query-profiler] disabled. Reload the page to stop profiling.");
    },
    enable: () => {
      window.localStorage.setItem(QUERY_PROFILER_FLAG, "1");
      console.info("[query-profiler] enabled. Reload the page to start profiling.");
    },
    export: () => {
      const snapshot = [...events];
      console.table(snapshot);
      return snapshot;
    },
    getEvents: () => [...events],
  };
}

function pushEvent(event: QueryProfilerEvent) {
  events.push(event);
  if (events.length > QUERY_PROFILER_MAX_EVENTS) {
    events.splice(0, events.length - QUERY_PROFILER_MAX_EVENTS);
  }
}

function makeEventId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getContentLength(response: Response) {
  const contentLength = response.headers.get("content-length");
  if (!contentLength) return undefined;

  const bytes = Number(contentLength);
  return Number.isFinite(bytes) ? bytes : undefined;
}

function parseRowsFromContentRange(contentRange: string | null) {
  if (!contentRange) return undefined;
  const match = contentRange.match(/\/(\d+|\*)$/);
  if (!match || match[1] === "*") return undefined;
  const rows = Number(match[1]);
  return Number.isFinite(rows) ? rows : undefined;
}

function parseRowsFromJsonBody(body: unknown) {
  if (Array.isArray(body)) return body.length;
  if (
    typeof body === "object" &&
    body !== null &&
    "data" in body &&
    Array.isArray((body as { data?: unknown }).data)
  ) {
    return (body as { data: unknown[] }).data.length;
  }
  if (
    typeof body === "object" &&
    body !== null &&
    "rows" in body &&
    Array.isArray((body as { rows?: unknown }).rows)
  ) {
    return (body as { rows: unknown[] }).rows.length;
  }

  return undefined;
}

async function parseResponseStats(response: Response) {
  const rowsFromHeader = parseRowsFromContentRange(response.headers.get("content-range"));
  const bytesFromHeader = getContentLength(response);

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return {
      rows: rowsFromHeader,
      responseBytes: bytesFromHeader,
    };
  }

  try {
    const text = await response.text();
    const responseBytes = bytesFromHeader ?? new Blob([text]).size;

    if (responseBytes > RESPONSE_JSON_PARSE_MAX_BYTES) {
      return {
        rows: rowsFromHeader,
        responseBytes,
      };
    }

    return {
      rows: rowsFromHeader ?? parseRowsFromJsonBody(JSON.parse(text)),
      responseBytes,
    };
  } catch {
    return {
      rows: rowsFromHeader,
      responseBytes: bytesFromHeader,
    };
  }
}

function getUrl(input: RequestInfo | URL) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function getMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) return init.method.toUpperCase();
  if (typeof input === "object" && "method" in input && input.method) {
    return input.method.toUpperCase();
  }
  return "GET";
}

function describeSupabaseRequest(inputUrl: string, fallbackName?: string) {
  const url = new URL(inputUrl);
  const path = url.pathname;

  if (path.startsWith("/rest/v1/")) {
    const table = path.replace("/rest/v1/", "").split("/")[0] || "unknown";
    return { kind: "rest", name: fallbackName ?? `rest:${table}`, path };
  }

  if (path.startsWith("/functions/v1/")) {
    const functionName = path.replace("/functions/v1/", "").split("/")[0] || "unknown";
    return { kind: "edge-function", name: fallbackName ?? `edge:${functionName}`, path };
  }

  if (path.startsWith("/storage/v1/")) {
    return { kind: "storage", name: fallbackName ?? "storage", path };
  }

  if (path.startsWith("/auth/v1/")) {
    const action = path.replace("/auth/v1/", "").split("/")[0] || "unknown";
    return { kind: "auth", name: fallbackName ?? `auth:${action}`, path };
  }

  return { kind: "supabase", name: fallbackName ?? path, path };
}

function logEvent(event: QueryProfilerEvent) {
  const rowsLabel = typeof event.rows === "number" ? ` rows=${event.rows}` : "";
  const bytesLabel =
    typeof event.responseBytes === "number"
      ? ` bytes=${Math.round(event.responseBytes / 1024)}kb`
      : "";
  const tableLabel = event.request?.table ? ` table=${event.request.table}` : "";
  const limitLabel = typeof event.request?.limit === "number" ? ` limit=${event.request.limit}` : "";
  const filtersLabel =
    typeof event.request?.filtersCount === "number" ? ` filters=${event.request.filtersCount}` : "";
  const statusLabel =
    event.status === "success" ? event.statusCode : `${event.statusCode ?? "ERR"} ${event.error ?? ""}`;
  console.info(
    `[query] ${event.name}${tableLabel}${limitLabel}${filtersLabel} ${Math.round(
      event.durationMs,
    )}ms status=${statusLabel}${rowsLabel}${bytesLabel} page=${event.page}`,
    event,
  );
}

export async function profiledFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: { name?: string; request?: QueryProfilerRequestSummary },
) {
  ensureProfilerApi();

  if (!isQueryProfilerEnabled()) {
    return fetch(input, init);
  }

  const inputUrl = getUrl(input);
  const method = getMethod(input, init);
  const request = describeSupabaseRequest(inputUrl, options?.name);
  const page = getPageLabel();
  const startedAtMs = performance.now();
  const startedAt = new Date().toISOString();
  const markName = `query:${request.name}:${startedAtMs}`;

  performance.mark(markName);

  try {
    const response = await fetch(input, init);
    const endedAtMs = performance.now();
    const event: QueryProfilerEvent = {
      id: makeEventId(),
      name: request.name,
      kind: request.kind,
      method,
      url: inputUrl,
      path: request.path,
      page,
      status: response.ok ? "success" : "error",
      statusCode: response.status,
      durationMs: endedAtMs - startedAtMs,
      request: options?.request,
      startedAt,
      endedAt: new Date().toISOString(),
    };

    pushEvent(event);
    logEvent(event);
    performance.measure(`query:${request.name}`, markName);

    const responseForRows = response.clone();
    void parseResponseStats(responseForRows).then((stats) => {
      if (typeof stats.rows === "number") {
        event.rows = stats.rows;
      }
      if (typeof stats.responseBytes === "number") {
        event.responseBytes = stats.responseBytes;
      }
    });

    return response;
  } catch (error) {
    const endedAtMs = performance.now();
    const event: QueryProfilerEvent = {
      id: makeEventId(),
      name: request.name,
      kind: request.kind,
      method,
      url: inputUrl,
      path: request.path,
      page,
      status: "error",
      durationMs: endedAtMs - startedAtMs,
      request: options?.request,
      startedAt,
      endedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    };

    pushEvent(event);
    logEvent(event);
    performance.measure(`query:${request.name}`, markName);
    throw error;
  }
}
