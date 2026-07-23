import * as React from "react"
import { ArrowRightIcon } from "lucide-react"

import { useOperatoriOptions } from "@/hooks/use-operatori-options"
import { cn } from "@/lib/utils"

import { useMentionAutocomplete } from "../hooks/use-mention-autocomplete"
import {
  deleteMentionChipBeforeCaret,
  getMarkupCaretOffset,
  insertComposerLineBreak,
  normalizeComposerDom,
  renderComposerMarkup,
  serializeComposerMarkup,
  setMarkupCaretOffset,
} from "../lib/mentions"
import { MentionAutocomplete } from "./mention-autocomplete"

type CommentComposerProps = {
  placeholder: string
  disabled?: boolean
  isSubmitting?: boolean
  replyToLabel?: string | null
  involvedOperatorIds?: string[]
  onCancelReply?: () => void
  onSubmit: (body: string) => Promise<void> | void
  inputRef?: React.RefObject<HTMLDivElement | null>
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
  const localEditorRef = React.useRef<HTMLDivElement>(null)
  const editorRef = inputRef ?? localEditorRef
  const isSyncingEditorRef = React.useRef(false)

  const { options: operators, loading: operatorsLoading } = useOperatoriOptions({
    activeOnly: true,
  })

  const readCursor = () => {
    const editor = editorRef.current
    if (!editor) return 0
    return getMarkupCaretOffset(editor)
  }

  const syncEditorFromMarkup = (markup: string, cursor?: number) => {
    const editor = editorRef.current
    if (!editor) return

    isSyncingEditorRef.current = true
    renderComposerMarkup(editor, markup)
    if (cursor !== undefined) {
      setMarkupCaretOffset(editor, cursor)
    }
    isSyncingEditorRef.current = false
  }

  const mention = useMentionAutocomplete({
    value: draft,
    onChange: setDraft,
    editorRef,
    getCursor: readCursor,
    operators,
    involvedOperatorIds,
  })

  React.useLayoutEffect(() => {
    const editor = editorRef.current
    if (!editor || isSyncingEditorRef.current) return

    const renderedMarkup = serializeComposerMarkup(editor)
    if (renderedMarkup !== draft) {
      const cursor = getMarkupCaretOffset(editor)
      syncEditorFromMarkup(draft, cursor)
    }
    // editorRef is stable; syncEditorFromMarkup reads editorRef.current at call time.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draft-only sync
  }, [draft])

  const commitEditorMarkup = () => {
    const editor = editorRef.current
    if (!editor) return

    normalizeComposerDom(editor)
    const nextMarkup = serializeComposerMarkup(editor)
    if (nextMarkup !== draft) {
      setDraft(nextMarkup)
    }
    mention.syncCursor()
  }

  const handleSubmit = React.useCallback(async () => {
    const body = draft.trim()
    if (!body || disabled || isSubmitting) return
    await onSubmit(body)
    setDraft("")
    syncEditorFromMarkup("")
    onCancelReply?.()
  }, [disabled, draft, isSubmitting, onCancelReply, onSubmit])

  const isInputDisabled = disabled || isSubmitting || operatorsLoading

  return (
    <div className="mt-2">
      {replyToLabel ? (
        <div className="mb-1.5 flex items-center justify-between gap-2 text-2xs text-foreground-subtle">
          <span data-testid="comments-reply-banner">
            ↩ Risposta a <span className="font-semibold">{replyToLabel}</span>
          </span>
          {onCancelReply ? (
            <button
              type="button"
              className="text-foreground-faint underline-offset-2 hover:underline"
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
        <div
          ref={editorRef}
          data-testid="comments-composer-input"
          data-markup={draft}
          contentEditable={isInputDisabled ? false : true}
          role="textbox"
          aria-multiline="true"
          aria-label={placeholder}
          data-placeholder={placeholder}
          suppressContentEditableWarning
          className={cn(
            "min-h-9.5 flex-1 resize-none rounded-md border border-border bg-surface ring-0 transition-all ring-accent/20",
            "px-3 py-2 text-sm outline-none",
            "focus:border-accent focus:ring-2",
            "disabled:cursor-not-allowed disabled:opacity-60",
            "whitespace-pre-wrap break-words",
            "empty:before:pointer-events-none empty:before:text-foreground-faint empty:before:content-[attr(data-placeholder)]",
            isInputDisabled && "cursor-not-allowed opacity-60",
          )}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          onInput={commitEditorMarkup}
          onClick={mention.syncCursor}
          onKeyUp={mention.syncCursor}
          onMouseUp={mention.syncCursor}
          onPaste={(event) => {
            event.preventDefault()
            const text = event.clipboardData.getData("text/plain")
            document.execCommand("insertText", false, text)
            commitEditorMarkup()
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace") {
              const editor = editorRef.current
              if (editor && deleteMentionChipBeforeCaret(editor)) {
                event.preventDefault()
                commitEditorMarkup()
                return
              }
            }

            if (mention.handleKeyDown(event)) return

            if (event.key === "Enter" && !event.metaKey && !event.ctrlKey) {
              event.preventDefault()
              const editor = editorRef.current
              if (editor) {
                insertComposerLineBreak(editor)
                commitEditorMarkup()
              }
              return
            }

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
            "flex size-9.5 shrink-0 cursor-pointer items-center justify-center rounded-md",
            "bg-accent text-foreground-on-accent transition-colors hover:bg-accent-hover",
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
