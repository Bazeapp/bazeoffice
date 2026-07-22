import { AddressSectionCard } from "./address-section-card"
import { AvailabilityCalendarCard } from "./availability-calendar-card"
import { DocumentsCard } from "./documents-card"
import { ExperienceReferencesCard } from "./experience-references-card"
import { JobSearchCard } from "./job-search-card"
import { SkillsCompetenzeCard } from "./skills-competenze-card"
import {
  type AvailabilityEditBandField,
  type AvailabilityEditDayField,
  formatAvailabilityComputedAt,
} from "../lib/availability-utils"
import { asString, getStripeAccountMissingRequirements, readArrayStrings } from "../lib/base-utils"
import type { LavoratoriCercaDetailCardsProps } from "./lavoratori-cerca-detail.types"

export function LavoratoriCercaDetailCards(props: LavoratoriCercaDetailCardsProps) {
  return (
    <>
      <ResidenzaSection {...props} />
      <CalendarioSection {...props} />
      <RicercaSection {...props} />
      <EsperienzeSection {...props} />
      <CompetenzeSection {...props} />
      <DocumentiSection {...props} />
    </>
  )
}

function ResidenzaSection({
  setWorkerSectionRef,
  isEditingAddress,
  updatingNonQualificato,
  addressDraft,
  provinciaLookupOptions,
  mobilityLookupOptions,
  selectedWorkerAddress,
  selectedWorkerRow,
  addressMobilityAnchor,
  setIsEditingAddress,
  setAddressDraft,
  patchWorkerAddressField,
  commitAddressField,
  patchSelectedWorkerField,
}: LavoratoriCercaDetailCardsProps) {
  return (
    <div ref={setWorkerSectionRef("residenza")}>
      <AddressSectionCard
        isEditing={isEditingAddress}
        isUpdating={updatingNonQualificato}
        addressDraft={addressDraft}
        provinciaOptions={provinciaLookupOptions}
        mobilityOptions={mobilityLookupOptions}
        selectedVia={asString(selectedWorkerAddress?.via) || null}
        selectedCivico={asString(selectedWorkerAddress?.civico) || null}
        selectedCap={asString(selectedWorkerAddress?.cap) || null}
        selectedCitta={asString(selectedWorkerAddress?.citta) || null}
        selectedProvincia={asString(selectedWorkerAddress?.provincia_sigla) || null}
        selectedMobility={readArrayStrings(selectedWorkerRow?.come_ti_sposti)}
        mobilityAnchor={addressMobilityAnchor}
        onToggleEdit={() => setIsEditingAddress((current) => !current)}
        onFieldChange={(field, value) => {
          setAddressDraft((current) => ({ ...current, [field]: value }))
          if (field === "provincia") {
            void patchWorkerAddressField("provincia", value || null)
          }
        }}
        onFieldCommit={(field, value) => {
          if (field !== "provincia") void commitAddressField(field, value)
        }}
        onMobilityChange={(values) => {
          setAddressDraft((current) => ({
            ...current,
            come_ti_sposti: values,
          }))
          void patchSelectedWorkerField(
            "come_ti_sposti",
            values.length > 0 ? values : null,
          )
        }}
      />
    </div>
  )
}

