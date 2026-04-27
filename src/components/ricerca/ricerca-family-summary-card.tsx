import {
  BriefcaseBusinessIcon,
  CalendarIcon,
  Clock3Icon,
  MailIcon,
  PhoneIcon,
} from "lucide-react";

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card";
import { Badge } from "@/components/ui-next/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui-next/select";
import { getTagClassName } from "@/features/lavoratori/lib/lookup-utils";
import type {
  CrmPipelineCardData,
  LookupOptionsByField,
} from "@/hooks/use-crm-pipeline-preview";

type RicercaFamilySummaryCardProps = {
  card: CrmPipelineCardData;
  lookupOptionsByField?: LookupOptionsByField;
  onPatchProcess?: (
    processId: string,
    patch: Record<string, unknown>,
  ) => Promise<void> | void;
};

function renderValue(value: string | null | undefined) {
  if (!value) return "-";
  const normalized = value.trim();
  return normalized ? normalized : "-";
}

function formatBadgeLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replaceAll("/", " / ")
    .replace(/\s+/g, " ")
    .trim();
}

function selectedOptionValue(
  selected: string | null | undefined,
  options: LookupOptionsByField[string] | undefined,
) {
  const normalizedSelected = String(selected ?? "").trim().toLowerCase();
  if (!normalizedSelected || !options?.length) return "";

  const match = options.find(
    (option) =>
      option.valueKey.trim().toLowerCase() === normalizedSelected ||
      option.valueLabel.trim().toLowerCase() === normalizedSelected,
  );

  return match?.valueKey ?? "";
}

export function RicercaFamilySummaryCard({
  card,
  lookupOptionsByField,
  onPatchProcess,
}: RicercaFamilySummaryCardProps) {
  const statoOperativoOptions = lookupOptionsByField?.stato_res ?? [];

  return (
    <DetailSectionBlock
      title="Famiglia"
      showDefaultAction={false}
      collapsible
      defaultOpen
      className="space-y-2"
      contentClassName="space-y-4 px-1 pt-1"
    >
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
          Stato
        </p>
        <Select
          value={selectedOptionValue(card.statoRes, statoOperativoOptions)}
          onValueChange={(next) => {
            void onPatchProcess?.(card.id, {
              stato_res: next || null,
            });
          }}
          disabled={!onPatchProcess}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleziona stato ricerca" />
          </SelectTrigger>
          <SelectContent align="start">
            {statoOperativoOptions.map((option) => (
              <SelectItem key={option.valueKey} value={option.valueKey}>
                {option.valueLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <p className="text-2xl leading-tight font-semibold text-foreground">
          {renderValue(card.nomeFamiglia)}
        </p>
        <div className="space-y-2.5 text-muted-foreground">
          <div className="flex items-center gap-2 text-sm">
            <PhoneIcon className="size-4 shrink-0" />
            <span className="truncate">{renderValue(card.telefono)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MailIcon className="size-4 shrink-0" />
            <span className="truncate">{renderValue(card.email)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="size-4 shrink-0" />
            <span className="truncate">{renderValue(card.dataLead)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {card.tipoLavoroBadge ? (
          <Badge
            variant="outline"
            className={getTagClassName(card.tipoLavoroColor)}
          >
            <BriefcaseBusinessIcon data-icon="inline-start" />
            {formatBadgeLabel(card.tipoLavoroBadge)}
          </Badge>
        ) : null}
        {card.tipoRapportoBadge ? (
          <Badge
            variant="outline"
            className={getTagClassName(card.tipoRapportoColor)}
          >
            <Clock3Icon data-icon="inline-start" />
            {formatBadgeLabel(card.tipoRapportoBadge)}
          </Badge>
        ) : null}
      </div>
    </DetailSectionBlock>
  );
}
