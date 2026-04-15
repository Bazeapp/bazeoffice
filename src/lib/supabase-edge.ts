import { supabase } from "@/lib/supabase-client"

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
      const response = await fetch(`${baseUrl}/${functionName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      })

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
