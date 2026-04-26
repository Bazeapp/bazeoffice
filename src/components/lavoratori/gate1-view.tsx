import * as React from "react";
import {
  AlertTriangleIcon,
  BadgeCheckIcon,
  CalendarDaysIcon,
  CheckIcon,
  CircleUserRoundIcon,
  CircleHelpIcon,
  FileSearchIcon,
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
} from "@/components/shared/detail-section-card";
import { SideCardsPanel } from "@/components/shared/side-cards-panel";
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
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  formatAvailabilityComputedAt,
  type AvailabilityEditBandField,
  type AvailabilityEditDayField,
} from "@/features/lavoratori/lib/availability-utils";
import { FieldTitle } from "@/components/ui/field";
import {
  asLavoratoreRecord,
  asInputValue,
  asString,
  parseNumberValue,
  readArrayStrings,
} from "@/features/lavoratori/lib/base-utils";
import {
  getTagClassName,
  resolveLookupColor,
} from "@/features/lavoratori/lib/lookup-utils";
import { useLavoratoriData } from "@/hooks/use-lavoratori-data";
import { useOperatoriOptions } from "@/hooks/use-operatori-options";
import { useSelectedWorkerEditor } from "@/hooks/use-selected-worker-editor";
import { updateRecord } from "@/lib/anagrafiche-api";
import {
  buildAttachmentPayload,
  type MinimalAttachment,
  normalizeAttachmentArray,
} from "@/lib/attachments";
import { supabase } from "@/lib/supabase-client";
import { normalizeWorkerStatus } from "@/features/lavoratori/lib/status-utils";
import type { LavoratoreRecord } from "@/types/entities/lavoratore";

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
};

