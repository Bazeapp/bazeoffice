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
    throw new Error(
      `Edge function '${functionName}' failed (${response.status}): ${errorBody}`
    )
  }

  return (await response.json()) as TResponse
}
