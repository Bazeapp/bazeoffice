import * as React from "react"

import { DocumentsCard } from "@/modules/lavoratori/components/documents-card"
import { SkillsCompetenzeCard } from "@/modules/lavoratori/components/skills-competenze-card"
import { asString, readArrayStrings } from "@/modules/lavoratori/lib"

import { buildSkillCompetenzeValues } from "../lib/worker-pipeline-summary.utils"
import type { WorkerPipelineSummaryCardsProps } from "../types/worker-pipeline-summary"
import { WorkerPipelineSummaryAvailabilityCard } from "./worker-pipeline-summary-card-availability"
import { WorkerPipelineSummaryExperienceCard } from "./worker-pipeline-summary-card-experience"
import { WorkerPipelineSummaryPreferencesCard } from "./worker-pipeline-summary-card-preferences"
import {
  RelatedActiveSearchCard,
  WorkerPipelineSummaryRelatedSearchesCard,
} from "./worker-pipeline-summary-card-related-searches"
import { WorkerPipelineSummaryTravelTimeCard } from "./worker-pipeline-summary-card-travel-time"

export type {
  RelatedActiveSearchItem,
  RelatedSearchGroups,
  WorkerPipelineSummaryCardsProps,
} from "../types/worker-pipeline-summary"

export { RelatedActiveSearchCard }

