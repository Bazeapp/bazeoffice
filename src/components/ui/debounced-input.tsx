import * as React from "react"
import { useDebouncedSave } from "@/hooks/use-debounced-save"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type DebouncedInputProps = Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "defaultValue"> & {
  committedValue: string
  onSave: (value: string) => Promise<void>
  debounceMs?: number
}

export function DebouncedInput({ committedValue, onSave, debounceMs, ...props }: DebouncedInputProps) {
  const { value, onChange } = useDebouncedSave(committedValue, onSave, debounceMs ? { debounceMs } : undefined)
  return <Input {...props} value={value} onChange={(e) => onChange(e.target.value)} />
}

type DebouncedTextareaProps = Omit<React.ComponentProps<typeof Textarea>, "value" | "onChange" | "defaultValue"> & {
  committedValue: string
  onSave: (value: string) => Promise<void>
  debounceMs?: number
}

export function DebouncedTextarea({ committedValue, onSave, debounceMs, ...props }: DebouncedTextareaProps) {
  const { value, onChange } = useDebouncedSave(committedValue, onSave, debounceMs ? { debounceMs } : undefined)
  return <Textarea {...props} value={value} onChange={(e) => onChange(e.target.value)} />
}
