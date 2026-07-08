import { CalendarDaysIcon } from "lucide-react";

import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { AddressSectionCard } from "../components/address-section-card";
import { AvailabilityCalendarCard } from "../components/availability-calendar-card";
import { AvailabilityStatusCard } from "../components/availability-status-card";
import { DocumentsCard } from "../components/documents-card";
import { LavoratoreCard } from "../components/lavoratore-card";
import { WorkerDetailShell } from "../components/worker-detail-shell";
import { SideCardsPanel } from "@/components/shared-next/side-cards-panel";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatAvailabilityComputedAt,
  type AvailabilityEditBandField,
  type AvailabilityEditDayField,
} from "../lib/availability-utils";
import { FieldLabel } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import {
  asString,
  getStripeAccountMissingRequirements,
} from "../lib/base-utils";
import { useGate1View } from "../hooks/use-gate1-view";
import { Gate1WorkerProvider } from "../components/gate1/gate1-worker-context";
import { GateContactsCard } from "../components/gate1/gate-contacts-card";
import {
  GateCertificationReferenteCard,
  GateReferenteCard,
} from "../components/gate1/gate-referente-cards";
import { GatePresentationCard } from "../components/gate1/gate-presentation-card";
import { GateAssessmentCard } from "../components/gate1/gate-assessment-card";
import {
  GateAdministrativeFieldsCard,
  GateDocumentIdentityCard,
  GateSelfCertificationCard,
} from "../components/gate1/gate-verification-cards";
import {
  GateBazeChecksCard,
  GateShiftPreferencesCard,
  GateSpecificChecksCard,
} from "../components/gate1/gate-checks-cards";
import { GateWorkTypesCard } from "../components/gate1/gate-work-types-card";
import { GateSkillConfirmationsCard } from "../components/gate1/gate-skill-confirmations-card";
import { GateStepSection } from "../components/gate1/gate-field-primitives";
import { RecruiterFeedbackButton } from "../components/recruiter-feedback-sheet";
import type { GateViewProps } from "../types/gate1-view";

export type { GateViewProps } from "../types/gate1-view";

