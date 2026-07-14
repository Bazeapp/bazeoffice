import type { EntityType } from "../commenti.types"

export const ENTITY_TYPE_TO_TABLE: Record<EntityType, string> = {
  famiglia: "famiglie",
  lavoratore: "lavoratori",
  ricerca: "processi_matching",
  candidatura: "selezioni_lavoratori",
  rapporto: "rapporti_lavorativi",
  assunzione: "assunzioni",
  variazione: "variazioni_contrattuali",
  chiusura: "chiusure_contratti",
  cedolino: "mesi_lavorati",
  contributi: "contributi_inps",
  ticket: "ticket",
}

export const ENTITY_SECTION_META: Record<
  EntityType,
  { typeLabel: string; icon: string }
> = {
  famiglia: { typeLabel: "FAMIGLIA", icon: "🏠" },
  lavoratore: { typeLabel: "LAVORATORE", icon: "👤" },
  ricerca: { typeLabel: "RICERCA", icon: "🔍" },
  candidatura: { typeLabel: "CANDIDATURA", icon: "🎯" },
  rapporto: { typeLabel: "RAPPORTO", icon: "💼" },
  assunzione: { typeLabel: "ASSUNZIONE", icon: "📄" },
  variazione: { typeLabel: "VARIAZIONE", icon: "📄" },
  chiusura: { typeLabel: "CHIUSURA", icon: "📄" },
  cedolino: { typeLabel: "CEDOLINO", icon: "📄" },
  contributi: { typeLabel: "CONTRIBUTI", icon: "📄" },
  ticket: { typeLabel: "TICKET", icon: "📄" },
}

export function tableForEntityType(entityType: EntityType): string {
  return ENTITY_TYPE_TO_TABLE[entityType]
}

export function isEntityType(value: string): value is EntityType {
  return value in ENTITY_TYPE_TO_TABLE
}
