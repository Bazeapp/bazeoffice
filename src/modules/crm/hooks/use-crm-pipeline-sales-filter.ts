import * as React from "react"
import { useQuery } from "@tanstack/react-query"

import { useAuthSession } from "@/hooks/use-auth-session"
import { useOperatoriOptions } from "@/hooks/use-operatori-options"
import { fetchCurrentOperatorId } from "@/modules/commenti/queries"

import {
  CRM_PIPELINE_SALES_FILTER_ALL,
  readStoredSalesFilter,
  resolveSalesFilter,
  salesFilterToServerParams,
  writeStoredSalesFilter,
} from "../lib/crm-pipeline-sales-filter"

export function useCrmPipelineSalesFilter() {
  const { session, loading: authLoading } = useAuthSession()
  const authUserId = session?.user.id
  const { options: salesOperatorOptions } = useOperatoriOptions({
    role: "sales",
    activeOnly: true,
  })
  const currentOperatorIdQuery = useQuery({
    queryKey: ["commenti", "current-operator-id", authUserId],
    queryFn: fetchCurrentOperatorId,
    enabled: Boolean(authUserId),
    staleTime: 5 * 60 * 1000,
  })
  const [salesFilterBootstrap] = React.useState(() => {
    const stored = readStoredSalesFilter()
    return {
      value: stored ?? CRM_PIPELINE_SALES_FILTER_ALL,
      initialized: stored !== null,
    }
  })
  const [selectedSalesFilter, setSelectedSalesFilterState] = React.useState(
    salesFilterBootstrap.value,
  )
  const salesFilterInitializedRef = React.useRef(salesFilterBootstrap.initialized)

  const setSelectedSalesFilter = React.useCallback((value: string) => {
    setSelectedSalesFilterState(value)
    writeStoredSalesFilter(value)
    salesFilterInitializedRef.current = true
  }, [])

  const selectedSalesOperator = React.useMemo(
    () =>
      salesOperatorOptions.find((operator) => operator.id === selectedSalesFilter) ??
      null,
    [salesOperatorOptions, selectedSalesFilter],
  )

  const salesServerFilter = React.useMemo(
    () => salesFilterToServerParams(selectedSalesFilter),
    [selectedSalesFilter],
  )

  const salesFilterActive = selectedSalesFilter !== CRM_PIPELINE_SALES_FILTER_ALL

  React.useEffect(() => {
    if (salesOperatorOptions.length === 0) return
    if (authLoading) return
    if (
      authUserId &&
      !currentOperatorIdQuery.isFetched &&
      !currentOperatorIdQuery.isError
    ) {
      return
    }

    const selectableOperatorIds = salesOperatorOptions.map((operator) => operator.id)
    const nextValue = resolveSalesFilter({
      stored: salesFilterInitializedRef.current
        ? selectedSalesFilter
        : readStoredSalesFilter(),
      currentOperatorId: currentOperatorIdQuery.data ?? null,
      selectableOperatorIds,
    })

    if (nextValue !== selectedSalesFilter) {
      setSelectedSalesFilterState(nextValue)
      writeStoredSalesFilter(nextValue)
    }
    salesFilterInitializedRef.current = true
  }, [
    authLoading,
    authUserId,
    currentOperatorIdQuery.data,
    currentOperatorIdQuery.isError,
    currentOperatorIdQuery.isFetched,
    salesOperatorOptions,
    selectedSalesFilter,
  ])

  return {
    selectedSalesFilter,
    setSelectedSalesFilter,
    selectedSalesOperator,
    salesOperatorOptions,
    salesServerFilter,
    salesFilterActive,
  }
}
