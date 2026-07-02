import { invokeEdgeFunction } from "@/lib/supabase-edge"
import type { LavoratoreRecord } from "@/modules/lavoratori/types/lavoratore"

export type CreateStripeConnectAccountResponse = {
  id_stripe_account: string
  created: boolean
  requirements?: unknown
  future_requirements?: unknown
  row?: LavoratoreRecord
}

export async function createStripeConnectAccount(lavoratoreId: string) {
  return invokeEdgeFunction<CreateStripeConnectAccountResponse>(
    "create-stripe-connect-account",
    {
      lavoratore_id: lavoratoreId,
    },
  )
}