export function WorkerPipelineSummaryCards({
  workerRow,
  selectionRow,
  relatedActiveSearches,
  relatedActiveSearchesLoading = false,
  onOpenRelatedSearch,
  onPatchWorkerField,
  onPatchWorkerAddress,
  onPatchProcessField,
  workerVia,
  workerCivico,
  workerCap,
  workerCitta,
  workerProvincia,
  workerCitofono,
  processWeeklyHours,
  familyAddress,
  familyCap,
  familyProvince,
  familyStreet,
  familyCivicNumber,
  familyCity,
  familyIntercom,
  familyAddressNote,
  familyAvailabilityJson,
  familyWorkSchedule,
  familyWeeklyFrequency,
  provinceOptions = [],
  updatingProcessAddress = false,
  availabilityTitleMeta,
  availabilityReadOnlyRows,
  lookupOptionsByDomain,
  lookupColorsByDomain,
  experienceTipoLavoroOptions,
  experienceTipoRapportoOptions,
  tipoLavoroOptions,
  tipoRapportoOptions,
  referenceStatusOptions,
  experiences,
  experiencesLoading = false,
  isGeneratingAiSummary = false,
  onGenerateAiSummary,
  references,
  referencesLoading = false,
  documents,
  documentsLoading = false,
  isEditingAvailability,
  onToggleAvailabilityEdit,
  updatingAvailability,
  isEditingJobSearch,
  onToggleJobSearchEdit,
  updatingJobSearch,
  jobSearchDraft,
  funzionamentoBazeOptions,
  trasfertaOptions,
  multipliContrattiOptions,
  paga9Options,
  onJobSearchDraftChange,
  onJobSearchFieldPatch,
  lavoriAccettabili,
  lavoriAccettabiliOptions,
  availabilityMatrix,
  availabilityVincoli,
  onLavoriAccettabiliChange,
  onAvailabilityMatrixChange,
  onAvailabilityVincoliChange,
  onAvailabilitySave,
  isEditingExperience,
  onToggleExperienceEdit,
  updatingExperience,
  onExperienceFieldSave,
  onExperiencePatch,
  onExperienceCreate,
  onExperienceDelete,
  onReferencePatch,
  onReferenceCreate,
  isEditingSkills,
  onToggleSkillsEdit,
  updatingSkills,
  skillsDraft,
  onSkillsDraftChange,
  onSkillsFieldPatch,
  isEditingDocuments,
  onToggleDocumentsEdit,
  updatingDocuments,
  documentsDraft,
  resolvedIban,
  documentiVerificatiOptions,
  documentiInRegolaOptions,
  onDocumentVerificationChange,
  onDocumentStatusChange,
  naspiInputValue,
  ibanInputValue,
  stripeAccountInputValue,
  onDocumentNaspiChange,
  onDocumentIbanChange,
  onDocumentStripeAccountChange,
  onDocumentUpsert,
  onDocumentUploadError,
}: WorkerPipelineSummaryCardsProps) {
  const selectedSkillCompetenzeValues = React.useMemo(
    () => buildSkillCompetenzeValues(workerRow),
    [workerRow],
  )

  return (
    <React.Fragment>
      <WorkerPipelineSummaryTravelTimeCard
        workerRow={workerRow}
        selectionRow={selectionRow}
        onPatchWorkerField={onPatchWorkerField}
        onPatchWorkerAddress={onPatchWorkerAddress}
        onPatchProcessField={onPatchProcessField}
        workerVia={workerVia}
        workerCivico={workerCivico}
        workerCap={workerCap}
        workerCitta={workerCitta}
        workerProvincia={workerProvincia}
        workerCitofono={workerCitofono}
        familyAddress={familyAddress}
        familyCap={familyCap}
        familyProvince={familyProvince}
        familyStreet={familyStreet}
        familyCivicNumber={familyCivicNumber}
        familyCity={familyCity}
        familyIntercom={familyIntercom}
        familyAddressNote={familyAddressNote}
        provinceOptions={provinceOptions}
        mobilityOptions={
          lookupOptionsByDomain.get("lavoratori.come_ti_sposti") ?? []
        }
        updatingProcessAddress={updatingProcessAddress}
      />
      <WorkerPipelineSummaryExperienceCard
        workerRow={workerRow}
        lookupColorsByDomain={lookupColorsByDomain}
        experienceTipoLavoroOptions={experienceTipoLavoroOptions}
        experienceTipoRapportoOptions={experienceTipoRapportoOptions}
        tipoLavoroOptions={tipoLavoroOptions}
        referenceStatusOptions={referenceStatusOptions}
        experiences={experiences}
        experiencesLoading={experiencesLoading}
        isGeneratingAiSummary={isGeneratingAiSummary}
        onGenerateAiSummary={onGenerateAiSummary}
        references={references}
        referencesLoading={referencesLoading}
        isEditing={isEditingExperience}
        onToggleEdit={onToggleExperienceEdit}
        isUpdating={updatingExperience}
        jobSearchDraft={{
          tipo_lavoro_domestico: jobSearchDraft.tipo_lavoro_domestico,
        }}
        onJobSearchDraftChange={onJobSearchDraftChange}
        onJobSearchFieldPatch={onJobSearchFieldPatch}
        onFieldSave={onExperienceFieldSave}
        onExperiencePatch={onExperiencePatch}
        onExperienceCreate={onExperienceCreate}
        onExperienceDelete={onExperienceDelete}
        onReferencePatch={onReferencePatch}
        onReferenceCreate={onReferenceCreate}
      />
      <WorkerPipelineSummaryRelatedSearchesCard
        groups={relatedActiveSearches}
        loading={relatedActiveSearchesLoading}
        onOpenSearch={onOpenRelatedSearch}
      />
      <WorkerPipelineSummaryAvailabilityCard
        availabilityTitleMeta={availabilityTitleMeta}
        familyAvailabilityJson={familyAvailabilityJson}
        familyWorkSchedule={familyWorkSchedule}
        familyWeeklyFrequency={familyWeeklyFrequency}
        processWeeklyHours={processWeeklyHours}
        tipoRapportoOptions={tipoRapportoOptions}
        tipoRapportoValues={
          isEditingAvailability
            ? jobSearchDraft.tipo_rapporto_lavorativo
            : readArrayStrings(workerRow.tipo_rapporto_lavorativo)
        }
        onTipoRapportoChange={(values) => {
          onJobSearchDraftChange({ tipo_rapporto_lavorativo: values })
          void onJobSearchFieldPatch(
            "tipo_rapporto_lavorativo",
            values.length > 0 ? values : null,
          )
        }}
        isEditing={isEditingAvailability}
        onToggleEdit={onToggleAvailabilityEdit}
        isUpdating={updatingAvailability}
        lookupColorsByDomain={lookupColorsByDomain}
        lavoriAccettabili={lavoriAccettabili}
        lavoriAccettabiliOptions={lavoriAccettabiliOptions}
        matrix={availabilityMatrix}
        readOnlyRows={availabilityReadOnlyRows}
        vincoliOrari={availabilityVincoli}
        onLavoriAccettabiliChange={onLavoriAccettabiliChange}
        onMatrixChange={onAvailabilityMatrixChange}
        onVincoliChange={onAvailabilityVincoliChange}
        onSave={onAvailabilitySave}
      />
      <WorkerPipelineSummaryPreferencesCard
        workerRow={workerRow}
        isEditing={isEditingJobSearch}
        onToggleEdit={onToggleJobSearchEdit}
        isUpdating={updatingJobSearch}
        draft={jobSearchDraft}
        lookupColorsByDomain={lookupColorsByDomain}
        funzionamentoBazeOptions={funzionamentoBazeOptions}
        trasfertaOptions={trasfertaOptions}
        multipliContrattiOptions={multipliContrattiOptions}
        paga9Options={paga9Options}
        onDraftChange={onJobSearchDraftChange}
        onFieldPatch={onJobSearchFieldPatch}
      />
      <SkillsCompetenzeCard
        isEditing={isEditingSkills}
        isUpdating={updatingSkills}
        collapsible
        draft={skillsDraft}
        selectedValues={selectedSkillCompetenzeValues}
        lookupOptionsByDomain={lookupOptionsByDomain}
        lookupColorsByDomain={lookupColorsByDomain}
        onToggleEdit={onToggleSkillsEdit}
        onFieldChange={(field, value) => {
          onSkillsDraftChange({ [field]: value })
          void onSkillsFieldPatch(field, value)
        }}
      />
      <DocumentsCard
        workerId={asString(workerRow.id) || null}
        isEditing={isEditingDocuments}
        isUpdating={updatingDocuments}
        draft={documentsDraft}
        selectedValues={{
          stato_verifica_documenti: asString(workerRow.stato_verifica_documenti),
          documenti_in_regola: asString(workerRow.documenti_in_regola),
          data_scadenza_naspi: asString(workerRow.data_scadenza_naspi),
        }}
        documents={documents}
        documentsLoading={documentsLoading}
        verificationOptions={documentiVerificatiOptions}
        statoDocumentiOptions={documentiInRegolaOptions}
        lookupColorsByDomain={lookupColorsByDomain}
        administrativeValues={{
          iban: resolvedIban,
          id_stripe_account: asString(workerRow.id_stripe_account),
        }}
        naspiInputValue={naspiInputValue}
        ibanInputValue={ibanInputValue}
        stripeAccountInputValue={stripeAccountInputValue}
        onToggleEdit={onToggleDocumentsEdit}
        onVerificationChange={onDocumentVerificationChange}
        onStatoDocumentiChange={onDocumentStatusChange}
        onNaspiChange={onDocumentNaspiChange}
        onIbanChange={onDocumentIbanChange}
        onStripeAccountChange={onDocumentStripeAccountChange}
        onDocumentUpsert={onDocumentUpsert}
        onUploadError={onDocumentUploadError}
        collapsible
        defaultOpen={false}
      />
    </React.Fragment>
  )
}
