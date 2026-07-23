import {
  E2E_COMMENTI_BODY_PREFIX,
  OPERATORS,
  type OperatorRole,
} from "../constants"
import {
  formatMentionBody,
  resetCommentiFixture,
  resolveOperatorIdByEmail,
  seedComment,
  seedReply,
  type SeedCommentInput,
} from "./commenti-mutations"
import { getSupabaseAdmin } from "./supabase-admin"

const POLL_TIMEOUT_MS = 15_000
const POLL_INTERVAL_MS = 250

export type SeedMentionNotificaInput = {
  recipientRole: OperatorRole
  recipientLabel: string
  actorRole?: OperatorRole
  bodyToken: string
} & Pick<
  SeedCommentInput,
  | "pageEntityType"
  | "pageEntityId"
  | "anchorEntityType"
  | "anchorEntityId"
  | "sourceInterface"
>

export type NotificaRow = {
  id: string
  user_id: string
  comment_id: string
  type: "menzione" | "risposta_thread"
  read_at: string | null
  resolved_at: string | null
  created_at: string
  status: "non_letta" | "letta" | "risolta"
}

export async function seedMentionNotifica(input: SeedMentionNotificaInput) {
  const recipientId = await resolveOperatorIdByEmail(
    OPERATORS[input.recipientRole].email,
  )
  if (!recipientId) {
    throw new Error(
      `E2E seedMentionNotifica: missing operator id for ${input.recipientRole}`,
    )
  }

  const body = formatMentionBody(
    input.recipientLabel,
    recipientId,
    `${E2E_COMMENTI_BODY_PREFIX}${input.bodyToken} `,
  )

  const comment = await seedComment({
    role: input.actorRole ?? "customer",
    pageEntityType: input.pageEntityType,
    pageEntityId: input.pageEntityId,
    anchorEntityType: input.anchorEntityType,
    anchorEntityId: input.anchorEntityId,
    body,
    sourceInterface: input.sourceInterface,
  })

  const notifica = await waitForNotificaByCommentId(comment.id, {
    userId: recipientId,
    type: "menzione",
  })

  return { comment, notifica, body, recipientId }
}

export async function seedThreadReplyNotifica(input: {
  threadOwnerRole: OperatorRole
  replyAuthorRole?: OperatorRole
  bodyToken: string
  pageEntityType: SeedCommentInput["pageEntityType"]
  pageEntityId: string
  sourceInterface?: SeedCommentInput["sourceInterface"]
}) {
  const threadOwnerId = await resolveOperatorIdByEmail(
    OPERATORS[input.threadOwnerRole].email,
  )
  if (!threadOwnerId) {
    throw new Error(
      `E2E seedThreadReplyNotifica: missing operator id for ${input.threadOwnerRole}`,
    )
  }

  const rootBody = `${E2E_COMMENTI_BODY_PREFIX}${input.bodyToken} root`
  const root = await seedComment({
    role: input.threadOwnerRole,
    pageEntityType: input.pageEntityType,
    pageEntityId: input.pageEntityId,
    anchorEntityType: input.pageEntityType,
    anchorEntityId: input.pageEntityId,
    body: rootBody,
    sourceInterface: input.sourceInterface,
  })

  const replyBody = `${E2E_COMMENTI_BODY_PREFIX}${input.bodyToken} reply`
  const reply = await seedReply({
    role: input.replyAuthorRole ?? "customer",
    pageEntityType: input.pageEntityType,
    pageEntityId: input.pageEntityId,
    threadRootId: root.id,
    body: replyBody,
  })

  const notifica = await waitForNotificaByCommentId(reply.id, {
    userId: threadOwnerId,
    type: "risposta_thread",
  })

  return { root, reply, notifica, rootBody, replyBody, threadOwnerId }
}

export async function fetchNotificaByCommentId(
  commentId: string,
  options: {
    userId: string
    type?: "menzione" | "risposta_thread"
  },
): Promise<NotificaRow | null> {
  const admin = getSupabaseAdmin()
  let query = admin
    .from("notifiche")
    .select("id, user_id, comment_id, type, read_at, resolved_at, created_at")
    .eq("user_id", options.userId)
    .eq("comment_id", commentId)
    .limit(1)

  if (options.type) {
    query = query.eq("type", options.type)
  }

  const { data, error } = await query.maybeSingle()
  if (error) {
    throw new Error(`E2E fetchNotificaByCommentId failed: ${error.message}`)
  }
  if (!data) return null

  const row = data as Omit<NotificaRow, "status">
  return { ...row, status: deriveNotificaStatus(row) }
}

export async function waitForNotificaByCommentId(
  commentId: string,
  options: {
    userId: string
    type?: "menzione" | "risposta_thread"
    status?: "non_letta" | "letta" | "risolta"
  },
): Promise<NotificaRow> {
  const deadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < deadline) {
    const row = await fetchNotificaByCommentId(commentId, options)
    if (row && (!options.status || row.status === options.status)) {
      return row
    }
    await sleep(POLL_INTERVAL_MS)
  }

  throw new Error(
    `E2E waitForNotificaByCommentId timed out for commentId=${commentId}`,
  )
}

export async function deleteNotificheForE2eOperators() {
  const admin = getSupabaseAdmin()
  const emails = Object.values(OPERATORS).map((operator) => operator.email)
  const { data, error } = await admin.from("operatori").select("id").in("email", emails)
  if (error) {
    throw new Error(`E2E deleteNotificheForE2eOperators select failed: ${error.message}`)
  }

  const ids = (data ?? []).map((row) => (row as { id: string }).id)
  if (ids.length === 0) return

  const { error: deleteError } = await admin.from("notifiche").delete().in("user_id", ids)
  if (deleteError) {
    throw new Error(`E2E deleteNotificheForE2eOperators delete failed: ${deleteError.message}`)
  }
}

export async function resetNotificheFixture(prefix = E2E_COMMENTI_BODY_PREFIX) {
  await deleteNotificheForE2eOperators()
  await resetCommentiFixture(prefix)
}

function deriveNotificaStatus(row: {
  read_at: string | null
  resolved_at: string | null
}): "non_letta" | "letta" | "risolta" {
  if (row.resolved_at) return "risolta"
  if (row.read_at) return "letta"
  return "non_letta"
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
