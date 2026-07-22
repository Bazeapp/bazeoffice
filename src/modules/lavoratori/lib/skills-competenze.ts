import type { LookupOption } from "./lookup-utils"

export type SkillCompetenzeValues = {
  livello_pulizie: string
  check_accetta_salire_scale_o_soffitti_alti: string
  compatibilita_famiglie_numerose: string
  compatibilita_famiglie_molto_esigenti: string
  compatibilita_lavoro_con_datore_presente_in_casa: string
  compatibilita_con_case_di_grandi_dimensioni: string
  compatibilita_con_elevata_autonomia_richiesta: string
  compatibilita_con_contesti_pacati: string
  livello_stiro: string
  compatibilita_con_stiro_esigente: string
  livello_cucina: string
  compatibilita_con_cucina_strutturata: string
  livello_babysitting: string
  check_accetta_babysitting_multipli_bambini: string
  check_accetta_babysitting_neonati: string
  compatibilita_babysitting_neonati: string
  livello_dogsitting: string
  check_accetta_case_con_cani: string
  check_accetta_case_con_cani_grandi: string
  check_accetta_case_con_gatti: string
  compatibilita_con_animali_in_casa: string
  livello_giardinaggio: string
  livello_italiano: string
  livello_inglese: string
}

export type SkillFieldConfig = {
  field: keyof SkillCompetenzeValues
  label: string
  domain: string
  type: "level" | "choice"
}

export type SkillSectionConfig = {
  title: string
  iconKey: SkillSectionIconKey
  levelFields: SkillFieldConfig[]
  choiceFields: SkillFieldConfig[]
  choiceGroups?: Array<{
    title: string
    fields: Array<keyof SkillCompetenzeValues>
  }>
}

export type SkillSectionIconKey =
  | "brush-cleaning"
  | "shirt"
  | "utensils"
  | "baby"
  | "paw-print"
  | "home"
  | "globe"

export type SkillChoiceRow = {
  field: string
  label: string
  domain: string
  value: string
  options: LookupOption[]
}

export type SkillsCompetenzeBindings = {
  isEditing: boolean
  isUpdating: boolean
  lookupOptionsByDomain: Map<string, LookupOption[]>
  lookupColorsByDomain: Map<string, string>
  onFieldChange: (field: keyof SkillCompetenzeValues, value: string) => void
}

export function getLevelMeta(value: string) {
  switch (value.trim().toLowerCase()) {
    case "alto":
      return {
        activeSegments: 3,
        toneClassName: "bg-emerald-500",
      }
    case "medio":
      return {
        activeSegments: 2,
        toneClassName: "bg-amber-400",
      }
    case "basso":
      return {
        activeSegments: 1,
        toneClassName: "bg-orange-500",
      }
    default:
      return {
        activeSegments: 0,
        toneClassName: "bg-muted-foreground/30",
      }
  }
}

export function buildChoiceRows(
  fields: SkillFieldConfig[],
  values: SkillCompetenzeValues,
  lookupOptionsByDomain: Map<string, LookupOption[]>,
): SkillChoiceRow[] {
  const rows: SkillChoiceRow[] = []

  for (const field of fields) {
    rows.push({
      field: field.field,
      label: field.label,
      domain: field.domain,
      value: values[field.field],
      options: lookupOptionsByDomain.get(field.domain) ?? [],
    })
  }

  return rows
}

export function buildGroupedChoiceRows(
  fields: SkillFieldConfig[],
  groups: NonNullable<SkillSectionConfig["choiceGroups"]>,
  values: SkillCompetenzeValues,
  lookupOptionsByDomain: Map<string, LookupOption[]>,
) {
  const fieldByKey = new Map(fields.map((field) => [field.field, field]))

  return groups
    .map((group) => {
      const rows: SkillChoiceRow[] = group.fields
        .map((fieldKey) => fieldByKey.get(fieldKey))
        .filter((field): field is SkillFieldConfig => Boolean(field))
        .map((field) => ({
          field: field.field,
          label: field.label,
          domain: field.domain,
          value: values[field.field],
          options: lookupOptionsByDomain.get(field.domain) ?? [],
        }))

      return {
        title: group.title,
        rows,
      }
    })
    .filter((group) => group.rows.length > 0)
}
