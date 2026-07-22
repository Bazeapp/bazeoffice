import * as React from "react"

import { SectionHeader } from "@/components/shared-next/section-header"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { ContributiPeriod, ContributiStageDefinition } from "../types"
import { ContributiInpsQuarterSwitcher } from "./contributi-inps-quarter-switcher"

type ContributiInpsHeaderProps = {
  totalCount: number
  period: ContributiPeriod
  onPeriodChange: React.Dispatch<React.SetStateAction<ContributiPeriod>>
  search: string
  onSearchChange: (value: string) => void
  stageFilter: string
  onStageFilterChange: (value: string) => void
  stages: ContributiStageDefinition[]
}

export function ContributiInpsHeader({
  totalCount,
  period,
  onPeriodChange,
  search,
  onSearchChange,
  stageFilter,
  onStageFilterChange,
  stages,
}: ContributiInpsHeaderProps) {
  const hasActiveFilters = Boolean(search) || stageFilter !== "all"

  return (
    <SectionHeader>
      <SectionHeader.Title
        subtitle={`${totalCount} ${totalCount === 1 ? "contributo" : "contributi"}`}
      >
        Contributi INPS
      </SectionHeader.Title>
      <SectionHeader.Actions>
        <ContributiInpsQuarterSwitcher period={period} onPeriodChange={onPeriodChange} />
      </SectionHeader.Actions>
      <SectionHeader.Toolbar>
        <div className="w-full md:max-w-sm">
          <SearchInput
            data-testid="contributi-inps-search-input"
            placeholder="Cerca famiglia o lavoratore..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onClear={() => onSearchChange("")}
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onSearchChange("")
                onStageFilterChange("all")
              }}
            >
              Reset filtri
            </Button>
          ) : null}
          <Select value={stageFilter} onValueChange={onStageFilterChange}>
            <SelectTrigger className="min-w-50" data-testid="contributi-inps-stage-filter">
              <SelectValue placeholder="Tutti gli stati" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SectionHeader.Toolbar>
    </SectionHeader>
  )
}
