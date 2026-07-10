import { toast } from "sonner"

import type { CrmPipelineCardData } from "../types"
import { editableFamigliaProcessoValue } from "./famiglia-processo-display"
import {
  isValidFamilyEmail,
  isValidFamilyPhoneValue,
  normalizeFamilyPhoneValue,
  splitReferenteName,
} from "./family-contact-validation"

export type FamigliaProcessoHeaderFormValues = {
  nomeFamiglia: string
  email: string
  telefono: string
  tipo_lavoro: string[]
  tipo_rapporto: string
}

export function buildFamigliaProcessoHeaderFormDefaults(
  card: CrmPipelineCardData | null
): FamigliaProcessoHeaderFormValues {
  return {
    nomeFamiglia: editableFamigliaProcessoValue(card?.nomeFamiglia),
    email: editableFamigliaProcessoValue(card?.email),
    telefono: editableFamigliaProcessoValue(card?.telefono),
    tipo_lavoro: card?.tipoLavoroBadges ?? [],
    tipo_rapporto: card?.tipoRapportoBadge ?? "",
  }
}

type BuildHeaderFormSaveHandlerParams = {
  familyId: string | null | undefined
  processId: string | null | undefined
  onPatchFamily?: (
    familyId: string,
    patch: Record<string, unknown>
  ) => void | Promise<void>
  onPatchProcess?: (
    processId: string,
    patch: Record<string, unknown>
  ) => void | Promise<void>
}

export function buildFamigliaProcessoHeaderFormSaveHandler({
  familyId,
  processId,
  onPatchFamily,
  onPatchProcess,
}: BuildHeaderFormSaveHandlerParams) {
  return async (patch: Partial<FamigliaProcessoHeaderFormValues>) => {
    const familyPatch: Record<string, unknown> = {}
    const processPatch: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(patch)) {
      if (key === "nomeFamiglia") {
        const normalized = String(value ?? "").replace(/\s+/g, " ").trim()
        if (!normalized) {
          toast.error("Il nome referente non puo essere vuoto")
          continue
        }
        Object.assign(familyPatch, splitReferenteName(normalized))
      } else if (key === "email") {
        const normalized = String(value ?? "").trim().toLowerCase()
        if (!normalized) {
          toast.error("L'email famiglia non puo essere vuota")
          continue
        }
        if (!isValidFamilyEmail(normalized)) {
          toast.error("Email famiglia non valida")
          continue
        }
        familyPatch.email = normalized
      } else if (key === "telefono") {
        const normalized = normalizeFamilyPhoneValue(String(value ?? ""))
        if (!normalized) {
          toast.error("Il telefono famiglia non puo essere vuoto")
          continue
        }
        if (!isValidFamilyPhoneValue(normalized)) {
          toast.error(
            "Telefono famiglia non valido: usa formato internazionale, es. +393331234567"
          )
          continue
        }
        familyPatch.telefono = normalized
      } else if (key === "tipo_lavoro") {
        processPatch.tipo_lavoro = Array.isArray(value) ? value : []
      } else if (key === "tipo_rapporto") {
        const label = String(value ?? "").trim()
        processPatch.tipo_rapporto = label ? [label] : []
      }
    }

    if (Object.keys(familyPatch).length > 0 && familyId && familyId !== "-") {
      await onPatchFamily?.(familyId, familyPatch)
    }
    if (Object.keys(processPatch).length > 0 && processId) {
      await onPatchProcess?.(processId, processPatch)
    }
  }
}
