/** Non-blocking pause for retry/poll flows in the browser. */
export function delay(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))
}
