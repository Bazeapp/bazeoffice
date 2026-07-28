export type EntityType =
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

export type EntityRef = {
  entityType: EntityType
  entityId: string
}
