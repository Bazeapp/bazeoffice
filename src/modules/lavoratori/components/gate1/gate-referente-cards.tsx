import * as React from "react";
import { UsersIcon } from "lucide-react";

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
 *
 * Componenti prop-driven puri (value + onChange via prop, niente gateDraft o
 * Context): l'orchestratore continua a fornire valore/handler. React.memo per
 * evitare re-render quando cambiano slice non correlate dell'orchestratore.
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

export const GateReferenteCard = React.memo(function GateReferenteCard({
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
    ? (options.find((option) => option.id === value) ?? null)
    : null;
  const selectedCertificationOperator = referenteCertificazioneValue
    ? (options.find(
        (option) => option.id === referenteCertificazioneValue,
      ) ?? null)
    : null;
  const showCertificationAssignment =
    referenteCertificazioneValue !== undefined;

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
                  <OperatorSelectOption
                    operator={selectedCertificationOperator}
                  />
                ) : (
                  resolveOperatorLabel(
                    referenteCertificazioneValue ?? "",
                    options,
                  )
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </GateInfoCard>
  );
});

export const GateCertificationReferenteCard = React.memo(
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
      ? (options.find(
          (option) => option.id === referenteCertificazioneValue,
        ) ?? null)
      : null;
    const selectedIdoneitaOperator = referenteIdoneitaValue
      ? (options.find((option) => option.id === referenteIdoneitaValue) ?? null)
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
                    <OperatorSelectOption
                      operator={selectedCertificationOperator}
                    />
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
  },
);
