import * as React from "react";
import { PencilIcon, ShieldCheckIcon } from "lucide-react";

import { FormSkillsChoiceMatrix } from "../../components/skills-choice-matrix";
import { Button } from "@/components/ui/button";
import { DetailSectionCard } from "@/components/shared-next/detail-section-card";
import { GateInfoCard } from "./gate-info-card";
import {
  GateFormLevelField,
  GateFormLookupConfirmationField,
  GateFormStarRatingField,
} from "./gate-form-fields";

/**
 * D2 — card "Competenze" estratta da gate1-view.
 * Field roll-out: autosave via gateFieldsForm (useController nei form fields).
 */
export const GateSkillConfirmationsCard = React.memo(
  function GateSkillConfirmationsCard({
    isEditing,
    showEditAction = false,
    onToggleEdit,
    isUpdating,
    lookupColorsByDomain,
    livelloItalianoOptions,
    livelloIngleseOptions,
    livelloCucinaOptions,
    livelloStiroOptions,
    livelloPulizieOptions,
    livelloBabysittingOptions,
    livelloDogsittingOptions,
    livelloGiardinaggioOptions,
    compatibilitaStiroOptions,
    compatibilitaCucinaOptions,
    compatibilitaNeonatiOptions,
    ratingCorporaturaOptions,
    compatibilitaFamiglieNumeroseOptions,
    compatibilitaFamiglieMoltoEsigentiOptions,
    compatibilitaDatorePresenteOptions,
    compatibilitaCaseGrandiOptions,
    compatibilitaAnimaliOptions,
    compatibilitaAutonomiaOptions,
    compatibilitaContestiPacatiOptions,
  }: {
    isEditing: boolean;
    showEditAction?: boolean;
    onToggleEdit?: () => void;
    isUpdating: boolean;
    lookupColorsByDomain: Map<string, string>;
    livelloItalianoOptions: Array<{ label: string; value: string }>;
    livelloIngleseOptions: Array<{ label: string; value: string }>;
    livelloCucinaOptions: Array<{ label: string; value: string }>;
    livelloStiroOptions: Array<{ label: string; value: string }>;
    livelloPulizieOptions: Array<{ label: string; value: string }>;
    livelloBabysittingOptions: Array<{ label: string; value: string }>;
    livelloDogsittingOptions: Array<{ label: string; value: string }>;
    livelloGiardinaggioOptions: Array<{ label: string; value: string }>;
    compatibilitaStiroOptions: Array<{ label: string; value: string }>;
    compatibilitaCucinaOptions: Array<{ label: string; value: string }>;
    compatibilitaNeonatiOptions: Array<{ label: string; value: string }>;
    ratingCorporaturaOptions: Array<{ label: string; value: string }>;
    compatibilitaFamiglieNumeroseOptions: Array<{
      label: string;
      value: string;
    }>;
    compatibilitaFamiglieMoltoEsigentiOptions: Array<{
      label: string;
      value: string;
    }>;
    compatibilitaDatorePresenteOptions: Array<{ label: string; value: string }>;
    compatibilitaCaseGrandiOptions: Array<{ label: string; value: string }>;
    compatibilitaAnimaliOptions: Array<{ label: string; value: string }>;
    compatibilitaAutonomiaOptions: Array<{ label: string; value: string }>;
    compatibilitaContestiPacatiOptions: Array<{ label: string; value: string }>;
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
            <GateFormLevelField
              name="livello_italiano"
              label="Conferma livello italiano"
              options={livelloItalianoOptions}
              domain="lavoratori.livello_italiano"
              isEditing={isEditing}
              isUpdating={isUpdating}
              lookupColorsByDomain={lookupColorsByDomain}
              persistMode="value"
            />
            <GateFormLevelField
              name="livello_inglese"
              label="Conferma livello inglese"
              options={livelloIngleseOptions}
              domain="lavoratori.livello_inglese"
              isEditing={isEditing}
              isUpdating={isUpdating}
              lookupColorsByDomain={lookupColorsByDomain}
            />
          </div>
        </DetailSectionCard>

        <DetailSectionCard
          title="Casa"
          className="border-border/60"
          contentClassName="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <GateFormLevelField
              name="livello_cucina"
              label="Conferma livello cucina"
              options={livelloCucinaOptions}
              domain="lavoratori.livello_cucina"
              isEditing={isEditing}
              isUpdating={isUpdating}
              lookupColorsByDomain={lookupColorsByDomain}
              helperLines={[
                "Basso = Non cucina",
                "Medio = Cucina solo base",
                "Alto = Sa cucinare molto bene",
              ]}
            />
            <GateFormLevelField
              name="livello_stiro"
              label="Conferma livello stiro"
              options={livelloStiroOptions}
              domain="lavoratori.livello_stiro"
              isEditing={isEditing}
              isUpdating={isUpdating}
              lookupColorsByDomain={lookupColorsByDomain}
              helperLines={[
                "Basso = Non stira",
                "Medio = Stiro solo semplice",
                "Alto = Stira bene camicie",
              ]}
            />
            <GateFormLevelField
              name="livello_pulizie"
              label="Conferma livello pulizie"
              options={livelloPulizieOptions}
              domain="lavoratori.livello_pulizie"
              isEditing={isEditing}
              isUpdating={isUpdating}
              lookupColorsByDomain={lookupColorsByDomain}
            />
          </div>
        </DetailSectionCard>

        <DetailSectionCard
          title="Servizi"
          className="border-border/60"
          contentClassName="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <GateFormLevelField
              name="livello_babysitting"
              label="Conferma livello babysitting"
              options={livelloBabysittingOptions}
              domain="lavoratori.livello_babysitting"
              isEditing={isEditing}
              isUpdating={isUpdating}
              lookupColorsByDomain={lookupColorsByDomain}
            />
            <GateFormLevelField
              name="livello_dogsitting"
              label="Conferma livello dogsitting"
              options={livelloDogsittingOptions}
              domain="lavoratori.livello_dogsitting"
              isEditing={isEditing}
              isUpdating={isUpdating}
              lookupColorsByDomain={lookupColorsByDomain}
            />
            <GateFormLevelField
              name="livello_giardinaggio"
              label="Conferma livello giardinaggio"
              options={livelloGiardinaggioOptions}
              domain="lavoratori.livello_giardinaggio"
              isEditing={isEditing}
              isUpdating={isUpdating}
              lookupColorsByDomain={lookupColorsByDomain}
            />
          </div>
        </DetailSectionCard>

        <DetailSectionCard
          title="Consigliata da Baze"
          className="border-border/60"
          contentClassName="space-y-4"
        >
          <FormSkillsChoiceMatrix
            isEditing={isEditing}
            isUpdating={isUpdating}
            lookupColorsByDomain={lookupColorsByDomain}
            rows={[
              {
                name: "compatibilita_con_stiro_esigente",
                label:
                  "La consiglieresti per un lavoro dove e richiesto un alto livello di stiratura?",
                domain: "lavoratori.compatibilita_con_stiro_esigente",
                options: compatibilitaStiroOptions,
              },
              {
                name: "compatibilita_con_cucina_strutturata",
                label:
                  "La consiglieresti per un lavoro in cui e richiesta capacita culinaria elevata?",
                domain: "lavoratori.compatibilita_con_cucina_strutturata",
                options: compatibilitaCucinaOptions,
              },
              {
                name: "compatibilita_babysitting_neonati",
                label:
                  "La consiglieresti per lavori dove deve accudire bambini neonati?",
                domain: "lavoratori.compatibilita_babysitting_neonati",
                options: compatibilitaNeonatiOptions,
              },
            ]}
          />
        </DetailSectionCard>

        <DetailSectionCard
          title="Standing e colloquio"
          className="border-border/60"
          contentClassName="space-y-4"
        >
          <GateFormStarRatingField
            name="rating_atteggiamento"
            label="Valuta l'atteggiamento / Standing"
            description="Valuta educazione, rispetto, postura e modo di porsi durante il colloquio."
            isEditing={isEditing}
          />
          <GateFormStarRatingField
            name="rating_cura_personale"
            label="Valuta la cura personale"
            description="Valuta l'attenzione dimostrata verso pulizia, ordine, cura personale e vestiario."
            isEditing={isEditing}
          />
          <GateFormStarRatingField
            name="rating_precisione_puntualita"
            label="Valuta la precisione / puntualita"
            description="Valutazione su affidabilita e rispetto di orari e impegni."
            isEditing={isEditing}
          />
          <GateFormStarRatingField
            name="rating_capacita_comunicative"
            label="Valuta la sua capacita comunicativa"
            description="Valuta la capacita di esprimersi e capire in modo chiaro e comprensibile in italiano."
            isEditing={isEditing}
          />
          <div className="max-w-3xl">
            <GateFormLookupConfirmationField
              name="rating_corporatura"
              label="Che tipo di corporatura ha?"
              options={ratingCorporaturaOptions}
              domain="lavoratori.rating_corporatura"
              isEditing={isEditing}
              isUpdating={isUpdating}
              lookupColorsByDomain={lookupColorsByDomain}
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

          <FormSkillsChoiceMatrix
            isEditing={isEditing}
            isUpdating={isUpdating}
            lookupColorsByDomain={lookupColorsByDomain}
            rows={[
              {
                name: "compatibilita_famiglie_numerose",
                label:
                  "La consiglieresti per lavori dove la famiglia e numerosa (es. 4+ persone)",
                domain: "lavoratori.compatibilita_famiglie_numerose",
                options: compatibilitaFamiglieNumeroseOptions,
              },
              {
                name: "compatibilita_famiglie_molto_esigenti",
                label:
                  "La consiglieresti per un contesto di alto livello o dove la famiglia e molto esigente?",
                domain: "lavoratori.compatibilita_famiglie_molto_esigenti",
                options: compatibilitaFamiglieMoltoEsigentiOptions,
              },
              {
                name: "compatibilita_lavoro_con_datore_presente_in_casa",
                label:
                  "La consiglieresti per un lavoro dove il datore e sempre in casa e le sta dietro?",
                domain:
                  "lavoratori.compatibilita_lavoro_con_datore_presente_in_casa",
                options: compatibilitaDatorePresenteOptions,
              },
              {
                name: "compatibilita_con_case_di_grandi_dimensioni",
                label:
                  "La consiglieresti per lavorare in una casa di grandi dimensioni (200+ mq)",
                domain:
                  "lavoratori.compatibilita_con_case_di_grandi_dimensioni",
                options: compatibilitaCaseGrandiOptions,
              },
              {
                name: "compatibilita_con_animali_in_casa",
                label:
                  "La consiglieresti per un lavoro dove ci sono animali in casa?",
                domain: "lavoratori.compatibilita_con_animali_in_casa",
                options: compatibilitaAnimaliOptions,
              },
              {
                name: "compatibilita_con_elevata_autonomia_richiesta",
                label:
                  "La consiglieresti per un contesto dove e richiesta totale autonomia?",
                domain:
                  "lavoratori.compatibilita_con_elevata_autonomia_richiesta",
                options: compatibilitaAutonomiaOptions,
              },
              {
                name: "compatibilita_con_contesti_pacati",
                label:
                  "La consiglieresti per un contesto dove e richiesta pacatezza e silenzio?",
                domain: "lavoratori.compatibilita_con_contesti_pacati",
                options: compatibilitaContestiPacatiOptions,
              },
            ]}
          />
        </DetailSectionCard>
      </GateInfoCard>
    );
  },
);