export function Gate1View(props: GateViewProps) {
  const {
    activeGateSection,
    activeViewId,
    addressEditMode,
    addressMobilityAnchor,
    applyFilters,
    applySavedView,
    assessmentStep,
    aspettiStep,
    availabilityDraft,
    availabilityEditMode,
    availabilityPayload,
    availabilityReadOnlyRows,
    AVAILABILITY_EDIT_BANDS,
    AVAILABILITY_EDIT_DAYS,
    AVAILABILITY_HOUR_LABELS,
    addressStep,
    babysittingMultipliBambiniOptions,
    babysittingNeonatiOptions,
    bazeChecksEditMode,
    bazeChecksStep,
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
    createExperienceRecord,
    createReferenceRecord,
    currentPage,
    deleteSavedView,
    detailScrollRef,
    disponibilitaBadgeClassName,
    disponibilitaLookupOptions,
    disponibilitaNelGiornoOptions,
    disponibilitaStep,
    documentSectionAfterSpecificChecks,
    documentiInRegolaOptions,
    documentiStep,
    documentiVerificatiOptions,
    documentsDraft,
    error,
    experienceDraft,
    experienceTipoLavoroOptions,
    experienceTipoRapportoOptions,
    filterFields,
    filters,
    followupStatusOptions,
    funzionamentoBazeOptions,
    gate1Editor,
    gateAddressIsEditing,
    gateAvailabilityCalendarIsEditing,
    gateAvailabilityStatusIsEditing,
    gateBazeChecksIsEditing,
    gateDocumentsIsEditing,
    gateFieldsForm,
    gateFollowupFilter,
    gateFollowupOptions,
    gateLabel,
    gatePresentationIsEditing,
    gateProvinciaFilter,
    gateProvinciaOptions,
    gateShiftPreferencesIsEditing,
    gateSpecificChecksIsEditing,
    gateTabs,
    gateWorkTypesIsEditing,
    gateWorkers,
    generateStripeAccount,
    getGateSectionOrderClass,
    groupingOptions,
    haiReferenzeOptions,
    handleAvailabilityMatrixChange,
    handlePrimaryWorkerPhotoChange,
    handleWorkerPhotoInputChange,
    hasPendingFilters,
    ibanValue,
    includesBabysitterType,
    jobSearchDraft,
    lavoriAccettabiliOptions,
    listControlsSlot,
    loading,
    loadingSelectedWorkerDocuments,
    loadingSelectedWorkerExperiences,
    loadingSelectedWorkerReferences,
    livelloBabysittingOptions,
    livelloCucinaOptions,
    livelloDogsittingOptions,
    livelloGiardinaggioOptions,
    livelloIngleseOptions,
    livelloItalianoOptions,
    livelloPulizieOptions,
    livelloStiroOptions,
    loadWorkersSchema,
    lookupColorsByDomain,
    mobilityLookupOptions,
    motivazioniNonIdoneoOptions,
    multipliContrattiOptions,
    nazionalitaLookupOptions,
    openWorkerPhotoPicker,
    operatorName,
    pageCount,
    paga9Options,
    patchExperienceRecord,
    patchReferenceRecord,
    patchSelectedWorkerField,
    photoEditMode,
    presentationEditMode,
    presentationPhotoSlots,
    presentationStep,
    provinciaLookupOptions,
    ratingCorporaturaOptions,
    referenceStatusOptions,
    registerGateSectionRef,
    referenteIdoneitaOptions,
    referenteIdoneitaOptionsLoading,
    retainSelectedWorkerAfterStatusChange,
    saveCurrentView,
    saveWorkerAvailability,
    savedViews,
    scaleSoffittiOptions,
    scrollToSection,
    searchValue,
    sessoLookupOptions,
    setError,
    selectedPresentationPhotoIndex,
    selectedWorker,
    selectedWorkerAddress,
    selectedWorkerDocuments,
    selectedWorkerExperiences,
    selectedWorkerId,
    selectedWorkerReferences,
    selectedWorkerRow,
    selectedWorkerStatusAlert,
    setFilters,
    setGateFollowupFilter,
    setGateProvinciaFilter,
    setIsEditingAddress,
    setIsEditingAvailabilityStep,
    setIsEditingBazeChecks,
    setIsEditingDocuments,
    setIsEditingExperience,
    setIsEditingHeader,
    setIsEditingSkills,
    setPageIndex,
    setSearchValue,
    setSelectedWorkerId,
    showAdministrativeFields,
    showAssessment,
    showCertificationReferente,
    showDocumentSection,
    showFollowup,
    showFollowupFilter,
    showInPersonBookingLinks,
    showReferencesInWorkTypes,
    showStepper,
    specificChecksEditMode,
    specificChecksMode,
    splitBazeChecksStep,
    statoLavoratoreOptions,
    stepInfoBySection,
    table,
    tipoLavoroDomesticoOptions,
    tipoRapportoLavorativoOptions,
    tipologiaStep,
    trasfertaOptions,
    updatingAvailability,
    updatingAvailabilityStatus,
    updatingDocuments,
    updatingExperience,
    updatingNonQualificato,
    updatingSkills,
    uploadingWorkerPhoto,
    upsertSelectedWorkerDocument,
    useGate1ReorderedSteps,
    workTypesEditMode,
    workerAddressesById,
    workerCountLabel,
    workerPhotoInputRef,
    workerRowsById,
    GATE1_IN_PERSON_BOOKING_LINKS,
  } = useGate1View(props);

  return (
    <Gate1WorkerProvider
      editor={gate1Editor}
      workerRow={selectedWorkerRow}
      retainSelectedWorkerAfterStatusChange={
        retainSelectedWorkerAfterStatusChange
      }
    >
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <input
        ref={workerPhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleWorkerPhotoInputChange}
      />
      {showInPersonBookingLinks ? (
        <div className="flex flex-wrap items-center justify-end gap-2 px-4 pt-4">
          {GATE1_IN_PERSON_BOOKING_LINKS.map((link) => (
            <Button key={link.href} asChild variant="outline" size="sm">
              <a href={link.href} target="_blank" rel="noreferrer">
                <CalendarDaysIcon className="size-4" />
                {link.label}
              </a>
            </Button>
          ))}
        </div>
      ) : null}
      <div
        className={
          selectedWorkerId
            ? "grid min-h-0 flex-1 gap-3 px-4 pb-2 pt-4 lg:grid-cols-[332px_minmax(0,1fr)]"
            : "grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 pb-2 pt-4"
        }
      >
        <div className="flex min-h-0 flex-col gap-2" data-testid="lavoratori-list-panel">
          <SideCardsPanel
            title={gateLabel}
            headerClassName="hidden"
            contentClassName="space-y-3 px-5 pt-3 pb-3"
            className="h-full gap-2"
          >
            <DataTableToolbar
              table={table}
              searchValue={searchValue}
              onSearchValueChange={setSearchValue}
              searchCommitDebounceMs={500}
              filters={filters}
              onFiltersChange={setFilters}
              filterFields={filterFields}
              searchPlaceholder="Cerca lavoratori..."
              groupOptions={groupingOptions}
              compactControls
              savedViews={savedViews.map((view) => ({
                id: view.id,
                name: view.name,
                updatedAt: view.updatedAt,
              }))}
              activeViewId={activeViewId}
              onSaveCurrentView={saveCurrentView}
              onApplySavedView={applySavedView}
              onDeleteSavedView={deleteSavedView}
              onApplyFilters={applyFilters}
              hasPendingFilters={hasPendingFilters}
              onRequestSchema={loadWorkersSchema}
            />

            <div className="flex flex-col gap-3">
              {listControlsSlot}

              <div className="space-y-1">
                <FieldLabel>Provincia</FieldLabel>
                <Select
                  value={gateProvinciaFilter}
                  onValueChange={setGateProvinciaFilter}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tutte le province" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte le province</SelectItem>
                    {gateProvinciaOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showFollowupFilter ? (
                <div className="space-y-1">
                  <FieldLabel>Follow-up</FieldLabel>
                  <Select
                    value={gateFollowupFilter}
                    onValueChange={setGateFollowupFilter}
                    disabled={loading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Tutti i follow-up" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i follow-up</SelectItem>
                      {gateFollowupOptions.map((followup) => (
                        <SelectItem key={followup} value={followup}>
                          {followup}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            {gateProvinciaFilter !== "all" || gateFollowupFilter !== "all" ? (
              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setGateProvinciaFilter("all");
                    setGateFollowupFilter("all");
                  }}
                >
                  Reset filtri
                </Button>
              </div>
            ) : null}

            {loading ? (
              <p className="text-muted-foreground py-3 text-sm">
                Caricamento lavoratori...
              </p>
            ) : error ? (
              <p className="py-3 text-sm text-red-600">{error}</p>
            ) : gateWorkers.length === 0 ? (
              <p className="text-muted-foreground py-3 text-sm">
                {gateProvinciaFilter !== "all" || gateFollowupFilter !== "all"
                  ? "Nessun lavoratore corrisponde ai filtri selezionati."
                  : "Nessun lavoratore trovato."}
              </p>
            ) : (
              <div className="space-y-2">
                {gateWorkers.map((worker) => {
                  const row = workerRowsById.get(worker.id);
                  const followupRaw = asString(row?.followup_chiamata_idoneita);
                  const followupOption = followupStatusOptions.find(
                    (option) =>
                      option.value === followupRaw ||
                      option.label === followupRaw,
                  );
                  return (
                    <LavoratoreCard
                      key={worker.id}
                      worker={worker}
                      isActive={worker.id === selectedWorkerId}
                      variant="gate1"
                      gate1Summary={{
                        // Mostra la sigla (es. "TO") quando disponibile, altrimenti
                        // ripiega sul nome esteso. La sigla è la sorgente canonica
                        // usata anche dal filtro Gate 1/2.
                        // Gate 1 RPC espone già `provincia_sigla` nella row;
                        // per Gate 2 (no RPC) la prendiamo dall'indirizzo di residenza.
                        provincia:
                          asString(row?.provincia_sigla) ||
                          asString(
                            (workerAddressesById?.get(worker.id) ?? []).find(
                              (a) =>
                                asString(a.tipo_indirizzo).toLowerCase() ===
                                "residenza",
                            )?.provincia_sigla ??
                              (workerAddressesById?.get(worker.id) ?? [])[0]
                                ?.provincia_sigla,
                          ) ||
                          asString(row?.provincia),
                        createdAt: asString(row?.creato_il),
                        followup: followupOption?.label ?? followupRaw,
                      }}
                      onClick={() =>
                        setSelectedWorkerId((previous) =>
                          previous === worker.id ? null : worker.id,
                        )
                      }
                    />
                  );
                })}
              </div>
            )}
          </SideCardsPanel>

          <Pagination className="px-1">
            <Pagination.Pages
              page={currentPage}
              pageCount={pageCount}
              onChange={(nextPage) => {
                if (loading) return;
                setPageIndex(Math.max(nextPage - 1, 0));
              }}
            />
            <span className="text-muted-foreground tabular-nums">
              {gateWorkers.length} {workerCountLabel}
            </span>
          </Pagination>
        </div>

        {selectedWorkerId ? (
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
        ) : null}
      </div>
    </section>
    </Gate1WorkerProvider>
  );
}
