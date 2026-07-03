import { CircleDollarSignIcon, RefreshCwIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Badge tipo contratto: Abbonamento (verde) vs Baze Pay (blu).
 *
 * Regola canonica (BAZ-36, `learning/abbonamento-vs-baze-pay`): un rapporto è
 * Baze Pay ⇔ ha una richiesta_attivazione collegata
 * (`rapporti_lavorativi.richiesta_attivazione_id IS NOT NULL`); altrimenti è
 * un Abbonamento. I call site derivano `isAbbonamento` dal proprio segnale già
 * presente (`richiesta_attivazione_id == null` ⇒ Abbonamento).
 */
export function TipoContrattoBadge({
  isAbbonamento,
  className,
}: {
  isAbbonamento: boolean;
  className?: string;
}) {
  if (isAbbonamento) {
    return (
      <Badge
        className={cn(
          "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
          className,
        )}
      >
        <RefreshCwIcon />
        Abbonamento
      </Badge>
    );
  }

  return (
    <Badge
      className={cn("bg-blue-100 text-blue-700 hover:bg-blue-100", className)}
    >
      <CircleDollarSignIcon />
      Baze Pay
    </Badge>
  );
}
