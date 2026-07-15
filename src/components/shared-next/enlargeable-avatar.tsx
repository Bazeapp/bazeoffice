import * as React from "react"
import { XIcon } from "lucide-react"

import { AttachmentImage } from "@/components/shared-next/attachment-image"
import {
  HeicAwareAvatar,
  type HeicAwareAvatarProps,
} from "@/components/shared-next/heic-aware-avatar"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"

export type EnlargeableAvatarProps = HeicAwareAvatarProps & {
  /**
   * Whether `src` is a REAL uploaded photo (vs a generated default-avatar
   * placeholder). When `false` the avatar is never enlargeable, even though
   * `src` is a non-empty URL. Defaults to `true` so the component stays a
   * drop-in wherever `src` is always a real photo.
   */
  hasPhoto?: boolean
}

/**
 * `HeicAwareAvatar` that opens the photo full-screen on click (BAZ-38).
 *
 * Opt-in by construction: the click lives here, not in `HeicAwareAvatar`, so
 * list/pipeline/map avatars stay non-clickable. Enlargeable only when the worker
 * has a real uploaded photo (`hasPhoto`) — `immagineUrl` is never empty (it falls
 * back to a generated default-avatar asset), so the caller passes `hasPhoto` to
 * tell a real photo from the placeholder. If a real photo can't render (e.g. a
 * HEIC that fails to decode), the lightbox reuses `AttachmentImage`, which
 * degrades to a "Scarica / apri" download link rather than a broken image.
 */
export function EnlargeableAvatar({
  hasPhoto = true,
  src,
  type,
  alt,
  ...rest
}: EnlargeableAvatarProps) {
  const [open, setOpen] = React.useState(false)

  const canEnlarge = hasPhoto && typeof src === "string" && src.trim() !== ""

  if (!canEnlarge) {
    return <HeicAwareAvatar src={src} type={type} alt={alt} {...rest} />
  }

  const label = alt ? `Foto di ${alt}` : "Foto"

  return (
    <>
      <button
        type="button"
        aria-label={alt ? `Ingrandisci foto di ${alt}` : "Ingrandisci foto"}
        onClick={(event) => {
          event.stopPropagation()
          setOpen(true)
        }}
        className="inline-flex rounded-full outline-none cursor-zoom-in focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <HeicAwareAvatar src={src} type={type} alt={alt} {...rest} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="flex max-h-[95vh] w-auto max-w-[95vw] items-center justify-center rounded-none border-0 bg-transparent p-0 shadow-none"
        >
          <DialogTitle className="sr-only">{label}</DialogTitle>
          {/*
            `bg-surface` gives an opaque, light backing: it stays invisible
            behind an opaque photo, but restores the contrast the
            `AttachmentImage` "Scarica / apri" fallback needs — otherwise its
            muted text/icon would sit unreadable on the transparent content
            over the dark overlay.
          */}
          <AttachmentImage
            src={src}
            type={type}
            alt={alt ?? ""}
            loading="eager"
            className="max-h-[90vh] max-w-full rounded-lg bg-surface object-contain"
          />
          <DialogClose className="absolute right-3 top-3 z-10 inline-flex size-8 items-center justify-center rounded-full bg-neutral-950/50 text-white outline-none transition hover:bg-neutral-950/70 focus-visible:ring-2 focus-visible:ring-white">
            <XIcon className="size-5" />
            <span className="sr-only">Chiudi</span>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  )
}
