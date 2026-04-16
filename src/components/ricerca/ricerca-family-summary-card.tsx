import {
  BriefcaseBusinessIcon,
  CalendarIcon,
  Clock3Icon,
  MailIcon,
  PhoneIcon,
} from "lucide-react";

import { DetailSectionBlock } from "@/components/shared/detail-section-card";
import { Badge } from "@/components/ui/badge";
import { getTagClassName } from "@/features/lavoratori/lib/lookup-utils";
import type { CrmPipelineCardData } from "@/hooks/use-crm-pipeline-preview";

type RicercaFamilySummaryCardProps = {
  card: CrmPipelineCardData;
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

export function RicercaFamilySummaryCard({
  card,
}: RicercaFamilySummaryCardProps) {
  return (
    <DetailSectionBlock
      title="Famiglia"
      showDefaultAction={false}
      className="space-y-2"
      contentClassName="space-y-4 px-1 pt-1"
    >
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
