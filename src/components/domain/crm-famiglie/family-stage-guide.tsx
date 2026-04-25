/**
 * FamilyStageGuide — pannello contestuale stato-dipendente nel detail sheet.
 * Risponde a CRM-012.
 * Config parziale (mock), versione completa richiede input product (Fase 3 §9.4 N9-6).
 * Vedi spec `outputs/04_spec/domain/family-stage-guide.md`.
 */
import * as React from "react"
import { CircleDotIcon } from "lucide-react"

import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDownIcon } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import type {
  FamilyStage,
  FamilyStageId,
  StageGuideEntry,
} from "@/pages/_dev-family-mock-data"

type FamilyStageGuideProps = {
  stage: FamilyStageId
  stages: FamilyStage[]
  config: Partial<Record<FamilyStageId, StageGuideEntry>>
  data: Record<string, unknown>
  onPatch?: (patch: Record<string, unknown>) => void
  readOnly?: boolean
  defaultOpen?: boolean
  className?: string
}

export function FamilyStageGuide({
  stage,
  stages,
  config,
  data,
  onPatch,
  readOnly = false,
  defaultOpen = true,
  className,
}: FamilyStageGuideProps) {
  const stageInfo = stages.find((s) => s.id === stage)
  const entry = config[stage]

  if (!stageInfo) return null

  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn(
        "rounded-lg border",
        className,
      )}
      style={
        {
          borderColor: `color-mix(in oklch, ${stageInfo.color} 40%, transparent)`,
          background: stageInfo.soft,
        } as React.CSSProperties
      }
    >
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3.5 py-2.5 text-left">
        <span
          aria-hidden="true"
          className="flex size-6 shrink-0 items-center justify-center rounded-full"
          style={{ background: stageInfo.color, color: "white" }}
        >
          <CircleDotIcon className="size-3" />
        </span>
        <span
          className="flex-1 text-[13px] font-semibold"
          style={{ color: stageInfo.ink }}
        >
          {stageInfo.name}
        </span>
        <ChevronDownIcon
          className="size-4 transition-transform group-data-closed:-rotate-90"
          style={{ color: stageInfo.ink }}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div
          className="space-y-3 border-t px-3.5 py-3 text-[12.5px]"
          style={{
            borderColor: `color-mix(in oklch, ${stageInfo.color} 30%, transparent)`,
            color: stageInfo.ink,
          }}
        >
          {entry ? (
            <>
              <p className="leading-relaxed opacity-90">{entry.description}</p>

              {entry.transitions.length > 0 ? (
                <div className="space-y-1">
                  <p className="ui-type-meta text-[11px] font-semibold uppercase tracking-wider opacity-70">
                    Transizioni possibili
                  </p>
                  <ol className="space-y-0.5 pl-5">
                    {entry.transitions.map((t, i) => (
                      <li key={i} className="list-decimal">
                        {t.description} → <strong>{t.targetStageLabel}</strong>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {entry.editableFields.length > 0 ? (
                <div
                  className="space-y-2 rounded-md border bg-white/60 p-3"
                  style={{
                    borderColor: `color-mix(in oklch, ${stageInfo.color} 25%, transparent)`,
                  }}
                >
                  {entry.editableFields.map((field) => (
                    <StageGuideField
                      key={field.key}
                      field={field}
                      value={data[field.key]}
                      onPatch={onPatch}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="italic opacity-70">
              Questo stato non ha guida operativa specifica.
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function StageGuideField({
  field,
  value,
  onPatch,
  readOnly,
}: {
  field: StageGuideEntry["editableFields"][number]
  value: unknown
  onPatch?: (patch: Record<string, unknown>) => void
  readOnly: boolean
}) {
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-[12.5px] font-medium">
        <Checkbox
          checked={!!value}
          disabled={readOnly}
          onCheckedChange={(c) => onPatch?.({ [field.key]: c === true })}
        />
        <span>{field.label}</span>
      </label>
    )
  }

  if (field.type === "radio" && field.options) {
    return (
      <div className="space-y-1.5">
        <p className="text-[12px] font-medium">{field.label}</p>
        <RadioGroup
          value={typeof value === "string" ? value : ""}
          onValueChange={(v) => onPatch?.({ [field.key]: v })}
          disabled={readOnly}
          className="grid grid-cols-2 gap-1.5"
        >
          {field.options.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-1.5 text-[12px]"
            >
              <RadioGroupItem value={opt.value} />
              <span>{opt.label}</span>
            </label>
          ))}
        </RadioGroup>
      </div>
    )
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-1">
        <p className="text-[12px] font-medium">{field.label}</p>
        <Textarea
          value={typeof value === "string" ? value : ""}
          disabled={readOnly}
          rows={2}
          onChange={(e) => onPatch?.({ [field.key]: e.target.value })}
          className="w-full bg-white/80"
        />
      </div>
    )
  }

  if (field.type === "date" || field.type === "datetime") {
    return (
      <div className="space-y-1">
        <p className="text-[12px] font-medium">
          {field.label}
          {field.warning ? (
            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
              {field.warning}
            </span>
          ) : null}
        </p>
        <input
          type={field.type === "datetime" ? "datetime-local" : "date"}
          value={typeof value === "string" ? value : ""}
          disabled={readOnly}
          onChange={(e) => onPatch?.({ [field.key]: e.target.value })}
          className="h-[26px] rounded-md border border-border bg-white px-2 text-[12.5px] outline-none disabled:opacity-50"
        />
      </div>
    )
  }

  return null
}
