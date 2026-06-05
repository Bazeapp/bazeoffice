import * as React from "react";
import { CalendarDaysIcon, PencilIcon, ShieldCheckIcon } from "lucide-react";

import { WorkerShiftPreferencesFields } from "@/components/lavoratori/worker-shift-preferences-fields";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  getLookupOptionLabel,
  normalizeLookupDbLabels,
  normalizeLookupOptionValues,
} from "@/features/lavoratori/lib/lookup-utils";
import { GateInfoCard } from "@/components/lavoratori/gate1/gate-info-card";
import {
  GateAcceptField,
  GateLookupBadge,
} from "@/components/lavoratori/gate1/gate-field-primitives";

/**
 * D2 — card "Check disponibilità" + "Tipologia turni" di Gate 1, estratte da
 * gate1-view. Prop-driven pure (value/options/handler via prop), React.memo.
 */

export const GateBazeChecksCard = React.memo(function GateBazeChecksCard({
  isEditing,
  showEditAction = false,
  onToggleEdit,
  funzionamentoBaze,
  funzionamentoBazeOptions,
  paga9,
  paga9Options,
  pagaOrariaRichiesta,
  multipliContratti,
  multipliContrattiOptions,
  dataScadenzaNaspi,
  lookupColorsByDomain,
  onFunzionamentoBazeChange,
  onPaga9Change,
  onPagaOrariaRichiestaChange,
  onMultipliContrattiChange,
  onDataScadenzaNaspiChange,
}: {
  isEditing: boolean;
  showEditAction?: boolean;
  onToggleEdit?: () => void;
  funzionamentoBaze: string;
  funzionamentoBazeOptions: Array<{ label: string; value: string }>;
  paga9: string;
  paga9Options: Array<{ label: string; value: string }>;
  pagaOrariaRichiesta: string;
  multipliContratti: string;
  multipliContrattiOptions: Array<{ label: string; value: string }>;
  dataScadenzaNaspi: string;
  lookupColorsByDomain: Map<string, string>;
  onFunzionamentoBazeChange: (value: string) => void;
  onPaga9Change: (value: string) => void;
  onPagaOrariaRichiestaChange: (value: string) => void;
  onMultipliContrattiChange: (value: string) => void;
  onDataScadenzaNaspiChange: (value: string) => void;
}) {
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
      <div className="space-y-2">
        <p className="text-sm">Accetta funzionamento Baze?</p>
        {isEditing ? (
          <GateAcceptField
            value={funzionamentoBaze}
            options={funzionamentoBazeOptions}
            onChange={onFunzionamentoBazeChange}
            domain="lavoratori.check_accetta_funzionamento_baze"
            lookupColorsByDomain={lookupColorsByDomain}
          />
        ) : (
          <GateLookupBadge
            domain="lavoratori.check_accetta_funzionamento_baze"
            value={funzionamentoBaze}
            options={funzionamentoBazeOptions}
            lookupColorsByDomain={lookupColorsByDomain}
          />
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,34rem)_minmax(0,22rem)] lg:items-start">
        <div className="space-y-2">
          <p className="text-sm">
            Accetta di guadagnare 9€ netti (13,30€ lordi) con i lavori di Baze?
          </p>
          {isEditing ? (
            <GateAcceptField
              value={paga9}
              options={paga9Options}
              onChange={onPaga9Change}
              domain="lavoratori.check_accetta_paga_9_euro_netti"
              lookupColorsByDomain={lookupColorsByDomain}
            />
          ) : (
            <GateLookupBadge
              domain="lavoratori.check_accetta_paga_9_euro_netti"
              value={paga9}
              options={paga9Options}
              lookupColorsByDomain={lookupColorsByDomain}
            />
          )}
        </div>
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
            <Input
              type="number"
              min="0"
              step="0.5"
              value={pagaOrariaRichiesta}
              onChange={(event) =>
                onPagaOrariaRichiestaChange(event.target.value)
              }
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

      <div className="space-y-2">
        <p className="text-sm">Accetta di avere piu contratti?</p>
        {isEditing ? (
          <GateAcceptField
            value={multipliContratti}
            options={multipliContrattiOptions}
            onChange={onMultipliContrattiChange}
            domain="lavoratori.check_accetta_multipli_contratti"
            lookupColorsByDomain={lookupColorsByDomain}
          />
        ) : (
          <GateLookupBadge
            domain="lavoratori.check_accetta_multipli_contratti"
            value={multipliContratti}
            options={multipliContrattiOptions}
            lookupColorsByDomain={lookupColorsByDomain}
          />
        )}
      </div>

      <div className="space-y-2 max-w-xs">
        <p className="text-sm">Ha la Naspi? Indica la data in cui le scade</p>
        {isEditing ? (
          <Input
            type="date"
            value={dataScadenzaNaspi}
            onChange={(event) => onDataScadenzaNaspiChange(event.target.value)}
          />
        ) : (
          <div className="rounded-lg border bg-surface px-3 py-2 text-sm">
            {dataScadenzaNaspi || "-"}
          </div>
        )}
      </div>
    </GateInfoCard>
  );
});

