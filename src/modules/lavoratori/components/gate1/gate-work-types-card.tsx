import * as React from "react";
import { BadgeCheckIcon, PencilIcon } from "lucide-react";
import { useWatch } from "react-hook-form";

import { FieldInput } from "@/components/forms/field-components";
import { ExperienceReferencesCard } from "../../components/experience-references-card";
import { Button } from "@/components/ui/button";
import { normalizeDomesticRoleDbLabels } from "../../lib/base-utils";
import {
  getLookupDisplayOption,
  getTagClassName,
  resolveLookupColor,
} from "../../lib/lookup-utils";
import {
  FieldAllowedWorkSelect,
  FieldLookupSelect,
} from "./gate-form-fields";
import { GateInfoCard } from "./gate-info-card";

/**
 * D2 — card "Tipologia lavori" estratta da gate1-view.
 * Field roll-out: autosave via gateFieldsForm.
 */
export const GateWorkTypesCard = React.memo(function GateWorkTypesCard({
  workerId,
  referenzeOptions,
  allowedWorkOptions,
  isEditing,
  showReferencesField = false,
  showEditAction = false,
  onToggleEdit,
  experienceDraft,
  experiences,
  experiencesLoading,
  references,
  referencesLoading,
  lookupColorsByDomain,
  experienceTipoLavoroOptions,
  experienceTipoRapportoOptions,
  referenceStatusOptions,
  isUpdatingExperience,
  onExperiencePatch,
  onExperienceCreate,
  onReferencePatch,
  onReferenceCreate,
}: {
  workerId: string | null;
  referenzeOptions: Array<{ label: string; value: string }>;
  allowedWorkOptions: Array<{ label: string; value: string }>;
  isEditing: boolean;
  showReferencesField?: boolean;
  showEditAction?: boolean;
  onToggleEdit?: () => void;
  experienceDraft: {
    situazione_lavorativa_attuale: string;
  };
  experiences: Parameters<typeof ExperienceReferencesCard>[0]["experiences"];
  experiencesLoading: boolean;
  references: Parameters<typeof ExperienceReferencesCard>[0]["references"];
  referencesLoading: boolean;
  lookupColorsByDomain: Map<string, string>;
  experienceTipoLavoroOptions: Array<{ label: string; value: string }>;
  experienceTipoRapportoOptions: Array<{ label: string; value: string }>;
  referenceStatusOptions: Array<{ label: string; value: string }>;
  isUpdatingExperience: boolean;
  onExperiencePatch: Parameters<
    typeof ExperienceReferencesCard
  >[0]["onExperiencePatch"];
  onExperienceCreate: NonNullable<
    Parameters<typeof ExperienceReferencesCard>[0]["onExperienceCreate"]
  >;
  onReferencePatch: Parameters<
    typeof ExperienceReferencesCard
  >[0]["onReferencePatch"];
  onReferenceCreate: Parameters<
    typeof ExperienceReferencesCard
  >[0]["onReferenceCreate"];
}) {
  const allowedWorks = useWatch({ name: "tipo_lavoro_domestico" }) as
    | string[]
    | undefined;
  const haiReferenze = useWatch({ name: "hai_referenze" }) as string | undefined;
  const anniColf = useWatch({ name: "anni_esperienza_colf" }) as
    | string
    | undefined;
  const anniBadante = useWatch({ name: "anni_esperienza_badante" }) as
    | string
    | undefined;
  const anniBabysitter = useWatch({ name: "anni_esperienza_babysitter" }) as
    | string
    | undefined;

  const allowedWorkLabels = React.useMemo(
    () => normalizeDomesticRoleDbLabels(allowedWorks ?? []),
    [allowedWorks],
  );
  const haiReferenzeValue = typeof haiReferenze === "string" ? haiReferenze : "";
  const anniColfValue = typeof anniColf === "string" ? anniColf : "";
  const anniBadanteValue = typeof anniBadante === "string" ? anniBadante : "";
  const anniBabysitterValue =
    typeof anniBabysitter === "string" ? anniBabysitter : "";

  return (
    <GateInfoCard
      title="Tipologia lavori"
      icon={<BadgeCheckIcon className="text-muted-foreground size-4" />}
      titleAction={
        showEditAction ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={
              isEditing
                ? "Termina modifica tipologia lavori"
                : "Modifica tipologia lavori"
            }
            title={
              isEditing
                ? "Termina modifica tipologia lavori"
                : "Modifica tipologia lavori"
            }
            onClick={onToggleEdit}
          >
            <PencilIcon />
          </Button>
        ) : undefined
      }
    >
      {showReferencesField ? (
        <div className="space-y-2">
          <p className="text-sm">Referenze verificabili</p>
          {isEditing ? (
            <FieldLookupSelect
              name="hai_referenze"
              options={referenzeOptions}
              placeholder="Seleziona referenze"
            />
          ) : (
            <div className="rounded-lg border bg-surface px-3 py-2 text-sm">
              {getLookupDisplayOption(referenzeOptions, haiReferenzeValue)
                ?.label ||
                haiReferenzeValue ||
                "-"}
            </div>
          )}
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm">
          Quali lavori puo svolgere? (Assessment recruiter)
        </p>
        {isEditing ? (
          <FieldAllowedWorkSelect
            name="tipo_lavoro_domestico"
            options={allowedWorkOptions}
          />
        ) : allowedWorkLabels.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {allowedWorkLabels.map((label) => (
              <span
                key={label}
                className={`inline-flex items-center rounded-4xl border px-2.5 py-0.5 text-xs ${getTagClassName(
                  resolveLookupColor(
                    lookupColorsByDomain,
                    "lavoratori.tipo_lavoro_domestico",
                    label,
                  ),
                )}`}
              >
                {label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">-</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <p className="min-h-10 text-sm leading-5">
            Quanti anni di esperienza ha come Colf?
          </p>
          {isEditing ? (
            <FieldInput
              name="anni_esperienza_colf"
              type="number"
              min="0"
              step="1"
            />
          ) : (
            <div className="rounded-lg border bg-surface px-3 py-2 text-sm">
              {anniColfValue || "-"}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="min-h-10 text-sm leading-5">
            Quanti anni di esperienza ha come Babysitter?
          </p>
          {isEditing ? (
            <FieldInput
              name="anni_esperienza_babysitter"
              type="number"
              min="0"
              step="1"
            />
          ) : (
            <div className="rounded-lg border bg-surface px-3 py-2 text-sm">
              {anniBabysitterValue || "-"}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="min-h-10 text-sm leading-5">
            Quanti anni di esperienza ha come Badante?
          </p>
          {isEditing ? (
            <FieldInput
              name="anni_esperienza_badante"
              type="number"
              min="0"
              step="1"
            />
          ) : (
            <div className="rounded-lg border bg-surface px-3 py-2 text-sm">
              {anniBadanteValue || "-"}
            </div>
          )}
        </div>
      </div>

      <ExperienceReferencesCard
        workerId={workerId}
        title="Esperienze lavorative"
        showSummaryFields={false}
        showSituationField={false}
        isEditing={isEditing}
        showEditAction={false}
        showCreateExperienceAction={isEditing}
        isUpdating={isUpdatingExperience}
        experiences={experiences}
        experiencesLoading={experiencesLoading}
        references={references}
        referencesLoading={referencesLoading}
        lookupColorsByDomain={lookupColorsByDomain}
        experienceTipoLavoroOptions={experienceTipoLavoroOptions}
        experienceTipoRapportoOptions={experienceTipoRapportoOptions}
        referenceStatusOptions={referenceStatusOptions}
        selectedAnniEsperienzaColf={anniColfValue}
        selectedAnniEsperienzaBadante={anniBadanteValue}
        selectedAnniEsperienzaBabysitter={anniBabysitterValue}
        selectedSituazioneLavorativaAttuale={
          experienceDraft.situazione_lavorativa_attuale
        }
        onToggleEdit={onToggleEdit ?? (() => {})}
        onAnniEsperienzaColfChange={() => {}}
        onAnniEsperienzaBadanteChange={() => {}}
        onAnniEsperienzaBabysitterChange={() => {}}
        onSituazioneLavorativaAttualeChange={() => {}}
        onExperiencePatch={onExperiencePatch}
        onExperienceCreate={onExperienceCreate}
        onReferencePatch={onReferencePatch}
        onReferenceCreate={onReferenceCreate}
      />
    </GateInfoCard>
  );
});
