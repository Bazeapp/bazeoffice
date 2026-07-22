import * as React from "react";
import {
  CircleSlashIcon,
  CircleUserRoundIcon,
  FileSearchIcon,
  LoaderCircleIcon,
  NotebookPenIcon,
} from "lucide-react";
import { useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/forms/field-components";
import { GateInfoCard } from "./gate-info-card";
import { FieldLookupSelect } from "./gate-form-fields";

/**
 * D2 — card di verifica/autocertificazione di Gate 1, estratte da gate1-view.
 * Field roll-out: autosave via gateFieldsForm.
 */

export const GateSelfCertificationCard = React.memo(
  function GateSelfCertificationCard({
    documentiOptions,
    referenzeOptions,
  }: {
    documentiOptions: Array<{ label: string; value: string }>;
    referenzeOptions: Array<{ label: string; value: string }>;
  }) {
    return (
      <GateInfoCard
        title="Autocertificazioni chiave"
        icon={<FileSearchIcon className="text-muted-foreground size-4" />}
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <p className="text-sm">Documenti (Autocertificazione)</p>
            <FieldLookupSelect
              name="documenti_in_regola"
              options={documentiOptions}
              placeholder="Seleziona stato documenti"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm">
              Referenze verificabili (Autocertificazione)
            </p>
            <FieldLookupSelect
              name="hai_referenze"
              options={referenzeOptions}
              placeholder="Seleziona referenze"
            />
          </div>
        </div>
      </GateInfoCard>
    );
  },
);

export const GateAdministrativeFieldsCard = React.memo(
  function GateAdministrativeFieldsCard({
    stripeAccountValue,
    isEditing,
    isUpdating,
    missingStripeRequirements = [],
    onGenerateStripeAccount,
  }: {
    stripeAccountValue: string;
    isEditing: boolean;
    isUpdating: boolean;
    missingStripeRequirements?: string[];
    onGenerateStripeAccount?: () => void | Promise<unknown>;
  }) {
    const ibanValue = useWatch({ name: "iban" }) as string | undefined;
    const resolvedIban = typeof ibanValue === "string" ? ibanValue : "";
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
                <FieldInput name="iban" placeholder="Inserisci IBAN" />
              ) : (
                <div className="rounded-lg border bg-surface px-3 py-2 text-sm">
                  {resolvedIban || "-"}
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
  },
);

export const GateDocumentIdentityCard = React.memo(
  function GateDocumentIdentityCard({
    nazionalitaOptions,
    isEditing,
  }: {
    nazionalitaOptions: Array<{ label: string; value: string }>;
    isEditing: boolean;
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
            <FieldInput name="nome" disabled={!isEditing} />
          </div>
          <div className="space-y-2">
            <p className="text-sm">Verifica che il cognome sia corretto</p>
            <FieldInput name="cognome" disabled={!isEditing} />
          </div>
          <div className="space-y-2">
            <p className="text-sm">Verifica la data di nascita</p>
            <FieldInput
              name="data_di_nascita"
              type="date"
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm">Verifica la nazionalita</p>
            {canUseNazionalitaSelect ? (
              <FieldLookupSelect
                name="nazionalita"
                options={nazionalitaOptions}
                placeholder="Seleziona nazionalita"
                emptyLabel="Non indicata"
                disabled={!isEditing}
              />
            ) : (
              <FieldInput name="nazionalita" disabled={!isEditing} />
            )}
          </div>
        </div>
      </GateInfoCard>
    );
  },
);
