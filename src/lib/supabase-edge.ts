import { supabase } from "@/lib/supabase-client"
import {
  profiledFetch,
  type QueryProfilerRequestSummary,
} from "@/lib/query-profiler"

const SUPABASE_ANON_KEY = import.meta.env
  .VITE_SUPABASE_ANON_KEY as string | undefined
const SUPABASE_FUNCTIONS_URL = import.meta.env
  .VITE_SUPABASE_FUNCTIONS_URL as string | undefined

function getFunctionsBaseUrl() {
  if (!SUPABASE_FUNCTIONS_URL) {
    throw new Error("Missing VITE_SUPABASE_FUNCTIONS_URL")
  }
  return SUPABASE_FUNCTIONS_URL
}

const EDGE_FUNCTION_MAX_ATTEMPTS = 3
const EDGE_FUNCTION_RETRY_DELAY_MS = 350

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function isRetryableStatus(status: number) {
  return status >= 500 || status === 408 || status === 429
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function countFilterConditions(value: unknown): number | undefined {
  if (!isRecord(value)) return undefined

  if (value.kind === "condition") return 1

  const nodes = value.nodes
  if (!Array.isArray(nodes)) return 0

  return nodes.reduce((count, node) => count + (countFilterConditions(node) ?? 0), 0)
}

function getNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function countRecordKeys(value: unknown) {
  return isRecord(value) ? Object.keys(value).length : undefined
}

function summarizeEdgePayload(
  functionName: string,
  payload: unknown
): QueryProfilerRequestSummary {
  const summary: QueryProfilerRequestSummary = { functionName }

  if (!isRecord(payload)) return summary

  if (typeof payload.table === "string") {
    summary.table = payload.table
  }

  if (typeof payload.operation === "string") {
    summary.operation = payload.operation
  } else if (functionName === "table-query") {
    summary.operation = "select"
  } else {
    summary.operation = functionName
  }

  summary.limit = getNumber(payload.limit)
  summary.offset = getNumber(payload.offset)

  if (Array.isArray(payload.select)) {
    summary.selectCount = payload.select.length
  }
  if (Array.isArray(payload.orderBy)) {
    summary.orderByCount = payload.orderBy.length
  }
  if (Array.isArray(payload.groupBy)) {
    summary.groupByCount = payload.groupBy.length
  }
  if (typeof payload.includeSchema === "boolean") {
    summary.includeSchema = payload.includeSchema
  }
  if (typeof payload.search === "string") {
    summary.hasSearch = payload.search.trim().length > 0
  }

  const filtersCount = countFilterConditions(payload.filters)
  if (typeof filtersCount === "number") {
    summary.filtersCount = filtersCount
  }

  summary.patchFieldsCount = countRecordKeys(payload.patch)
  summary.valuesFieldsCount = countRecordKeys(payload.values)
  summary.contextFieldsCount = countRecordKeys(payload.context)

  return summary
}

export async function invokeEdgeFunction<TResponse>(
  functionName: string,
  payload: unknown
): Promise<TResponse> {
  if (!SUPABASE_ANON_KEY) {
    throw new Error("Missing VITE_SUPABASE_ANON_KEY")
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  if (!session?.access_token) {
    throw new Error("Missing authenticated session")
  }

  const baseUrl = getFunctionsBaseUrl()
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= EDGE_FUNCTION_MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await profiledFetch(
        `${baseUrl}/${functionName}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        },
        {
          name: `edge:${functionName}`,
          request: summarizeEdgePayload(functionName, payload),
        },
      )

      if (!response.ok) {
        const errorBody = await response.text()
        if (attempt < EDGE_FUNCTION_MAX_ATTEMPTS && isRetryableStatus(response.status)) {
          await wait(EDGE_FUNCTION_RETRY_DELAY_MS * attempt)
          continue
        }

        throw new Error(
          `Edge function '${functionName}' failed (${response.status}): ${errorBody}`
        )
      }

      return (await response.json()) as TResponse
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      const isNetworkError =
        lastError.message === "Failed to fetch" ||
        lastError.message.includes("Load failed") ||
        lastError.name === "TypeError"

      if (!isNetworkError || attempt >= EDGE_FUNCTION_MAX_ATTEMPTS) {
        throw lastError
      }

      await wait(EDGE_FUNCTION_RETRY_DELAY_MS * attempt)
    }
  }

  throw lastError ?? new Error(`Edge function '${functionName}' failed`)
}
