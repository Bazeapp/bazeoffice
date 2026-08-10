import * as React from "react"
import { toast } from "sonner"

import { useOperatoriOptions } from "@/hooks/use-operatori-options"
import { Avatar } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { toAvatarRingClass } from "@/lib/utils"

import { AssegnazioneOperatorSelectOption } from "./assegnazione-operator-select-option"

const UNASSIGNED_VALUE = "__unassigned__"

export type FamigliaProcessoSalesSelectProps = {
  processId: string
  salesOperatorId: string | null
  disabled?: boolean
  onPatchProcess?: (
    processId: string,
    patch: Record<string, unknown>,
  ) => void | Promise<void>
}

export function FamigliaProcessoSalesSelect({
  processId,
  salesOperatorId,
  disabled = false,
  onPatchProcess,
}: FamigliaProcessoSalesSelectProps) {
  const { options: salesOperatorOptions } = useOperatoriOptions({
    role: "sales",
    activeOnly: true,
  })
  const [pending, setPending] = React.useState(false)

  const selectedOperator =
    salesOperatorOptions.find((operator) => operator.id === salesOperatorId) ??
    null
  const selectValue = salesOperatorId ?? UNASSIGNED_VALUE

  const handleChange = React.useCallback(
    async (nextValue: string) => {
      if (!onPatchProcess || pending) return
      const nextSalesId = nextValue === UNASSIGNED_VALUE ? null : nextValue
      if (nextSalesId === salesOperatorId) return

      setPending(true)
      try {
        await onPatchProcess(processId, { referente_sales_id: nextSalesId })
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossibile aggiornare il sales assegnato",
        )
      } finally {
        setPending(false)
      }
    },
    [onPatchProcess, pending, processId, salesOperatorId],
  )

  return (
    <Select
      value={selectValue}
      onValueChange={(value) => {
        void handleChange(value)
      }}
      disabled={disabled || pending || !onPatchProcess}
    >
      <SelectTrigger
        className="h-8 w-56 gap-1.5 text-xs"
        data-testid="pipeline-detail-sales-select"
        aria-label="Cambia sales assegnato"
      >
        {selectedOperator ? (
          <AssegnazioneOperatorSelectOption operator={selectedOperator} />
        ) : (
          <span className="text-muted-foreground">Senza sales</span>
        )}
      </SelectTrigger>
      <SelectContent align="start">
        <SelectItem value={UNASSIGNED_VALUE}>Senza sales</SelectItem>
        {salesOperatorOptions.map((operator) => (
          <SelectItem key={operator.id} value={operator.id}>
            <span className="inline-flex items-center gap-2">
              <Avatar
                size="sm"
                fallback={operator.avatar}
                className={toAvatarRingClass(operator.avatarBorderClassName)}
              />
              <span>{operator.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
