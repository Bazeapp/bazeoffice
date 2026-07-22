import {
  BriefcaseBusinessIcon,
  CalendarIcon,
  MailIcon,
  MapPinnedIcon,
  PhoneIcon,
  UsersIcon,
} from "lucide-react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getLookupBadgeSoftClassName } from "@/lib/lookup-color-styles"
import { cn } from "@/lib/utils"
import {
  getOrderedStageGroups,
  getStageDotClass,
  getStageGroupLabel,
  groupStageOptions,
} from "../lib/crm-stage-lookup"
import { renderFamigliaProcessoValue } from "../lib/famiglia-processo-display"
import { getSelectedLookupValue } from "../lib/famiglia-processo-lookup"
import { FamigliaProcessoDetailDuplicateDialog } from "./famiglia-processo-detail-duplicate-dialog"
import { FamigliaProcessoDetailEditToggleButton } from "./famiglia-processo-detail-edit-toggle-button"
import { FamigliaProcessoDetailFieldHeaderInline } from "./famiglia-processo-detail-field-header-inline"
import { FamigliaProcessoDetailFieldHeaderLookupMultiSelect } from "./famiglia-processo-detail-field-header-lookup-multi-select"
import { FamigliaProcessoDetailFieldHeaderRapportoSelect } from "./famiglia-processo-detail-field-header-rapporto-select"
import { useFamigliaProcessoDetail } from "./famiglia-processo-detail-context"
import { FamigliaProcessoDetailSectionNav } from "./famiglia-processo-detail-section-nav"

export function FamigliaProcessoDetailHeader() {
  const { state, actions, meta } = useFamigliaProcessoDetail()
  const {
    card,
    showHeaderMeta,
    showPrimaryControls,
    canEditStatoLead,
    isEditingFamilyHeader,
    canEditFamilyHeader,
    isDuplicating,
    headerAction,
  } = state
  const { onChangeStatoSales, toggleEdit, duplicateProcesso } = actions
  const { lookupOptionsByField } = meta

  const stageOptions = lookupOptionsByField.stato_sales ?? []
  const groupedStageOptions = groupStageOptions(stageOptions)
  const stageGroupOrder = getOrderedStageGroups(groupedStageOptions)
  const tipoLavoroOptions = lookupOptionsByField.tipo_lavoro ?? []
  const tipoRapportoOptions = lookupOptionsByField.tipo_rapporto ?? []

  return (
    <div className="bg-surface sticky top-0 z-20 border-b">
      <div className="space-y-3 px-4 pt-4">
        {showHeaderMeta || headerAction ? (
          <div className="flex items-start justify-between gap-3">
            {showHeaderMeta ? (
              <h2 className="min-w-0 flex-1 truncate text-xl font-semibold">
                {renderFamigliaProcessoValue(card?.nomeFamiglia)}
              </h2>
            ) : (
              <div />
            )}
            <div className="flex shrink-0 items-center gap-1">
              {card?.id ? (
                <FamigliaProcessoDetailDuplicateDialog
                  disabled={false}
                  isDuplicating={isDuplicating}
                  onConfirm={() => void duplicateProcesso()}
                />
              ) : null}
              {canEditFamilyHeader ? (
                <FamigliaProcessoDetailEditToggleButton
                  active={isEditingFamilyHeader}
                  onToggle={() => toggleEdit("familyHeader")}
                  variant="outline-ghost"
                  labels={{
                    on: "Termina modifica contatti famiglia",
                    off: "Modifica contatti famiglia",
                  }}
                />
              ) : null}
              {headerAction}
            </div>
          </div>
        ) : null}

        {showPrimaryControls ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Select
              value={getSelectedLookupValue(card?.stage, stageOptions)}
              onValueChange={(nextValue) => {
                if (!card || !nextValue) return
                void onChangeStatoSales?.(card.id, nextValue)
              }}
              disabled={!canEditStatoLead}
            >
              <SelectTrigger className="h-8 w-auto gap-1.5 rounded-full bg-surface pl-2.5 pr-2 text-xs font-medium">
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    getStageDotClass(card?.stage)
                  )}
                />
                <SelectValue placeholder="Stato lead" />
              </SelectTrigger>
              <SelectContent>
                {stageGroupOrder.map((groupKey) => (
                  <SelectGroup key={groupKey}>
                    <SelectLabel>{getStageGroupLabel(groupKey)}</SelectLabel>
                    {groupedStageOptions[groupKey]?.map((option) => (
                      <SelectItem key={option.valueKey} value={option.valueKey}>
                        {option.valueLabel}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>

            <FamigliaProcessoDetailFieldHeaderInline
              name="nomeFamiglia"
              label="referente famiglia"
              icon={UsersIcon}
              editing={isEditingFamilyHeader}
              autoFocus
            />
            <FamigliaProcessoDetailFieldHeaderInline
              name="email"
              label="email famiglia"
              icon={MailIcon}
              editing={isEditingFamilyHeader}
              inputType="email"
              inputMode="email"
            />
            <FamigliaProcessoDetailFieldHeaderInline
              name="telefono"
              label="telefono famiglia"
              icon={PhoneIcon}
              editing={isEditingFamilyHeader}
              inputType="tel"
              inputMode="tel"
            />
            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
              <MapPinnedIcon className="size-3.5 shrink-0" />
              <span>{renderFamigliaProcessoValue(card?.indirizzoProvincia)}</span>
            </span>
            <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
              <CalendarIcon className="size-3.5 shrink-0" />
              <span>Creata il {renderFamigliaProcessoValue(card?.dataLead)}</span>
            </span>
          </div>
        ) : null}

        {showPrimaryControls ? (
          <div className="flex flex-wrap items-center gap-2">
            <FamigliaProcessoDetailFieldHeaderLookupMultiSelect
              name="tipo_lavoro"
              options={tipoLavoroOptions}
              colorsByValue={card?.tipoLavoroColors ?? {}}
              placeholder="Tipo lavoro"
              icon={BriefcaseBusinessIcon}
              disabled={!canEditStatoLead}
            />

            <FamigliaProcessoDetailFieldHeaderRapportoSelect
              name="tipo_rapporto"
              options={tipoRapportoOptions}
              colorClassName={getLookupBadgeSoftClassName(card?.tipoRapportoColor)}
              disabled={!canEditStatoLead}
            />
          </div>
        ) : null}

        <FamigliaProcessoDetailSectionNav />
      </div>
    </div>
  )
}
