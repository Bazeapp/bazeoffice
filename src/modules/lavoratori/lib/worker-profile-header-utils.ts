import { hashStringDjb2 } from "@/lib/utils"

import { asString } from "./base-utils"
import type { LavoratoreRecord } from "../types/lavoratore"

export type WorkerProfileHeaderField =
  | "nome"
  | "cognome"
  | "descrizione_pubblica"
  | "email"
  | "telefono"
  | "sesso"
  | "nazionalita"
  | "data_di_nascita"

export type WorkerProfileHeaderDraft = Record<WorkerProfileHeaderField, string>

export const HR_OPTIONS = [
  { id: "giulia", label: "Giulia", avatar: "G" },
  { id: "elisa", label: "Elisa", avatar: "E" },
  { id: "francesca", label: "Francesca", avatar: "F" },
] as const

export type HrId = (typeof HR_OPTIONS)[number]["id"]

export function buildFormDefaults(row: LavoratoreRecord): WorkerProfileHeaderDraft {
  return {
    nome: asString(row.nome),
    cognome: asString(row.cognome),
    descrizione_pubblica: asString(row.descrizione_pubblica),
    email: asString(row.email),
    telefono: asString(row.telefono),
    sesso: asString(row.sesso),
    nazionalita: asString(row.nazionalita),
    data_di_nascita: asString(row.data_di_nascita),
  }
}

export function getAssigneeIdFromSeed(seed: string): HrId {
  const index = hashStringDjb2(seed) % HR_OPTIONS.length
  return HR_OPTIONS[index]!.id
}

export function getHrById(assigneeId: HrId) {
  return HR_OPTIONS.find((option) => option.id === assigneeId) ?? HR_OPTIONS[0]
}

export function getAssigneeAvatarBorderClass(assigneeId: HrId) {
  switch (assigneeId) {
    case "giulia":
      return "after:border-emerald-500"
    case "elisa":
      return "after:border-sky-500"
    case "francesca":
      return "after:border-violet-500"
    default:
      return ""
  }
}

export function getGateAvatarStateClass(isCompleted: boolean, variant: "idoneo" | "certificato") {
  if (!isCompleted) {
    return {
      ringClassName: "ring-2 ring-zinc-300/50",
      badgeClassName: "bg-zinc-300 text-zinc-900",
    }
  }

  if (variant === "certificato") {
    return {
      ringClassName: "ring-2 ring-emerald-600/40",
      badgeClassName: "bg-success text-foreground-on-accent",
    }
  }

  return {
    ringClassName: "ring-2 ring-emerald-400/40",
    badgeClassName: "bg-emerald-400 text-emerald-950",
  }
}
