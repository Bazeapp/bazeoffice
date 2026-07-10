import { Avatar, type AvatarProps } from "@/components/ui/avatar"
import { useRenderableImageSrc } from "@/components/shared-next/use-renderable-image-src"

export type WorkerAvatarProps = Omit<AvatarProps, "src"> & {
  /** Public URL of the worker photo (may be HEIC). */
  src?: string | null
  /**
   * Stored MIME type of the photo — the primary HEIC signal. Many worker photos
   * come from the onboarding pipeline with no `.heic` extension in the URL, so
   * MIME is more reliable than the filename.
   */
  type?: string | null
}

/**
 * Worker photo avatar with render-time HEIC/HEIF conversion (BAZ-21).
 *
 * Keeps the plain `Avatar` as the renderer — so the fallback stays the worker's
 * initials, never a broken image or a download link. It only swaps in a
 * browser-renderable `src`: HEIC is detected (MIME first, extension fallback),
 * decoded lazily and cached; while decoding or on failure the Avatar shows its
 * initials fallback. Non-HEIC photos are passed straight through at zero cost.
 */
export function WorkerAvatar({ src, type, ...avatarProps }: WorkerAvatarProps) {
  const state = useRenderableImageSrc(src, type)
  const resolvedSrc = state.status === "ready" ? state.src : undefined
  return <Avatar src={resolvedSrc} {...avatarProps} />
}
