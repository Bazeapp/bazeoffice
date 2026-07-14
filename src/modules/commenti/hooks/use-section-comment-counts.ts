import { useQueries } from "@tanstack/react-query"
import * as React from "react"

import { commentSectionCountQueryKey } from "../lib/query-keys"
import { fetchCommentSectionCount } from "../queries/fetch-section-comment-count"
import type { CommentSection } from "../types/section"
import type { EntityRef } from "../types/entity"

export function useSectionCommentCounts(
  pageFocus: EntityRef,
  sections: CommentSection[],
) {
  const countableSections = React.useMemo(
    () =>
      sections.filter(
        (section): section is CommentSection & { entityRef: EntityRef } =>
          section.entityRef !== null,
      ),
    [sections],
  )

  const queries = useQueries({
    queries: countableSections.map((section) => ({
      queryKey: commentSectionCountQueryKey(pageFocus, section.entityRef),
      queryFn: () =>
        fetchCommentSectionCount({
          pageEntityType: pageFocus.entityType,
          pageEntityId: pageFocus.entityId,
          sectionEntityType: section.entityRef.entityType,
          sectionEntityId: section.entityRef.entityId,
        }),
    })),
  })

  return React.useMemo(() => {
    const counts: Record<string, number> = {}
    const loading: Record<string, boolean> = {}

    countableSections.forEach((section, index) => {
      const query = queries[index]
      counts[section.id] = query?.data ?? 0
      loading[section.id] = query?.isLoading ?? true
    })

    const descendants = sections.find((section) => section.kind === "descendants")
    if (descendants) {
      counts[descendants.id] = 0
      loading[descendants.id] = false
    }

    return { counts, loading }
  }, [countableSections, queries, sections])
}