function CalendarioSection({
  setWorkerSectionRef,
  availabilityPayload,
  isEditingAvailability,
  updatingAvailability,
  availabilityEditDays,
  availabilityEditBands,
  availabilityHourLabels,
  availabilityReadOnlyRows,
  availabilityDraft,
  setIsEditingAvailability,
  onAvailabilityMatrixChange,
  setAvailabilityDraft,
  patchSelectedWorkerField,
  selectedWorkerId,
  onAvailabilitySave,
}: LavoratoriCercaDetailCardsProps) {
  return (
    <div ref={setWorkerSectionRef("calendario")}>
      <AvailabilityCalendarCard
        titleMeta={
          formatAvailabilityComputedAt(availabilityPayload?.computed_at) ?? "-"
        }
        isEditing={isEditingAvailability}
        isUpdating={updatingAvailability}
        editDays={availabilityEditDays.map(({ field, label }) => ({
          field,
          label,
        }))}
        editBands={availabilityEditBands.map(({ field, label }) => ({
          field,
          label,
        }))}
        hourLabels={availabilityHourLabels}
        readOnlyRows={availabilityReadOnlyRows}
        matrix={availabilityDraft.matrix}
        vincoliOrari={availabilityDraft.vincoli_orari_disponibilita}
        onToggleEdit={() => setIsEditingAvailability((current) => !current)}
        onMatrixChange={(dayField, bandField, checked) =>
          void onAvailabilityMatrixChange(
            dayField as AvailabilityEditDayField,
            bandField as AvailabilityEditBandField,
            checked,
          )
        }
        onVincoliChange={(value) =>
          setAvailabilityDraft((current) => ({
            ...current,
            vincoli_orari_disponibilita: value,
          }))
        }
        onVincoliSave={async (value) => {
          setAvailabilityDraft((current) => ({
            ...current,
            vincoli_orari_disponibilita: value,
          }))
          await patchSelectedWorkerField(
            "vincoli_orari_disponibilita",
            value.trim() || null,
          )
        }}
        vincoliIdentity={selectedWorkerId}
        onSave={() => void onAvailabilitySave()}
      />
    </div>
  )
}

function RicercaSection({
  setWorkerSectionRef,
  isEditingJobSearch,
  updatingJobSearch,
  jobSearchDraft,
  tipoLavoroDomesticoOptions,
  tipoRapportoLavorativoOptions,
  lavoriAccettabiliOptions,
  trasfertaOptions,
  multipliContrattiOptions,
  paga9Options,
  lookupColorsByDomain,
  selectedWorkerRow,
  setIsEditingJobSearch,
  setJobSearchDraft,
  patchJobSearchField,
}: LavoratoriCercaDetailCardsProps) {
  return (
    <div ref={setWorkerSectionRef("ricerca")}>
      <JobSearchCard
        isEditing={isEditingJobSearch}
        isUpdating={updatingJobSearch}
        draft={jobSearchDraft}
        tipoLavoroOptions={tipoLavoroDomesticoOptions}
        tipoRapportoOptions={tipoRapportoLavorativoOptions}
        lavoriAccettabiliOptions={lavoriAccettabiliOptions}
        trasfertaOptions={trasfertaOptions}
        multipliContrattiOptions={multipliContrattiOptions}
        paga9Options={paga9Options}
        lookupColorsByDomain={lookupColorsByDomain}
        selectedTipoLavoro={readArrayStrings(selectedWorkerRow?.tipo_lavoro_domestico)}
        selectedTipoRapporto={readArrayStrings(
          selectedWorkerRow?.tipo_rapporto_lavorativo,
        )}
        selectedLavoriAccettabili={readArrayStrings(
          selectedWorkerRow?.check_lavori_accettabili,
        )}
        selectedTrasferta={asString(
          selectedWorkerRow?.check_accetta_lavori_con_trasferta,
        )}
        selectedMultipliContratti={asString(
          selectedWorkerRow?.check_accetta_multipli_contratti,
        )}
        selectedPaga9={asString(selectedWorkerRow?.check_accetta_paga_9_euro_netti)}
        onToggleEdit={() => setIsEditingJobSearch((current) => !current)}
        onTipoLavoroChange={(values) => {
          setJobSearchDraft((current) => ({
            ...current,
            tipo_lavoro_domestico: values,
          }))
          void patchJobSearchField(
            "tipo_lavoro_domestico",
            values.length > 0 ? values : null,
          )
        }}
        onTipoRapportoChange={(values) => {
          setJobSearchDraft((current) => ({
            ...current,
            tipo_rapporto_lavorativo: values,
          }))
          void patchJobSearchField(
            "tipo_rapporto_lavorativo",
            values.length > 0 ? values : null,
          )
        }}
        onLavoriAccettabiliChange={(values) => {
          setJobSearchDraft((current) => ({
            ...current,
            check_lavori_accettabili: values,
          }))
          void patchJobSearchField(
            "check_lavori_accettabili",
            values.length > 0 ? values : null,
          )
        }}
        onTrasfertaChange={(value) => {
          setJobSearchDraft((current) => ({
            ...current,
            check_accetta_lavori_con_trasferta: value,
          }))
          void patchJobSearchField("check_accetta_lavori_con_trasferta", value || null)
        }}
        onMultipliContrattiChange={(value) => {
          setJobSearchDraft((current) => ({
            ...current,
            check_accetta_multipli_contratti: value,
          }))
          void patchJobSearchField("check_accetta_multipli_contratti", value || null)
        }}
        onPaga9Change={(value) => {
          setJobSearchDraft((current) => ({
            ...current,
            check_accetta_paga_9_euro_netti: value,
          }))
          void patchJobSearchField("check_accetta_paga_9_euro_netti", value || null)
        }}
      />
    </div>
  )
}

