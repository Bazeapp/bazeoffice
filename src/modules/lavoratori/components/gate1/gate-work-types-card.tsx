import * as React from "react";
import { BadgeCheckIcon, PencilIcon } from "lucide-react";

import { ExperienceReferencesCard } from "../../components/experience-references-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { normalizeDomesticRoleLabels } from "../../lib/base-utils";
import {
  getLookupSelectValue,
  getTagClassName,
  resolveLookupColor,
  resolveLookupSingleValueOptions,
} from "../../lib/lookup-utils";
import { GateInfoCard } from "./gate-info-card";
import {
  EMPTY_SELECT_VALUE,
  GateAllowedWorkField,
  getLookupDisplayOption,
} from "./gate-field-primitives";

/**
 * D2 — card "Tipologia lavori" estratta da gate1-view.
 * Prop-driven (incapsula ExperienceReferencesCard), React.memo.
 */
export const GateWorkTypesCard = React.memo(function GateWorkTypesCard({
  workerId,
  haiReferenze,
  referenzeOptions,
  allowedWorks,
  allowedWorkOptions,
  isEditing,
  showReferencesField = false,
  showEditAction = false,
  onToggleEdit,
  onReferenzeChange,
  experienceDraft,
  selectedAnniEsperienzaColf,
  selectedAnniEsperienzaBadante,
  selectedAnniEsperienzaBabysitter,
  experiences,
  experiencesLoading,
  references,
  referencesLoading,
  lookupColorsByDomain,
  experienceTipoLavoroOptions,
  experienceTipoRapportoOptions,
  referenceStatusOptions,
  isUpdatingExperience,
  onAllowedWorksChange,
  onAnniEsperienzaColfChange,
  onAnniEsperienzaBadanteChange,
  onAnniEsperienzaBabysitterChange,
  onExperiencePatch,
  onExperienceCreate,
  onReferencePatch,
  onReferenceCreate,
}: {
  workerId: string | null;
  haiReferenze: string;
  referenzeOptions: Array<{ label: string; value: string }>;
  allowedWorks: string[];
  allowedWorkOptions: Array<{ label: string; value: string }>;
  isEditing: boolean;
  showReferencesField?: boolean;
  showEditAction?: boolean;
  onToggleEdit?: () => void;
  onReferenzeChange: (value: string) => void;
  experienceDraft: {
    anni_esperienza_colf: string;
    anni_esperienza_badante: string;
    anni_esperienza_babysitter: string;
    situazione_lavorativa_attuale: string;
  };
  selectedAnniEsperienzaColf: string;
  selectedAnniEsperienzaBadante: string;
  selectedAnniEsperienzaBabysitter: string;
  experiences: Parameters<typeof ExperienceReferencesCard>[0]["experiences"];
  experiencesLoading: boolean;
  references: Parameters<typeof ExperienceReferencesCard>[0]["references"];
  referencesLoading: boolean;
  lookupColorsByDomain: Map<string, string>;
  experienceTipoLavoroOptions: Array<{ label: string; value: string }>;
  experienceTipoRapportoOptions: Array<{ label: string; value: string }>;
  referenceStatusOptions: Array<{ label: string; value: string }>;
  isUpdatingExperience: boolean;
  onAllowedWorksChange: (values: string[]) => void;
  onAnniEsperienzaColfChange: (value: string) => void;
  onAnniEsperienzaBadanteChange: (value: string) => void;
  onAnniEsperienzaBabysitterChange: (value: string) => void;
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
  const allowedWorkLabels = React.useMemo(
    () => normalizeDomesticRoleLabels(allowedWorks),
    [allowedWorks],
  );

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
          ) : (
            <div className="rounded-lg border bg-surface px-3 py-2 text-sm">
              {getLookupDisplayOption(referenzeOptions, haiReferenze)?.label ||
                haiReferenze ||
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
          <GateAllowedWorkField
            value={allowedWorks}
            options={allowedWorkOptions}
            onChange={onAllowedWorksChange}
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
            <Input
              type="number"
              min="0"
              step="1"
              value={selectedAnniEsperienzaColf}
              onChange={(event) =>
                onAnniEsperienzaColfChange(event.target.value)
              }
            />
          ) : (
            <div className="rounded-lg border bg-surface px-3 py-2 text-sm">
              {selectedAnniEsperienzaColf || "-"}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="min-h-10 text-sm leading-5">
            Quanti anni di esperienza ha come Babysitter?
          </p>
          {isEditing ? (
            <Input
              type="number"
              min="0"
              step="1"
              value={selectedAnniEsperienzaBabysitter}
              onChange={(event) =>
                onAnniEsperienzaBabysitterChange(event.target.value)
              }
            />
          ) : (
            <div className="rounded-lg border bg-surface px-3 py-2 text-sm">
              {selectedAnniEsperienzaBabysitter || "-"}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="min-h-10 text-sm leading-5">
            Quanti anni di esperienza ha come Badante?
          </p>
          {isEditing ? (
            <Input
              type="number"
              min="0"
              step="1"
              value={selectedAnniEsperienzaBadante}
              onChange={(event) =>
                onAnniEsperienzaBadanteChange(event.target.value)
              }
            />
          ) : (
            <div className="rounded-lg border bg-surface px-3 py-2 text-sm">
              {selectedAnniEsperienzaBadante || "-"}
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
        selectedAnniEsperienzaColf={selectedAnniEsperienzaColf}
        selectedAnniEsperienzaBadante={selectedAnniEsperienzaBadante}
        selectedAnniEsperienzaBabysitter={selectedAnniEsperienzaBabysitter}
        selectedSituazioneLavorativaAttuale={
          experienceDraft.situazione_lavorativa_attuale
        }
        onToggleEdit={onToggleEdit ?? (() => {})}
        onAnniEsperienzaColfChange={onAnniEsperienzaColfChange}
        onAnniEsperienzaBadanteChange={onAnniEsperienzaBadanteChange}
        onAnniEsperienzaBabysitterChange={onAnniEsperienzaBabysitterChange}
        onSituazioneLavorativaAttualeChange={() => {}}
        onExperiencePatch={onExperiencePatch}
        onExperienceCreate={onExperienceCreate}
        onReferencePatch={onReferencePatch}
        onReferenceCreate={onReferenceCreate}
      />
    </GateInfoCard>
  );
});
