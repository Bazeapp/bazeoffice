import * as React from "react";

import { AddressSectionCard } from "../address-section-card";
import { AvailabilityCalendarCard } from "../availability-calendar-card";
import { AvailabilityStatusCard } from "../availability-status-card";
import { DocumentsCard } from "../documents-card";
import { WorkerDetailShell } from "../worker-detail-shell";
import { Form } from "@/components/ui/form";
import {
  formatAvailabilityComputedAt,
  type AvailabilityEditBandField,
  type AvailabilityEditDayField,
} from "../../lib/availability-utils";
import {
  asString,
  getStripeAccountMissingRequirements,
  readArrayStrings,
} from "../../lib/base-utils";
import { includesBabysitterType } from "../../lib/gate1-utils";
import { useGate1LookupOptions } from "../../hooks/use-gate1-lookup-options";
import { useGate1SectionNav } from "../../hooks/use-gate1-section-nav";
import { useGate1WorkerPhotos } from "../../hooks/use-gate1-worker-photos";
import { GateContactsCard } from "./gate-contacts-card";
import {
  GateCertificationReferenteCard,
  GateReferenteCard,
} from "./gate-referente-cards";
import { GatePresentationCard } from "./gate-presentation-card";
import { GateAssessmentCard } from "./gate-assessment-card";
import {
  GateAdministrativeFieldsCard,
  GateDocumentIdentityCard,
  GateSelfCertificationCard,
} from "./gate-verification-cards";
import {
  GateBazeChecksCard,
  GateShiftPreferencesCard,
  GateSpecificChecksCard,
} from "./gate-checks-cards";
import { GateWorkTypesCard } from "./gate-work-types-card";
import { GateSkillConfirmationsCard } from "./gate-skill-confirmations-card";
import { GateStepSection } from "./gate-field-primitives";
import { RecruiterFeedbackButton } from "../recruiter-feedback-sheet";
import { useGate1ViewContext } from "./gate1-view-context";

