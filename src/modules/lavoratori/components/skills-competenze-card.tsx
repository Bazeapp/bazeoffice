import { PencilIcon, SparklesIcon } from "lucide-react"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Button } from "@/components/ui/button"
import type { LookupOption } from "../lib/lookup-utils"
import type { SkillCompetenzeValues } from "../lib/skills-competenze"
import { LANGUAGE_SECTION, SKILL_SECTIONS } from "./skills-competenze-config"
import { SkillsCompetenzeSection } from "./skills-competenze-section"

export type SkillsCompetenzeCardProps = {
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
  const bindings = {
    isEditing,
    isUpdating,
    lookupOptionsByDomain,
    lookupColorsByDomain,
    onFieldChange,
  }

  return (
    <DetailSectionBlock
      title="Skill e Competenze"
      icon={<SparklesIcon className="text-muted-foreground size-4" />}
      action={
        showEditAction ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={
              isEditing ? "Termina modifica skill e competenze" : "Modifica skill e competenze"
            }
            title={
              isEditing ? "Termina modifica skill e competenze" : "Modifica skill e competenze"
            }
            onClick={onToggleEdit}
          >
            <PencilIcon />
          </Button>
        ) : undefined
      }
      showDefaultAction={showEditAction}
      collapsible={collapsible}
      defaultOpen={defaultOpen}
      contentClassName="space-y-5"
    >
      <div className="grid gap-5">
        {SKILL_SECTIONS.map((section) => (
          <SkillsCompetenzeSection
            key={section.title}
            section={section}
            values={values}
            {...bindings}
          />
        ))}
      </div>

      <SkillsCompetenzeSection
        section={LANGUAGE_SECTION}
        values={values}
        {...bindings}
      />
    </DetailSectionBlock>
  )
}
