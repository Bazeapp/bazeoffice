import * as React from "react";
import { PencilIcon, ShieldCheckIcon } from "lucide-react";

import { SkillsChoiceMatrix } from "../../components/skills-choice-matrix";
import { Button } from "@/components/ui/button";
import { DetailSectionCard } from "@/components/shared-next/detail-section-card";
import { GateInfoCard } from "./gate-info-card";
import {
  GateLevelSegmentedField,
  GateLookupConfirmationField,
  GateStarRatingField,
} from "./gate-field-primitives";

/**
 * D2 — card "Competenze" estratta da gate1-view (la più grande).
 * Prop-driven pure (livelli/compatibilità/rating via prop), React.memo.
 */
export const GateSkillConfirmationsCard = React.memo(
  function GateSkillConfirmationsCard({
    isEditing,
    showEditAction = false,
    onToggleEdit,
    isUpdating,
    lookupColorsByDomain,
    livelloItalianoValue,
    livelloItalianoOptions,
    onLivelloItalianoChange,
    livelloIngleseValue,
    livelloIngleseOptions,
    onLivelloIngleseChange,
    livelloCucinaValue,
    livelloCucinaOptions,
    onLivelloCucinaChange,
    livelloStiroValue,
    livelloStiroOptions,
    onLivelloStiroChange,
    livelloPulizieValue,
    livelloPulizieOptions,
    onLivelloPulizieChange,
    livelloBabysittingValue,
    livelloBabysittingOptions,
    onLivelloBabysittingChange,
    livelloDogsittingValue,
    livelloDogsittingOptions,
    onLivelloDogsittingChange,
    livelloGiardinaggioValue,
    livelloGiardinaggioOptions,
    onLivelloGiardinaggioChange,
    compatibilitaStiroValue,
    compatibilitaStiroOptions,
    onCompatibilitaStiroChange,
    compatibilitaCucinaValue,
    compatibilitaCucinaOptions,
    onCompatibilitaCucinaChange,
    compatibilitaNeonatiValue,
    compatibilitaNeonatiOptions,
    onCompatibilitaNeonatiChange,
    ratingAtteggiamentoValue,
    onRatingAtteggiamentoChange,
    ratingCuraPersonaleValue,
    onRatingCuraPersonaleChange,
    ratingPrecisionePuntualitaValue,
    onRatingPrecisionePuntualitaChange,
    ratingCapacitaComunicativeValue,
    onRatingCapacitaComunicativeChange,
    ratingCorporaturaValue,
    ratingCorporaturaOptions,
    onRatingCorporaturaChange,
    compatibilitaFamiglieNumeroseValue,
    compatibilitaFamiglieNumeroseOptions,
    onCompatibilitaFamiglieNumeroseChange,
    compatibilitaFamiglieMoltoEsigentiValue,
    compatibilitaFamiglieMoltoEsigentiOptions,
    onCompatibilitaFamiglieMoltoEsigentiChange,
    compatibilitaDatorePresenteValue,
    compatibilitaDatorePresenteOptions,
    onCompatibilitaDatorePresenteChange,
    compatibilitaCaseGrandiValue,
    compatibilitaCaseGrandiOptions,
    onCompatibilitaCaseGrandiChange,
    compatibilitaAnimaliValue,
    compatibilitaAnimaliOptions,
    onCompatibilitaAnimaliChange,
    compatibilitaAutonomiaValue,
    compatibilitaAutonomiaOptions,
    onCompatibilitaAutonomiaChange,
    compatibilitaContestiPacatiValue,
    compatibilitaContestiPacatiOptions,
    onCompatibilitaContestiPacatiChange,
  }: {
    isEditing: boolean;
    showEditAction?: boolean;
    onToggleEdit?: () => void;
    isUpdating: boolean;
    lookupColorsByDomain: Map<string, string>;
    livelloItalianoValue: string;
    livelloItalianoOptions: Array<{ label: string; value: string }>;
    onLivelloItalianoChange: (value: string) => void;
    livelloIngleseValue: string;
    livelloIngleseOptions: Array<{ label: string; value: string }>;
    onLivelloIngleseChange: (value: string) => void;
    livelloCucinaValue: string;
    livelloCucinaOptions: Array<{ label: string; value: string }>;
    onLivelloCucinaChange: (value: string) => void;
    livelloStiroValue: string;
    livelloStiroOptions: Array<{ label: string; value: string }>;
    onLivelloStiroChange: (value: string) => void;
    livelloPulizieValue: string;
    livelloPulizieOptions: Array<{ label: string; value: string }>;
    onLivelloPulizieChange: (value: string) => void;
    livelloBabysittingValue: string;
    livelloBabysittingOptions: Array<{ label: string; value: string }>;
    onLivelloBabysittingChange: (value: string) => void;
    livelloDogsittingValue: string;
    livelloDogsittingOptions: Array<{ label: string; value: string }>;
    onLivelloDogsittingChange: (value: string) => void;
    livelloGiardinaggioValue: string;
    livelloGiardinaggioOptions: Array<{ label: string; value: string }>;
    onLivelloGiardinaggioChange: (value: string) => void;
    compatibilitaStiroValue: string;
    compatibilitaStiroOptions: Array<{ label: string; value: string }>;
    onCompatibilitaStiroChange: (value: string) => void;
    compatibilitaCucinaValue: string;
    compatibilitaCucinaOptions: Array<{ label: string; value: string }>;
    onCompatibilitaCucinaChange: (value: string) => void;
    compatibilitaNeonatiValue: string;
    compatibilitaNeonatiOptions: Array<{ label: string; value: string }>;
    onCompatibilitaNeonatiChange: (value: string) => void;
    ratingAtteggiamentoValue: string;
    onRatingAtteggiamentoChange: (value: string) => void;
    ratingCuraPersonaleValue: string;
    onRatingCuraPersonaleChange: (value: string) => void;
    ratingPrecisionePuntualitaValue: string;
    onRatingPrecisionePuntualitaChange: (value: string) => void;
    ratingCapacitaComunicativeValue: string;
    onRatingCapacitaComunicativeChange: (value: string) => void;
    ratingCorporaturaValue: string;
    ratingCorporaturaOptions: Array<{ label: string; value: string }>;
    onRatingCorporaturaChange: (value: string) => void;
    compatibilitaFamiglieNumeroseValue: string;
    compatibilitaFamiglieNumeroseOptions: Array<{
      label: string;
      value: string;
    }>;
    onCompatibilitaFamiglieNumeroseChange: (value: string) => void;
    compatibilitaFamiglieMoltoEsigentiValue: string;
    compatibilitaFamiglieMoltoEsigentiOptions: Array<{
      label: string;
      value: string;
    }>;
    onCompatibilitaFamiglieMoltoEsigentiChange: (value: string) => void;
    compatibilitaDatorePresenteValue: string;
    compatibilitaDatorePresenteOptions: Array<{ label: string; value: string }>;
    onCompatibilitaDatorePresenteChange: (value: string) => void;
    compatibilitaCaseGrandiValue: string;
    compatibilitaCaseGrandiOptions: Array<{ label: string; value: string }>;
    onCompatibilitaCaseGrandiChange: (value: string) => void;
    compatibilitaAnimaliValue: string;
    compatibilitaAnimaliOptions: Array<{ label: string; value: string }>;
    onCompatibilitaAnimaliChange: (value: string) => void;
    compatibilitaAutonomiaValue: string;
    compatibilitaAutonomiaOptions: Array<{ label: string; value: string }>;
    onCompatibilitaAutonomiaChange: (value: string) => void;
    compatibilitaContestiPacatiValue: string;
    compatibilitaContestiPacatiOptions: Array<{ label: string; value: string }>;
    onCompatibilitaContestiPacatiChange: (value: string) => void;
  }) {
    return (
      <GateInfoCard
        title="Competenze"
        icon={<ShieldCheckIcon className="text-muted-foreground size-4" />}
        titleAction={
          showEditAction ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={
                isEditing
                  ? "Termina modifica competenze"
                  : "Modifica competenze"
              }
              title={
                isEditing
                  ? "Termina modifica competenze"
                  : "Modifica competenze"
              }
              onClick={onToggleEdit}
            >
              <PencilIcon />
            </Button>
          ) : undefined
        }
      >
        <DetailSectionCard
          title="Lingue"
          className="border-border/60"
          contentClassName="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <GateLevelSegmentedField
              label="Conferma livello italiano"
              value={livelloItalianoValue}
              options={livelloItalianoOptions}
              domain="lavoratori.livello_italiano"
              isEditing={isEditing}
              isUpdating={isUpdating}
              lookupColorsByDomain={lookupColorsByDomain}
              onChange={onLivelloItalianoChange}
              persistMode="value"
            />
            <GateLevelSegmentedField
              label="Conferma livello inglese"
              value={livelloIngleseValue}
              options={livelloIngleseOptions}
              domain="lavoratori.livello_inglese"
              isEditing={isEditing}
              isUpdating={isUpdating}
              lookupColorsByDomain={lookupColorsByDomain}
              onChange={onLivelloIngleseChange}
            />
          </div>
        </DetailSectionCard>

        <DetailSectionCard
          title="Casa"
          className="border-border/60"
          contentClassName="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <GateLevelSegmentedField
              label="Conferma livello cucina"
              value={livelloCucinaValue}
              options={livelloCucinaOptions}
              domain="lavoratori.livello_cucina"
              isEditing={isEditing}
              isUpdating={isUpdating}
              lookupColorsByDomain={lookupColorsByDomain}
              onChange={onLivelloCucinaChange}
              helperLines={[
                "Basso = Non cucina",
                "Medio = Cucina solo base",
                "Alto = Sa cucinare molto bene",
              ]}
            />
            <GateLevelSegmentedField
              label="Conferma livello stiro"
              value={livelloStiroValue}
              options={livelloStiroOptions}
              domain="lavoratori.livello_stiro"
              isEditing={isEditing}
              isUpdating={isUpdating}
              lookupColorsByDomain={lookupColorsByDomain}
              onChange={onLivelloStiroChange}
              helperLines={[
                "Basso = Non stira",
                "Medio = Stiro solo semplice",
                "Alto = Stira bene camicie",
              ]}
            />
            <GateLevelSegmentedField
              label="Conferma livello pulizie"
              value={livelloPulizieValue}
              options={livelloPulizieOptions}
              domain="lavoratori.livello_pulizie"
              isEditing={isEditing}
              isUpdating={isUpdating}
              lookupColorsByDomain={lookupColorsByDomain}
              onChange={onLivelloPulizieChange}
            />
          </div>
        </DetailSectionCard>

        <DetailSectionCard
          title="Servizi"
          className="border-border/60"
          contentClassName="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <GateLevelSegmentedField
              label="Conferma livello babysitting"
              value={livelloBabysittingValue}
              options={livelloBabysittingOptions}
              domain="lavoratori.livello_babysitting"
              isEditing={isEditing}
              isUpdating={isUpdating}
              lookupColorsByDomain={lookupColorsByDomain}
              onChange={onLivelloBabysittingChange}
            />
            <GateLevelSegmentedField
              label="Conferma livello dogsitting"
              value={livelloDogsittingValue}
              options={livelloDogsittingOptions}
              domain="lavoratori.livello_dogsitting"
              isEditing={isEditing}
              isUpdating={isUpdating}
              lookupColorsByDomain={lookupColorsByDomain}
              onChange={onLivelloDogsittingChange}
            />
            <GateLevelSegmentedField
              label="Conferma livello giardinaggio"
              value={livelloGiardinaggioValue}
              options={livelloGiardinaggioOptions}
              domain="lavoratori.livello_giardinaggio"
              isEditing={isEditing}
              isUpdating={isUpdating}
              lookupColorsByDomain={lookupColorsByDomain}
              onChange={onLivelloGiardinaggioChange}
            />
          </div>
        </DetailSectionCard>

        <DetailSectionCard
          title="Consigliata da Baze"
          className="border-border/60"
          contentClassName="space-y-4"
        >
          <SkillsChoiceMatrix
            isEditing={isEditing}
            isUpdating={isUpdating}
            lookupColorsByDomain={lookupColorsByDomain}
            rows={[
              {
                field: "compatibilita_con_stiro_esigente",
                label:
                  "La consiglieresti per un lavoro dove e richiesto un alto livello di stiratura?",
                domain: "lavoratori.compatibilita_con_stiro_esigente",
                value: compatibilitaStiroValue,
                options: compatibilitaStiroOptions,
              },
              {
                field: "compatibilita_con_cucina_strutturata",
                label:
                  "La consiglieresti per un lavoro in cui e richiesta capacita culinaria elevata?",
                domain: "lavoratori.compatibilita_con_cucina_strutturata",
                value: compatibilitaCucinaValue,
                options: compatibilitaCucinaOptions,
              },
              {
                field: "compatibilita_babysitting_neonati",
                label:
                  "La consiglieresti per lavori dove deve accudire bambini neonati?",
                domain: "lavoratori.compatibilita_babysitting_neonati",
                value: compatibilitaNeonatiValue,
                options: compatibilitaNeonatiOptions,
              },
            ]}
            onFieldChange={(field, value) => {
              if (field === "compatibilita_con_stiro_esigente") {
                onCompatibilitaStiroChange(value);
                return;
              }

              if (field === "compatibilita_con_cucina_strutturata") {
                onCompatibilitaCucinaChange(value);
                return;
              }

              if (field === "compatibilita_babysitting_neonati") {
                onCompatibilitaNeonatiChange(value);
              }
            }}
          />
        </DetailSectionCard>

        <DetailSectionCard
          title="Standing e colloquio"
          className="border-border/60"
          contentClassName="space-y-4"
        >
          <GateStarRatingField
            label="Valuta l'atteggiamento / Standing"
            description="Valuta educazione, rispetto, postura e modo di porsi durante il colloquio."
            value={ratingAtteggiamentoValue}
            isEditing={isEditing}
            onChange={onRatingAtteggiamentoChange}
          />
          <GateStarRatingField
            label="Valuta la cura personale"
            description="Valuta l'attenzione dimostrata verso pulizia, ordine, cura personale e vestiario."
            value={ratingCuraPersonaleValue}
            isEditing={isEditing}
            onChange={onRatingCuraPersonaleChange}
          />
          <GateStarRatingField
            label="Valuta la precisione / puntualita"
            description="Valutazione su affidabilita e rispetto di orari e impegni."
            value={ratingPrecisionePuntualitaValue}
            isEditing={isEditing}
            onChange={onRatingPrecisionePuntualitaChange}
          />
          <GateStarRatingField
            label="Valuta la sua capacita comunicativa"
            description="Valuta la capacita di esprimersi e capire in modo chiaro e comprensibile in italiano."
            value={ratingCapacitaComunicativeValue}
            isEditing={isEditing}
            onChange={onRatingCapacitaComunicativeChange}
          />
          <div className="max-w-3xl">
            <GateLookupConfirmationField
              label="Che tipo di corporatura ha?"
              value={ratingCorporaturaValue}
              options={ratingCorporaturaOptions}
              domain="lavoratori.rating_corporatura"
              isEditing={isEditing}
              isUpdating={isUpdating}
              lookupColorsByDomain={lookupColorsByDomain}
              onChange={onRatingCorporaturaChange}
              persistMode="value"
              placeholder="Seleziona corporatura"
            />
          </div>
        </DetailSectionCard>

        <DetailSectionCard
          title="Contesti consigliati"
          className="border-border/60"
          contentClassName="space-y-4"
        >
          <div className="text-muted-foreground space-y-3 text-sm leading-6">
            <p>
              Qui non stai valutando se può lavorare, ma se la consiglieresti in
              questi contesti.
            </p>
            <blockquote className="border-l-2 pl-3">
              Usa le informazioni emerse da esperienze, test e osservazione.
            </blockquote>
            <p>
              Se non hai elementi sufficienti, lascia il campo non compilato.
            </p>
          </div>

          <SkillsChoiceMatrix
            isEditing={isEditing}
            isUpdating={isUpdating}
            lookupColorsByDomain={lookupColorsByDomain}
            rows={[
              {
                field: "compatibilita_famiglie_numerose",
                label:
                  "La consiglieresti per lavori dove la famiglia e numerosa (es. 4+ persone)",
                domain: "lavoratori.compatibilita_famiglie_numerose",
                value: compatibilitaFamiglieNumeroseValue,
                options: compatibilitaFamiglieNumeroseOptions,
              },
              {
                field: "compatibilita_famiglie_molto_esigenti",
                label:
                  "La consiglieresti per un contesto di alto livello o dove la famiglia e molto esigente?",
                domain: "lavoratori.compatibilita_famiglie_molto_esigenti",
                value: compatibilitaFamiglieMoltoEsigentiValue,
                options: compatibilitaFamiglieMoltoEsigentiOptions,
              },
              {
                field: "compatibilita_lavoro_con_datore_presente_in_casa",
                label:
                  "La consiglieresti per un lavoro dove il datore e sempre in casa e le sta dietro?",
                domain:
                  "lavoratori.compatibilita_lavoro_con_datore_presente_in_casa",
                value: compatibilitaDatorePresenteValue,
                options: compatibilitaDatorePresenteOptions,
              },
              {
                field: "compatibilita_con_case_di_grandi_dimensioni",
                label:
                  "La consiglieresti per lavorare in una casa di grandi dimensioni (200+ mq)",
                domain:
                  "lavoratori.compatibilita_con_case_di_grandi_dimensioni",
                value: compatibilitaCaseGrandiValue,
                options: compatibilitaCaseGrandiOptions,
              },
              {
                field: "compatibilita_con_animali_in_casa",
                label:
                  "La consiglieresti per un lavoro dove ci sono animali in casa?",
                domain: "lavoratori.compatibilita_con_animali_in_casa",
                value: compatibilitaAnimaliValue,
                options: compatibilitaAnimaliOptions,
              },
              {
                field: "compatibilita_con_elevata_autonomia_richiesta",
                label:
                  "La consiglieresti per un contesto dove e richiesta totale autonomia?",
                domain:
                  "lavoratori.compatibilita_con_elevata_autonomia_richiesta",
                value: compatibilitaAutonomiaValue,
                options: compatibilitaAutonomiaOptions,
              },
              {
                field: "compatibilita_con_contesti_pacati",
                label:
                  "La consiglieresti per un contesto dove e richiesta pacatezza e silenzio?",
                domain: "lavoratori.compatibilita_con_contesti_pacati",
                value: compatibilitaContestiPacatiValue,
                options: compatibilitaContestiPacatiOptions,
              },
            ]}
            onFieldChange={(field, value) => {
              if (field === "compatibilita_famiglie_numerose") {
                onCompatibilitaFamiglieNumeroseChange(value);
                return;
              }

              if (field === "compatibilita_famiglie_molto_esigenti") {
                onCompatibilitaFamiglieMoltoEsigentiChange(value);
                return;
              }

              if (
                field === "compatibilita_lavoro_con_datore_presente_in_casa"
              ) {
                onCompatibilitaDatorePresenteChange(value);
                return;
              }

              if (field === "compatibilita_con_case_di_grandi_dimensioni") {
                onCompatibilitaCaseGrandiChange(value);
                return;
              }

              if (field === "compatibilita_con_animali_in_casa") {
                onCompatibilitaAnimaliChange(value);
                return;
              }

              if (field === "compatibilita_con_elevata_autonomia_richiesta") {
                onCompatibilitaAutonomiaChange(value);
                return;
              }

              if (field === "compatibilita_con_contesti_pacati") {
                onCompatibilitaContestiPacatiChange(value);
              }
            }}
          />
        </DetailSectionCard>
      </GateInfoCard>
    );
  },
);
