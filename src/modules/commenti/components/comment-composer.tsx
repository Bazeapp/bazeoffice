import * as React from "react"
import { ArrowRightIcon } from "lucide-react"

import { useOperatoriOptions } from "@/hooks/use-operatori-options"
import { cn } from "@/lib/utils"

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
    <div className="mt-2">
      {replyToLabel ? (
        <div className="mb-1.5 flex items-center justify-between gap-2 text-[11.5px] text-[#6b7280]">
          <span data-testid="comments-reply-banner">
            ↩ Risposta a <span className="font-semibold">{replyToLabel}</span>
          </span>
          {onCancelReply ? (
            <button
              type="button"
              className="text-[#9ca3af] underline-offset-2 hover:underline"
              onClick={onCancelReply}
            >
              Annulla
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="relative flex items-end gap-2">
        {mention.isOpen ? (
          <MentionAutocomplete
            sections={mention.sections}
            highlightedIndex={mention.highlightedIndex}
            onSelect={mention.selectOperator}
            className="absolute bottom-full left-0 z-20 mb-1.5 w-full"
          />
        ) : null}
        <textarea
          ref={inputRef}
          data-testid="comments-composer-input"
          value={draft}
          disabled={disabled || isSubmitting || operatorsLoading}
          placeholder={placeholder}
          rows={1}
          className={cn(
            "min-h-9.5 flex-1 resize-none rounded-[9px] border border-[#e0e3e9] bg-white",
            "px-3 py-2 text-[13px] outline-none placeholder:text-[#9ca3af]",
            "focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
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
        <button
          type="button"
          data-testid="comments-composer-submit"
          aria-label="Invia commento"
          className={cn(
            "flex size-9.5 shrink-0 cursor-pointer items-center justify-center rounded-[9px]",
            "bg-[#2563EB] text-white transition-colors hover:bg-[#1D4ED8]",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
          disabled={disabled || isSubmitting || !draft.trim()}
          onClick={() => void handleSubmit()}
        >
          <ArrowRightIcon className="size-4" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}
