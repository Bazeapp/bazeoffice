import { useController } from "react-hook-form"

import { ExperienceReferencesCard } from "@/modules/lavoratori/components/experience-references-card"
import { WorkerShiftPreferencesFields } from "@/modules/lavoratori/components/worker-shift-preferences-fields"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import { asInputValue, asString, readArrayStrings } from "@/modules/lavoratori/lib"

import type {
  ExperienceSummaryDraft,
  WorkerPipelineSummaryExperienceCardProps,
} from "../types/worker-pipeline-summary"

export function WorkerPipelineSummaryExperienceCard({
  workerRow,
  lookupColorsByDomain,
  experienceTipoLavoroOptions,
  experienceTipoRapportoOptions,
  tipoLavoroOptions,
  referenceStatusOptions,
  experiences,
  experiencesLoading = false,
  isGeneratingAiSummary = false,
  onGenerateAiSummary,
  references,
  referencesLoading = false,
  isEditing,
  onToggleEdit,
  isUpdating,
  jobSearchDraft,
  onJobSearchDraftChange,
  onJobSearchFieldPatch,
  onFieldSave,
  onExperiencePatch,
  onExperienceCreate,
  onExperienceDelete,
  onReferencePatch,
  onReferenceCreate,
}: WorkerPipelineSummaryExperienceCardProps) {
  // FASE 5 BIS — i campi esperienza alimentano ExperienceReferencesCard
  // (presentazionale, value/onChange). Agganciati al form via useController:
  // field.onChange emette un vero "change" -> autosave (a differenza di setValue).
  const experienceForm = useAutoSaveForm<ExperienceSummaryDraft>({
    defaults: {
      anni_esperienza_colf: asInputValue(workerRow.anni_esperienza_colf),
      anni_esperienza_badante: asInputValue(workerRow.anni_esperienza_badante),
      anni_esperienza_babysitter: asInputValue(
        workerRow.anni_esperienza_babysitter,
      ),
      situazione_lavorativa_attuale: asString(
        workerRow.situazione_lavorativa_attuale,
      ),
      riassunto_profilo_breve: asString(workerRow.riassunto_profilo_breve),
    },
    onSave: async (patch) => {
      for (const [key, rawValue] of Object.entries(patch)) {
        onFieldSave(key, typeof rawValue === "string" ? rawValue : "")
      }
    },
  })
  const colfCtrl = useController({
    name: "anni_esperienza_colf",
    control: experienceForm.control,
  })
  const badanteCtrl = useController({
    name: "anni_esperienza_badante",
    control: experienceForm.control,
  })
  const babysitterCtrl = useController({
    name: "anni_esperienza_babysitter",
    control: experienceForm.control,
  })
  const situazioneCtrl = useController({
    name: "situazione_lavorativa_attuale",
    control: experienceForm.control,
  })
  const riassuntoProfiloCtrl = useController({
    name: "riassunto_profilo_breve",
    control: experienceForm.control,
  })
  const colfValue = colfCtrl.field.value
  const badanteValue = badanteCtrl.field.value
  const babysitterValue = babysitterCtrl.field.value
  const situazioneValue = situazioneCtrl.field.value

  return (
    <ExperienceReferencesCard
      workerId={workerRow.id}
      title="Esperienza"
      isEditing={isEditing}
      showEditAction
      showCreateExperienceAction={isEditing}
      collapsible
      isUpdating={isUpdating}
      experiences={experiences}
      experiencesLoading={experiencesLoading}
      aiSummaryValue={riassuntoProfiloCtrl.field.value}
      onAiSummaryChange={riassuntoProfiloCtrl.field.onChange}
      isGeneratingAiSummary={isGeneratingAiSummary}
      onGenerateAiSummary={onGenerateAiSummary}
      references={references}
      referencesLoading={referencesLoading}
      lookupColorsByDomain={lookupColorsByDomain}
      experienceTipoLavoroOptions={experienceTipoLavoroOptions}
      experienceTipoRapportoOptions={experienceTipoRapportoOptions}
      referenceStatusOptions={referenceStatusOptions}
      selectedAnniEsperienzaColf={colfValue}
      selectedAnniEsperienzaBadante={badanteValue}
      selectedAnniEsperienzaBabysitter={babysitterValue}
      selectedSituazioneLavorativaAttuale={situazioneValue}
      onToggleEdit={onToggleEdit}
      onAnniEsperienzaColfChange={colfCtrl.field.onChange}
      onAnniEsperienzaBadanteChange={badanteCtrl.field.onChange}
      onAnniEsperienzaBabysitterChange={babysitterCtrl.field.onChange}
      onSituazioneLavorativaAttualeChange={situazioneCtrl.field.onChange}
      onExperiencePatch={onExperiencePatch}
      onExperienceCreate={onExperienceCreate}
      onExperienceDelete={onExperienceDelete}
      onReferencePatch={onReferencePatch}
      onReferenceCreate={onReferenceCreate}
    >
      <WorkerShiftPreferencesFields
        fields={[
          {
            id: "ricerca-tipo-lavoro-domestico",
            label: "Tipo di lavoro",
            domain: "lavoratori.tipo_lavoro_domestico",
            value: isEditing
              ? jobSearchDraft.tipo_lavoro_domestico
              : readArrayStrings(workerRow.tipo_lavoro_domestico),
            options: tipoLavoroOptions,
            placeholder: "Seleziona tipo lavoro",
            onChange: (values) => {
              onJobSearchDraftChange({ tipo_lavoro_domestico: values })
              void onJobSearchFieldPatch(
                "tipo_lavoro_domestico",
                values.length > 0 ? values : null,
              )
            },
          },
        ]}
        isEditing={isEditing}
        isUpdating={isUpdating}
        lookupColorsByDomain={lookupColorsByDomain}
      />
    </ExperienceReferencesCard>
  )
}