function EsperienzeSection({
  setWorkerSectionRef,
  selectedWorkerId,
  isEditingExperience,
  updatingExperience,
  experienceDraft,
  selectedWorkerExperiences,
  loadingSelectedWorkerExperiences,
  riassuntoProfiloField,
  generatingWorkerSummary,
  onGenerateWorkerSummary,
  selectedWorkerReferences,
  loadingSelectedWorkerReferences,
  lookupColorsByDomain,
  experienceTipoLavoroOptions,
  experienceTipoRapportoOptions,
  referenceStatusOptions,
  anniEsperienzaColfValue,
  anniEsperienzaBadanteValue,
  anniEsperienzaBabysitterValue,
  situazioneLavorativaAttualeValue,
  setIsEditingExperience,
  anniColfField,
  anniBadanteField,
  anniBabysitterField,
  situazioneField,
  patchExperienceRecord,
  createExperienceRecord,
  deleteExperienceRecord,
  patchReferenceRecord,
  createReferenceRecord,
}: LavoratoriCercaDetailCardsProps) {
  return (
    <div ref={setWorkerSectionRef("esperienze")}>
      <ExperienceReferencesCard
        workerId={selectedWorkerId}
        isEditing={isEditingExperience}
        showCreateExperienceAction={isEditingExperience}
        isUpdating={updatingExperience}
        draft={experienceDraft}
        experiences={selectedWorkerExperiences}
        experiencesLoading={loadingSelectedWorkerExperiences}
        aiSummaryValue={riassuntoProfiloField.value}
        onAiSummaryChange={riassuntoProfiloField.onChange}
        isGeneratingAiSummary={generatingWorkerSummary}
        onGenerateAiSummary={onGenerateWorkerSummary}
        references={selectedWorkerReferences}
        referencesLoading={loadingSelectedWorkerReferences}
        lookupColorsByDomain={lookupColorsByDomain}
        experienceTipoLavoroOptions={experienceTipoLavoroOptions}
        experienceTipoRapportoOptions={experienceTipoRapportoOptions}
        referenceStatusOptions={referenceStatusOptions}
        selectedAnniEsperienzaColf={anniEsperienzaColfValue}
        selectedAnniEsperienzaBadante={anniEsperienzaBadanteValue}
        selectedAnniEsperienzaBabysitter={anniEsperienzaBabysitterValue}
        selectedSituazioneLavorativaAttuale={situazioneLavorativaAttualeValue}
        onToggleEdit={() => setIsEditingExperience((current) => !current)}
        onAnniEsperienzaColfChange={anniColfField.onChange}
        onAnniEsperienzaBadanteChange={anniBadanteField.onChange}
        onAnniEsperienzaBabysitterChange={anniBabysitterField.onChange}
        onSituazioneLavorativaAttualeChange={situazioneField.onChange}
        onExperiencePatch={(experienceId, patch) =>
          void patchExperienceRecord(experienceId, patch)
        }
        onExperienceCreate={(values) => void createExperienceRecord(values)}
        onExperienceDelete={(experienceId) => void deleteExperienceRecord(experienceId)}
        onReferencePatch={(referenceId, patch) =>
          void patchReferenceRecord(referenceId, patch)
        }
        onReferenceCreate={(values) => void createReferenceRecord(values)}
      />
    </div>
  )
}

