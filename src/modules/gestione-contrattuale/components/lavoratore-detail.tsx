import {
  BriefcaseBusinessIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  UserIcon,
} from "lucide-react"

import { AttachmentUploadSlot } from "@/components/shared-next/attachment-upload-slot"
import type { AttachmentLink } from "@/components/shared-next/attachment-utils"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Form } from "@/components/ui/form"
import { FieldInput, FieldTextarea } from "@/components/forms/field-components"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import type { DocumentoLavoratoreRecord } from "@/modules/lavoratori/types"
import type { AssunzioniBoardCardData } from "../types"
import {
  TIPO_UTENTE_OPTIONS,
  type AssunzioneAttachmentSlot,
  type AssunzioneAttachmentTarget,
  collectAttachmentValues,
  collectDocumentAttachments,
} from "../lib/detail-utils"
import {
  EditableField,
  FieldSingleSelect,
} from "./assunzioni-detail-fields"

export function LavoratoreDetail({
  card,
  documents,
  onLavoratorePatch,
  onLavoratoreAssunzionePatch,
  onAttachmentAdd,
  onAttachmentRemove,
  onAttachmentPreview,
  uploadingAttachment,
}: {
  card: AssunzioniBoardCardData
  documents: DocumentoLavoratoreRecord[]
  onLavoratorePatch: (patch: Record<string, unknown>) => Promise<void>
  onLavoratoreAssunzionePatch: (patch: Record<string, unknown>) => Promise<void>
  onAttachmentAdd: (target: AssunzioneAttachmentTarget, slot: AssunzioneAttachmentSlot, file: File) => void
  onAttachmentRemove: (target: AssunzioneAttachmentTarget, slot: AssunzioneAttachmentSlot, link: AttachmentLink) => void
  onAttachmentPreview: (link: AttachmentLink) => void
  uploadingAttachment: string | null
}) {
  const rapporto = card.rapporto
  const lavoratore = card.lavoratore
  const assunzione = card.lavoratoreAssunzione
  const fullName = card.nomeLavoratore

  // FASE 5 BIS — form + autosave: unica source of truth per i campi editabili
  // del lavoratore. Sostituisce i ~18 useDebouncedSave + draft/setDraft per i
  // Select. onSave instrada per chiave a 2 target: nome/cognome/email/telefono
  // → onLavoratorePatch (lavoratori), il resto → onLavoratoreAssunzionePatch
  // (assunzioni). Due campi a doppio target come l'originale: cittadinanza →
  // nazionalita + info_anagrafiche_cittadidanza, dati_bancari → iban +
  // dati_bancari_lavoratore. Resync realtime senza clobber: keepDirtyValues.
  const form = useAutoSaveForm({
    defaults: {
      nome: assunzione?.info_anagrafiche_nome ?? lavoratore?.nome ?? fullName.split(" ")[0] ?? "",
      cognome:
        assunzione?.info_anagrafiche_cognome ??
        lavoratore?.cognome ??
        fullName.split(" ").slice(1).join(" ") ??
        "",
      email: assunzione?.info_anagrafiche_email ?? lavoratore?.email ?? "",
      telefono: assunzione?.info_anagrafiche_numero_mobile ?? lavoratore?.telefono ?? "",
      cittadinanza: assunzione?.info_anagrafiche_cittadidanza ?? lavoratore?.nazionalita ?? "",
      data_assunzione: rapporto?.data_inizio_rapporto ?? "",
      type_of_compilazione_form: assunzione?.type_of_compilazione_form ?? "LAVORATORE",
      documento_identita_tipo: assunzione?.documento_identita_tipo ?? "Carta d'identita",
      cittadino_extracomunitario: assunzione?.cittadino_extracomunitario ?? "No",
      info_anagrafiche_codice_fiscale: assunzione?.info_anagrafiche_codice_fiscale ?? "",
      info_anagrafiche_numero_fisso: assunzione?.info_anagrafiche_numero_fisso ?? "",
      info_anagrafiche_data_di_nascita: assunzione?.info_anagrafiche_data_di_nascita ?? "",
      info_anagrafiche_luogo_di_nascita: assunzione?.info_anagrafiche_luogo_di_nascita ?? "",
      info_anagrafiche_indirizzo: assunzione?.info_anagrafiche_indirizzo ?? "",
      info_anagrafiche_civico: assunzione?.info_anagrafiche_civico ?? "",
      info_anagrafiche_localita: assunzione?.info_anagrafiche_localita ?? "",
      info_anagrafiche_cap: assunzione?.info_anagrafiche_cap ?? "",
      documento_identita_numero: assunzione?.documento_identita_numero ?? "",
      documento_identita_scadenza: assunzione?.documento_identita_scadenza ?? "",
      dati_bancari: lavoratore?.iban ?? assunzione?.dati_bancari_lavoratore ?? "",
      note_aggiuntive: "",
    },
    onSave: async (patch) => {
      const lavoratoreKeys = new Set(["nome", "cognome", "email", "telefono"])
      const lavoratorePatch: Record<string, unknown> = {}
      const assunzionePatch: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(patch)) {
        const next = (value as string) || null
        if (lavoratoreKeys.has(key)) {
          lavoratorePatch[key] = next
        } else if (key === "cittadinanza") {
          lavoratorePatch.nazionalita = next
          assunzionePatch.info_anagrafiche_cittadidanza = next
        } else if (key === "dati_bancari") {
          lavoratorePatch.iban = next
          assunzionePatch.dati_bancari_lavoratore = next
        } else {
          assunzionePatch[key] = next
        }
      }
      await Promise.all([
        Object.keys(lavoratorePatch).length > 0
          ? onLavoratorePatch(lavoratorePatch)
          : Promise.resolve(),
        Object.keys(assunzionePatch).length > 0
          ? onLavoratoreAssunzionePatch(assunzionePatch)
          : Promise.resolve(),
      ])
    },
  })

  const documentoIdentitaAllegati =
    collectDocumentAttachments(documents, [
      "allegato_documento_identita_fronte",
      "allegato_documento_identita_retro",
    ]) ?? assunzione?.documento_identita_allegati ?? null
  const codiceFiscaleAllegati =
    collectDocumentAttachments(documents, [
      "allegato_codice_fiscale_fronte",
      "allegato_codice_fiscale_retro",
    ]) ?? assunzione?.codice_fiscale_allegati ?? null
  const permessoSoggiornoAllegati =
    collectDocumentAttachments(documents, [
      "allegato_permesso_di_soggiorno_fronte",
      "allegato_permesso_di_soggiorno_retro",
      "allegato_ricevuta_rinnovo_permesso",
    ]) ??
    collectAttachmentValues(
      assunzione?.permesso_di_soggiorno_allegati,
      assunzione?.ricevuta_rinnovo_permesso_allegati
    )

  return (
    <Form {...form}>
    <div className="space-y-5">
      <DetailSectionBlock
        title="Riepilogo lavoratore"
        icon={<UserIcon className="text-muted-foreground size-4" />}
        contentClassName="grid gap-4 md:grid-cols-2"
      >
        <EditableField label="Nome">
          <FieldInput name="nome" />
        </EditableField>
        <EditableField label="Cognome">
          <FieldInput name="cognome" />
        </EditableField>
        <EditableField label="Email">
          <FieldInput name="email" />
        </EditableField>
        <EditableField label="Cellulare">
          <FieldInput name="telefono" />
        </EditableField>
        <EditableField label="Cittadinanza">
          <FieldInput name="cittadinanza" />
        </EditableField>
        <EditableField label="Data assunzione">
          <FieldInput name="data_assunzione" type="date" />
        </EditableField>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Informazioni generali"
        icon={<BriefcaseBusinessIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="Tipo utente">
          <FieldSingleSelect
            name="type_of_compilazione_form"
            placeholder="Seleziona tipo utente"
            options={TIPO_UTENTE_OPTIONS}
          />
        </EditableField>
        <div className="grid gap-4 md:grid-cols-2">
          <EditableField label="Nome">
            <FieldInput name="nome" />
          </EditableField>
          <EditableField label="Cognome">
            <FieldInput name="cognome" />
          </EditableField>
          <EditableField label="Codice fiscale">
            <FieldInput name="info_anagrafiche_codice_fiscale" />
          </EditableField>
          <EditableField label="Cittadinanza">
            <FieldInput name="cittadinanza" />
          </EditableField>
          <EditableField label="Email">
            <FieldInput name="email" />
          </EditableField>
          <EditableField label="Cellulare">
            <FieldInput name="telefono" />
          </EditableField>
          <EditableField label="Telefono fisso">
            <FieldInput name="info_anagrafiche_numero_fisso" />
          </EditableField>
          <EditableField label="Data di nascita">
            <FieldInput name="info_anagrafiche_data_di_nascita" type="date" />
          </EditableField>
          <EditableField label="Luogo di nascita">
            <FieldInput name="info_anagrafiche_luogo_di_nascita" />
          </EditableField>
          <EditableField label="Indirizzo di residenza">
            <FieldInput name="info_anagrafiche_indirizzo" />
          </EditableField>
          <EditableField label="Civico">
            <FieldInput name="info_anagrafiche_civico" />
          </EditableField>
          <EditableField label="Localita">
            <FieldInput name="info_anagrafiche_localita" />
          </EditableField>
          <EditableField label="CAP">
            <FieldInput name="info_anagrafiche_cap" />
          </EditableField>
          <EditableField label="Tipo documento">
            <FieldSingleSelect
              name="documento_identita_tipo"
              placeholder="Seleziona tipo documento"
              options={["Carta d'identita", "Passaporto", "Patente"]}
            />
          </EditableField>
          <EditableField label="Numero documento">
            <FieldInput name="documento_identita_numero" />
          </EditableField>
          <EditableField label="Scadenza documento">
            <FieldInput name="documento_identita_scadenza" type="date" />
          </EditableField>
        </div>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Dati bancari"
        icon={<CreditCardIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="Dati bancari">
          <FieldTextarea
            name="dati_bancari"
            className="min-h-24 font-mono"
            placeholder="IBAN..."
          />
        </EditableField>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Cittadini extracomunitari"
        icon={<ShieldCheckIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="E extracomunitario?">
          <FieldSingleSelect
            name="cittadino_extracomunitario"
            placeholder="Seleziona..."
            options={["Si", "No"]}
          />
        </EditableField>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Dati lavoratore"
        icon={<BriefcaseBusinessIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="Appunti extra">
          <FieldTextarea
            name="note_aggiuntive"
            className="min-h-24"
            placeholder="Aggiungi note sul lavoratore o sulla pratica"
          />
        </EditableField>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Documenti lavoratore"
        icon={<ShieldCheckIcon className="text-muted-foreground size-4" />}
        contentClassName="grid gap-3 md:grid-cols-3"
      >
        <AttachmentUploadSlot
          label="Documento identità"
          value={documentoIdentitaAllegati}
          onAdd={(file) => onAttachmentAdd("lavoratore", "documento_identita_allegati", file)}
          onRemove={(link) => onAttachmentRemove("lavoratore", "documento_identita_allegati", link)}
          onPreviewOpen={onAttachmentPreview}
          isUploading={uploadingAttachment === "lavoratore:documento_identita_allegati"}
          multiple={false}
        />
        <AttachmentUploadSlot
          label="Codice fiscale"
          value={codiceFiscaleAllegati}
          onAdd={(file) => onAttachmentAdd("lavoratore", "codice_fiscale_allegati", file)}
          onRemove={(link) => onAttachmentRemove("lavoratore", "codice_fiscale_allegati", link)}
          onPreviewOpen={onAttachmentPreview}
          isUploading={uploadingAttachment === "lavoratore:codice_fiscale_allegati"}
          multiple={false}
        />
        <AttachmentUploadSlot
          label="Permesso di soggiorno"
          value={permessoSoggiornoAllegati}
          onAdd={(file) => onAttachmentAdd("lavoratore", "permesso_di_soggiorno_allegati", file)}
          onRemove={(link) => onAttachmentRemove("lavoratore", "permesso_di_soggiorno_allegati", link)}
          onPreviewOpen={onAttachmentPreview}
          isUploading={uploadingAttachment === "lavoratore:permesso_di_soggiorno_allegati"}
          multiple={false}
        />
      </DetailSectionBlock>

    </div>
    </Form>
  )
}
