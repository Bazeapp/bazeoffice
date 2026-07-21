import * as React from "react"

import type { OperatoreOption } from "@/hooks/use-operatori-options"

import {
  filterOperatorsByQuery,
  getMentionTriggerState,
  insertMentionMarkup,
  partitionInvolvedOperators,
  setMarkupCaretOffset,
} from "../lib/mentions"

export type UseMentionAutocompleteOptions = {
  value: string
  onChange: (value: string) => void
  editorRef?: React.RefObject<HTMLElement | null>
  getCursor?: () => number
  onCursorChange?: (cursor: number) => void
  operators: OperatoreOption[]
  involvedOperatorIds: string[]
}

export type MentionAutocompleteSection = {
  title: string
  options: OperatoreOption[]
}

export function useMentionAutocomplete({
  value,
  onChange,
  editorRef,
  getCursor,
  onCursorChange,
  operators,
  involvedOperatorIds,
}: UseMentionAutocompleteOptions) {
  const [cursor, setCursor] = React.useState(0)
  const [highlightedIndex, setHighlightedIndex] = React.useState(0)

  const resolvedCursor = getCursor?.() ?? cursor

  const trigger = React.useMemo(
    () => getMentionTriggerState(value, resolvedCursor),
    [resolvedCursor, value],
  )

  const filteredOperators = React.useMemo(() => {
    if (!trigger) return []
    return filterOperatorsByQuery(operators, trigger.query)
  }, [operators, trigger])

  const sections = React.useMemo((): MentionAutocompleteSection[] => {
    if (!trigger) return []
    const { involved, others } = partitionInvolvedOperators(
      filteredOperators,
      involvedOperatorIds,
    )
    const next: MentionAutocompleteSection[] = []
    if (involved.length > 0) {
      next.push({ title: "In questo contesto", options: involved })
    }
    if (others.length > 0) {
      next.push({ title: "Tutti gli operatori", options: others })
    }
    return next
  }, [filteredOperators, involvedOperatorIds, trigger])

  const flatOptions = React.useMemo(
    () => sections.flatMap((section) => section.options),
    [sections],
  )

  const isOpen = Boolean(trigger && flatOptions.length > 0)

  React.useEffect(() => {
    setHighlightedIndex(0)
  }, [trigger?.start, trigger?.query])

  const updateCursor = React.useCallback(
    (nextCursor: number) => {
      onCursorChange?.(nextCursor)
      setCursor(nextCursor)
    },
    [onCursorChange],
  )

  const selectOperator = React.useCallback(
    (operator: OperatoreOption) => {
      if (!trigger) return
      const { nextValue, nextCursor } = insertMentionMarkup(
        value,
        resolvedCursor,
        trigger,
        operator.label,
        operator.id,
      )
      onChange(nextValue)
      updateCursor(nextCursor)
      window.requestAnimationFrame(() => {
        const node = editorRef?.current
        if (!node) return
        node.focus()
        setMarkupCaretOffset(node, nextCursor)
      })
    },
    [editorRef, onChange, resolvedCursor, trigger, updateCursor, value],
  )

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if (!isOpen) return false

      if (event.key === "ArrowDown") {
        event.preventDefault()
        setHighlightedIndex((index) =>
          index + 1 >= flatOptions.length ? 0 : index + 1,
        )
        return true
      }

      if (event.key === "ArrowUp") {
        event.preventDefault()
        setHighlightedIndex((index) =>
          index - 1 < 0 ? flatOptions.length - 1 : index - 1,
        )
        return true
      }

      if (event.key === "Enter" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        const selected = flatOptions[highlightedIndex]
        if (selected) selectOperator(selected)
        return true
      }

      if (event.key === "Escape") {
        event.preventDefault()
        updateCursor(trigger?.start ?? resolvedCursor)
        return true
      }

      return false
    },
    [
      flatOptions,
      highlightedIndex,
      isOpen,
      resolvedCursor,
      selectOperator,
      trigger?.start,
      updateCursor,
    ],
  )

  const syncCursor = React.useCallback(() => {
    const nextCursor = getCursor?.() ?? 0
    updateCursor(nextCursor)
  }, [getCursor, updateCursor])

  return {
    isOpen,
    sections,
    highlightedIndex,
    selectOperator,
    handleKeyDown,
    syncCursor,
  }
}
