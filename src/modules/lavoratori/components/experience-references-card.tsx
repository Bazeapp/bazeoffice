import * as React from "react"
import { BotIcon, FileTextIcon, PencilIcon } from "lucide-react"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Accordion } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  groupReferencesByExperienceId,
  sortExperiences,
  type ExperienceDraft,
  type LookupOption,
} from "../lib/experience-references"
import type { EsperienzaLavoratoreRecord } from "../types/esperienza-lavoratore"
import type { ReferenzaLavoratoreRecord } from "../types/referenza-lavoratore"
import { AddExperienceAction } from "./experience-references-actions"
import { ExperienceReferencesAccordionItem } from "./experience-references-read"

function ExperienceYearsField({
  label,
  years,
}: {
  label: string
  years: string
}) {
  const numericYears = Number(years)
  const hasYears = years !== "" && Number.isFinite(numericYears)
  return (
    <div className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <p
        className={cn(
          "text-sm font-semibold leading-none",
          hasYears ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {hasYears ? `${numericYears} ${numericYears === 1 ? "anno" : "anni"}` : "-"}
      </p>
    </div>
  )
}

export type ExperienceReferencesCardProps = {
  workerId?: string | null
  isEditing: boolean
  showEditAction?: boolean
  showCreateExperienceAction?: boolean
  collapsible?: boolean
  defaultOpen?: boolean
  title?: string
  showSummaryFields?: boolean
  showSituationField?: boolean
  showReferencesSection?: boolean
  aiSummaryValue?: string
  isGeneratingAiSummary?: boolean
  onGenerateAiSummary?: () => Promise<void> | void
  onAiSummaryChange?: (value: string) => void
  children?: React.ReactNode
  isUpdating: boolean
  draft?: ExperienceDraft
  experiences: EsperienzaLavoratoreRecord[]
  experiencesLoading: boolean
  references: ReferenzaLavoratoreRecord[]
  referencesLoading: boolean
  lookupColorsByDomain: Map<string, string>
  experienceTipoLavoroOptions: LookupOption[]
  experienceTipoRapportoOptions: LookupOption[]
  referenceStatusOptions: LookupOption[]
  selectedAnniEsperienzaColf: string
  selectedAnniEsperienzaBadante: string
  selectedAnniEsperienzaBabysitter: string
  selectedSituazioneLavorativaAttuale: string
  onToggleEdit: () => void
  onAnniEsperienzaColfChange: (value: string) => void
  onAnniEsperienzaBadanteChange: (value: string) => void
  onAnniEsperienzaBabysitterChange: (value: string) => void
  onSituazioneLavorativaAttualeChange: (value: string) => void
  onExperiencePatch: (
    experienceId: string,
    patch: Partial<EsperienzaLavoratoreRecord>,
  ) => Promise<void> | void
  onExperienceCreate?: (
    values: Partial<EsperienzaLavoratoreRecord>,
  ) => Promise<void> | void
  onExperienceDelete?: (experienceId: string) => Promise<void> | void
  onReferencePatch: (
    referenceId: string,
    patch: Partial<ReferenzaLavoratoreRecord>,
  ) => Promise<void> | void
  onReferenceCreate: (
    values: Partial<ReferenzaLavoratoreRecord>,
  ) => Promise<void> | void
}

export function ExperienceReferencesCard({
  workerId = null,
  isEditing,
  showEditAction = true,
  showCreateExperienceAction = false,
  collapsible = true,
  defaultOpen = true,
  title = "Esperienze e Referenze",
  showSummaryFields = true,
  showSituationField = true,
  showReferencesSection = true,
  aiSummaryValue,
  isGeneratingAiSummary = false,
  onGenerateAiSummary,
  onAiSummaryChange,
  children,
  isUpdating,
  experiences,
  experiencesLoading,
  references,
  referencesLoading,
  lookupColorsByDomain,
  experienceTipoLavoroOptions,
  experienceTipoRapportoOptions,
  referenceStatusOptions,
  selectedAnniEsperienzaColf,
  selectedAnniEsperienzaBadante,
  selectedAnniEsperienzaBabysitter,
  selectedSituazioneLavorativaAttuale,
  onToggleEdit,
  onAnniEsperienzaColfChange,
  onAnniEsperienzaBadanteChange,
  onAnniEsperienzaBabysitterChange,
  onSituazioneLavorativaAttualeChange,
  onExperiencePatch,
  onExperienceCreate,
  onExperienceDelete,
  onReferencePatch,
  onReferenceCreate,
}: ExperienceReferencesCardProps) {
  const referencesByExperienceId = React.useMemo(
    () => groupReferencesByExperienceId(references),
    [references],
  )

  const sortedExperiences = React.useMemo(
    () => sortExperiences(experiences),
    [experiences],
  )

  return (
    <DetailSectionBlock
      title={title}
      icon={<FileTextIcon className="text-muted-foreground size-4" />}
      action={
        showEditAction ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={
              isEditing ? "Termina modifica esperienze" : "Modifica esperienze"
            }
            title={
              isEditing ? "Termina modifica esperienze" : "Modifica esperienze"
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
      contentClassName="space-y-4"
    >
      {children}

      {onGenerateAiSummary ? (
        <div className="space-y-2 rounded-lg border bg-muted/15 p-3">
          <div className="flex items-center justify-between gap-3">
            <FieldLabel>Riassunto esperienze AI</FieldLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void onGenerateAiSummary()}
              disabled={isUpdating || isGeneratingAiSummary}
            >
              <BotIcon className="size-4" />
              {aiSummaryValue ? "Rigenera" : "Genera"}
            </Button>
          </div>
          <Textarea
            value={aiSummaryValue || ""}
            onChange={(event) => onAiSummaryChange?.(event.target.value)}
            readOnly={!onAiSummaryChange || isGeneratingAiSummary}
            placeholder="Nessun riassunto generato. Genera con AI o scrivi manualmente."
            className="min-h-24 w-full resize-y bg-background text-sm"
          />
        </div>
      ) : null}

      {showSummaryFields ? (
        isEditing ? (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <FieldLabel>Anni esp. Colf</FieldLabel>
              <Input
                type="number"
                min="0"
                step="1"
                value={selectedAnniEsperienzaColf}
                onChange={(event) =>
                  onAnniEsperienzaColfChange(event.target.value)
                }
                disabled={isUpdating}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <FieldLabel>Anni esp. Badante</FieldLabel>
              <Input
                type="number"
                min="0"
                step="1"
                value={selectedAnniEsperienzaBadante}
                onChange={(event) =>
                  onAnniEsperienzaBadanteChange(event.target.value)
                }
                disabled={isUpdating}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1">
              <FieldLabel>Anni esp. Babysitter</FieldLabel>
              <Input
                type="number"
                min="0"
                step="1"
                value={selectedAnniEsperienzaBabysitter}
                onChange={(event) =>
                  onAnniEsperienzaBabysitterChange(event.target.value)
                }
                disabled={isUpdating}
                className="h-9 text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <ExperienceYearsField
              label="Anni esp. Colf"
              years={selectedAnniEsperienzaColf}
            />
            <ExperienceYearsField
              label="Anni esp. Badante"
              years={selectedAnniEsperienzaBadante}
            />
            <ExperienceYearsField
              label="Anni esp. Babysitter"
              years={selectedAnniEsperienzaBabysitter}
            />
          </div>
        )
      ) : null}

      {showSituationField ? (
        <div className="space-y-2">
          <FieldLabel>Situazione lavorativa attuale</FieldLabel>
          {isEditing ? (
            <Textarea
              value={selectedSituazioneLavorativaAttuale}
              onChange={(event) =>
                onSituazioneLavorativaAttualeChange(event.target.value)
              }
              disabled={isUpdating}
              className="min-h-24 w-full text-sm"
            />
          ) : (
            <FieldDescription className="text-foreground leading-7 whitespace-pre-wrap">
              {selectedSituazioneLavorativaAttuale || "-"}
            </FieldDescription>
          )}
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <FieldLabel>Esperienze di lavoro</FieldLabel>
          {showCreateExperienceAction && isEditing && onExperienceCreate ? (
            <AddExperienceAction
              workerId={workerId}
              disabled={isUpdating}
              experienceTipoLavoroOptions={experienceTipoLavoroOptions}
              experienceTipoRapportoOptions={experienceTipoRapportoOptions}
              onExperienceCreate={onExperienceCreate}
            />
          ) : null}
        </div>
        {experiencesLoading ? (
          <FieldDescription>Caricamento esperienze...</FieldDescription>
        ) : experiences.length === 0 ? (
          <FieldDescription>Nessuna esperienza collegata.</FieldDescription>
        ) : (
          <Accordion type="multiple" className="space-y-3" defaultValue={[]}>
            {sortedExperiences.map((experience) => (
              <ExperienceReferencesAccordionItem
                key={experience.id}
                experience={experience}
                references={referencesByExperienceId.get(experience.id) ?? []}
                referencesLoading={referencesLoading}
                isEditing={isEditing}
                isUpdating={isUpdating}
                showReferencesSection={showReferencesSection}
                lookupColorsByDomain={lookupColorsByDomain}
                experienceTipoLavoroOptions={experienceTipoLavoroOptions}
                experienceTipoRapportoOptions={experienceTipoRapportoOptions}
                referenceStatusOptions={referenceStatusOptions}
                onExperiencePatch={onExperiencePatch}
                onExperienceDelete={onExperienceDelete}
                onReferencePatch={onReferencePatch}
                onReferenceCreate={onReferenceCreate}
              />
            ))}
          </Accordion>
        )}
      </div>
    </DetailSectionBlock>
  )
}
