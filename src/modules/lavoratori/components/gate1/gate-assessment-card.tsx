import * as React from "react";
import { NotebookPenIcon } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";

import { RecruiterFeedbackPanel } from "../../components/recruiter-feedback-panel";
import { asString } from "../../lib/base-utils";
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
} from "../../lib/lookup-utils";
import { GateInfoCard } from "./gate-info-card";
import { EMPTY_SELECT_VALUE } from "./gate-field-primitives";
import { useGate1WorkerEditor } from "./gate1-worker-context";

/**
 * D2 — card "Assessment finale" estratta da gate1-view.
 *
 * Field roll-out: stato/motivazione leggono da gateFieldsForm; il salvataggio
 * resta imperativo (dialog di conferma) e non passa dall'autosave debounced.
 * Feedback recruiter: append imperativo via patch dal context.
 */
export const GateAssessmentCard = React.memo(function GateAssessmentCard({
  statusOptions,
  nonIdoneoReasonOptions,
  operatorName,
  lookupColorsByDomain,
}: {
  statusOptions: Array<{ label: string; value: string }>;
  nonIdoneoReasonOptions: Array<{ label: string; value: string }>;
  operatorName: string;
  lookupColorsByDomain: Map<string, string>;
}) {
  const { setValue } = useFormContext();
  const {
    editor: {
      patchSelectedWorkerField,
      handleNonIdoneoReasonsChange,
    },
    workerRow,
    retainSelectedWorkerAfterStatusChange,
  } = useGate1WorkerEditor();

  const statusValue = useWatch({ name: "stato_lavoratore" }) as string | undefined;
  const nonIdoneoReasonValue = useWatch({
    name: "motivazione_non_idoneo",
  }) as string | undefined;
  const resolvedStatusValue =
    typeof statusValue === "string" ? statusValue : "";
  const resolvedNonIdoneoReason =
    typeof nonIdoneoReasonValue === "string" ? nonIdoneoReasonValue : "";
  const feedbackRaw = asString(workerRow?.feedback_recruiter);

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
      if (!nextValue || nextValue === resolvedStatusValue) return;
      setPendingStatusValue(nextValue);
      setPendingNonIdoneoReason(resolvedNonIdoneoReason);
      setIsStatusConfirmOpen(true);
    },
    [orderedStatusOptions, resolvedStatusValue, resolvedNonIdoneoReason],
  );

  const handleStatusConfirm = React.useCallback(() => {
    if (!pendingStatusValue) return;
    const willBeNonIdoneo =
      normalizeLookupComparableToken(pendingStatusValue) === "non idoneo";
    const workerId = asString(workerRow?.id);

    if (workerId) {
      retainSelectedWorkerAfterStatusChange?.(workerId);
    }

    void patchSelectedWorkerField("stato_lavoratore", pendingStatusValue || null);
    setValue("stato_lavoratore", pendingStatusValue, { shouldDirty: false });

    if (willBeNonIdoneo) {
      void handleNonIdoneoReasonsChange(
        pendingNonIdoneoReason ? [pendingNonIdoneoReason] : [],
      );
      setValue("motivazione_non_idoneo", pendingNonIdoneoReason, {
        shouldDirty: false,
      });
    }

    setIsStatusConfirmOpen(false);
    setPendingStatusValue(null);
    setPendingNonIdoneoReason("");
  }, [
    handleNonIdoneoReasonsChange,
    patchSelectedWorkerField,
    pendingNonIdoneoReason,
    pendingStatusValue,
    retainSelectedWorkerAfterStatusChange,
    setValue,
    workerRow?.id,
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
          onSave={(next) =>
            patchSelectedWorkerField("feedback_recruiter", next.trim() || null)
          }
        />
      </div>

      <div className="max-w-xs space-y-3">
        <p className="text-sm font-medium">
          Aggiorna lo stato del lavoratore dopo il colloquio
        </p>
        <RadioGroup
          value={getLookupSelectValue(
            resolvedStatusValue,
            orderedStatusOptions,
            "",
          )}
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
              <strong>{resolvedStatusValue || "nessuno"}</strong> a{" "}
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
