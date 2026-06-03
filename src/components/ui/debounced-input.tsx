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

export function DebouncedInput({ committedValue, onSave, debounceMs, identity, ...props }: DebouncedInputProps) {
  const { value, onChange } = useDebouncedSave(committedValue, onSave, { debounceMs, identity })
  return <Input {...props} value={value} onChange={(e) => onChange(e.target.value)} />
}

type DebouncedTextareaProps = Omit<React.ComponentProps<typeof Textarea>, "value" | "onChange" | "defaultValue"> & {
  committedValue: string
  onSave: (value: string) => Promise<void>
  debounceMs?: number
  /** Record a cui il campo è legato (es. id worker): flush+resync al cambio. */
  identity?: unknown
}

export function DebouncedTextarea({ committedValue, onSave, debounceMs, identity, ...props }: DebouncedTextareaProps) {
  const { value, onChange } = useDebouncedSave(committedValue, onSave, { debounceMs, identity })
  return <Textarea {...props} value={value} onChange={(e) => onChange(e.target.value)} />
}
