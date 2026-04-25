/**
 * FamilyHeadPills — 3 pill editabili (stage, jobs multi, contract) nel detail sheet head.
 * Vedi spec `outputs/04_spec/domain/family-head-pills.md`.
 */
import * as React from "react"
import { BriefcaseIcon, CheckIcon, ChevronDownIcon, Clock3Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import type {
  FamilyContractKey,
  FamilyJobKey,
  FamilyStage,
  FamilyStageId,
  FamilyTag,
} from "@/pages/_dev-family-mock-data"

type FamilyHeadPillsProps = {
  stage: FamilyStageId
  stageOptions: FamilyStage[]
  onStageChange?: (next: FamilyStageId) => void

  jobs: FamilyJobKey[]
  jobOptions: Array<FamilyTag<FamilyJobKey>>
  onJobsChange?: (next: FamilyJobKey[]) => void

  contract: FamilyContractKey | null
  contractOptions: Array<FamilyTag<FamilyContractKey>>
  onContractChange?: (next: FamilyContractKey) => void

  readOnly?: boolean
  className?: string
}

const JOB_CLASS: Record<string, string> = {
  colf: "border-emerald-200 bg-emerald-50 text-emerald-700",
  badante: "border-blue-200 bg-blue-50 text-blue-700",
  babysitter: "border-purple-200 bg-purple-50 text-purple-700",
}
const CONTRACT_CLASS: Record<string, string> = {
  parttime: "border-amber-200 bg-amber-50 text-amber-700",
  fulltime: "border-emerald-200 bg-emerald-50 text-emerald-700",
  convivente: "border-sky-200 bg-sky-50 text-sky-700",
  orario: "border-orange-200 bg-orange-50 text-orange-700",
}

export function FamilyHeadPills({
  stage,
  stageOptions,
  onStageChange,
  jobs,
  jobOptions,
  onJobsChange,
  contract,
  contractOptions,
  onContractChange,
  readOnly = false,
  className,
}: FamilyHeadPillsProps) {
  const currentStage = stageOptions.find((s) => s.id === stage)

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {/* Stage pill */}
      <Popover>
        <PopoverTrigger
          disabled={readOnly}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-full border px-2 text-[12px] font-medium transition-colors",
            "hover:bg-muted",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
          style={
            currentStage
              ? ({
                  borderColor: `color-mix(in oklch, ${currentStage.color} 40%, transparent)`,
                  color: currentStage.ink,
                  background: currentStage.soft,
                } as React.CSSProperties)
              : undefined
          }
        >
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full"
            style={{ background: currentStage?.color }}
          />
          {currentStage?.name ?? "Seleziona stage"}
          <ChevronDownIcon className="size-3 opacity-60" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[260px] max-h-[400px] overflow-y-auto p-1">
          <div className="ui-type-meta px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Stage
          </div>
          {stageOptions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onStageChange?.(s.id)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted"
            >
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ background: s.color }}
              />
              <span className="flex-1">{s.name}</span>
              {stage === s.id ? <CheckIcon className="size-3.5 text-primary" /> : null}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      {/* Jobs multi pill */}
      <Popover>
        <PopoverTrigger
          disabled={readOnly}
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-background px-2 text-[12px] font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          <BriefcaseIcon className="size-3 opacity-60" />
          {jobs.length === 0 ? (
            <span className="text-muted-foreground">Tipo lavoro…</span>
          ) : (
            <span className="flex flex-wrap gap-0.5">
              {jobs.map((k) => {
                const opt = jobOptions.find((j) => j.key === k)
                return opt ? (
                  <Badge
                    key={k}
                    variant="outline"
                    className={cn("h-[18px] px-1.5 text-[10px]", JOB_CLASS[k])}
                  >
                    {opt.label}
                  </Badge>
                ) : null
              })}
            </span>
          )}
          <ChevronDownIcon className="size-3 opacity-60" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[240px] p-1">
          <div className="ui-type-meta px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tipo lavoro · multi
          </div>
          {jobOptions.map((opt) => {
            const active = jobs.includes(opt.key)
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() =>
                  onJobsChange?.(active ? jobs.filter((k) => k !== opt.key) : [...jobs, opt.key])
                }
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
              >
                <Badge
                  variant="outline"
                  className={cn("h-5 px-1.5 text-[10px]", JOB_CLASS[opt.key])}
                >
                  {opt.label}
                </Badge>
                <span className="flex-1" />
                {active ? <CheckIcon className="size-3.5 text-primary" /> : null}
              </button>
            )
          })}
        </PopoverContent>
      </Popover>

      {/* Contract single pill */}
      <Popover>
        <PopoverTrigger
          disabled={readOnly}
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-background px-2 text-[12px] font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Clock3Icon className="size-3 opacity-60" />
          {contract ? (
            (() => {
              const opt = contractOptions.find((c) => c.key === contract)
              return opt ? (
                <Badge
                  variant="outline"
                  className={cn("h-[18px] px-1.5 text-[10px]", CONTRACT_CLASS[contract])}
                >
                  {opt.label}
                </Badge>
              ) : null
            })()
          ) : (
            <span className="text-muted-foreground">Contratto…</span>
          )}
          <ChevronDownIcon className="size-3 opacity-60" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[240px] p-1">
          <div className="ui-type-meta px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Contratto
          </div>
          {contractOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => onContractChange?.(opt.key)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted"
            >
              <Badge
                variant="outline"
                className={cn("h-5 px-1.5 text-[10px]", CONTRACT_CLASS[opt.key])}
              >
                {opt.label}
              </Badge>
              <span className="flex-1" />
              {contract === opt.key ? <CheckIcon className="size-3.5 text-primary" /> : null}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  )
}
