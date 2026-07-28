/**
 * Same-document search-string changes (replaceState/pushState) do not fire
 * `popstate`. Views that mirror URL search can subscribe to this event when
 * the shell clears or rewrites the query without a navigation.
 */
export const SEARCH_CHANGE_EVENT = "bazeoffice:searchchange"

export function notifySearchChange() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(SEARCH_CHANGE_EVENT))
}
