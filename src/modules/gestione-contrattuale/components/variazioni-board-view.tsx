import * as React from "react";
import {
  CalendarDaysIcon,
  CalendarIcon,
  FileTextIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react";

import type {
  VariazioniBoardCardData,
  VariazioniBoardColumnData,
  VariazioniRapportoOption,
} from "../types";
import { useVariazioniBoard } from "../hooks/use-variazioni-board";
import { AttachmentUploadSlot } from "@/components/shared-next/attachment-upload-slot";
import type { AttachmentLink } from "@/components/shared-next/attachment-utils";
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card";
import {
  KanbanColumnShell,
  KanbanColumnSkeleton,
  type KanbanColumnVisual,
} from "@/components/shared-next/kanban";
import { LinkedRapportoSummaryCard } from "@/components/shared-next/linked-rapporto-summary-card";
import { RecordCard } from "@/components/shared-next/record-card";
import { SectionHeader } from "@/components/shared-next/section-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form } from "@/components/ui/form";
import { FieldInput, FieldTextarea } from "@/components/forms/field-components";
import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
import { useController } from "react-hook-form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchVariazioniByIds,
} from "../queries/fetch-variazioni-by-ids";
import { updateRecord } from "@/lib/record-crud"
import { fetchRapportiLavorativiByIds } from "@/modules/rapporti/queries"
import { buildAttachmentPayload, normalizeAttachmentArray } from "@/lib/attachments";
import { matchesSearchQuery } from "@/lib/search-utils";
import { supabase } from "@/lib/supabase-client";
import { cn } from "@/lib/utils";

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function toDateInputValue(value: string | null | undefined) {
  return value?.slice(0, 10) ?? "";
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "";
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value);
}

type AnagraficaField = {
  key: string;
  label: string;
  placeholder?: string;
  readOnly?: boolean;
};

function toDisplayValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function sanitizeFileName(name: string) {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "documento";
}

type VariazioneAttachmentSlot =
  | "accordo_variazione_contrattuale"
  | "ricevuta_inps_variazione_rapporto";

const VARIAZIONE_WORKER_FIELDS: AnagraficaField[] = [
  { key: "email", label: "Email", placeholder: "email@dominio.it" },
  { key: "telefono", label: "Telefono", placeholder: "+39..." },
  { key: "iban", label: "IBAN" },
  { key: "indirizzo_residenza_completo", label: "Indirizzo residenza", readOnly: true },
  { key: "cap", label: "CAP", readOnly: true },
  { key: "provincia", label: "Provincia" },
  { key: "documenti_in_regola", label: "Documenti in regola" },
  { key: "docs_scadenza_permesso_di_soggiorno", label: "Scadenza permesso" },
];

const VARIAZIONE_FAMILY_FIELDS: AnagraficaField[] = [
  { key: "email", label: "Email", placeholder: "email@dominio.it" },
  { key: "customer_email", label: "Email cliente" },
  { key: "secondary_email", label: "Email secondaria" },
  { key: "telefono", label: "Telefono" },
  { key: "whatsapp", label: "WhatsApp" },
];

