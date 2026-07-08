import * as React from "react";
import { useController } from "react-hook-form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getLookupSelectValue,
  resolveLookupSingleValueOptions,
} from "../../lib/lookup-utils";
import {
  EMPTY_SELECT_VALUE,
  GateAllowedWorkField,
  GateLevelSegmentedField,
  GateLookupConfirmationField,
  GateStarRatingField,
} from "./gate-field-primitives";

type LookupOptionLite = { label: string; value: string };

export function GateFormLevelField({
  name,
  label,
  options,
  domain,
  isEditing,
  isUpdating,
  lookupColorsByDomain,
  persistMode = "label",
  helperLines,
}: {
  name: string;
  label: string;
  options: LookupOptionLite[];
  domain: string;
  isEditing: boolean;
  isUpdating: boolean;
  lookupColorsByDomain: Map<string, string>;
  persistMode?: "label" | "value";
  helperLines?: string[];
}) {
  const { field } = useController({ name });
  return (
    <GateLevelSegmentedField
      label={label}
      value={typeof field.value === "string" ? field.value : ""}
      options={options}
      domain={domain}
      isEditing={isEditing}
      isUpdating={isUpdating}
      lookupColorsByDomain={lookupColorsByDomain}
      onChange={field.onChange}
      persistMode={persistMode}
      helperLines={helperLines}
    />
  );
}

export function GateFormLookupConfirmationField({
  name,
  label,
  options,
  domain,
  isEditing,
  isUpdating,
  lookupColorsByDomain,
  persistMode = "label",
  placeholder,
  helperLines,
}: {
  name: string;
  label: string;
  options: LookupOptionLite[];
  domain: string;
  isEditing: boolean;
  isUpdating: boolean;
  lookupColorsByDomain: Map<string, string>;
  persistMode?: "label" | "value";
  placeholder?: string;
  helperLines?: string[];
}) {
  const { field } = useController({ name });
  return (
    <GateLookupConfirmationField
      label={label}
      value={typeof field.value === "string" ? field.value : ""}
      options={options}
      domain={domain}
      isEditing={isEditing}
      isUpdating={isUpdating}
      lookupColorsByDomain={lookupColorsByDomain}
      onChange={field.onChange}
      persistMode={persistMode}
      placeholder={placeholder}
      helperLines={helperLines}
    />
  );
}

export function GateFormStarRatingField({
  name,
  label,
  description,
  isEditing,
}: {
  name: string;
  label: string;
  description: string;
  isEditing: boolean;
}) {
  const { field } = useController({ name });
  return (
    <GateStarRatingField
      label={label}
      description={description}
      value={typeof field.value === "string" ? field.value : ""}
      isEditing={isEditing}
      onChange={field.onChange}
    />
  );
}

export function FieldLookupSelect({
  name,
  options,
  placeholder,
  disabled,
  emptyLabel = "Non indicato",
  triggerClassName,
}: {
  name: string;
  options: LookupOptionLite[];
  placeholder?: string;
  disabled?: boolean;
  emptyLabel?: string;
  triggerClassName?: string;
}) {
  const { field } = useController({ name });
  const value = typeof field.value === "string" ? field.value : "";
  const resolvedOptions = resolveLookupSingleValueOptions(value, options);

  return (
    <Select
      value={getLookupSelectValue(value, options, EMPTY_SELECT_VALUE)}
      onValueChange={(nextValue) =>
        field.onChange(nextValue === EMPTY_SELECT_VALUE ? "" : nextValue)
      }
      disabled={disabled}
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={EMPTY_SELECT_VALUE}>{emptyLabel}</SelectItem>
        {resolvedOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FieldAllowedWorkSelect({
  name,
  options,
}: {
  name: string;
  options: LookupOptionLite[];
}) {
  const { field } = useController({ name });
  const value = Array.isArray(field.value) ? (field.value as string[]) : [];

  return (
    <GateAllowedWorkField
      value={value}
      options={options}
      onChange={field.onChange}
    />
  );
}
