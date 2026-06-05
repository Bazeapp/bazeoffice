import * as React from "react";
import {
  AlertTriangleIcon,
  BadgeCheckIcon,
  CalendarDaysIcon,
  CheckIcon,
  CircleUserRoundIcon,
  CircleSlashIcon,
  CircleHelpIcon,
  FileSearchIcon,
  LoaderCircleIcon,
  NotebookPenIcon,
  PencilIcon,
  PhoneIcon,
  ShieldCheckIcon,
  StarIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";

import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { AddressSectionCard } from "@/components/lavoratori/address-section-card";
import { AvailabilityCalendarCard } from "@/components/lavoratori/availability-calendar-card";
import { AvailabilityStatusCard } from "@/components/lavoratori/availability-status-card";
import { DocumentsCard } from "@/components/lavoratori/documents-card";
import { ExperienceReferencesCard } from "@/components/lavoratori/experience-references-card";
import { LavoratoreCard } from "@/components/lavoratori/lavoratore-card";
import type { LavoratoreListItem } from "@/components/lavoratori/lavoratore-card";
import { SkillsChoiceMatrix } from "@/components/lavoratori/skills-choice-matrix";
import { WorkerShiftPreferencesFields } from "@/components/lavoratori/worker-shift-preferences-fields";
import { WorkerDetailShell } from "@/components/lavoratori/worker-detail-shell";
import { WorkerProfileOverview } from "@/components/lavoratori/worker-profile-overview";
import {
  DetailSectionBlock,
  DetailSectionCard,
} from "@/components/shared-next/detail-section-card";
import { SideCardsPanel } from "@/components/shared-next/side-cards-panel";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import {
  formatAvailabilityComputedAt,
  type AvailabilityEditBandField,
  type AvailabilityEditDayField,
} from "@/features/lavoratori/lib/availability-utils";
import { FieldLabel } from "@/components/ui/field";
import {
  asLavoratoreRecord,
  asInputValue,
  asString,
  getStripeAccountMissingRequirements,
  normalizeDomesticRoleDbLabels,
  normalizeDomesticRoleLabels,
  normalizeDomesticRoleLookupValues,
  parseNumberValue,
  readArrayStrings,
} from "@/features/lavoratori/lib/base-utils";
import {
  getLookupLabelForSave,
  getLookupOptionLabel,
  getLookupSelectValue,
  getTagClassName,
  normalizeLookupComparableToken,
  normalizeLookupDbLabels,
  normalizeLookupOptionValues,
  resolveLookupSingleValueOptions,
  resolveLookupColor,
} from "@/features/lavoratori/lib/lookup-utils";
import { useLavoratoriData } from "@/hooks/use-lavoratori-data";
import {
  type OperatoreOption,
  useOperatoriOptions,
} from "@/hooks/use-operatori-options";
import { useSelectedWorkerEditor } from "@/hooks/use-selected-worker-editor";
import { Gate1WorkerProvider } from "@/components/lavoratori/gate1/gate1-worker-context";
import { useDebouncedSave } from "@/hooks/use-debounced-save";
import { useCurrentOperatorName } from "@/hooks/use-current-operator-name";
import { RecruiterFeedbackButton } from "@/components/lavoratori/recruiter-feedback-sheet";
import { RecruiterFeedbackPanel } from "@/components/lavoratori/recruiter-feedback-panel";
import { updateRecord } from "@/lib/anagrafiche-api";
import {
  buildAttachmentPayload,
  type MinimalAttachment,
  normalizeAttachmentArray,
} from "@/lib/attachments";
import { supabase } from "@/lib/supabase-client";
import { PROVINCIA_DROPDOWN_OPTIONS } from "@/lib/province-italiane";
import { normalizeWorkerStatus } from "@/features/lavoratori/lib/status-utils";
import type { LavoratoreRecord } from "@/types/entities/lavoratore";
import { useProvincieOptions } from "@/hooks/use-provincie";

const EMPTY_SELECT_VALUE = "none";

function toAvatarRingClass(legacyClassName: string) {
  return legacyClassName.replace(/^after:border-/, "ring-2 ring-");
}

function OperatorSelectOption({ operator }: { operator: OperatoreOption }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar
        size="sm"
        fallback={operator.avatar}
        className={toAvatarRingClass(operator.avatarBorderClassName)}
      />
      <span className="truncate">{operator.label}</span>
    </span>
  );
}

type GateTab = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

function sanitizeFileName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-");
}

type GateSectionId =
  | "referente"
  | "contatti"
  | "presentazione"
  | "indirizzo"
  | "documenti"
  | "tipologia"
  | "disponibilita"
  | "check_baze"
  | "aspetti"
  | "assessment";

type GateStepInfo = {
  title: React.ReactNode;
  content: React.ReactNode;
};

type GateViewProps = {
  gateLabel?: string;
  workerStatus?: string | string[];
  workerCountLabel?: string;
  listControlsSlot?: React.ReactNode;
  showFollowup?: boolean;
  showSelfCertification?: boolean;
  showReferencesInWorkTypes?: boolean;
  showAdministrativeFields?: boolean;
  showStepper?: boolean;
  splitBazeChecksStep?: boolean;
  stepInfoBySection?: Partial<Record<GateSectionId, GateStepInfo>>;
  presentationEditMode?: "always" | "toggle";
  photoEditMode?: "hidden" | "editable";
  addressEditMode?: "always" | "toggle";
  workTypesEditMode?: "always" | "toggle";
  availabilityEditMode?: "always" | "toggle";
  bazeChecksEditMode?: "always" | "toggle";
  documentSectionMode?: "self_certification" | "documents" | "hidden";
  showAssessment?: boolean;
  specificChecksMode?: "gate1" | "confirmation";
  specificChecksEditMode?: "always" | "toggle";
  applyGate1BaseFilters?: boolean;
  showCertificationReferente?: boolean;
  showFollowupFilter?: boolean;
  allowCertifiedStatus?: boolean;
  showInPersonBookingLinks?: boolean;
  stepLayout?: "default" | "gate1_reordered";
};

const GATE1_IN_PERSON_BOOKING_LINKS = [
  {
    label: "Colloquio Milano",
    href: "https://cal.com/baze-lavoro/colloquio-in-presenza-lavoratori-di-milano",
  },
  {
    label: "Colloquio Torino",
    href: "https://cal.com/baze-lavoro/colloquio-in-presenza-lavoratori-di-torino",
  },
  {
    label: "Colloquio Monza",
    href: "https://cal.com/baze-lavoro/colloquio-monza",
  },
] as const;

function includesBabysitterType(
  values: string[],
  options: Array<{ label: string; value: string }>,
) {
  return normalizeDomesticRoleLabels(values).some((label) => label === "Tata")
    || normalizeDomesticRoleLookupValues(values, options).some((value) => {
      const label = getLookupOptionLabel(options, value);
      return label.toLowerCase().includes("babysitter");
    });
}

function GateInfoCard({
  title,
  icon,
  titleAction,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  titleAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <DetailSectionBlock
      title={title}
      icon={icon}
      action={titleAction}
      showDefaultAction={false}
      contentClassName="space-y-4"
    >
      {children}
    </DetailSectionBlock>
  );
}

function GateStepSection({
  step,
  isFirst = false,
  isLast = false,
  showStepper = true,
  reserveStepperSpace = false,
  info,
  children,
}: {
  step: number;
  isFirst?: boolean;
  isLast?: boolean;
  showStepper?: boolean;
  reserveStepperSpace?: boolean;
  info?: {
    title: React.ReactNode;
    content: React.ReactNode;
  };
  children: React.ReactNode;
}) {
  if (!showStepper) {
    if (reserveStepperSpace) {
      return (
        <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4">
          <div aria-hidden="true" className="relative">
            <div className="bg-border absolute top-[-1.5rem] bottom-[-1.5rem] left-1/2 w-px -translate-x-1/2" />
          </div>
          <div className="min-w-0 space-y-4">{children}</div>
        </div>
      );
    }

    return <div className="min-w-0 space-y-4">{children}</div>;
  }

  return (
    <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4">
      <div className="relative">
        {isFirst ? null : (
          <div className="bg-border absolute top-[-1.5rem] left-1/2 h-8 w-px -translate-x-1/2" />
        )}
        {isLast ? null : (
          <div className="bg-border absolute top-4 bottom-[-1.5rem] left-1/2 w-px -translate-x-1/2" />
        )}
        <div className="bg-background text-foreground absolute top-0 left-1/2 z-10 flex size-8 -translate-x-1/2 items-center justify-center rounded-full border text-sm font-semibold shadow-sm">
          {step}
        </div>
        {info ? (
          <HoverCard openDelay={120}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                className="bg-background text-muted-foreground absolute top-10 left-1/2 z-10 flex size-5 -translate-x-1/2 items-center justify-center rounded-full border shadow-sm transition-colors hover:text-foreground"
                aria-label={`Informazioni step ${step}`}
                title={`Informazioni step ${step}`}
              >
                <CircleHelpIcon className="size-3.5" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent
              side="right"
              align="start"
              className="w-[26rem] space-y-3 p-4"
            >
              <p className="text-sm font-semibold">{info.title}</p>
              <div className="space-y-3 text-sm leading-6">{info.content}</div>
            </HoverCardContent>
          </HoverCard>
        ) : null}
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </div>
  );
}

function GateContactsCard({
  followupStatus,
  onFollowupStatusChange,
  options,
}: {
  followupStatus: string;
  onFollowupStatusChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <GateInfoCard
      title="Follow-up"
      icon={<PhoneIcon className="text-muted-foreground size-4" />}
    >
      <div className="flex items-start gap-3 text-sm">
        <FieldLabel className="w-24 shrink-0">
          Follow-up chiamata idoneita
        </FieldLabel>
        <div className="min-w-0 flex-1 text-foreground">
          <RadioGroup
            value={getLookupSelectValue(followupStatus, options, "")}
            onValueChange={(value) =>
              onFollowupStatusChange(getLookupLabelForSave(value, options))
            }
            variant="card"
            className="pt-1"
          >
            {options.map((option) => (
              <RadioGroupItem
                key={option.value}
                value={option.value}
                id={`followup-${option.value}`}
                title={option.label}
              />
            ))}
          </RadioGroup>
        </div>
      </div>
    </GateInfoCard>
  );
}

