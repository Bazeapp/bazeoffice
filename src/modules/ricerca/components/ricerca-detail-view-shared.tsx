import { PencilIcon, XIcon } from "lucide-react"

import {
  FieldInput,
  FieldTextarea,
  FieldCheckbox,
} from "@/components/forms/field-components"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"

import { editableValue } from "../lib/ricerca-detail-view.utils"
import type { RicercaDetailSectionEdit } from "../lib/ricerca-detail-view.types"

export function RicercaDetailSectionEditBar({
  editing,
  onToggle,
  onSave,
  saving,
}: RicercaDetailSectionEdit) {
  return (
    <div className="flex items-center gap-1 justify-end">
      {editing && onSave ? (
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={saving}
          onClick={onSave}
        >
          {saving ? "Salvataggio..." : "Salva"}
        </Button>
      ) : null}
      <Button
        type="button"
        variant={editing ? "outline" : "ghost"}
        size="icon-sm"
        aria-label={editing ? "Annulla" : "Modifica sezione"}
        title={editing ? "Annulla" : "Modifica sezione"}
        onClick={onToggle}
      >
        {editing ? <XIcon /> : <PencilIcon />}
      </Button>
    </div>
  )
}

// FASE 5 BIS — form-aware: in editing rende i Field* del toolkit (agganciati al
// form via `name`, autosave gestito da useAutoSaveForm); in lettura mostra il
// valore. La trasformazione ""→null e il routing al target avvengono in onSave.
export function RicercaDetailEditableTextField({
  label,
  name,
  value,
  editing,
  multiline = false,
  labelClassName,
}: {
  label: string;
  name: string;
  value: unknown;
  editing: boolean;
  multiline?: boolean;
  labelClassName?: string;
}) {
  if (!editing) {
    return (
      <Field>
        <FieldLabel variant="eyebrow" className={labelClassName}>
          {label}
        </FieldLabel>
        <p className="text-sm text-foreground">{editableValue(value) || "—"}</p>
      </Field>
    );
  }

  return (
    <Field>
      <FieldLabel variant="eyebrow" className={labelClassName}>
        {label}
      </FieldLabel>
      {multiline ? (
        <FieldTextarea name={name} rows={4} />
      ) : (
        <FieldInput
          name={name}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      )}
    </Field>
  );
}

export function RicercaDetailEditableDateField({
  label,
  name,
  value,
  editing,
}: {
  label: string;
  name: string;
  value: string | null | undefined;
  editing: boolean;
}) {
  if (!editing) {
    return (
      <Field>
        <FieldLabel variant="eyebrow">{label}</FieldLabel>
        <p className="text-sm text-foreground">{editableValue(value) || "—"}</p>
      </Field>
    );
  }

  return (
    <Field>
      <FieldLabel variant="eyebrow">{label}</FieldLabel>
      <FieldInput name={name} type="date" />
    </Field>
  );
}

export function RicercaDetailEditableCheckboxField({
  label,
  name,
  value,
  editing,
}: {
  label: string;
  name: string;
  value: boolean;
  editing: boolean;
}) {
  if (!editing) {
    return (
      <Field>
        <FieldLabel variant="eyebrow">{label}</FieldLabel>
        <p className="text-sm text-foreground">{value ? "Sì" : "No"}</p>
      </Field>
    );
  }

  return (
    <label className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface-muted px-3 py-2 text-sm">
      <FieldCheckbox name={name} />
      <span>{label}</span>
    </label>
  );
}