import { BadgeCheckIcon } from "lucide-react"

import { FieldInput, FieldSelect } from "@/components/forms/field-components"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

import {
  EMPTY_PRESENCE_SELECT_VALUE,
  getDayTypeLabel,
  getPresenceRegolariHours,
  getWeekdayLetter,
  PRESENCE_EVENT_OPTIONS,
  PRESENCE_SELECT_TRIGGER_CLASS,
  withCurrentPresenceOption,
} from "../lib"
import type { CedolinoDetailPresenzeProps } from "../types"
import { PayrollOverviewPresenceBadge } from "./payroll-overview-presence-badge"

export function PayrollOverviewCedolinoDetailPresenze({
  card,
  rapporto,
  presenceRows,
  lastWorkingDay,
  isRegularPresence,
}: CedolinoDetailPresenzeProps) {
  return (
    <DetailSectionBlock
      title="Presenze"
      icon={<BadgeCheckIcon className="text-muted-foreground size-5" />}
      contentClassName="space-y-5"
    >
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="ui-type-label">Presenze regolari?</span>
          <PayrollOverviewPresenceBadge isRegular={isRegularPresence} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="ui-type-label">Distribuzione ore settimanali</span>
          <span className="font-mono text-sm">{rapporto?.distribuzione_ore_settimana ?? "—"}</span>
        </div>
      </div>

      {presenceRows.length > 0 ? (
        <div className="rounded-xl border bg-surface">
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">G.</TableHead>
                  <TableHead className="w-10">GG</TableHead>
                  <TableHead className="w-28">Tipo</TableHead>
                  <TableHead className="w-16">Ore</TableHead>
                  <TableHead className="w-16">Ore r.</TableHead>
                  <TableHead className="min-w-40">Evento</TableHead>
                  <TableHead className="w-20">PNR</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {presenceRows.map((row) => (
                  <TableRow
                    key={row.day}
                    className={cn(
                      row.day === lastWorkingDay &&
                        "bg-orange-100 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-950/40",
                    )}
                    title={row.day === lastWorkingDay ? "Ultimo giorno di rapporto" : undefined}
                  >
                    <TableCell className="font-mono text-xs">{row.day}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {getWeekdayLetter(card.mese?.data_inizio, row.day)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {getDayTypeLabel(row.type) || "—"}
                    </TableCell>
                    <TableCell>
                      <FieldInput
                        name={`ore_day_${row.day}`}
                        className="h-8 w-20"
                        placeholder="Ore"
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {getPresenceRegolariHours(card.presenzeRegolari, row.day) || "—"}
                    </TableCell>
                    <TableCell>
                      <FieldSelect
                        name={`evento_day_${row.day}`}
                        placeholder="Evento"
                        triggerClassName={cn(PRESENCE_SELECT_TRIGGER_CLASS, "w-56")}
                        options={[
                          { value: EMPTY_PRESENCE_SELECT_VALUE, label: "Nessuno" },
                          ...withCurrentPresenceOption(PRESENCE_EVENT_OPTIONS, row.event),
                        ]}
                      />
                    </TableCell>
                    <TableCell>
                      <FieldInput
                        name={`codice_malattia_day_${row.day}`}
                        className="h-8 w-24"
                        placeholder="PNR"
                      />
                    </TableCell>
                    <TableCell className="min-w-72">
                      <FieldInput name={`note_day_${row.day}`} className="h-8" placeholder="Note" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nessuna presenza collegata a questo mese lavorato.
        </p>
      )}
    </DetailSectionBlock>
  )
}
