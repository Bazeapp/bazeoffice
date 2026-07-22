import { CheckIcon, PencilIcon, SlidersHorizontalIcon, XIcon } from "lucide-react"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import { asString, getTagClassName, resolveLookupColor } from "@/modules/lavoratori/lib"

import type {
  PreferenceFieldConfig,
  WorkerPipelineSummaryPreferencesCardProps,
} from "../types/worker-pipeline-summary"

function AcceptPreferenceField({
  field: fieldName,
  label,
  domain,
  isEditing,
  isUpdating,
  lookupColorsByDomain,
  draftValue,
  selectedValue,
  options,
  onChange,
}: PreferenceFieldConfig & {
  isEditing: boolean
  isUpdating: boolean
  lookupColorsByDomain: Map<string, string>
  draftValue: string
  selectedValue: string
  onChange: (field: PreferenceFieldConfig["field"], value: string) => void
}) {
  const value = isEditing ? draftValue : selectedValue

  return (
    <div className="space-y-1.5">
      <p
        className={cn(
          "text-muted-foreground text-[10px] font-medium uppercase tracking-wider",
        )}
      >
        {label}
      </p>
      {isEditing ? (
        <RadioGroup
          value={value}
          onValueChange={(nextValue) => onChange(fieldName, nextValue)}
          className="gap-2"
          disabled={isUpdating}
        >
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <RadioGroupItem value={option.label} />
              <span
                className={`inline-flex items-center gap-1 rounded-4xl border px-2.5 py-0.5 text-xs ${getTagClassName(
                  resolveLookupColor(lookupColorsByDomain, domain, option.label),
                )}`}
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
      ) : value ? (
        <Badge
          variant="outline"
          className={getTagClassName(
            resolveLookupColor(lookupColorsByDomain, domain, value),
          )}
        >
          {value === "Accetta" ? (
            <CheckIcon className="size-3.5" />
          ) : value === "Non accetta" ? (
            <XIcon className="size-3.5" />
          ) : null}
          {value}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      )}
    </div>
  )
}

export function WorkerPipelineSummaryPreferencesCard({
  workerRow,
  isEditing,
  onToggleEdit,
  isUpdating,
  draft,
  lookupColorsByDomain,
  funzionamentoBazeOptions,
  trasfertaOptions,
  multipliContrattiOptions,
  paga9Options,
  onDraftChange,
  onFieldPatch,
}: WorkerPipelineSummaryPreferencesCardProps) {
  const fields: PreferenceFieldConfig[] = [
    {
      field: "check_accetta_funzionamento_baze",
      label: "Accetta il funzionamento Baze?",
      domain: "lavoratori.check_accetta_funzionamento_baze",
      value: asString(workerRow.check_accetta_funzionamento_baze),
      options: funzionamentoBazeOptions,
    },
    {
      field: "check_accetta_lavori_con_trasferta",
      label: "Accetta lavori con trasferte?",
      domain: "lavoratori.check_accetta_lavori_con_trasferta",
      value: asString(workerRow.check_accetta_lavori_con_trasferta),
      options: trasfertaOptions,
    },
    {
      field: "check_accetta_multipli_contratti",
      label: "Accetta di fare piu contratti?",
      domain: "lavoratori.check_accetta_multipli_contratti",
      value: asString(workerRow.check_accetta_multipli_contratti),
      options: multipliContrattiOptions,
    },
    {
      field: "check_accetta_paga_9_euro_netti",
      label: "Accetta la paga di 9 euro netti l'ora in regola?",
      domain: "lavoratori.check_accetta_paga_9_euro_netti",
      value: asString(workerRow.check_accetta_paga_9_euro_netti),
      options: paga9Options,
    },
  ]

  function handleChange(field: PreferenceFieldConfig["field"], value: string) {
    onDraftChange({ [field]: value })
    void onFieldPatch(field, value)
  }

  return (
    <DetailSectionBlock
      title="Preferenze e vincoli"
      icon={<SlidersHorizontalIcon className="text-muted-foreground size-4" />}
      collapsible
      defaultOpen={false}
      action={
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={
            isEditing
              ? "Termina modifica preferenze e vincoli"
              : "Modifica preferenze e vincoli"
          }
          title={
            isEditing
              ? "Termina modifica preferenze e vincoli"
              : "Modifica preferenze e vincoli"
          }
          onClick={onToggleEdit}
          disabled={isUpdating}
        >
          <PencilIcon />
        </Button>
      }
      contentClassName="grid gap-4"
    >
      {fields.map((field) => (
        <AcceptPreferenceField
          key={field.field}
          {...field}
          isEditing={isEditing}
          isUpdating={isUpdating}
          lookupColorsByDomain={lookupColorsByDomain}
          draftValue={draft[field.field]}
          selectedValue={field.value}
          onChange={handleChange}
        />
      ))}
    </DetailSectionBlock>
  )
}
