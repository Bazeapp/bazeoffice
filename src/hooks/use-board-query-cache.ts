import * as React from "react"
import { useQueryClient, type QueryKey } from "@tanstack/react-query"

export function useBoardQueryCache<TData>(queryKey: QueryKey) {
  const queryClient = useQueryClient()

  const setBoardData = React.useCallback(
    (updater: (previous: TData | undefined) => TData | undefined) => {
      queryClient.setQueryData<TData>(queryKey, (previous) => updater(previous))
    },
    [queryClient, queryKey],
  )

  const invalidateBoard = React.useCallback(() => {
    return queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  return { setBoardData, invalidateBoard }
}
