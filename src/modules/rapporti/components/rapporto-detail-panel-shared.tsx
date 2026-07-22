import type { ReactNode } from "react"
import {
  CopyIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
} from "lucide-react"

import { getTagClassName } from "@/modules/lavoratori/lib"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { copyToClipboard, getListRowStatusColor } from "../lib/rapporto-detail-panel.utils"

export function RapportoDetailPanelRelatedPersonCard({
  role,
  name,
  email,
  phone,
  href,
  details,
}: {
  role: string
  name: string
  email: string | null | undefined
  phone: string | null | undefined
  href?: string
  details?: Array<{
    label: string
    value: string | null | undefined
  }>
}) {
  return (
    <Card className="py-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <CardContent className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
              <UserIcon className="text-muted-foreground size-4" />
            </div>
            <div className="min-w-0">
              <p className="ui-type-label">{role}</p>
              <p className="ui-type-value truncate">{name}</p>
            </div>
          </div>
          {href ? (
            <Button asChild variant="ghost" size="icon-sm">
              <a href={href} title={`Apri ${role.toLowerCase()}`}>
                <ExternalLinkIcon className="size-4" />
              </a>
            </Button>
          ) : null}
        </div>
        <div className="mt-3 space-y-1.5 pl-11 text-sm">
          <button
            type="button"
            onClick={() => copyToClipboard(email)}
            className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 text-left transition-colors"
          >
            <MailIcon className="size-4" />
            <span className="truncate">{email ?? "Record non collegato"}</span>
            {email ? <CopyIcon className="size-3.5 opacity-50" /> : null}
          </button>
          <button
            type="button"
            onClick={() => copyToClipboard(phone)}
            className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 text-left transition-colors"
          >
            <PhoneIcon className="size-4" />
            <span>{phone ?? "Record non collegato"}</span>
            {phone ? <CopyIcon className="size-3.5 opacity-50" /> : null}
          </button>
          {details?.map((detail) => (
            <button
              key={detail.label}
              type="button"
              onClick={() => copyToClipboard(detail.value)}
              className="text-muted-foreground hover:text-foreground flex w-full items-center gap-2 text-left transition-colors"
            >
              <CreditCardIcon className="size-4" />
              <span className="w-16 shrink-0 text-xs font-medium uppercase tracking-wide">
                {detail.label}
              </span>
              <span className="truncate">{detail.value ?? "-"}</span>
              {detail.value ? <CopyIcon className="size-3.5 opacity-50" /> : null}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function RapportoDetailPanelListRowCard({
  title,
  subtitle,
  rightBadge,
  trailing,
  onClick,
}: {
  title: string
  subtitle?: string
  rightBadge?: string
  trailing?: ReactNode
  onClick?: () => void
}) {
  return (
    <Card
      className={cn(
        "bg-surface py-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:bg-neutral-100",
        onClick ? "cursor-pointer" : "",
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          {subtitle ? <p className="text-muted-foreground mt-1 text-xs">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {rightBadge ? (
            <Badge className={getTagClassName(getListRowStatusColor(rightBadge))}>{rightBadge}</Badge>
          ) : null}
          {trailing}
        </div>
      </CardContent>
    </Card>
  )
}

export function RapportoDetailPanelEmptyLinkedState({
  icon,
  label,
}: {
  icon: ReactNode
  label: string
}) {
  return (
    <div className="py-8 text-center">
      <div className="text-muted-foreground/35 mx-auto mb-2 flex size-10 items-center justify-center">
        {icon}
      </div>
      <p className="ui-type-meta">{label}</p>
    </div>
  )
}
