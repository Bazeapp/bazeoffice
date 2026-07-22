import {
  BriefcaseBusinessIcon,
  CalendarIcon,
  CalendarClockIcon,
  CheckSquareIcon,
  Clock3Icon,
  MailIcon,
  PhoneForwardedIcon,
  PhoneIcon,
  SquareIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CardMetaRow } from "@/components/shared-next/card-meta-row";
import { RecordCard } from "@/components/shared-next/record-card";
import { formatBadgeLabel } from "@/lib/format-utils";
import { getLookupBadgeSoftClassName } from "@/lib/lookup-color-styles";
import type { CrmPipelineCardData } from "../types";

type FamigliaProcessoCardProps = {
  data: CrmPipelineCardData;
};

function renderValue(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

export function FamigliaProcessoCard({ data }: FamigliaProcessoCardProps) {
  const oreValue = renderValue(data.oreSettimana);
  const giorniValue = renderValue(data.giorniSettimana);
  const tipoLavoroBadges =
    data.tipoLavoroBadges && data.tipoLavoroBadges.length > 0
      ? data.tipoLavoroBadges
      : data.tipoLavoroBadge
        ? [data.tipoLavoroBadge]
        : [];
  const oreGiorni =
    oreValue === "-" && giorniValue === "-"
      ? "-"
      : `${oreValue === "-" ? "-" : `${oreValue}h`} | ${
          giorniValue === "-" ? "-" : `${giorniValue}g`
        }`;

  const hasTags = Boolean(tipoLavoroBadges.length > 0 || data.tipoRapportoBadge);
  const showTentativi =
    data.stage === "hot_in_attesa_di_primo_contatto" &&
    data.tentativiChiamataCount > 0;

  return (
    <RecordCard>
      <RecordCard.Header title={data.nomeFamiglia} />
      <RecordCard.Body>
        {hasTags ? (
          <CardMetaRow>
            {tipoLavoroBadges.map((tipoLavoro) => (
              <Badge
                key={tipoLavoro}
                className={getLookupBadgeSoftClassName(
                  data.tipoLavoroColors?.[tipoLavoro] ?? data.tipoLavoroColor
                )}
              >
                <BriefcaseBusinessIcon data-icon="inline-start" />
                {formatBadgeLabel(tipoLavoro)}
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
        <CardMetaRow icon={<MailIcon />}>{renderValue(data.email)}</CardMetaRow>
        <CardMetaRow icon={<PhoneIcon />}>
          {renderValue(data.telefono)}
        </CardMetaRow>
        <CardMetaRow icon={<Clock3Icon />}>{oreGiorni}</CardMetaRow>
        <CardMetaRow icon={<CalendarIcon />}>
          {`Creata il ${data.dataLead}`}
        </CardMetaRow>
        {data.dataCallPrenotata !== "-" ? (
          <CardMetaRow icon={<CalendarClockIcon />}>
            {`Call il ${data.dataCallPrenotata.replace(",", " alle")}`}
          </CardMetaRow>
        ) : null}
        {data.stage === "cold_ricerca_futura" &&
        data.dataPerRicercaFutura !== "-" ? (
          <CardMetaRow icon={<CalendarClockIcon />}>
            {`Ricontatto il ${data.dataPerRicercaFutura}`}
          </CardMetaRow>
        ) : null}
        {showTentativi ? (
          <CardMetaRow>
            <Badge variant="outline" className="h-5 px-2 text-2xs font-medium">
              <PhoneForwardedIcon data-icon="inline-start" />
              {data.tentativiChiamataCount}/3 tentativi
            </Badge>
          </CardMetaRow>
        ) : null}
      </RecordCard.Body>
      <RecordCard.Footer
        leftSlot={
          <span className="flex items-center gap-1.5 text-[12.5px] text-foreground-muted">
            {data.preventivoAccettato ? (
              <CheckSquareIcon className="size-3 text-emerald-600" />
            ) : (
              <SquareIcon className="size-3 text-foreground-faint" />
            )}
            Preventivo accettato
          </span>
        }
      />
    </RecordCard>
  );
}