function CompetenzeSection({
  setWorkerSectionRef,
  isEditingSkills,
  updatingSkills,
  skillsDraft,
  selectedSkillCompetenzeValues,
  lookupOptionsByDomain,
  lookupColorsByDomain,
  setIsEditingSkills,
  setSkillsDraft,
  patchSkillsField,
}: LavoratoriCercaDetailCardsProps) {
  return (
    <div ref={setWorkerSectionRef("competenze")}>
      <SkillsCompetenzeCard
        isEditing={isEditingSkills}
        isUpdating={updatingSkills}
        draft={skillsDraft}
        selectedValues={selectedSkillCompetenzeValues}
        lookupOptionsByDomain={lookupOptionsByDomain}
        lookupColorsByDomain={lookupColorsByDomain}
        onToggleEdit={() => setIsEditingSkills((current) => !current)}
        onFieldChange={(field, value) => {
          setSkillsDraft((current) => ({
            ...current,
            [field]: value,
          }))
          void patchSkillsField(field, value)
        }}
      />
    </div>
  )
}

function DocumentiSection({
  setWorkerSectionRef,
  selectedWorkerId,
  isEditingDocuments,
  updatingDocuments,
  documentsDraft,
  selectedWorkerRow,
  naspiLCVValue,
  selectedWorkerDocuments,
  loadingSelectedWorkerDocuments,
  documentiVerificatiOptions,
  documentiInRegolaOptions,
  lookupColorsByDomain,
  resolvedIban,
  selectedWorkerAddress,
  ibanLCVValue,
  stripeAccountLCVValue,
  setIsEditingDocuments,
  setDocumentsDraft,
  patchDocumentField,
  naspiField,
  ibanField,
  stripeAccountField,
  generateStripeAccount,
  upsertSelectedWorkerDocument,
  setError,
}: LavoratoriCercaDetailCardsProps) {
  return (
    <div ref={setWorkerSectionRef("documenti")}>
      <DocumentsCard
        workerId={selectedWorkerId}
        isEditing={isEditingDocuments}
        isUpdating={updatingDocuments}
        draft={documentsDraft}
        selectedValues={{
          stato_verifica_documenti: asString(selectedWorkerRow?.stato_verifica_documenti),
          documenti_in_regola: asString(selectedWorkerRow?.documenti_in_regola),
          data_scadenza_naspi: naspiLCVValue,
        }}
        documents={selectedWorkerDocuments}
        documentsLoading={loadingSelectedWorkerDocuments}
        verificationOptions={documentiVerificatiOptions}
        statoDocumentiOptions={documentiInRegolaOptions}
        lookupColorsByDomain={lookupColorsByDomain}
        administrativeValues={{
          iban: resolvedIban,
          id_stripe_account: asString(selectedWorkerRow?.id_stripe_account),
          missingStripeRequirements: getStripeAccountMissingRequirements({
            worker: selectedWorkerRow,
            address: selectedWorkerAddress,
            iban: ibanLCVValue,
          }),
        }}
        ibanInputValue={ibanLCVValue}
        stripeAccountInputValue={stripeAccountLCVValue}
        onToggleEdit={() => setIsEditingDocuments((current) => !current)}
        onVerificationChange={(value) => {
          setDocumentsDraft((current) => ({
            ...current,
            stato_verifica_documenti: value,
          }))
          void patchDocumentField("stato_verifica_documenti", value || null)
        }}
        onStatoDocumentiChange={(value) => {
          setDocumentsDraft((current) => ({
            ...current,
            documenti_in_regola: value,
          }))
          void patchDocumentField("documenti_in_regola", value || null)
        }}
        onNaspiChange={naspiField.onChange}
        onIbanChange={ibanField.onChange}
        onStripeAccountChange={stripeAccountField.onChange}
        onGenerateStripeAccount={generateStripeAccount}
        onDocumentUpsert={upsertSelectedWorkerDocument}
        onUploadError={setError}
      />
    </div>
  )
}
