import type { Query, QueryClient } from "@tanstack/react-query"

import { commentPageQueryPrefix } from "./query-keys"
import type { EntityRef, EntityType } from "../types/entity"

const PAGE_FOCUS_TYPES_WITH_LAVORATORE_SECTION: EntityType[] = [
  "lavoratore",
  "candidatura",
  "rapporto",
  "assunzione",
  "variazione",
  "cedolino",
  "contributi",
  "chiusura",
  "ticket",
]

const PAGE_FOCUS_TYPES_WITH_RICERCA_SECTION: EntityType[] = [
  "ricerca",
  "candidatura",
  "rapporto",
  "assunzione",
  "variazione",
  "cedolino",
  "contributi",
  "chiusura",
  "ticket",
]

const PAGE_FOCUS_TYPES_WITH_FAMIGLIA_SECTION: EntityType[] = [
  "famiglia",
  "ricerca",
  "candidatura",
  "rapporto",
  "assunzione",
  "variazione",
  "cedolino",
  "contributi",
  "chiusura",
  "ticket",
]

const PAGE_FOCUS_TYPES_WITH_RAPPORTO_SECTION: EntityType[] = [
  "rapporto",
  "assunzione",
  "variazione",
  "cedolino",
  "contributi",
  "chiusura",
  "ticket",
]

function getPageFocusTypesAffectedByAnchor(anchor: EntityRef): EntityType[] {
  switch (anchor.entityType) {
    case "lavoratore":
      return PAGE_FOCUS_TYPES_WITH_LAVORATORE_SECTION
    case "ricerca":
      return PAGE_FOCUS_TYPES_WITH_RICERCA_SECTION
    case "famiglia":
      return PAGE_FOCUS_TYPES_WITH_FAMIGLIA_SECTION
    case "candidatura":
      return ["candidatura"]
    case "rapporto":
      return PAGE_FOCUS_TYPES_WITH_RAPPORTO_SECTION
    case "assunzione":
      return ["assunzione"]
    case "variazione":
    case "cedolino":
    case "contributi":
    case "chiusura":
    case "ticket":
      return [anchor.entityType]
    default:
      return [anchor.entityType]
  }
}

function isSamePageFocus(queryKey: readonly unknown[], pageFocus: EntityRef): boolean {
  return queryKey[1] === pageFocus.entityType && queryKey[2] === pageFocus.entityId
}

export function shouldInvalidateCommentQueryForAnchor(
  queryKey: readonly unknown[],
  anchor: EntityRef,
  pageFocus: EntityRef,
): boolean {
  if (queryKey[0] !== "commenti") return false
  if (isSamePageFocus(queryKey, pageFocus)) return false

  const pageType = queryKey[1]
  const pageId = queryKey[2]
  const queryKind = queryKey[3]

  if (pageType === anchor.entityType && pageId === anchor.entityId) {
    return true
  }

  if (
    (queryKind === "section" || queryKind === "section-count") &&
    queryKey[4] === anchor.entityType &&
    queryKey[5] === anchor.entityId
  ) {
    return true
  }

  const affectedPageTypes = getPageFocusTypesAffectedByAnchor(anchor)
  if (
    queryKind === "count" &&
    typeof pageType === "string" &&
    affectedPageTypes.includes(pageType as EntityType)
  ) {
    return true
  }

  return false
}

export function invalidateCommentVisibility(
  queryClient: QueryClient,
  pageFocus: EntityRef,
  anchor: EntityRef,
): void {
  void queryClient.invalidateQueries({
    queryKey: commentPageQueryPrefix(pageFocus),
  })

  void queryClient.invalidateQueries({
    predicate: (query: Query) =>
      shouldInvalidateCommentQueryForAnchor(query.queryKey, anchor, pageFocus),
  })
}
