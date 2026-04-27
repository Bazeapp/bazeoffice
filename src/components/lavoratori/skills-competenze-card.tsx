import type { ComponentType } from "react"
import {
  BabyIcon,
  BrushCleaningIcon,
  GlobeIcon,
  HomeIcon,
  PawPrintIcon,
  PencilIcon,
  SparklesIcon,
  ShirtIcon,
  UtensilsCrossedIcon,
} from "lucide-react"

import { DetailSectionBlock, DetailSectionCard } from "@/components/shared-next/detail-section-card"
import {
  SkillsChoiceMatrix,
  type SkillsChoiceMatrixRow,
} from "@/components/lavoratori/skills-choice-matrix"
import { Badge } from "@/components/ui-next/badge"
import { Button } from "@/components/ui-next/button"
import { FieldSet } from "@/components/ui-next/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui-next/select"
import { getTagClassName, resolveLookupColor, type LookupOption } from "@/features/lavoratori/lib/lookup-utils"
import { cn } from "@/lib/utils"

type SkillCompetenzeValues = {
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

type SkillFieldConfig = {
  field: keyof SkillCompetenzeValues
  label: string
  domain: string
  type: "level" | "choice"
}

type SkillSectionConfig = {
  title: string
  icon: ComponentType<{ className?: string }>
  levelFields: SkillFieldConfig[]
  choiceFields: SkillFieldConfig[]
  choiceGroups?: Array<{
    title: string
    fields: Array<keyof SkillCompetenzeValues>
  }>
}

type SkillsCompetenzeCardProps = {
  isEditing: boolean
  showEditAction?: boolean
  collapsible?: boolean
  defaultOpen?: boolean
  isUpdating: boolean
  draft: SkillCompetenzeValues
  selectedValues: SkillCompetenzeValues
  lookupOptionsByDomain: Map<string, LookupOption[]>
  lookupColorsByDomain: Map<string, string>
  onToggleEdit: () => void
  onFieldChange: (field: keyof SkillCompetenzeValues, value: string) => void
}

const SKILL_SECTIONS: SkillSectionConfig[] = [
  {
    title: "Pulizie",
    icon: BrushCleaningIcon,
    levelFields: [
      {
        field: "livello_pulizie",
        label: "Pulizie",
        domain: "lavoratori.livello_pulizie",
        type: "level",
      },
    ],
    choiceFields: [
      {
        field: "check_accetta_salire_scale_o_soffitti_alti",
        label: "Scale / soffitti alti",
        domain: "lavoratori.check_accetta_salire_scale_o_soffitti_alti",
        type: "choice",
      },
      {
        field: "compatibilita_famiglie_numerose",
        label: "Famiglie numerose",
        domain: "lavoratori.compatibilita_famiglie_numerose",
        type: "choice",
      },
      {
        field: "compatibilita_famiglie_molto_esigenti",
        label: "Famiglie molto esigenti",
        domain: "lavoratori.compatibilita_famiglie_molto_esigenti",
        type: "choice",
      },
      {
        field: "compatibilita_lavoro_con_datore_presente_in_casa",
        label: "Datore sempre presente",
        domain: "lavoratori.compatibilita_lavoro_con_datore_presente_in_casa",
        type: "choice",
      },
      {
        field: "compatibilita_con_case_di_grandi_dimensioni",
        label: "Case grandi (>200mq)",
        domain: "lavoratori.compatibilita_con_case_di_grandi_dimensioni",
        type: "choice",
      },
      {
        field: "compatibilita_con_elevata_autonomia_richiesta",
        label: "Totale autonomia",
        domain: "lavoratori.compatibilita_con_elevata_autonomia_richiesta",
        type: "choice",
      },
      {
        field: "compatibilita_con_contesti_pacati",
        label: "Contesti pacati",
        domain: "lavoratori.compatibilita_con_contesti_pacati",
        type: "choice",
      },
    ],
    choiceGroups: [
      {
        title: "Disponibilita",
        fields: ["check_accetta_salire_scale_o_soffitti_alti"],
      },
      {
        title: "Consigliata da Baze",
        fields: [
          "compatibilita_famiglie_numerose",
          "compatibilita_con_case_di_grandi_dimensioni",
        ],
      },
    ],
  },
  {
    title: "Stiro",
    icon: ShirtIcon,
    levelFields: [
      {
        field: "livello_stiro",
        label: "Stiro",
        domain: "lavoratori.livello_stiro",
        type: "level",
      },
    ],
    choiceFields: [
      {
        field: "compatibilita_con_stiro_esigente",
        label: "Stiro ottimo richiesto",
        domain: "lavoratori.compatibilita_con_stiro_esigente",
        type: "choice",
      },
    ],
    choiceGroups: [
      {
        title: "Consigliata da Baze",
        fields: ["compatibilita_con_stiro_esigente"],
      },
    ],
  },
  {
    title: "Cucina",
    icon: UtensilsCrossedIcon,
    levelFields: [
      {
        field: "livello_cucina",
        label: "Cucina",
        domain: "lavoratori.livello_cucina",
        type: "level",
      },
    ],
    choiceFields: [
      {
        field: "compatibilita_con_cucina_strutturata",
        label: "Cucina strutturata",
        domain: "lavoratori.compatibilita_con_cucina_strutturata",
        type: "choice",
      },
    ],
    choiceGroups: [
      {
        title: "Consigliata da Baze",
        fields: ["compatibilita_con_cucina_strutturata"],
      },
    ],
  },
  {
    title: "Bambini",
    icon: BabyIcon,
    levelFields: [
      {
        field: "livello_babysitting",
        label: "Babysitting",
        domain: "lavoratori.livello_babysitting",
        type: "level",
      },
    ],
    choiceFields: [
      {
        field: "check_accetta_babysitting_multipli_bambini",
        label: "Piu bambini",
        domain: "lavoratori.check_accetta_babysitting_multipli_bambini",
        type: "choice",
      },
      {
        field: "check_accetta_babysitting_neonati",
        label: "Neonati",
        domain: "lavoratori.check_accetta_babysitting_neonati",
        type: "choice",
      },
      {
        field: "compatibilita_babysitting_neonati",
        label: "Consigliata per neonati",
        domain: "lavoratori.compatibilita_babysitting_neonati",
        type: "choice",
      },
    ],
    choiceGroups: [
      {
        title: "Disponibilita",
        fields: [
          "check_accetta_babysitting_multipli_bambini",
          "check_accetta_babysitting_neonati",
        ],
      },
      {
        title: "Consigliata da Baze",
        fields: ["compatibilita_babysitting_neonati"],
      },
    ],
  },
  {
    title: "Animali",
    icon: PawPrintIcon,
    levelFields: [
      {
        field: "livello_dogsitting",
        label: "Dogsitting",
        domain: "lavoratori.livello_dogsitting",
        type: "level",
      },
    ],
    choiceFields: [
      {
        field: "check_accetta_case_con_cani",
        label: "Case con cani",
        domain: "lavoratori.check_accetta_case_con_cani",
        type: "choice",
      },
      {
        field: "check_accetta_case_con_cani_grandi",
        label: "Case con cani grandi",
        domain: "lavoratori.check_accetta_case_con_cani_grandi",
        type: "choice",
      },
      {
        field: "check_accetta_case_con_gatti",
        label: "Case con gatti",
        domain: "lavoratori.check_accetta_case_con_gatti",
        type: "choice",
      },
      {
        field: "compatibilita_con_animali_in_casa",
        label: "Consigliata con animali",
        domain: "lavoratori.compatibilita_con_animali_in_casa",
        type: "choice",
      },
    ],
    choiceGroups: [
      {
        title: "Accetta",
        fields: [
          "check_accetta_case_con_cani",
          "check_accetta_case_con_cani_grandi",
          "check_accetta_case_con_gatti",
        ],
      },
      {
        title: "Consigliata da Baze",
        fields: ["compatibilita_con_animali_in_casa"],
      },
    ],
  },
  {
    title: "Giardinaggio",
    icon: HomeIcon,
    levelFields: [
      {
        field: "livello_giardinaggio",
        label: "Giardinaggio",
        domain: "lavoratori.livello_giardinaggio",
        type: "level",
      },
    ],
    choiceFields: [],
  },
  {
    title: "Generali",
    icon: HomeIcon,
    levelFields: [],
    choiceFields: [
      {
        field: "compatibilita_con_elevata_autonomia_richiesta",
        label: "Totale autonomia",
        domain: "lavoratori.compatibilita_con_elevata_autonomia_richiesta",
        type: "choice",
      },
      {
        field: "compatibilita_lavoro_con_datore_presente_in_casa",
        label: "Datore sempre presente",
        domain: "lavoratori.compatibilita_lavoro_con_datore_presente_in_casa",
        type: "choice",
      },
      {
        field: "compatibilita_famiglie_molto_esigenti",
        label: "Famiglie molto esigenti",
        domain: "lavoratori.compatibilita_famiglie_molto_esigenti",
        type: "choice",
      },
      {
        field: "compatibilita_con_contesti_pacati",
        label: "Contesti pacati",
        domain: "lavoratori.compatibilita_con_contesti_pacati",
        type: "choice",
      },
    ],
    choiceGroups: [
      {
        title: "Consigliata da Baze",
        fields: [
          "compatibilita_con_elevata_autonomia_richiesta",
          "compatibilita_lavoro_con_datore_presente_in_casa",
          "compatibilita_famiglie_molto_esigenti",
          "compatibilita_con_contesti_pacati",
        ],
      },
    ],
  },
]

const LANGUAGE_FIELDS: SkillFieldConfig[] = [
  {
    field: "livello_italiano",
    label: "Italiano",
    domain: "lavoratori.livello_italiano",
    type: "level",
  },
  {
    field: "livello_inglese",
    label: "Inglese",
    domain: "lavoratori.livello_inglese",
    type: "level",
  },
]

function getLevelMeta(value: string) {
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

function LevelReadOnlyValue({
  value,
  domain,
  lookupColorsByDomain,
}: {
  value: string
  domain: string
  lookupColorsByDomain: Map<string, string>
}) {
  if (!value) {
    return <span className="text-muted-foreground text-sm">-</span>
  }

  const levelMeta = getLevelMeta(value)

  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border/60 bg-white px-3 py-2.5">
      <Badge
        variant="outline"
        className={getTagClassName(resolveLookupColor(lookupColorsByDomain, domain, value))}
      >
        {value}
      </Badge>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
        {Array.from({ length: 3 }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 min-w-0 flex-1 rounded-full bg-muted-foreground/20",
              index < levelMeta.activeSegments && levelMeta.toneClassName
            )}
          />
        ))}
      </div>
    </div>
  )
}

