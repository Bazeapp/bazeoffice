import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import {
  E2E_COMMENTI_BODY_PREFIX,
  OPERATORS,
  getLocalSupabaseConfig,
  type OperatorRole,
} from "../constants"
import { getSupabaseAdmin } from "./supabase-admin"

type EntityType =
  | "famiglia"
  | "lavoratore"
  | "ricerca"
  | "candidatura"
  | "rapporto"
  | "assunzione"
  | "variazione"
  | "chiusura"
  | "cedolino"
  | "contributi"
  | "ticket"

type CommentType = "free" | "phase_note"
type PhaseLabel = "gate_1" | "gate_2" | null
type SourceInterface =
  | "kanban_famiglie"
  | "assegnazione_famiglie"
  | "dettaglio_ricerca"
  | "dettaglio_lavoratore_ricerca"
  | "cerca_lavoratore"
  | "gate_1"
  | "gate_2"
  | "rapporti_lavorativi"
  | "assunzioni"
  | "chiusure"
  | "variazioni"
  | "cedolini"
  | "contributi_inps"
  | "ticket_customer"
  | "ticket_payroll"

export type SeedCommentInput = {
  role?: OperatorRole
  pageEntityType: EntityType
  pageEntityId: string
  anchorEntityType: EntityType
  anchorEntityId: string
  body: string
  commentType?: CommentType
  phaseLabel?: PhaseLabel
  sourceInterface?: SourceInterface | null
}

async function createAuthenticatedClient(role: OperatorRole): Promise<SupabaseClient> {
  const operator = OPERATORS[role]
  const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = getLocalSupabaseConfig()
  const client = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const { error } = await client.auth.signInWithPassword({
    email: operator.email,
    password: operator.password,
  })

  if (error) {
    throw new Error(`E2E comment auth failed for ${role}: ${error.message}`)
  }

  return client
}

export async function seedComment(input: SeedCommentInput) {
  const client = await createAuthenticatedClient(input.role ?? "recruiter")
  const { data, error } = await client.rpc("commenti_create", {
    p_page_entity_type: input.pageEntityType,
    p_page_entity_id: input.pageEntityId,
    p_entity_type: input.anchorEntityType,
    p_entity_id: input.anchorEntityId,
    p_body: input.body,
    p_comment_type: input.commentType ?? "free",
    p_phase_label: input.phaseLabel ?? null,
    p_source_interface: input.sourceInterface ?? null,
  })

  if (error) {
    throw new Error(`E2E seedComment failed: ${error.message}`)
  }

  return data as { id: string }
}

export async function seedReply(input: {
  role?: OperatorRole
  pageEntityType: EntityType
  pageEntityId: string
  threadRootId: string
  body: string
}) {
  const client = await createAuthenticatedClient(input.role ?? "recruiter")
  const { data, error } = await client.rpc("commenti_reply", {
    p_page_entity_type: input.pageEntityType,
    p_page_entity_id: input.pageEntityId,
    p_thread_root_id: input.threadRootId,
    p_body: input.body,
  })

  if (error) {
    throw new Error(`E2E seedReply failed: ${error.message}`)
  }

  return data as { id: string }
}

export async function deleteCommentsByBodyPrefix(prefix = E2E_COMMENTI_BODY_PREFIX) {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from("commenti")
    .select("id")
    .like("body", `${prefix}%`)

  if (error) {
    throw new Error(`E2E deleteCommentsByBodyPrefix select failed: ${error.message}`)
  }

  const ids = (data ?? []).map((row) => (row as { id: string }).id)
  if (ids.length === 0) return

  const { error: deleteError } = await admin.from("commenti").delete().in("id", ids)
  if (deleteError) {
    throw new Error(`E2E deleteCommentsByBodyPrefix delete failed: ${deleteError.message}`)
  }
}

export async function resetCommentiFixture(prefix = E2E_COMMENTI_BODY_PREFIX) {
  await deleteCommentsByBodyPrefix(prefix)
}

export async function resolveOperatorIdByEmail(email: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("operatori")
    .select("id")
    .eq("email", email)
    .maybeSingle()

  if (error) {
    throw new Error(`E2E resolveOperatorIdByEmail failed for ${email}: ${error.message}`)
  }

  return (data as { id: string } | null)?.id ?? null
}

export function formatMentionBody(label: string, userId: string, prefix = ""): string {
  return `${prefix}@[${label}](${userId})`
}