function EditableAnagraficaSection({
  title,
  table,
  row,
  fields,
  onRowChange,
}: {
  title: string;
  table: "lavoratori" | "famiglie";
  row: Record<string, unknown> | null;
  fields: AnagraficaField[];
  onRowChange: (row: Record<string, unknown>) => void;
}) {
  const rowId = toDisplayValue(row?.id);
  const [isEditing, setIsEditing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const previousRowIdRef = React.useRef(rowId);
  const latestRowRef = React.useRef(row);

  React.useEffect(() => {
    latestRowRef.current = row;
  }, [row]);

  React.useEffect(() => {
    const isDifferentRow = previousRowIdRef.current !== rowId;
    previousRowIdRef.current = rowId;
    if (isDifferentRow) {
      setIsEditing(false);
      setError(null);
    }
  }, [rowId]);

  // FASE 5 BIS — form + autosave per i campi anagrafici editabili. onSave
  // instrada ogni chiave cambiata a updateRecord(table, rowId, …) con ""→null,
  // mergiando la risposta via onRowChange (optimistic local-merge originale).
  // L'errore resta inline (setError), non toast.
  const form = useAutoSaveForm({
    defaults: Object.fromEntries(
      fields
        .filter((field) => !field.readOnly)
        .map((field) => [field.key, toDisplayValue(row?.[field.key])]),
    ) as Record<string, string>,
    onSave: async (patch) => {
      if (!rowId) return;
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(patch)) {
        out[key] = (value as string).trim() || null;
      }
      if (Object.keys(out).length === 0) return;
      setError(null);
      try {
        const response = await updateRecord(table, rowId, out);
        onRowChange({
          ...(latestRowRef.current ?? row ?? {}),
          ...response.row,
        });
      } catch (caughtError) {
        setError(
          caughtError instanceof Error ? caughtError.message : `Errore salvando ${title}`,
        );
      }
    },
  });

  return (
    <Form {...form}>
    <DetailSectionBlock
      title={title}
      icon={<PencilIcon className="size-4" />}
      action={
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setIsEditing((current) => !current)}
          aria-label={`Modifica ${title.toLowerCase()}`}
          disabled={!rowId}
        >
          <PencilIcon className="size-4" />
        </button>
      }
      contentClassName="space-y-4"
    >
      {rowId ? (
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <label key={field.key} className="space-y-2">
              <span className="ui-type-label">{field.label}</span>
              {isEditing && !field.readOnly ? (
                <FieldInput name={field.key} placeholder={field.placeholder} />
              ) : (
                <p className="min-h-9 rounded-md bg-muted/50 px-3 py-2 text-sm">
                  {toDisplayValue(row?.[field.key]) || "-"}
                </p>
              )}
            </label>
          ))}
          {error ? (
            <p className="text-xs font-medium text-red-600 md:col-span-2">{error}</p>
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Anagrafica non collegata.</p>
      )}
    </DetailSectionBlock>
    </Form>
  );
}

const TIPO_CONTRATTO_OPTIONS = ["A", "B", "BS", "C", "CS", "D", "DS"];

