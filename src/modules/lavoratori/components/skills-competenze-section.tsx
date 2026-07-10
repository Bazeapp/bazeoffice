import type { ComponentType } from "react"
import {
  BabyIcon,
  BrushCleaningIcon,
  GlobeIcon,
  HomeIcon,
  PawPrintIcon,
  ShirtIcon,
  UtensilsCrossedIcon,
} from "lucide-react"

import { DetailSectionCard } from "@/components/shared-next/detail-section-card"
import { FieldSet } from "@/components/ui/field"
import {
  buildChoiceRows,
  buildGroupedChoiceRows,
  type SkillsCompetenzeBindings,
  type SkillCompetenzeValues,
  type SkillSectionConfig,
  type SkillSectionIconKey,
} from "../lib/skills-competenze"
import { SkillsChoiceMatrix } from "./skills-choice-matrix"
import { SkillsCompetenzeLevelField } from "./skills-competenze-level-field"

const SECTION_ICONS: Record<
  SkillSectionIconKey,
  ComponentType<{ className?: string }>
> = {
  "brush-cleaning": BrushCleaningIcon,
  shirt: ShirtIcon,
  utensils: UtensilsCrossedIcon,
  baby: BabyIcon,
  "paw-print": PawPrintIcon,
  home: HomeIcon,
  globe: GlobeIcon,
}

type SkillsCompetenzeSectionProps = SkillsCompetenzeBindings & {
  section: SkillSectionConfig
  values: SkillCompetenzeValues
}

export function SkillsCompetenzeSection({
  section,
  values,
  isEditing,
  isUpdating,
  lookupOptionsByDomain,
  lookupColorsByDomain,
  onFieldChange,
}: SkillsCompetenzeSectionProps) {
  const choiceRows = buildChoiceRows(section.choiceFields, values, lookupOptionsByDomain)
  const groupedChoiceRows = section.choiceGroups
    ? buildGroupedChoiceRows(
        section.choiceFields,
        section.choiceGroups,
        values,
        lookupOptionsByDomain,
      )
    : null
  const SectionIcon = SECTION_ICONS[section.iconKey]

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
              <SkillsCompetenzeLevelField
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
