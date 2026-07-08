import { invokeEdgeFunction } from "@/lib/supabase-edge"

let pendingWriteCount = 0
let pendingWriteUnloadGuardInstalled = false

function installPendingWriteUnloadGuard() {
  if (pendingWriteUnloadGuardInstalled || typeof window === "undefined") return
  pendingWriteUnloadGuardInstalled = true

  window.addEventListener("beforeunload", (event) => {
    if (pendingWriteCount <= 0) return
    event.preventDefault()
    event.returnValue = ""
  })
}

let lastLocalWriteAt = 0

const readCacheInvalidators = new Set<() => void>()

export function registerReadCacheInvalidator(fn: () => void) {
  readCacheInvalidators.add(fn)
}

async function trackWrite<TResponse>(operation: Promise<TResponse>) {
  installPendingWriteUnloadGuard()
  pendingWriteCount += 1

  try {
    const result = await operation
    lastLocalWriteAt = Date.now()
    return result
  } finally {
    pendingWriteCount = Math.max(0, pendingWriteCount - 1)
  }
}

export function beginPendingWrite() {
  installPendingWriteUnloadGuard()
  pendingWriteCount += 1
}

export function endPendingWrite() {
  pendingWriteCount = Math.max(0, pendingWriteCount - 1)
  lastLocalWriteAt = Date.now()
}

export function getPendingWriteCount() {
  return pendingWriteCount
}

export function getMillisSinceLastLocalWrite() {
  return lastLocalWriteAt === 0 ? Number.POSITIVE_INFINITY : Date.now() - lastLocalWriteAt
}

/**
 * Run an arbitrary write-producing promise under the pending-write tracking
 * machinery (echo-window suppression in useRealtimeBoardSync).
 */
export function runTracked<TResponse>(operation: Promise<TResponse>) {
  return trackWrite(operation)
}

/**
 * Convenience wrapper for invokeEdgeFunction against a write-producing edge
 * function, wrapped in trackWrite.
 */
export function runTrackedEdgeFunction<TResponse = unknown>(name: string, payload: unknown) {
  return trackWrite(invokeEdgeFunction<TResponse>(name, payload))
}

/**
 * Reset process-wide read caches that are not owned by React Query.
 * Invalidators are registered by modules that hold such caches (e.g. lookup values).
 */
export function clearReadCaches() {
  for (const invalidate of readCacheInvalidators) {
    invalidate()
  }
}

/** @internal Used by record-crud edge-function writers. */
export function runTrackedWrite<TResponse>(operation: Promise<TResponse>) {
  return trackWrite(operation)
}
