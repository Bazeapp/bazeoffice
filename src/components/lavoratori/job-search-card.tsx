import { BriefcaseBusinessIcon, CheckIcon, PencilIcon, XIcon } from "lucide-react"

import { WorkerShiftPreferencesFields } from "@/components/lavoratori/worker-shift-preferences-fields"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FieldLabel } from "@/components/ui/field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getTagClassName, resolveLookupColor } from "@/features/lavoratori/lib/lookup-utils"
import { cn } from "@/lib/utils"
import type { LookupOption } from "@/features/lavoratori/lib/lookup-utils"

type JobSearchDraft = {
  tipo_lavoro_domestico: string[]
  tipo_rapporto_lavorativo: string[]
  check_lavori_accettabili: string[]
  check_accetta_lavori_con_trasferta: string
  check_accetta_multipli_contratti: string
  check_accetta_paga_9_euro_netti: string
}

type JobSearchCardProps = {
  isEditing: boolean
  showEditAction?: boolean
  collapsible?: boolean
  defaultOpen?: boolean
  isUpdating: boolean
  draft: JobSearchDraft
  tipoLavoroOptions: LookupOption[]
  tipoRapportoOptions: LookupOption[]
  lavoriAccettabiliOptions: LookupOption[]
  trasfertaOptions: LookupOption[]
  multipliContrattiOptions: LookupOption[]
  paga9Options: LookupOption[]
  lookupColorsByDomain: Map<string, string>
  selectedTipoLavoro: string[]
  selectedTipoRapporto: string[]
  selectedLavoriAccettabili: string[]
  selectedTrasferta: string
  selectedMultipliContratti: string
  selectedPaga9: string
  onToggleEdit: () => void
  onTipoLavoroChange: (values: string[]) => void
  onTipoRapportoChange: (values: string[]) => void
  onLavoriAccettabiliChange: (values: string[]) => void
  onTrasfertaChange: (value: string) => void
  onMultipliContrattiChange: (value: string) => void
  onPaga9Change: (value: string) => void
}

type AcceptFieldProps = {
  value: string
  options: LookupOption[]
  disabled: boolean
  onChange: (value: string) => void
  domain: string
  lookupColorsByDomain: Map<string, string>
}

function AcceptField({
  value,
  options,
  disabled,
  onChange,
  domain,
  lookupColorsByDomain,
}: AcceptFieldProps) {
  return (
    <div>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        className="gap-2"
        disabled={disabled}
      >
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <RadioGroupItem value={option.label} />
            <span
              className={cn(
                "inline-flex items-center rounded-4xl border px-2.5 py-0.5 text-xs",
                getTagClassName(
                  resolveLookupColor(lookupColorsByDomain, domain, option.label)
                )
              )}
            >
              {option.label === "Accetta" ? (
                <CheckIcon className="size-3.5" />
              ) : option.label === "Non accetta" ? (
                <XIcon className="size-3.5" />
              ) : null}
              {option.label}
            </span>
          </label>
        ))}
      </RadioGroup>
    </div>
  )
}

function ReadOnlySingleBadge({
  value,
  domain,
  lookupColorsByDomain,
}: {
  value: string
  domain: string
  lookupColorsByDomain: Map<string, string>
}) {
  if (!value) {
    return <span className="text-sm">-</span>
  }

  return (
    <Badge
      variant="outline"
      className={getTagClassName(resolveLookupColor(lookupColorsByDomain, domain, value))}
    >
      {value === "Accetta" ? (
        <CheckIcon className="size-3.5" />
      ) : value === "Non accetta" ? (
        <XIcon className="size-3.5" />
      ) : null}
      {value}
    </Badge>
  )
}

