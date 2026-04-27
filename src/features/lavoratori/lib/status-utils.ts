import * as React from "react"
import {
  BadgeCheckIcon,
  CheckCircle2Icon,
  MinusCircleIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from "lucide-react"

import type { LavoratoreListItem } from "@/components/lavoratori/lavoratore-card"
import { asString, parseNumberValue, readArrayStrings, toAvatarUrl } from "@/features/lavoratori/lib/base-utils"
import { normalizeLookupToken } from "@/features/lavoratori/lib/lookup-utils"

export function isNonIdoneoStatus(value: unknown) {
  const normalized = normalizeLookupToken(value).replaceAll("_", " ")
  return normalized.includes("non idoneo")
}

export function normalizeWorkerStatus(value: unknown) {
  return asString(value).toLowerCase().replaceAll("_", " ")
}

export function toWorkerStatusFlags(status: unknown) {
  const normalized = normalizeWorkerStatus(status)
  return {
    isQualified:
      normalized === "qualificato" ||
      normalized === "non idoneo" ||
      normalized === "idoneo" ||
      normalized === "certificato",
    isIdoneo: normalized === "idoneo" || normalized === "certificato",
    isCertificato: normalized === "certificato",
  }
}

export function parseBooleanValue(value: unknown) {
  if (typeof value === "boolean") return value
  if (typeof value === "number") return value !== 0
  if (typeof value !== "string") return null
  const normalized = value.trim().toLowerCase()
  if (["true", "1", "si", "sì", "yes", "ok", "ho tutti i documenti in regola"].includes(normalized)) {
    return true
  }
  if (["false", "0", "no", "non ho referenze verificabili"].includes(normalized)) {
    return false
  }
  return null
}

export function normalizeToken(value: string) {
  return value.trim().toLowerCase().replaceAll("_", " ")
}

export type NonQualificatoIssue = {
  id: string
  title: string
  detail?: string
}

export type WorkerQualificationStatus = {
  label: "Non qualificato" | "Non idoneo" | "Qualificato" | "Idoneo" | "Certificato"
  ringClassName: string
  badgeClassName: string
  icon: React.ComponentType<{ className?: string }>
}

export function getWorkerQualificationStatus(worker: LavoratoreListItem): WorkerQualificationStatus {
  if (worker.isCertificato) {
    return {
      label: "Certificato",
      ringClassName: "ring-2 ring-emerald-600/40",
      badgeClassName: "bg-success text-foreground-on-accent",
      icon: BadgeCheckIcon,
    }
  }
  if (worker.isIdoneo) {
    return {
      label: "Idoneo",
      ringClassName: "ring-2 ring-emerald-400/40",
      badgeClassName: "bg-emerald-400 text-emerald-950",
      icon: ShieldCheckIcon,
    }
  }
  if (worker.isQualified && !worker.isIdoneo) {
    return {
      label: "Non idoneo",
      ringClassName: "ring-2 ring-amber-400/40",
      badgeClassName: "bg-amber-300 text-amber-950",
      icon: XCircleIcon,
    }
  }
  if (worker.isQualified) {
    return {
      label: "Qualificato",
      ringClassName: "ring-2 ring-emerald-300/40",
      badgeClassName: "bg-emerald-300 text-emerald-950",
      icon: CheckCircle2Icon,
    }
  }
  return {
    label: "Non qualificato",
    ringClassName: "ring-2 ring-zinc-300/50",
    badgeClassName: "bg-zinc-300 text-zinc-900",
    icon: MinusCircleIcon,
  }
}

export function findNonQualificatoIssues(row: Record<string, unknown>) {
  const issues: NonQualificatoIssue[] = []

  const description =
    asString(row.descrizione_pubblica) || asString(row.descrizione) || asString(row.bio_personale)
  if (!description) {
    issues.push({ id: "missing-description", title: "Manca la descrizione" })
  }

  if (!toAvatarUrl(row)) {
    issues.push({ id: "missing-photo", title: "Manca la foto" })
  }

  const provincia = asString(row.provincia)
  const indirizzo = asString(row.indirizzo_residenza_completo)
  const inMilano =
    normalizeToken(provincia).includes("milano") || normalizeToken(indirizzo).includes("milano")
  if (!inMilano) {
    issues.push({
      id: "not-milano",
      title: "Non è a Milano",
      detail: provincia || indirizzo || undefined,
    })
  }

  const documentiInRegola = parseBooleanValue(row.documenti_in_regola)
  if (documentiInRegola !== true) {
    issues.push({
      id: "documenti",
      title: "Non ha i documenti in regola (o non l'ha autocertificato)",
      detail: asString(row.documenti_in_regola) || undefined,
    })
  }

  const referenze = normalizeToken(asString(row.hai_referenze))
  const hasReferenze = referenze.includes("verificabili") && !referenze.includes("non ")
  if (!hasReferenze) {
    issues.push({
      id: "referenze",
      title: "Non ha referenze verificabili (o non l'ha autocertificato)",
      detail: asString(row.hai_referenze) || undefined,
    })
  }

  const dataDiNascita = asString(row.data_di_nascita)
  let age: number | null = null
  if (dataDiNascita) {
    const birthDate = new Date(dataDiNascita)
    if (!Number.isNaN(birthDate.getTime())) {
      const now = new Date()
      age = now.getFullYear() - birthDate.getFullYear()
      const hasNotHadBirthdayYet =
        now.getMonth() < birthDate.getMonth() ||
        (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate())
      if (hasNotHadBirthdayYet) age -= 1
    }
  }
  if (age === null || age < 23 || age > 60) {
    issues.push({
      id: "age",
      title: "Ha meno di 23 anni o più di 60 anni",
      detail: age === null ? undefined : String(age),
    })
  }

  const tipoLavoroDomestico = readArrayStrings(row.tipo_lavoro_domestico).map(normalizeToken)
  const cercaColfOrBabysitter = tipoLavoroDomestico.some(
    (value) => value.includes("colf") || value.includes("babysitter")
  )
  if (!cercaColfOrBabysitter) {
    issues.push({
      id: "tipo-lavoro",
      title: "Non cerca un lavoro come colf o babysitter",
      detail: readArrayStrings(row.tipo_lavoro_domestico).join(", ") || undefined,
    })
  }

  const esperienzaColf = parseNumberValue(row.anni_esperienza_colf) ?? 0
  const esperienzaBabysitter = parseNumberValue(row.anni_esperienza_babysitter) ?? 0
  const maxEsperienza = Math.max(esperienzaColf, esperienzaBabysitter)
  if (maxEsperienza < 4) {
    issues.push({
      id: "esperienza",
      title: "Ha meno di 4 anni di esperienza come colf o babysitter",
      detail: String(maxEsperienza),
    })
  }

  return issues
}
