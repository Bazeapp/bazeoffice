import * as React from "react"
import { ExternalLinkIcon, ImageOffIcon, LoaderCircleIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { getRenderableImageSrc, isHeicImage } from "@/lib/heic-image"

type AttachmentImageProps = {
  src: string
  alt: string
  type?: string | null
  className?: string
  /** Label shown in the fallback when the image cannot be rendered. */
  downloadName?: string
  /** Forwarded to the underlying <img> for the non-HEIC (passthrough) case. */
  loading?: "lazy" | "eager"
  decoding?: "async" | "auto" | "sync"
}

type State = { status: "ready"; src: string } | { status: "loading" } | { status: "error" }

/**
 * Drop-in replacement for a raw `<img>` on a stored image (BAZ-21).
 * Renders renderable formats immediately; decodes HEIC/HEIF to JPEG in the
 * browser (spinner while decoding); on failure shows a download/open fallback
 * instead of a broken image.
 */
export function AttachmentImage({
  src,
  alt,
  type,
  className,
  downloadName,
  loading = "lazy",
  decoding,
}: AttachmentImageProps) {
  const [state, setState] = React.useState<State>(() =>
    isHeicImage({ url: src, type }) ? { status: "loading" } : { status: "ready", src },
  )

  React.useEffect(() => {
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

  if (state.status === "loading") {
    return (
      <div
        className={cn("flex items-center justify-center", className)}
        aria-busy="true"
        aria-label="Conversione immagine in corso"
      >
        <LoaderCircleIcon className="text-muted-foreground size-4 animate-spin" />
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1 p-2 text-center",
          className,
        )}
      >
        <ImageOffIcon className="text-muted-foreground size-4" />
        <span className="text-muted-foreground truncate text-2xs">
          {downloadName ?? alt}
        </span>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="text-primary inline-flex items-center gap-1 text-2xs hover:underline"
        >
          <ExternalLinkIcon className="size-3" /> Scarica / apri
        </a>
      </div>
    )
  }

  return (
    <img
      src={state.src}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      // Any post-mount load failure (a passthrough URL that 404s, a HEIC
      // mis-classified as renderable, or a converted blob URL later revoked by
      // cache eviction) degrades to the same download/open fallback instead of
      // a native broken-image icon.
      onError={() => setState({ status: "error" })}
    />
  )
}
