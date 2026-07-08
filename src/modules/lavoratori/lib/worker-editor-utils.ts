export function formatEditorError(message: string, caughtError: unknown) {
  return caughtError instanceof Error ? caughtError.message : message
}
