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
  // Once the user has typed in this field, never let an incoming committedValue
  // overwrite the local draft. The previous gate (isDirty || savesInFlight > 0)
  // had a window between debounce-fire and the next keystroke where the server
  // value could replace what the user was about to keep typing, causing dropped
  // characters / collapsed spaces.
  const hasUserEditedRef = React.useRef(false)

  // Keep onSave ref current so the flush closure always calls the latest version
  React.useEffect(() => {
    onSaveRef.current = onSave
  })

  // Sync committed value from server only when the user has never interacted
  // with this field (initial mount + remote refresh of an untouched field).
  React.useEffect(() => {
    if (hasUserEditedRef.current) return
    setDraft(committedValue)
    draftRef.current = committedValue
  }, [committedValue])

  // Flush pending save on unmount (sheet close).
  // The cleanup intentionally reads the refs at the time the component is
  // unmounting, not at effect-setup time — that's the whole point of the
  // flush-on-unmount pattern.
  /* eslint-disable react-hooks/exhaustive-deps */
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
  /* eslint-enable react-hooks/exhaustive-deps */

  const onChange = React.useCallback(
    (value: T) => {
      hasUserEditedRef.current = true
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
