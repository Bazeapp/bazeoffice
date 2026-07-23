import type { AppRoute } from "@/routes/app-routes"
import { DEFAULT_ROUTE } from "@/routes/app-routes"

import type { CommentNavigation } from "../types"

export type RoutePatch = Partial<AppRoute> & {
  mainSection: AppRoute["mainSection"]
}

/**
 * Board-only entities without a path detail segment. Selection is carried as a
 * search param (`?famiglia=`, `?cedolino=`, `?contributi=`) and consumed by the
 * target board to auto-open the detail sheet.
 */
export const BOARD_ENTITY_QUERY_PARAMS = {
  famiglia: "famiglia",
  cedolino: "cedolino",
  contributi: "contributi",
} as const

export type BoardEntityType = keyof typeof BOARD_ENTITY_QUERY_PARAMS

export function isBoardEntityType(value: string): value is BoardEntityType {
  return value in BOARD_ENTITY_QUERY_PARAMS
}

export function boardEntityQueryParam(
  entityType: string,
): (typeof BOARD_ENTITY_QUERY_PARAMS)[BoardEntityType] | null {
  return isBoardEntityType(entityType)
    ? BOARD_ENTITY_QUERY_PARAMS[entityType]
    : null
}

/**
 * Maps a comment navigation payload to the closest AppRoute patch.
 * Board-only entities without URL detail ids navigate to the list surface;
 * their record id is carried in the search string (see
 * `buildNotificationDeepLinkUrl`).
 */
export function routePatchFromCommentNavigation(
  nav: CommentNavigation,
): RoutePatch {
  switch (nav.entityType) {
    case "ricerca":
      return {
        mainSection: "ricerca_pipeline",
        anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
        ricercaProcessId: nav.entityId,
        ricercaSelectionId: null,
      }
    case "candidatura":
      return {
        mainSection: "ricerca_pipeline",
        anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
        ricercaProcessId: nav.ricercaId,
        ricercaSelectionId: nav.entityId,
      }
    case "lavoratore":
      return {
        mainSection: "lavoratori_cerca",
        anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
        ricercaProcessId: null,
        selectedWorkerId: nav.entityId,
      }
    case "rapporto":
      return {
        mainSection: "gestione_contrattuale_rapporti",
        anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
        ricercaProcessId: null,
        selectedRapportoId: nav.entityId,
      }
    case "assunzione":
      return {
        mainSection: "gestione_contrattuale_assunzioni",
        anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
        ricercaProcessId: null,
        selectedAssunzioneRapportoId: nav.rapportoId,
      }
    case "variazione":
      return {
        mainSection: "gestione_contrattuale_variazioni",
        anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
        ricercaProcessId: null,
      }
    case "chiusura":
      return {
        mainSection: "gestione_contrattuale_chiusure",
        anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
        ricercaProcessId: null,
      }
    case "cedolino":
      return {
        mainSection: "payroll_cedolini",
        anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
        ricercaProcessId: null,
      }
    case "contributi":
      return {
        mainSection: "payroll_contributi_inps",
        anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
        ricercaProcessId: null,
      }
    case "ticket":
      return {
        mainSection: "customer_support_customer_ticket",
        anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
        ricercaProcessId: null,
      }
    case "famiglia":
      return {
        mainSection: "crm_pipeline_famiglie",
        anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
        ricercaProcessId: null,
      }
    default:
      return {
        mainSection: DEFAULT_ROUTE.mainSection,
        anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
        ricercaProcessId: null,
      }
  }
}

export function applyRoutePatch(
  current: AppRoute,
  patch: RoutePatch,
): AppRoute {
  return {
    ...current,
    ...patch,
    anagraficheTab: patch.anagraficheTab ?? current.anagraficheTab,
    ricercaProcessId:
      patch.ricercaProcessId !== undefined
        ? patch.ricercaProcessId
        : current.ricercaProcessId,
  }
}

export const COMMENT_QUERY_PARAM = "comment"

