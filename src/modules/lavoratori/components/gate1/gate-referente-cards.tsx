import * as React from "react";
import { UsersIcon } from "lucide-react";
import { useController, useWatch } from "react-hook-form";

import { Avatar } from "@/components/ui/avatar";
import { FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GateInfoCard } from "./gate-info-card";
import type { OperatoreOption } from "@/hooks/use-operatori-options";

/**
 * D2 — card "Referente" di Gate 1, estratte da gate1-view.
 * Field roll-out: autosave via gateFieldsForm.
 */

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

function resolveOperatorLabel(value: string, options: OperatoreOption[]) {
  if (!value) return "—";
  return options.find((option) => option.id === value)?.label ?? value;
}

function ReferenteOperatorSelect({
  name,
  options,
  disabled,
  placeholder,
}: {
  name: string;
  options: OperatoreOption[];
  disabled?: boolean;
  placeholder: string;
}) {
  const { field } = useController({ name });
  const value = typeof field.value === "string" ? field.value : "";
  const selectedOperator = value
    ? (options.find((option) => option.id === value) ?? null)
    : null;

  return (
    <Select
      value={value || "none"}
      onValueChange={(nextValue) =>
        field.onChange(nextValue === "none" ? "" : nextValue)
      }
      disabled={disabled}
    >
      <SelectTrigger>
        {selectedOperator ? (
          <OperatorSelectOption operator={selectedOperator} />
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Nessun referente</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            <OperatorSelectOption operator={option} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ReferenteOperatorReadOnly({
  name,
  options,
}: {
  name: string;
  options: OperatoreOption[];
}) {
  const value = useWatch({ name }) as string | undefined;
  const normalized = typeof value === "string" ? value : "";
  const selectedOperator = normalized
    ? (options.find((option) => option.id === normalized) ?? null)
    : null;

  return (
    <div className="text-foreground flex min-h-10 items-center rounded-md border bg-surface px-3 text-sm">
      {selectedOperator ? (
        <OperatorSelectOption operator={selectedOperator} />
      ) : (
        resolveOperatorLabel(normalized, options)
      )}
    </div>
  );
}

export const GateReferenteCard = React.memo(function GateReferenteCard({
  title = "Referente idoneità",
  label = "Referente Gate 1",
  showCertificationAssignment = true,
  options,
  disabled,
}: {
  title?: string;
  label?: string;
  showCertificationAssignment?: boolean;
  options: OperatoreOption[];
  disabled?: boolean;
}) {
  return (
    <GateInfoCard
      title={title}
      icon={<UsersIcon className="text-muted-foreground size-4" />}
    >
      <div
        className={
          showCertificationAssignment
            ? "grid gap-4 md:grid-cols-2"
            : "space-y-4"
        }
      >
        <div className="flex items-start gap-3 text-sm">
          <FieldLabel className="w-24 shrink-0">{label}</FieldLabel>
          <div className="min-w-0 flex-1 text-foreground">
            <ReferenteOperatorSelect
              name="referente_idoneita_id"
              options={options}
              disabled={disabled}
              placeholder="Seleziona referente Gate 1"
            />
          </div>
        </div>

        {showCertificationAssignment ? (
          <div className="flex items-start gap-3 text-sm">
            <FieldLabel className="w-24 shrink-0">Referente Gate 2</FieldLabel>
            <div className="min-w-0 flex-1 text-foreground">
              <ReferenteOperatorReadOnly
                name="referente_certificazione_id"
                options={options}
              />
            </div>
          </div>
        ) : null}
      </div>
    </GateInfoCard>
  );
});

export const GateCertificationReferenteCard = React.memo(
  function GateCertificationReferenteCard({
    options,
    disabled,
  }: {
    options: OperatoreOption[];
    disabled?: boolean;
  }) {
    return (
      <GateInfoCard
        title="Referente"
        icon={<UsersIcon className="text-muted-foreground size-4" />}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-start gap-3 text-sm">
            <FieldLabel className="w-24 shrink-0">Referente Gate 2</FieldLabel>
            <div className="min-w-0 flex-1 text-foreground">
              <ReferenteOperatorSelect
                name="referente_certificazione_id"
                options={options}
                disabled={disabled}
                placeholder="Seleziona referente Gate 2"
              />
            </div>
          </div>

          <div className="flex items-start gap-3 text-sm">
            <FieldLabel className="w-24 shrink-0">Referente Gate 1</FieldLabel>
            <div className="min-w-0 flex-1 text-foreground">
              <ReferenteOperatorReadOnly
                name="referente_idoneita_id"
                options={options}
              />
            </div>
          </div>
        </div>
      </GateInfoCard>
    );
  },
);
