import * as React from "react"

import { getRenderableImageSrc, isHeicImage } from "@/lib/heic-image"

export type RenderableImageState =
  | { status: "ready"; src: string }
  | { status: "loading" }
  | { status: "error" }

/**
 * Resolves a stored image URL into a browser-renderable one (BAZ-21).
 *
 * Non-HEIC inputs resolve synchronously (no render churn, no flash). HEIC/HEIF
 * inputs — detected by MIME `type` first, then the URL extension as a fallback —
 * are decoded to a cached JPEG object URL via the shared converter. On failure
 * the state is `error`, so the caller renders its own fallback (e.g. avatar
 * initials) rather than a broken image.
 *
 * Headless counterpart of `AttachmentImage`: same conversion engine, but the
 * caller owns the loading/fallback UI.
 */
export function useRenderableImageSrc(
  src: string | null | undefined,
  type?: string | null,
): RenderableImageState {
  const [state, setState] = React.useState<RenderableImageState>(() => {
    if (!src) return { status: "error" }
    return isHeicImage({ url: src, type })
      ? { status: "loading" }
      : { status: "ready", src }
  })

  React.useEffect(() => {
    if (!src) {
      setState({ status: "error" })
      return
    }
    if (!isHeicImage({ url: src, type })) {
      setState({ status: "ready", src })
      return
    }

    let active = true
    setState({ status: "loading" })
    getRenderableImageSrc(src, type)
      .then((resolved) => {
        if (active) setState({ status: "ready", src: resolved })
      })
      .catch(() => {
        if (active) setState({ status: "error" })
      })
    return () => {
      active = false
    }
  }, [src, type])

  return state
}
