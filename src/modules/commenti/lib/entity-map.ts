import { ENTITY_TYPE_TO_TABLE } from "./consts"
import type { EntityType } from "../types/entity"

export function tableForEntityType(entityType: EntityType): string {
  return ENTITY_TYPE_TO_TABLE[entityType]
}

export function isEntityType(value: string): value is EntityType {
  return value in ENTITY_TYPE_TO_TABLE
}
