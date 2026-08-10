import type { OperatoreOption } from "@/hooks/use-operatori-options"
import { Avatar } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { toAvatarRingClass } from "@/lib/utils"

import {
  CRM_PIPELINE_SALES_FILTER_ALL,
  CRM_PIPELINE_SALES_FILTER_UNASSIGNED,
} from "../lib/crm-pipeline-sales-filter"

export type CrmPipelineSalesFilterSelectProps = {
  selectedSalesFilter: string
  onSelectedSalesFilterChange: (value: string) => void
  salesOperatorOptions: OperatoreOption[]
  selectedSalesOperator: OperatoreOption | null
}

export function CrmPipelineSalesFilterSelect({
  selectedSalesFilter,
  onSelectedSalesFilterChange,
  salesOperatorOptions,
  selectedSalesOperator,
}: CrmPipelineSalesFilterSelectProps) {
  return (
    <Select
      value={selectedSalesFilter}
      onValueChange={onSelectedSalesFilterChange}
    >
      <SelectTrigger className="w-60" data-testid="pipeline-filter-sales">
        {selectedSalesOperator ? (
          <span className="inline-flex items-center gap-2">
            <Avatar
              size="sm"
              fallback={selectedSalesOperator.avatar}
              className={toAvatarRingClass(
                selectedSalesOperator.avatarBorderClassName,
              )}
            />
            <span>{selectedSalesOperator.label}</span>
          </span>
        ) : (
          <span>
            {selectedSalesFilter === CRM_PIPELINE_SALES_FILTER_UNASSIGNED
              ? "Senza sales"
              : "Tutti i sales"}
          </span>
        )}
      </SelectTrigger>
      <SelectContent align="start">
        <SelectItem value={CRM_PIPELINE_SALES_FILTER_ALL}>
          Tutti i sales
        </SelectItem>
        <SelectItem value={CRM_PIPELINE_SALES_FILTER_UNASSIGNED}>
          Senza sales
        </SelectItem>
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
