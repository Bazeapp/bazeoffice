import * as React from "react";

import { useComboboxAnchor } from "@/components/ui/combobox";
import { useOperatoriOptions } from "@/hooks/use-operatori-options";
import type { ResolvedGateViewProps } from "../lib/gate1-view-props";

type UseGateStepLayoutParams = Pick<
  ResolvedGateViewProps,
  | "documentSectionMode"
  | "showSelfCertification"
  | "stepLayout"
  | "showCertificationReferente"
  | "showFollowup"
  | "showAssessment"
  | "splitBazeChecksStep"
  | "presentationEditMode"
  | "addressEditMode"
  | "workTypesEditMode"
  | "availabilityEditMode"
  | "bazeChecksEditMode"
  | "specificChecksEditMode"
> & {
  selectedWorkerId: string | null;
  isEditingHeader: boolean;
  isEditingAddress: boolean;
  isEditingExperience: boolean;
  isEditingSkills: boolean;
  isEditingDocuments: boolean;
};

export function useGateStepLayout({
  documentSectionMode,
  showSelfCertification,
  stepLayout,
  showCertificationReferente,
  showFollowup,
  showAssessment,
  splitBazeChecksStep,
  presentationEditMode,
  addressEditMode,
  workTypesEditMode,
  availabilityEditMode,
  bazeChecksEditMode,
  specificChecksEditMode,
  selectedWorkerId,
  isEditingHeader,
  isEditingAddress,
  isEditingExperience,
  isEditingSkills,
  isEditingDocuments,
}: UseGateStepLayoutParams) {
  const resolvedDocumentSectionMode =
    documentSectionMode ??
    (showSelfCertification ? "self_certification" : "hidden");
  const showDocumentSection = resolvedDocumentSectionMode !== "hidden";
  const documentSectionAfterSpecificChecks =
    resolvedDocumentSectionMode === "documents";
  const useGate1ReorderedSteps = stepLayout === "gate1_reordered";

  const getGateSectionOrderClass = React.useCallback(
    (step: number) => {
      if (!useGate1ReorderedSteps) return undefined;
      switch (step) {
        case 1:
          return "order-1";
        case 2:
          return "order-2";
        case 3:
          return "order-3";
        case 4:
          return "order-4";
        case 5:
          return "order-5";
        case 6:
          return "order-6";
        case 7:
          return "order-7";
        case 8:
          return "order-8";
        default:
          return undefined;
      }
    },
    [useGate1ReorderedSteps],
  );

  const addressMobilityAnchor = useComboboxAnchor();
  const [isEditingAvailabilityStep, setIsEditingAvailabilityStep] =
    React.useState(false);
  const [isEditingBazeChecks, setIsEditingBazeChecks] = React.useState(false);

  const {
    options: referenteIdoneitaOptions,
    loading: referenteIdoneitaOptionsLoading,
  } = useOperatoriOptions({
    role: "recruiter",
    activeOnly: true,
  });

  const {
    presentationStep,
    addressStep,
    documentiStep,
    tipologiaStep,
    disponibilitaStep,
    bazeChecksStep,
    aspettiStep,
    assessmentStep,
  } = React.useMemo(() => {
    if (useGate1ReorderedSteps) {
      return {
        presentationStep: 1,
        addressStep: 3,
        documentiStep: showDocumentSection ? 4 : null,
        tipologiaStep: 5,
        disponibilitaStep: 6,
        bazeChecksStep: 2,
        aspettiStep: 7,
        assessmentStep: showAssessment ? 8 : null,
      };
    }

    let currentStep = 0;

    if (showCertificationReferente) currentStep += 1;
    if (showFollowup) currentStep += 1;

    const nextPresentationStep = ++currentStep;
    const nextDocumentiStep =
      showDocumentSection && !documentSectionAfterSpecificChecks
        ? ++currentStep
        : null;
    const nextTipologiaStep = ++currentStep;
    const nextDisponibilitaStep = ++currentStep;
    const nextBazeChecksStep = splitBazeChecksStep ? ++currentStep : null;
    const nextAspettiStep = ++currentStep;
    const lateDocumentiStep =
      showDocumentSection && documentSectionAfterSpecificChecks
        ? ++currentStep
        : null;
    const nextAssessmentStep = showAssessment ? ++currentStep : null;

    return {
      presentationStep: nextPresentationStep,
      addressStep: nextPresentationStep,
      documentiStep: nextDocumentiStep ?? lateDocumentiStep,
      tipologiaStep: nextTipologiaStep,
      disponibilitaStep: nextDisponibilitaStep,
      bazeChecksStep: nextBazeChecksStep,
      aspettiStep: nextAspettiStep,
      assessmentStep: nextAssessmentStep,
    };
  }, [
    documentSectionAfterSpecificChecks,
    showCertificationReferente,
    showDocumentSection,
    showFollowup,
    showAssessment,
    splitBazeChecksStep,
    useGate1ReorderedSteps,
  ]);

  const gatePresentationIsEditing =
    presentationEditMode === "always" ? true : isEditingHeader;
  const gateAddressIsEditing =
    addressEditMode === "always" ? true : isEditingAddress;
  const gateWorkTypesIsEditing =
    workTypesEditMode === "always" ? true : isEditingExperience;
  const gateAvailabilityStatusIsEditing =
    availabilityEditMode === "always" ? true : isEditingAvailabilityStep;
  const gateShiftPreferencesIsEditing =
    availabilityEditMode === "always" ? true : isEditingAvailabilityStep;
  const gateAvailabilityCalendarIsEditing =
    availabilityEditMode === "always" ? true : isEditingAvailabilityStep;
  const gateBazeChecksIsEditing =
    bazeChecksEditMode === "always" ? true : isEditingBazeChecks;
  const gateSpecificChecksIsEditing =
    specificChecksEditMode === "always" ? true : isEditingSkills;
  const gateDocumentsIsEditing =
    resolvedDocumentSectionMode === "documents" ? true : isEditingDocuments;

  React.useEffect(() => {
    setIsEditingAvailabilityStep(false);
    setIsEditingBazeChecks(false);
  }, [selectedWorkerId]);

  return {
    addressMobilityAnchor,
    assessmentStep,
    aspettiStep,
    addressStep,
    bazeChecksStep,
    disponibilitaStep,
    documentSectionAfterSpecificChecks,
    documentiStep,
    gateAddressIsEditing,
    gateAvailabilityCalendarIsEditing,
    gateAvailabilityStatusIsEditing,
    gateBazeChecksIsEditing,
    gateDocumentsIsEditing,
    gatePresentationIsEditing,
    gateShiftPreferencesIsEditing,
    gateSpecificChecksIsEditing,
    gateWorkTypesIsEditing,
    getGateSectionOrderClass,
    isEditingAvailabilityStep,
    isEditingBazeChecks,
    presentationStep,
    referenteIdoneitaOptions,
    referenteIdoneitaOptionsLoading,
    setIsEditingAvailabilityStep,
    setIsEditingBazeChecks,
    showDocumentSection,
    tipologiaStep,
    useGate1ReorderedSteps,
  };
}
