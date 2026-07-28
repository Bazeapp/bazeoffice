import { ENTITY_SECTION_META } from "./consts"
import { compareAncestorSections } from "./comments-section"
import {
  collectRapportoChainRefs,
  pushRefFromRow,
  pushUniqueRef,
  readObject,
  readRapportoRow,
  readStringId,
  resolveDisplayName,
} from "./comment-stack-row"
import type {
  CommentSection,
  ResolveCommentStackInput,
  ResolveCommentStackResult,
} from "../types/section"
import { entityRefKey } from "./entity-ref"
import type { EntityRef, EntityType } from "../types/entity"

const MAX_ANCESTOR_SECTIONS = 5
const DESCENDANTS_SECTION_ID = "descendants"

function normalizeRow(
  focusType: EntityType,
  row: Record<string, unknown>,
): Record<string, unknown> {
  if (focusType === "chiusura") {
    const record = readObject(row, "record")
    const rapporto = readObject(row, "rapporto")
    if (record) {
      return rapporto ? { ...record, rapporto } : record
    }
  }

  if (focusType === "variazione" || focusType === "cedolino" || focusType === "contributi") {
    const rapporto = readRapportoRow(row)
    return rapporto ? { ...row, rapporto } : row
  }

  return row
}

function collectAncestorRefs(
  focus: EntityRef,
  row: Record<string, unknown>,
): EntityRef[] {
  const seen = new Set<EntityType>()
  const refs: EntityRef[] = []

  const processRow =
    readObject(row, "process") ??
    readObject(row, "processo") ??
    readObject(row, "processi_matching")

  switch (focus.entityType) {
    case "candidatura":
      pushRefFromRow(refs, seen, "lavoratore", row, ["lavoratore_id", "id_lavoratore"])
      pushRefFromRow(refs, seen, "ricerca", row, [
        "processo_matching_id",
        "processi_matching_id",
        "id_processo_matching",
      ])
      pushRefFromRow(refs, seen, "famiglia", row, ["famiglia_id", "id_famiglia"])
      if (processRow) {
        pushRefFromRow(refs, seen, "famiglia", processRow, ["famiglia_id", "id_famiglia"])
      }
      break
    case "ricerca":
      pushRefFromRow(refs, seen, "famiglia", row, ["famiglia_id", "id_famiglia"])
      break
    case "rapporto":
      pushRefFromRow(refs, seen, "lavoratore", row, ["lavoratore_id", "id_lavoratore"])
      pushRefFromRow(refs, seen, "ricerca", row, [
        "processi_matching_id",
        "processo_matching_id",
        "id_processo_matching",
      ])
      pushRefFromRow(refs, seen, "famiglia", row, ["famiglia_id", "id_famiglia"])
      break
    case "assunzione":
    case "variazione":
    case "chiusura":
    case "cedolino":
    case "contributi": {
      const rapportoRow = readRapportoRow(row)
      if (rapportoRow) {
        for (const ref of collectRapportoChainRefs(rapportoRow, seen)) {
          refs.push(ref)
        }
        break
      }

      if (focus.entityType === "assunzione") {
        pushRefFromRow(refs, seen, "lavoratore", row, ["lavoratore_id", "id_lavoratore"])
        pushRefFromRow(refs, seen, "famiglia", row, ["famiglia_id", "id_famiglia"])
      }
      break
    }
    case "ticket": {
      const rapportoRow = readRapportoRow(row)
      if (rapportoRow) {
        for (const ref of collectRapportoChainRefs(rapportoRow, seen)) {
          refs.push(ref)
        }
        break
      }

      pushUniqueRef(refs, seen, "assunzione", readStringId(row, ["assunzione_id"]))
      pushUniqueRef(refs, seen, "variazione", readStringId(row, ["variazione_id"]))
      pushUniqueRef(refs, seen, "chiusura", readStringId(row, ["chiusura_id"]))
      pushUniqueRef(refs, seen, "cedolino", readStringId(row, ["cedolino_id"]))
      pushUniqueRef(refs, seen, "contributi", readStringId(row, ["contributi_id"]))
      break
    }
    case "famiglia":
    case "lavoratore":
      break
  }

  return refs
    .filter(
      (ref) =>
        ref.entityType !== focus.entityType || ref.entityId !== focus.entityId,
    )
    .sort((left, right) => compareAncestorSections(left.entityType, right.entityType))
    .slice(0, MAX_ANCESTOR_SECTIONS)
}

function buildEntitySection(
  ref: EntityRef,
  kind: "focus" | "ancestor",
  row: Record<string, unknown>,
  displayNames: Record<string, string> | undefined,
  visibilityHint: string | null,
): CommentSection {
  const meta = ENTITY_SECTION_META[ref.entityType]
  return {
    id: entityRefKey(ref),
    kind,
    entityRef: ref,
    typeLabel: meta.typeLabel,
    displayName: resolveDisplayName(ref, row, displayNames),
    icon: meta.icon,
    visibilityHint,
  }
}

function buildDescendantsSection(): CommentSection {
  return {
    id: DESCENDANTS_SECTION_ID,
    kind: "descendants",
    entityRef: null,
    typeLabel: "COLLEGATE",
    displayName: "",
    icon: "",
    visibilityHint: null,
  }
}

function buildVisibilityHint(
  targetIndex: number,
  entitySections: CommentSection[],
): string | null {
  if (targetIndex <= 0) return null
  const names = entitySections
    .slice(0, targetIndex)
    .map((section) => section.displayName)
    .filter(Boolean)
  return names.length > 0 ? names.join(", ") : null
}

export function resolveCommentStack(
  input: ResolveCommentStackInput,
): ResolveCommentStackResult {
  const row = normalizeRow(input.focus.entityType, input.row)
  const ancestorRefs = collectAncestorRefs(input.focus, row)

  const entitySections: CommentSection[] = [
    buildEntitySection(input.focus, "focus", row, input.displayNames, null),
    ...ancestorRefs.map((ref) =>
      buildEntitySection(ref, "ancestor", row, input.displayNames, null),
    ),
  ]

  const sections: CommentSection[] = [
    ...entitySections.map((section, index) => ({
      ...section,
      visibilityHint: buildVisibilityHint(index, entitySections),
    })),
    buildDescendantsSection(),
  ]

  const chipOptions = entitySections
    .map((section) => section.entityRef)
    .filter((ref): ref is EntityRef => ref !== null)

  const visibilityHintsByTarget: Record<string, string> = {}
  for (const section of sections) {
    if (!section.entityRef || !section.visibilityHint) continue
    visibilityHintsByTarget[entityRefKey(section.entityRef)] = section.visibilityHint
  }

  if (
    input.focus.entityType === "lavoratore" &&
    entitySections.length === 1 &&
    entitySections[0]
  ) {
    visibilityHintsByTarget[entityRefKey(input.focus)] =
      "tutte le ricerche in cui compare"
  }

  return {
    sections,
    chipOptions,
    visibilityHintsByTarget,
  }
}
