import * as React from "react"
import { useDebouncedSave } from "@/hooks/use-debounced-save"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type DebouncedInputProps = Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "defaultValue"> & {
  committedValue: string
  onSave: (value: string) => Promise<void>
  debounceMs?: number
  /** Record a cui il campo è legato (es. id worker): flush+resync al cambio. */
  identity?: unknown
}

export function DebouncedInput({ committedValue, onSave, debounceMs, identity, onFocus, onBlur, ...props }: DebouncedInputProps) {
  const { value, onChange, onFocus: onFocusDraft, onBlur: onBlurDraft } = useDebouncedSave(committedValue, onSave, { debounceMs, identity })
  return (
    <Input
      {...props}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => {
        onFocusDraft()
        onFocus?.(e)
      }}
      onBlur={(e) => {
        onBlurDraft()
        onBlur?.(e)
      }}
    />
  )
}

type DebouncedTextareaProps = Omit<React.ComponentProps<typeof Textarea>, "value" | "onChange" | "defaultValue"> & {
  committedValue: string
  onSave: (value: string) => Promise<void>
  debounceMs?: number
  /** Record a cui il campo è legato (es. id worker): flush+resync al cambio. */
  identity?: unknown
}

export function DebouncedTextarea({ committedValue, onSave, debounceMs, identity, onFocus, onBlur, ...props }: DebouncedTextareaProps) {
  const { value, onChange, onFocus: onFocusDraft, onBlur: onBlurDraft } = useDebouncedSave(committedValue, onSave, { debounceMs, identity })
  return (
    <Textarea
      {...props}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => {
        onFocusDraft()
        onFocus?.(e)
      }}
      onBlur={(e) => {
        onBlurDraft()
        onBlur?.(e)
      }}
    />
  )
}
