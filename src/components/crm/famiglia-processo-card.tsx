import {
  BriefcaseBusinessIcon,
  CalendarIcon,
  Clock3Icon,
  MailIcon,
  PhoneIcon,
} from "lucide-react";

import { KanbanCard, KanbanCardBadge, KanbanCardBadgeRow, KanbanCardMeta, KanbanCardTitle } from "@/components/shared/kanban-card";
import type { CrmPipelineCardData } from "@/hooks/use-crm-pipeline-preview";
import { Separator } from "../ui/separator";

type FamigliaProcessoCardProps = {
  data: CrmPipelineCardData;
};

function renderValue(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

function formatBadgeLabel(value: string) {
  return value
    .replaceAll("-", " ")
    .replaceAll("/", " / ")
    .replace(/\s+/g, " ")
    .trim();
}

function getBadgeClassName(color: string | null | undefined) {
  switch ((color ?? "").toLowerCase()) {
    case "red":
      return "bg-badge-red-bg text-badge-red";
    case "rose":
    case "pink":
      return "bg-badge-rose-bg text-badge-rose";
    case "orange":
      return "bg-badge-orange-bg text-badge-orange";
    case "amber":
    case "yellow":
      return "bg-badge-amber-bg text-badge-amber";
    case "lime":
      return "bg-badge-lime-bg text-badge-lime";
    case "green":
      return "bg-badge-green-bg text-badge-green";
    case "emerald":
      return "bg-badge-emerald-bg text-badge-emerald";
    case "teal":
      return "bg-badge-teal-bg text-badge-teal";
    case "cyan":
      return "bg-badge-cyan-bg text-badge-cyan";
    case "sky":
      return "bg-badge-sky-bg text-badge-sky";
    case "blue":
      return "bg-badge-blue-bg text-badge-blue";
    case "indigo":
      return "bg-badge-blue-bg text-badge-blue";
    case "violet":
    case "purple":
    case "fuchsia":
      return "bg-badge-purple-bg text-badge-purple";
    case "slate":
      return "bg-badge-slate-bg text-badge-slate";
    case "gray":
    case "zinc":
    case "neutral":
    case "stone":
      return "bg-badge-gray-bg text-badge-gray";
    default:
      return "bg-badge-gray-bg text-badge-gray";
  }
}

export function FamigliaProcessoCard({ data }: FamigliaProcessoCardProps) {
  const oreValue = renderValue(data.oreSettimana);
  const giorniValue = renderValue(data.giorniSettimana);
  const oreGiorni =
    oreValue === "-" && giorniValue === "-"
      ? "-"
      : `${oreValue === "-" ? "-" : `${oreValue}h`} | ${
          giorniValue === "-" ? "-" : `${giorniValue}g`
        }`;

  return (
    <KanbanCard>
      <KanbanCardTitle>{data.nomeFamiglia}</KanbanCardTitle>
      {(data.tipoLavoroBadge || data.tipoRapportoBadge) ? (
        <KanbanCardBadgeRow>
          {data.tipoLavoroBadge ? (
            <KanbanCardBadge color={getBadgeClassName(data.tipoLavoroColor)}>
              <BriefcaseBusinessIcon className="size-3" />
              {formatBadgeLabel(data.tipoLavoroBadge)}
            </KanbanCardBadge>
          ) : null}
          {data.tipoRapportoBadge ? (
            <KanbanCardBadge color={getBadgeClassName(data.tipoRapportoColor)}>
              <Clock3Icon className="size-3" />
              {formatBadgeLabel(data.tipoRapportoBadge)}
            </KanbanCardBadge>
          ) : null}
        </KanbanCardBadgeRow>
      ) : null}
      <div className="mt-2 space-y-1 border-t pt-2">
        <KanbanCardMeta>
          <MailIcon className="size-3.5 shrink-0" />
          <span className="truncate">{renderValue(data.email)}</span>
        </KanbanCardMeta>
        <KanbanCardMeta>
          <PhoneIcon className="size-3.5 shrink-0" />
          <span className="truncate">{renderValue(data.telefono)}</span>
        </KanbanCardMeta>
        <KanbanCardMeta>
          <Clock3Icon className="size-3.5 shrink-0" />
          <span className="truncate">{oreGiorni}</span>
        </KanbanCardMeta>
        <Separator />
        <KanbanCardMeta>
          <CalendarIcon className="size-3.5 shrink-0" />
          <span className="truncate">{renderValue(data.dataLead)}</span>
        </KanbanCardMeta>
      </div>
    </KanbanCard>
  );
}
