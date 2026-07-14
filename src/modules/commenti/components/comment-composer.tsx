import * as React from "react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useOperatoriOptions } from "@/hooks/use-operatori-options"

import { useMentionAutocomplete } from "../hooks/use-mention-autocomplete"
import { MentionAutocomplete } from "./mention-autocomplete"

type CommentComposerProps = {
  placeholder: string
  disabled?: boolean
  isSubmitting?: boolean
  replyToLabel?: string | null
  involvedOperatorIds?: string[]
  onCancelReply?: () => void
  onSubmit: (body: string) => Promise<void> | void
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
  onFocusChange?: (focused: boolean) => void
}

export function CommentComposer({
  placeholder,
  disabled = false,
  isSubmitting = false,
  replyToLabel,
  involvedOperatorIds = [],
  onCancelReply,
  onSubmit,
  inputRef,
  onFocusChange,
}: CommentComposerProps) {
  const [draft, setDraft] = React.useState("")
  const { options: operators, loading: operatorsLoading } = useOperatoriOptions({
    activeOnly: true,
  })

  const mention = useMentionAutocomplete({
    value: draft,
    onChange: setDraft,
    textareaRef: inputRef,
    operators,
    involvedOperatorIds,
  })

  const handleSubmit = React.useCallback(async () => {
    const body = draft.trim()
    if (!body || disabled || isSubmitting) return
    await onSubmit(body)
    setDraft("")
    onCancelReply?.()
  }, [disabled, draft, isSubmitting, onCancelReply, onSubmit])

  return (
    <div className="space-y-2 border-t border-border pt-3">
      {replyToLabel ? (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span data-testid="comments-reply-banner">Risposta a {replyToLabel}</span>
          {onCancelReply ? (
            <button
              type="button"
              className="underline-offset-2 hover:underline"
              onClick={onCancelReply}
            >
              Annulla
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="relative">
        {mention.isOpen ? (
          <MentionAutocomplete
            sections={mention.sections}
            highlightedIndex={mention.highlightedIndex}
            onSelect={mention.selectOperator}
            className="absolute bottom-full left-0 z-50 mb-1"
          />
        ) : null}
        <Textarea
          ref={inputRef}
          data-testid="comments-composer-input"
          value={draft}
          disabled={disabled || isSubmitting || operatorsLoading}
          placeholder={placeholder}
          rows={3}
          className="min-h-20 resize-none text-sm"
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          onClick={mention.syncCursor}
          onKeyUp={mention.syncCursor}
          onSelect={mention.syncCursor}
          onChange={(event) => {
            setDraft(event.target.value)
            mention.syncCursor(event)
          }}
          onKeyDown={(event) => {
            if (mention.handleKeyDown(event)) return
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault()
              void handleSubmit()
            }
          }}
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          data-testid="comments-composer-submit"
          disabled={disabled || isSubmitting || !draft.trim()}
          onClick={() => void handleSubmit()}
        >
          Invia
        </Button>
      </div>
    </div>
  )
}