export function JobSearchCard({
  isEditing,
  showEditAction = true,
  collapsible = true,
  defaultOpen = true,
  isUpdating,
  draft,
  tipoLavoroOptions,
  tipoRapportoOptions,
  lavoriAccettabiliOptions,
  trasfertaOptions,
  multipliContrattiOptions,
  paga9Options,
  lookupColorsByDomain,
  selectedTipoLavoro,
  selectedTipoRapporto,
  selectedLavoriAccettabili,
  selectedTrasferta,
  selectedMultipliContratti,
  selectedPaga9,
  onToggleEdit,
  onTipoLavoroChange,
  onTipoRapportoChange,
  onLavoriAccettabiliChange,
  onTrasfertaChange,
  onMultipliContrattiChange,
  onPaga9Change,
}: JobSearchCardProps) {
  return (
    <DetailSectionBlock
      title="Ricerca Lavoro"
      icon={<BriefcaseBusinessIcon className="text-muted-foreground size-4" />}
      action={showEditAction ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={isEditing ? "Termina modifica ricerca lavoro" : "Modifica ricerca lavoro"}
          title={isEditing ? "Termina modifica ricerca lavoro" : "Modifica ricerca lavoro"}
          onClick={onToggleEdit}
        >
          <PencilIcon />
        </Button>
      ) : undefined}
      showDefaultAction={showEditAction}
      collapsible={collapsible}
      defaultOpen={defaultOpen}
      contentClassName="space-y-4"
    >
      <div className="space-y-4">
        <WorkerShiftPreferencesFields
          fields={[
            {
              id: "tipo-lavoro-domestico",
              label: "Lavori che accetta",
              domain: "lavoratori.tipo_lavoro_domestico",
              value: isEditing ? draft.tipo_lavoro_domestico : selectedTipoLavoro,
              options: tipoLavoroOptions,
              placeholder: "Seleziona lavori",
              onChange: onTipoLavoroChange,
            },
          ]}
          isEditing={isEditing}
          isUpdating={isUpdating}
          lookupColorsByDomain={lookupColorsByDomain}
          columns={1}
        />

        <WorkerShiftPreferencesFields
          fields={[
            {
              id: "tipo-rapporto-lavorativo",
              label: "Frequenza disponibilita",
              domain: "lavoratori.tipo_rapporto_lavorativo",
              value: isEditing ? draft.tipo_rapporto_lavorativo : selectedTipoRapporto,
              options: tipoRapportoOptions,
              placeholder: "Seleziona frequenze",
              onChange: onTipoRapportoChange,
            },
            {
              id: "lavori-accettabili",
              label: "Numero di giorni lavorativi che accetta per fare un contratto",
              domain: "lavoratori.check_lavori_accettabili",
              value: isEditing ? draft.check_lavori_accettabili : selectedLavoriAccettabili,
              options: lavoriAccettabiliOptions,
              placeholder: "Seleziona lavori",
              onChange: onLavoriAccettabiliChange,
              sortByOptionOrder: true,
            },
          ]}
          isEditing={isEditing}
          isUpdating={isUpdating}
          lookupColorsByDomain={lookupColorsByDomain}
          columns={1}
        />
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <FieldLabel>
            Accetta lavori con trasferte?
          </FieldLabel>
          {isEditing ? (
            <AcceptField
              value={draft.check_accetta_lavori_con_trasferta}
              options={trasfertaOptions}
              disabled={isUpdating}
              onChange={onTrasfertaChange}
              domain="lavoratori.check_accetta_lavori_con_trasferta"
              lookupColorsByDomain={lookupColorsByDomain}
            />
          ) : (
            <ReadOnlySingleBadge
              value={selectedTrasferta}
              domain="lavoratori.check_accetta_lavori_con_trasferta"
              lookupColorsByDomain={lookupColorsByDomain}
            />
          )}
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-1">
          <FieldLabel>
            Accetta di fare piu contratti?
          </FieldLabel>
          {isEditing ? (
            <AcceptField
              value={draft.check_accetta_multipli_contratti}
              options={multipliContrattiOptions}
              disabled={isUpdating}
              onChange={onMultipliContrattiChange}
              domain="lavoratori.check_accetta_multipli_contratti"
              lookupColorsByDomain={lookupColorsByDomain}
            />
          ) : (
            <ReadOnlySingleBadge
              value={selectedMultipliContratti}
              domain="lavoratori.check_accetta_multipli_contratti"
              lookupColorsByDomain={lookupColorsByDomain}
            />
          )}
        </div>

        <div className="space-y-1">
          <FieldLabel>
            Accetta la paga di 9€ netti l'ora in regola?
          </FieldLabel>
          {isEditing ? (
            <AcceptField
              value={draft.check_accetta_paga_9_euro_netti}
              options={paga9Options}
              disabled={isUpdating}
              onChange={onPaga9Change}
              domain="lavoratori.check_accetta_paga_9_euro_netti"
              lookupColorsByDomain={lookupColorsByDomain}
            />
          ) : (
            <ReadOnlySingleBadge
              value={selectedPaga9}
              domain="lavoratori.check_accetta_paga_9_euro_netti"
              lookupColorsByDomain={lookupColorsByDomain}
            />
          )}
        </div>
      </div>
    </DetailSectionBlock>
  )
}
