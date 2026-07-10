import {
  AlertCircleIcon,
  CalendarRangeIcon,
  CheckCircle2Icon,
  HelpCircleIcon,
  MessageSquareTextIcon,
  PhoneIcon,
  StarIcon,
} from "lucide-react"

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ExperienceCardTitle } from "@/components/ui/experience-card-title"
import { FieldDescription, FieldLabel } from "@/components/ui/field"
import { formatDateOnly } from "../lib/availability-utils"
import {
  getExperienceHeader,
  getExperienceReferenceStatus,
} from "../lib/experience-references"
import {
  getTagClassName,
  resolveLookupColor,
  type LookupOption,
} from "../lib/lookup-utils"
import type { EsperienzaLavoratoreRecord } from "../types/esperienza-lavoratore"
import type { ReferenzaLavoratoreRecord } from "../types/referenza-lavoratore"
import { AddReferenceAction, DeleteExperienceAction } from "./experience-references-actions"
import { EditableExperienceCard } from "./experience-references-edit"

function getReferenceStatusIcon(status: string) {
  switch (status) {
    case "Referenza verificata":
      return <CheckCircle2Icon className="size-3.5 text-emerald-600" />
    case "Referenza in attesa di verifica":
      return <AlertCircleIcon className="size-3.5 text-orange-500" />
    case "Referenza da richiedere":
      return <HelpCircleIcon className="size-3.5 text-yellow-500" />
    default:
      return null
  }
}

type ReadonlyReferenceCardProps = {
  reference: ReferenzaLavoratoreRecord
  lookupColorsByDomain: Map<string, string>
}

