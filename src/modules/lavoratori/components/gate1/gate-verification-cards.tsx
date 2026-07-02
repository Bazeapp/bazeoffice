import * as React from "react";
import {
  CircleSlashIcon,
  CircleUserRoundIcon,
  FileSearchIcon,
  LoaderCircleIcon,
  NotebookPenIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "../../features/lavoratori/lib/lookup-utils";
import { GateInfoCard } from "./gate-info-card";
import { EMPTY_SELECT_VALUE } from "./gate-field-primitives";

/**
 * D2 — card di verifica/autocertificazione di Gate 1, estratte da gate1-view.
 * Prop-driven pure (value/options/handler via prop), React.memo.
 */

export const GateSelfCertificationCard = React.memo(
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
              value={getLookupSelectValue(
                documentiInRegola,
                documentiOptions,
                EMPTY_SELECT_VALUE,
              )}
              onValueChange={(value) =>
                onDocumentiChange(value === EMPTY_SELECT_VALUE ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona stato documenti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT_VALUE}>Non indicato</SelectItem>
                {resolveLookupSingleValueOptions(
                  documentiInRegola,
                  documentiOptions,
                ).map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-sm">
              Referenze verificabili (Autocertificazione)
            </p>
            <Select
              value={getLookupSelectValue(
                haiReferenze,
                referenzeOptions,
                EMPTY_SELECT_VALUE,
              )}
              onValueChange={(value) =>
                onReferenzeChange(value === EMPTY_SELECT_VALUE ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleziona referenze" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT_VALUE}>Non indicato</SelectItem>
                {resolveLookupSingleValueOptions(
                  haiReferenze,
                  referenzeOptions,
                ).map((option) => (
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
  },
);

export const GateAdministrativeFieldsCard = React.memo(
  function GateAdministrativeFieldsCard({
    ibanValue,
    stripeAccountValue,
    isEditing,
    isUpdating,
    missingStripeRequirements = [],
    onIbanChange,
    onGenerateStripeAccount,
  }: {
    ibanValue: string;
    stripeAccountValue: string;
    isEditing: boolean;
    isUpdating: boolean;
    missingStripeRequirements?: string[];
    onIbanChange: (value: string) => void;
    onGenerateStripeAccount?: () => void | Promise<unknown>;
  }) {
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
                <Input
                  value={ibanValue}
                  onChange={(event) => onIbanChange(event.target.value)}
                  placeholder="Inserisci IBAN"
                />
              ) : (
                <div className="rounded-lg border bg-surface px-3 py-2 text-sm">
                  {ibanValue || "-"}
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
    headerDraft,
    nazionalitaOptions,
    isEditing,
    onHeaderChange,
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
  }) {
    const resolvedNazionalitaOptions = resolveLookupSingleValueOptions(
      headerDraft.nazionalita,
      nazionalitaOptions,
    );
    const canUseNazionalitaSelect = resolvedNazionalitaOptions.length > 0;

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
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm">Verifica che il cognome sia corretto</p>
            <Input
              value={headerDraft.cognome}
              onChange={(event) =>
                onHeaderChange("cognome", event.target.value)
              }
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
              disabled={!isEditing}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm">Verifica la nazionalita</p>
            {canUseNazionalitaSelect ? (
              <Select
                value={getLookupSelectValue(
                  headerDraft.nazionalita,
                  resolvedNazionalitaOptions,
                  EMPTY_SELECT_VALUE,
                )}
                onValueChange={(value) => {
                  onHeaderChange(
                    "nazionalita",
                    value === EMPTY_SELECT_VALUE ? "" : value,
                  );
                }}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona nazionalita" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_SELECT_VALUE}>
                    Non indicata
                  </SelectItem>
                  {resolvedNazionalitaOptions.map((option) => (
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
                disabled={!isEditing}
              />
            )}
          </div>
        </div>
      </GateInfoCard>
    );
  },
);
