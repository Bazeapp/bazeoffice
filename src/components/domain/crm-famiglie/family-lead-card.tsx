/**
 * FamilyLeadCard — card di un processo famiglia nella Pipeline Kanban.
 * Vedi spec `outputs/04_spec/domain/family-lead-card.md`.
 */
import * as React from "react"
import {
  BriefcaseBusinessIcon,
  CalendarClockIcon,
  CalendarIcon,
  CheckSquareIcon,
  Clock3Icon,
  MailIcon,
  PhoneForwardedIcon,
  PhoneIcon,
  SquareIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export type FamilyLeadCardProps = {
  id: string
  name: string
  email: string
  phone: string
  oreGiorni: string
  creationDate: string
  province: string
  stage: string
  jobTag?: { key: string; label: string }
  contractTag?: { key: string; label: string }
  scheduledCallAt?: string
  recontactDate?: string
  callAttemptCount?: number
  preventivoAccettato: boolean
  dragging?: boolean
  selected?: boolean
  onClick?: () => void
  className?: string
}

const JOB_CLASS: Record<string, string> = {
  colf: "border-emerald-200 bg-emerald-50 text-emerald-700",
  badante: "border-blue-200 bg-blue-50 text-blue-700",
  babysitter: "border-purple-200 bg-purple-50 text-purple-700",
}
const CONTRACT_CLASS: Record<string, string> = {
  parttime: "border-amber-200 bg-amber-50 text-amber-700",
  fulltime: "border-emerald-200 bg-emerald-50 text-emerald-700",
  convivente: "border-sky-200 bg-sky-50 text-sky-700",
  orario: "border-orange-200 bg-orange-50 text-orange-700",
}

export function FamilyLeadCard({
  id,
  name,
  email,
  phone,
  oreGiorni,
  creationDate,
  province,
  stage,
  jobTag,
  contractTag,
  scheduledCallAt,
  recontactDate,
  callAttemptCount,
  preventivoAccettato,
  dragging = false,
  selected = false,
  onClick,
  className,
}: FamilyLeadCardProps) {
  const showScheduledCall = !!scheduledCallAt && stage.startsWith("hot_")
  const showRecontact = !!recontactDate && stage === "cold_ricerca_futura"
  const showCallAttempts =
    !!callAttemptCount && stage === "hot_in_attesa_di_primo_contatto"

  return (
    <Card
      role="article"
      aria-labelledby={`lead-${id}-name`}
      data-dragging={dragging}
      data-selected={selected}
      onClick={onClick}
      className={cn(
        "gap-0 border border-border bg-background py-2.5 shadow-none transition-all",
        "hover:shadow-md hover:border-border",
        "data-[selected=true]:ring-2 data-[selected=true]:ring-primary/40 data-[selected=true]:border-primary",
        "data-[dragging=true]:opacity-40",
        onClick && "cursor-pointer",
        className,
      )}
    >
      <CardContent className="space-y-2.5 px-3">
        {/* Name + tags */}
        <div className="space-y-1.5">
          <p
            id={`lead-${id}-name`}
            className="truncate text-[13px] font-semibold leading-tight text-foreground"
          >
            {name}
          </p>
          <div className="flex flex-wrap gap-1">
            {jobTag ? (
              <Badge
                variant="outline"
                className={cn(
                  "h-5 px-1.5 text-[10px] font-medium",
                  JOB_CLASS[jobTag.key] ?? "border-border",
                )}
              >
                <BriefcaseBusinessIcon data-icon="inline-start" />
                {jobTag.label}
              </Badge>
            ) : null}
            {contractTag ? (
              <Badge
                variant="outline"
                className={cn(
                  "h-5 px-1.5 text-[10px] font-medium",
                  CONTRACT_CLASS[contractTag.key] ?? "border-border",
                )}
              >
                <Clock3Icon data-icon="inline-start" />
                {contractTag.label}
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Meta rows */}
        <div className="space-y-1 border-t border-border/60 pt-1.5">
          <MetaRow icon={<MailIcon className="size-3 shrink-0" />} value={email} />
          <MetaRow icon={<PhoneIcon className="size-3 shrink-0" />} value={phone} />
          <MetaRow icon={<Clock3Icon className="size-3 shrink-0" />} value={oreGiorni} />

          <Separator className="my-1.5" />

          <MetaRow
            icon={<CalendarIcon className="size-3 shrink-0" />}
            value={`Creata il ${creationDate}`}
          />
          {showScheduledCall ? (
            <MetaRow
              icon={<CalendarClockIcon className="size-3 shrink-0 text-primary" />}
              value={`Call il ${scheduledCallAt}`}
              emphasis
            />
          ) : null}
          {showRecontact ? (
            <MetaRow
              icon={<CalendarClockIcon className="size-3 shrink-0 text-sky-600" />}
              value={`Ricontatto il ${recontactDate}`}
              emphasis
            />
          ) : null}
          {showCallAttempts ? (
            <Badge
              variant="outline"
              className="h-5 px-1.5 text-[10px] font-medium border-red-200 bg-red-50 text-red-700"
            >
              <PhoneForwardedIcon data-icon="inline-start" />
              {callAttemptCount}/3 tentativi
            </Badge>
          ) : null}

          {/* Preventivo checkbox indicator (always visible) */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {preventivoAccettato ? (
              <CheckSquareIcon
                className="size-3 shrink-0 text-emerald-600"
                aria-label="Preventivo accettato"
              />
            ) : (
              <SquareIcon
                className="size-3 shrink-0"
                aria-label="Preventivo non accettato"
              />
            )}
            <span>Preventivo accettato</span>
          </div>

          <div className="pt-0.5 text-[10px] text-muted-foreground tabular-nums">
            {id} · {province}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MetaRow({
  icon,
  value,
  emphasis = false,
}: {
  icon: React.ReactNode
  value: string
  emphasis?: boolean
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-[11px]",
        emphasis ? "font-medium text-foreground" : "text-muted-foreground",
      )}
    >
      {icon}
      <span className="truncate">{value}</span>
    </div>
  )
}
