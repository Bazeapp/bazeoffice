import { Avatar, type AvatarProps } from "@/components/ui/avatar"
import { useRenderableImageSrc } from "@/components/shared-next/use-renderable-image-src"

export type HeicAwareAvatarProps = Omit<AvatarProps, "src"> & {
  /** Public URL of the photo (may be HEIC). */
  src?: string | null
  /**
   * Stored MIME type of the photo — the primary HEIC signal. Files from external
   * pipelines often have no `.heic` extension in the URL, so MIME is more
   * reliable than the filename.
   */
  type?: string | null
}

/**
 * Drop-in `Avatar` with render-time HEIC/HEIF conversion (BAZ-21).
 *
 * Use anywhere a stored photo shown as an avatar might be HEIC. It keeps the
 * plain `Avatar` as the renderer — so the fallback stays the initials, never a
 * broken image or a download link — and only swaps in a browser-renderable
 * `src`: HEIC is detected (MIME first, extension fallback), decoded lazily and
 * cached; while decoding or on failure the Avatar shows its initials fallback.
 * Non-HEIC photos are passed straight through at zero cost.
 */
export function HeicAwareAvatar({ src, type, ...avatarProps }: HeicAwareAvatarProps) {
  const state = useRenderableImageSrc(src, type)
  const resolvedSrc = state.status === "ready" ? state.src : undefined
  return <Avatar src={resolvedSrc} {...avatarProps} />
}
