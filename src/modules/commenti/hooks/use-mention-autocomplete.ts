import * as React from "react"

import type { OperatoreOption } from "@/hooks/use-operatori-options"

import {
  filterOperatorsByQuery,
  getMentionTriggerState,
  insertMentionMarkup,
  partitionInvolvedOperators,
} from "../lib/mention-markup"

export type UseMentionAutocompleteOptions = {
  value: string
  onChange: (value: string) => void
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>
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
  textareaRef,
  operators,
  involvedOperatorIds,
}: UseMentionAutocompleteOptions) {
  const [cursor, setCursor] = React.useState(0)
  const [highlightedIndex, setHighlightedIndex] = React.useState(0)

  const trigger = React.useMemo(
    () => getMentionTriggerState(value, cursor),
    [cursor, value],
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

  const selectOperator = React.useCallback(
    (operator: OperatoreOption) => {
      if (!trigger) return
      const { nextValue, nextCursor } = insertMentionMarkup(
        value,
        cursor,
        trigger,
        operator.label,
        operator.id,
      )
      onChange(nextValue)
      setCursor(nextCursor)
      window.requestAnimationFrame(() => {
        const node = textareaRef?.current
        if (!node) return
        node.focus()
        node.setSelectionRange(nextCursor, nextCursor)
      })
    },
    [cursor, onChange, textareaRef, trigger, value],
  )

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
        setCursor(trigger?.start ?? cursor)
        return true
      }

      return false
    },
    [cursor, flatOptions, highlightedIndex, isOpen, selectOperator, trigger?.start],
  )

  const syncCursor = React.useCallback(
    (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
      const target = event.currentTarget
      setCursor(target.selectionStart ?? 0)
    },
    [],
  )

  return {
    isOpen,
    sections,
    highlightedIndex,
    selectOperator,
    handleKeyDown,
    syncCursor,
  }
}
