import * as React from "react"
import { toast } from "sonner"

import { beginPendingWrite, endPendingWrite } from "@/lib/anagrafiche-api"

const DEFAULT_DEBOUNCE_MS = 300

// Surface a failed debounced save. Before this, onSave was fire-and-forget
// (`void ...finally()` with no `.catch`): a rejected save logged to the console
// and the user kept seeing the typed value as if persisted. This hook backs
// ~133 editable fields, so this single catch makes every one of them report
// save failures.
function notifySaveError(error: unknown) {
  toast.error(
    error instanceof Error && error.message
      ? error.message
      : "Errore durante il salvataggio",
  )
}

export function useDebouncedSave<T>(
  committedValue: T,
  onSave: (value: T) => Promise<void>,
  options?: { debounceMs?: number; identity?: unknown }
): {
  value: T
  onChange: (value: T) => void
} {
  const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS
  // Optional identity of the record this field is bound to (e.g. the selected
  // worker id). When the same hook instance is reused across records (the field
  // is NOT remounted, as in the gate views), passing `identity` lets the hook
  // flush a pending edit to the PREVIOUS record and resync the draft when the
  // bound record changes. Without it the draft keeps the previous record's text
  // and a late debounce fires against the newly selected record.
  const identity = options?.identity

  const [draft, setDraft] = React.useState<T>(committedValue)

  const isDirtyRef = React.useRef(false)
  const savesInFlightRef = React.useRef(0)
  const draftRef = React.useRef<T>(committedValue)
  const onSaveRef = React.useRef(onSave)
  // `onSave` captured at the last keystroke — bound to the record being edited
  // at that moment. Used to flush to the ORIGINAL record even if `identity`
  // changes before the debounce fires.
  const scheduledOnSaveRef = React.useRef(onSave)
  const committedValueRef = React.useRef(committedValue)
  const identityRef = React.useRef(identity)
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

  // Mirror the latest committedValue so the identity-change effect can resync
  // the draft to the newly bound record.
  React.useEffect(() => {
    committedValueRef.current = committedValue
  })

  // Sync committed value from server only when the user has never interacted
  // with this field (initial mount + remote refresh of an untouched field).
  React.useEffect(() => {
    if (hasUserEditedRef.current) return
    setDraft(committedValue)
    draftRef.current = committedValue
  }, [committedValue])

  // When the bound record changes (e.g. the operator selects another worker),
  // flush any pending edit to the PREVIOUS record (via the keystroke-time
  // onSave) and reset the draft to the new record's value.
  /* eslint-disable react-hooks/exhaustive-deps */
  React.useEffect(() => {
    if (identityRef.current === identity) return
    identityRef.current = identity

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (isDirtyRef.current) {
      isDirtyRef.current = false
      savesInFlightRef.current++
      void scheduledOnSaveRef.current(draftRef.current)
        .catch(notifySaveError)
        .finally(() => {
          savesInFlightRef.current--
          endPendingWrite()
        })
    }

    hasUserEditedRef.current = false
    setDraft(committedValueRef.current)
    draftRef.current = committedValueRef.current
  }, [identity])
  /* eslint-enable react-hooks/exhaustive-deps */

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
        void onSaveRef.current(draftRef.current)
          .catch(notifySaveError)
          .finally(() => {
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
      // Bind the pending save to the record currently being edited so that a
      // later flush (debounce fire or identity switch) targets THIS record.
      scheduledOnSaveRef.current = onSaveRef.current

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
        void onSaveRef.current(draftRef.current)
          .catch(notifySaveError)
          .finally(() => {
            savesInFlightRef.current--
            endPendingWrite()
          })
      }, debounceMs)
    },
    [debounceMs]
  )

  return { value: draft, onChange }
}
