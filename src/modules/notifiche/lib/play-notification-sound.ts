const NOTIFICATION_SOUND_SRC = `${import.meta.env.BASE_URL}sounds/notification.mp3`

/** Plays the incoming-notification cue. Failures (autoplay block) are ignored. */
export function playNotificationSound(): void {
  try {
    const audio = new Audio(NOTIFICATION_SOUND_SRC)
    void audio.play().catch(() => undefined)
  } catch {
    // Ignore missing Audio / autoplay restrictions.
  }
}
