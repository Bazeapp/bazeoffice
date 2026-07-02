import * as React from "react";
import { PhoneIcon } from "lucide-react";

import { FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { asString } from "../../features/lavoratori/lib/base-utils";
import {
  getLookupLabelForSave,
  getLookupSelectValue,
  type LookupOption,
} from "../../features/lavoratori/lib/lookup-utils";
import { GateInfoCard } from "./gate-info-card";
import { useGate1WorkerEditor } from "./gate1-worker-context";

/**
 * D2 — card "Follow-up" estratta da gate1-view (pilot del pattern).
 *
 * Consuma il Context di dominio: legge il valore dalla riga server
 * (`workerRow.followup_chiamata_idoneita`, source of truth) e salva via
 * `patchSelectedWorkerField`. Niente più `gateDraft` né prop-drilling di
 * value/onChange. `React.memo` perché l'unico prop che cambia è `options`
 * (config lookup statica/memoizzata). Niente form: è un singolo RadioGroup
 * (scelta immediata), non un campo testo debounced.
 */
export const GateContactsCard = React.memo(function GateContactsCard({
  options,
}: {
  options: LookupOption[];
}) {
  const {
    editor: { patchSelectedWorkerField },
    workerRow,
  } = useGate1WorkerEditor();
  const followupStatus = asString(workerRow?.followup_chiamata_idoneita);

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
              void patchSelectedWorkerField(
                "followup_chiamata_idoneita",
                getLookupLabelForSave(value, options) || null,
              )
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
});