function LevelSegmentedField({
  config,
  value,
  isEditing,
  isUpdating,
  lookupOptionsByDomain,
  lookupColorsByDomain,
  onChange,
}: {
  config: SkillFieldConfig
  value: string
  isEditing: boolean
  isUpdating: boolean
  lookupOptionsByDomain: Map<string, LookupOption[]>
  lookupColorsByDomain: Map<string, string>
  onChange: (value: string) => void
}) {
  const options = lookupOptionsByDomain.get(config.domain) ?? []

  return (
    <div className="flex items-center gap-3">
      <p className="text-muted-foreground shrink-0 text-xs font-medium tracking-wide">
        {config.label}
      </p>
      {isEditing ? (
        <Select
          value={value || "none"}
          onValueChange={(nextValue) => onChange(nextValue === "none" ? "" : nextValue)}
          disabled={isUpdating}
        >
          <SelectTrigger className="min-w-32 flex-1">
            <SelectValue placeholder="Seleziona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Non valutato</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="min-w-0 flex-1">
          <LevelReadOnlyValue
            value={value}
            domain={config.domain}
            lookupColorsByDomain={lookupColorsByDomain}
          />
        </div>
      )}
    </div>
  )
}

function buildChoiceRows(
  fields: SkillFieldConfig[],
  values: SkillCompetenzeValues,
  lookupOptionsByDomain: Map<string, LookupOption[]>
) {
  const rows: SkillsChoiceMatrixRow[] = []

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

function buildGroupedChoiceRows(
  fields: SkillFieldConfig[],
  groups: NonNullable<SkillSectionConfig["choiceGroups"]>,
  values: SkillCompetenzeValues,
  lookupOptionsByDomain: Map<string, LookupOption[]>
) {
  const fieldByKey = new Map(fields.map((field) => [field.field, field]))

  return groups
    .map((group) => {
      const rows: SkillsChoiceMatrixRow[] = group.fields
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

function SkillSection({
  section,
  values,
  isEditing,
  isUpdating,
  lookupOptionsByDomain,
  lookupColorsByDomain,
  onFieldChange,
}: {
  section: SkillSectionConfig
  values: SkillCompetenzeValues
  isEditing: boolean
  isUpdating: boolean
  lookupOptionsByDomain: Map<string, LookupOption[]>
  lookupColorsByDomain: Map<string, string>
  onFieldChange: (field: keyof SkillCompetenzeValues, value: string) => void
}) {
  const choiceRows = buildChoiceRows(section.choiceFields, values, lookupOptionsByDomain)
  const groupedChoiceRows = section.choiceGroups
    ? buildGroupedChoiceRows(
        section.choiceFields,
        section.choiceGroups,
        values,
        lookupOptionsByDomain
      )
    : null
  const SectionIcon = section.icon

  return (
    <DetailSectionCard
      title={section.title}
      titleIcon={<SectionIcon className="text-muted-foreground size-4" />}
      className="border-border/60 bg-background"
      contentClassName="space-y-4"
    >
      <FieldSet className="gap-4">
        {section.levelFields.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {section.levelFields.map((field) => (
              <LevelSegmentedField
                key={field.field}
                config={field}
                value={values[field.field]}
                isEditing={isEditing}
                isUpdating={isUpdating}
                lookupOptionsByDomain={lookupOptionsByDomain}
                lookupColorsByDomain={lookupColorsByDomain}
                onChange={(value) => onFieldChange(field.field, value)}
              />
            ))}
          </div>
        ) : null}

        {groupedChoiceRows ? (
          <div className="space-y-4">
            {groupedChoiceRows.map((group) => (
              <SkillsChoiceMatrix
                key={group.title}
                title={group.title}
                isEditing={isEditing}
                isUpdating={isUpdating}
                rows={group.rows}
                lookupColorsByDomain={lookupColorsByDomain}
                onFieldChange={(field, value) =>
                  onFieldChange(field as keyof SkillCompetenzeValues, value)
                }
              />
            ))}
          </div>
        ) : choiceRows.length > 0 ? (
          <SkillsChoiceMatrix
            isEditing={isEditing}
            isUpdating={isUpdating}
            rows={choiceRows}
            lookupColorsByDomain={lookupColorsByDomain}
            onFieldChange={(field, value) =>
              onFieldChange(field as keyof SkillCompetenzeValues, value)
            }
          />
        ) : null}
      </FieldSet>
    </DetailSectionCard>
  )
}

export function SkillsCompetenzeCard({
  isEditing,
  showEditAction = true,
  collapsible = true,
  defaultOpen = true,
  isUpdating,
  draft,
  selectedValues,
  lookupOptionsByDomain,
  lookupColorsByDomain,
  onToggleEdit,
  onFieldChange,
}: SkillsCompetenzeCardProps) {
  const values = isEditing ? draft : selectedValues

  return (
    <DetailSectionBlock
      title="Skill e Competenze"
      icon={<SparklesIcon className="text-muted-foreground size-4" />}
      action={showEditAction ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={isEditing ? "Termina modifica skill e competenze" : "Modifica skill e competenze"}
          title={isEditing ? "Termina modifica skill e competenze" : "Modifica skill e competenze"}
          onClick={onToggleEdit}
        >
          <PencilIcon />
        </Button>
      ) : undefined}
      showDefaultAction={showEditAction}
      collapsible={collapsible}
      defaultOpen={defaultOpen}
      contentClassName="space-y-5"
    >
      <div className="grid gap-5">
        {SKILL_SECTIONS.map((section) => (
          <SkillSection
            key={section.title}
            section={section}
            values={values}
            isEditing={isEditing}
            isUpdating={isUpdating}
            lookupOptionsByDomain={lookupOptionsByDomain}
            lookupColorsByDomain={lookupColorsByDomain}
            onFieldChange={onFieldChange}
          />
        ))}
      </div>

      <DetailSectionCard
        title="Lingue"
        titleIcon={<GlobeIcon className="text-muted-foreground size-4" />}
        className="border-border/60 bg-background"
        contentClassName="space-y-4"
      >
        <FieldSet className="gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            {LANGUAGE_FIELDS.map((field) => (
              <LevelSegmentedField
                key={field.field}
                config={field}
                value={values[field.field]}
                isEditing={isEditing}
                isUpdating={isUpdating}
                lookupOptionsByDomain={lookupOptionsByDomain}
                lookupColorsByDomain={lookupColorsByDomain}
                onChange={(value) => onFieldChange(field.field, value)}
              />
            ))}
          </div>
        </FieldSet>
      </DetailSectionCard>
    </DetailSectionBlock>
  )
}
