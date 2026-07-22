import * as React from "react";
import { PhoneIcon } from "lucide-react";
import { useController } from "react-hook-form";

import { FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  getLookupLabelForSave,
  getLookupSelectValue,
  type LookupOption,
} from "../../lib/lookup-utils";
import { GateInfoCard } from "./gate-info-card";

function FieldFollowupRadio({
  name,
  options,
}: {
  name: string;
  options: LookupOption[];
}) {
  const { field } = useController({ name });
  const storedLabel = typeof field.value === "string" ? field.value : "";

  return (
    <RadioGroup
      value={getLookupSelectValue(storedLabel, options, "")}
      onValueChange={(value) =>
        field.onChange(getLookupLabelForSave(value, options) || "")
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
  );
}

/**
 * D2 — card "Follow-up" estratta da gate1-view.
 * Field roll-out: autosave via gateFieldsForm.
 */
export const GateContactsCard = React.memo(function GateContactsCard({
  options,
}: {
  options: LookupOption[];
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
          <FieldFollowupRadio
            name="followup_chiamata_idoneita"
            options={options}
          />
        </div>
      </div>
    </GateInfoCard>
  );
});
