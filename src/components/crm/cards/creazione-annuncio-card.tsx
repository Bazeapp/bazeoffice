import * as React from "react";
import type { ReactNode } from "react";
import {
  CopyIcon,
  LoaderCircleIcon,
  WandSparklesIcon,
} from "lucide-react";
import { toast } from "sonner";

import { CrmDetailCard } from "@/components/crm/detail-card";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { runAutomationWebhook } from "@/lib/anagrafiche-api";

const READONLY_BLOCK_CLASS =
  "rounded-md bg-muted/60 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words";
const WHATSAPP_TEXT = `**Offerta di Lavoro - Colf Part-Time a Milano**

🕒 **Orario**: Lun-Ven, 9:00-13:00 o 10:00-14:00 (20h/settimana)
💰 **Retribuzione**: 9€/ora netti, con contratto
📍 **Luogo**: Arco della Pace, Milano

Mansioni: pulizie, pasti, lavanderia, stiro. Famiglia con 2 adulti, 2 ragazze e 2 gatti.

Pensi di essere la persona giusta? Candidati qui sotto
https://go.Bazeapp.com/HBT`;

export function CreazioneAnnuncioCard({
  titleAction,
  containerProps,
  processId,
  title = "Creazione Annuncio",
  brief,
  briefOnly = false,
  collapsible = true,
  defaultOpen = true,
}: {
  titleAction?: ReactNode;
  containerProps?: React.ComponentProps<"div">;
  processId?: string | null;
  title?: string;
  brief?: string | null;
  briefOnly?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isGenerated, setIsGenerated] = React.useState(true);
  const [isGeneratingSeo, setIsGeneratingSeo] = React.useState(false);
  const normalizedBrief = brief?.trim() || "";

  const handleGenerate = React.useCallback(() => {
    setIsGenerating(true);
    window.setTimeout(() => {
      setIsGenerating(false);
      setIsGenerated(true);
    }, 1200);
  }, []);

  const handleGenerateSeo = React.useCallback(async () => {
    if (!processId) {
      toast.error("Il processo non ha un id associato");
      return;
    }

    setIsGeneratingSeo(true);
    try {
      await runAutomationWebhook("workflow-create-job-offer-seo", processId);
      toast.success("Workflow SEO e slug avviato");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Errore avvio workflow SEO e slug",
      );
    } finally {
      setIsGeneratingSeo(false);
    }
  }, [processId]);

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
        title={title}
        titleAction={briefOnly ? undefined : titleAction}
        collapsible={collapsible}
        defaultOpen={defaultOpen}
      >
        <FieldGroup>
          {!briefOnly ? (
            <div className="rounded-lg border p-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Workflow annuncio</p>
                    <p className="text-muted-foreground text-sm">
                      Un solo step per generare annuncio e testo WhatsApp finale.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={isGenerating}
                    onClick={handleGenerate}
                  >
                    {isGenerating ? (
                      <LoaderCircleIcon className="animate-spin" />
                    ) : (
                      <WandSparklesIcon />
                    )}
                    {isGenerating ? "Creazione in corso..." : "Crea annuncio"}
                  </Button>
                </div>

                <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">SEO e slug Webflow</p>
                    <p className="text-muted-foreground text-sm">
                      Genera titolo SEO, descrizione SEO e slug della job offer.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={isGeneratingSeo}
                    onClick={() => void handleGenerateSeo()}
                  >
                    {isGeneratingSeo ? (
                      <LoaderCircleIcon className="animate-spin" />
                    ) : (
                      <WandSparklesIcon />
                    )}
                    {isGeneratingSeo ? "Generazione in corso..." : "Crea SEO e slug"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <Field>
            <FieldLabel htmlFor="onboarding-testo-whatsapp">Testo per whatsapp</FieldLabel>
            <FieldDescription>
              Compare solo l’output finale pronto da copiare e inviare ai lavoratori.
            </FieldDescription>
            {briefOnly ? (
              <div className="mb-2 flex justify-end">
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
              </div>
            ) : null}
            <div
              id="onboarding-testo-whatsapp"
              className="rounded-md border bg-[#efeae2] p-3 dark:bg-muted/40"
            >
              {briefOnly ? (
                <div className="ml-auto max-w-[92%] rounded-xl rounded-br-sm border border-emerald-200 bg-emerald-100/80 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap text-foreground shadow-sm">
                  {normalizedBrief || "Nessun brief disponibile."}
                </div>
              ) : isGenerated ? (
                <div className="ml-auto max-w-[92%] rounded-xl rounded-br-sm border border-emerald-200 bg-emerald-100/80 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap text-foreground shadow-sm">
                  {WHATSAPP_TEXT}
                </div>
              ) : (
                <div className={READONLY_BLOCK_CLASS}>
                  Nessun testo generato.
                </div>
              )}
            </div>
          </Field>
        </FieldGroup>
      </CrmDetailCard>
    </div>
  );
}
