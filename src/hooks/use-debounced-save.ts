import * as React from "react"

import { beginPendingWrite, endPendingWrite } from "@/lib/anagrafiche-api"

const DEFAULT_DEBOUNCE_MS = 300

export function useDebouncedSave<T>(
  committedValue: T,
  onSave: (value: T) => Promise<void>,
  options?: { debounceMs?: number }
): {
  value: T
  onChange: (value: T) => void
} {
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS

  const [draft, setDraft] = React.useState<T>(committedValue)

  const isDirtyRef = React.useRef(false)
  const savesInFlightRef = React.useRef(0)
  const draftRef = React.useRef<T>(committedValue)
  const onSaveRef = React.useRef(onSave)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep onSave ref current so the flush closure always calls the latest version
  React.useEffect(() => {
    onSaveRef.current = onSave
  })

  // Sync committed value from server only when no local edits are pending
  // AND no save is currently in-flight (to avoid overwriting mid-save)
  React.useEffect(() => {
    if (isDirtyRef.current || savesInFlightRef.current > 0) return
    setDraft(committedValue)
    draftRef.current = committedValue
  }, [committedValue])

  // Flush pending save on unmount (sheet close)
  React.useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      if (isDirtyRef.current) {
        savesInFlightRef.current++
        isDirtyRef.current = false
        void onSaveRef.current(draftRef.current).finally(() => {
          savesInFlightRef.current--
          endPendingWrite()
        })
      }
    }
  }, [])

  const onChange = React.useCallback(
    (value: T) => {
      setDraft(value)
      draftRef.current = value

      if (!isDirtyRef.current) {
        isDirtyRef.current = true
        beginPendingWrite()
      }

      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }

      timerRef.current = setTimeout(() => {
        timerRef.current = null
        isDirtyRef.current = false
        savesInFlightRef.current++
        void onSaveRef.current(draftRef.current).finally(() => {
          savesInFlightRef.current--
          endPendingWrite()
        })
      }, debounceMs)
    },
    [debounceMs]
  )

  return { value: draft, onChange }
}
