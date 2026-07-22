import { CopyIcon, CreditCardIcon, LoaderCircleIcon } from "lucide-react"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatItalianCurrency, formatItalianDateTimeOr } from "@/lib/format-utils"

import { formatHoursValue, PAYROLL_CURRENCY_OPTIONS } from "../lib"
import type { CedolinoDetailPagamentoProps } from "../types"
import { PayrollOverviewImportoScontoField } from "./payroll-overview-importo-sconto-field"

export function PayrollOverviewCedolinoDetailPagamento({
  card,
  derived,
  runningAutomationId,
  onPatchCard,
  onCopyMakeTransactionUrl,
  onRunPagamentoAutomation,
}: CedolinoDetailPagamentoProps) {
  const { pagamento, transazione } = derived

  return (
    <DetailSectionBlock
      title="Pagamento"
      icon={<CreditCardIcon className="text-muted-foreground size-5" />}
      contentClassName="space-y-5"
    >
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <p className="ui-type-label">Totale ore da pagare</p>
            <p className="font-medium">{formatHoursValue(derived.hoursToPay)}</p>
          </div>
          <div className="space-y-2">
            <p className="ui-type-label">Fee concordata</p>
            <p className="font-medium">
              {formatItalianCurrency(derived.feeConcordata, PAYROLL_CURRENCY_OPTIONS)}
            </p>
          </div>
          <div className="space-y-2">
            <p className="ui-type-label">Application fee</p>
            <p className="font-medium">
              {formatItalianCurrency(derived.applicationFee, PAYROLL_CURRENCY_OPTIONS)}
            </p>
          </div>
          <div className="space-y-2">
            <p className="ui-type-label">Importo cedolino</p>
            <p className="font-medium">
              {formatItalianCurrency(derived.paymentAmount, PAYROLL_CURRENCY_OPTIONS)}
            </p>
          </div>
          <div className="space-y-2">
            <p className="ui-type-label">Importo sconto</p>
            <PayrollOverviewImportoScontoField
              value={card.record.importo_sconto_mese ?? null}
              max={derived.importoScontoMax}
              onCommit={async (next) => {
                await onPatchCard(card.id, { importo_sconto_mese: next })
              }}
            />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="ui-type-label">Transazione</p>
            <Button
              type="button"
              variant="outline"
              disabled={!derived.makeTransactionUrl}
              onClick={() => void onCopyMakeTransactionUrl()}
            >
              <CopyIcon />
              Copia link pagamento
            </Button>
          </div>
          <div className="space-y-2">
            <p className="ui-type-label">Stato pagamento</p>
            <Badge variant="secondary" className="w-fit rounded-full px-3">
              {derived.paymentStatus}
            </Badge>
          </div>
          <div className="space-y-2">
            <p className="ui-type-label">Tipo pagamento</p>
            <p className="font-medium">{pagamento?.type_of_payment ?? "Non ancora disponibile"}</p>
          </div>
          <div className="space-y-2">
            <p className="ui-type-label">Data pagamento</p>
            <p className="font-medium">
              {pagamento?.data_ora_di_pagamento
                ? formatItalianDateTimeOr(pagamento.data_ora_di_pagamento, "Non disponibile")
                : "Non ancora pagato"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {pagamento ? (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" disabled={runningAutomationId !== null}>
                    {runningAutomationId === "finance-request-invoice-data" ? (
                      <LoaderCircleIcon className="animate-spin" />
                    ) : null}
                    Chiedi dati
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogTitle>Inviare richiesta dati fatturazione?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Partira il workflow automatico per chiedere alla famiglia i dati di
                    fatturazione.
                  </AlertDialogDescription>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void onRunPagamentoAutomation("finance-request-invoice-data")}
                    >
                      Conferma
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" disabled={runningAutomationId !== null}>
                    {runningAutomationId === "finance-invoice-payment" ? (
                      <LoaderCircleIcon className="animate-spin" />
                    ) : null}
                    Fatturare
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogTitle>Avviare fatturazione?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Partira il workflow automatico di fatturazione per questo pagamento.
                  </AlertDialogDescription>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void onRunPagamentoAutomation("finance-invoice-payment")}
                    >
                      Conferma
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : null}
        </div>

        {!pagamento && transazione ? (
          <p className="text-sm text-muted-foreground">
            Transazione collegata: pagamento Stripe non ancora registrato.
          </p>
        ) : null}

        {!pagamento && !transazione ? (
          <p className="text-sm text-muted-foreground">
            Nessuna transazione o pagamento collegato: importo mostrato dal cedolino.
          </p>
        ) : null}
      </div>
    </DetailSectionBlock>
  )
}
