import type { OperatoreOption } from "@/hooks/use-operatori-options"
import { SectionHeader } from "@/components/shared-next/section-header"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { SearchInput } from "@/components/ui/search-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { toAvatarRingClass } from "@/lib/utils"

export type RicercaBoardViewHeaderProps = {
  totalRicerche: number
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  selectedOperatorId: string
  onSelectedOperatorIdChange: (value: string) => void
  operatorOptions: OperatoreOption[]
  selectedOperator: OperatoreOption | null
}

export function RicercaBoardViewHeader({
  totalRicerche,
  searchQuery,
  onSearchQueryChange,
  selectedOperatorId,
  onSelectedOperatorIdChange,
  operatorOptions,
  selectedOperator,
}: RicercaBoardViewHeaderProps) {
  return (
    <SectionHeader>
      <SectionHeader.Title
        badge={
          <Badge>
            {totalRicerche} {totalRicerche === 1 ? "ricerca" : "ricerche"}
          </Badge>
        }
      >
        Ricerche
      </SectionHeader.Title>
      <SectionHeader.Actions>
        <Select value={selectedOperatorId} onValueChange={onSelectedOperatorIdChange}>
          <SelectTrigger className="w-60" data-testid="ricerca-filter-recruiter">
            {selectedOperator ? (
              <span className="inline-flex items-center gap-2">
                <Avatar
                  size="sm"
                  fallback={selectedOperator.avatar}
                  className={toAvatarRingClass(selectedOperator.avatarBorderClassName)}
                />
                <span>{selectedOperator.label}</span>
              </span>
            ) : (
              <span>
                {selectedOperatorId === "unassigned"
                  ? "Senza recruiter"
                  : "Tutti i recruiter"}
              </span>
            )}
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem value="all">Tutti i recruiter</SelectItem>
            <SelectItem value="unassigned">Senza recruiter</SelectItem>
            {operatorOptions.map((operator) => (
              <SelectItem key={operator.id} value={operator.id}>
                <span className="inline-flex items-center gap-2">
                  <Avatar
                    size="sm"
                    fallback={operator.avatar}
                    className={toAvatarRingClass(operator.avatarBorderClassName)}
                  />
                  <span>{operator.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SectionHeader.Actions>
      <SectionHeader.Toolbar>
        <div className="min-w-0 flex-1 max-w-105">
          <SearchInput
            data-testid="ricerca-search-input"
            placeholder="Cerca per cognome, email o ID..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            onClear={() => onSearchQueryChange("")}
          />
        </div>
      </SectionHeader.Toolbar>
    </SectionHeader>
  )
}
