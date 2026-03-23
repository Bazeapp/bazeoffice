import type { ReactNode } from "react";
import {
  BriefcaseBusinessIcon,
  CalendarIcon,
  Clock3Icon,
  MailIcon,
  PhoneIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

function MetaRow({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <div className="text-muted-foreground flex min-w-0 items-center gap-2 text-xs">
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{renderValue(value)}</span>
    </div>
  );
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
    <Card className="bg-white border border-border/70 py-2 shadow-none transition-shadow hover:shadow-md">
      <CardContent className="space-y-2.5 px-3">
        <div className="space-y-1.5">
          <p className="truncate text-sm leading-none font-semibold">
            {data.nomeFamiglia}
          </p>
          <div className="flex min-h-4 flex-col gap-1.5">
            {data.tipoLavoroBadge ? (
              <Badge
                variant="outline"
                className={`h-5 px-2 text-[11px] font-medium ${getBadgeClassName(
                  data.tipoLavoroColor,
                )}`}
              >
                <BriefcaseBusinessIcon data-icon="inline-start" />
                {formatBadgeLabel(data.tipoLavoroBadge)}
              </Badge>
            ) : null}
            {data.tipoRapportoBadge ? (
              <Badge
                variant="outline"
                className={`h-5 px-2 text-[11px] font-medium ${getBadgeClassName(
                  data.tipoRapportoColor,
                )}`}
              >
                <Clock3Icon data-icon="inline-start" />
                {formatBadgeLabel(data.tipoRapportoBadge)}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5 border-t pt-2">
          <MetaRow
            icon={<MailIcon className="size-3.5" />}
            value={data.email}
          />
          <MetaRow
            icon={<PhoneIcon className="size-3.5" />}
            value={data.telefono}
          />
          <MetaRow
            icon={<Clock3Icon className="size-3.5" />}
            value={oreGiorni}
          />
          <Separator />
          <MetaRow
            icon={<CalendarIcon className="size-3.5" />}
            value={data.dataLead}
          />
        </div>
      </CardContent>
    </Card>
  );
}