export const GateSpecificChecksCard = React.memo(
  function GateSpecificChecksCard({
    mobilityValue,
    mobilityOptions,
    mobilityAnchor,
    isUpdatingMobility = false,
    isBabysitterEnabled,
    neonatiValue,
    neonatiOptions,
    multipliBambiniValue,
    multipliBambiniOptions,
    caniValue,
    caniOptions,
    caniGrandiValue,
    caniGrandiOptions,
    gattiValue,
    gattiOptions,
    scaleValue,
    scaleOptions,
    trasfertaValue,
    trasfertaOptions,
    lookupColorsByDomain,
    onMobilityChange,
    onNeonatiChange,
    onMultipliBambiniChange,
    onCaniChange,
    onCaniGrandiChange,
    onGattiChange,
    onScaleChange,
    onTrasfertaChange,
  }: {
    mobilityValue?: string[];
    mobilityOptions?: Array<{ label: string; value: string }>;
    mobilityAnchor?: React.RefObject<HTMLDivElement | null>;
    isUpdatingMobility?: boolean;
    isBabysitterEnabled: boolean;
    neonatiValue: string;
    neonatiOptions: Array<{ label: string; value: string }>;
    multipliBambiniValue: string;
    multipliBambiniOptions: Array<{ label: string; value: string }>;
    caniValue: string;
    caniOptions: Array<{ label: string; value: string }>;
    caniGrandiValue: string;
    caniGrandiOptions: Array<{ label: string; value: string }>;
    gattiValue: string;
    gattiOptions: Array<{ label: string; value: string }>;
    scaleValue: string;
    scaleOptions: Array<{ label: string; value: string }>;
    trasfertaValue: string;
    trasfertaOptions: Array<{ label: string; value: string }>;
    lookupColorsByDomain: Map<string, string>;
    onMobilityChange?: (values: string[]) => void;
    onNeonatiChange: (value: string) => void;
    onMultipliBambiniChange: (value: string) => void;
    onCaniChange: (value: string) => void;
    onCaniGrandiChange: (value: string) => void;
    onGattiChange: (value: string) => void;
    onScaleChange: (value: string) => void;
    onTrasfertaChange: (value: string) => void;
  }) {
    const showMobility =
      mobilityValue && mobilityOptions && mobilityAnchor && onMobilityChange;

    return (
      <GateInfoCard
        title="Check disponibilita aspetti specifici"
        icon={<ShieldCheckIcon className="text-muted-foreground size-4" />}
      >
        {showMobility ? (
          <div className="space-y-2">
            <p className="text-sm">Mobilita</p>
            <Combobox
              multiple
              autoHighlight
              items={mobilityOptions.map((option) => option.value)}
              value={normalizeLookupOptionValues(mobilityValue, mobilityOptions)}
              onValueChange={(nextValues) =>
                onMobilityChange(
                  normalizeLookupDbLabels(
                    nextValues as string[],
                    mobilityOptions,
                  ),
                )
              }
              disabled={isUpdatingMobility}
            >
              <ComboboxChips ref={mobilityAnchor} className="w-full">
                <ComboboxValue>
                  {(values) => (
                    <React.Fragment>
                      {values.map((value: string) => (
                        <ComboboxChip key={value}>
                          {getLookupOptionLabel(mobilityOptions, value)}
                        </ComboboxChip>
                      ))}
                      <ComboboxChipsInput placeholder="Seleziona opzioni" />
                    </React.Fragment>
                  )}
                </ComboboxValue>
              </ComboboxChips>
              <ComboboxContent anchor={mobilityAnchor} className="max-h-80">
                <ComboboxEmpty>Nessuna opzione trovata.</ComboboxEmpty>
                <ComboboxList className="max-h-72 overflow-y-auto">
                  {(item) => (
                    <ComboboxItem key={item} value={item}>
                      {getLookupOptionLabel(mobilityOptions, item)}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
        ) : null}

        <div className="space-y-2">
          <p className={isBabysitterEnabled ? "text-sm" : "text-sm opacity-50"}>
            Accetta lavori di babysitting con neonati?
          </p>
          <GateAcceptField
            value={neonatiValue}
            options={neonatiOptions}
            onChange={onNeonatiChange}
            domain="lavoratori.check_accetta_babysitting_neonati"
            lookupColorsByDomain={lookupColorsByDomain}
            disabled={!isBabysitterEnabled}
          />
        </div>

        <div className="space-y-2">
          <p className={isBabysitterEnabled ? "text-sm" : "text-sm opacity-50"}>
            Accetta lavori di babysitting con piu di un bambino?
          </p>
          <GateAcceptField
            value={multipliBambiniValue}
            options={multipliBambiniOptions}
            onChange={onMultipliBambiniChange}
            domain="lavoratori.check_accetta_babysitting_multipli_bambini"
            lookupColorsByDomain={lookupColorsByDomain}
            disabled={!isBabysitterEnabled}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm">
            Accetta lavori in cui sono presenti cani in casa?
          </p>
          <GateAcceptField
            value={caniValue}
            options={caniOptions}
            onChange={onCaniChange}
            domain="lavoratori.check_accetta_case_con_cani"
            lookupColorsByDomain={lookupColorsByDomain}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm">
            Accetta anche se i cani sono grandi? (Pastori tedeschi, Rottweiler,
            Pitbul ...)
          </p>
          <GateAcceptField
            value={caniGrandiValue}
            options={caniGrandiOptions}
            onChange={onCaniGrandiChange}
            domain="lavoratori.check_accetta_case_con_cani_grandi"
            lookupColorsByDomain={lookupColorsByDomain}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm">
            Accetta lavori in cui sono presenti gatti in casa?
          </p>
          <GateAcceptField
            value={gattiValue}
            options={gattiOptions}
            onChange={onGattiChange}
            domain="lavoratori.check_accetta_case_con_gatti"
            lookupColorsByDomain={lookupColorsByDomain}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm">
            Accetta lavori in cui deve salire sulle scale o pulire soffitti
            alti?
          </p>
          <GateAcceptField
            value={scaleValue}
            options={scaleOptions}
            onChange={onScaleChange}
            domain="lavoratori.check_accetta_salire_scale_o_soffitti_alti"
            lookupColorsByDomain={lookupColorsByDomain}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm">
            Accetta lavori in cui sono richieste delle trasferte?
          </p>
          <GateAcceptField
            value={trasfertaValue}
            options={trasfertaOptions}
            onChange={onTrasfertaChange}
            domain="lavoratori.check_accetta_lavori_con_trasferta"
            lookupColorsByDomain={lookupColorsByDomain}
          />
        </div>
      </GateInfoCard>
    );
  },
);

export const GateShiftPreferencesCard = React.memo(
  function GateShiftPreferencesCard({
    isEditing,
    showEditAction = false,
    onToggleEdit,
    lookupColorsByDomain,
    tipoRapportoLavorativo,
    tipoRapportoOptions,
    lavoriAccettabili,
    lavoriAccettabiliOptions,
    disponibilitaNelGiorno,
    disponibilitaNelGiornoOptions,
    onTipoRapportoChange,
    onLavoriAccettabiliChange,
    onDisponibilitaNelGiornoChange,
  }: {
    isEditing: boolean;
    showEditAction?: boolean;
    onToggleEdit?: () => void;
    lookupColorsByDomain: Map<string, string>;
    tipoRapportoLavorativo: string[];
    tipoRapportoOptions: Array<{ label: string; value: string }>;
    lavoriAccettabili: string[];
    lavoriAccettabiliOptions: Array<{ label: string; value: string }>;
    disponibilitaNelGiorno: string[];
    disponibilitaNelGiornoOptions: Array<{ label: string; value: string }>;
    onTipoRapportoChange: (values: string[]) => void;
    onLavoriAccettabiliChange: (values: string[]) => void;
    onDisponibilitaNelGiornoChange: (values: string[]) => void;
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
        <div className="max-w-3xl">
          <WorkerShiftPreferencesFields
            fields={[
              {
                id: "gate-tipo-rapporto-lavorativo",
                label: "Verifica sulle tipologia turni",
                domain: "lavoratori.tipo_rapporto_lavorativo",
                value: tipoRapportoLavorativo,
                options: tipoRapportoOptions,
                placeholder: "Seleziona tipologie",
                onChange: onTipoRapportoChange,
              },
              {
                id: "gate-lavori-accettabili",
                label: "Quali tipi di lavori accetta?",
                domain: "lavoratori.check_lavori_accettabili",
                value: lavoriAccettabili,
                options: lavoriAccettabiliOptions,
                placeholder: "Seleziona lavori",
                onChange: onLavoriAccettabiliChange,
                sortByOptionOrder: true,
              },
              {
                id: "gate-disponibilita-nel-giorno",
                label: "In che momento e disponibile generalmente?",
                domain: "lavoratori.disponibilita_nel_giorno",
                value: disponibilitaNelGiorno,
                options: disponibilitaNelGiornoOptions,
                placeholder: "Seleziona momenti",
                onChange: onDisponibilitaNelGiornoChange,
              },
            ]}
            isEditing={isEditing}
            lookupColorsByDomain={lookupColorsByDomain}
          />
        </div>
      </GateInfoCard>
    );
  },
);
