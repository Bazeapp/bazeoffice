import {
  CheckCircle2Icon,
  MessageSquareTextIcon,
  PhoneIcon,
  StarIcon,
  UserIcon,
} from "lucide-react"

import { FieldInput, FieldTextarea } from "@/components/forms/field-components"
import { Card, CardContent } from "@/components/ui/card"
import { FieldDescription, FieldLabel } from "@/components/ui/field"
import { Form } from "@/components/ui/form"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import {
  mapExperienceFormPatch,
  mapReferenceFormPatch,
} from "../lib/experience-references"
import type { LookupOption } from "@/lib/lookup-utils"
import type { EsperienzaLavoratoreRecord } from "../types/esperienza-lavoratore"
import type { ReferenzaLavoratoreRecord } from "../types/referenza-lavoratore"
import { AddReferenceAction } from "./experience-references-actions"
import {
  ExperienceReferencesFormBody,
  FieldDisponibileCheckbox,
  FieldReferenceStatusSelect,
  FieldStarRating,
} from "./experience-references-forms"

type EditableReferenceCardProps = {
  reference: ReferenzaLavoratoreRecord
  referenceStatusOptions: LookupOption[]
  disabled: boolean
  onPatch: (
    referenceId: string,
    patch: Partial<ReferenzaLavoratoreRecord>,
  ) => Promise<void> | void
}

export function EditableReferenceCard({
  reference,
  referenceStatusOptions,
  disabled,
  onPatch,
}: EditableReferenceCardProps) {
  const form = useAutoSaveForm({
    defaults: {
      referenza_verificata: reference.referenza_verificata ?? "",
      nome_datore: reference.nome_datore ?? "",
      cognome_datore: reference.cognome_datore ?? "",
      telefono_datore: reference.telefono_datore ?? "",
      valutazione: reference.valutazione ?? 0,
      commento_esperienza: reference.commento_esperienza ?? "",
      referenza_verificata_da_baze:
        reference.referenza_verificata_da_baze ?? false,
    },
    onSave: async (patch) => {
      await onPatch(reference.id, mapReferenceFormPatch(patch))
    },
  })

  const isVerified =
    form.watch("referenza_verificata") === "Referenza verificata"

  return (
    <Form {...form}>
      <Card className="gap-0 py-0 shadow-none">
        <CardContent className="space-y-4 p-4 pt-3 pb-3">
          <div className="space-y-2">
            <FieldLabel>Stato verifica referenza</FieldLabel>
            <div className="max-w-sm">
              <FieldReferenceStatusSelect
                name="referenza_verificata"
                options={referenceStatusOptions}
                disabled={disabled}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <FieldLabel>
                <UserIcon className="size-3.5" />
                Nome referenza
              </FieldLabel>
              <FieldInput name="nome_datore" disabled={disabled} className="h-9 text-sm" />
            </div>
            <div className="space-y-2">
              <FieldLabel>
                <UserIcon className="size-3.5" />
                Cognome referenza
              </FieldLabel>
              <FieldInput name="cognome_datore" disabled={disabled} className="h-9 text-sm" />
            </div>
            <div className="space-y-2">
              <FieldLabel>
                <PhoneIcon className="size-3.5" />
                Numero referenza
              </FieldLabel>
              <FieldInput name="telefono_datore" disabled={disabled} className="h-9 text-sm" />
            </div>
          </div>

          {isVerified ? (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <FieldLabel>
                  <StarIcon className="size-3.5" />
                  Valutazione
                </FieldLabel>
                <FieldStarRating name="valutazione" disabled={disabled} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <FieldLabel>
                  <CheckCircle2Icon className="size-3.5" />
                  Disponibile a essere chiamata
                </FieldLabel>
                <FieldDisponibileCheckbox
                  name="referenza_verificata_da_baze"
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2 md:col-span-3">
                <FieldLabel>
                  <MessageSquareTextIcon className="size-3.5" />
                  Feedback della referenza
                </FieldLabel>
                <FieldTextarea
                  name="commento_esperienza"
                  className="min-h-24 w-full text-sm"
                />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Form>
  )
}

type EditableExperienceCardProps = {
  experience: EsperienzaLavoratoreRecord
  references: ReferenzaLavoratoreRecord[]
  referencesLoading: boolean
  disabled: boolean
  experienceTipoLavoroOptions: LookupOption[]
  experienceTipoRapportoOptions: LookupOption[]
  referenceStatusOptions: LookupOption[]
  onExperiencePatch: (
    experienceId: string,
    patch: Partial<EsperienzaLavoratoreRecord>,
  ) => Promise<void> | void
  onReferencePatch: (
    referenceId: string,
    patch: Partial<ReferenzaLavoratoreRecord>,
  ) => Promise<void> | void
  onReferenceCreate: (
    values: Partial<ReferenzaLavoratoreRecord>,
  ) => Promise<void> | void
}

export function EditableExperienceCard({
  experience,
  references,
  referencesLoading,
  disabled,
  experienceTipoLavoroOptions,
  experienceTipoRapportoOptions,
  referenceStatusOptions,
  onExperiencePatch,
  onReferencePatch,
  onReferenceCreate,
}: EditableExperienceCardProps) {
  const form = useAutoSaveForm({
    defaults: {
      tipo_lavoro: experience.tipo_lavoro ?? [],
      tipo_rapporto: experience.tipo_rapporto ?? "",
      data_inizio: experience.data_inizio ?? "",
      data_fine: experience.data_fine ?? "",
      stato_esperienza_attiva: experience.stato_esperienza_attiva ?? false,
      descrizione: experience.descrizione ?? "",
      descrizione_contesto_lavorativo:
        experience.descrizione_contesto_lavorativo ?? "",
      motivazione_fine_rapporto: experience.motivazione_fine_rapporto ?? "",
    },
    onSave: async (patch) => {
      await onExperiencePatch(experience.id, mapExperienceFormPatch(patch))
    },
  })

  return (
    <Form {...form}>
      <Card className="bg-background gap-0 py-0 shadow-none">
        <CardContent className="space-y-4 px-0 pt-1 pb-2">
          <ExperienceReferencesFormBody
            disabled={disabled}
            experienceTipoLavoroOptions={experienceTipoLavoroOptions}
            experienceTipoRapportoOptions={experienceTipoRapportoOptions}
          />

          <div className="space-y-3">
            <FieldLabel>Referenze</FieldLabel>
            {referencesLoading ? (
              <FieldDescription>Caricamento referenze...</FieldDescription>
            ) : references.length === 0 ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-4">
                <FieldDescription>Nessuna referenza collegata.</FieldDescription>
                <AddReferenceAction
                  experience={experience}
                  disabled={disabled}
                  onReferenceCreate={onReferenceCreate}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {references.map((reference) => (
                  <EditableReferenceCard
                    key={reference.id}
                    reference={reference}
                    referenceStatusOptions={referenceStatusOptions}
                    disabled={disabled}
                    onPatch={onReferencePatch}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Form>
  )
}
