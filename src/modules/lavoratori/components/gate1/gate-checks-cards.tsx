import * as React from "react";
import { CalendarDaysIcon, PencilIcon, ShieldCheckIcon } from "lucide-react";
import { useWatch } from "react-hook-form";

import {
  FieldAcceptChoice,
  FieldInput,
  FieldMultiSelect,
  type FieldChoiceOption,
} from "@/components/forms/field-components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import {
  getLookupOptionLabel,
  getTagClassName,
  resolveLookupColor,
} from "../../lib/lookup-utils";
import { GateInfoCard } from "./gate-info-card";
import { GateLookupBadge } from "./gate-field-primitives";

/**
 * D2 — card "Check disponibilità" + "Tipologia turni" di Gate 1, estratte da
 * gate1-view. Prop-driven pure (value/options/handler via prop), React.memo.
 */

export const GateBazeChecksCard = React.memo(function GateBazeChecksCard({
  isEditing,
  showEditAction = false,
  onToggleEdit,
  funzionamentoBazeOptions,
  paga9Options,
  multipliContrattiOptions,
  lookupColorsByDomain,
}: {
  isEditing: boolean;
  showEditAction?: boolean;
  onToggleEdit?: () => void;
  funzionamentoBazeOptions: Array<{ label: string; value: string }>;
  paga9Options: Array<{ label: string; value: string }>;
  multipliContrattiOptions: Array<{ label: string; value: string }>;
  lookupColorsByDomain: Map<string, string>;
}) {
  const paga9 = useWatch({ name: "check_accetta_paga_9_euro_netti" }) as
    | string
    | undefined;
  const pagaOrariaRichiesta = useWatch({ name: "paga_oraria_richiesta" }) as
    | string
    | undefined;
  const dataScadenzaNaspi = useWatch({ name: "data_scadenza_naspi_worker" }) as
    | string
    | undefined;
  const isPagaMinimaDisabled = paga9 === "Accetta";

  return (
    <GateInfoCard
      title="Check disponibilita lavori con Baze"
      icon={<CalendarDaysIcon className="text-muted-foreground size-4" />}
      titleAction={
        showEditAction ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={
              isEditing
                ? "Termina modifica check disponibilita Baze"
                : "Modifica check disponibilita Baze"
            }
            title={
              isEditing
                ? "Termina modifica check disponibilita Baze"
                : "Modifica check disponibilita Baze"
            }
            onClick={onToggleEdit}
          >
            <PencilIcon />
          </Button>
        ) : undefined
      }
    >
      <GateBazeCheckField
        label="Accetta funzionamento Baze?"
        name="check_accetta_funzionamento_baze"
        domain="lavoratori.check_accetta_funzionamento_baze"
        options={funzionamentoBazeOptions}
        isEditing={isEditing}
        lookupColorsByDomain={lookupColorsByDomain}
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,34rem)_minmax(0,22rem)] lg:items-start">
        <GateBazeCheckField
          label="Accetta di guadagnare 9€ netti (13,30€ lordi) con i lavori di Baze?"
          name="check_accetta_paga_9_euro_netti"
          domain="lavoratori.check_accetta_paga_9_euro_netti"
          options={paga9Options}
          isEditing={isEditing}
          lookupColorsByDomain={lookupColorsByDomain}
        />
        <div
          className={
            isPagaMinimaDisabled ? "space-y-2 opacity-50" : "space-y-2"
          }
        >
          <p className="text-sm">
            Non accetta 9€ netti? Indica qui la paga oraria netta minima che
            richiede
          </p>
          {isEditing ? (
            <FieldInput
              name="paga_oraria_richiesta"
              type="number"
              min="0"
              step="0.5"
              disabled={isPagaMinimaDisabled}
              placeholder="Inserisci paga oraria"
            />
          ) : (
            <div className="rounded-lg border bg-surface px-3 py-2 text-sm">
              {pagaOrariaRichiesta || "-"}
            </div>
          )}
        </div>
      </div>

      <GateBazeCheckField
        label="Accetta di avere piu contratti?"
        name="check_accetta_multipli_contratti"
        domain="lavoratori.check_accetta_multipli_contratti"
        options={multipliContrattiOptions}
        isEditing={isEditing}
        lookupColorsByDomain={lookupColorsByDomain}
      />

      <div className="space-y-2 max-w-xs">
        <p className="text-sm">Ha la Naspi? Indica la data in cui le scade</p>
        {isEditing ? (
          <FieldInput name="data_scadenza_naspi_worker" type="date" />
        ) : (
          <div className="rounded-lg border bg-surface px-3 py-2 text-sm">
            {dataScadenzaNaspi || "-"}
          </div>
        )}
      </div>
    </GateInfoCard>
  );
});