function GateReferenteCard({
  title = "Referente idoneità",
  label = "Referente Gate 1",
  value,
  referenteCertificazioneValue,
  options,
  disabled,
  onChange,
}: {
  title?: string;
  label?: string;
  value: string;
  referenteCertificazioneValue?: string;
  options: OperatoreOption[];
  disabled?: boolean;
  onChange: (value: string | null) => void;
}) {
  const selectedOperator = value
    ? options.find((option) => option.id === value) ?? null
    : null;
  const selectedCertificationOperator = referenteCertificazioneValue
    ? options.find((option) => option.id === referenteCertificazioneValue) ?? null
    : null;
  const showCertificationAssignment = referenteCertificazioneValue !== undefined;

  return (
    <GateInfoCard
      title={title}
      icon={<UsersIcon className="text-muted-foreground size-4" />}
    >
      <div
        className={
          showCertificationAssignment ? "grid gap-4 md:grid-cols-2" : "space-y-4"
        }
      >
        <div className="flex items-start gap-3 text-sm">
          <FieldLabel className="w-24 shrink-0">{label}</FieldLabel>
          <div className="min-w-0 flex-1 text-foreground">
            <Select
              value={value || "none"}
              onValueChange={(nextValue) =>
                onChange(nextValue === "none" ? null : nextValue)
              }
              disabled={disabled}
            >
              <SelectTrigger>
                {selectedOperator ? (
                  <OperatorSelectOption operator={selectedOperator} />
                ) : (
                  <SelectValue placeholder="Seleziona referente Gate 1" />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessun referente Gate 1</SelectItem>
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    <OperatorSelectOption operator={option} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {showCertificationAssignment ? (
          <div className="flex items-start gap-3 text-sm">
            <FieldLabel className="w-24 shrink-0">Referente Gate 2</FieldLabel>
            <div className="min-w-0 flex-1 text-foreground">
              <div className="text-foreground flex min-h-10 items-center rounded-md border bg-surface px-3 text-sm">
                {selectedCertificationOperator ? (
                  <OperatorSelectOption operator={selectedCertificationOperator} />
                ) : (
                  resolveOperatorLabel(referenteCertificazioneValue ?? "", options)
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </GateInfoCard>
  );
}

function resolveOperatorLabel(
  value: string,
  options: OperatoreOption[],
) {
  if (!value) return "—";
  return options.find((option) => option.id === value)?.label ?? value;
}

function GateCertificationReferenteCard({
  referenteCertificazioneValue,
  referenteIdoneitaValue,
  options,
  disabled,
  onReferenteCertificazioneChange,
}: {
  referenteCertificazioneValue: string;
  referenteIdoneitaValue: string;
  options: OperatoreOption[];
  disabled?: boolean;
  onReferenteCertificazioneChange: (value: string | null) => void;
}) {
  const selectedCertificationOperator = referenteCertificazioneValue
    ? options.find((option) => option.id === referenteCertificazioneValue) ?? null
    : null;
  const selectedIdoneitaOperator = referenteIdoneitaValue
    ? options.find((option) => option.id === referenteIdoneitaValue) ?? null
    : null;

  return (
    <GateInfoCard
      title="Referente"
      icon={<UsersIcon className="text-muted-foreground size-4" />}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-start gap-3 text-sm">
          <FieldLabel className="w-24 shrink-0">Referente Gate 2</FieldLabel>
          <div className="min-w-0 flex-1 text-foreground">
            <Select
              value={referenteCertificazioneValue || "none"}
              onValueChange={(nextValue) =>
                onReferenteCertificazioneChange(
                  nextValue === "none" ? null : nextValue,
                )
              }
              disabled={disabled}
            >
              <SelectTrigger>
                {selectedCertificationOperator ? (
                  <OperatorSelectOption operator={selectedCertificationOperator} />
                ) : (
                  <SelectValue placeholder="Seleziona referente Gate 2" />
                )}
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessun referente Gate 2</SelectItem>
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    <OperatorSelectOption operator={option} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-start gap-3 text-sm">
          <FieldLabel className="w-24 shrink-0">Referente Gate 1</FieldLabel>
          <div className="min-w-0 flex-1 text-foreground">
            <div className="text-foreground flex min-h-10 items-center rounded-md border bg-surface px-3 text-sm">
              {selectedIdoneitaOperator ? (
                <OperatorSelectOption operator={selectedIdoneitaOperator} />
              ) : (
                resolveOperatorLabel(referenteIdoneitaValue, options)
              )}
            </div>
          </div>
        </div>
      </div>
    </GateInfoCard>
  );
}

function GatePresentationCard({
  worker,
  workerRow,
  statusAlert,
  headerDraft,
  descriptionValue,
  livelloItaliano,
  sessoOptions,
  nazionalitaOptions,
  presentationPhotoSlots,
  selectedPresentationPhotoIndex,
  isEditing,
  showEditAction = false,
  showUploadPhotoAction = false,
  uploadingPhoto = false,
  onToggleEdit,
  onUploadPhoto,
  onSelectedPresentationPhotoIndexChange,
  onHeaderChange,
  livelloItalianoOptions,
  onLivelloItalianoChange,
}: {
  worker: LavoratoreListItem;
  workerRow: LavoratoreRecord;
  statusAlert?: {
    statusLabel: string;
    reasonLabel: string;
    tone: "critical" | "muted";
  } | null;
  headerDraft: {
    nome: string;
    cognome: string;
    email: string;
    telefono: string;
    sesso: string;
    nazionalita: string;
    data_di_nascita: string;
  };
  descriptionValue: string;
  livelloItaliano: string;
  sessoOptions: Array<{ label: string; value: string }>;
  nazionalitaOptions: Array<{ label: string; value: string }>;
  presentationPhotoSlots: string[];
  selectedPresentationPhotoIndex: number;
  isEditing: boolean;
  showEditAction?: boolean;
  showUploadPhotoAction?: boolean;
  uploadingPhoto?: boolean;
  onToggleEdit?: () => void;
  onUploadPhoto?: () => void;
  onSelectedPresentationPhotoIndexChange: (value: number) => void;
  livelloItalianoOptions: Array<{ label: string; value: string }>;
  onHeaderChange: (field: string, value: string) => void;
  onLivelloItalianoChange: (value: string) => void;
}) {
  return (
    <GateInfoCard
      title="Presentazione lavoratore"
      icon={<CircleUserRoundIcon className="text-muted-foreground size-4" />}
      titleAction={
        showEditAction ? (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={
                isEditing
                  ? "Termina modifica presentazione"
                  : "Modifica presentazione"
              }
              title={
                isEditing
                  ? "Termina modifica presentazione"
                  : "Modifica presentazione"
              }
              onClick={onToggleEdit}
            >
              <PencilIcon />
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {statusAlert ? (
          <div
            className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm ${
              statusAlert.tone === "critical"
                ? "bg-rose-50/70 text-rose-700"
                : "bg-zinc-100/70 text-zinc-700"
            }`}
          >
            <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-0.5">
              <p className="font-semibold">{statusAlert.statusLabel}</p>
              <p>{statusAlert.reasonLabel}</p>
            </div>
          </div>
        ) : null}
        <WorkerProfileOverview
          worker={worker}
          workerRow={workerRow}
          isEditing={isEditing}
          draft={{
            ...headerDraft,
            descrizione_pubblica: descriptionValue,
          }}
          livelloItaliano={livelloItaliano}
          livelloItalianoOptions={livelloItalianoOptions}
          sessoOptions={sessoOptions}
          nazionalitaOptions={nazionalitaOptions}
          presentationPhotoSlots={presentationPhotoSlots}
          selectedPresentationPhotoIndex={selectedPresentationPhotoIndex}
          showUploadPhotoAction={showUploadPhotoAction}
          uploadingPhoto={uploadingPhoto}
          onUploadPhoto={onUploadPhoto}
          onSelectedPresentationPhotoIndexChange={
            onSelectedPresentationPhotoIndexChange
          }
          onLivelloItalianoChange={onLivelloItalianoChange}
          onFieldChange={onHeaderChange}
        />
      </div>
    </GateInfoCard>
  );
}

function GateAssessmentCard({
  statusValue,
  statusOptions,
  onStatusChange,
  nonIdoneoReasonValue,
  nonIdoneoReasonOptions,
  onNonIdoneoReasonChange,
  feedbackRaw,
  operatorName,
  onFeedbackSave,
  lookupColorsByDomain,
}: {
  statusValue: string;
  statusOptions: Array<{ label: string; value: string }>;
  onStatusChange: (value: string) => void;
  nonIdoneoReasonValue: string;
  nonIdoneoReasonOptions: Array<{ label: string; value: string }>;
  onNonIdoneoReasonChange: (value: string) => void;
  feedbackRaw: string;
  operatorName: string;
  onFeedbackSave: (nextValue: string) => Promise<void> | void;
  lookupColorsByDomain: Map<string, string>;
}) {
  const orderedStatusOptions = React.useMemo(() => {
    const desiredOrder = new Map([
      ["Non qualificato", 1],
      ["Non idoneo", 2],
      ["Qualificato", 3],
      ["Idoneo", 4],
      ["Certificato", 5],
    ]);

    return [...statusOptions].sort((left, right) => {
      const leftOrder = desiredOrder.get(left.label) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder =
        desiredOrder.get(right.label) ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.label.localeCompare(right.label);
    });
  }, [statusOptions]);
  const [pendingStatusValue, setPendingStatusValue] = React.useState<
    string | null
  >(null);
  const [pendingNonIdoneoReason, setPendingNonIdoneoReason] =
    React.useState("");
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = React.useState(false);

  const isPendingNonIdoneo =
    pendingStatusValue != null &&
    normalizeLookupComparableToken(pendingStatusValue) === "non idoneo";

  const handleStatusSelection = React.useCallback(
    (value: string) => {
      const nextValue = getLookupLabelForSave(value, orderedStatusOptions);
      if (!nextValue || nextValue === statusValue) return;
      setPendingStatusValue(nextValue);
      setPendingNonIdoneoReason(nonIdoneoReasonValue);
      setIsStatusConfirmOpen(true);
    },
    [orderedStatusOptions, statusValue, nonIdoneoReasonValue],
  );

  const handleStatusConfirm = React.useCallback(() => {
    if (!pendingStatusValue) return;
    const willBeNonIdoneo =
      normalizeLookupComparableToken(pendingStatusValue) === "non idoneo";
    onStatusChange(pendingStatusValue);
    if (willBeNonIdoneo) {
      onNonIdoneoReasonChange(pendingNonIdoneoReason);
    }
    setIsStatusConfirmOpen(false);
    setPendingStatusValue(null);
    setPendingNonIdoneoReason("");
  }, [
    onStatusChange,
    onNonIdoneoReasonChange,
    pendingStatusValue,
    pendingNonIdoneoReason,
  ]);

  const handleStatusConfirmOpenChange = React.useCallback((open: boolean) => {
    setIsStatusConfirmOpen(open);
    if (!open) {
      setPendingStatusValue(null);
      setPendingNonIdoneoReason("");
    }
  }, []);

  return (
    <GateInfoCard
      title="Assessment finale"
      icon={<NotebookPenIcon className="text-muted-foreground size-4" />}
    >
      <div className="space-y-1">
        <p className="text-sm">
          Inserisci i tuoi appunti e valutazione su questo profilo.
        </p>
      </div>

      <div className="max-w-5xl">
        <RecruiterFeedbackPanel
          embedded
          showHistory={false}
          value={feedbackRaw}
          operatorName={operatorName}
          onSave={onFeedbackSave}
        />
      </div>

      <div className="max-w-xs space-y-3">
        <p className="text-sm font-medium">
          Aggiorna lo stato del lavoratore dopo il colloquio
        </p>
        <RadioGroup
          value={getLookupSelectValue(statusValue, orderedStatusOptions, "")}
          onValueChange={handleStatusSelection}
          className="gap-3"
        >
          {orderedStatusOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-3 text-sm"
            >
              <RadioGroupItem value={option.value} />
              <span
                className={`inline-flex items-center rounded-4xl border px-2.5 py-0.5 text-xs ${getTagClassName(
                  resolveLookupColor(
                    lookupColorsByDomain,
                    "lavoratori.stato_lavoratore",
                    option.label,
                  ),
                )}`}
              >
                {option.label}
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>

      <AlertDialog
        open={isStatusConfirmOpen}
        onOpenChange={handleStatusConfirmOpenChange}
      >
        <AlertDialogContent>
          <div className="space-y-2 text-left">
            <AlertDialogTitle className="text-left font-semibold">
              Confermi il cambio di stato?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Lo stato del lavoratore verrà aggiornato da{" "}
              <strong>{statusValue || "nessuno"}</strong> a{" "}
              <strong>{pendingStatusValue || "nessuno"}</strong>.
            </AlertDialogDescription>
          </div>
          {isPendingNonIdoneo ? (
            <div className="space-y-2 text-left">
              <p className="text-sm font-medium">Perchè non è idoneo?</p>
              <p className="text-muted-foreground text-sm">
                Seleziona una motivazione per confermare.
              </p>
              <Select
                value={getLookupSelectValue(
                  pendingNonIdoneoReason,
                  nonIdoneoReasonOptions,
                  EMPTY_SELECT_VALUE,
                )}
                onValueChange={(value) => {
                  const nextValue =
                    value === EMPTY_SELECT_VALUE
                      ? ""
                      : getLookupLabelForSave(value, nonIdoneoReasonOptions);
                  setPendingNonIdoneoReason(nextValue);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona motivazione" />
                </SelectTrigger>
                <SelectContent>
                  {nonIdoneoReasonOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusConfirm}
              disabled={isPendingNonIdoneo && !pendingNonIdoneoReason}
            >
              Conferma
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GateInfoCard>
  );
}

function GateAllowedWorkField({
  value,
  options,
  onChange,
}: {
  value: string[];
  options: Array<{ label: string; value: string }>;
  onChange: (values: string[]) => void;
}) {
  const anchor = useComboboxAnchor();
  const normalizedValue = React.useMemo(
    () => normalizeDomesticRoleLookupValues(value, options),
    [options, value],
  );

  return (
    <Combobox
      multiple
      autoHighlight
      items={options.map((option) => option.value)}
      value={normalizedValue}
      onValueChange={(nextValues) =>
        onChange(normalizeDomesticRoleDbLabels(nextValues as string[]))
      }
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values) => (
            <React.Fragment>
              {values.map((itemValue: string) => {
                return (
                  <ComboboxChip key={itemValue}>
                    {getLookupOptionLabel(options, itemValue)}
                  </ComboboxChip>
                );
              })}
              <ComboboxChipsInput placeholder="Seleziona lavori" />
            </React.Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor} className="max-h-80">
        <ComboboxEmpty>Nessun valore trovato.</ComboboxEmpty>
        <ComboboxList className="max-h-72 overflow-y-auto">
          {(item) => (
            <ComboboxItem key={item} value={item}>
              {getLookupOptionLabel(options, item)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function GateWorkTypesCard({
  workerId,
  haiReferenze,
  referenzeOptions,
  allowedWorks,
  allowedWorkOptions,
  isEditing,
  showReferencesField = false,
  showEditAction = false,
  onToggleEdit,
  onReferenzeChange,
  experienceDraft,
  selectedAnniEsperienzaColf,
  selectedAnniEsperienzaBadante,
  selectedAnniEsperienzaBabysitter,
  experiences,
  experiencesLoading,
  references,
  referencesLoading,
  lookupColorsByDomain,
  experienceTipoLavoroOptions,
  experienceTipoRapportoOptions,
  referenceStatusOptions,
  isUpdatingExperience,
  onAllowedWorksChange,
  onAnniEsperienzaColfChange,
  onAnniEsperienzaBadanteChange,
  onAnniEsperienzaBabysitterChange,
  onExperiencePatch,
  onExperienceCreate,
  onReferencePatch,
  onReferenceCreate,
}: {
  workerId: string | null;
  haiReferenze: string;
  referenzeOptions: Array<{ label: string; value: string }>;
  allowedWorks: string[];
  allowedWorkOptions: Array<{ label: string; value: string }>;
  isEditing: boolean;
  showReferencesField?: boolean;
  showEditAction?: boolean;
  onToggleEdit?: () => void;
  onReferenzeChange: (value: string) => void;
  experienceDraft: {
    anni_esperienza_colf: string;
    anni_esperienza_badante: string;
    anni_esperienza_babysitter: string;
    situazione_lavorativa_attuale: string;
  };
  selectedAnniEsperienzaColf: string;
  selectedAnniEsperienzaBadante: string;
  selectedAnniEsperienzaBabysitter: string;
  experiences: Parameters<typeof ExperienceReferencesCard>[0]["experiences"];
  experiencesLoading: boolean;
  references: Parameters<typeof ExperienceReferencesCard>[0]["references"];
  referencesLoading: boolean;
  lookupColorsByDomain: Map<string, string>;
  experienceTipoLavoroOptions: Array<{ label: string; value: string }>;
  experienceTipoRapportoOptions: Array<{ label: string; value: string }>;
  referenceStatusOptions: Array<{ label: string; value: string }>;
  isUpdatingExperience: boolean;
  onAllowedWorksChange: (values: string[]) => void;
  onAnniEsperienzaColfChange: (value: string) => void;
  onAnniEsperienzaBadanteChange: (value: string) => void;
  onAnniEsperienzaBabysitterChange: (value: string) => void;
  onExperiencePatch: Parameters<
    typeof ExperienceReferencesCard
  >[0]["onExperiencePatch"];
  onExperienceCreate: NonNullable<
    Parameters<typeof ExperienceReferencesCard>[0]["onExperienceCreate"]
  >;
  onReferencePatch: Parameters<
    typeof ExperienceReferencesCard
  >[0]["onReferencePatch"];
  onReferenceCreate: Parameters<
    typeof ExperienceReferencesCard
  >[0]["onReferenceCreate"];
}) {
  const allowedWorkLabels = React.useMemo(
    () => normalizeDomesticRoleLabels(allowedWorks),
    [allowedWorks],
  );

  return (
    <GateInfoCard
      title="Tipologia lavori"
      icon={<BadgeCheckIcon className="text-muted-foreground size-4" />}
      titleAction={
        showEditAction ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={
              isEditing
                ? "Termina modifica tipologia lavori"
                : "Modifica tipologia lavori"
            }
            title={
              isEditing
                ? "Termina modifica tipologia lavori"
                : "Modifica tipologia lavori"
            }
            onClick={onToggleEdit}
          >
            <PencilIcon />
          </Button>
        ) : undefined
      }
    >
      {showReferencesField ? (
        <div className="space-y-2">
          <p className="text-sm">Referenze verificabili</p>
          {isEditing ? (
            <Select
              value={getLookupSelectValue(
                haiReferenze,
                referenzeOptions,
                EMPTY_SELECT_VALUE,
              )}
              onValueChange={(value) =>
                onReferenzeChange(value === EMPTY_SELECT_VALUE ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona referenze" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT_VALUE}>Non indicato</SelectItem>
                {resolveLookupSingleValueOptions(haiReferenze, referenzeOptions).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="rounded-lg border bg-surface px-3 py-2 text-sm">
              {getLookupDisplayOption(referenzeOptions, haiReferenze)?.label ||
                haiReferenze ||
                "-"}
            </div>
          )}
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm">
          Quali lavori puo svolgere? (Assessment recruiter)
        </p>
        {isEditing ? (
          <GateAllowedWorkField
            value={allowedWorks}
            options={allowedWorkOptions}
            onChange={onAllowedWorksChange}
          />
        ) : allowedWorkLabels.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {allowedWorkLabels.map((label) => (
              <span
                key={label}
                className={`inline-flex items-center rounded-4xl border px-2.5 py-0.5 text-xs ${getTagClassName(
                  resolveLookupColor(
                    lookupColorsByDomain,
                    "lavoratori.tipo_lavoro_domestico",
                    label,
                  ),
                )}`}
              >
                {label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">-</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <p className="min-h-10 text-sm leading-5">
            Quanti anni di esperienza ha come Colf?
          </p>
          {isEditing ? (
            <Input
              type="number"
              min="0"
              step="1"
              value={selectedAnniEsperienzaColf}
              onChange={(event) =>
                onAnniEsperienzaColfChange(event.target.value)
              }
            />
          ) : (
            <div className="rounded-lg border bg-surface px-3 py-2 text-sm">
              {selectedAnniEsperienzaColf || "-"}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="min-h-10 text-sm leading-5">
            Quanti anni di esperienza ha come Babysitter?
          </p>
          {isEditing ? (
            <Input
              type="number"
              min="0"
              step="1"
              value={selectedAnniEsperienzaBabysitter}
              onChange={(event) =>
                onAnniEsperienzaBabysitterChange(event.target.value)
              }
            />
          ) : (
            <div className="rounded-lg border bg-surface px-3 py-2 text-sm">
              {selectedAnniEsperienzaBabysitter || "-"}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="min-h-10 text-sm leading-5">
            Quanti anni di esperienza ha come Badante?
          </p>
          {isEditing ? (
            <Input
              type="number"
              min="0"
              step="1"
              value={selectedAnniEsperienzaBadante}
              onChange={(event) =>
                onAnniEsperienzaBadanteChange(event.target.value)
              }
            />
          ) : (
            <div className="rounded-lg border bg-surface px-3 py-2 text-sm">
              {selectedAnniEsperienzaBadante || "-"}
            </div>
          )}
        </div>
      </div>

      <ExperienceReferencesCard
        workerId={workerId}
        title="Esperienze lavorative"
        showSummaryFields={false}
        showSituationField={false}
        isEditing={isEditing}
        showEditAction={false}
        showCreateExperienceAction={isEditing}
        isUpdating={isUpdatingExperience}
        experiences={experiences}
        experiencesLoading={experiencesLoading}
        references={references}
        referencesLoading={referencesLoading}
        lookupColorsByDomain={lookupColorsByDomain}
        experienceTipoLavoroOptions={experienceTipoLavoroOptions}
        experienceTipoRapportoOptions={experienceTipoRapportoOptions}
        referenceStatusOptions={referenceStatusOptions}
        selectedAnniEsperienzaColf={selectedAnniEsperienzaColf}
        selectedAnniEsperienzaBadante={selectedAnniEsperienzaBadante}
        selectedAnniEsperienzaBabysitter={selectedAnniEsperienzaBabysitter}
        selectedSituazioneLavorativaAttuale={
          experienceDraft.situazione_lavorativa_attuale
        }
        onToggleEdit={onToggleEdit ?? (() => {})}
        onAnniEsperienzaColfChange={onAnniEsperienzaColfChange}
        onAnniEsperienzaBadanteChange={onAnniEsperienzaBadanteChange}
        onAnniEsperienzaBabysitterChange={onAnniEsperienzaBabysitterChange}
        onSituazioneLavorativaAttualeChange={() => {}}
        onExperiencePatch={onExperiencePatch}
        onExperienceCreate={onExperienceCreate}
        onReferencePatch={onReferencePatch}
        onReferenceCreate={onReferenceCreate}
      />
    </GateInfoCard>
  );
}

function GateAcceptField({
  value,
  options,
  onChange,
  domain,
  lookupColorsByDomain,
  disabled = false,
}: {
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
  domain: string;
  lookupColorsByDomain: Map<string, string>;
  disabled?: boolean;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={onChange}
      className={disabled ? "gap-2 opacity-50" : "gap-2"}
      disabled={disabled}
    >
      {options.map((option) => (
        <label key={option.value} className="flex items-center gap-2 text-sm">
          <RadioGroupItem value={option.label} />
          <span
            className={`inline-flex items-center gap-1 rounded-4xl border px-2.5 py-0.5 text-xs ${getTagClassName(
              resolveLookupColor(lookupColorsByDomain, domain, option.label) ??
                (option.label === "Accetta"
                  ? "green"
                  : option.label === "Non accetta"
                    ? "orange"
                    : null),
            )}`}
          >
            {option.label === "Accetta" ? (
              <CheckIcon className="size-3.5" />
            ) : option.label === "Non accetta" ? (
              <XIcon className="size-3.5" />
            ) : null}
            {option.label}
          </span>
        </label>
      ))}
    </RadioGroup>
  );
}

function getLookupDisplayOption(
  options: Array<{ label: string; value: string }>,
  value: string,
) {
  return options.find(
    (option) => option.label === value || option.value === value,
  );
}

function GateLookupBadge({
  domain,
  value,
  options,
  lookupColorsByDomain,
}: {
  domain: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  lookupColorsByDomain: Map<string, string>;
}) {
  const activeOption = getLookupDisplayOption(options, value);
  const displayLabel = activeOption?.label ?? value;

  if (!displayLabel) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  return (
    <span
      className={`inline-flex items-center rounded-4xl border px-2.5 py-0.5 text-xs ${getTagClassName(
        resolveLookupColor(lookupColorsByDomain, domain, displayLabel),
      )}`}
    >
      {displayLabel}
    </span>
  );
}

function GateFieldLabelWithInfo({
  label,
  helperLines,
}: {
  label: string;
  helperLines?: string[];
}) {
  return (
    <div className="flex items-center gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      {helperLines?.length ? (
        <HoverCard openDelay={120}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground inline-flex size-4 items-center justify-center rounded-full transition-colors hover:text-foreground"
              aria-label={`Informazioni su ${label}`}
              title={`Informazioni su ${label}`}
            >
              <CircleHelpIcon className="size-3.5" />
            </button>
          </HoverCardTrigger>
          <HoverCardContent
            side="top"
            align="start"
            className="w-64 space-y-1 p-3 text-sm leading-6"
          >
            {helperLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </HoverCardContent>
        </HoverCard>
      ) : null}
    </div>
  );
}

function GateLevelSegmentedField({
  label,
  value,
  options,
  domain,
  isEditing,
  isUpdating,
  lookupColorsByDomain,
  onChange,
  persistMode = "label",
  helperLines,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  domain: string;
  isEditing: boolean;
  isUpdating: boolean;
  lookupColorsByDomain: Map<string, string>;
  onChange: (value: string) => void;
  persistMode?: "label" | "value";
  helperLines?: string[];
}) {
  const activeOption = getLookupDisplayOption(options, value);
  const normalizedValue =
    activeOption?.[persistMode === "value" ? "value" : "label"] ?? value;

  return (
    <div className="space-y-2">
      <GateFieldLabelWithInfo label={label} helperLines={helperLines} />
      {isEditing ? (
        <Select
          value={normalizedValue || EMPTY_SELECT_VALUE}
          onValueChange={(nextValue) =>
            onChange(nextValue === EMPTY_SELECT_VALUE ? "" : nextValue)
          }
          disabled={isUpdating}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona livello" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EMPTY_SELECT_VALUE}>Non indicato</SelectItem>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={persistMode === "value" ? option.value : option.label}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <GateLookupBadge
          domain={domain}
          value={value}
          options={options}
          lookupColorsByDomain={lookupColorsByDomain}
        />
      )}
    </div>
  );
}

function GateLookupConfirmationField({
  label,
  value,
  options,
  domain,
  isEditing,
  isUpdating,
  lookupColorsByDomain,
  onChange,
  persistMode = "label",
  placeholder = "Seleziona valore",
  helperLines,
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  domain: string;
  isEditing: boolean;
  isUpdating: boolean;
  lookupColorsByDomain: Map<string, string>;
  onChange: (value: string) => void;
  persistMode?: "label" | "value";
  placeholder?: string;
  helperLines?: string[];
}) {
  const activeOption = getLookupDisplayOption(options, value);
  const displayLabel = activeOption?.label ?? value;
  const selectValue = activeOption
    ? persistMode === "value"
      ? activeOption.value
      : activeOption.label
    : value || undefined;

  return (
    <div className="space-y-2">
      <GateFieldLabelWithInfo label={label} helperLines={helperLines} />
      {isEditing ? (
        <Select
          value={selectValue}
          onValueChange={(nextValue) => onChange(nextValue)}
          disabled={isUpdating}
        >
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={persistMode === "value" ? option.value : option.label}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex min-h-10 items-center rounded-lg border bg-surface px-3 py-2">
          {displayLabel ? (
            <span
              className={`inline-flex items-center rounded-4xl border px-2.5 py-0.5 text-xs ${getTagClassName(
                resolveLookupColor(lookupColorsByDomain, domain, displayLabel),
              )}`}
            >
              {displayLabel}
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>
      )}
    </div>
  );
}

function GateStarRatingField({
  label,
  description,
  value,
  isEditing,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  isEditing: boolean;
  onChange: (value: string) => void;
}) {
  const ratingScore = Number.parseInt(value, 10);
  const normalizedRatingScore = Number.isNaN(ratingScore) ? 0 : ratingScore;

  return (
    <div className="space-y-2">
      <p className="text-sm">{label}</p>
      <p className="text-muted-foreground text-sm italic">{description}</p>
      <div className="bg-background flex h-11 w-full items-center rounded-lg border px-3">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, index) => {
            const score = index + 1;
            const active = normalizedRatingScore >= score;

            return (
              <button
                key={score}
                type="button"
                className={isEditing ? "disabled:opacity-50" : "cursor-default"}
                disabled={!isEditing}
                onClick={() =>
                  onChange(normalizedRatingScore === score ? "" : String(score))
                }
              >
                <StarIcon
                  className={
                    active
                      ? "size-4 fill-amber-400 text-amber-400"
                      : "text-muted-foreground/35 size-4"
                  }
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GateSkillConfirmationsCard({
  isEditing,
  showEditAction = false,
  onToggleEdit,
  isUpdating,
  lookupColorsByDomain,
  livelloItalianoValue,
  livelloItalianoOptions,
  onLivelloItalianoChange,
  livelloIngleseValue,
  livelloIngleseOptions,
  onLivelloIngleseChange,
  livelloCucinaValue,
  livelloCucinaOptions,
  onLivelloCucinaChange,
  livelloStiroValue,
  livelloStiroOptions,
  onLivelloStiroChange,
  livelloPulizieValue,
  livelloPulizieOptions,
  onLivelloPulizieChange,
  livelloBabysittingValue,
  livelloBabysittingOptions,
  onLivelloBabysittingChange,
  livelloDogsittingValue,
  livelloDogsittingOptions,
  onLivelloDogsittingChange,
  livelloGiardinaggioValue,
  livelloGiardinaggioOptions,
  onLivelloGiardinaggioChange,
  compatibilitaStiroValue,
  compatibilitaStiroOptions,
  onCompatibilitaStiroChange,
  compatibilitaCucinaValue,
  compatibilitaCucinaOptions,
  onCompatibilitaCucinaChange,
  compatibilitaNeonatiValue,
  compatibilitaNeonatiOptions,
  onCompatibilitaNeonatiChange,
  ratingAtteggiamentoValue,
  onRatingAtteggiamentoChange,
  ratingCuraPersonaleValue,
  onRatingCuraPersonaleChange,
  ratingPrecisionePuntualitaValue,
  onRatingPrecisionePuntualitaChange,
  ratingCapacitaComunicativeValue,
  onRatingCapacitaComunicativeChange,
  ratingCorporaturaValue,
  ratingCorporaturaOptions,
  onRatingCorporaturaChange,
  compatibilitaFamiglieNumeroseValue,
  compatibilitaFamiglieNumeroseOptions,
  onCompatibilitaFamiglieNumeroseChange,
  compatibilitaFamiglieMoltoEsigentiValue,
  compatibilitaFamiglieMoltoEsigentiOptions,
  onCompatibilitaFamiglieMoltoEsigentiChange,
  compatibilitaDatorePresenteValue,
  compatibilitaDatorePresenteOptions,
  onCompatibilitaDatorePresenteChange,
  compatibilitaCaseGrandiValue,
  compatibilitaCaseGrandiOptions,
  onCompatibilitaCaseGrandiChange,
  compatibilitaAnimaliValue,
  compatibilitaAnimaliOptions,
  onCompatibilitaAnimaliChange,
  compatibilitaAutonomiaValue,
  compatibilitaAutonomiaOptions,
  onCompatibilitaAutonomiaChange,
  compatibilitaContestiPacatiValue,
  compatibilitaContestiPacatiOptions,
  onCompatibilitaContestiPacatiChange,
}: {
  isEditing: boolean;
  showEditAction?: boolean;
  onToggleEdit?: () => void;
  isUpdating: boolean;
  lookupColorsByDomain: Map<string, string>;
  livelloItalianoValue: string;
  livelloItalianoOptions: Array<{ label: string; value: string }>;
  onLivelloItalianoChange: (value: string) => void;
  livelloIngleseValue: string;
  livelloIngleseOptions: Array<{ label: string; value: string }>;
  onLivelloIngleseChange: (value: string) => void;
  livelloCucinaValue: string;
  livelloCucinaOptions: Array<{ label: string; value: string }>;
  onLivelloCucinaChange: (value: string) => void;
  livelloStiroValue: string;
  livelloStiroOptions: Array<{ label: string; value: string }>;
  onLivelloStiroChange: (value: string) => void;
  livelloPulizieValue: string;
  livelloPulizieOptions: Array<{ label: string; value: string }>;
  onLivelloPulizieChange: (value: string) => void;
  livelloBabysittingValue: string;
  livelloBabysittingOptions: Array<{ label: string; value: string }>;
  onLivelloBabysittingChange: (value: string) => void;
  livelloDogsittingValue: string;
  livelloDogsittingOptions: Array<{ label: string; value: string }>;
  onLivelloDogsittingChange: (value: string) => void;
  livelloGiardinaggioValue: string;
  livelloGiardinaggioOptions: Array<{ label: string; value: string }>;
  onLivelloGiardinaggioChange: (value: string) => void;
  compatibilitaStiroValue: string;
  compatibilitaStiroOptions: Array<{ label: string; value: string }>;
  onCompatibilitaStiroChange: (value: string) => void;
  compatibilitaCucinaValue: string;
  compatibilitaCucinaOptions: Array<{ label: string; value: string }>;
  onCompatibilitaCucinaChange: (value: string) => void;
  compatibilitaNeonatiValue: string;
  compatibilitaNeonatiOptions: Array<{ label: string; value: string }>;
  onCompatibilitaNeonatiChange: (value: string) => void;
  ratingAtteggiamentoValue: string;
  onRatingAtteggiamentoChange: (value: string) => void;
  ratingCuraPersonaleValue: string;
  onRatingCuraPersonaleChange: (value: string) => void;
  ratingPrecisionePuntualitaValue: string;
  onRatingPrecisionePuntualitaChange: (value: string) => void;
  ratingCapacitaComunicativeValue: string;
  onRatingCapacitaComunicativeChange: (value: string) => void;
  ratingCorporaturaValue: string;
  ratingCorporaturaOptions: Array<{ label: string; value: string }>;
  onRatingCorporaturaChange: (value: string) => void;
  compatibilitaFamiglieNumeroseValue: string;
  compatibilitaFamiglieNumeroseOptions: Array<{ label: string; value: string }>;
  onCompatibilitaFamiglieNumeroseChange: (value: string) => void;
  compatibilitaFamiglieMoltoEsigentiValue: string;
  compatibilitaFamiglieMoltoEsigentiOptions: Array<{
    label: string;
    value: string;
  }>;
  onCompatibilitaFamiglieMoltoEsigentiChange: (value: string) => void;
  compatibilitaDatorePresenteValue: string;
  compatibilitaDatorePresenteOptions: Array<{ label: string; value: string }>;
  onCompatibilitaDatorePresenteChange: (value: string) => void;
  compatibilitaCaseGrandiValue: string;
  compatibilitaCaseGrandiOptions: Array<{ label: string; value: string }>;
  onCompatibilitaCaseGrandiChange: (value: string) => void;
  compatibilitaAnimaliValue: string;
  compatibilitaAnimaliOptions: Array<{ label: string; value: string }>;
  onCompatibilitaAnimaliChange: (value: string) => void;
  compatibilitaAutonomiaValue: string;
  compatibilitaAutonomiaOptions: Array<{ label: string; value: string }>;
  onCompatibilitaAutonomiaChange: (value: string) => void;
  compatibilitaContestiPacatiValue: string;
  compatibilitaContestiPacatiOptions: Array<{ label: string; value: string }>;
  onCompatibilitaContestiPacatiChange: (value: string) => void;
}) {
  return (
    <GateInfoCard
      title="Competenze"
      icon={<ShieldCheckIcon className="text-muted-foreground size-4" />}
      titleAction={
        showEditAction ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={
              isEditing ? "Termina modifica competenze" : "Modifica competenze"
            }
            title={
              isEditing ? "Termina modifica competenze" : "Modifica competenze"
            }
            onClick={onToggleEdit}
          >
            <PencilIcon />
          </Button>
        ) : undefined
      }
    >
      <DetailSectionCard
        title="Lingue"
        className="border-border/60"
        contentClassName="space-y-4"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <GateLevelSegmentedField
            label="Conferma livello italiano"
            value={livelloItalianoValue}
            options={livelloItalianoOptions}
            domain="lavoratori.livello_italiano"
            isEditing={isEditing}
            isUpdating={isUpdating}
            lookupColorsByDomain={lookupColorsByDomain}
            onChange={onLivelloItalianoChange}
            persistMode="value"
          />
          <GateLevelSegmentedField
            label="Conferma livello inglese"
            value={livelloIngleseValue}
            options={livelloIngleseOptions}
            domain="lavoratori.livello_inglese"
            isEditing={isEditing}
            isUpdating={isUpdating}
            lookupColorsByDomain={lookupColorsByDomain}
            onChange={onLivelloIngleseChange}
          />
        </div>
      </DetailSectionCard>

      <DetailSectionCard
        title="Casa"
        className="border-border/60"
        contentClassName="space-y-4"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <GateLevelSegmentedField
            label="Conferma livello cucina"
            value={livelloCucinaValue}
            options={livelloCucinaOptions}
            domain="lavoratori.livello_cucina"
            isEditing={isEditing}
            isUpdating={isUpdating}
            lookupColorsByDomain={lookupColorsByDomain}
            onChange={onLivelloCucinaChange}
            helperLines={[
              "Basso = Non cucina",
              "Medio = Cucina solo base",
              "Alto = Sa cucinare molto bene",
            ]}
          />
          <GateLevelSegmentedField
            label="Conferma livello stiro"
            value={livelloStiroValue}
            options={livelloStiroOptions}
            domain="lavoratori.livello_stiro"
            isEditing={isEditing}
            isUpdating={isUpdating}
            lookupColorsByDomain={lookupColorsByDomain}
            onChange={onLivelloStiroChange}
            helperLines={[
              "Basso = Non stira",
              "Medio = Stiro solo semplice",
              "Alto = Stira bene camicie",
            ]}
          />
          <GateLevelSegmentedField
            label="Conferma livello pulizie"
            value={livelloPulizieValue}
            options={livelloPulizieOptions}
            domain="lavoratori.livello_pulizie"
            isEditing={isEditing}
            isUpdating={isUpdating}
            lookupColorsByDomain={lookupColorsByDomain}
            onChange={onLivelloPulizieChange}
          />
        </div>
      </DetailSectionCard>

      <DetailSectionCard
        title="Servizi"
        className="border-border/60"
        contentClassName="space-y-4"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <GateLevelSegmentedField
            label="Conferma livello babysitting"
            value={livelloBabysittingValue}
            options={livelloBabysittingOptions}
            domain="lavoratori.livello_babysitting"
            isEditing={isEditing}
            isUpdating={isUpdating}
            lookupColorsByDomain={lookupColorsByDomain}
            onChange={onLivelloBabysittingChange}
          />
          <GateLevelSegmentedField
            label="Conferma livello dogsitting"
            value={livelloDogsittingValue}
            options={livelloDogsittingOptions}
            domain="lavoratori.livello_dogsitting"
            isEditing={isEditing}
            isUpdating={isUpdating}
            lookupColorsByDomain={lookupColorsByDomain}
            onChange={onLivelloDogsittingChange}
          />
          <GateLevelSegmentedField
            label="Conferma livello giardinaggio"
            value={livelloGiardinaggioValue}
            options={livelloGiardinaggioOptions}
            domain="lavoratori.livello_giardinaggio"
            isEditing={isEditing}
            isUpdating={isUpdating}
            lookupColorsByDomain={lookupColorsByDomain}
            onChange={onLivelloGiardinaggioChange}
          />
        </div>
      </DetailSectionCard>

      <DetailSectionCard
        title="Consigliata da Baze"
        className="border-border/60"
        contentClassName="space-y-4"
      >
        <SkillsChoiceMatrix
          isEditing={isEditing}
          isUpdating={isUpdating}
          lookupColorsByDomain={lookupColorsByDomain}
          rows={[
            {
              field: "compatibilita_con_stiro_esigente",
              label:
                "La consiglieresti per un lavoro dove e richiesto un alto livello di stiratura?",
              domain: "lavoratori.compatibilita_con_stiro_esigente",
              value: compatibilitaStiroValue,
              options: compatibilitaStiroOptions,
            },
            {
              field: "compatibilita_con_cucina_strutturata",
              label:
                "La consiglieresti per un lavoro in cui e richiesta capacita culinaria elevata?",
              domain: "lavoratori.compatibilita_con_cucina_strutturata",
              value: compatibilitaCucinaValue,
              options: compatibilitaCucinaOptions,
            },
            {
              field: "compatibilita_babysitting_neonati",
              label:
                "La consiglieresti per lavori dove deve accudire bambini neonati?",
              domain: "lavoratori.compatibilita_babysitting_neonati",
              value: compatibilitaNeonatiValue,
              options: compatibilitaNeonatiOptions,
            },
          ]}
          onFieldChange={(field, value) => {
            if (field === "compatibilita_con_stiro_esigente") {
              onCompatibilitaStiroChange(value);
              return;
            }

            if (field === "compatibilita_con_cucina_strutturata") {
              onCompatibilitaCucinaChange(value);
              return;
            }

            if (field === "compatibilita_babysitting_neonati") {
              onCompatibilitaNeonatiChange(value);
            }
          }}
        />
      </DetailSectionCard>

      <DetailSectionCard
        title="Standing e colloquio"
        className="border-border/60"
        contentClassName="space-y-4"
      >
        <GateStarRatingField
          label="Valuta l'atteggiamento / Standing"
          description="Valuta educazione, rispetto, postura e modo di porsi durante il colloquio."
          value={ratingAtteggiamentoValue}
          isEditing={isEditing}
          onChange={onRatingAtteggiamentoChange}
        />
        <GateStarRatingField
          label="Valuta la cura personale"
          description="Valuta l'attenzione dimostrata verso pulizia, ordine, cura personale e vestiario."
          value={ratingCuraPersonaleValue}
          isEditing={isEditing}
          onChange={onRatingCuraPersonaleChange}
        />
        <GateStarRatingField
          label="Valuta la precisione / puntualita"
          description="Valutazione su affidabilita e rispetto di orari e impegni."
          value={ratingPrecisionePuntualitaValue}
          isEditing={isEditing}
          onChange={onRatingPrecisionePuntualitaChange}
        />
        <GateStarRatingField
          label="Valuta la sua capacita comunicativa"
          description="Valuta la capacita di esprimersi e capire in modo chiaro e comprensibile in italiano."
          value={ratingCapacitaComunicativeValue}
          isEditing={isEditing}
          onChange={onRatingCapacitaComunicativeChange}
        />
        <div className="max-w-3xl">
          <GateLookupConfirmationField
            label="Che tipo di corporatura ha?"
            value={ratingCorporaturaValue}
            options={ratingCorporaturaOptions}
            domain="lavoratori.rating_corporatura"
            isEditing={isEditing}
            isUpdating={isUpdating}
            lookupColorsByDomain={lookupColorsByDomain}
            onChange={onRatingCorporaturaChange}
            persistMode="value"
            placeholder="Seleziona corporatura"
          />
        </div>
      </DetailSectionCard>

      <DetailSectionCard
        title="Contesti consigliati"
        className="border-border/60"
        contentClassName="space-y-4"
      >
        <div className="text-muted-foreground space-y-3 text-sm leading-6">
          <p>
            Qui non stai valutando se può lavorare, ma se la consiglieresti in
            questi contesti.
          </p>
          <blockquote className="border-l-2 pl-3">
            Usa le informazioni emerse da esperienze, test e osservazione.
          </blockquote>
          <p>Se non hai elementi sufficienti, lascia il campo non compilato.</p>
        </div>

        <SkillsChoiceMatrix
          isEditing={isEditing}
          isUpdating={isUpdating}
          lookupColorsByDomain={lookupColorsByDomain}
          rows={[
            {
              field: "compatibilita_famiglie_numerose",
              label:
                "La consiglieresti per lavori dove la famiglia e numerosa (es. 4+ persone)",
              domain: "lavoratori.compatibilita_famiglie_numerose",
              value: compatibilitaFamiglieNumeroseValue,
              options: compatibilitaFamiglieNumeroseOptions,
            },
            {
              field: "compatibilita_famiglie_molto_esigenti",
              label:
                "La consiglieresti per un contesto di alto livello o dove la famiglia e molto esigente?",
              domain: "lavoratori.compatibilita_famiglie_molto_esigenti",
              value: compatibilitaFamiglieMoltoEsigentiValue,
              options: compatibilitaFamiglieMoltoEsigentiOptions,
            },
            {
              field: "compatibilita_lavoro_con_datore_presente_in_casa",
              label:
                "La consiglieresti per un lavoro dove il datore e sempre in casa e le sta dietro?",
              domain:
                "lavoratori.compatibilita_lavoro_con_datore_presente_in_casa",
              value: compatibilitaDatorePresenteValue,
              options: compatibilitaDatorePresenteOptions,
            },
            {
              field: "compatibilita_con_case_di_grandi_dimensioni",
              label:
                "La consiglieresti per lavorare in una casa di grandi dimensioni (200+ mq)",
              domain: "lavoratori.compatibilita_con_case_di_grandi_dimensioni",
              value: compatibilitaCaseGrandiValue,
              options: compatibilitaCaseGrandiOptions,
            },
            {
              field: "compatibilita_con_animali_in_casa",
              label:
                "La consiglieresti per un lavoro dove ci sono animali in casa?",
              domain: "lavoratori.compatibilita_con_animali_in_casa",
              value: compatibilitaAnimaliValue,
              options: compatibilitaAnimaliOptions,
            },
            {
              field: "compatibilita_con_elevata_autonomia_richiesta",
              label:
                "La consiglieresti per un contesto dove e richiesta totale autonomia?",
              domain:
                "lavoratori.compatibilita_con_elevata_autonomia_richiesta",
              value: compatibilitaAutonomiaValue,
              options: compatibilitaAutonomiaOptions,
            },
            {
              field: "compatibilita_con_contesti_pacati",
              label:
                "La consiglieresti per un contesto dove e richiesta pacatezza e silenzio?",
              domain: "lavoratori.compatibilita_con_contesti_pacati",
              value: compatibilitaContestiPacatiValue,
              options: compatibilitaContestiPacatiOptions,
            },
          ]}
          onFieldChange={(field, value) => {
            if (field === "compatibilita_famiglie_numerose") {
              onCompatibilitaFamiglieNumeroseChange(value);
              return;
            }

            if (field === "compatibilita_famiglie_molto_esigenti") {
              onCompatibilitaFamiglieMoltoEsigentiChange(value);
              return;
            }

            if (field === "compatibilita_lavoro_con_datore_presente_in_casa") {
              onCompatibilitaDatorePresenteChange(value);
              return;
            }

            if (field === "compatibilita_con_case_di_grandi_dimensioni") {
              onCompatibilitaCaseGrandiChange(value);
              return;
            }

            if (field === "compatibilita_con_animali_in_casa") {
              onCompatibilitaAnimaliChange(value);
              return;
            }

            if (field === "compatibilita_con_elevata_autonomia_richiesta") {
              onCompatibilitaAutonomiaChange(value);
              return;
            }

            if (field === "compatibilita_con_contesti_pacati") {
              onCompatibilitaContestiPacatiChange(value);
            }
          }}
        />
      </DetailSectionCard>
    </GateInfoCard>
  );
}

function GateBazeChecksCard({
  isEditing,
  showEditAction = false,
  onToggleEdit,
  funzionamentoBaze,
  funzionamentoBazeOptions,
  paga9,
  paga9Options,
  pagaOrariaRichiesta,
  multipliContratti,
  multipliContrattiOptions,
  dataScadenzaNaspi,
  lookupColorsByDomain,
  onFunzionamentoBazeChange,
  onPaga9Change,
  onPagaOrariaRichiestaChange,
  onMultipliContrattiChange,
  onDataScadenzaNaspiChange,
}: {
  isEditing: boolean;
  showEditAction?: boolean;
  onToggleEdit?: () => void;
  funzionamentoBaze: string;
  funzionamentoBazeOptions: Array<{ label: string; value: string }>;
  paga9: string;
  paga9Options: Array<{ label: string; value: string }>;
  pagaOrariaRichiesta: string;
  multipliContratti: string;
  multipliContrattiOptions: Array<{ label: string; value: string }>;
  dataScadenzaNaspi: string;
  lookupColorsByDomain: Map<string, string>;
  onFunzionamentoBazeChange: (value: string) => void;
  onPaga9Change: (value: string) => void;
  onPagaOrariaRichiestaChange: (value: string) => void;
  onMultipliContrattiChange: (value: string) => void;
  onDataScadenzaNaspiChange: (value: string) => void;
}) {
  const isPagaMinimaDisabled = paga9 === "Accetta";

  return (
    <GateInfoCard
      title="Check disponibilita lavori con Baze"
      icon={<CalendarDaysIcon className="text-muted-foreground size-4" />}
      titleAction={
        showEditAction ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={
              isEditing
                ? "Termina modifica check disponibilita Baze"
                : "Modifica check disponibilita Baze"
            }
            title={
              isEditing
                ? "Termina modifica check disponibilita Baze"
                : "Modifica check disponibilita Baze"
            }
            onClick={onToggleEdit}
          >
            <PencilIcon />
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-2">
        <p className="text-sm">Accetta funzionamento Baze?</p>
        {isEditing ? (
          <GateAcceptField
            value={funzionamentoBaze}
            options={funzionamentoBazeOptions}
            onChange={onFunzionamentoBazeChange}
            domain="lavoratori.check_accetta_funzionamento_baze"
            lookupColorsByDomain={lookupColorsByDomain}
          />
        ) : (
          <GateLookupBadge
            domain="lavoratori.check_accetta_funzionamento_baze"
            value={funzionamentoBaze}
            options={funzionamentoBazeOptions}
            lookupColorsByDomain={lookupColorsByDomain}
          />
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,34rem)_minmax(0,22rem)] lg:items-start">
        <div className="space-y-2">
          <p className="text-sm">
            Accetta di guadagnare 9€ netti (13,30€ lordi) con i lavori di Baze?
          </p>
          {isEditing ? (
            <GateAcceptField
              value={paga9}
              options={paga9Options}
              onChange={onPaga9Change}
              domain="lavoratori.check_accetta_paga_9_euro_netti"
              lookupColorsByDomain={lookupColorsByDomain}
            />
          ) : (
            <GateLookupBadge
              domain="lavoratori.check_accetta_paga_9_euro_netti"
              value={paga9}
              options={paga9Options}
              lookupColorsByDomain={lookupColorsByDomain}
            />
          )}
        </div>
        <div
          className={
            isPagaMinimaDisabled ? "space-y-2 opacity-50" : "space-y-2"
          }
        >
          <p className="text-sm">
            Non accetta 9€ netti? Indica qui la paga oraria netta minima che
            richiede
          </p>
          {isEditing ? (
            <Input
              type="number"
              min="0"
              step="0.5"
              value={pagaOrariaRichiesta}
              onChange={(event) =>
                onPagaOrariaRichiestaChange(event.target.value)
              }
              disabled={isPagaMinimaDisabled}
              placeholder="Inserisci paga oraria"
            />
          ) : (
            <div className="rounded-lg border bg-surface px-3 py-2 text-sm">
              {pagaOrariaRichiesta || "-"}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm">Accetta di avere piu contratti?</p>
        {isEditing ? (
          <GateAcceptField
            value={multipliContratti}
            options={multipliContrattiOptions}
            onChange={onMultipliContrattiChange}
            domain="lavoratori.check_accetta_multipli_contratti"
            lookupColorsByDomain={lookupColorsByDomain}
          />
        ) : (
          <GateLookupBadge
            domain="lavoratori.check_accetta_multipli_contratti"
            value={multipliContratti}
            options={multipliContrattiOptions}
            lookupColorsByDomain={lookupColorsByDomain}
          />
        )}
      </div>

      <div className="space-y-2 max-w-xs">
        <p className="text-sm">Ha la Naspi? Indica la data in cui le scade</p>
        {isEditing ? (
          <Input
            type="date"
            value={dataScadenzaNaspi}
            onChange={(event) => onDataScadenzaNaspiChange(event.target.value)}
          />
        ) : (
          <div className="rounded-lg border bg-surface px-3 py-2 text-sm">
            {dataScadenzaNaspi || "-"}
          </div>
        )}
      </div>
    </GateInfoCard>
  );
}

function GateSpecificChecksCard({
  mobilityValue,
  mobilityOptions,
  mobilityAnchor,
  isUpdatingMobility = false,
  isBabysitterEnabled,
  neonatiValue,
  neonatiOptions,
  multipliBambiniValue,
  multipliBambiniOptions,
  caniValue,
  caniOptions,
  caniGrandiValue,
  caniGrandiOptions,
  gattiValue,
  gattiOptions,
  scaleValue,
  scaleOptions,
  trasfertaValue,
  trasfertaOptions,
  lookupColorsByDomain,
  onMobilityChange,
  onNeonatiChange,
  onMultipliBambiniChange,
  onCaniChange,
  onCaniGrandiChange,
  onGattiChange,
  onScaleChange,
  onTrasfertaChange,
}: {
  mobilityValue?: string[];
  mobilityOptions?: Array<{ label: string; value: string }>;
  mobilityAnchor?: React.RefObject<HTMLDivElement | null>;
  isUpdatingMobility?: boolean;
  isBabysitterEnabled: boolean;
  neonatiValue: string;
  neonatiOptions: Array<{ label: string; value: string }>;
  multipliBambiniValue: string;
  multipliBambiniOptions: Array<{ label: string; value: string }>;
  caniValue: string;
  caniOptions: Array<{ label: string; value: string }>;
  caniGrandiValue: string;
  caniGrandiOptions: Array<{ label: string; value: string }>;
  gattiValue: string;
  gattiOptions: Array<{ label: string; value: string }>;
  scaleValue: string;
  scaleOptions: Array<{ label: string; value: string }>;
  trasfertaValue: string;
  trasfertaOptions: Array<{ label: string; value: string }>;
  lookupColorsByDomain: Map<string, string>;
  onMobilityChange?: (values: string[]) => void;
  onNeonatiChange: (value: string) => void;
  onMultipliBambiniChange: (value: string) => void;
  onCaniChange: (value: string) => void;
  onCaniGrandiChange: (value: string) => void;
  onGattiChange: (value: string) => void;
  onScaleChange: (value: string) => void;
  onTrasfertaChange: (value: string) => void;
}) {
  const showMobility = mobilityValue && mobilityOptions && mobilityAnchor && onMobilityChange;

  return (
    <GateInfoCard
      title="Check disponibilita aspetti specifici"
      icon={<ShieldCheckIcon className="text-muted-foreground size-4" />}
    >
      {showMobility ? (
        <div className="space-y-2">
          <p className="text-sm">Mobilita</p>
          <Combobox
            multiple
            autoHighlight
            items={mobilityOptions.map((option) => option.value)}
            value={normalizeLookupOptionValues(mobilityValue, mobilityOptions)}
            onValueChange={(nextValues) =>
              onMobilityChange(
                normalizeLookupDbLabels(nextValues as string[], mobilityOptions),
              )
            }
            disabled={isUpdatingMobility}
          >
            <ComboboxChips ref={mobilityAnchor} className="w-full">
              <ComboboxValue>
                {(values) => (
                  <React.Fragment>
                    {values.map((value: string) => (
                      <ComboboxChip key={value}>
                        {getLookupOptionLabel(mobilityOptions, value)}
                      </ComboboxChip>
                    ))}
                    <ComboboxChipsInput placeholder="Seleziona opzioni" />
                  </React.Fragment>
                )}
              </ComboboxValue>
            </ComboboxChips>
            <ComboboxContent anchor={mobilityAnchor} className="max-h-80">
              <ComboboxEmpty>Nessuna opzione trovata.</ComboboxEmpty>
              <ComboboxList className="max-h-72 overflow-y-auto">
                {(item) => (
                  <ComboboxItem key={item} value={item}>
                    {getLookupOptionLabel(mobilityOptions, item)}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className={isBabysitterEnabled ? "text-sm" : "text-sm opacity-50"}>
          Accetta lavori di babysitting con neonati?
        </p>
        <GateAcceptField
          value={neonatiValue}
          options={neonatiOptions}
          onChange={onNeonatiChange}
          domain="lavoratori.check_accetta_babysitting_neonati"
          lookupColorsByDomain={lookupColorsByDomain}
          disabled={!isBabysitterEnabled}
        />
      </div>

      <div className="space-y-2">
        <p className={isBabysitterEnabled ? "text-sm" : "text-sm opacity-50"}>
          Accetta lavori di babysitting con piu di un bambino?
        </p>
        <GateAcceptField
          value={multipliBambiniValue}
          options={multipliBambiniOptions}
          onChange={onMultipliBambiniChange}
          domain="lavoratori.check_accetta_babysitting_multipli_bambini"
          lookupColorsByDomain={lookupColorsByDomain}
          disabled={!isBabysitterEnabled}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm">
          Accetta lavori in cui sono presenti cani in casa?
        </p>
        <GateAcceptField
          value={caniValue}
          options={caniOptions}
          onChange={onCaniChange}
          domain="lavoratori.check_accetta_case_con_cani"
          lookupColorsByDomain={lookupColorsByDomain}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm">
          Accetta anche se i cani sono grandi? (Pastori tedeschi, Rottweiler,
          Pitbul ...)
        </p>
        <GateAcceptField
          value={caniGrandiValue}
          options={caniGrandiOptions}
          onChange={onCaniGrandiChange}
          domain="lavoratori.check_accetta_case_con_cani_grandi"
          lookupColorsByDomain={lookupColorsByDomain}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm">
          Accetta lavori in cui sono presenti gatti in casa?
        </p>
        <GateAcceptField
          value={gattiValue}
          options={gattiOptions}
          onChange={onGattiChange}
          domain="lavoratori.check_accetta_case_con_gatti"
          lookupColorsByDomain={lookupColorsByDomain}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm">
          Accetta lavori in cui deve salire sulle scale o pulire soffitti alti?
        </p>
        <GateAcceptField
          value={scaleValue}
          options={scaleOptions}
          onChange={onScaleChange}
          domain="lavoratori.check_accetta_salire_scale_o_soffitti_alti"
          lookupColorsByDomain={lookupColorsByDomain}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm">
          Accetta lavori in cui sono richieste delle trasferte?
        </p>
        <GateAcceptField
          value={trasfertaValue}
          options={trasfertaOptions}
          onChange={onTrasfertaChange}
          domain="lavoratori.check_accetta_lavori_con_trasferta"
          lookupColorsByDomain={lookupColorsByDomain}
        />
      </div>
    </GateInfoCard>
  );
}

function GateSelfCertificationCard({
  documentiInRegola,
  haiReferenze,
  documentiOptions,
  referenzeOptions,
  onDocumentiChange,
  onReferenzeChange,
}: {
  documentiInRegola: string;
  haiReferenze: string;
  documentiOptions: Array<{ label: string; value: string }>;
  referenzeOptions: Array<{ label: string; value: string }>;
  onDocumentiChange: (value: string) => void;
  onReferenzeChange: (value: string) => void;
}) {
  return (
    <GateInfoCard
      title="Autocertificazioni chiave"
      icon={<FileSearchIcon className="text-muted-foreground size-4" />}
    >
      <div className="grid gap-4">
        <div className="space-y-2">
          <p className="text-sm">Documenti (Autocertificazione)</p>
          <Select
            value={getLookupSelectValue(
              documentiInRegola,
              documentiOptions,
              EMPTY_SELECT_VALUE,
            )}
            onValueChange={(value) =>
              onDocumentiChange(value === EMPTY_SELECT_VALUE ? "" : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona stato documenti" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPTY_SELECT_VALUE}>Non indicato</SelectItem>
              {resolveLookupSingleValueOptions(documentiInRegola, documentiOptions).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm">Referenze verificabili (Autocertificazione)</p>
          <Select
            value={getLookupSelectValue(
              haiReferenze,
              referenzeOptions,
              EMPTY_SELECT_VALUE,
            )}
            onValueChange={(value) =>
              onReferenzeChange(value === EMPTY_SELECT_VALUE ? "" : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona referenze" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPTY_SELECT_VALUE}>Non indicato</SelectItem>
              {resolveLookupSingleValueOptions(haiReferenze, referenzeOptions).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </GateInfoCard>
  );
}

function GateAdministrativeFieldsCard({
  ibanValue,
  stripeAccountValue,
  isEditing,
  isUpdating,
  missingStripeRequirements = [],
  onIbanChange,
  onGenerateStripeAccount,
}: {
  ibanValue: string;
  stripeAccountValue: string;
  isEditing: boolean;
  isUpdating: boolean;
  missingStripeRequirements?: string[];
  onIbanChange: (value: string) => void;
  onGenerateStripeAccount?: () => void | Promise<unknown>;
}) {
  const resolvedStripeAccountValue = stripeAccountValue.trim();
  const stripeRequirements = missingStripeRequirements;
  const canGenerateStripeAccount =
    Boolean(onGenerateStripeAccount) && !resolvedStripeAccountValue;
  const isGenerateStripeAccountDisabled =
    isUpdating || stripeRequirements.length > 0;

  return (
    <GateInfoCard
      title="Dati amministrativi"
      icon={<NotebookPenIcon className="text-muted-foreground size-4" />}
    >
      <div className="space-y-3">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm">IBAN</p>
            {isEditing ? (
              <Input
                value={ibanValue}
                onChange={(event) => onIbanChange(event.target.value)}
                placeholder="Inserisci IBAN"
              />
            ) : (
              <div className="rounded-lg border bg-surface px-3 py-2 text-sm">
                {ibanValue || "-"}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm">ID account Stripe</p>
            <div className="rounded-lg border bg-surface px-3 py-2 text-sm">
              {stripeAccountValue || "-"}
            </div>
          </div>
        </div>

        {canGenerateStripeAccount ? (
          <div className="flex flex-col gap-2 rounded-xl border border-dashed bg-surface px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Account Stripe mancante</p>
              {stripeRequirements.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-2">
                  {stripeRequirements.map((requirement) => (
                    <span
                      key={requirement}
                      className="inline-flex items-center gap-1 text-xs font-medium text-red-600"
                    >
                      <CircleSlashIcon className="size-3.5" />
                      {requirement}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => void onGenerateStripeAccount?.()}
              disabled={isGenerateStripeAccountDisabled}
            >
              {isUpdating ? (
                <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
              ) : null}
              {isUpdating ? "Creazione..." : "Genera account Stripe"}
            </Button>
          </div>
        ) : null}
      </div>
    </GateInfoCard>
  );
}

function GateDocumentIdentityCard({
  headerDraft,
  nazionalitaOptions,
  isEditing,
  onHeaderChange,
}: {
  headerDraft: {
    nome: string;
    cognome: string;
    nazionalita: string;
    data_di_nascita: string;
  };
  nazionalitaOptions: Array<{ label: string; value: string }>;
  isEditing: boolean;
  onHeaderChange: (field: string, value: string) => void;
}) {
  const resolvedNazionalitaOptions = resolveLookupSingleValueOptions(
    headerDraft.nazionalita,
    nazionalitaOptions,
  );
  const canUseNazionalitaSelect = resolvedNazionalitaOptions.length > 0;

  return (
    <GateInfoCard
      title="Verifica anagrafica"
      icon={<CircleUserRoundIcon className="text-muted-foreground size-4" />}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm">Verifica che il nome sia corretto</p>
          <Input
            value={headerDraft.nome}
            onChange={(event) => onHeaderChange("nome", event.target.value)}
            disabled={!isEditing}
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm">Verifica che il cognome sia corretto</p>
          <Input
            value={headerDraft.cognome}
            onChange={(event) => onHeaderChange("cognome", event.target.value)}
            disabled={!isEditing}
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm">Verifica la data di nascita</p>
          <Input
            type="date"
            value={headerDraft.data_di_nascita}
            onChange={(event) =>
              onHeaderChange("data_di_nascita", event.target.value)
            }
            disabled={!isEditing}
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm">Verifica la nazionalita</p>
          {canUseNazionalitaSelect ? (
            <Select
              value={getLookupSelectValue(
                headerDraft.nazionalita,
                resolvedNazionalitaOptions,
                EMPTY_SELECT_VALUE,
              )}
              onValueChange={(value) => {
                onHeaderChange(
                  "nazionalita",
                  value === EMPTY_SELECT_VALUE ? "" : value,
                );
              }}
              disabled={!isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona nazionalita" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT_VALUE}>Non indicata</SelectItem>
                {resolvedNazionalitaOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={headerDraft.nazionalita}
              onChange={(event) =>
                onHeaderChange("nazionalita", event.target.value)
              }
              disabled={!isEditing}
            />
          )}
        </div>
      </div>
    </GateInfoCard>
  );
}

function GateShiftPreferencesCard({
  isEditing,
  showEditAction = false,
  onToggleEdit,
  lookupColorsByDomain,
  tipoRapportoLavorativo,
  tipoRapportoOptions,
  lavoriAccettabili,
  lavoriAccettabiliOptions,
  disponibilitaNelGiorno,
  disponibilitaNelGiornoOptions,
  onTipoRapportoChange,
  onLavoriAccettabiliChange,
  onDisponibilitaNelGiornoChange,
}: {
  isEditing: boolean;
  showEditAction?: boolean;
  onToggleEdit?: () => void;
  lookupColorsByDomain: Map<string, string>;
  tipoRapportoLavorativo: string[];
  tipoRapportoOptions: Array<{ label: string; value: string }>;
  lavoriAccettabili: string[];
  lavoriAccettabiliOptions: Array<{ label: string; value: string }>;
  disponibilitaNelGiorno: string[];
  disponibilitaNelGiornoOptions: Array<{ label: string; value: string }>;
  onTipoRapportoChange: (values: string[]) => void;
  onLavoriAccettabiliChange: (values: string[]) => void;
  onDisponibilitaNelGiornoChange: (values: string[]) => void;
}) {
  return (
    <GateInfoCard
      title="Tipologia turni"
      icon={<CalendarDaysIcon className="text-muted-foreground size-4" />}
      titleAction={
        showEditAction ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={
              isEditing
                ? "Termina modifica tipologia turni"
                : "Modifica tipologia turni"
            }
            title={
              isEditing
                ? "Termina modifica tipologia turni"
                : "Modifica tipologia turni"
            }
            onClick={onToggleEdit}
          >
            <PencilIcon />
          </Button>
        ) : undefined
      }
    >
      <div className="max-w-3xl">
        <WorkerShiftPreferencesFields
          fields={[
            {
              id: "gate-tipo-rapporto-lavorativo",
              label: "Verifica sulle tipologia turni",
              domain: "lavoratori.tipo_rapporto_lavorativo",
              value: tipoRapportoLavorativo,
              options: tipoRapportoOptions,
              placeholder: "Seleziona tipologie",
              onChange: onTipoRapportoChange,
            },
            {
              id: "gate-lavori-accettabili",
              label: "Quali tipi di lavori accetta?",
              domain: "lavoratori.check_lavori_accettabili",
              value: lavoriAccettabili,
              options: lavoriAccettabiliOptions,
              placeholder: "Seleziona lavori",
              onChange: onLavoriAccettabiliChange,
              sortByOptionOrder: true,
            },
            {
              id: "gate-disponibilita-nel-giorno",
              label: "In che momento e disponibile generalmente?",
              domain: "lavoratori.disponibilita_nel_giorno",
              value: disponibilitaNelGiorno,
              options: disponibilitaNelGiornoOptions,
              placeholder: "Seleziona momenti",
              onChange: onDisponibilitaNelGiornoChange,
            },
          ]}
          isEditing={isEditing}
          lookupColorsByDomain={lookupColorsByDomain}
        />
      </div>
    </GateInfoCard>
  );
}

export function Gate1View({
  gateLabel = "Gate 1",
  workerStatus = "qualificato",
  workerCountLabel = "qualificati",
  listControlsSlot,
  showFollowup = true,
  showSelfCertification = true,
  showReferencesInWorkTypes = false,
  showAdministrativeFields = false,
  showStepper = false,
  splitBazeChecksStep = false,
  stepInfoBySection = {},
  presentationEditMode = "always",
  photoEditMode = "hidden",
  addressEditMode = "always",
  workTypesEditMode = "always",
  availabilityEditMode = "always",
  bazeChecksEditMode = "always",
  documentSectionMode,
  showAssessment = true,
  specificChecksMode = "gate1",
  specificChecksEditMode = "always",
  applyGate1BaseFilters = true,
  showCertificationReferente = false,
  showFollowupFilter = true,
  allowCertifiedStatus = false,
  showInPersonBookingLinks = false,
  stepLayout = "default",
}: GateViewProps) {
  const [gateProvinciaFilter, setGateProvinciaFilter] = React.useState("all");
  const [gateFollowupFilter, setGateFollowupFilter] = React.useState("all");
  const {
    workers,
    workerRows,
    workerAddressesById,
    selectedWorkerId,
    setSelectedWorkerId,
    selectedWorker,
    selectedWorkerRow,
    selectedWorkerAddress,
    selectedWorkerDocuments,
    loadingSelectedWorkerDocuments,
    selectedWorkerExperiences,
    loadingSelectedWorkerExperiences,
    selectedWorkerReferences,
    loadingSelectedWorkerReferences,
    loading,
    error,
    setError,
    lookupOptionsByDomain,
    lookupColorsByDomain,
    filterFields,
    loadWorkersSchema,
    table,
    searchValue,
    setSearchValue,
    filters,
    setFilters,
    hasPendingFilters,
    applyFilters,
    savedViews,
    activeViewId,
    saveCurrentView,
    applySavedView,
    deleteSavedView,
    setPageIndex,
    pageCount,
    currentPage,
    applyUpdatedWorkerRow,
    applyUpdatedWorkerAddress,
    applyUpdatedWorkerExperience,
    appendCreatedWorkerExperience,
    removeWorkerExperience,
    applyUpdatedWorkerReference,
    appendCreatedWorkerReference,
    upsertSelectedWorkerDocument,
  } = useLavoratoriData({
    forcedWorkerStatus: workerStatus,
    applyGate1BaseFilters,
    includeRelatedSelectionDetails: false,
    gate1ProvinciaFilter: gateProvinciaFilter,
    gate1FollowupFilter: gateFollowupFilter,
  });
  const groupingOptions = React.useMemo(
    () =>
      filterFields.map((field) => ({ label: field.label, value: field.value })),
    [filterFields],
  );

  // D2 — cattura l'oggetto editor per il <Gate1WorkerProvider>: le card estratte
  // lo consumeranno via useGate1WorkerEditor() invece del prop-drilling.
  const gate1Editor = useSelectedWorkerEditor({
    selectedWorkerId,
    selectedWorker,
    selectedWorkerRow,
    selectedWorkerAddress,
    lookupColorsByDomain,
    setError,
    applyUpdatedWorkerRow,
    applyUpdatedWorkerAddress,
    applyUpdatedWorkerExperience,
    appendCreatedWorkerExperience,
    removeWorkerExperience,
    applyUpdatedWorkerReference,
    appendCreatedWorkerReference,
  });

  const {
    selectedWorkerIsNonIdoneo,
    selectedWorkerNonQualificatoIssues,
    selectedWorkerIsNonQualificato,
    availabilityPayload,
    disponibilitaBadgeClassName,
    availabilityReadOnlyRows,
    nonIdoneoReasonValues,
    isEditingHeader,
    setIsEditingHeader,
    isEditingAddress,
    setIsEditingAddress,
    isEditingExperience,
    setIsEditingExperience,
    isEditingSkills,
    setIsEditingSkills,
    isEditingDocuments,
    setIsEditingDocuments,
    selectedPresentationPhotoIndex,
    setSelectedPresentationPhotoIndex,
    headerDraft,
    setHeaderDraft,
    addressDraft,
    setAddressDraft,
    availabilityDraft,
    setAvailabilityDraft,
    availabilityStatusDraft,
    setAvailabilityStatusDraft,
    jobSearchDraft,
    setJobSearchDraft,
    experienceDraft,
    skillsDraft,
    setSkillsDraft,
    documentsDraft,
    setDocumentsDraft,
    resolvedIban,
    presentationPhotoSlots,
    updatingAvailability,
    updatingAvailabilityStatus,
    updatingExperience,
    updatingSkills,
    updatingDocuments,
    updatingNonQualificato,
    handleNonIdoneoReasonsChange,
    patchSelectedWorkerField,
    patchWorkerAddressField,
    commitAddressField,
    saveWorkerAvailability,
    patchWorkerAvailabilityStatus,
    handleAvailabilityMatrixChange,
    patchExperienceRecord,
    createExperienceRecord,
    patchReferenceRecord,
    createReferenceRecord,
    patchSkillsField,
    patchDocumentField,
    generateStripeAccount,
    AVAILABILITY_EDIT_DAYS,
    AVAILABILITY_EDIT_BANDS,
    AVAILABILITY_HOUR_LABELS,
  } = gate1Editor;

  const { value: anniEsperienzaColfValue, onChange: saveAnniEsperienzaColf } = useDebouncedSave(
    asInputValue(selectedWorkerRow?.anni_esperienza_colf),
    async (v) => { await patchSelectedWorkerField("anni_esperienza_colf", v ? Number(v) : null); },
    { identity: selectedWorkerId },
  );
  const { value: anniEsperienzaBadanteValue, onChange: saveAnniEsperienzaBadante } = useDebouncedSave(
    asInputValue(selectedWorkerRow?.anni_esperienza_badante),
    async (v) => { await patchSelectedWorkerField("anni_esperienza_badante", v ? Number(v) : null); },
    { identity: selectedWorkerId },
  );
  const { value: anniEsperienzaBabysitterValue, onChange: saveAnniEsperienzaBabysitter } = useDebouncedSave(
    asInputValue(selectedWorkerRow?.anni_esperienza_babysitter),
    async (v) => { await patchSelectedWorkerField("anni_esperienza_babysitter", v ? Number(v) : null); },
    { identity: selectedWorkerId },
  );
  const { value: dataRitornoValue, onChange: saveDataRitorno } = useDebouncedSave(
    asString(selectedWorkerRow?.data_ritorno_disponibilita),
    async (v) => { await patchWorkerAvailabilityStatus({ data_ritorno_disponibilita: v || null }); },
    { identity: selectedWorkerId },
  );
  const { value: descrizionePubblicaValue, onChange: saveDescrizionePubblica } = useDebouncedSave(
    asString(selectedWorkerRow?.descrizione_pubblica),
    async (v) => { await patchSelectedWorkerField("descrizione_pubblica", v || null); },
    { identity: selectedWorkerId },
  );
  const { value: pagaOrariaRichiestaValue, onChange: savePagaOrariaRichiesta } = useDebouncedSave(
    asInputValue(selectedWorkerRow?.paga_oraria_richiesta),
    async (v) => { await patchSelectedWorkerField("paga_oraria_richiesta", parseNumberValue(v)); },
    { identity: selectedWorkerId },
  );
  const { value: dataScadenzaNaspiGateValue, onChange: saveDataScadenzaNaspiGate } = useDebouncedSave(
    asString(selectedWorkerRow?.data_scadenza_naspi),
    async (v) => { await patchSelectedWorkerField("data_scadenza_naspi", v || null); },
    { identity: selectedWorkerId },
  );
  const operatorName = useCurrentOperatorName();
  const { value: naspiDocValue, onChange: saveNaspiDoc } = useDebouncedSave(
    asString(selectedWorkerRow?.data_scadenza_naspi),
    async (v) => { await patchDocumentField("data_scadenza_naspi", v || null); },
    { identity: selectedWorkerId },
  );
  const { value: ibanValue, onChange: saveIban } = useDebouncedSave(
    resolvedIban,
    async (v) => { await patchDocumentField("iban", v || null); },
    { identity: selectedWorkerId },
  );
  const { value: headerNomeValue, onChange: saveHeaderNome } = useDebouncedSave(
    asString(selectedWorkerRow?.nome),
    async (v) => { await patchSelectedWorkerField("nome", v.trim() || null); },
    { identity: selectedWorkerId },
  );
  const { value: headerCognomeValue, onChange: saveHeaderCognome } = useDebouncedSave(
    asString(selectedWorkerRow?.cognome),
    async (v) => { await patchSelectedWorkerField("cognome", v.trim() || null); },
    { identity: selectedWorkerId },
  );
  const { value: headerEmailValue, onChange: saveHeaderEmail } = useDebouncedSave(
    asString(selectedWorkerRow?.email),
    async (v) => { await patchSelectedWorkerField("email", v.trim() || null); },
    { identity: selectedWorkerId },
  );
  const { value: headerTelefonoValue, onChange: saveHeaderTelefono } = useDebouncedSave(
    asString(selectedWorkerRow?.telefono),
    async (v) => { await patchSelectedWorkerField("telefono", v.trim() || null); },
    { identity: selectedWorkerId },
  );
  const { value: headerDataNascitaValue, onChange: saveHeaderDataNascita } = useDebouncedSave(
    asString(selectedWorkerRow?.data_di_nascita),
    async (v) => { await patchSelectedWorkerField("data_di_nascita", v || null); },
    { identity: selectedWorkerId },
  );

  const retainSelectedWorkerAfterStatusChange = React.useCallback(
    (workerId: string) => {
      if (statusChangeRetainTimeoutRef.current) {
        window.clearTimeout(statusChangeRetainTimeoutRef.current);
      }

      setStatusChangeRetainedWorkerId(workerId);
      statusChangeRetainTimeoutRef.current = window.setTimeout(() => {
        setStatusChangeRetainedWorkerId((current) =>
          current === workerId ? null : current,
        );
        statusChangeRetainTimeoutRef.current = null;
      }, 10_000);
    },
    [],
  );

  React.useEffect(() => {
    return () => {
      if (statusChangeRetainTimeoutRef.current) {
        window.clearTimeout(statusChangeRetainTimeoutRef.current);
      }
    };
  }, []);

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

  const firstGateSection = showCertificationReferente
    ? "referente"
    : showFollowup
      ? "contatti"
      : "presentazione";
  const [activeGateSection, setActiveGateSection] =
    React.useState(firstGateSection);
  const detailScrollRef = React.useRef<HTMLElement | null>(null);
  const sectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const addressMobilityAnchor = useComboboxAnchor();
  const [isEditingAvailabilityStep, setIsEditingAvailabilityStep] =
    React.useState(false);
  const [isEditingBazeChecks, setIsEditingBazeChecks] = React.useState(false);
  const workerPhotoInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploadingWorkerPhoto, setUploadingWorkerPhoto] = React.useState(false);
  const [statusChangeRetainedWorkerId, setStatusChangeRetainedWorkerId] =
    React.useState<string | null>(null);
  const statusChangeRetainTimeoutRef = React.useRef<number | null>(null);
  const [gateDraft, setGateDraft] = React.useState({
    referenteIdoneita: "",
    referenteCertificazione: "",
    followupStatus: "",
    descrizionePubblica: "",
    livelloItaliano: "",
    ratingAtteggiamento: "",
    ratingCuraPersonale: "",
    ratingPrecisionePuntualita: "",
    ratingCapacitaComunicative: "",
    ratingCorporatura: "",
    checkAccettaFunzionamentoBaze: "",
    checkAccettaPaga9EuroNetti: "",
    pagaOrariaRichiesta: "",
    checkAccettaMultipliContratti: "",
    dataScadenzaNaspi: "",
    assessmentStatus: "",
    assessmentFeedback: "",
  });
  // Tracks the last server-derived snapshot for `gateDraft`. Each effect-driven
  // resync (es. realtime echo) merges per-field: a field is updated only when
  // the current draft value still matches the previously synced value — i.e.
  // the user has NOT typed/picked a new value locally. This prevents a remote
  // realtime echo (own debounced save or a colleague's edit on another tab)
  // from wiping in-progress edits across the ~17 controlled inputs in this
  // section. Mirrors the per-section `isEditing*` guards added in
  // `use-selected-worker-editor.ts` (commit 03ecdd3), but here a `dirtyRef`
  // style merge is a better fit because most gate inputs are always-editable
  // (no explicit edit-mode toggle) and save immediately via
  // `patchSelectedWorkerField` in their `onChange`.
  const lastSyncedGateDraftRef = React.useRef<typeof gateDraft | null>(null);
  const {
    options: referenteIdoneitaOptions,
    loading: referenteIdoneitaOptionsLoading,
  } = useOperatoriOptions({
    role: "recruiter",
    activeOnly: true,
  });

  const baseGateWorkers = React.useMemo(() => {
    const allowedStatuses = new Set(
      (Array.isArray(workerStatus) ? workerStatus : [workerStatus])
        .map((status) => normalizeWorkerStatus(status))
        .filter(Boolean),
    );
    const matchingIds = new Set(
      workerRows
        .filter((row) =>
          allowedStatuses.has(normalizeWorkerStatus(row.stato_lavoratore)),
        )
        .map((row) => row.id),
    );

    return workers.filter((worker) => matchingIds.has(worker.id));
  }, [workerStatus, workerRows, workers]);

  const workerRowsById = React.useMemo(() => {
    const rowsById = new Map<string, LavoratoreRecord>();
    for (const row of workerRows) {
      rowsById.set(row.id, row);
    }
    return rowsById;
  }, [workerRows]);

  // Dropdown provincia: value = sigla (TO, MI, MB…), label = nome esteso.
  // Il filtro Gate 1/2 lavora su `indirizzi.provincia_sigla`, quindi qui
  // restituiamo direttamente la lista canonica delle province italiane.
  const gateProvinciaOptions = React.useMemo(() => PROVINCIA_DROPDOWN_OPTIONS, []);

  const followupValueToLabel = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const option of lookupOptionsByDomain.get(
      "lavoratori.followup_chiamata_idoneita",
    ) ?? []) {
      map.set(option.value, option.label);
      map.set(option.label, option.label);
    }
    return map;
  }, [lookupOptionsByDomain]);

  const gateFollowupOptions = React.useMemo(() => {
    const optionLabels = (
      lookupOptionsByDomain.get("lavoratori.followup_chiamata_idoneita") ?? []
    ).map((option) => option.label);
    const rowLabels = baseGateWorkers
      .map((worker) => {
        const raw = asString(
          workerRowsById.get(worker.id)?.followup_chiamata_idoneita,
        );
        return followupValueToLabel.get(raw) ?? raw;
      })
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set([...optionLabels, ...rowLabels]));
  }, [
    baseGateWorkers,
    followupValueToLabel,
    lookupOptionsByDomain,
    workerRowsById,
  ]);

  const gateWorkers = React.useMemo(() => {
    return baseGateWorkers;
  }, [baseGateWorkers]);

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

  const documentiInRegolaOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.documenti_in_regola") ?? [],
    [lookupOptionsByDomain],
  );
  const documentiVerificatiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.stato_verifica_documenti") ?? [],
    [lookupOptionsByDomain],
  );
  const haiReferenzeOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.hai_referenze") ?? [],
    [lookupOptionsByDomain],
  );
  const disponibilitaLookupOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.disponibilita") ?? [],
    [lookupOptionsByDomain],
  );
  const provinciaLookupOptions = useProvincieOptions();
  const sessoLookupOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.sesso") ?? [],
    [lookupOptionsByDomain],
  );
  const nazionalitaLookupOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.nazionalita") ?? [],
    [lookupOptionsByDomain],
  );
  const mobilityLookupOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.come_ti_sposti") ?? [],
    [lookupOptionsByDomain],
  );
  const tipoLavoroDomesticoOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.tipo_lavoro_domestico") ?? [],
    [lookupOptionsByDomain],
  );
  const tipoRapportoLavorativoOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.tipo_rapporto_lavorativo") ?? [],
    [lookupOptionsByDomain],
  );
  const lavoriAccettabiliOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.check_lavori_accettabili") ?? [],
    [lookupOptionsByDomain],
  );
  const disponibilitaNelGiornoOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.disponibilita_nel_giorno") ?? [],
    [lookupOptionsByDomain],
  );
  const babysittingNeonatiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_babysitting_neonati",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const babysittingMultipliBambiniOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_babysitting_multipli_bambini",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const caseConCaniOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.check_accetta_case_con_cani") ?? [],
    [lookupOptionsByDomain],
  );
  const caseConCaniGrandiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_case_con_cani_grandi",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const caseConGattiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.check_accetta_case_con_gatti") ??
      [],
    [lookupOptionsByDomain],
  );
  const scaleSoffittiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_salire_scale_o_soffitti_alti",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const trasfertaOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_lavori_con_trasferta",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const livelloItalianoOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_italiano") ?? [],
    [lookupOptionsByDomain],
  );
  const livelloIngleseOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_inglese") ?? [],
    [lookupOptionsByDomain],
  );
  const livelloCucinaOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_cucina") ?? [],
    [lookupOptionsByDomain],
  );
  const livelloStiroOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_stiro") ?? [],
    [lookupOptionsByDomain],
  );
  const livelloPulizieOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_pulizie") ?? [],
    [lookupOptionsByDomain],
  );
  const livelloBabysittingOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_babysitting") ?? [],
    [lookupOptionsByDomain],
  );
  const livelloDogsittingOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_dogsitting") ?? [],
    [lookupOptionsByDomain],
  );
  const livelloGiardinaggioOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.livello_giardinaggio") ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaStiroOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_stiro_esigente",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaCucinaOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_cucina_strutturata",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaNeonatiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_babysitting_neonati",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaFamiglieNumeroseOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.compatibilita_famiglie_numerose") ??
      [],
    [lookupOptionsByDomain],
  );
  const compatibilitaFamiglieMoltoEsigentiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_famiglie_molto_esigenti",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaDatorePresenteOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_lavoro_con_datore_presente_in_casa",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaCaseGrandiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_case_di_grandi_dimensioni",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaAnimaliOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_animali_in_casa",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaAutonomiaOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_elevata_autonomia_richiesta",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const compatibilitaContestiPacatiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.compatibilita_con_contesti_pacati",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const ratingCorporaturaOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.rating_corporatura") ?? [
        {
          label: "Abile a svolgere qualsiasi lavoro",
          value: "abile_qualsiasi_lavoro",
        },
        {
          label: "Abile a svolgere attivita con intensita media",
          value: "abile_intensita_media",
        },
        {
          label: "Abile a svolgere attivita con carichi di lavoro limitati",
          value: "abile_carichi_limitati",
        },
        {
          label: "Non idonea",
          value: "non_idonea",
        },
      ],
    [lookupOptionsByDomain],
  );
  const experienceTipoLavoroOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("esperienze_lavoratori.tipo_lavoro") ??
      tipoLavoroDomesticoOptions,
    [lookupOptionsByDomain, tipoLavoroDomesticoOptions],
  );
  const experienceTipoRapportoOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("esperienze_lavoratori.tipo_rapporto") ?? [],
    [lookupOptionsByDomain],
  );
  const referenceStatusOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("referenze_lavoratori.referenza_verificata") ??
      [],
    [lookupOptionsByDomain],
  );
  const statoLavoratoreOptions = React.useMemo(() => {
    const options =
      lookupOptionsByDomain.get("lavoratori.stato_lavoratore") ?? [];
    if (allowCertifiedStatus) return options;
    return options.filter(
      (option) =>
        option.label.trim().toLowerCase() !== "certificato" &&
        option.value.trim().toLowerCase() !== "certificato",
    );
  }, [allowCertifiedStatus, lookupOptionsByDomain]);
  const motivazioniNonIdoneoOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.motivazione_non_idoneo") ?? [],
    [lookupOptionsByDomain],
  );
  const motivazioniNonIdoneoOptionsByValue = React.useMemo(() => {
    const optionsMap = new Map<string, { label: string; value: string }>();
    for (const option of motivazioniNonIdoneoOptions) {
      optionsMap.set(option.value, option);
    }
    return optionsMap;
  }, [motivazioniNonIdoneoOptions]);
  const getMotivazioneLabel = React.useCallback(
    (value: string) =>
      motivazioniNonIdoneoOptionsByValue.get(value)?.label ?? value,
    [motivazioniNonIdoneoOptionsByValue],
  );
  const followupStatusOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.followup_chiamata_idoneita") ?? [],
    [lookupOptionsByDomain],
  );
  const funzionamentoBazeOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_funzionamento_baze",
      ) ?? [
        { label: "Non accetta", value: "non_accetta" },
        { label: "Accetta", value: "accetta" },
      ],
    [lookupOptionsByDomain],
  );
  const multipliContrattiOptions = React.useMemo(
    () =>
      lookupOptionsByDomain.get(
        "lavoratori.check_accetta_multipli_contratti",
      ) ?? [],
    [lookupOptionsByDomain],
  );
  const paga9Options = React.useMemo(
    () =>
      lookupOptionsByDomain.get("lavoratori.check_accetta_paga_9_euro_netti") ??
      [],
    [lookupOptionsByDomain],
  );
  const gateTabs = React.useMemo<GateTab[]>(
    () => {
      if (useGate1ReorderedSteps) {
        return [
          ...(showFollowup
            ? [
                {
                  id: "contatti" as const,
                  label: "Referente e presentazione",
                  icon: PhoneIcon,
                },
              ]
            : [
                {
                  id: "presentazione" as const,
                  label: "Presentazione",
                  icon: CircleUserRoundIcon,
                },
              ]),
          {
            id: "check_baze" as const,
            label: "Check Baze",
            icon: ShieldCheckIcon,
          },
          {
            id: "indirizzo" as const,
            label: "Indirizzo",
            icon: CircleUserRoundIcon,
          },
          ...(showDocumentSection
            ? [
                {
                  id: "documenti" as const,
                  label: "Autocertificazioni",
                  icon: FileSearchIcon,
                },
              ]
            : []),
          { id: "tipologia" as const, label: "Tipologia lavori", icon: BadgeCheckIcon },
          {
            id: "disponibilita" as const,
            label: "Disponibilita",
            icon: CalendarDaysIcon,
          },
          {
            id: "aspetti" as const,
            label: "Check disponibilita",
            icon: ShieldCheckIcon,
          },
          ...(showAssessment
            ? [{ id: "assessment" as const, label: "Assessment", icon: StarIcon }]
            : []),
        ];
      }

      return [
        ...(showCertificationReferente
          ? [{ id: "referente" as const, label: "Referente", icon: UsersIcon }]
          : []),
        ...(showFollowup
          ? [{ id: "contatti" as const, label: "Follow-up", icon: PhoneIcon }]
          : []),
        {
          id: "presentazione" as const,
          label: "Presentazione",
          icon: CircleUserRoundIcon,
        },
        ...(showDocumentSection && !documentSectionAfterSpecificChecks
          ? [
              {
                id: "documenti" as const,
                label: "Autocertificazioni",
                icon: FileSearchIcon,
              },
            ]
          : []),
        { id: "tipologia" as const, label: "Tipologia lavori", icon: BadgeCheckIcon },
        { id: "disponibilita" as const, label: "Disponibilita", icon: CalendarDaysIcon },
        {
          id: "aspetti" as const,
          label:
            specificChecksMode === "confirmation"
              ? "Competenze"
              : "Aspetti specifici",
          icon: ShieldCheckIcon,
        },
        ...(showDocumentSection && documentSectionAfterSpecificChecks
          ? [
              {
                id: "documenti" as const,
                label: "Documenti",
                icon: NotebookPenIcon,
              },
            ]
          : []),
        ...(showAssessment
          ? [{ id: "assessment" as const, label: "Assessment", icon: StarIcon }]
          : []),
      ];
    },
    [
      documentSectionAfterSpecificChecks,
      showCertificationReferente,
      showAssessment,
      showDocumentSection,
      showFollowup,
      specificChecksMode,
      useGate1ReorderedSteps,
    ],
  );

  const scrollToSection = React.useCallback((value: string) => {
    setActiveGateSection(value);
    const container = detailScrollRef.current;
    const target = sectionRefs.current[value];
    if (!container || !target) return;
    container.scrollTo({
      top: Math.max(target.offsetTop - 108, 0),
      behavior: "smooth",
    });
  }, []);

  React.useEffect(() => {
    const container = detailScrollRef.current;
    if (!container || !selectedWorkerId) return;

    const syncActiveSection = () => {
      const scrollTop = container.scrollTop;
      let nextActive = gateTabs[0]?.id ?? firstGateSection;

      for (const tab of gateTabs) {
        const node = sectionRefs.current[tab.id];
        if (!node) continue;
        if (node.offsetTop - 140 <= scrollTop) {
          nextActive = tab.id;
        } else {
          break;
        }
      }

      setActiveGateSection((current) =>
        current === nextActive ? current : nextActive,
      );
    };

    syncActiveSection();
    container.addEventListener("scroll", syncActiveSection, { passive: true });
    return () => container.removeEventListener("scroll", syncActiveSection);
  }, [firstGateSection, gateTabs, selectedWorkerId]);

  React.useEffect(() => {
    setActiveGateSection(firstGateSection);
  }, [firstGateSection, selectedWorkerId]);

  React.useEffect(() => {
    setIsEditingAvailabilityStep(false);
    setIsEditingBazeChecks(false);
    // On worker switch, drop the dirty-merge baseline so the next resync from
    // `selectedWorkerRow` populates every field freshly.
    lastSyncedGateDraftRef.current = null;
  }, [selectedWorkerId]);

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

  React.useEffect(() => {
    const nextSnapshot = {
      referenteIdoneita: asString(selectedWorkerRow?.referente_idoneita_id),
      referenteCertificazione: asString(
        selectedWorkerRow?.referente_certificazione_id,
      ),
      followupStatus: asString(selectedWorkerRow?.followup_chiamata_idoneita),
      descrizionePubblica: asString(selectedWorkerRow?.descrizione_pubblica),
      livelloItaliano: asString(selectedWorkerRow?.livello_italiano),
      ratingAtteggiamento: asInputValue(
        selectedWorkerRow?.rating_atteggiamento,
      ),
      ratingCuraPersonale: asInputValue(
        selectedWorkerRow?.rating_cura_personale,
      ),
      ratingPrecisionePuntualita: asInputValue(
        selectedWorkerRow?.rating_precisione_puntualita,
      ),
      ratingCapacitaComunicative: asInputValue(
        selectedWorkerRow?.rating_capacita_comunicative,
      ),
      ratingCorporatura: asString(selectedWorkerRow?.rating_corporatura),
      checkAccettaFunzionamentoBaze: asString(
        selectedWorkerRow?.check_accetta_funzionamento_baze,
      ),
      checkAccettaPaga9EuroNetti: asString(
        selectedWorkerRow?.check_accetta_paga_9_euro_netti,
      ),
      pagaOrariaRichiesta: asInputValue(
        selectedWorkerRow?.paga_oraria_richiesta,
      ),
      checkAccettaMultipliContratti: asString(
        selectedWorkerRow?.check_accetta_multipli_contratti,
      ),
      dataScadenzaNaspi: asString(selectedWorkerRow?.data_scadenza_naspi),
      assessmentStatus: asString(selectedWorkerRow?.stato_lavoratore),
      assessmentFeedback: asString(selectedWorkerRow?.feedback_recruiter),
    };
    const previousSynced = lastSyncedGateDraftRef.current;
    lastSyncedGateDraftRef.current = nextSnapshot;
    if (previousSynced === null) {
      // First sync for this worker — populate every field.
      setGateDraft(nextSnapshot);
      return;
    }
    // Per-field merge: replace a field only when the local draft value still
    // matches the previously synced server value (i.e. the user has NOT typed
    // a new value locally yet). This prevents a realtime echo from wiping
    // in-progress edits across the gate draft inputs.
    setGateDraft((current) => {
      let changed = false;
      const merged: typeof current = { ...current };
      (Object.keys(nextSnapshot) as Array<keyof typeof nextSnapshot>).forEach(
        (key) => {
          const previousValue = previousSynced[key];
          const nextValue = nextSnapshot[key];
          if (previousValue === nextValue) return;
          if (current[key] !== previousValue) {
            // User has a pending local edit for this field — keep it.
            return;
          }
          merged[key] = nextValue;
          changed = true;
        },
      );
      return changed ? merged : current;
    });
  }, [selectedWorkerRow]);

  const openWorkerPhotoPicker = React.useCallback(() => {
    if (uploadingWorkerPhoto) return;
    workerPhotoInputRef.current?.click();
  }, [uploadingWorkerPhoto]);

  const handleWorkerPhotoInputChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";

      if (files.length === 0 || !selectedWorkerId) return;

      setError(null);
      setUploadingWorkerPhoto(true);

      try {
        const nextPhotos: MinimalAttachment[] = normalizeAttachmentArray(
          selectedWorkerRow?.foto,
        );

        for (const [index, file] of files.entries()) {
          const safeName = sanitizeFileName(file.name || "foto");
          const storagePath = [
            "lavoratori",
            selectedWorkerId,
            "foto",
            `${Date.now()}-${index}-${safeName}`,
          ].join("/");

          const uploadResult = await supabase.storage
            .from("baze-bucket")
            .upload(storagePath, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type || undefined,
            });

          if (uploadResult.error) {
            throw uploadResult.error;
          }

          nextPhotos.push(buildAttachmentPayload(file, storagePath));
        }

        const response = await updateRecord("lavoratori", selectedWorkerId, {
          foto: nextPhotos,
        });
        applyUpdatedWorkerRow(asLavoratoreRecord(response.row));
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore caricando la foto",
        );
      } finally {
        setUploadingWorkerPhoto(false);
      }
    },
    [
      applyUpdatedWorkerRow,
      selectedWorkerId,
      selectedWorkerRow?.foto,
      setError,
    ],
  );

  const handlePrimaryWorkerPhotoChange = React.useCallback(
    async (index: number) => {
      if (!selectedWorkerId) return;

      const existingPhotos = normalizeAttachmentArray(selectedWorkerRow?.foto);
      if (existingPhotos.length === 0) {
        setSelectedPresentationPhotoIndex(Math.max(index, 0));
        return;
      }

      if (index <= 0 || index >= existingPhotos.length) {
        setSelectedPresentationPhotoIndex(Math.max(index, 0));
        return;
      }

      setError(null);

      try {
        const [selectedPhoto] = existingPhotos.splice(index, 1);
        if (!selectedPhoto) return;

        const reorderedPhotos = [selectedPhoto, ...existingPhotos];
        const response = await updateRecord("lavoratori", selectedWorkerId, {
          foto: reorderedPhotos,
        });

        applyUpdatedWorkerRow(asLavoratoreRecord(response.row));
        setSelectedPresentationPhotoIndex(0);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Errore aggiornando la foto principale",
        );
      }
    },
    [
      applyUpdatedWorkerRow,
      selectedWorkerId,
      selectedWorkerRow?.foto,
      setError,
      setSelectedPresentationPhotoIndex,
    ],
  );

  React.useEffect(() => {
    if (!selectedWorkerId) {
      if (gateWorkers.length > 0) {
        setSelectedWorkerId(gateWorkers[0].id);
      }
      return;
    }

    if (
      statusChangeRetainedWorkerId === selectedWorkerId &&
      selectedWorker &&
      selectedWorkerRow
    ) {
      return;
    }

    if (!gateWorkers.some((worker) => worker.id === selectedWorkerId)) {
      setSelectedWorkerId(gateWorkers[0]?.id ?? null);
    }
  }, [
    gateWorkers,
    selectedWorker,
    selectedWorkerId,
    selectedWorkerRow,
    setSelectedWorkerId,
    statusChangeRetainedWorkerId,
  ]);

  return (
    <Gate1WorkerProvider value={gate1Editor}>
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
        <div className="flex min-h-0 flex-col gap-2">
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
                        createdAt:
                          asString(row?.data_ora_di_creazione) ||
                          asString(row?.creato_il),
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
            {selectedWorker && selectedWorkerRow ? (
              <div
                className={
                  useGate1ReorderedSteps ? "flex flex-col gap-6" : "space-y-6"
                }
              >
                {showCertificationReferente ? (
                  <div
                    className={getGateSectionOrderClass(1)}
                    ref={(node) => {
                      sectionRefs.current.referente = node;
                    }}
                  >
                    <GateStepSection
                      step={1}
                      isFirst
                      showStepper={showStepper}
                      info={stepInfoBySection.referente}
                    >
                      <GateCertificationReferenteCard
                        referenteCertificazioneValue={
                          gateDraft.referenteCertificazione
                        }
                        referenteIdoneitaValue={gateDraft.referenteIdoneita}
                        options={referenteIdoneitaOptions}
                        disabled={referenteIdoneitaOptionsLoading}
                        onReferenteCertificazioneChange={(value) => {
                          setGateDraft((current) => ({
                            ...current,
                            referenteCertificazione: value ?? "",
                          }));
                          void patchSelectedWorkerField(
                            "referente_certificazione_id",
                            value,
                          );
                        }}
                      />
                    </GateStepSection>
                  </div>
                ) : null}

                {showFollowup ? (
                  <div
                    className={getGateSectionOrderClass(1)}
                    ref={(node) => {
                      sectionRefs.current.contatti = node;
                    }}
                  >
                    <GateStepSection
                      step={1}
                      isFirst={!showCertificationReferente}
                      showStepper={showStepper}
                      info={stepInfoBySection.contatti}
                    >
                      <GateReferenteCard
                        value={gateDraft.referenteIdoneita}
                        referenteCertificazioneValue={
                          gateDraft.referenteCertificazione
                        }
                        options={referenteIdoneitaOptions}
                        disabled={referenteIdoneitaOptionsLoading}
                        onChange={(value) => {
                          setGateDraft((current) => ({
                            ...current,
                            referenteIdoneita: value ?? "",
                          }));
                          void patchSelectedWorkerField(
                            "referente_idoneita_id",
                            value,
                          );
                        }}
                      />
                      <GateContactsCard
                        followupStatus={gateDraft.followupStatus}
                        options={followupStatusOptions}
                        onFollowupStatusChange={(value) => {
                          setGateDraft((current) => ({
                            ...current,
                            followupStatus: value,
                          }));
                          void patchSelectedWorkerField(
                            "followup_chiamata_idoneita",
                            value || null,
                          );
                        }}
                      />
                    </GateStepSection>
                  </div>
                ) : null}

                <div
                  className={getGateSectionOrderClass(presentationStep)}
                  ref={(node) => {
                    sectionRefs.current.presentazione = node;
                  }}
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
                      headerDraft={{
                        ...headerDraft,
                        nome: headerNomeValue,
                        cognome: headerCognomeValue,
                        email: headerEmailValue,
                        telefono: headerTelefonoValue,
                        data_di_nascita: headerDataNascitaValue,
                      }}
                      descriptionValue={descrizionePubblicaValue}
                      livelloItaliano={gateDraft.livelloItaliano}
                      sessoOptions={sessoLookupOptions}
                      nazionalitaOptions={nazionalitaLookupOptions}
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
                      livelloItalianoOptions={livelloItalianoOptions}
                      onHeaderChange={(field, value) => {
                        if (field === "descrizione_pubblica") {
                          saveDescrizionePubblica(value);
                          return;
                        }

                        if (field === "nome") saveHeaderNome(value);
                        else if (field === "cognome") saveHeaderCognome(value);
                        else if (field === "email") saveHeaderEmail(value);
                        else if (field === "telefono") saveHeaderTelefono(value);
                        else if (field === "data_di_nascita") saveHeaderDataNascita(value);
                        else if (field === "sesso" || field === "nazionalita") {
                          void patchSelectedWorkerField(field, value || null);
                        }
                      }}
                      onLivelloItalianoChange={(value) => {
                        setGateDraft((current) => ({
                          ...current,
                          livelloItaliano: value,
                        }));
                        void patchSelectedWorkerField("livello_italiano", value || null);
                      }}
                    />

                  </GateStepSection>
                </div>

                <div
                  className={getGateSectionOrderClass(addressStep)}
                  ref={(node) => {
                    sectionRefs.current.indirizzo = node;
                  }}
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
                      addressDraft={addressDraft}
                      provinciaOptions={provinciaLookupOptions}
                      mobilityOptions={mobilityLookupOptions}
                      selectedVia={asString(selectedWorkerAddress?.via) || null}
                      selectedCivico={asString(selectedWorkerAddress?.civico) || null}
                      selectedCap={asString(selectedWorkerAddress?.cap) || null}
                      selectedCitta={asString(selectedWorkerAddress?.citta) || null}
                      selectedProvincia={asString(selectedWorkerAddress?.provincia_sigla) || null}

                      selectedMobility={readArrayStrings(
                        selectedWorkerRow.come_ti_sposti,
                      )}
                      mobilityAnchor={addressMobilityAnchor}
                      onToggleEdit={() =>
                        setIsEditingAddress((current) => !current)
                      }
                      onFieldChange={(field, value) => {
                        setAddressDraft((current) => ({ ...current, [field]: value }));
                        if (field === "provincia") {
                          void patchWorkerAddressField("provincia", value || null);
                        }
                      }}
                      onFieldCommit={(field, value) => {
                        if (field !== "provincia") void commitAddressField(field, value);
                      }}
                      onMobilityChange={(values) => {
                        setAddressDraft((current) => ({
                          ...current,
                          come_ti_sposti: values,
                        }));
                        void patchSelectedWorkerField(
                          "come_ti_sposti",
                          values.length > 0 ? values : null,
                        );
                      }}
                    />
                  </GateStepSection>
                </div>

                {showDocumentSection && !documentSectionAfterSpecificChecks ? (
                  <div
                    className={getGateSectionOrderClass(documentiStep ?? 0)}
                    ref={(node) => {
                      sectionRefs.current.documenti = node;
                    }}
                  >
                    <GateStepSection
                      step={documentiStep ?? 0}
                      showStepper={showStepper}
                      info={stepInfoBySection.documenti}
                    >
                      <GateSelfCertificationCard
                        documentiInRegola={asString(
                          selectedWorkerRow.documenti_in_regola,
                        )}
                        haiReferenze={asString(selectedWorkerRow.hai_referenze)}
                        documentiOptions={documentiInRegolaOptions}
                        referenzeOptions={haiReferenzeOptions}
                        onDocumentiChange={(value) =>
                          void patchSelectedWorkerField(
                            "documenti_in_regola",
                            value || null,
                          )
                        }
                        onReferenzeChange={(value) =>
                          void patchSelectedWorkerField(
                            "hai_referenze",
                            value || null,
                          )
                        }
                      />
                    </GateStepSection>
                  </div>
                ) : null}

                <div
                  className={getGateSectionOrderClass(tipologiaStep)}
                  ref={(node) => {
                    sectionRefs.current.tipologia = node;
                  }}
                >
                  <GateStepSection
                    step={tipologiaStep}
                    showStepper={showStepper}
                    info={stepInfoBySection.tipologia}
                  >
                    <GateWorkTypesCard
                      workerId={selectedWorkerId}
                      haiReferenze={asString(selectedWorkerRow.hai_referenze)}
                      referenzeOptions={haiReferenzeOptions}
                      allowedWorks={jobSearchDraft.tipo_lavoro_domestico}
                      allowedWorkOptions={tipoLavoroDomesticoOptions}
                      isEditing={gateWorkTypesIsEditing}
                      showReferencesField={showReferencesInWorkTypes}
                      showEditAction={workTypesEditMode === "toggle"}
                      onToggleEdit={() =>
                        setIsEditingExperience((current) => !current)
                      }
                      onReferenzeChange={(value) =>
                        void patchSelectedWorkerField(
                          "hai_referenze",
                          value || null,
                        )
                      }
                      experienceDraft={experienceDraft}
                      selectedAnniEsperienzaColf={anniEsperienzaColfValue}
                      selectedAnniEsperienzaBadante={anniEsperienzaBadanteValue}
                      selectedAnniEsperienzaBabysitter={anniEsperienzaBabysitterValue}
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
                      onAllowedWorksChange={(values) => {
                        setJobSearchDraft((current) => ({
                          ...current,
                          tipo_lavoro_domestico: values,
                        }));
                        void patchSelectedWorkerField(
                          "tipo_lavoro_domestico",
                          values.length > 0 ? values : null,
                        );
                      }}
                      onAnniEsperienzaColfChange={(value) => {
                        saveAnniEsperienzaColf(value);
                      }}
                      onAnniEsperienzaBadanteChange={(value) => {
                        saveAnniEsperienzaBadante(value);
                      }}
                      onAnniEsperienzaBabysitterChange={(value) => {
                        saveAnniEsperienzaBabysitter(value);
                      }}
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
                  ref={(node) => {
                    if (!useGate1ReorderedSteps || !splitBazeChecksStep) {
                      sectionRefs.current.disponibilita = node;
                    }
                  }}
                >
                  {splitBazeChecksStep ? (
                    <>
                      <div
                        className={getGateSectionOrderClass(disponibilitaStep)}
                        ref={(node) => {
                          if (useGate1ReorderedSteps) {
                            sectionRefs.current.disponibilita = node;
                          }
                        }}
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
                            draft={availabilityStatusDraft}
                            selectedDisponibilita={asString(
                              selectedWorkerRow.disponibilita,
                            )}
                            selectedDisponibilitaBadgeClassName={
                              disponibilitaBadgeClassName
                            }
                            selectedDataRitorno={dataRitornoValue}
                            onToggleEdit={() =>
                              setIsEditingAvailabilityStep((current) => !current)
                            }
                            onDisponibilitaChange={(value) => {
                              setAvailabilityStatusDraft((current) => ({
                                ...current,
                                disponibilita: value,
                              }));
                              void patchWorkerAvailabilityStatus({
                                disponibilita: value || null,
                              });
                            }}
                            onDataRitornoChange={saveDataRitorno}
                            onDataRitornoBlur={() => undefined}
                          />
                          <GateShiftPreferencesCard
                            isEditing={gateShiftPreferencesIsEditing}
                            showEditAction={availabilityEditMode === "toggle"}
                            onToggleEdit={() =>
                              setIsEditingAvailabilityStep((current) => !current)
                            }
                            lookupColorsByDomain={lookupColorsByDomain}
                            tipoRapportoLavorativo={
                              jobSearchDraft.tipo_rapporto_lavorativo
                            }
                            tipoRapportoOptions={tipoRapportoLavorativoOptions}
                            lavoriAccettabili={
                              jobSearchDraft.check_lavori_accettabili
                            }
                            lavoriAccettabiliOptions={lavoriAccettabiliOptions}
                            disponibilitaNelGiorno={
                              availabilityDraft.disponibilita_nel_giorno
                            }
                            disponibilitaNelGiornoOptions={
                              disponibilitaNelGiornoOptions
                            }
                            onTipoRapportoChange={(values) => {
                              setJobSearchDraft((current) => ({
                                ...current,
                                tipo_rapporto_lavorativo: values,
                              }));
                              void patchSelectedWorkerField(
                                "tipo_rapporto_lavorativo",
                                values.length > 0 ? values : null,
                              );
                            }}
                            onLavoriAccettabiliChange={(values) => {
                              setJobSearchDraft((current) => ({
                                ...current,
                                check_lavori_accettabili: values,
                              }));
                              void patchSelectedWorkerField(
                                "check_lavori_accettabili",
                                values.length > 0 ? values : null,
                              );
                            }}
                            onDisponibilitaNelGiornoChange={(values) => {
                              setAvailabilityDraft((current) => ({
                                ...current,
                                disponibilita_nel_giorno: values,
                              }));
                              void patchSelectedWorkerField(
                                "disponibilita_nel_giorno",
                                values.length > 0 ? values : null,
                              );
                            }}
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
                            vincoliOrari={
                              availabilityDraft.vincoli_orari_disponibilita
                            }
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
                        ref={(node) => {
                          if (useGate1ReorderedSteps) {
                            sectionRefs.current.check_baze = node;
                          }
                        }}
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
                            funzionamentoBaze={
                              gateDraft.checkAccettaFunzionamentoBaze
                            }
                            funzionamentoBazeOptions={funzionamentoBazeOptions}
                            paga9={gateDraft.checkAccettaPaga9EuroNetti}
                            paga9Options={paga9Options}
                            pagaOrariaRichiesta={pagaOrariaRichiestaValue}
                            multipliContratti={
                              gateDraft.checkAccettaMultipliContratti
                            }
                            multipliContrattiOptions={multipliContrattiOptions}
                            dataScadenzaNaspi={dataScadenzaNaspiGateValue}
                            lookupColorsByDomain={lookupColorsByDomain}
                            onFunzionamentoBazeChange={(value) => {
                              setGateDraft((current) => ({
                                ...current,
                                checkAccettaFunzionamentoBaze: value,
                              }));
                              void patchSelectedWorkerField(
                                "check_accetta_funzionamento_baze",
                                value || null,
                              );
                            }}
                            onPaga9Change={(value) => {
                              setGateDraft((current) => ({
                                ...current,
                                checkAccettaPaga9EuroNetti: value,
                              }));
                              void patchSelectedWorkerField(
                                "check_accetta_paga_9_euro_netti",
                                value || null,
                              );
                            }}
                            onPagaOrariaRichiestaChange={(value) => {
                              savePagaOrariaRichiesta(value);
                            }}
                            onMultipliContrattiChange={(value) => {
                              setGateDraft((current) => ({
                                ...current,
                                checkAccettaMultipliContratti: value,
                              }));
                              void patchSelectedWorkerField(
                                "check_accetta_multipli_contratti",
                                value || null,
                              );
                            }}
                            onDataScadenzaNaspiChange={(value) => {
                              saveDataScadenzaNaspiGate(value);
                            }}
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
                        funzionamentoBaze={
                          gateDraft.checkAccettaFunzionamentoBaze
                        }
                        funzionamentoBazeOptions={funzionamentoBazeOptions}
                        paga9={gateDraft.checkAccettaPaga9EuroNetti}
                        paga9Options={paga9Options}
                        pagaOrariaRichiesta={pagaOrariaRichiestaValue}
                        multipliContratti={
                          gateDraft.checkAccettaMultipliContratti
                        }
                        multipliContrattiOptions={multipliContrattiOptions}
                        dataScadenzaNaspi={dataScadenzaNaspiGateValue}
                        lookupColorsByDomain={lookupColorsByDomain}
                        onFunzionamentoBazeChange={(value) => {
                          setGateDraft((current) => ({
                            ...current,
                            checkAccettaFunzionamentoBaze: value,
                          }));
                          void patchSelectedWorkerField(
                            "check_accetta_funzionamento_baze",
                            value || null,
                          );
                        }}
                        onPaga9Change={(value) => {
                          setGateDraft((current) => ({
                            ...current,
                            checkAccettaPaga9EuroNetti: value,
                          }));
                          void patchSelectedWorkerField(
                            "check_accetta_paga_9_euro_netti",
                            value || null,
                          );
                        }}
                        onPagaOrariaRichiestaChange={(value) => {
                          savePagaOrariaRichiesta(value);
                        }}
                        onMultipliContrattiChange={(value) => {
                          setGateDraft((current) => ({
                            ...current,
                            checkAccettaMultipliContratti: value,
                          }));
                          void patchSelectedWorkerField(
                            "check_accetta_multipli_contratti",
                            value || null,
                          );
                        }}
                        onDataScadenzaNaspiChange={(value) => {
                          saveDataScadenzaNaspiGate(value);
                        }}
                      />
                      <GateShiftPreferencesCard
                        isEditing={gateShiftPreferencesIsEditing}
                        showEditAction={availabilityEditMode === "toggle"}
                        onToggleEdit={() =>
                          setIsEditingAvailabilityStep((current) => !current)
                        }
                        lookupColorsByDomain={lookupColorsByDomain}
                        tipoRapportoLavorativo={
                          jobSearchDraft.tipo_rapporto_lavorativo
                        }
                        tipoRapportoOptions={tipoRapportoLavorativoOptions}
                        lavoriAccettabili={
                          jobSearchDraft.check_lavori_accettabili
                        }
                        lavoriAccettabiliOptions={lavoriAccettabiliOptions}
                        disponibilitaNelGiorno={
                          availabilityDraft.disponibilita_nel_giorno
                        }
                        disponibilitaNelGiornoOptions={
                          disponibilitaNelGiornoOptions
                        }
                        onTipoRapportoChange={(values) => {
                          setJobSearchDraft((current) => ({
                            ...current,
                            tipo_rapporto_lavorativo: values,
                          }));
                          void patchSelectedWorkerField(
                            "tipo_rapporto_lavorativo",
                            values.length > 0 ? values : null,
                          );
                        }}
                        onLavoriAccettabiliChange={(values) => {
                          setJobSearchDraft((current) => ({
                            ...current,
                            check_lavori_accettabili: values,
                          }));
                          void patchSelectedWorkerField(
                            "check_lavori_accettabili",
                            values.length > 0 ? values : null,
                          );
                        }}
                        onDisponibilitaNelGiornoChange={(values) => {
                          setAvailabilityDraft((current) => ({
                            ...current,
                            disponibilita_nel_giorno: values,
                          }));
                          void patchSelectedWorkerField(
                            "disponibilita_nel_giorno",
                            values.length > 0 ? values : null,
                          );
                        }}
                      />
                      <AvailabilityStatusCard
                        isEditing={gateAvailabilityStatusIsEditing}
                        showEditAction={availabilityEditMode === "toggle"}
                        isUpdating={updatingAvailabilityStatus}
                        disponibilitaOptions={disponibilitaLookupOptions}
                        draft={availabilityStatusDraft}
                        selectedDisponibilita={asString(
                          selectedWorkerRow.disponibilita,
                        )}
                        selectedDisponibilitaBadgeClassName={
                          disponibilitaBadgeClassName
                        }
                        selectedDataRitorno={asString(
                          selectedWorkerRow.data_ritorno_disponibilita,
                        )}
                        onToggleEdit={() =>
                          setIsEditingAvailabilityStep((current) => !current)
                        }
                        onDisponibilitaChange={(value) => {
                          setAvailabilityStatusDraft((current) => ({
                            ...current,
                            disponibilita: value,
                          }));
                          void patchWorkerAvailabilityStatus({
                            disponibilita: value || null,
                          });
                        }}
                        onDataRitornoChange={(value) => {
                          setAvailabilityStatusDraft((current) => ({
                            ...current,
                            data_ritorno_disponibilita: value,
                          }));
                          void patchWorkerAvailabilityStatus({
                            data_ritorno_disponibilita: value || null,
                          });
                        }}
                        onDataRitornoBlur={() => undefined}
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
                        vincoliOrari={
                          availabilityDraft.vincoli_orari_disponibilita
                        }
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
                        onSave={() => void saveWorkerAvailability()}
                      />
                    </GateStepSection>
                  )}
                </div>

                <div
                  className={getGateSectionOrderClass(aspettiStep)}
                  ref={(node) => {
                    sectionRefs.current.aspetti = node;
                  }}
                >
                  <GateStepSection
                    step={aspettiStep}
                    showStepper={showStepper}
                    info={stepInfoBySection.aspetti}
                  >
                    {specificChecksMode === "confirmation" ? (
                      <>
                        <GateSpecificChecksCard
                          mobilityValue={
                            useGate1ReorderedSteps
                              ? readArrayStrings(selectedWorkerRow.come_ti_sposti)
                              : undefined
                          }
                          mobilityOptions={
                            useGate1ReorderedSteps
                              ? mobilityLookupOptions
                              : undefined
                          }
                          mobilityAnchor={
                            useGate1ReorderedSteps
                              ? addressMobilityAnchor
                              : undefined
                          }
                          isUpdatingMobility={updatingNonQualificato}
                          isBabysitterEnabled={includesBabysitterType(
                            jobSearchDraft.tipo_lavoro_domestico,
                            tipoLavoroDomesticoOptions,
                          )}
                          neonatiValue={
                            skillsDraft.check_accetta_babysitting_neonati
                          }
                          neonatiOptions={babysittingNeonatiOptions}
                          multipliBambiniValue={
                            skillsDraft.check_accetta_babysitting_multipli_bambini
                          }
                          multipliBambiniOptions={
                            babysittingMultipliBambiniOptions
                          }
                          caniValue={skillsDraft.check_accetta_case_con_cani}
                          caniOptions={caseConCaniOptions}
                          caniGrandiValue={
                            skillsDraft.check_accetta_case_con_cani_grandi
                          }
                          caniGrandiOptions={caseConCaniGrandiOptions}
                          gattiValue={skillsDraft.check_accetta_case_con_gatti}
                          gattiOptions={caseConGattiOptions}
                          scaleValue={
                            skillsDraft.check_accetta_salire_scale_o_soffitti_alti
                          }
                          scaleOptions={scaleSoffittiOptions}
                          trasfertaValue={
                            jobSearchDraft.check_accetta_lavori_con_trasferta
                          }
                          trasfertaOptions={trasfertaOptions}
                          lookupColorsByDomain={lookupColorsByDomain}
                          onMobilityChange={
                            useGate1ReorderedSteps
                              ? (values) => {
                                  setAddressDraft((current) => ({
                                    ...current,
                                    come_ti_sposti: values,
                                  }));
                                  void patchSelectedWorkerField(
                                    "come_ti_sposti",
                                    values.length > 0 ? values : null,
                                  );
                                }
                              : undefined
                          }
                          onNeonatiChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              check_accetta_babysitting_neonati: value,
                            }));
                            void patchSkillsField(
                              "check_accetta_babysitting_neonati",
                              value,
                            );
                          }}
                          onMultipliBambiniChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              check_accetta_babysitting_multipli_bambini: value,
                            }));
                            void patchSkillsField(
                              "check_accetta_babysitting_multipli_bambini",
                              value,
                            );
                          }}
                          onCaniChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              check_accetta_case_con_cani: value,
                            }));
                            void patchSkillsField(
                              "check_accetta_case_con_cani",
                              value,
                            );
                          }}
                          onCaniGrandiChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              check_accetta_case_con_cani_grandi: value,
                            }));
                            void patchSkillsField(
                              "check_accetta_case_con_cani_grandi",
                              value,
                            );
                          }}
                          onGattiChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              check_accetta_case_con_gatti: value,
                            }));
                            void patchSkillsField(
                              "check_accetta_case_con_gatti",
                              value,
                            );
                          }}
                          onScaleChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              check_accetta_salire_scale_o_soffitti_alti: value,
                            }));
                            void patchSkillsField(
                              "check_accetta_salire_scale_o_soffitti_alti",
                              value,
                            );
                          }}
                          onTrasfertaChange={(value) => {
                            setJobSearchDraft((current) => ({
                              ...current,
                              check_accetta_lavori_con_trasferta: value,
                            }));
                            void patchSelectedWorkerField(
                              "check_accetta_lavori_con_trasferta",
                              value || null,
                            );
                          }}
                        />
                        <GateSkillConfirmationsCard
                          isEditing={gateSpecificChecksIsEditing}
                          showEditAction={specificChecksEditMode === "toggle"}
                          onToggleEdit={() =>
                            setIsEditingSkills((current) => !current)
                          }
                          isUpdating={updatingSkills}
                          lookupColorsByDomain={lookupColorsByDomain}
                          livelloItalianoValue={gateDraft.livelloItaliano}
                          livelloItalianoOptions={livelloItalianoOptions}
                          onLivelloItalianoChange={(value) => {
                            setGateDraft((current) => ({
                              ...current,
                              livelloItaliano: value,
                            }));
                            void patchSelectedWorkerField(
                              "livello_italiano",
                              value || null,
                            );
                          }}
                          livelloIngleseValue={skillsDraft.livello_inglese}
                          livelloIngleseOptions={livelloIngleseOptions}
                          onLivelloIngleseChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              livello_inglese: value,
                            }));
                            void patchSkillsField("livello_inglese", value);
                          }}
                          livelloCucinaValue={skillsDraft.livello_cucina}
                          livelloCucinaOptions={livelloCucinaOptions}
                          onLivelloCucinaChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              livello_cucina: value,
                            }));
                            void patchSkillsField("livello_cucina", value);
                          }}
                          livelloStiroValue={skillsDraft.livello_stiro}
                          livelloStiroOptions={livelloStiroOptions}
                          onLivelloStiroChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              livello_stiro: value,
                            }));
                            void patchSkillsField("livello_stiro", value);
                          }}
                          livelloPulizieValue={skillsDraft.livello_pulizie}
                          livelloPulizieOptions={livelloPulizieOptions}
                          onLivelloPulizieChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              livello_pulizie: value,
                            }));
                            void patchSkillsField("livello_pulizie", value);
                          }}
                          livelloBabysittingValue={
                            skillsDraft.livello_babysitting
                          }
                          livelloBabysittingOptions={livelloBabysittingOptions}
                          onLivelloBabysittingChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              livello_babysitting: value,
                            }));
                            void patchSkillsField("livello_babysitting", value);
                          }}
                          livelloDogsittingValue={
                            skillsDraft.livello_dogsitting
                          }
                          livelloDogsittingOptions={livelloDogsittingOptions}
                          onLivelloDogsittingChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              livello_dogsitting: value,
                            }));
                            void patchSkillsField("livello_dogsitting", value);
                          }}
                          livelloGiardinaggioValue={
                            skillsDraft.livello_giardinaggio
                          }
                          livelloGiardinaggioOptions={
                            livelloGiardinaggioOptions
                          }
                          onLivelloGiardinaggioChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              livello_giardinaggio: value,
                            }));
                            void patchSkillsField(
                              "livello_giardinaggio",
                              value,
                            );
                          }}
                          compatibilitaStiroValue={
                            skillsDraft.compatibilita_con_stiro_esigente
                          }
                          compatibilitaStiroOptions={compatibilitaStiroOptions}
                          onCompatibilitaStiroChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              compatibilita_con_stiro_esigente: value,
                            }));
                            void patchSkillsField(
                              "compatibilita_con_stiro_esigente",
                              value,
                            );
                          }}
                          compatibilitaCucinaValue={
                            skillsDraft.compatibilita_con_cucina_strutturata
                          }
                          compatibilitaCucinaOptions={
                            compatibilitaCucinaOptions
                          }
                          onCompatibilitaCucinaChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              compatibilita_con_cucina_strutturata: value,
                            }));
                            void patchSkillsField(
                              "compatibilita_con_cucina_strutturata",
                              value,
                            );
                          }}
                          compatibilitaNeonatiValue={
                            skillsDraft.compatibilita_babysitting_neonati
                          }
                          compatibilitaNeonatiOptions={
                            compatibilitaNeonatiOptions
                          }
                          onCompatibilitaNeonatiChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              compatibilita_babysitting_neonati: value,
                            }));
                            void patchSkillsField(
                              "compatibilita_babysitting_neonati",
                              value,
                            );
                          }}
                          ratingAtteggiamentoValue={
                            gateDraft.ratingAtteggiamento
                          }
                          onRatingAtteggiamentoChange={(value) => {
                            setGateDraft((current) => ({
                              ...current,
                              ratingAtteggiamento: value,
                            }));
                            void patchSelectedWorkerField(
                              "rating_atteggiamento",
                              parseNumberValue(value),
                            );
                          }}
                          ratingCuraPersonaleValue={
                            gateDraft.ratingCuraPersonale
                          }
                          onRatingCuraPersonaleChange={(value) => {
                            setGateDraft((current) => ({
                              ...current,
                              ratingCuraPersonale: value,
                            }));
                            void patchSelectedWorkerField(
                              "rating_cura_personale",
                              parseNumberValue(value),
                            );
                          }}
                          ratingPrecisionePuntualitaValue={
                            gateDraft.ratingPrecisionePuntualita
                          }
                          onRatingPrecisionePuntualitaChange={(value) => {
                            setGateDraft((current) => ({
                              ...current,
                              ratingPrecisionePuntualita: value,
                            }));
                            void patchSelectedWorkerField(
                              "rating_precisione_puntualita",
                              parseNumberValue(value),
                            );
                          }}
                          ratingCapacitaComunicativeValue={
                            gateDraft.ratingCapacitaComunicative
                          }
                          onRatingCapacitaComunicativeChange={(value) => {
                            setGateDraft((current) => ({
                              ...current,
                              ratingCapacitaComunicative: value,
                            }));
                            void patchSelectedWorkerField(
                              "rating_capacita_comunicative",
                              parseNumberValue(value),
                            );
                          }}
                          ratingCorporaturaValue={gateDraft.ratingCorporatura}
                          ratingCorporaturaOptions={ratingCorporaturaOptions}
                          onRatingCorporaturaChange={(value) => {
                            setGateDraft((current) => ({
                              ...current,
                              ratingCorporatura: value,
                            }));
                            void patchSelectedWorkerField(
                              "rating_corporatura",
                              value || null,
                            );
                          }}
                          compatibilitaFamiglieNumeroseValue={
                            skillsDraft.compatibilita_famiglie_numerose
                          }
                          compatibilitaFamiglieNumeroseOptions={
                            compatibilitaFamiglieNumeroseOptions
                          }
                          onCompatibilitaFamiglieNumeroseChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              compatibilita_famiglie_numerose: value,
                            }));
                            void patchSkillsField(
                              "compatibilita_famiglie_numerose",
                              value,
                            );
                          }}
                          compatibilitaFamiglieMoltoEsigentiValue={
                            skillsDraft.compatibilita_famiglie_molto_esigenti
                          }
                          compatibilitaFamiglieMoltoEsigentiOptions={
                            compatibilitaFamiglieMoltoEsigentiOptions
                          }
                          onCompatibilitaFamiglieMoltoEsigentiChange={(
                            value,
                          ) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              compatibilita_famiglie_molto_esigenti: value,
                            }));
                            void patchSkillsField(
                              "compatibilita_famiglie_molto_esigenti",
                              value,
                            );
                          }}
                          compatibilitaDatorePresenteValue={
                            skillsDraft.compatibilita_lavoro_con_datore_presente_in_casa
                          }
                          compatibilitaDatorePresenteOptions={
                            compatibilitaDatorePresenteOptions
                          }
                          onCompatibilitaDatorePresenteChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              compatibilita_lavoro_con_datore_presente_in_casa:
                                value,
                            }));
                            void patchSkillsField(
                              "compatibilita_lavoro_con_datore_presente_in_casa",
                              value,
                            );
                          }}
                          compatibilitaCaseGrandiValue={
                            skillsDraft.compatibilita_con_case_di_grandi_dimensioni
                          }
                          compatibilitaCaseGrandiOptions={
                            compatibilitaCaseGrandiOptions
                          }
                          onCompatibilitaCaseGrandiChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              compatibilita_con_case_di_grandi_dimensioni:
                                value,
                            }));
                            void patchSkillsField(
                              "compatibilita_con_case_di_grandi_dimensioni",
                              value,
                            );
                          }}
                          compatibilitaAnimaliValue={
                            skillsDraft.compatibilita_con_animali_in_casa
                          }
                          compatibilitaAnimaliOptions={
                            compatibilitaAnimaliOptions
                          }
                          onCompatibilitaAnimaliChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              compatibilita_con_animali_in_casa: value,
                            }));
                            void patchSkillsField(
                              "compatibilita_con_animali_in_casa",
                              value,
                            );
                          }}
                          compatibilitaAutonomiaValue={
                            skillsDraft.compatibilita_con_elevata_autonomia_richiesta
                          }
                          compatibilitaAutonomiaOptions={
                            compatibilitaAutonomiaOptions
                          }
                          onCompatibilitaAutonomiaChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              compatibilita_con_elevata_autonomia_richiesta:
                                value,
                            }));
                            void patchSkillsField(
                              "compatibilita_con_elevata_autonomia_richiesta",
                              value,
                            );
                          }}
                          compatibilitaContestiPacatiValue={
                            skillsDraft.compatibilita_con_contesti_pacati
                          }
                          compatibilitaContestiPacatiOptions={
                            compatibilitaContestiPacatiOptions
                          }
                          onCompatibilitaContestiPacatiChange={(value) => {
                            setSkillsDraft((current) => ({
                              ...current,
                              compatibilita_con_contesti_pacati: value,
                            }));
                            void patchSkillsField(
                              "compatibilita_con_contesti_pacati",
                              value,
                            );
                          }}
                        />
                      </>
                    ) : (
                      <GateSpecificChecksCard
                        mobilityValue={
                          useGate1ReorderedSteps
                            ? readArrayStrings(selectedWorkerRow.come_ti_sposti)
                            : undefined
                        }
                        mobilityOptions={
                          useGate1ReorderedSteps
                            ? mobilityLookupOptions
                            : undefined
                        }
                        mobilityAnchor={
                          useGate1ReorderedSteps
                            ? addressMobilityAnchor
                            : undefined
                        }
                        isUpdatingMobility={updatingNonQualificato}
                        isBabysitterEnabled={includesBabysitterType(
                          jobSearchDraft.tipo_lavoro_domestico,
                          tipoLavoroDomesticoOptions,
                        )}
                        neonatiValue={
                          skillsDraft.check_accetta_babysitting_neonati
                        }
                        neonatiOptions={babysittingNeonatiOptions}
                        multipliBambiniValue={
                          skillsDraft.check_accetta_babysitting_multipli_bambini
                        }
                        multipliBambiniOptions={
                          babysittingMultipliBambiniOptions
                        }
                        caniValue={skillsDraft.check_accetta_case_con_cani}
                        caniOptions={caseConCaniOptions}
                        caniGrandiValue={
                          skillsDraft.check_accetta_case_con_cani_grandi
                        }
                        caniGrandiOptions={caseConCaniGrandiOptions}
                        gattiValue={skillsDraft.check_accetta_case_con_gatti}
                        gattiOptions={caseConGattiOptions}
                        scaleValue={
                          skillsDraft.check_accetta_salire_scale_o_soffitti_alti
                        }
                        scaleOptions={scaleSoffittiOptions}
                        trasfertaValue={
                          jobSearchDraft.check_accetta_lavori_con_trasferta
                        }
                        trasfertaOptions={trasfertaOptions}
                        lookupColorsByDomain={lookupColorsByDomain}
                        onMobilityChange={
                          useGate1ReorderedSteps
                            ? (values) => {
                                setAddressDraft((current) => ({
                                  ...current,
                                  come_ti_sposti: values,
                                }));
                                void patchSelectedWorkerField(
                                  "come_ti_sposti",
                                  values.length > 0 ? values : null,
                                );
                              }
                            : undefined
                        }
                        onNeonatiChange={(value) => {
                          setSkillsDraft((current) => ({
                            ...current,
                            check_accetta_babysitting_neonati: value,
                          }));
                          void patchSkillsField(
                            "check_accetta_babysitting_neonati",
                            value,
                          );
                        }}
                        onMultipliBambiniChange={(value) => {
                          setSkillsDraft((current) => ({
                            ...current,
                            check_accetta_babysitting_multipli_bambini: value,
                          }));
                          void patchSkillsField(
                            "check_accetta_babysitting_multipli_bambini",
                            value,
                          );
                        }}
                        onCaniChange={(value) => {
                          setSkillsDraft((current) => ({
                            ...current,
                            check_accetta_case_con_cani: value,
                          }));
                          void patchSkillsField(
                            "check_accetta_case_con_cani",
                            value,
                          );
                        }}
                        onCaniGrandiChange={(value) => {
                          setSkillsDraft((current) => ({
                            ...current,
                            check_accetta_case_con_cani_grandi: value,
                          }));
                          void patchSkillsField(
                            "check_accetta_case_con_cani_grandi",
                            value,
                          );
                        }}
                        onGattiChange={(value) => {
                          setSkillsDraft((current) => ({
                            ...current,
                            check_accetta_case_con_gatti: value,
                          }));
                          void patchSkillsField(
                            "check_accetta_case_con_gatti",
                            value,
                          );
                        }}
                        onScaleChange={(value) => {
                          setSkillsDraft((current) => ({
                            ...current,
                            check_accetta_salire_scale_o_soffitti_alti: value,
                          }));
                          void patchSkillsField(
                            "check_accetta_salire_scale_o_soffitti_alti",
                            value,
                          );
                        }}
                        onTrasfertaChange={(value) => {
                          setJobSearchDraft((current) => ({
                            ...current,
                            check_accetta_lavori_con_trasferta: value,
                          }));
                          void patchSelectedWorkerField(
                            "check_accetta_lavori_con_trasferta",
                            value || null,
                          );
                        }}
                      />
                    )}
                  </GateStepSection>
                </div>

                {showDocumentSection && documentSectionAfterSpecificChecks ? (
                  <div
                    className={getGateSectionOrderClass(documentiStep ?? 0)}
                    ref={(node) => {
                      sectionRefs.current.documenti = node;
                    }}
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
                          data_scadenza_naspi: naspiDocValue,
                        }}
                        documents={selectedWorkerDocuments}
                        documentsLoading={loadingSelectedWorkerDocuments}
                        verificationOptions={documentiVerificatiOptions}
                        statoDocumentiOptions={documentiInRegolaOptions}
                        lookupColorsByDomain={lookupColorsByDomain}
                        showAdministrativeData={!showAdministrativeFields}
                        onToggleEdit={() =>
                          setIsEditingDocuments((current) => !current)
                        }
                        onVerificationChange={(value) => {
                          setDocumentsDraft((current) => ({
                            ...current,
                            stato_verifica_documenti: value,
                          }));
                          void patchDocumentField(
                            "stato_verifica_documenti",
                            value || null,
                          );
                        }}
                        onStatoDocumentiChange={(value) => {
                          setDocumentsDraft((current) => ({
                            ...current,
                            documenti_in_regola: value,
                          }));
                          void patchDocumentField(
                            "documenti_in_regola",
                            value || null,
                          );
                        }}
                        onNaspiChange={(value) => {
                          saveNaspiDoc(value);
                        }}
                        onDocumentUpsert={upsertSelectedWorkerDocument}
                        onUploadError={setError}
                      />
                      <GateDocumentIdentityCard
                        headerDraft={{
                          nome: headerNomeValue,
                          cognome: headerCognomeValue,
                          nazionalita: headerDraft.nazionalita,
                          data_di_nascita: headerDataNascitaValue,
                        }}
                        nazionalitaOptions={nazionalitaLookupOptions}
                        isEditing={true}
                        onHeaderChange={(field, value) => {
                          if (field === "nome") saveHeaderNome(value);
                          else if (field === "cognome") saveHeaderCognome(value);
                          else if (field === "data_di_nascita") saveHeaderDataNascita(value);
                          else if (field === "nazionalita") {
                            setHeaderDraft((current) => ({ ...current, nazionalita: value }));
                            void patchSelectedWorkerField("nazionalita", value || null);
                          }
                        }}
                      />
                      {showAdministrativeFields ? (
                        <GateAdministrativeFieldsCard
                          ibanValue={ibanValue}
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
                          onIbanChange={(value) => {
                            saveIban(value);
                          }}
                          onGenerateStripeAccount={generateStripeAccount}
                        />
                      ) : null}
                    </GateStepSection>
                  </div>
                ) : null}

                {showAssessment ? (
                  <div
                    className={getGateSectionOrderClass(assessmentStep ?? 0)}
                    ref={(node) => {
                      sectionRefs.current.assessment = node;
                    }}
                  >
                    <GateStepSection
                      step={assessmentStep ?? 0}
                      isLast
                      showStepper={showStepper}
                      info={stepInfoBySection.assessment}
                    >
                      <GateAssessmentCard
                        key={selectedWorkerId}
                        statusValue={gateDraft.assessmentStatus}
                        statusOptions={statoLavoratoreOptions}
                        onStatusChange={(value) => {
                          if (selectedWorkerId) {
                            retainSelectedWorkerAfterStatusChange(
                              selectedWorkerId,
                            );
                          }
                          setGateDraft((current) => ({
                            ...current,
                            assessmentStatus: value,
                          }));
                          void patchSelectedWorkerField(
                            "stato_lavoratore",
                            value || null,
                          );
                        }}
                        nonIdoneoReasonValue={nonIdoneoReasonValues[0] ?? ""}
                        nonIdoneoReasonOptions={motivazioniNonIdoneoOptions}
                        onNonIdoneoReasonChange={(value) => {
                          void handleNonIdoneoReasonsChange(
                            value ? [value] : [],
                          );
                        }}
                        feedbackRaw={asString(selectedWorkerRow?.feedback_recruiter)}
                        operatorName={operatorName}
                        onFeedbackSave={(next) =>
                          patchSelectedWorkerField(
                            "feedback_recruiter",
                            next.trim() || null,
                          )
                        }
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
          </WorkerDetailShell>
        ) : null}
      </div>
    </section>
    </Gate1WorkerProvider>
  );
}
