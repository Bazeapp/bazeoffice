import type { GateViewProps } from "../types/gate1-view";

export type ResolvedGateViewProps = Required<
  Pick<
    GateViewProps,
    | "gateLabel"
    | "workerStatus"
    | "workerCountLabel"
    | "showFollowup"
    | "showSelfCertification"
    | "showReferencesInWorkTypes"
    | "showAdministrativeFields"
    | "showStepper"
    | "splitBazeChecksStep"
    | "stepInfoBySection"
    | "presentationEditMode"
    | "photoEditMode"
    | "addressEditMode"
    | "workTypesEditMode"
    | "availabilityEditMode"
    | "bazeChecksEditMode"
    | "showAssessment"
    | "specificChecksMode"
    | "specificChecksEditMode"
    | "applyGate1BaseFilters"
    | "showCertificationReferente"
    | "showFollowupFilter"
    | "allowCertifiedStatus"
    | "showInPersonBookingLinks"
    | "stepLayout"
  >
> &
  Pick<GateViewProps, "listControlsSlot" | "documentSectionMode">;

export function resolveGateViewProps(props: GateViewProps): ResolvedGateViewProps {
  return {
    gateLabel: props.gateLabel ?? "Gate 1",
    workerStatus: props.workerStatus ?? "qualificato",
    workerCountLabel: props.workerCountLabel ?? "qualificati",
    listControlsSlot: props.listControlsSlot,
    showFollowup: props.showFollowup ?? true,
    showSelfCertification: props.showSelfCertification ?? true,
    showReferencesInWorkTypes: props.showReferencesInWorkTypes ?? false,
    showAdministrativeFields: props.showAdministrativeFields ?? false,
    showStepper: props.showStepper ?? false,
    splitBazeChecksStep: props.splitBazeChecksStep ?? false,
    stepInfoBySection: props.stepInfoBySection ?? {},
    presentationEditMode: props.presentationEditMode ?? "always",
    photoEditMode: props.photoEditMode ?? "hidden",
    addressEditMode: props.addressEditMode ?? "always",
    workTypesEditMode: props.workTypesEditMode ?? "always",
    availabilityEditMode: props.availabilityEditMode ?? "always",
    bazeChecksEditMode: props.bazeChecksEditMode ?? "always",
    documentSectionMode: props.documentSectionMode,
    showAssessment: props.showAssessment ?? true,
    specificChecksMode: props.specificChecksMode ?? "gate1",
    specificChecksEditMode: props.specificChecksEditMode ?? "always",
    applyGate1BaseFilters: props.applyGate1BaseFilters ?? true,
    showCertificationReferente: props.showCertificationReferente ?? false,
    showFollowupFilter: props.showFollowupFilter ?? true,
    allowCertifiedStatus: props.allowCertifiedStatus ?? false,
    showInPersonBookingLinks: props.showInPersonBookingLinks ?? false,
    stepLayout: props.stepLayout ?? "default",
  };
}