function includesBabysitterType(
  values: string[],
  options: Array<{ label: string; value: string }>,
) {
  return values.some((value) => {
    const label =
      options.find((option) => option.value === value)?.label ?? value;
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
      contentClassName="space-y-4 pt-1"
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
  info,
  children,
}: {
  step: number;
  isFirst?: boolean;
  isLast?: boolean;
  showStepper?: boolean;
  info?: {
    title: React.ReactNode;
    content: React.ReactNode;
  };
  children: React.ReactNode;
}) {
  if (!showStepper) {
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
        <FieldTitle className="w-24 shrink-0">
          Follow-up chiamata idoneita
        </FieldTitle>
        <div className="min-w-0 flex-1 text-foreground">
          <RadioGroup
            value={followupStatus}
            onValueChange={onFollowupStatusChange}
            className="gap-3 pt-1"
          >
            {options.map((option) => (
              <label
                key={option.value}
                className="bg-background flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2"
              >
                <RadioGroupItem
                  value={option.value}
                  id={`followup-${option.value}`}
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </RadioGroup>
        </div>
      </div>
    </GateInfoCard>
  );
}

function GateReferenteCard({
  title = "Referente idoneità",
  label = "Referente",
  value,
  options,
  disabled,
  onChange,
}: {
  title?: string;
  label?: string;
  value: string;
  options: Array<{ id: string; label: string }>;
  disabled?: boolean;
  onChange: (value: string | null) => void;
}) {
  return (
    <GateInfoCard
      title={title}
      icon={<UsersIcon className="text-muted-foreground size-4" />}
    >
      <div className="flex items-start gap-3 text-sm">
        <FieldTitle className="w-24 shrink-0">{label}</FieldTitle>
        <div className="min-w-0 flex-1 text-foreground">
          <Select
            value={value || "none"}
            onValueChange={(nextValue) =>
              onChange(nextValue === "none" ? null : nextValue)
            }
            disabled={disabled}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Seleziona referente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nessun referente</SelectItem>
              {options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
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

function resolveOperatorLabel(
  value: string,
  options: Array<{ id: string; label: string }>,
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
  options: Array<{ id: string; label: string }>;
  disabled?: boolean;
  onReferenteCertificazioneChange: (value: string | null) => void;
}) {
  return (
    <GateInfoCard
      title="Referente"
      icon={<UsersIcon className="text-muted-foreground size-4" />}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-start gap-3 text-sm">
          <FieldTitle className="w-24 shrink-0">Referente Gate 2</FieldTitle>
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
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Seleziona referente Gate 2" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessun referente Gate 2</SelectItem>
                {options.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-start gap-3 text-sm">
          <FieldTitle className="w-24 shrink-0">Referente Gate 1</FieldTitle>
          <div className="min-w-0 flex-1 text-foreground">
            <div className="bg-muted/40 text-foreground flex min-h-10 items-center rounded-md border px-3 text-sm">
              {resolveOperatorLabel(referenteIdoneitaValue, options)}
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
  onHeaderBlur,
  livelloItalianoOptions,
  onLivelloItalianoChange,
  onLivelloItalianoBlur,
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
  onHeaderBlur: (field: string) => void;
  onLivelloItalianoChange: (value: string) => void;
  onLivelloItalianoBlur: () => void;
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
          onLivelloItalianoBlur={onLivelloItalianoBlur}
          onFieldChange={onHeaderChange}
          onFieldBlur={onHeaderBlur}
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
  feedbackValue,
  onFeedbackChange,
  onFeedbackBlur,
  lookupColorsByDomain,
}: {
  statusValue: string;
  statusOptions: Array<{ label: string; value: string }>;
  onStatusChange: (value: string) => void;
  nonIdoneoReasonValue: string;
  nonIdoneoReasonOptions: Array<{ label: string; value: string }>;
  onNonIdoneoReasonChange: (value: string) => void;
  feedbackValue: string;
  onFeedbackChange: (value: string) => void;
  onFeedbackBlur: () => void;
  lookupColorsByDomain: Map<string, string>;
}) {
  const helperDate = React.useMemo(
    () => new Intl.DateTimeFormat("it-IT").format(new Date()),
    [],
  );
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
  const isNonIdoneo = statusValue === "Non idoneo";
  const [pendingStatusValue, setPendingStatusValue] = React.useState<string | null>(
    null,
  );
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = React.useState(false);

  const handleStatusSelection = React.useCallback(
    (value: string) => {
      if (!value || value === statusValue) return;
      setPendingStatusValue(value);
      setIsStatusConfirmOpen(true);
    },
    [statusValue],
  );

  const handleStatusConfirm = React.useCallback(() => {
    if (!pendingStatusValue) return;
    onStatusChange(pendingStatusValue);
    setIsStatusConfirmOpen(false);
    setPendingStatusValue(null);
  }, [onStatusChange, pendingStatusValue]);

  const handleStatusConfirmOpenChange = React.useCallback((open: boolean) => {
    setIsStatusConfirmOpen(open);
    if (!open) {
      setPendingStatusValue(null);
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
        <p className="text-muted-foreground text-sm">
          Scrivi questa dicitura prima del feedback: [Nome - {helperDate}]
        </p>
      </div>

      <div className="max-w-5xl space-y-2">
        <Textarea
          value={feedbackValue}
          onChange={(event) => onFeedbackChange(event.target.value)}
          onBlur={onFeedbackBlur}
          rows={4}
          className="bg-background min-h-28 w-full"
          placeholder="Aggiungi note di screening"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start">
        <div className="max-w-xs space-y-3">
          <p className="text-sm font-medium">
            Aggiorna lo stato del lavoratore dopo il colloquio
          </p>
          <RadioGroup
            value={statusValue}
            onValueChange={handleStatusSelection}
            className="gap-3"
          >
            {orderedStatusOptions.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 text-sm"
              >
                <RadioGroupItem value={option.label} />
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

        <div className={isNonIdoneo ? "space-y-2" : "space-y-2 opacity-50"}>
          <p className="text-sm">Perchè non è idoneo?</p>
          <p className="text-muted-foreground text-sm">
            Se non trovi una motivazione giusta, aggiungila
          </p>
          <div className="max-w-md">
            <Select
              value={nonIdoneoReasonValue || undefined}
              onValueChange={onNonIdoneoReasonChange}
              disabled={!isNonIdoneo}
            >
              <SelectTrigger className="bg-background">
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
        </div>
      </div>

      <AlertDialog
        open={isStatusConfirmOpen}
        onOpenChange={handleStatusConfirmOpenChange}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader className="place-items-start text-left">
            <AlertDialogTitle className="text-left font-semibold">
              Confermi il cambio di stato?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Lo stato del lavoratore verrà aggiornato da{" "}
              <strong>{statusValue || "nessuno"}</strong> a{" "}
              <strong>{pendingStatusValue || "nessuno"}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusConfirm}>
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

  return (
    <Combobox
      multiple
      autoHighlight
      items={options.map((option) => option.value)}
      value={value}
      onValueChange={(nextValues) => onChange(nextValues as string[])}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values) => (
            <React.Fragment>
              {values.map((itemValue: string) => {
                const label =
                  options.find((option) => option.value === itemValue)?.label ??
                  itemValue;
                return <ComboboxChip key={itemValue}>{label}</ComboboxChip>;
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
              {options.find((option) => option.value === item)?.label ?? item}
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
  situationValue,
  allowedWorks,
  allowedWorkOptions,
  isEditing,
  showReferencesField = false,
  showEditAction = false,
  onToggleEdit,
  onReferenzeChange,
  experienceDraft,
  experiences,
  experiencesLoading,
  references,
  referencesLoading,
  lookupColorsByDomain,
  experienceTipoLavoroOptions,
  experienceTipoRapportoOptions,
  referenceStatusOptions,
  isUpdatingExperience,
  onSituationChange,
  onSituationBlur,
  onAllowedWorksChange,
  onAnniEsperienzaColfChange,
  onAnniEsperienzaBadanteChange,
  onAnniEsperienzaBabysitterChange,
  onAnniEsperienzaColfBlur,
  onAnniEsperienzaBadanteBlur,
  onAnniEsperienzaBabysitterBlur,
  onExperiencePatch,
  onExperienceCreate,
  onReferencePatch,
  onReferenceCreate,
}: {
  workerId: string | null;
  haiReferenze: string;
  referenzeOptions: Array<{ label: string; value: string }>;
  situationValue: string;
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
  experiences: Parameters<typeof ExperienceReferencesCard>[0]["experiences"];
  experiencesLoading: boolean;
  references: Parameters<typeof ExperienceReferencesCard>[0]["references"];
  referencesLoading: boolean;
  lookupColorsByDomain: Map<string, string>;
  experienceTipoLavoroOptions: Array<{ label: string; value: string }>;
  experienceTipoRapportoOptions: Array<{ label: string; value: string }>;
  referenceStatusOptions: Array<{ label: string; value: string }>;
  isUpdatingExperience: boolean;
  onSituationChange: (value: string) => void;
  onSituationBlur: () => void;
  onAllowedWorksChange: (values: string[]) => void;
  onAnniEsperienzaColfChange: (value: string) => void;
  onAnniEsperienzaBadanteChange: (value: string) => void;
  onAnniEsperienzaBabysitterChange: (value: string) => void;
  onAnniEsperienzaColfBlur: () => void;
  onAnniEsperienzaBadanteBlur: () => void;
  onAnniEsperienzaBabysitterBlur: () => void;
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
    () =>
      allowedWorks.map(
        (value) =>
          allowedWorkOptions.find((option) => option.value === value)?.label ?? value,
      ),
    [allowedWorkOptions, allowedWorks],
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
            aria-label={isEditing ? "Termina modifica tipologia lavori" : "Modifica tipologia lavori"}
            title={isEditing ? "Termina modifica tipologia lavori" : "Modifica tipologia lavori"}
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
              value={haiReferenze || undefined}
              onValueChange={onReferenzeChange}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Seleziona referenze" />
              </SelectTrigger>
              <SelectContent>
                {referenzeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="bg-muted/30 rounded-lg border px-3 py-2 text-sm">
              {getLookupDisplayOption(referenzeOptions, haiReferenze)?.label ||
                haiReferenze ||
                "-"}
            </div>
          )}
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm">Che lavori attivi sta svolgendo al momento?</p>
        {isEditing ? (
          <Textarea
            value={situationValue}
            onChange={(event) => onSituationChange(event.target.value)}
            onBlur={onSituationBlur}
            rows={4}
            className="bg-background w-full min-h-28 text-sm"
          />
        ) : (
          <div className="bg-muted/30 rounded-lg border px-3 py-3">
            <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-6">
              {situationValue || "-"}
            </p>
          </div>
        )}
      </div>

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
          <p className="text-sm">Quanti anni di esperienza ha come Colf?</p>
          {isEditing ? (
            <Input
              type="number"
              min="0"
              step="1"
              value={experienceDraft.anni_esperienza_colf}
              onChange={(event) => onAnniEsperienzaColfChange(event.target.value)}
              onBlur={onAnniEsperienzaColfBlur}
              className="bg-background h-9 text-sm"
            />
          ) : (
            <div className="bg-muted/30 rounded-lg border px-3 py-2 text-sm">
              {experienceDraft.anni_esperienza_colf || "-"}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm">
            Quanti anni di esperienza ha come Babysitter?
          </p>
          {isEditing ? (
            <Input
              type="number"
              min="0"
              step="1"
              value={experienceDraft.anni_esperienza_babysitter}
              onChange={(event) =>
                onAnniEsperienzaBabysitterChange(event.target.value)
              }
              onBlur={onAnniEsperienzaBabysitterBlur}
              className="bg-background h-9 text-sm"
            />
          ) : (
            <div className="bg-muted/30 rounded-lg border px-3 py-2 text-sm">
              {experienceDraft.anni_esperienza_babysitter || "-"}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm">Quanti anni di esperienza ha come Badante?</p>
          {isEditing ? (
            <Input
              type="number"
              min="0"
              step="1"
              value={experienceDraft.anni_esperienza_badante}
              onChange={(event) =>
                onAnniEsperienzaBadanteChange(event.target.value)
              }
              onBlur={onAnniEsperienzaBadanteBlur}
              className="bg-background h-9 text-sm"
            />
          ) : (
            <div className="bg-muted/30 rounded-lg border px-3 py-2 text-sm">
              {experienceDraft.anni_esperienza_badante || "-"}
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
        draft={experienceDraft}
        experiences={experiences}
        experiencesLoading={experiencesLoading}
        references={references}
        referencesLoading={referencesLoading}
        lookupColorsByDomain={lookupColorsByDomain}
        experienceTipoLavoroOptions={experienceTipoLavoroOptions}
        experienceTipoRapportoOptions={experienceTipoRapportoOptions}
        referenceStatusOptions={referenceStatusOptions}
        selectedAnniEsperienzaColf={experienceDraft.anni_esperienza_colf}
        selectedAnniEsperienzaBadante={experienceDraft.anni_esperienza_badante}
        selectedAnniEsperienzaBabysitter={experienceDraft.anni_esperienza_babysitter}
        selectedSituazioneLavorativaAttuale={situationValue}
        onToggleEdit={onToggleEdit ?? (() => {})}
        onAnniEsperienzaColfChange={onAnniEsperienzaColfChange}
        onAnniEsperienzaBadanteChange={onAnniEsperienzaBadanteChange}
        onAnniEsperienzaBabysitterChange={onAnniEsperienzaBabysitterChange}
        onSituazioneLavorativaAttualeChange={() => {}}
        onAnniEsperienzaColfBlur={onAnniEsperienzaColfBlur}
        onAnniEsperienzaBadanteBlur={onAnniEsperienzaBadanteBlur}
        onAnniEsperienzaBabysitterBlur={onAnniEsperienzaBabysitterBlur}
        onSituazioneLavorativaAttualeBlur={() => {}}
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
  return options.find((option) => option.label === value || option.value === value);
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
  className,
  helperLines,
}: {
  label: string;
  className: string;
  helperLines?: string[];
}) {
  return (
    <div className="flex items-center gap-1.5">
      <p className={className}>{label}</p>
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
      <GateFieldLabelWithInfo
        label={label}
        className="text-muted-foreground text-xs font-medium tracking-wide"
        helperLines={helperLines}
      />
      {isEditing ? (
        <div className="bg-muted/40 inline-flex w-full flex-wrap rounded-xl p-1">
          {options.map((option) => {
            const nextValue =
              persistMode === "value" ? option.value : option.label;
            const isSelected = normalizedValue === nextValue;
            const color = resolveLookupColor(
              lookupColorsByDomain,
              domain,
              option.label,
            );

            return (
              <Button
                key={option.value}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="lg"
                disabled={isUpdating}
                className={`min-w-20 flex-1 ${isSelected ? getTagClassName(color) : ""}`}
                onClick={() => onChange(nextValue)}
              >
                <span>{option.label}</span>
              </Button>
            );
          })}
        </div>
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
  const selectValue =
    activeOption
      ? persistMode === "value"
        ? activeOption.value
        : activeOption.label
      : value || undefined;

  return (
    <div className="space-y-2">
      <GateFieldLabelWithInfo
        label={label}
        className="text-sm"
        helperLines={helperLines}
      />
      {isEditing ? (
        <Select
          value={selectValue}
          onValueChange={(nextValue) => onChange(nextValue)}
          disabled={isUpdating}
        >
          <SelectTrigger className="bg-background">
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
        <div className="bg-muted/30 flex min-h-10 items-center rounded-lg border px-3 py-2">
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
                  onChange(
                    normalizedRatingScore === score ? "" : String(score),
                  )
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
  mobilityValue,
  mobilityOptions,
  onMobilityChange,
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
  mobilityValue: string;
  mobilityOptions: Array<{ label: string; value: string }>;
  onMobilityChange: (value: string) => void;
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
  compatibilitaFamiglieMoltoEsigentiOptions: Array<{ label: string; value: string }>;
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
            aria-label={isEditing ? "Termina modifica competenze" : "Modifica competenze"}
            title={isEditing ? "Termina modifica competenze" : "Modifica competenze"}
            onClick={onToggleEdit}
          >
            <PencilIcon />
          </Button>
        ) : undefined
      }
    >
      <DetailSectionCard
        title="Mobilita"
        titleOnBorder
        className="border-border/60 bg-background"
        contentClassName="space-y-4"
      >
        <div className="max-w-xl">
          <GateLookupConfirmationField
            label="Conferma che abbia la macchina o la patente"
            value={mobilityValue}
            options={mobilityOptions}
            domain="lavoratori.come_ti_sposti"
            isEditing={isEditing}
            isUpdating={isUpdating}
            lookupColorsByDomain={lookupColorsByDomain}
            onChange={onMobilityChange}
            persistMode="label"
            placeholder="Seleziona opzione"
          />
        </div>
      </DetailSectionCard>

      <DetailSectionCard
        title="Lingue"
        titleOnBorder
        className="border-border/60 bg-background"
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
        titleOnBorder
        className="border-border/60 bg-background"
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
        titleOnBorder
        className="border-border/60 bg-background"
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
        titleOnBorder
        className="border-border/60 bg-background"
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
        titleOnBorder
        className="border-border/60 bg-background"
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
        titleOnBorder
        className="border-border/60 bg-background"
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
  onPagaOrariaRichiestaBlur,
  onMultipliContrattiChange,
  onDataScadenzaNaspiChange,
  onDataScadenzaNaspiBlur,
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
  onPagaOrariaRichiestaBlur: () => void;
  onMultipliContrattiChange: (value: string) => void;
  onDataScadenzaNaspiChange: (value: string) => void;
  onDataScadenzaNaspiBlur: () => void;
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
              onBlur={onPagaOrariaRichiestaBlur}
              disabled={isPagaMinimaDisabled}
              className="bg-background h-9 text-sm"
              placeholder="Inserisci paga oraria"
            />
          ) : (
            <div className="bg-muted/30 rounded-lg border px-3 py-2 text-sm">
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
            onBlur={onDataScadenzaNaspiBlur}
            className="bg-background h-9 text-sm"
          />
        ) : (
          <div className="bg-muted/30 rounded-lg border px-3 py-2 text-sm">
            {dataScadenzaNaspi || "-"}
          </div>
        )}
      </div>
    </GateInfoCard>
  );
}

function GateSpecificChecksCard({
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
  onNeonatiChange,
  onMultipliBambiniChange,
  onCaniChange,
  onCaniGrandiChange,
  onGattiChange,
  onScaleChange,
  onTrasfertaChange,
}: {
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
  onNeonatiChange: (value: string) => void;
  onMultipliBambiniChange: (value: string) => void;
  onCaniChange: (value: string) => void;
  onCaniGrandiChange: (value: string) => void;
  onGattiChange: (value: string) => void;
  onScaleChange: (value: string) => void;
  onTrasfertaChange: (value: string) => void;
}) {
  return (
    <GateInfoCard
      title="Check disponibilita aspetti specifici"
      icon={<ShieldCheckIcon className="text-muted-foreground size-4" />}
    >
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
            value={documentiInRegola || undefined}
            onValueChange={onDocumentiChange}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Seleziona stato documenti" />
            </SelectTrigger>
            <SelectContent>
              {documentiOptions.map((option) => (
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
            value={haiReferenze || undefined}
            onValueChange={onReferenzeChange}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Seleziona referenze" />
            </SelectTrigger>
            <SelectContent>
              {referenzeOptions.map((option) => (
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
  onIbanChange,
  onIbanBlur,
  onStripeAccountChange,
  onStripeAccountBlur,
}: {
  ibanValue: string;
  stripeAccountValue: string;
  isEditing: boolean;
  onIbanChange: (value: string) => void;
  onIbanBlur: () => void;
  onStripeAccountChange: (value: string) => void;
  onStripeAccountBlur: () => void;
}) {
  return (
    <GateInfoCard
      title="Dati amministrativi"
      icon={<NotebookPenIcon className="text-muted-foreground size-4" />}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <p className="text-sm">IBAN</p>
          {isEditing ? (
            <Input
              value={ibanValue}
              onChange={(event) => onIbanChange(event.target.value)}
              onBlur={onIbanBlur}
              className="bg-background h-9 text-sm"
              placeholder="Inserisci IBAN"
            />
          ) : (
            <div className="bg-muted/30 rounded-lg border px-3 py-2 text-sm">
              {ibanValue || "-"}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-sm">ID account Stripe</p>
          {isEditing ? (
            <Input
              value={stripeAccountValue}
              onChange={(event) => onStripeAccountChange(event.target.value)}
              onBlur={onStripeAccountBlur}
              className="bg-background h-9 text-sm"
              placeholder="Inserisci ID account Stripe"
            />
          ) : (
            <div className="bg-muted/30 rounded-lg border px-3 py-2 text-sm">
              {stripeAccountValue || "-"}
            </div>
          )}
        </div>
      </div>
    </GateInfoCard>
  );
}

function GateDocumentIdentityCard({
  headerDraft,
  nazionalitaOptions,
  isEditing,
  onHeaderChange,
  onHeaderBlur,
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
  onHeaderBlur: (field: string) => void;
}) {
  const canUseNazionalitaSelect = nazionalitaOptions.length > 0;

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
            onBlur={() => onHeaderBlur("nome")}
            className="bg-background h-9 text-sm"
            disabled={!isEditing}
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm">Verifica che il cognome sia corretto</p>
          <Input
            value={headerDraft.cognome}
            onChange={(event) => onHeaderChange("cognome", event.target.value)}
            onBlur={() => onHeaderBlur("cognome")}
            className="bg-background h-9 text-sm"
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
            onBlur={() => onHeaderBlur("data_di_nascita")}
            className="bg-background h-9 text-sm"
            disabled={!isEditing}
          />
        </div>
        <div className="space-y-2">
          <p className="text-sm">Verifica la nazionalita</p>
          {canUseNazionalitaSelect ? (
            <Select
              value={headerDraft.nazionalita || undefined}
              onValueChange={(value) => {
                onHeaderChange("nazionalita", value);
                onHeaderBlur("nazionalita");
              }}
              disabled={!isEditing}
            >
              <SelectTrigger className="bg-background h-9">
                <SelectValue placeholder="Seleziona nazionalita" />
              </SelectTrigger>
              <SelectContent>
                {nazionalitaOptions.map((option) => (
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
              onBlur={() => onHeaderBlur("nazionalita")}
              className="bg-background h-9 text-sm"
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
}: GateViewProps) {
  const {
    workers,
    workerRows,
    selectedWorkerId,
    setSelectedWorkerId,
    selectedWorker,
    selectedWorkerRow,
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
    pageIndex,
    setPageIndex,
    pageCount,
    currentPage,
    applyUpdatedWorkerRow,
    applyUpdatedWorkerExperience,
    appendCreatedWorkerExperience,
    removeWorkerExperience,
    applyUpdatedWorkerReference,
    appendCreatedWorkerReference,
    upsertSelectedWorkerDocument,
  } = useLavoratoriData({ forcedWorkerStatus: workerStatus, applyGate1BaseFilters });
  const groupingOptions = React.useMemo(
    () => filterFields.map((field) => ({ label: field.label, value: field.value })),
    [filterFields],
  );

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
    setExperienceDraft,
    skillsDraft,
    setSkillsDraft,
    documentsDraft,
    setDocumentsDraft,
    presentationPhotoSlots,
    updatingAvailability,
    updatingAvailabilityStatus,
    updatingExperience,
    updatingSkills,
    updatingDocuments,
    updatingNonQualificato,
    handleNonIdoneoReasonsChange,
    patchSelectedWorkerField,
    commitHeaderField,
    commitAddressField,
    commitAvailabilityField,
    commitAvailabilityStatusField,
    patchAvailabilityStatusValue,
    handleAvailabilityMatrixChange,
    patchExperienceRecord,
    createExperienceRecord,
    patchReferenceRecord,
    createReferenceRecord,
    commitExperienceField,
    patchSkillsField,
    patchDocumentField,
    commitDocumentField,
    AVAILABILITY_EDIT_DAYS,
    AVAILABILITY_EDIT_BANDS,
    AVAILABILITY_HOUR_LABELS,
  } = useSelectedWorkerEditor({
    selectedWorkerId,
    selectedWorker,
    selectedWorkerRow,
    selectedWorkerAddress: null,
    lookupColorsByDomain,
    setError,
    applyUpdatedWorkerRow,
    applyUpdatedWorkerAddress: () => {},
    applyUpdatedWorkerExperience,
    appendCreatedWorkerExperience,
    removeWorkerExperience,
    applyUpdatedWorkerReference,
    appendCreatedWorkerReference,
  });

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
    documentSectionMode ?? (showSelfCertification ? "self_certification" : "hidden");
  const showDocumentSection = resolvedDocumentSectionMode !== "hidden";
  const documentSectionAfterSpecificChecks =
    resolvedDocumentSectionMode === "documents";

  const firstGateSection = showCertificationReferente
    ? "referente"
    : showFollowup
      ? "contatti"
      : "presentazione";
  const [activeGateSection, setActiveGateSection] = React.useState(firstGateSection);
  const detailScrollRef = React.useRef<HTMLElement | null>(null);
  const sectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const addressMobilityAnchor = useComboboxAnchor();
  const [isEditingAvailabilityStep, setIsEditingAvailabilityStep] =
    React.useState(false);
  const [isEditingBazeChecks, setIsEditingBazeChecks] = React.useState(false);
  const workerPhotoInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploadingWorkerPhoto, setUploadingWorkerPhoto] = React.useState(false);
  const [gateProvinciaFilter, setGateProvinciaFilter] = React.useState("all");
  const [gateFollowupFilter, setGateFollowupFilter] = React.useState("all");
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

  const gateProvinciaOptions = React.useMemo(() => {
    const labels = new Map<string, string>();
    for (const worker of baseGateWorkers) {
      const value = asString(workerRowsById.get(worker.id)?.provincia);
      if (!value) continue;
      const key = value.trim().toLowerCase();
      if (!labels.has(key)) labels.set(key, value);
    }
    return Array.from(labels.values()).sort((a, b) => a.localeCompare(b, "it"));
  }, [baseGateWorkers, workerRowsById]);

  const gateFollowupOptions = React.useMemo(() => {
    const optionLabels = (
      lookupOptionsByDomain.get("lavoratori.followup_chiamata_idoneita") ?? []
    ).map((option) => option.label);
    const rowLabels = baseGateWorkers
      .map((worker) =>
        asString(workerRowsById.get(worker.id)?.followup_chiamata_idoneita),
      )
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set([...optionLabels, ...rowLabels]));
  }, [baseGateWorkers, lookupOptionsByDomain, workerRowsById]);

  const gateWorkers = React.useMemo(() => {
    return baseGateWorkers.filter((worker) => {
      const row = workerRowsById.get(worker.id);
      if (!row) return false;

      const matchesProvincia =
        gateProvinciaFilter === "all" ||
        asString(row.provincia) === gateProvinciaFilter;
      const matchesFollowup =
        gateFollowupFilter === "all" ||
        asString(row.followup_chiamata_idoneita) === gateFollowupFilter;

      return matchesProvincia && matchesFollowup;
    });
  }, [
    baseGateWorkers,
    gateFollowupFilter,
    gateProvinciaFilter,
    workerRowsById,
  ]);

  const {
    presentationStep,
    documentiStep,
    tipologiaStep,
    disponibilitaStep,
    bazeChecksStep,
    aspettiStep,
    assessmentStep,
  } = React.useMemo(() => {
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
    () => lookupOptionsByDomain.get("lavoratori.stato_verifica_documenti") ?? [],
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
  const provinciaLookupOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.provincia") ?? [],
    [lookupOptionsByDomain],
  );
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
      lookupOptionsByDomain.get("lavoratori.compatibilita_con_stiro_esigente") ??
      [],
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
      lookupOptionsByDomain.get("lavoratori.compatibilita_babysitting_neonati") ??
      [],
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
      lookupOptionsByDomain.get("lavoratori.compatibilita_con_animali_in_casa") ??
      [],
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
      lookupOptionsByDomain.get("lavoratori.compatibilita_con_contesti_pacati") ??
      [],
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
  const statoLavoratoreOptions = React.useMemo(
    () => lookupOptionsByDomain.get("lavoratori.stato_lavoratore") ?? [],
    [lookupOptionsByDomain],
  );
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
    () => [
      ...(showCertificationReferente
        ? [{ id: "referente", label: "Referente", icon: UsersIcon }]
        : []),
      ...(showFollowup
        ? [{ id: "contatti", label: "Follow-up", icon: PhoneIcon }]
        : []),
      {
        id: "presentazione",
        label: "Presentazione",
        icon: CircleUserRoundIcon,
      },
      ...(showDocumentSection && !documentSectionAfterSpecificChecks
        ? [
            {
              id: "documenti",
              label: "Autocertificazioni",
              icon: FileSearchIcon,
            },
          ]
        : []),
      { id: "tipologia", label: "Tipologia lavori", icon: BadgeCheckIcon },
      { id: "disponibilita", label: "Disponibilita", icon: CalendarDaysIcon },
      {
        id: "aspetti",
        label: specificChecksMode === "confirmation" ? "Competenze" : "Aspetti specifici",
        icon: ShieldCheckIcon,
      },
      ...(showDocumentSection && documentSectionAfterSpecificChecks
        ? [
            {
              id: "documenti",
              label: "Documenti",
              icon: NotebookPenIcon,
            },
          ]
        : []),
      ...(showAssessment
        ? [{ id: "assessment", label: "Assessment", icon: StarIcon }]
        : []),
    ],
    [
      documentSectionAfterSpecificChecks,
      showCertificationReferente,
      showAssessment,
      showDocumentSection,
      showFollowup,
      specificChecksMode,
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
  }, [selectedWorkerId]);

  const selectedWorkerStatusAlert = React.useMemo(() => {
    if (!selectedWorkerRow) return null;

    if (selectedWorkerIsNonIdoneo) {
      const fallbackReasons = readArrayStrings(selectedWorkerRow.motivazione_non_idoneo);
      const reasonValues =
        nonIdoneoReasonValues.length > 0 ? nonIdoneoReasonValues : fallbackReasons;
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
    setGateDraft({
      referenteIdoneita: asString(selectedWorkerRow?.["referente_idoneità"]),
      referenteCertificazione: asString(
        selectedWorkerRow?.referente_certificazione,
      ),
      followupStatus: asString(selectedWorkerRow?.followup_chiamata_idoneita),
      descrizionePubblica: asString(selectedWorkerRow?.descrizione_pubblica),
      livelloItaliano: asString(selectedWorkerRow?.livello_italiano),
      ratingAtteggiamento: asInputValue(selectedWorkerRow?.rating_atteggiamento),
      ratingCuraPersonale: asInputValue(selectedWorkerRow?.rating_cura_personale),
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
    [applyUpdatedWorkerRow, selectedWorkerId, selectedWorkerRow?.foto, setError],
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
    <>
      <input
        ref={workerPhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleWorkerPhotoInputChange}
      />
      <div
      className={
        selectedWorkerId
          ? "grid h-full min-h-0 gap-3 lg:grid-cols-[332px_minmax(0,1fr)]"
          : "grid h-full min-h-0 gap-3 grid-cols-1"
      }
    >
      <div className="flex min-h-0 flex-col gap-2">
        <SideCardsPanel
          title={gateLabel}
          icon={UsersIcon}
          subtitle={
            loading
              ? "Caricamento..."
              : `${gateWorkers.length} lavoratori ${workerCountLabel}`
          }
          headerClassName="px-5 pb-1"
          contentClassName="space-y-3 px-5 pt-0 pb-3"
          className="h-full gap-2"
        >
          <DataTableToolbar
            table={table}
            searchValue={searchValue}
            onSearchValueChange={setSearchValue}
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
          />

          <div className="grid gap-2 rounded-xl border bg-muted/20 p-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-muted-foreground text-[11px] font-medium">
                  Provincia
                </p>
                <Select
                  value={gateProvinciaFilter}
                  onValueChange={setGateProvinciaFilter}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Tutte le province" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutte le province</SelectItem>
                    {gateProvinciaOptions.map((provincia) => (
                      <SelectItem key={provincia} value={provincia}>
                        {provincia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <p className="text-muted-foreground text-[11px] font-medium">
                  Follow-up
                </p>
                <Select
                  value={gateFollowupFilter}
                  onValueChange={setGateFollowupFilter}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full bg-background">
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
            </div>
            {gateProvinciaFilter !== "all" || gateFollowupFilter !== "all" ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs">
                  {gateWorkers.length} di {baseGateWorkers.length} lavoratori
                </p>
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
          </div>

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
                return (
                  <LavoratoreCard
                    key={worker.id}
                    worker={worker}
                    isActive={worker.id === selectedWorkerId}
                    variant="gate1"
                    gate1Summary={{
                      provincia: asString(row?.provincia),
                      createdAt:
                        asString(row?.data_ora_di_creazione) ||
                        asString(row?.creato_il),
                      followup: asString(row?.followup_chiamata_idoneita),
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

        <div className="text-muted-foreground flex items-center justify-between px-1 text-xs">
          <p>
            Pagina {currentPage} di {pageCount} ({gateWorkers.length}{" "}
            {workerCountLabel} in pagina)
          </p>
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  text="Prec"
                  className={
                    pageIndex <= 0 || loading
                      ? "pointer-events-none opacity-50"
                      : undefined
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    if (pageIndex <= 0 || loading) return;
                    setPageIndex((previous) => Math.max(previous - 1, 0));
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  text="Succ"
                  className={
                    currentPage >= pageCount || loading
                      ? "pointer-events-none opacity-50"
                      : undefined
                  }
                  onClick={(event) => {
                    event.preventDefault();
                    if (currentPage >= pageCount || loading) return;
                    setPageIndex((previous) => previous + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      {selectedWorkerId ? (
        <WorkerDetailShell
          sectionRef={detailScrollRef}
          tabs={gateTabs}
          activeSection={activeGateSection}
          onSectionChange={scrollToSection}
        >
          {selectedWorker && selectedWorkerRow ? (
            <div className="space-y-6 pt-4 pb-4 text-sm">
                {showCertificationReferente ? (
                  <div
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
                            "referente_certificazione",
                            value,
                          );
                        }}
                      />
                    </GateStepSection>
                  </div>
                ) : null}

                {showFollowup ? (
                  <div
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
                        options={referenteIdoneitaOptions}
                        disabled={referenteIdoneitaOptionsLoading}
                        onChange={(value) => {
                          setGateDraft((current) => ({
                            ...current,
                            referenteIdoneita: value ?? "",
                          }));
                          void patchSelectedWorkerField(
                            "referente_idoneità",
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
                  ref={(node) => {
                    sectionRefs.current.presentazione = node;
                  }}
                >
                  <GateStepSection
                    step={presentationStep}
                    isFirst={!showFollowup && !showCertificationReferente}
                    showStepper={showStepper}
                    info={stepInfoBySection.presentazione}
                  >
                    <GatePresentationCard
                      worker={selectedWorker}
                      workerRow={selectedWorkerRow}
                      statusAlert={selectedWorkerStatusAlert}
                      headerDraft={headerDraft}
                      descriptionValue={gateDraft.descrizionePubblica}
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
                          setGateDraft((current) => ({
                            ...current,
                            descrizionePubblica: value,
                          }));
                          return;
                        }

                        setHeaderDraft((current) => ({
                          ...current,
                          [field]: value,
                        }));
                      }}
                      onHeaderBlur={(field) => {
                        if (field === "descrizione_pubblica") {
                          void patchSelectedWorkerField(
                            "descrizione_pubblica",
                            gateDraft.descrizionePubblica || null,
                          );
                          return;
                        }

                        void commitHeaderField(
                          field as
                            | "nome"
                            | "cognome"
                            | "email"
                            | "telefono"
                            | "sesso"
                            | "nazionalita"
                            | "data_di_nascita",
                        );
                      }}
                      onLivelloItalianoChange={(value) =>
                        setGateDraft((current) => ({
                          ...current,
                          livelloItaliano: value,
                        }))
                      }
                      onLivelloItalianoBlur={() =>
                        void patchSelectedWorkerField(
                          "livello_italiano",
                          gateDraft.livelloItaliano || null,
                        )
                      }
                    />

                    <AddressSectionCard
                      isEditing={gateAddressIsEditing}
                      isUpdating={updatingNonQualificato}
                      showEditAction={addressEditMode === "toggle"}
                      showCap={false}
                      addressDraft={addressDraft}
                      provinciaOptions={provinciaLookupOptions}
                      mobilityOptions={mobilityLookupOptions}
                      selectedProvincia={asString(selectedWorkerRow.provincia)}
                      selectedCap={asString(selectedWorkerRow.cap)}
                      selectedAddress={asString(
                        selectedWorkerRow.indirizzo_residenza_completo,
                      )}
                      selectedMobility={readArrayStrings(
                        selectedWorkerRow.come_ti_sposti,
                      )}
                      mobilityAnchor={addressMobilityAnchor}
                      onToggleEdit={() =>
                        setIsEditingAddress((current) => !current)
                      }
                      onProvinciaChange={(value) => {
                        setAddressDraft((current) => ({
                          ...current,
                          provincia: value,
                        }));
                        void patchSelectedWorkerField(
                          "provincia",
                          value || null,
                        );
                      }}
                      onCapChange={(value) =>
                        setAddressDraft((current) => ({
                          ...current,
                          cap: value,
                        }))
                      }
                      onCapBlur={() => void commitAddressField("cap")}
                      onAddressChange={(value) =>
                        setAddressDraft((current) => ({
                          ...current,
                          indirizzo_residenza_completo: value,
                        }))
                      }
                      onAddressBlur={() =>
                        void commitAddressField("indirizzo_residenza_completo")
                      }
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
                      situationValue={
                        experienceDraft.situazione_lavorativa_attuale
                      }
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
                      onSituationChange={(value) =>
                        setExperienceDraft((current) => ({
                          ...current,
                          situazione_lavorativa_attuale: value,
                        }))
                      }
                      onSituationBlur={() =>
                        void commitExperienceField(
                          "situazione_lavorativa_attuale",
                        )
                      }
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
                      onAnniEsperienzaColfChange={(value) =>
                        setExperienceDraft((current) => ({
                          ...current,
                          anni_esperienza_colf: value,
                        }))
                      }
                      onAnniEsperienzaBadanteChange={(value) =>
                        setExperienceDraft((current) => ({
                          ...current,
                          anni_esperienza_badante: value,
                        }))
                      }
                      onAnniEsperienzaBabysitterChange={(value) =>
                        setExperienceDraft((current) => ({
                          ...current,
                          anni_esperienza_babysitter: value,
                        }))
                      }
                      onAnniEsperienzaColfBlur={() =>
                        void commitExperienceField("anni_esperienza_colf")
                      }
                      onAnniEsperienzaBadanteBlur={() =>
                        void commitExperienceField("anni_esperienza_badante")
                      }
                      onAnniEsperienzaBabysitterBlur={() =>
                        void commitExperienceField("anni_esperienza_babysitter")
                      }
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
                  ref={(node) => {
                    sectionRefs.current.disponibilita = node;
                  }}
                >
                  {splitBazeChecksStep ? (
                    <>
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
                            void patchAvailabilityStatusValue(
                              "disponibilita",
                              value,
                            );
                          }}
                          onDataRitornoChange={(value) =>
                            setAvailabilityStatusDraft((current) => ({
                              ...current,
                              data_ritorno_disponibilita: value,
                            }))
                          }
                          onDataRitornoBlur={() =>
                            void commitAvailabilityStatusField(
                              "data_ritorno_disponibilita",
                            )
                          }
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
                          onVincoliBlur={() =>
                            void commitAvailabilityField(
                              "vincoli_orari_disponibilita",
                            )
                          }
                        />
                      </GateStepSection>

                      <div className="pt-6">
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
                            pagaOrariaRichiesta={gateDraft.pagaOrariaRichiesta}
                            multipliContratti={
                              gateDraft.checkAccettaMultipliContratti
                            }
                            multipliContrattiOptions={multipliContrattiOptions}
                            dataScadenzaNaspi={gateDraft.dataScadenzaNaspi}
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
                            onPagaOrariaRichiestaChange={(value) =>
                              setGateDraft((current) => ({
                                ...current,
                                pagaOrariaRichiesta: value,
                              }))
                            }
                            onPagaOrariaRichiestaBlur={() =>
                              void patchSelectedWorkerField(
                                "paga_oraria_richiesta",
                                parseNumberValue(gateDraft.pagaOrariaRichiesta),
                              )
                            }
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
                            onDataScadenzaNaspiChange={(value) =>
                              setGateDraft((current) => ({
                                ...current,
                                dataScadenzaNaspi: value,
                              }))
                            }
                            onDataScadenzaNaspiBlur={() =>
                              void patchSelectedWorkerField(
                                "data_scadenza_naspi",
                                gateDraft.dataScadenzaNaspi || null,
                              )
                            }
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
                        pagaOrariaRichiesta={gateDraft.pagaOrariaRichiesta}
                        multipliContratti={
                          gateDraft.checkAccettaMultipliContratti
                        }
                        multipliContrattiOptions={multipliContrattiOptions}
                        dataScadenzaNaspi={gateDraft.dataScadenzaNaspi}
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
                        onPagaOrariaRichiestaChange={(value) =>
                          setGateDraft((current) => ({
                            ...current,
                            pagaOrariaRichiesta: value,
                          }))
                        }
                        onPagaOrariaRichiestaBlur={() =>
                          void patchSelectedWorkerField(
                            "paga_oraria_richiesta",
                            parseNumberValue(gateDraft.pagaOrariaRichiesta),
                          )
                        }
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
                        onDataScadenzaNaspiChange={(value) =>
                          setGateDraft((current) => ({
                            ...current,
                            dataScadenzaNaspi: value,
                          }))
                        }
                        onDataScadenzaNaspiBlur={() =>
                          void patchSelectedWorkerField(
                            "data_scadenza_naspi",
                            gateDraft.dataScadenzaNaspi || null,
                          )
                        }
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
                          void patchAvailabilityStatusValue(
                            "disponibilita",
                            value,
                          );
                        }}
                        onDataRitornoChange={(value) =>
                          setAvailabilityStatusDraft((current) => ({
                            ...current,
                            data_ritorno_disponibilita: value,
                          }))
                        }
                        onDataRitornoBlur={() =>
                          void commitAvailabilityStatusField(
                            "data_ritorno_disponibilita",
                          )
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
                        onVincoliBlur={() =>
                          void commitAvailabilityField(
                            "vincoli_orari_disponibilita",
                          )
                        }
                      />
                    </GateStepSection>
                  )}
                </div>

                <div
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
                      <GateSkillConfirmationsCard
                        isEditing={gateSpecificChecksIsEditing}
                        showEditAction={specificChecksEditMode === "toggle"}
                        onToggleEdit={() =>
                          setIsEditingSkills((current) => !current)
                        }
                        isUpdating={updatingSkills}
                        lookupColorsByDomain={lookupColorsByDomain}
                        mobilityValue={addressDraft.come_ti_sposti[0] ?? ""}
                        mobilityOptions={mobilityLookupOptions}
                        onMobilityChange={(value) => {
                          const nextValues = value ? [value] : [];
                          setAddressDraft((current) => ({
                            ...current,
                            come_ti_sposti: nextValues,
                          }));
                          void patchSelectedWorkerField(
                            "come_ti_sposti",
                            nextValues.length > 0 ? nextValues : null,
                          );
                        }}
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
                        livelloDogsittingValue={skillsDraft.livello_dogsitting}
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
                        livelloGiardinaggioOptions={livelloGiardinaggioOptions}
                        onLivelloGiardinaggioChange={(value) => {
                          setSkillsDraft((current) => ({
                            ...current,
                            livello_giardinaggio: value,
                          }));
                          void patchSkillsField("livello_giardinaggio", value);
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
                        compatibilitaCucinaOptions={compatibilitaCucinaOptions}
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
                        compatibilitaNeonatiOptions={compatibilitaNeonatiOptions}
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
                        ratingAtteggiamentoValue={gateDraft.ratingAtteggiamento}
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
                        ratingCuraPersonaleValue={gateDraft.ratingCuraPersonale}
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
                        onCompatibilitaFamiglieMoltoEsigentiChange={(value) => {
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
                            compatibilita_con_case_di_grandi_dimensioni: value,
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
                      <GateSpecificChecksCard
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
                      </>
                    ) : (
                      <GateSpecificChecksCard
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
                          data_scadenza_naspi: asString(
                            selectedWorkerRow?.data_scadenza_naspi,
                          ),
                        }}
                        documents={selectedWorkerDocuments}
                        documentsLoading={loadingSelectedWorkerDocuments}
                        verificationOptions={documentiVerificatiOptions}
                        statoDocumentiOptions={documentiInRegolaOptions}
                        lookupColorsByDomain={lookupColorsByDomain}
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
                        onNaspiChange={(value) =>
                          setDocumentsDraft((current) => ({
                            ...current,
                            data_scadenza_naspi: value,
                          }))
                        }
                        onNaspiBlur={() =>
                          void commitDocumentField("data_scadenza_naspi")
                        }
                        onDocumentUpsert={upsertSelectedWorkerDocument}
                        onUploadError={setError}
                      />
                      <GateDocumentIdentityCard
                        headerDraft={{
                          nome: headerDraft.nome,
                          cognome: headerDraft.cognome,
                          nazionalita: headerDraft.nazionalita,
                          data_di_nascita: headerDraft.data_di_nascita,
                        }}
                        nazionalitaOptions={nazionalitaLookupOptions}
                        isEditing={true}
                        onHeaderChange={(field, value) =>
                          setHeaderDraft((current) => ({
                            ...current,
                            [field]: value,
                          }))
                        }
                        onHeaderBlur={(field) =>
                          void commitHeaderField(
                            field as
                              | "nome"
                              | "cognome"
                              | "data_di_nascita"
                              | "nazionalita",
                          )
                        }
                      />
                      {showAdministrativeFields ? (
                        <GateAdministrativeFieldsCard
                          ibanValue={documentsDraft.iban}
                          stripeAccountValue={documentsDraft.id_stripe_account}
                          isEditing={gateDocumentsIsEditing}
                          onIbanChange={(value) =>
                            setDocumentsDraft((current) => ({
                              ...current,
                              iban: value,
                            }))
                          }
                          onIbanBlur={() => void commitDocumentField("iban")}
                          onStripeAccountChange={(value) =>
                            setDocumentsDraft((current) => ({
                              ...current,
                              id_stripe_account: value,
                            }))
                          }
                          onStripeAccountBlur={() =>
                            void commitDocumentField("id_stripe_account")
                          }
                        />
                      ) : null}
                    </GateStepSection>
                  </div>
                ) : null}

                {showAssessment ? (
                  <div
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
                        feedbackValue={gateDraft.assessmentFeedback}
                        onFeedbackChange={(value) =>
                          setGateDraft((current) => ({
                            ...current,
                            assessmentFeedback: value,
                          }))
                        }
                        onFeedbackBlur={() => {
                          void patchSelectedWorkerField(
                            "feedback_recruiter",
                            gateDraft.assessmentFeedback.trim() || null,
                          );
                        }}
                        lookupColorsByDomain={lookupColorsByDomain}
                      />
                    </GateStepSection>
                  </div>
                ) : null}
            </div>
          ) : null}
        </WorkerDetailShell>
      ) : null}
      </div>
    </>
  );
}
