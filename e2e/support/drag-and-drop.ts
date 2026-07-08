import type { Page } from "@playwright/test"

/**
 * Native HTML5 drag-and-drop via DOM DragEvent dispatch.
 * Playwright 1.49 Locator has no `.drop()` — KanbanColumnShell listens for
 * `drop` and reads `text/plain` as the card/record id.
 */
export async function dropPayloadOnSelector(
  page: Page,
  targetSelector: string,
  payload: string,
  cardSelector?: string,
) {
  await page.evaluate(
    ({ cardSel, columnSel, id }) => {
      const column = document.querySelector(columnSel)
      if (!column) {
        throw new Error(`dropPayloadOnSelector: column not found (${columnSel})`)
      }

      const dataTransfer = new DataTransfer()
      dataTransfer.setData("text/plain", id)
      dataTransfer.effectAllowed = "move"

      const eventInit = {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      }

      if (cardSel) {
        const card = document.querySelector(cardSel)
        if (!card) {
          throw new Error(`dropPayloadOnSelector: card not found (${cardSel})`)
        }
        card.dispatchEvent(new DragEvent("dragstart", eventInit))
      }

      column.dispatchEvent(new DragEvent("dragenter", eventInit))
      column.dispatchEvent(new DragEvent("dragover", eventInit))
      column.dispatchEvent(new DragEvent("drop", eventInit))

      if (cardSel) {
        const card = document.querySelector(cardSel)
        card?.dispatchEvent(new DragEvent("dragend", eventInit))
      }
    },
    { cardSel: cardSelector ?? null, columnSel: targetSelector, id: payload },
  )
}