function ReadonlyReferenceCard({
  reference,
  lookupColorsByDomain,
}: ReadonlyReferenceCardProps) {
  const status = reference.referenza_verificata ?? ""
  const statusClassName = getTagClassName(
    resolveLookupColor(
      lookupColorsByDomain,
      "referenze_lavoratori.referenza_verificata",
      status,
    ),
  )
  const isVerified = status === "Referenza verificata"
  const referenceFullName =
    [reference.nome_datore, reference.cognome_datore]
      .filter(Boolean)
      .join(" ")
      .trim() || "-"
  const statusIcon = getReferenceStatusIcon(status)

  return (
    <Card className="shadow-none">
      <CardContent className="space-y-4 p-4">
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <ExperienceCardTitle role={referenceFullName} />
              <Badge variant="outline" className={statusClassName}>
                {statusIcon}
                {status || "-"}
              </Badge>
            </div>
            <div className="text-muted-foreground flex items-center gap-2 text-sm leading-6">
              <PhoneIcon className="size-3.5 shrink-0" />
              <span>{reference.telefono_datore || "-"}</span>
            </div>
          </div>

          {isVerified ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel>
                    <StarIcon className="size-3.5" />
                    Valutazione
                  </FieldLabel>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, index) => {
                      const active = (reference.valutazione ?? 0) > index
                      return (
                        <StarIcon
                          key={index}
                          className={
                            active
                              ? "fill-primary text-primary size-4"
                              : "text-muted-foreground/35 size-4"
                          }
                        />
                      )
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <FieldLabel>
                    <CheckCircle2Icon className="size-3.5" />
                    Disponibile a essere richiamata
                  </FieldLabel>
                  <FieldDescription className="text-foreground leading-6 whitespace-pre-wrap">
                    {(reference.referenza_verificata_da_baze ??
                    Boolean(reference.telefono_datore))
                      ? "Si"
                      : "No"}
                  </FieldDescription>
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel>
                  <MessageSquareTextIcon className="size-3.5" />
                  Feedback della referenza
                </FieldLabel>
                <FieldDescription className="text-foreground leading-7 whitespace-pre-wrap">
                  {reference.commento_esperienza || "-"}
                </FieldDescription>
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

type ReadonlyExperienceContentProps = {
  experience: EsperienzaLavoratoreRecord
  references: ReferenzaLavoratoreRecord[]
  referencesLoading: boolean
  showReferencesSection: boolean
  lookupColorsByDomain: Map<string, string>
  onReferenceCreate: (
    values: Partial<ReferenzaLavoratoreRecord>,
  ) => Promise<void> | void
}

function ReadonlyExperienceContent({
  experience,
  references,
  referencesLoading,
  showReferencesSection,
  lookupColorsByDomain,
  onReferenceCreate,
}: ReadonlyExperienceContentProps) {
  return (
    <Card className="bg-background gap-0 py-0 shadow-none">
      <CardContent className="space-y-4 px-0 pt-1 pb-2">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel>Descrizione Mansioni ed Esperienza</FieldLabel>
            <FieldDescription className="text-foreground leading-7 whitespace-pre-wrap">
              {experience.descrizione || "-"}
            </FieldDescription>
          </div>
          <div className="space-y-2">
            <FieldLabel>Descrizione Famiglia e Contesto</FieldLabel>
            <FieldDescription className="text-foreground leading-7 whitespace-pre-wrap">
              {experience.descrizione_contesto_lavorativo || "-"}
            </FieldDescription>
          </div>
        </div>

        {!experience.stato_esperienza_attiva ? (
          <div className="space-y-2">
            <FieldLabel>Motivazione fine rapporto</FieldLabel>
            <FieldDescription className="text-foreground leading-7 whitespace-pre-wrap">
              {experience.motivazione_fine_rapporto || "-"}
            </FieldDescription>
          </div>
        ) : null}

        {showReferencesSection ? (
          <div className="space-y-3">
            <FieldLabel>Referenze</FieldLabel>
            {referencesLoading ? (
              <FieldDescription>Caricamento referenze...</FieldDescription>
            ) : references.length === 0 ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-4">
                <FieldDescription>Nessuna referenza collegata.</FieldDescription>
                <AddReferenceAction
                  experience={experience}
                  disabled={false}
                  onReferenceCreate={onReferenceCreate}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {references.map((reference) => (
                  <ReadonlyReferenceCard
                    key={reference.id}
                    reference={reference}
                    lookupColorsByDomain={lookupColorsByDomain}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export type ExperienceReferencesAccordionItemProps = {
  experience: EsperienzaLavoratoreRecord
  references: ReferenzaLavoratoreRecord[]
  referencesLoading: boolean
  isEditing: boolean
  isUpdating: boolean
  showReferencesSection: boolean
  lookupColorsByDomain: Map<string, string>
  experienceTipoLavoroOptions: LookupOption[]
  experienceTipoRapportoOptions: LookupOption[]
  referenceStatusOptions: LookupOption[]
  onExperiencePatch: (
    experienceId: string,
    patch: Partial<EsperienzaLavoratoreRecord>,
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

export function ExperienceReferencesAccordionItem({
  experience,
  references,
  referencesLoading,
  isEditing,
  isUpdating,
  showReferencesSection,
  lookupColorsByDomain,
  experienceTipoLavoroOptions,
  experienceTipoRapportoOptions,
  referenceStatusOptions,
  onExperiencePatch,
  onExperienceDelete,
  onReferencePatch,
  onReferenceCreate,
}: ExperienceReferencesAccordionItemProps) {
  const dateLabel = experience.stato_esperienza_attiva
    ? `${formatDateOnly(experience.data_inizio) || "-"} - In corso`
    : `${formatDateOnly(experience.data_inizio) || "-"} - ${
        formatDateOnly(experience.data_fine) || "-"
      }`
  const referenceStatus = showReferencesSection
    ? getExperienceReferenceStatus(references)
    : null
  const referenceStatusIcon =
    showReferencesSection && referenceStatus
      ? getReferenceStatusIcon(referenceStatus)
      : null

  return (
    <AccordionItem
      value={experience.id}
      className="bg-background rounded-lg border px-4"
    >
      <AccordionTrigger className="py-4 hover:no-underline">
        <div className="flex w-full items-start justify-between gap-3 pr-2">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <ExperienceCardTitle role={getExperienceHeader(experience)} />
              {experience.stato_esperienza_attiva ? (
                <Badge
                  variant="outline"
                  className="border-emerald-200 bg-emerald-100 text-emerald-700"
                >
                  Attiva
                </Badge>
              ) : null}
              {referenceStatusIcon ? (
                <span title={referenceStatus ?? undefined}>
                  {referenceStatusIcon}
                </span>
              ) : null}
            </div>
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <CalendarRangeIcon className="text-muted-foreground size-4" />
              <span>{dateLabel}</span>
            </div>
          </div>
          {isEditing && onExperienceDelete ? (
            <DeleteExperienceAction
              disabled={isUpdating}
              onDelete={() => onExperienceDelete(experience.id)}
            />
          ) : null}
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-0 pb-0">
        {isEditing ? (
          <EditableExperienceCard
            experience={experience}
            references={references}
            referencesLoading={referencesLoading}
            disabled={isUpdating}
            experienceTipoLavoroOptions={experienceTipoLavoroOptions}
            experienceTipoRapportoOptions={experienceTipoRapportoOptions}
            referenceStatusOptions={referenceStatusOptions}
            onExperiencePatch={onExperiencePatch}
            onReferencePatch={onReferencePatch}
            onReferenceCreate={onReferenceCreate}
          />
        ) : (
          <ReadonlyExperienceContent
            experience={experience}
            references={references}
            referencesLoading={referencesLoading}
            showReferencesSection={showReferencesSection}
            lookupColorsByDomain={lookupColorsByDomain}
            onReferenceCreate={onReferenceCreate}
          />
        )}
      </AccordionContent>
    </AccordionItem>
  )
}