function toAcceptFieldOptions(
  domain: string,
  options: Array<{ label: string; value: string }>,
  lookupColorsByDomain: Map<string, string>,
): FieldChoiceOption[] {
  return options.map((option) => ({
    value: option.value,
    label: option.label,
    className: getTagClassName(
      resolveLookupColor(lookupColorsByDomain, domain, option.label) ??
        (option.label === "Accetta"
          ? "green"
          : option.label === "Non accetta"
            ? "orange"
            : null),
    ),
  }));
}

function GateBazeCheckField({
  label,
  name,
  domain,
  options,
  isEditing,
  lookupColorsByDomain,
}: {
  label: string;
  name: string;
  domain: string;
  options: Array<{ label: string; value: string }>;
  isEditing: boolean;
  lookupColorsByDomain: Map<string, string>;
}) {
  const value = useWatch({ name }) as string | undefined;
  const fieldOptions = toAcceptFieldOptions(
    domain,
    options,
    lookupColorsByDomain,
  );

  return (
    <div className="space-y-2">
      <p className="text-sm">{label}</p>
      {isEditing ? (
        <FieldAcceptChoice name={name} options={fieldOptions} />
      ) : (
        <GateLookupBadge
          domain={domain}
          value={value ?? ""}
          options={options}
          lookupColorsByDomain={lookupColorsByDomain}
        />
      )}
    </div>
  );
}

export const GateSpecificChecksCard = React.memo(
  function GateSpecificChecksCard({
    showMobility = false,
    mobilityOptions = [],
    isUpdatingMobility = false,
    isBabysitterEnabled,
    babysittingNeonatiOptions,
    babysittingMultipliBambiniOptions,
    caseConCaniOptions,
    caseConCaniGrandiOptions,
    caseConGattiOptions,
    scaleSoffittiOptions,
    trasfertaOptions,
    lookupColorsByDomain,
  }: {
    showMobility?: boolean;
    mobilityOptions?: Array<{ label: string; value: string }>;
    isUpdatingMobility?: boolean;
    isBabysitterEnabled: boolean;
    babysittingNeonatiOptions: Array<{ label: string; value: string }>;
    babysittingMultipliBambiniOptions: Array<{ label: string; value: string }>;
    caseConCaniOptions: Array<{ label: string; value: string }>;
    caseConCaniGrandiOptions: Array<{ label: string; value: string }>;
    caseConGattiOptions: Array<{ label: string; value: string }>;
    scaleSoffittiOptions: Array<{ label: string; value: string }>;
    trasfertaOptions: Array<{ label: string; value: string }>;
    lookupColorsByDomain: Map<string, string>;
  }) {
    return (
      <GateInfoCard
        title="Check disponibilita aspetti specifici"
        icon={<ShieldCheckIcon className="text-muted-foreground size-4" />}
      >
        {showMobility ? (
          <div className="space-y-2">
            <FieldLabel>Mobilita</FieldLabel>
            <FieldMultiSelect
              name="come_ti_sposti"
              options={mobilityOptions}
              placeholder="Seleziona opzioni"
              disabled={isUpdatingMobility}
            />
          </div>
        ) : null}

        <GateSpecificCheckField
          label="Accetta lavori di babysitting con neonati?"
          name="check_accetta_babysitting_neonati"
          domain="lavoratori.check_accetta_babysitting_neonati"
          options={babysittingNeonatiOptions}
          lookupColorsByDomain={lookupColorsByDomain}
          disabled={!isBabysitterEnabled}
          dimLabelWhenDisabled
        />
        <GateSpecificCheckField
          label="Accetta lavori di babysitting con piu di un bambino?"
          name="check_accetta_babysitting_multipli_bambini"
          domain="lavoratori.check_accetta_babysitting_multipli_bambini"
          options={babysittingMultipliBambiniOptions}
          lookupColorsByDomain={lookupColorsByDomain}
          disabled={!isBabysitterEnabled}
          dimLabelWhenDisabled
        />
        <GateSpecificCheckField
          label="Accetta lavori in cui sono presenti cani in casa?"
          name="check_accetta_case_con_cani"
          domain="lavoratori.check_accetta_case_con_cani"
          options={caseConCaniOptions}
          lookupColorsByDomain={lookupColorsByDomain}
        />
        <GateSpecificCheckField
          label="Accetta anche se i cani sono grandi? (Pastori tedeschi, Rottweiler, Pitbul ...)"
          name="check_accetta_case_con_cani_grandi"
          domain="lavoratori.check_accetta_case_con_cani_grandi"
          options={caseConCaniGrandiOptions}
          lookupColorsByDomain={lookupColorsByDomain}
        />
        <GateSpecificCheckField
          label="Accetta lavori in cui sono presenti gatti in casa?"
          name="check_accetta_case_con_gatti"
          domain="lavoratori.check_accetta_case_con_gatti"
          options={caseConGattiOptions}
          lookupColorsByDomain={lookupColorsByDomain}
        />
        <GateSpecificCheckField
          label="Accetta lavori in cui deve salire sulle scale o pulire soffitti alti?"
          name="check_accetta_salire_scale_o_soffitti_alti"
          domain="lavoratori.check_accetta_salire_scale_o_soffitti_alti"
          options={scaleSoffittiOptions}
          lookupColorsByDomain={lookupColorsByDomain}
        />
        <GateSpecificCheckField
          label="Accetta lavori in cui sono richieste delle trasferte?"
          name="check_accetta_lavori_con_trasferta"
          domain="lavoratori.check_accetta_lavori_con_trasferta"
          options={trasfertaOptions}
          lookupColorsByDomain={lookupColorsByDomain}
        />
      </GateInfoCard>
    );
  },
);

