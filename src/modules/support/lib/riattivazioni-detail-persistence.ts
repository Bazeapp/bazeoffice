import type { AttachmentLink } from "@/components/shared-next/attachment-utils"
import { buildAttachmentPayload, normalizeAttachmentArray } from "@/lib/attachments"
import { sanitizeFileName } from "@/lib/file-utils"
import { updateRecord } from "@/lib/record-crud"
import { supabase } from "@/lib/supabase-client"
import type { ChiusuraContrattoRecord } from "@/types"

import type { ChiusuraAttachmentSlot } from "./riattivazioni-board.constants"

export async function uploadChiusuraAttachment(
  recordId: string,
  slot: ChiusuraAttachmentSlot,
  file: File,
  currentAttachments: ChiusuraContrattoRecord[ChiusuraAttachmentSlot],
) {
  const safeName = sanitizeFileName(file.name || "documento", "documento")
  const storagePath = ["chiusure_contratti", recordId, slot, `${Date.now()}-${safeName}`].join("/")

  const uploadResult = await supabase.storage.from("baze-bucket").upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  })

  if (uploadResult.error) {
    throw uploadResult.error
  }

  const payload = buildAttachmentPayload(file, storagePath)
  const nextValue = [...normalizeAttachmentArray(currentAttachments), payload]

  return updateRecord("chiusure_contratti", recordId, {
    [slot]: nextValue,
  })
}

export async function removeChiusuraAttachment(
  recordId: string,
  slot: ChiusuraAttachmentSlot,
  link: AttachmentLink,
  currentAttachments: ChiusuraContrattoRecord[ChiusuraAttachmentSlot],
) {
  const nextValue = normalizeAttachmentArray(currentAttachments).filter(
    (attachment) => !(link.path && attachment.path === link.path) && attachment.name !== link.label,
  )

  if (link.path?.startsWith("baze-bucket/")) {
    await supabase.storage
      .from("baze-bucket")
      .remove([link.path.replace(/^baze-bucket\//, "")])
  }

  return updateRecord("chiusure_contratti", recordId, {
    [slot]: nextValue.length > 0 ? nextValue : null,
  })
}
