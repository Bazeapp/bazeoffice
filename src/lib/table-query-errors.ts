export function isTransientTableQueryError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /503|temporarily unavailable|SUPABASE_EDGE_RUNTIME_ERROR|edge function/i.test(message)
}

export function getTableQueryLoadErrorMessage(
  error: unknown,
  fallback: string,
  transientFallback = fallback,
) {
  if (isTransientTableQueryError(error)) {
    return transientFallback
  }

  return fallback
}
