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
import type { CrmPipelineCardData } from "@/hooks/use-crm-pipeline-preview";

type FamigliaProcessoCardProps = {
  data: CrmPipelineCardData;
};

function renderValue(value: string | null | undefined) {
  return value && value.trim() ? value : "-";
}

function formatBadgeLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replaceAll("/", " / ")
    .replace(/\s+/g, " ")
    .trim();
}

function getBadgeClassName(color: string | null | undefined) {
  switch ((color ?? "").toLowerCase()) {
    case "red":
      return "border-red-200 bg-red-100 text-red-700";
    case "rose":
      return "border-rose-200 bg-rose-100 text-rose-700";
    case "orange":
      return "border-orange-200 bg-orange-100 text-orange-700";
    case "amber":
      return "border-amber-200 bg-amber-100 text-amber-700";
    case "yellow":
      return "border-yellow-200 bg-yellow-100 text-yellow-700";
    case "lime":
      return "border-lime-200 bg-lime-100 text-lime-700";
    case "green":
      return "border-green-200 bg-green-100 text-green-700";
    case "emerald":
      return "border-emerald-200 bg-emerald-100 text-emerald-700";
    case "teal":
      return "border-teal-200 bg-teal-100 text-teal-700";
    case "cyan":
      return "border-cyan-200 bg-cyan-100 text-cyan-700";
    case "sky":
      return "border-sky-200 bg-sky-100 text-sky-700";
    case "blue":
      return "border-blue-200 bg-blue-100 text-blue-700";
    case "indigo":
      return "border-indigo-200 bg-indigo-100 text-indigo-700";
    case "violet":
      return "border-violet-200 bg-violet-100 text-violet-700";
    case "purple":
      return "border-purple-200 bg-purple-100 text-purple-700";
    case "fuchsia":
      return "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700";
    case "pink":
      return "border-pink-200 bg-pink-100 text-pink-700";
    case "slate":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "gray":
      return "border-gray-200 bg-gray-100 text-gray-700";
    case "zinc":
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
    case "neutral":
      return "border-neutral-200 bg-neutral-100 text-neutral-700";
    case "stone":
      return "border-stone-200 bg-stone-100 text-stone-700";
    default:
      return "border-border bg-muted text-foreground";
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

  const hasTags = Boolean(data.tipoLavoroBadge || data.tipoRapportoBadge);
  const showTentativi =
    data.stage === "hot_in_attesa_di_primo_contatto" &&
    data.tentativiChiamataCount > 0;

  return (
    <RecordCard>
      <RecordCard.Header title={data.nomeFamiglia} />
      <RecordCard.Body>
        {hasTags ? (
          <CardMetaRow>
            {data.tipoLavoroBadge ? (
              <Badge className={getBadgeClassName(data.tipoLavoroColor)}>
                <BriefcaseBusinessIcon data-icon="inline-start" />
                {formatBadgeLabel(data.tipoLavoroBadge)}
              </Badge>
            ) : null}
            {data.tipoRapportoBadge ? (
              <Badge className={getBadgeClassName(data.tipoRapportoColor)}>
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
