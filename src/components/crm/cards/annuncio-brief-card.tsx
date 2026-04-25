import * as React from "react";
import { CopyIcon } from "lucide-react";
import { toast } from "sonner";

import { CrmDetailCard } from "@/components/crm/detail-card";
import { Button } from "@/components/ui-next/button";

const READONLY_BLOCK_CLASS =
  "rounded-md border bg-muted/40 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words";

export function AnnuncioBriefCard({
  brief,
  containerProps,
}: {
  brief: string | null | undefined;
  containerProps?: React.ComponentProps<"div">;
}) {
  const normalizedBrief = brief?.trim() || "";

  const handleCopy = React.useCallback(async () => {
    if (!normalizedBrief) return;
    try {
      await navigator.clipboard.writeText(normalizedBrief);
      toast.success("Brief copiato");
    } catch {
      toast.error("Impossibile copiare il brief");
    }
  }, [normalizedBrief]);

  return (
    <div {...containerProps}>
      <CrmDetailCard
        title="Annuncio"
        titleAction={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!normalizedBrief}
            onClick={() => void handleCopy()}
          >
            <CopyIcon className="size-4" />
            Copia
          </Button>
        }
      >
        <div className={READONLY_BLOCK_CLASS}>
          {normalizedBrief || "Nessun brief disponibile."}
        </div>
      </CrmDetailCard>
    </div>
  );
}