function GateSpecificCheckField({
  label,
  name,
  domain,
  options,
  lookupColorsByDomain,
  disabled = false,
  dimLabelWhenDisabled = false,
}: {
  label: string;
  name: string;
  domain: string;
  options: Array<{ label: string; value: string }>;
  lookupColorsByDomain: Map<string, string>;
  disabled?: boolean;
  dimLabelWhenDisabled?: boolean;
}) {
  const fieldOptions = toAcceptFieldOptions(
    domain,
    options,
    lookupColorsByDomain,
  );

  return (
    <div className="space-y-2">
      <p
        className={
          dimLabelWhenDisabled && disabled ? "text-sm opacity-50" : "text-sm"
        }
      >
        {label}
      </p>
      <FieldAcceptChoice
        name={name}
        options={fieldOptions}
        disabled={disabled}
      />
    </div>
  );
}

function GateShiftPreferenceField({
  label,
  name,
  domain,
  options,
  placeholder,
  isEditing,
  lookupColorsByDomain,
}: {
  label: string;
  name: string;
  domain: string;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
  isEditing: boolean;
  lookupColorsByDomain: Map<string, string>;
}) {
  const values = useWatch({ name }) as string[] | undefined;
  const resolvedValues = Array.isArray(values) ? values : [];

  return (
    <div className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      {isEditing ? (
        <FieldMultiSelect
          name={name}
          options={options}
          placeholder={placeholder}
        />
      ) : resolvedValues.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {resolvedValues.map((value) => (
            <Badge
              key={`${name}-${value}`}
              variant="outline"
              className={getTagClassName(
                resolveLookupColor(lookupColorsByDomain, domain, value),
              )}
            >
              {getLookupOptionLabel(options, value)}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      )}
    </div>
  );
}

export const GateShiftPreferencesCard = React.memo(
  function GateShiftPreferencesCard({
    isEditing,
    showEditAction = false,
    onToggleEdit,
    lookupColorsByDomain,
    tipoRapportoOptions,
    lavoriAccettabiliOptions,
    disponibilitaNelGiornoOptions,
  }: {
    isEditing: boolean;
    showEditAction?: boolean;
    onToggleEdit?: () => void;
    lookupColorsByDomain: Map<string, string>;
    tipoRapportoOptions: Array<{ label: string; value: string }>;
    lavoriAccettabiliOptions: Array<{ label: string; value: string }>;
    disponibilitaNelGiornoOptions: Array<{ label: string; value: string }>;
  }) {
    return (
      <GateInfoCard
        title="Tipologia turni"
        icon={<CalendarDaysIcon className="text-muted-foreground size-4" />}
        titleAction={
          showEditAction ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={
                isEditing
                  ? "Termina modifica tipologia turni"
                  : "Modifica tipologia turni"
              }
              title={
                isEditing
                  ? "Termina modifica tipologia turni"
                  : "Modifica tipologia turni"
              }
              onClick={onToggleEdit}
            >
              <PencilIcon />
            </Button>
          ) : undefined
        }
      >
        <div className="max-w-3xl space-y-4">
          <GateShiftPreferenceField
            label="Verifica sulle tipologia turni"
            name="tipo_rapporto_lavorativo"
            domain="lavoratori.tipo_rapporto_lavorativo"
            options={tipoRapportoOptions}
            placeholder="Seleziona tipologie"
            isEditing={isEditing}
            lookupColorsByDomain={lookupColorsByDomain}
          />
          <GateShiftPreferenceField
            label="Quali tipi di lavori accetta?"
            name="check_lavori_accettabili"
            domain="lavoratori.check_lavori_accettabili"
            options={lavoriAccettabiliOptions}
            placeholder="Seleziona lavori"
            isEditing={isEditing}
            lookupColorsByDomain={lookupColorsByDomain}
          />
          <GateShiftPreferenceField
            label="In che momento e disponibile generalmente?"
            name="disponibilita_nel_giorno"
            domain="lavoratori.disponibilita_nel_giorno"
            options={disponibilitaNelGiornoOptions}
            placeholder="Seleziona momenti"
            isEditing={isEditing}
            lookupColorsByDomain={lookupColorsByDomain}
          />
        </div>
      </GateInfoCard>
    );
  },
);
