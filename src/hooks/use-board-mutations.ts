import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationResult,
} from "@tanstack/react-query"

import { runTracked } from "@/lib/anagrafiche-api"

/**
 * Wrappers around React Query's `useMutation` that encode the project's
 * "save-pattern" rules in one place. The rule: a mutation either changes the
 * structural shape of the board (move, create, delete) and should refetch
 * the server after the change settles, OR it's a per-field save coming from
 * a debounced input — in which case the optimistic state is already correct
 * and the Realtime echo (debounced ~600ms) will refresh the board once for
 * the whole burst of keystrokes. Per-keystroke invalidate causes massive lag.
 *
 * Use these wrappers instead of `useMutation` directly inside board hooks.
 * An ESLint rule blocks the raw import in those files to make the rule
 * impossible to forget.
 */

type BoardMutationOptions<TVars, TData, TBoardData> = {
  queryKey: QueryKey
  mutationFn: (variables: TVars) => Promise<TData>
  /**
   * Apply the change to the cached board data optimistically. Receives the
   * previous board data (may be undefined while the first fetch is in flight)
   * and the mutation variables, and returns the new board data. If it returns
   * `undefined`, the cache is left unchanged.
   */
  applyOptimistic?: (
    previous: TBoardData | undefined,
    variables: TVars,
  ) => TBoardData | undefined
}

type MutationContext<TBoardData> = { snapshot: TBoardData | undefined }

function useBoardMutation<TVars, TData, TBoardData>(
  options: BoardMutationOptions<TVars, TData, TBoardData> & {
    invalidateOnSettled: boolean
  },
): UseMutationResult<TData, Error, TVars, MutationContext<TBoardData>> {
  const queryClient = useQueryClient()
  const { queryKey, mutationFn, applyOptimistic, invalidateOnSettled } = options

  return useMutation<TData, Error, TVars, MutationContext<TBoardData>>({
    // Defensive trackWrite wrapper: callers today pass a `mutationFn` that
    // calls the tracked central writers (`updateRecord`/`createRecord`/
    // `deleteRecord`), but the wrappers cannot enforce that. Wrapping the
    // invocation here guarantees that ANY mutationFn — even one that calls
    // a raw `invokeEdgeFunction` or `supabase.rpc` — has its realtime echo
    // recognised by the echo-window suppression in `useRealtimeBoardSync`.
    // The pending-write counter is a simple integer (0->1->2->1->0), so
    // double-counting via an inner trackWrite is harmless.
    mutationFn: (variables) => runTracked(mutationFn(variables)),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey })
      const snapshot = queryClient.getQueryData<TBoardData>(queryKey)
      if (applyOptimistic) {
        queryClient.setQueryData<TBoardData>(queryKey, (previous) => {
          const next = applyOptimistic(previous, variables)
          return next === undefined ? previous : next
        })
      }
      return { snapshot }
    },
    onError: (_error, _variables, context) => {
      if (context?.snapshot !== undefined) {
        queryClient.setQueryData(queryKey, context.snapshot)
      }
    },
    onSettled: invalidateOnSettled
      ? () => {
          void queryClient.invalidateQueries({ queryKey })
        }
      : undefined,
  })
}

/**
 * For per-field saves driven by debounced inputs (text, select, date, toggle,
 * multiselect, ...). Does NOT invalidate the board on success: the optimistic
 * state is already applied and the Realtime echo refreshes once per burst.
 */
export function usePatchMutation<TVars, TData, TBoardData>(
  options: BoardMutationOptions<TVars, TData, TBoardData>,
) {
  return useBoardMutation<TVars, TData, TBoardData>({
    ...options,
    invalidateOnSettled: false,
  })
}

/**
 * For structural moves (drag a card between columns, change a status that
 * implies a re-grouping). Invalidates the board on success so server-derived
 * positions or counters are reconciled.
 */
export function useMoveMutation<TVars, TData, TBoardData>(
  options: BoardMutationOptions<TVars, TData, TBoardData>,
) {
  return useBoardMutation<TVars, TData, TBoardData>({
    ...options,
    invalidateOnSettled: true,
  })
}

/**
 * For creating or deleting board records. Invalidates the board so the new
 * (or removed) entity is reflected with all its server-computed fields.
 */
export function useCreateMutation<TVars, TData, TBoardData>(
  options: BoardMutationOptions<TVars, TData, TBoardData>,
) {
  return useBoardMutation<TVars, TData, TBoardData>({
    ...options,
    invalidateOnSettled: true,
  })
}