export function Gate1DetailPanel() {
  const {
    addressEditMode,
    addressMobilityAnchor,
    addressStep,
    allowCertifiedStatus,
    applyUpdatedWorkerRow,
    assessmentStep,
    aspettiStep,
    availabilityDraft,
    availabilityEditMode,
    availabilityPayload,
    availabilityReadOnlyRows,
    AVAILABILITY_EDIT_BANDS,
    AVAILABILITY_EDIT_DAYS,
    AVAILABILITY_HOUR_LABELS,
    bazeChecksEditMode,
    bazeChecksStep,
    createExperienceRecord,
    createReferenceRecord,
    disponibilitaBadgeClassName,
    disponibilitaStep,
    documentSectionAfterSpecificChecks,
    documentiStep,
    documentsDraft,
    experienceDraft,
    gateAddressIsEditing,
    gateAvailabilityCalendarIsEditing,
    gateAvailabilityStatusIsEditing,
    gateBazeChecksIsEditing,
    gateDocumentsIsEditing,
    gateFieldsForm,
    gatePresentationIsEditing,
    gateShiftPreferencesIsEditing,
    gateSpecificChecksIsEditing,
    gateWorkTypesIsEditing,
    generateStripeAccount,
    getGateSectionOrderClass,
    handleAvailabilityMatrixChange,
    ibanValue,
    jobSearchDraft,
    loadingSelectedWorkerDocuments,
    loadingSelectedWorkerExperiences,
    loadingSelectedWorkerReferences,
    lookupColorsByDomain,
    lookupOptionsByDomain,
    nonIdoneoReasonValues,
    operatorName,
    patchExperienceRecord,
    patchReferenceRecord,
    patchSelectedWorkerField,
    photoEditMode,
    presentationEditMode,
    presentationPhotoSlots,
    presentationStep,
    referenteIdoneitaOptions,
    referenteIdoneitaOptionsLoading,
    saveWorkerAvailability,
    selectedPresentationPhotoIndex,
    selectedWorker,
    selectedWorkerAddress,
    selectedWorkerDocuments,
    selectedWorkerExperiences,
    selectedWorkerId,
    selectedWorkerReferences,
    selectedWorkerRow,
    selectedWorkerIsNonIdoneo,
    selectedWorkerIsNonQualificato,
    selectedWorkerNonQualificatoIssues,
    setError,
    setIsEditingAddress,
    setIsEditingAvailabilityStep,
    setIsEditingBazeChecks,
    setIsEditingDocuments,
    setIsEditingExperience,
    setIsEditingHeader,
    setIsEditingSkills,
    setSelectedPresentationPhotoIndex,
    showAdministrativeFields,
    showAssessment,
    showCertificationReferente,
    showDocumentSection,
    showFollowup,
    showReferencesInWorkTypes,
    showStepper,
    specificChecksEditMode,
    specificChecksMode,
    splitBazeChecksStep,
    stepInfoBySection,
    tipologiaStep,
    updatingAvailability,
    updatingAvailabilityStatus,
    updatingDocuments,
    updatingExperience,
    updatingNonQualificato,
    updatingSkills,
    upsertSelectedWorkerDocument,
    useGate1ReorderedSteps,
    workTypesEditMode,
  } = useGate1ViewContext();

  const lookupOptions = useGate1LookupOptions({
    lookupOptionsByDomain,
    allowCertifiedStatus,
  });
  const {
    babysittingMultipliBambiniOptions,
    babysittingNeonatiOptions,
    caseConCaniGrandiOptions,
    caseConCaniOptions,
    caseConGattiOptions,
    compatibilitaAnimaliOptions,
    compatibilitaAutonomiaOptions,
    compatibilitaCaseGrandiOptions,
    compatibilitaContestiPacatiOptions,
    compatibilitaCucinaOptions,
    compatibilitaDatorePresenteOptions,
    compatibilitaFamiglieMoltoEsigentiOptions,
    compatibilitaFamiglieNumeroseOptions,
    compatibilitaNeonatiOptions,
    compatibilitaStiroOptions,
    disponibilitaLookupOptions,
    disponibilitaNelGiornoOptions,
    documentiInRegolaOptions,
    documentiVerificatiOptions,
    experienceTipoLavoroOptions,
    experienceTipoRapportoOptions,
    followupStatusOptions,
    funzionamentoBazeOptions,
    getMotivazioneLabel,
    haiReferenzeOptions,
    lavoriAccettabiliOptions,
    livelloBabysittingOptions,
    livelloCucinaOptions,
    livelloDogsittingOptions,
    livelloGiardinaggioOptions,
    livelloIngleseOptions,
    livelloItalianoOptions,
    livelloPulizieOptions,
    livelloStiroOptions,
    mobilityLookupOptions,
    motivazioniNonIdoneoOptions,
    multipliContrattiOptions,
    nazionalitaLookupOptions,
    paga9Options,
    provinciaLookupOptions,
    ratingCorporaturaOptions,
    referenceStatusOptions,
    scaleSoffittiOptions,
    sessoLookupOptions,
    statoLavoratoreOptions,
    tipoLavoroDomesticoOptions,
    tipoRapportoLavorativoOptions,
    trasfertaOptions,
  } = lookupOptions;

  const {
    activeGateSection,
    detailScrollRef,
    gateTabs,
    registerGateSectionRef,
    scrollToSection,
  } = useGate1SectionNav({
    showCertificationReferente,
    showFollowup,
    showDocumentSection,
    documentSectionAfterSpecificChecks,
    showAssessment,
    specificChecksMode,
    useGate1ReorderedSteps,
    selectedWorkerId,
  });

  const {
    handlePrimaryWorkerPhotoChange,
    handleWorkerPhotoInputChange,
    openWorkerPhotoPicker,
    uploadingWorkerPhoto,
    workerPhotoInputRef,
  } = useGate1WorkerPhotos({
    selectedWorkerId,
    selectedWorkerRow,
    applyUpdatedWorkerRow,
    setError,
    setSelectedPresentationPhotoIndex,
  });

  const selectedWorkerStatusAlert = React.useMemo(() => {
    if (!selectedWorkerRow) return null;

    if (selectedWorkerIsNonIdoneo) {
      const fallbackReasons = readArrayStrings(
        selectedWorkerRow.motivazione_non_idoneo,
      );
      const reasonValues =
        nonIdoneoReasonValues.length > 0
          ? nonIdoneoReasonValues
          : fallbackReasons;
      const reasonLabel = reasonValues
        .map(getMotivazioneLabel)
        .filter((value) => value.trim().length > 0)
        .join(" • ");

      return {
        statusLabel: "Non idoneo",
        reasonLabel: reasonLabel || "Nessuna motivazione indicata",
        tone: "critical" as const,
      };
    }

    if (selectedWorkerIsNonQualificato) {
      const reasonLabel = selectedWorkerNonQualificatoIssues
        .map((issue) => issue.title)
        .filter((value) => value.trim().length > 0)
        .join(" • ");

      return {
        statusLabel: "Non qualificato",
        reasonLabel: reasonLabel || "Nessuna motivazione indicata",
        tone: "muted" as const,
      };
    }

    return null;
  }, [
    getMotivazioneLabel,
    nonIdoneoReasonValues,
    selectedWorkerIsNonIdoneo,
    selectedWorkerIsNonQualificato,
    selectedWorkerNonQualificatoIssues,
    selectedWorkerRow,
  ]);

  if (!selectedWorkerId) return null;

  return (
    <>
      <input
        ref={workerPhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleWorkerPhotoInputChange}
      />
      <WorkerDetailShell
        key={selectedWorkerId ?? "__empty__"}
        sectionRef={detailScrollRef}
        tabs={gateTabs}
        activeSection={activeGateSection}
        onSectionChange={scrollToSection}
      >
        <Form {...gateFieldsForm}>
            {selectedWorker && selectedWorkerRow ? (
              <div
                className={
                  useGate1ReorderedSteps ? "flex flex-col gap-6" : "space-y-6"
                }
              >
                {showCertificationReferente ? (
                  <div
                    className={getGateSectionOrderClass(1)}
                    ref={registerGateSectionRef("referente")}
                  >
                    <GateStepSection
                      step={1}
                      isFirst
                      showStepper={showStepper}
                      info={stepInfoBySection.referente}
                    >
                      <GateCertificationReferenteCard
                        options={referenteIdoneitaOptions}
                        disabled={referenteIdoneitaOptionsLoading}
                      />
                    </GateStepSection>
                  </div>
                ) : null}

                {showFollowup ? (
                  <div
                    className={getGateSectionOrderClass(1)}
                    ref={registerGateSectionRef("contatti")}
                  >
                    <GateStepSection
                      step={1}
                      isFirst={!showCertificationReferente}
                      showStepper={showStepper}
                      info={stepInfoBySection.contatti}
                    >
                      <GateReferenteCard
                        options={referenteIdoneitaOptions}
                        disabled={referenteIdoneitaOptionsLoading}
                      />
                      <GateContactsCard options={followupStatusOptions} />
                    </GateStepSection>
                  </div>
                ) : null}

                <div
                  className={getGateSectionOrderClass(presentationStep)}
                  ref={registerGateSectionRef("presentazione")}
                >
                  <GateStepSection
                    step={presentationStep}
                    isFirst={!showFollowup && !showCertificationReferente}
                    showStepper={
                      showStepper && !(useGate1ReorderedSteps && showFollowup)
                    }
                    reserveStepperSpace={useGate1ReorderedSteps && showFollowup}
                    info={stepInfoBySection.presentazione}
                  >
                    <GatePresentationCard
                      worker={selectedWorker}
                      workerRow={selectedWorkerRow}
                      statusAlert={selectedWorkerStatusAlert}
                      sessoOptions={sessoLookupOptions}
                      nazionalitaOptions={nazionalitaLookupOptions}
                      livelloItalianoOptions={livelloItalianoOptions}
                      lookupColorsByDomain={lookupColorsByDomain}
                      presentationPhotoSlots={presentationPhotoSlots}
                      selectedPresentationPhotoIndex={
                        selectedPresentationPhotoIndex
                      }
                      isEditing={gatePresentationIsEditing}
                      showEditAction={presentationEditMode === "toggle"}
                      showUploadPhotoAction={photoEditMode === "editable"}
                      uploadingPhoto={uploadingWorkerPhoto}
                      onToggleEdit={() =>
                        setIsEditingHeader((current) => !current)
                      }
                      onUploadPhoto={openWorkerPhotoPicker}
                      onSelectedPresentationPhotoIndexChange={
                        handlePrimaryWorkerPhotoChange
                      }
                    />

                  </GateStepSection>
                </div>

                <div
                  className={getGateSectionOrderClass(addressStep)}
                  ref={registerGateSectionRef("indirizzo")}
                >
                  <GateStepSection
                    step={addressStep}
                    showStepper={showStepper}
                    info={stepInfoBySection.indirizzo}
                  >
                    <AddressSectionCard
                      isEditing={gateAddressIsEditing}
                      isUpdating={updatingNonQualificato}
                      showEditAction={addressEditMode === "toggle"}
                      showMobility={false}
                      provinciaOptions={provinciaLookupOptions}
                      mobilityOptions={mobilityLookupOptions}
                      selectedVia={asString(selectedWorkerAddress?.via) || null}
                      selectedCivico={asString(selectedWorkerAddress?.civico) || null}
                      selectedCap={asString(selectedWorkerAddress?.cap) || null}
                      selectedCitta={asString(selectedWorkerAddress?.citta) || null}
                      selectedProvincia={asString(selectedWorkerAddress?.provincia_sigla) || null}
                      mobilityAnchor={addressMobilityAnchor}
                      addressPersistMode="parent-form"
                      onToggleEdit={() =>
                        setIsEditingAddress((current) => !current)
                      }
                    />
                  </GateStepSection>
                </div>

                {showDocumentSection && !documentSectionAfterSpecificChecks ? (
                  <div
                    className={getGateSectionOrderClass(documentiStep ?? 0)}
                    ref={registerGateSectionRef("documenti")}
                  >
                    <GateStepSection
                      step={documentiStep ?? 0}
                      showStepper={showStepper}
                      info={stepInfoBySection.documenti}
                    >
                      <GateSelfCertificationCard
                        documentiOptions={documentiInRegolaOptions}
                        referenzeOptions={haiReferenzeOptions}
                      />
                    </GateStepSection>
                  </div>
                ) : null}

                <div
                  className={getGateSectionOrderClass(tipologiaStep)}
                  ref={registerGateSectionRef("tipologia")}
                >
                  <GateStepSection
                    step={tipologiaStep}
                    showStepper={showStepper}
                    info={stepInfoBySection.tipologia}
                  >
                    <GateWorkTypesCard
                      workerId={selectedWorkerId}
                      referenzeOptions={haiReferenzeOptions}
                      allowedWorkOptions={tipoLavoroDomesticoOptions}
                      isEditing={gateWorkTypesIsEditing}
                      showReferencesField={showReferencesInWorkTypes}
                      showEditAction={workTypesEditMode === "toggle"}
                      onToggleEdit={() =>
                        setIsEditingExperience((current) => !current)
                      }
                      experienceDraft={experienceDraft}
                      experiences={selectedWorkerExperiences}
                      experiencesLoading={loadingSelectedWorkerExperiences}
                      references={selectedWorkerReferences}
                      referencesLoading={loadingSelectedWorkerReferences}
                      lookupColorsByDomain={lookupColorsByDomain}
                      experienceTipoLavoroOptions={experienceTipoLavoroOptions}
                      experienceTipoRapportoOptions={
                        experienceTipoRapportoOptions
                      }
                      referenceStatusOptions={referenceStatusOptions}
                      isUpdatingExperience={updatingExperience}
                      onExperiencePatch={(experienceId, patch) =>
                        void patchExperienceRecord(experienceId, patch)
                      }
                      onExperienceCreate={(values) =>
                        void createExperienceRecord(values)
                      }
                      onReferencePatch={(referenceId, patch) =>
                        void patchReferenceRecord(referenceId, patch)
                      }
                      onReferenceCreate={(values) =>
                        void createReferenceRecord(values)
                      }
                    />
                  </GateStepSection>
                </div>

                <div
                  className={
                    useGate1ReorderedSteps && splitBazeChecksStep
                      ? "contents"
                      : getGateSectionOrderClass(disponibilitaStep)
                  }
                  ref={registerGateSectionRef(
                    "disponibilita",
                    !useGate1ReorderedSteps || !splitBazeChecksStep,
                  )}
                >
                  {splitBazeChecksStep ? (
                    <>
                      <div
                        className={getGateSectionOrderClass(disponibilitaStep)}
                        ref={registerGateSectionRef(
                          "disponibilita",
                          useGate1ReorderedSteps,
                        )}
                      >
                        <GateStepSection
                          step={disponibilitaStep}
                          showStepper={showStepper}
                          info={stepInfoBySection.disponibilita}
                        >
                          <AvailabilityStatusCard
                            isEditing={gateAvailabilityStatusIsEditing}
                            showEditAction={availabilityEditMode === "toggle"}
                            isUpdating={updatingAvailabilityStatus}
                            disponibilitaOptions={disponibilitaLookupOptions}
                            selectedDisponibilitaBadgeClassName={
                              disponibilitaBadgeClassName
                            }
                            onToggleEdit={() =>
                              setIsEditingAvailabilityStep((current) => !current)
                            }
                          />
                          <GateShiftPreferencesCard
                            isEditing={gateShiftPreferencesIsEditing}
                            showEditAction={availabilityEditMode === "toggle"}
                            onToggleEdit={() =>
                              setIsEditingAvailabilityStep((current) => !current)
                            }
                            lookupColorsByDomain={lookupColorsByDomain}
                            tipoRapportoOptions={tipoRapportoLavorativoOptions}
                            lavoriAccettabiliOptions={lavoriAccettabiliOptions}
                            disponibilitaNelGiornoOptions={
                              disponibilitaNelGiornoOptions
                            }
                          />
                          <AvailabilityCalendarCard
                            titleMeta={
                              formatAvailabilityComputedAt(
                                availabilityPayload?.computed_at,
                              ) ?? "-"
                            }
                            isEditing={gateAvailabilityCalendarIsEditing}
                            showEditAction={availabilityEditMode === "toggle"}
                            isUpdating={updatingAvailability}
                            editDays={AVAILABILITY_EDIT_DAYS.map(
                              ({ field, label }) => ({ field, label }),
                            )}
                            editBands={AVAILABILITY_EDIT_BANDS.map(
                              ({ field, label }) => ({ field, label }),
                            )}
                            hourLabels={AVAILABILITY_HOUR_LABELS}
                            readOnlyRows={availabilityReadOnlyRows}
                            matrix={availabilityDraft.matrix}
                            vincoliPersistMode="parent-form"
                            onToggleEdit={() =>
                              setIsEditingAvailabilityStep((current) => !current)
                            }
                            onMatrixChange={(dayField, bandField, checked) =>
                              void handleAvailabilityMatrixChange(
                                dayField as AvailabilityEditDayField,
                                bandField as AvailabilityEditBandField,
                                checked,
                              )
                            }
                            onSave={() => void saveWorkerAvailability()}
                          />
                        </GateStepSection>
                      </div>

                      <div
                        className={
                          useGate1ReorderedSteps
                            ? getGateSectionOrderClass(bazeChecksStep ?? 0)
                            : "pt-6"
                        }
                        ref={registerGateSectionRef(
                          "check_baze",
                          useGate1ReorderedSteps,
                        )}
                      >
                        <GateStepSection
                          step={bazeChecksStep ?? 0}
                          showStepper={showStepper}
                          info={stepInfoBySection.check_baze}
                        >
                          <GateBazeChecksCard
                            isEditing={gateBazeChecksIsEditing}
                            showEditAction={bazeChecksEditMode === "toggle"}
                            onToggleEdit={() =>
                              setIsEditingBazeChecks((current) => !current)
                            }
                            funzionamentoBazeOptions={funzionamentoBazeOptions}
                            paga9Options={paga9Options}
                            multipliContrattiOptions={multipliContrattiOptions}
                            lookupColorsByDomain={lookupColorsByDomain}
                          />
                        </GateStepSection>
                      </div>
                    </>
                  ) : (
                    <GateStepSection
                      step={disponibilitaStep}
                      showStepper={showStepper}
                      info={stepInfoBySection.disponibilita}
                    >
                      <GateBazeChecksCard
                        isEditing={gateBazeChecksIsEditing}
                        showEditAction={bazeChecksEditMode === "toggle"}
                        onToggleEdit={() =>
                          setIsEditingBazeChecks((current) => !current)
                        }
                        funzionamentoBazeOptions={funzionamentoBazeOptions}
                        paga9Options={paga9Options}
                        multipliContrattiOptions={multipliContrattiOptions}
                        lookupColorsByDomain={lookupColorsByDomain}
                      />
                      <GateShiftPreferencesCard
                        isEditing={gateShiftPreferencesIsEditing}
                        showEditAction={availabilityEditMode === "toggle"}
                        onToggleEdit={() =>
                          setIsEditingAvailabilityStep((current) => !current)
                        }
                        lookupColorsByDomain={lookupColorsByDomain}
                        tipoRapportoOptions={tipoRapportoLavorativoOptions}
                        lavoriAccettabiliOptions={lavoriAccettabiliOptions}
                        disponibilitaNelGiornoOptions={
                          disponibilitaNelGiornoOptions
                        }
                      />
                      <AvailabilityStatusCard
                        isEditing={gateAvailabilityStatusIsEditing}
                        showEditAction={availabilityEditMode === "toggle"}
                        isUpdating={updatingAvailabilityStatus}
                        disponibilitaOptions={disponibilitaLookupOptions}
                        selectedDisponibilitaBadgeClassName={
                          disponibilitaBadgeClassName
                        }
                        onToggleEdit={() =>
                          setIsEditingAvailabilityStep((current) => !current)
                        }
                      />
                      <AvailabilityCalendarCard
                        titleMeta={
                          formatAvailabilityComputedAt(
                            availabilityPayload?.computed_at,
                          ) ?? "-"
                        }
                        isEditing={gateAvailabilityCalendarIsEditing}
                        showEditAction={availabilityEditMode === "toggle"}
                        isUpdating={updatingAvailability}
                        editDays={AVAILABILITY_EDIT_DAYS.map(
                          ({ field, label }) => ({ field, label }),
                        )}
                        editBands={AVAILABILITY_EDIT_BANDS.map(
                          ({ field, label }) => ({ field, label }),
                        )}
                        hourLabels={AVAILABILITY_HOUR_LABELS}
                        readOnlyRows={availabilityReadOnlyRows}
                        matrix={availabilityDraft.matrix}
                        vincoliPersistMode="parent-form"
                        onToggleEdit={() =>
                          setIsEditingAvailabilityStep((current) => !current)
                        }
                        onMatrixChange={(dayField, bandField, checked) =>
                          void handleAvailabilityMatrixChange(
                            dayField as AvailabilityEditDayField,
                            bandField as AvailabilityEditBandField,
                            checked,
                          )
                        }
                        onSave={() => void saveWorkerAvailability()}
                      />
                    </GateStepSection>
                  )}
                </div>

                <div
                  className={getGateSectionOrderClass(aspettiStep)}
                  ref={registerGateSectionRef("aspetti")}
                >
                  <GateStepSection
                    step={aspettiStep}
                    showStepper={showStepper}
                    info={stepInfoBySection.aspetti}
                  >
                    {specificChecksMode === "confirmation" ? (
                      <>
                        <GateSpecificChecksCard
                          showMobility={useGate1ReorderedSteps}
                          mobilityOptions={mobilityLookupOptions}
                          isUpdatingMobility={updatingNonQualificato}
                          isBabysitterEnabled={includesBabysitterType(
                            jobSearchDraft.tipo_lavoro_domestico,
                            tipoLavoroDomesticoOptions,
                          )}
                          lookupColorsByDomain={lookupColorsByDomain}
                          babysittingNeonatiOptions={babysittingNeonatiOptions}
                          babysittingMultipliBambiniOptions={
                            babysittingMultipliBambiniOptions
                          }
                          caseConCaniOptions={caseConCaniOptions}
                          caseConCaniGrandiOptions={caseConCaniGrandiOptions}
                          caseConGattiOptions={caseConGattiOptions}
                          scaleSoffittiOptions={scaleSoffittiOptions}
                          trasfertaOptions={trasfertaOptions}
                        />
                        <GateSkillConfirmationsCard
                          isEditing={gateSpecificChecksIsEditing}
                          showEditAction={specificChecksEditMode === "toggle"}
                          onToggleEdit={() =>
                            setIsEditingSkills((current) => !current)
                          }
                          isUpdating={updatingSkills}
                          lookupColorsByDomain={lookupColorsByDomain}
                          livelloItalianoOptions={livelloItalianoOptions}
                          livelloIngleseOptions={livelloIngleseOptions}
                          livelloCucinaOptions={livelloCucinaOptions}
                          livelloStiroOptions={livelloStiroOptions}
                          livelloPulizieOptions={livelloPulizieOptions}
                          livelloBabysittingOptions={livelloBabysittingOptions}
                          livelloDogsittingOptions={livelloDogsittingOptions}
                          livelloGiardinaggioOptions={livelloGiardinaggioOptions}
                          compatibilitaStiroOptions={compatibilitaStiroOptions}
                          compatibilitaCucinaOptions={compatibilitaCucinaOptions}
                          compatibilitaNeonatiOptions={compatibilitaNeonatiOptions}
                          ratingCorporaturaOptions={ratingCorporaturaOptions}
                          compatibilitaFamiglieNumeroseOptions={
                            compatibilitaFamiglieNumeroseOptions
                          }
                          compatibilitaFamiglieMoltoEsigentiOptions={
                            compatibilitaFamiglieMoltoEsigentiOptions
                          }
                          compatibilitaDatorePresenteOptions={
                            compatibilitaDatorePresenteOptions
                          }
                          compatibilitaCaseGrandiOptions={
                            compatibilitaCaseGrandiOptions
                          }
                          compatibilitaAnimaliOptions={compatibilitaAnimaliOptions}
                          compatibilitaAutonomiaOptions={
                            compatibilitaAutonomiaOptions
                          }
                          compatibilitaContestiPacatiOptions={
                            compatibilitaContestiPacatiOptions
                          }
                        />
                      </>
                    ) : (
                      <GateSpecificChecksCard
                        showMobility={useGate1ReorderedSteps}
                        mobilityOptions={mobilityLookupOptions}
                        isUpdatingMobility={updatingNonQualificato}
                        isBabysitterEnabled={includesBabysitterType(
                          jobSearchDraft.tipo_lavoro_domestico,
                          tipoLavoroDomesticoOptions,
                        )}
                        lookupColorsByDomain={lookupColorsByDomain}
                        babysittingNeonatiOptions={babysittingNeonatiOptions}
                        babysittingMultipliBambiniOptions={
                          babysittingMultipliBambiniOptions
                        }
                        caseConCaniOptions={caseConCaniOptions}
                        caseConCaniGrandiOptions={caseConCaniGrandiOptions}
                        caseConGattiOptions={caseConGattiOptions}
                        scaleSoffittiOptions={scaleSoffittiOptions}
                        trasfertaOptions={trasfertaOptions}
                      />
                    )}
                  </GateStepSection>
                </div>

                {showDocumentSection && documentSectionAfterSpecificChecks ? (
                  <div
                    className={getGateSectionOrderClass(documentiStep ?? 0)}
                    ref={registerGateSectionRef("documenti")}
                  >
                    <GateStepSection
                      step={documentiStep ?? 0}
                      isLast={!showAssessment}
                      showStepper={showStepper}
                      info={stepInfoBySection.documenti}
                    >
                      <DocumentsCard
                        workerId={selectedWorkerId}
                        isEditing={gateDocumentsIsEditing}
                        showEditAction={false}
                        isUpdating={updatingDocuments}
                        draft={documentsDraft}
                        selectedValues={{
                          stato_verifica_documenti: asString(
                            selectedWorkerRow?.stato_verifica_documenti,
                          ),
                          documenti_in_regola: asString(
                            selectedWorkerRow?.documenti_in_regola,
                          ),
                          data_scadenza_naspi: asString(
                            selectedWorkerRow?.data_scadenza_naspi,
                          ),
                        }}
                        documents={selectedWorkerDocuments}
                        documentsLoading={loadingSelectedWorkerDocuments}
                        verificationOptions={documentiVerificatiOptions}
                        statoDocumentiOptions={documentiInRegolaOptions}
                        lookupColorsByDomain={lookupColorsByDomain}
                        showAdministrativeData={!showAdministrativeFields}
                        documentsPersistMode="parent-form"
                        onToggleEdit={() =>
                          setIsEditingDocuments((current) => !current)
                        }
                        onDocumentUpsert={upsertSelectedWorkerDocument}
                        onUploadError={setError}
                      />
                      <GateDocumentIdentityCard
                        nazionalitaOptions={nazionalitaLookupOptions}
                        isEditing={true}
                      />
                      {showAdministrativeFields ? (
                        <GateAdministrativeFieldsCard
                          stripeAccountValue={documentsDraft.id_stripe_account}
                          isEditing={
                            showAdministrativeFields || gateDocumentsIsEditing
                          }
                          isUpdating={updatingDocuments}
                          missingStripeRequirements={getStripeAccountMissingRequirements({
                            worker: selectedWorkerRow,
                            address: selectedWorkerAddress,
                            iban: ibanValue,
                          })}
                          onGenerateStripeAccount={generateStripeAccount}
                        />
                      ) : null}
                    </GateStepSection>
                  </div>
                ) : null}

                {showAssessment ? (
                  <div
                    className={getGateSectionOrderClass(assessmentStep ?? 0)}
                    ref={registerGateSectionRef("assessment")}
                  >
                    <GateStepSection
                      step={assessmentStep ?? 0}
                      isLast
                      showStepper={showStepper}
                      info={stepInfoBySection.assessment}
                    >
                      <GateAssessmentCard
                        key={selectedWorkerId}
                        statusOptions={statoLavoratoreOptions}
                        nonIdoneoReasonOptions={motivazioniNonIdoneoOptions}
                        operatorName={operatorName}
                        lookupColorsByDomain={lookupColorsByDomain}
                      />
                    </GateStepSection>
                  </div>
                ) : null}
              </div>
            ) : null}
            {selectedWorkerId ? (
              <RecruiterFeedbackButton
                value={asString(selectedWorkerRow?.feedback_recruiter)}
                operatorName={operatorName}
                onSave={(next) =>
                  patchSelectedWorkerField(
                    "feedback_recruiter",
                    next.trim() || null,
                  )
                }
              />
            ) : null}
        </Form>
      </WorkerDetailShell>
    </>
  );
}
