import {
  AlertTriangleIcon,
  BriefcaseBusinessIcon,
  CalendarIcon,
  Clock3Icon,
  MapPinIcon,
} from "lucide-react";

import type { AssegnazioneCardData } from "../types";
import type { OperatoreOption } from "@/hooks/use-operatori-options";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CardMetaRow } from "@/components/shared-next/card-meta-row";
import { RecordCard } from "@/components/shared-next/record-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { formatBadgeLabel } from "@/lib/format-utils";
import { getLookupBadgeSoftClassName } from "@/lib/lookup-color-styles";
import { cn } from "@/lib/utils";
import {
  type AssigneeValue,
  formatOreGiorniLabel,
  formatRoleBadgeLabel,
  getAssigneeAvatarBorderClass,
  getTipoLavoroBadges,
} from "../lib/assegnazione-display-utils";
import { AssegnazioneOperatorSelectOption } from "./assegnazione-operator-select-option";

export type AssegnazioneSearchCardProps = {
  data: AssegnazioneCardData;
  assigneeId: AssigneeValue;
  assigneeLabel: string;
  assigneeAvatar: string;
  assigneeOptions: OperatoreOption[];
  accentClassName: string;
  onAssigneeChange: (assigneeId: AssigneeValue) => void;
};

export function AssegnazioneSearchCard({
  data,
  assigneeId,
  assigneeLabel,
  assigneeAvatar,
  assigneeOptions,
  accentClassName,
  onAssigneeChange,
}: AssegnazioneSearchCardProps) {
  const tipoLavoroBadges = getTipoLavoroBadges(data);
  const hasTags = Boolean(tipoLavoroBadges.length > 0 || data.tipoRapportoBadge);
  const hasInconsistentAssignment =
    (data.statoRes === "da_assegnare" &&
      (Boolean(data.recruiterId) || Boolean(data.dataAssegnazione))) ||
    (data.statoRes === "fare_ricerca" && !data.dataAssegnazione);

  return (
    <RecordCard accentClassName={accentClassName}>
      <RecordCard.Header
        title={data.nomeFamiglia}
        rightSlot={
          <Badge
            className={cn(
              data.tipoRicerca === "sostituzione"
                ? "border-amber-200 bg-amber-100 text-amber-700"
                : "border-sky-200 bg-sky-100 text-sky-700",
            )}
          >
            {data.tipoRicerca === "sostituzione" ? "Sostituzione" : "Nuova"}
          </Badge>
        }
      />
      <RecordCard.Body>
        {hasTags ? (
          <CardMetaRow>
            {tipoLavoroBadges.map((tipoLavoro) => (
              <Badge
                key={tipoLavoro}
                className={getLookupBadgeSoftClassName(
                  data.tipoLavoroColors?.[tipoLavoro] ?? data.tipoLavoroColor,
                )}
              >
                <BriefcaseBusinessIcon data-icon="inline-start" />
                {formatRoleBadgeLabel(tipoLavoro)}
              </Badge>
            ))}
            {data.tipoRapportoBadge ? (
              <Badge className={getLookupBadgeSoftClassName(data.tipoRapportoColor)}>
                <Clock3Icon data-icon="inline-start" />
                {formatBadgeLabel(data.tipoRapportoBadge)}
              </Badge>
            ) : null}
          </CardMetaRow>
        ) : null}
        {hasInconsistentAssignment ? (
          <CardMetaRow>
            <Badge className="border-orange-200 bg-orange-100 text-orange-700">
              <AlertTriangleIcon data-icon="inline-start" />
              Stato incoerente
            </Badge>
          </CardMetaRow>
        ) : null}
        <CardMetaRow icon={<Clock3Icon />}>
          {formatOreGiorniLabel(data.oreSettimanali, data.giorniSettimanali)}
        </CardMetaRow>
        <CardMetaRow icon={<MapPinIcon />}>{data.zona}</CardMetaRow>
      </RecordCard.Body>
      <RecordCard.Footer
        leftSlot={
          <CardMetaRow icon={<CalendarIcon />}>
            {data.deadlineMobile}
          </CardMetaRow>
        }
        rightSlot={
          <Select
            value={assigneeId}
            onValueChange={(value) =>
              onAssigneeChange(value as AssigneeValue)
            }
          >
            <SelectTrigger
              className="h-8 w-8 min-w-0 max-w-8 shrink-0 rounded-full border-0 p-0 shadow-none [&>svg]:hidden"
              aria-label="Cambia assegnatario"
              title={assigneeLabel}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <Avatar
                size="md"
                fallback={assigneeAvatar}
                className={getAssigneeAvatarBorderClass(assigneeId)}
              />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="none">Nessuno</SelectItem>
              {assigneeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  <AssegnazioneOperatorSelectOption operator={option} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
    </RecordCard>
  );
}
