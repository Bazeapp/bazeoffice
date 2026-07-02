import * as React from "react";
import { NotebookPenIcon } from "lucide-react";

import { RecruiterFeedbackPanel } from "../../components/recruiter-feedback-panel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getLookupLabelForSave,
  getLookupSelectValue,
  getTagClassName,
  normalizeLookupComparableToken,
  resolveLookupColor,
} from "../../features/lavoratori/lib/lookup-utils";
import { GateInfoCard } from "./gate-info-card";
import { EMPTY_SELECT_VALUE } from "./gate-field-primitives";

/**
 * D2 — card "Assessment finale" estratta da gate1-view.
 *
 * Prop-driven: lo stato interno serve solo al dialog di conferma cambio-stato;
 * value/options/handler arrivano via prop. React.memo.
 */
export const GateAssessmentCard = React.memo(function GateAssessmentCard({
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
});
