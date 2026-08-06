const OPEN_COMMENT_PANEL_EVENT = "bazeoffice:open-comment-panel"

/** Ask the floating comments panel to expand (no-op if none is mounted). */
export function requestOpenCommentPanel(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(OPEN_COMMENT_PANEL_EVENT))
}

export function subscribeOpenCommentPanel(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined

  const handler = () => {
    listener()
  }

  window.addEventListener(OPEN_COMMENT_PANEL_EVENT, handler)
  return () => {
    window.removeEventListener(OPEN_COMMENT_PANEL_EVENT, handler)
  }
}