const COMMENT_DEEP_LINK_EVENT = "bazeoffice:comment-deeplink"
const BOARD_ENTITY_DEEP_LINK_EVENT = "bazeoffice:board-entity-deeplink"

/** `history.pushState` does not fire `popstate` — notify panel hosts explicitly. */
export function notifyCommentDeepLink(commentId: string): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent(COMMENT_DEEP_LINK_EVENT, { detail: { commentId } }),
  )
}

export function subscribeCommentDeepLink(
  listener: (commentId: string | null) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined

  const handler = (event: Event) => {
    const detail =
      event instanceof CustomEvent
        ? (event.detail as { commentId?: string } | undefined)
        : undefined
    listener(detail?.commentId ?? readCommentIdFromSearch())
  }

  const onPopState = () => listener(readCommentIdFromSearch())

  window.addEventListener(COMMENT_DEEP_LINK_EVENT, handler)
  window.addEventListener("popstate", onPopState)
  return () => {
    window.removeEventListener(COMMENT_DEEP_LINK_EVENT, handler)
    window.removeEventListener("popstate", onPopState)
  }
}

export function readCommentIdFromSearch(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`)
  const value = params.get(COMMENT_QUERY_PARAM)
  return value && value.trim() ? value.trim() : null
}

export function readBoardEntityIdFromSearch(
  entityType: BoardEntityType,
  search: string = typeof window !== "undefined" ? window.location.search : "",
): string | null {
  const param = BOARD_ENTITY_QUERY_PARAMS[entityType]
  const params = new URLSearchParams(search.startsWith("?") ? search : `?${search}`)
  const value = params.get(param)
  return value && value.trim() ? value.trim() : null
}

export function clearBoardEntityIdFromSearch(entityType: BoardEntityType): void {
  if (typeof window === "undefined") return
  const param = BOARD_ENTITY_QUERY_PARAMS[entityType]
  const url = new URL(window.location.href)
  if (!url.searchParams.has(param)) return
  url.searchParams.delete(param)
  const search = url.searchParams.toString()
  window.history.replaceState(
    {},
    "",
    `${url.pathname}${search ? `?${search}` : ""}${url.hash}`,
  )
}

/** `history.pushState` does not fire `popstate` — notify board hosts explicitly. */
export function notifyBoardEntityDeepLink(
  entityType: BoardEntityType,
  entityId: string,
): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent(BOARD_ENTITY_DEEP_LINK_EVENT, {
      detail: { entityType, entityId },
    }),
  )
}

export function subscribeBoardEntityDeepLink(
  entityType: BoardEntityType,
  listener: (entityId: string | null) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined

  const handler = (event: Event) => {
    const detail =
      event instanceof CustomEvent
        ? (event.detail as
            | { entityType?: string; entityId?: string }
            | undefined)
        : undefined
    if (detail?.entityType && detail.entityType !== entityType) return
    listener(detail?.entityId ?? readBoardEntityIdFromSearch(entityType))
  }

  const onPopState = () => listener(readBoardEntityIdFromSearch(entityType))

  window.addEventListener(BOARD_ENTITY_DEEP_LINK_EVENT, handler)
  window.addEventListener("popstate", onPopState)
  return () => {
    window.removeEventListener(BOARD_ENTITY_DEEP_LINK_EVENT, handler)
    window.removeEventListener("popstate", onPopState)
  }
}

export function buildNotificationDeepLinkUrl(
  pathname: string,
  options: {
    commentId?: string | null
    entityType?: string | null
    entityId?: string | null
  },
): string {
  const params = new URLSearchParams()
  const boardParam = options.entityType
    ? boardEntityQueryParam(options.entityType)
    : null
  if (boardParam && options.entityId?.trim()) {
    params.set(boardParam, options.entityId.trim())
  }
  if (options.commentId?.trim()) {
    params.set(COMMENT_QUERY_PARAM, options.commentId.trim())
  }
  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function buildUrlWithComment(
  pathname: string,
  commentId: string | null,
): string {
  return buildNotificationDeepLinkUrl(pathname, { commentId })
}