// FASE 5 BIS — wrapper locale per il select "Tipo contratto" agganciato al form.
function FieldTipoContrattoSelect({ name }: { name: string }) {
  const { field } = useController({ name });
  const current = typeof field.value === "string" ? field.value : "";
  return (
    <Select value={current || undefined} onValueChange={field.onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Seleziona tipo contratto" />
      </SelectTrigger>
      <SelectContent>
        {TIPO_CONTRATTO_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function VariazioniDetailSheet({
  card,
  open,
  onOpenChange,
  onCardChange,
}: {
  card: VariazioniBoardCardData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCardChange: (card: VariazioniBoardCardData) => void;
}) {
  const [editingDetails, setEditingDetails] = React.useState(false);
  const [editingRapporto, setEditingRapporto] = React.useState(false);
  const [detailsError, setDetailsError] = React.useState<string | null>(null);
  const [rapportoError, setRapportoError] = React.useState<string | null>(null);
  const [uploadingSlot, setUploadingSlot] = React.useState<VariazioneAttachmentSlot | null>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const previousCardIdRef = React.useRef<string | null>(card?.id ?? null);
  const latestCardRef = React.useRef<VariazioniBoardCardData | null>(card);

  React.useEffect(() => {
    latestCardRef.current = card;
  }, [card]);

  const applyCardChange = React.useCallback(
    (nextCard: VariazioniBoardCardData) => {
      latestCardRef.current = nextCard;
      onCardChange(nextCard);
    },
    [onCardChange],
  );

  React.useEffect(() => {
    const nextCardId = card?.id ?? null;
    const isDifferentCard = previousCardIdRef.current !== nextCardId;
    previousCardIdRef.current = nextCardId;

    if (isDifferentCard) {
      setEditingDetails(false);
      setEditingRapporto(false);
      setDetailsError(null);
      setRapportoError(null);
      setUploadError(null);
    }
  }, [card?.id]);

  async function saveDetailsPatch(patch: Record<string, unknown>) {
    const currentCard = latestCardRef.current ?? card;
    if (!currentCard || Object.keys(patch).length === 0) return;

    setDetailsError(null);

    try {
      const response = await updateRecord("variazioni_contrattuali", currentCard.id, patch);
      const baseCard = latestCardRef.current ?? currentCard;
      const nextRecord = {
        ...baseCard.record,
        ...response.row,
      } as VariazioniBoardCardData["record"];

      applyCardChange({
        ...baseCard,
        record: nextRecord,
        dataVariazione: formatDate(nextRecord.data_variazione),
        variazioneDaApplicare: nextRecord.variazione_da_applicare,
      });
    } catch (caughtError) {
      setDetailsError(
        caughtError instanceof Error ? caughtError.message : "Errore salvando variazione",
      );
      throw caughtError;
    }
  }

  async function saveRapportoPatch(patch: Record<string, unknown>) {
    const currentCard = latestCardRef.current ?? card;
    if (!currentCard?.rapporto?.id || Object.keys(patch).length === 0) return;

    setRapportoError(null);

    try {
      const response = await updateRecord("rapporti_lavorativi", currentCard.rapporto.id, patch);
      const baseCard = latestCardRef.current ?? currentCard;
      const baseRapporto = baseCard.rapporto ?? currentCard.rapporto;
      applyCardChange({
        ...baseCard,
        rapporto: {
          ...baseRapporto,
          ...response.row,
        } as VariazioniBoardCardData["rapporto"],
      });
    } catch (caughtError) {
      setRapportoError(
        caughtError instanceof Error ? caughtError.message : "Errore salvando rapporto",
      );
      throw caughtError;
    }
  }

  // FASE 5 BIS — form + autosave: sostituisce i DebouncedInput/DebouncedTextarea
  // cablati a mano e i draft+effect di resync. onSave instrada per chiave ai due
  // target originali: i campi del record variazione → saveDetailsPatch
  // (variazioni_contrattuali), i campi rapporto → saveRapportoPatch
  // (rapporti_lavorativi), con le stesse trasformazioni (date ||null, numerici
  // Number(v)||null, ""→null). Gli errori restano inline (detailsError /
  // rapportoError); i throw evitano che il dirty-tracking marchi come committato
  // un valore non salvato.
  const DETAILS_KEYS = new Set([
    "data_variazione",
    "variazione_da_applicare",
  ]);
  const NUMERIC_RAPPORTO_KEYS = new Set([
    "paga_oraria_lorda",
    "ore_a_settimana",
  ]);
  const form = useAutoSaveForm({
    defaults: {
      data_variazione: toDateInputValue(card?.record.data_variazione),
      variazione_da_applicare: card?.record.variazione_da_applicare ?? "",
      paga_oraria_lorda:
        card?.rapporto?.paga_oraria_lorda != null
          ? String(card.rapporto.paga_oraria_lorda)
          : "",
      ore_a_settimana:
        card?.rapporto?.ore_a_settimana != null
          ? String(card.rapporto.ore_a_settimana)
          : "",
      tipo_rapporto: card?.rapporto?.tipo_rapporto ?? "",
      tipo_contratto: card?.rapporto?.tipo_contratto ?? "",
      distribuzione_ore_settimana: card?.rapporto?.distribuzione_ore_settimana ?? "",
    },
    onSave: async (patch) => {
      if (!card) return;
      const detailsPatch: Record<string, unknown> = {};
      const rapportoPatch: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(patch)) {
        if (DETAILS_KEYS.has(key)) {
          detailsPatch[key] = (value as string) || null;
        } else if (NUMERIC_RAPPORTO_KEYS.has(key)) {
          rapportoPatch[key] = value ? Number(value as string) : null;
        } else {
          rapportoPatch[key] = (value as string) || null;
        }
      }
      if (Object.keys(detailsPatch).length > 0) await saveDetailsPatch(detailsPatch);
      if (Object.keys(rapportoPatch).length > 0) await saveRapportoPatch(rapportoPatch);
    },
  });

  async function handleUploadAttachment(slot: VariazioneAttachmentSlot, file: File) {
    const currentCard = latestCardRef.current ?? card;
    if (!currentCard) return;

    setUploadingSlot(slot);
    setUploadError(null);

    try {
      const safeName = sanitizeFileName(file.name || "documento");
      const storagePath = [
        "variazioni_contrattuali",
        currentCard.id,
        slot,
        `${Date.now()}-${safeName}`,
      ].join("/");

      const uploadResult = await supabase.storage.from("baze-bucket").upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });

      if (uploadResult.error) {
        throw uploadResult.error;
      }

      const payload = buildAttachmentPayload(file, storagePath);
      const baseCard = latestCardRef.current ?? currentCard;
      const response = await updateRecord("variazioni_contrattuali", currentCard.id, {
        [slot]: [...normalizeAttachmentArray(baseCard.record[slot]), payload],
      });
      const nextRecord = {
        ...baseCard.record,
        ...response.row,
      } as VariazioniBoardCardData["record"];

      applyCardChange({
        ...baseCard,
        record: nextRecord,
      });
    } catch (caughtError) {
      setUploadError(
        caughtError instanceof Error ? caughtError.message : "Errore caricando documento",
      );
    } finally {
      setUploadingSlot(null);
    }
  }

  async function handleRemoveAttachment(slot: VariazioneAttachmentSlot, link: AttachmentLink) {
    const currentCard = latestCardRef.current ?? card;
    if (!currentCard) return;

    setUploadingSlot(slot);
    setUploadError(null);

    try {
      const nextValue = normalizeAttachmentArray(currentCard.record[slot]).filter(
        (a) => !(link.path && a.path === link.path) && a.name !== link.label,
      );

      if (link.path?.startsWith("baze-bucket/")) {
        await supabase.storage
          .from("baze-bucket")
          .remove([link.path.replace(/^baze-bucket\//, "")]);
      }

      const baseCard = latestCardRef.current ?? currentCard;
      const response = await updateRecord("variazioni_contrattuali", currentCard.id, {
        [slot]: nextValue.length > 0 ? nextValue : null,
      });

      applyCardChange({
        ...baseCard,
        record: { ...baseCard.record, ...response.row } as VariazioniBoardCardData["record"],
      });
    } catch (caughtError) {
      setUploadError(
        caughtError instanceof Error ? caughtError.message : "Errore rimuovendo allegato",
      );
    } finally {
      setUploadingSlot(null);
    }
  }

  function openAttachmentPreview(link: AttachmentLink) {
    window.open(link.url, "_blank", "noopener,noreferrer");
  }

  return (
    <Form {...form}>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[min(96vw,980px)]! max-w-none! p-0 sm:max-w-none"
      >
        <SheetHeader className="border-b bg-surface px-5 py-5">
          <div className="space-y-2">
            <SheetTitle className="truncate text-xl font-semibold">
              {card?.nomeCompleto ?? "Dettaglio variazione"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Dettaglio pratica di variazione contrattuale con dati del rapporto
              e documenti.
            </SheetDescription>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="flex items-center gap-1.5">
                <CalendarDaysIcon className="size-4" />
                {formatDate(card?.record.data_variazione)}
              </span>
            </div>
          </div>
        </SheetHeader>

        {card ? (
          <section className="h-full overflow-y-auto bg-surface-muted px-5 py-5">
            <div className="mx-auto max-w-5xl space-y-5">
              <LinkedRapportoSummaryCard title={card.nomeCompleto} rapporto={card.rapporto} />

              <EditableAnagraficaSection
                title="Dati lavoratore"
                table="lavoratori"
                row={card.lavoratore}
                fields={VARIAZIONE_WORKER_FIELDS}
                onRowChange={(nextLavoratore) => {
                  const baseCard = latestCardRef.current ?? card;
                  if (!baseCard) return;
                  applyCardChange({
                    ...baseCard,
                    lavoratore: nextLavoratore,
                  });
                }}
              />

              <EditableAnagraficaSection
                title="Dati famiglia"
                table="famiglie"
                row={card.famiglia}
                fields={VARIAZIONE_FAMILY_FIELDS}
                onRowChange={(nextFamiglia) => {
                  const baseCard = latestCardRef.current ?? card;
                  if (!baseCard) return;
                  applyCardChange({
                    ...baseCard,
                    famiglia: nextFamiglia,
                  });
                }}
              />

              <DetailSectionBlock
                title="Dettagli variazione"
                icon={<CalendarDaysIcon className="size-4" />}
                action={
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingDetails((current) => !current)}
                    aria-label="Modifica dettagli variazione"
                  >
                    <PencilIcon className="size-4" />
                  </button>
                }
                contentClassName="space-y-5"
              >
                {editingDetails ? (
                  <div className="grid gap-4">
                    <label className="space-y-2">
                      <span className="ui-type-label">Data di partenza</span>
                      <FieldInput name="data_variazione" type="date" />
                    </label>
                    <label className="space-y-2">
                      <span className="ui-type-label">Variazione da applicare</span>
                      <FieldTextarea name="variazione_da_applicare" />
                    </label>
                    {detailsError ? (
                      <p className="text-xs font-medium text-red-600">{detailsError}</p>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm sm:text-base">
                      <CalendarDaysIcon className="text-muted-foreground size-5 shrink-0" />
                      <span className="text-muted-foreground">
                        Data di partenza:
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatDate(card.record.data_variazione)}
                      </span>
                    </div>

                    <div className="border-t border-border/70 pt-5 text-sm sm:text-base">
                      <span className="text-muted-foreground">
                        Variazione da applicare:
                      </span>{" "}
                      <span className="font-medium text-foreground">
                        {card.variazioneDaApplicare ?? "-"}
                      </span>
                    </div>
                  </>
                )}
              </DetailSectionBlock>

              <DetailSectionBlock
                title="Dati rapporto lavorativo"
                icon={<PencilIcon className="size-4" />}
                action={
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingRapporto((current) => !current)}
                    aria-label="Modifica dati rapporto lavorativo"
                  >
                    <PencilIcon className="size-4" />
                  </button>
                }
                contentClassName="space-y-5"
              >
                <div className="grid gap-5 text-sm sm:text-base">
                  {editingRapporto ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="ui-type-label">Paga oraria lorda</span>
                        <FieldInput name="paga_oraria_lorda" type="number" step="0.01" />
                      </label>
                      <label className="space-y-2">
                        <span className="ui-type-label">Ore settimanali</span>
                        <FieldInput name="ore_a_settimana" type="number" step="0.5" />
                      </label>
                      <label className="space-y-2">
                        <span className="ui-type-label">Tipo rapporto</span>
                        <FieldInput name="tipo_rapporto" />
                      </label>
                      <label className="space-y-2">
                        <span className="ui-type-label">Tipo contratto</span>
                        <FieldTipoContrattoSelect name="tipo_contratto" />
                      </label>
                      <label className="space-y-2 md:col-span-2">
                        <span className="ui-type-label">Distribuzione ore settimanali</span>
                        <p className="ui-type-meta">Parte da domenica</p>
                        <FieldInput
                          name="distribuzione_ore_settimana"
                          placeholder="0-0-0-0-0-0-0"
                        />
                      </label>
                      {rapportoError ? (
                        <p className="text-xs font-medium text-red-600 md:col-span-2">
                          {rapportoError}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <p>
                        <span className="text-muted-foreground">
                          Paga oraria lorda:
                        </span>{" "}
                        <span className="font-medium text-foreground">
                          {formatCurrency(card.rapporto?.paga_oraria_lorda)}
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          Ore settimanali:
                        </span>{" "}
                        <span className="font-medium text-foreground">
                          {card.rapporto?.ore_a_settimana}
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          Tipo rapporto:
                        </span>{" "}
                        <span className="font-medium text-foreground">
                          {card.rapporto?.tipo_rapporto}
                        </span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">
                          Tipo contratto:
                        </span>{" "}
                        <span className="font-medium text-foreground">
                          {card.rapporto?.tipo_contratto}
                        </span>
                      </p>
                    </>
                  )}
                  {!editingRapporto ? (
                    <div className="space-y-1">
                      <p>
                        <span className="text-muted-foreground">Distribuzione ore settimanali:</span>{" "}
                        <span className="font-medium text-foreground">
                          {card.rapporto?.distribuzione_ore_settimana ?? "-"}
                        </span>
                      </p>
                      <p className="ui-type-meta">Parte da domenica</p>
                    </div>
                  ) : null}
                </div>
              </DetailSectionBlock>

              <DetailSectionBlock
                title="Documenti variazione"
                icon={<FileTextIcon className="size-4" />}
                contentClassName="space-y-4"
              >
                <AttachmentUploadSlot
                  label="Accordo Variazione"
                  value={card.record.accordo_variazione_contrattuale ?? null}
                  onAdd={(file) => handleUploadAttachment("accordo_variazione_contrattuale", file)}
                  onRemove={(link) => void handleRemoveAttachment("accordo_variazione_contrattuale", link)}
                  onPreviewOpen={openAttachmentPreview}
                  isUploading={uploadingSlot === "accordo_variazione_contrattuale"}
                />
                <AttachmentUploadSlot
                  label="Ricevuta INPS Variazione"
                  value={card.record.ricevuta_inps_variazione_rapporto ?? null}
                  onAdd={(file) => handleUploadAttachment("ricevuta_inps_variazione_rapporto", file)}
                  onRemove={(link) => void handleRemoveAttachment("ricevuta_inps_variazione_rapporto", link)}
                  onPreviewOpen={openAttachmentPreview}
                  isUploading={uploadingSlot === "ricevuta_inps_variazione_rapporto"}
                />
                {uploadError ? (
                  <p className="text-xs font-medium text-red-600">{uploadError}</p>
                ) : null}
              </DetailSectionBlock>
            </div>
          </section>
        ) : (
          <DetailSheetSkeleton />
        )}
      </SheetContent>
    </Sheet>
    </Form>
  );
}

function DetailSheetSkeleton() {
  return (
    <section className="h-full overflow-y-auto bg-surface-muted px-5 py-5">
      <div className="mx-auto max-w-5xl space-y-5">
        <Skeleton className="h-24 rounded-lg" />
        <div className="rounded-lg border bg-surface p-4">
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function getColumnVisual(color: string): KanbanColumnVisual {
  switch (color.toLowerCase()) {
    case "sky":
      return { columnClassName: "bg-sky-400", headerClassName: "", iconClassName: "text-sky-500" };
    case "cyan":
      return { columnClassName: "bg-cyan-400", headerClassName: "", iconClassName: "text-cyan-500" };
    case "teal":
      return { columnClassName: "bg-teal-400", headerClassName: "", iconClassName: "text-teal-500" };
    default:
      return { columnClassName: "", headerClassName: "", iconClassName: "text-muted-foreground/80" };
  }
}

function VariazioniBoardCard({
  card,
  dragging,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  card: VariazioniBoardCardData;
  dragging: boolean;
  onOpen: () => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={cn(
        "cursor-grab transition-opacity active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <RecordCard>
        <RecordCard.Header title={card.nomeCompleto} />
        <RecordCard.Body>
          {card.variazioneDaApplicare ? (
            <div>
              <Badge variant="secondary">{card.variazioneDaApplicare}</Badge>
            </div>
          ) : null}
          <div className="text-muted-foreground border-t pt-2 text-xs">
            <p className="flex items-center gap-1.5 truncate">
              <CalendarIcon className="size-3.5 shrink-0" />
              <span className="truncate">{card.dataVariazione}</span>
            </p>
          </div>
        </RecordCard.Body>
      </RecordCard>
    </div>
  );
}

function VariazioniBoardColumn({
  column,
  draggingRecordId,
  isDropTarget,
  onOpenCard,
  onDragStartCard,
  onDragEndCard,
  onDragEnterColumn,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropToColumn,
}: {
  column: VariazioniBoardColumnData;
  draggingRecordId: string | null;
  isDropTarget: boolean;
  onOpenCard: (recordId: string) => void;
  onDragStartCard: (recordId: string) => void;
  onDragEndCard: () => void;
  onDragEnterColumn: (columnId: string) => void;
  onDragOverColumn: (columnId: string) => void;
  onDragLeaveColumn: (event: React.DragEvent<HTMLDivElement>) => void;
  onDropToColumn: (columnId: string, recordId: string | null) => void;
}) {
  const visual = getColumnVisual(column.color);

  return (
    <KanbanColumnShell
      columnId={column.id}
      title={column.label}
      countLabel={`${column.cards.length} ${
        column.cards.length === 1 ? "variazione" : "variazioni"
      }`}
      visual={visual}
      isDropTarget={isDropTarget}
      emptyMessage="Nessuna variazione"
      onDragEnter={onDragEnterColumn}
      onDragOver={onDragOverColumn}
      onDragLeave={onDragLeaveColumn}
      onDrop={onDropToColumn}
    >
      {column.cards.map((card) => (
        <VariazioniBoardCard
          key={card.id}
          card={card}
          dragging={draggingRecordId === card.id}
          onOpen={() => onOpenCard(card.id)}
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", card.id);
            event.dataTransfer.effectAllowed = "move";
            onDragStartCard(card.id);
          }}
          onDragEnd={onDragEndCard}
        />
      ))}
    </KanbanColumnShell>
  );
}

function VariazioniBoardSkeletonColumn() {
  return <KanbanColumnSkeleton />;
}

function CreateVariazioneDialog({
  open,
  onOpenChange,
  rapportoOptions,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rapportoOptions: VariazioniRapportoOption[];
  onCreate: (input: {
    rapportoId: string;
    variazioneDaApplicare: string;
    dataVariazione: string;
  }) => Promise<void>;
}) {
  const [query, setQuery] = React.useState("");
  const [selectedRapportoId, setSelectedRapportoId] = React.useState("");
  const [variazioneDaApplicare, setVariazioneDaApplicare] = React.useState("");
  const [dataVariazione, setDataVariazione] = React.useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const filteredOptions = React.useMemo(() => {
    const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return rapportoOptions.slice(0, 20);
    return rapportoOptions
      .filter((option) => {
        const haystack = option.label.toLowerCase();
        return tokens.every((token) => haystack.includes(token));
      })
      .slice(0, 20);
  }, [query, rapportoOptions]);

  const selectedRapporto = rapportoOptions.find((option) => option.id === selectedRapportoId);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedRapportoId("");
      setVariazioneDaApplicare("");
      setDataVariazione(new Date().toISOString().slice(0, 10));
      setError(null);
      setSaving(false);
    }
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRapportoId || !variazioneDaApplicare.trim()) {
      setError("Seleziona un rapporto e inserisci la descrizione della variazione.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onCreate({
        rapportoId: selectedRapportoId,
        variazioneDaApplicare: variazioneDaApplicare.trim(),
        dataVariazione,
      });
      onOpenChange(false);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Errore creando variazione",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Apri una variazione</DialogTitle>
          <DialogDescription>
            Seleziona il rapporto e descrivi la variazione contrattuale da gestire.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="space-y-2 block">
            <span className="ui-type-label">Rapporto di lavoro</span>
            <SearchInput
              placeholder="Cerca per famiglia o lavoratore..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onClear={() => setQuery("")}
            />
          </label>
          <div className="max-h-60 space-y-2 overflow-y-auto rounded-xl border bg-surface p-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    selectedRapportoId === option.id && "bg-primary/10 text-primary",
                  )}
                  onClick={() => setSelectedRapportoId(option.id)}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <p className="text-muted-foreground px-3 py-4 text-sm">
                Nessun rapporto trovato.
              </p>
            )}
          </div>
          {selectedRapporto ? (
            <p className="text-muted-foreground text-xs">
              Selezionato: <span className="font-medium text-foreground">{selectedRapporto.label}</span>
            </p>
          ) : null}
          <label className="space-y-2 block">
            <span className="ui-type-label">Data variazione</span>
            <Input
              type="date"
              value={dataVariazione}
              onChange={(event) => setDataVariazione(event.target.value)}
            />
          </label>
          <label className="space-y-2 block">
            <span className="ui-type-label">Descrizione variazione</span>
            <Textarea
              value={variazioneDaApplicare}
              onChange={(event) => setVariazioneDaApplicare(event.target.value)}
              placeholder="Es. aumento ore, cambio paga, modifica luogo di lavoro..."
              className="min-h-28"
            />
          </label>
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creazione..." : "Crea variazione"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function VariazioniBoardView() {
  const { loading, error, columns, rapportoOptions, createVariazione, moveCard, updateCard } = useVariazioniBoard();
  const [draggingRecordId, setDraggingRecordId] = React.useState<string | null>(
    null,
  );
  const [dropTargetColumnId, setDropTargetColumnId] = React.useState<
    string | null
  >(null);
  const [selectedCardId, setSelectedCardId] = React.useState<string | null>(
    null,
  );
  const [selectedFreshCard, setSelectedFreshCard] =
    React.useState<VariazioniBoardCardData | null>(null);
  const [searchValue, setSearchValue] = React.useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);

  const filteredColumns = React.useMemo(() => {
    const mappedColumns = columns.map((column) => ({
      ...column,
      cards: column.cards.filter((card) => {
        return matchesSearchQuery(
          [
            card.id,
            card.nomeCompleto,
            card.variazioneDaApplicare,
            card.dataVariazione,
            card.famiglia?.nome,
            card.famiglia?.cognome,
            card.famiglia?.email,
            card.famiglia?.telefono,
            card.lavoratore?.nome,
            card.lavoratore?.cognome,
            card.lavoratore?.email,
            card.lavoratore?.telefono,
            card.rapporto?.id,
            card.rapporto?.id_rapporto,
            card.rapporto?.cognome_nome_datore_proper,
            card.rapporto?.nome_lavoratore_per_url,
            card.rapporto?.tipo_rapporto,
            card.rapporto?.tipo_contratto,
          ],
          searchValue,
        );
      }),
    }));

    return mappedColumns;
  }, [columns, searchValue]);

  const totalVariazioni = React.useMemo(
    () => filteredColumns.reduce((sum, column) => sum + column.cards.length, 0),
    [filteredColumns],
  );

  const selectedCardFromColumns = React.useMemo(
    () =>
      columns
        .flatMap((column) => column.cards)
        .find((card) => card.id === selectedCardId) ?? null,
    [columns, selectedCardId],
  );

  React.useEffect(() => {
    if (!selectedCardId) {
      setSelectedFreshCard(null);
      return;
    }
    if (!selectedCardFromColumns) return;

    let isActive = true;
    const currentCardId = selectedCardId;
    const currentCard = selectedCardFromColumns;
    setSelectedFreshCard(null);

    async function loadSelectedCard() {
      try {
        const [recordResponse, rapportoResponse] = await Promise.all([
          fetchVariazioniByIds([currentCardId]),
          currentCard.rapporto?.id
            ? fetchRapportiLavorativiByIds([currentCard.rapporto.id])
            : Promise.resolve({ rows: [], total: 0, columns: [] }),
        ]);

        if (!isActive) return;

        const freshRecord = recordResponse.rows[0];
        if (!freshRecord) return;

        const nextCard: VariazioniBoardCardData = {
          ...currentCard,
          record: freshRecord as VariazioniBoardCardData["record"],
          rapporto:
            (rapportoResponse.rows[0] as VariazioniBoardCardData["rapporto"]) ??
            currentCard.rapporto,
          variazioneDaApplicare:
            (freshRecord as VariazioniBoardCardData["record"]).variazione_da_applicare ??
            currentCard.variazioneDaApplicare,
          dataVariazione: formatDate(
            (freshRecord as VariazioniBoardCardData["record"]).data_variazione,
          ),
        };

        setSelectedFreshCard(nextCard);
        updateCard(currentCardId, () => nextCard);
      } catch (error) {
        if (!isActive) return;
        console.error("Errore caricando dettaglio variazione", error);
      }
    }

    void loadSelectedCard();

    return () => {
      isActive = false;
    };
    // Watching id only on purpose: avoid re-fetching detail on every board refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCardFromColumns?.id, selectedCardId, updateCard]);

  return (
    <>
      <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
        <SectionHeader>
          <SectionHeader.Title
            subtitle={`${totalVariazioni} ${
              totalVariazioni === 1 ? "variazione" : "variazioni"
            }`}
          >
            Variazioni
          </SectionHeader.Title>
          <SectionHeader.Actions>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <PlusIcon className="size-4" />
              Apri una variazione
            </Button>
          </SectionHeader.Actions>
          <SectionHeader.Toolbar>
            <SearchInput
              className="md:max-w-sm"
              placeholder="Cerca per famiglia, lavoratore, tipo rapporto..."
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              onClear={() => setSearchValue("")}
            />
          </SectionHeader.Toolbar>
        </SectionHeader>

        {error ? (
          <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Errore caricamento variazioni: {error}
          </div>
        ) : null}

        <div className="scrollbar-visible min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-4 [scrollbar-gutter:stable]">
          <div className="flex h-full min-h-0 min-w-max gap-4">
            {loading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <VariazioniBoardSkeletonColumn key={index} />
                ))
              : filteredColumns.map((column) => (
                  <VariazioniBoardColumn
                    key={column.id}
                    column={column}
                    draggingRecordId={draggingRecordId}
                    isDropTarget={dropTargetColumnId === column.id}
                    onOpenCard={(cardId) => {
                      setSelectedFreshCard(null);
                      setSelectedCardId(cardId);
                    }}
                    onDragStartCard={setDraggingRecordId}
                    onDragEndCard={() => {
                      window.setTimeout(() => {
                        setDraggingRecordId(null);
                        setDropTargetColumnId(null);
                      }, 0);
                    }}
                    onDragEnterColumn={setDropTargetColumnId}
                    onDragOverColumn={setDropTargetColumnId}
                    onDragLeaveColumn={(event) => {
                      const nextTarget = event.relatedTarget;
                      if (
                        nextTarget instanceof Node &&
                        event.currentTarget.contains(nextTarget)
                      )
                        return;
                      setDropTargetColumnId((current) =>
                        current === column.id ? null : current,
                      );
                    }}
                    onDropToColumn={(columnId, recordId) => {
                      setDropTargetColumnId(null);
                      setDraggingRecordId(null);
                      if (!recordId) return;
                      void moveCard(recordId, columnId);
                    }}
                  />
                ))}
          </div>
        </div>
      </section>

      <VariazioniDetailSheet
        // Remount on card switch so debounced inputs reset their local draft.
        key={selectedCardId ?? "__empty__"}
        card={selectedFreshCard}
        open={Boolean(selectedCardId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCardId(null);
            setSelectedFreshCard(null);
          }
        }}
        onCardChange={(nextCard) => {
          updateCard(nextCard.id, () => nextCard);
          setSelectedFreshCard(nextCard);
        }}
      />
      <CreateVariazioneDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        rapportoOptions={rapportoOptions}
        onCreate={createVariazione}
      />
    </>
  );
}
