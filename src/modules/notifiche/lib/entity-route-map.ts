import type { AppRoute } from "@/routes/app-routes"
import { DEFAULT_ROUTE } from "@/routes/app-routes"

import type { CommentNavigation } from "../types"

export type RoutePatch = Partial<AppRoute> & {
  mainSection: AppRoute["mainSection"]
}

/**
 * Maps a comment navigation payload to the closest AppRoute patch.
 * Board-only entities without URL detail ids navigate to the list surface.
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
        mainSection: "anagrafiche",
        anagraficheTab: "famiglie",
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

export function buildUrlWithComment(
  pathname: string,
  commentId: string | null,
): string {
  if (!commentId) return pathname
  const params = new URLSearchParams()
  params.set(COMMENT_QUERY_PARAM, commentId)
  return `${pathname}?${params.toString()}`
}
