import {
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react"

import { AttachmentUploadSlot } from "@/components/shared-next/attachment-upload-slot"
import type { AttachmentLink } from "@/components/shared-next/attachment-utils"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Form } from "@/components/ui/form"
import { FieldInput, FieldTextarea } from "@/components/forms/field-components"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import type { AssunzioniBoardCardData } from "../types"
import {
  REGIME_CONVIVENTE,
  REGIME_NON_CONVIVENTE,
  TIPO_UTENTE_OPTIONS,
  type AssunzioneAttachmentSlot,
  type AssunzioneAttachmentTarget,
  collectAttachmentValues,
  normalizeRegimeConvivenza,
  toInputValue,
  toNullableNumber,
} from "../lib/detail-utils"
import {
  EditableField,
  FieldSingleSelect,
} from "./assunzioni-detail-fields"

export function DatoreDetail({
  card,
  onFamigliaPatch,
  onAssunzionePatch,
  onAttachmentAdd,
  onAttachmentRemove,
  onAttachmentPreview,
  uploadingAttachment,
}: {
  card: AssunzioniBoardCardData
  onFamigliaPatch: (patch: Record<string, unknown>) => Promise<void>
  onAssunzionePatch: (patch: Record<string, unknown>) => Promise<void>
  onAttachmentAdd: (target: AssunzioneAttachmentTarget, slot: AssunzioneAttachmentSlot, file: File) => void
  onAttachmentRemove: (target: AssunzioneAttachmentTarget, slot: AssunzioneAttachmentSlot, link: AttachmentLink) => void
  onAttachmentPreview: (link: AttachmentLink) => void
  uploadingAttachment: string | null
}) {
  const famiglia = card.famiglia
  const assunzione = card.assunzione

  // FASE 5 BIS — form + autosave: unica source of truth per i campi editabili
  // del datore. Sostituisce i ~25 useDebouncedSave + draft/setDraft per i Select.
  // onSave instrada per chiave a 2 target: nome/cognome/email/telefono →
  // onFamigliaPatch, tutto il resto → onAssunzionePatch (con le stesse
  // trasformazioni: ore_* numeriche → toNullableNumber, rapporto_di_lavoro_residenza
  // Si/No → boolean, resto ""→null). Resync realtime senza clobber: keepDirtyValues.
  const form = useAutoSaveForm({
    defaults: {
      nome: assunzione?.info_anagrafiche_nome ?? famiglia?.nome ?? card.nomeFamiglia.split(" ")[0] ?? "",
      cognome:
        assunzione?.info_anagrafiche_cognome ??
        famiglia?.cognome ??
        card.nomeFamiglia.split(" ").slice(1).join(" ") ??
        "",
      email: assunzione?.info_anagrafiche_email ?? famiglia?.email ?? "",
      telefono: assunzione?.info_anagrafiche_numero_mobile ?? famiglia?.telefono ?? "",
      type_of_compilazione_form: assunzione?.type_of_compilazione_form ?? "DATORE LAVORO",
      rapporto_di_lavoro_residenza:
        assunzione?.rapporto_di_lavoro_residenza === false ? "No" : "Si",
      documento_identita_tipo: assunzione?.documento_identita_tipo ?? "Carta d'identita",
      cittadino_extracomunitario: assunzione?.cittadino_extracomunitario ?? "No",
      regime_convivenza: normalizeRegimeConvivenza(assunzione?.regime_convivenza),
      tredicesima_rateizzata_mensile: assunzione?.tredicesima_rateizzata_mensile ?? "",
      telecamere_posto_lavoro: assunzione?.telecamere_posto_lavoro ?? "No",
      info_anagrafiche_codice_fiscale: assunzione?.info_anagrafiche_codice_fiscale ?? "",
      info_anagrafiche_cittadidanza: assunzione?.info_anagrafiche_cittadidanza ?? "Italiana",
      info_anagrafiche_numero_fisso: assunzione?.info_anagrafiche_numero_fisso ?? "",
      info_anagrafiche_data_di_nascita: assunzione?.info_anagrafiche_data_di_nascita ?? "",
      info_anagrafiche_luogo_di_nascita: assunzione?.info_anagrafiche_luogo_di_nascita ?? "",
      info_anagrafiche_indirizzo: assunzione?.info_anagrafiche_indirizzo ?? "",
      info_anagrafiche_civico: assunzione?.info_anagrafiche_civico ?? "",
      info_anagrafiche_localita: assunzione?.info_anagrafiche_localita ?? "",
      info_anagrafiche_cap: assunzione?.info_anagrafiche_cap ?? "",
      luogo_lavoro_se_diverso_da_residenza:
        assunzione?.luogo_lavoro_se_diverso_da_residenza ?? "",
      civico_se_diverso_residenza: assunzione?.civico_se_diverso_residenza ?? "",
      comune_se_diverso_residenza: assunzione?.comune_se_diverso_residenza ?? "",
      provincia: assunzione?.provincia ?? "",
      documento_identita_numero: assunzione?.documento_identita_numero ?? "",
      documento_identita_scadenza: assunzione?.documento_identita_scadenza ?? "",
      ore_di_lavoro: toInputValue(assunzione?.ore_di_lavoro),
      ore_lunedi: toInputValue(assunzione?.ore_lunedi),
      ore_martedi: toInputValue(assunzione?.ore_martedi),
      ore_mercoledi: toInputValue(assunzione?.ore_mercoledi),
      ore_giovedi: toInputValue(assunzione?.ore_giovedi),
      ore_venerdi: toInputValue(assunzione?.ore_venerdi),
      ore_sabato: toInputValue(assunzione?.ore_sabato),
      mezza_giornata_di_riposo: assunzione?.mezza_giornata_di_riposo ?? "",
      data_assunzione: assunzione?.data_assunzione ?? "",
      note_aggiuntive: assunzione?.note_aggiuntive ?? "",
    },
    onSave: async (patch) => {
      const famigliaKeys = new Set(["nome", "cognome", "email", "telefono"])
      const oreKeys = new Set([
        "ore_di_lavoro",
        "ore_lunedi",
        "ore_martedi",
        "ore_mercoledi",
        "ore_giovedi",
        "ore_venerdi",
        "ore_sabato",
      ])
      const famigliaPatch: Record<string, unknown> = {}
      const assunzionePatch: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(patch)) {
        if (famigliaKeys.has(key)) {
          famigliaPatch[key] = (value as string) || null
        } else if (key === "rapporto_di_lavoro_residenza") {
          assunzionePatch[key] = value === "Si"
        } else if (oreKeys.has(key)) {
          assunzionePatch[key] = toNullableNumber(value as string)
        } else {
          assunzionePatch[key] = (value as string) || null
        }
      }
      if (Object.keys(famigliaPatch).length > 0) await onFamigliaPatch(famigliaPatch)
      if (Object.keys(assunzionePatch).length > 0) await onAssunzionePatch(assunzionePatch)
    },
  })
  const rapportoCorrispondeResidenza = form.watch("rapporto_di_lavoro_residenza")

  const documentoIdentitaAllegati = collectAttachmentValues(
    assunzione?.documento_identita_allegati
  )
  const codiceFiscaleAllegati = collectAttachmentValues(
    assunzione?.codice_fiscale_allegati
  )
  const permessoSoggiornoAllegati = collectAttachmentValues(
    assunzione?.permesso_di_soggiorno_allegati,
    assunzione?.ricevuta_rinnovo_permesso_allegati
  )
  const delegaInpsAllegati = collectAttachmentValues(
    assunzione?.delega_inps_allegati
  )

  return (
    <Form {...form}>
    <div className="space-y-5">
      <DetailSectionBlock
        title="Riepilogo datore"
        icon={<UsersIcon className="text-muted-foreground size-4" />}
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
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Informazioni generali"
        icon={<UserIcon className="text-muted-foreground size-4" />}
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
            <FieldInput name="info_anagrafiche_cittadidanza" />
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
        </div>
        <div className="grid gap-4 md:grid-cols-2">
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
          <EditableField label="Il luogo di residenza corrisponde al luogo di lavoro?">
            <FieldSingleSelect
              name="rapporto_di_lavoro_residenza"
              placeholder="Seleziona..."
              options={["Si", "No"]}
            />
          </EditableField>
          {rapportoCorrispondeResidenza === "No" ? (
            <>
              <EditableField label="Indirizzo luogo lavoro">
                <FieldInput name="luogo_lavoro_se_diverso_da_residenza" />
              </EditableField>
              <EditableField label="Civico luogo lavoro">
                <FieldInput name="civico_se_diverso_residenza" />
              </EditableField>
              <EditableField label="Comune luogo lavoro">
                <FieldInput name="comune_se_diverso_residenza" />
              </EditableField>
              <EditableField label="Provincia luogo lavoro">
                <FieldInput name="provincia" />
              </EditableField>
            </>
          ) : null}
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
        title="Convivenza e orario (form famiglia)"
        icon={<BriefcaseBusinessIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="Mansione indicata dalla famiglia">
          <div className="flex min-h-10 items-center rounded-md border bg-surface px-3 py-2 text-sm">
            {assunzione?.mansione_lavoratore || "—"}
          </div>
        </EditableField>
        <EditableField label="Regime di convivenza">
          <FieldSingleSelect
            name="regime_convivenza"
            placeholder="Seleziona..."
            options={[REGIME_NON_CONVIVENTE, REGIME_CONVIVENTE]}
          />
        </EditableField>
        <EditableField label="Ore di lavoro a settimana">
          <FieldInput name="ore_di_lavoro" type="number" />
        </EditableField>
        <div className="grid gap-4 md:grid-cols-3">
          <EditableField label="Ore lunedi">
            <FieldInput name="ore_lunedi" type="number" step="0.25" />
          </EditableField>
          <EditableField label="Ore martedi">
            <FieldInput name="ore_martedi" type="number" step="0.25" />
          </EditableField>
          <EditableField label="Ore mercoledi">
            <FieldInput name="ore_mercoledi" type="number" step="0.25" />
          </EditableField>
          <EditableField label="Ore giovedi">
            <FieldInput name="ore_giovedi" type="number" step="0.25" />
          </EditableField>
          <EditableField label="Ore venerdi">
            <FieldInput name="ore_venerdi" type="number" step="0.25" />
          </EditableField>
          <EditableField label="Ore sabato">
            <FieldInput name="ore_sabato" type="number" step="0.25" />
          </EditableField>
          <EditableField label="Giorno/mezza giornata di riposo">
            <FieldInput name="mezza_giornata_di_riposo" />
          </EditableField>
        </div>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Altri dettagli (form famiglia)"
        icon={<CalendarDaysIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="Tredicesima rateizzata?">
          <FieldSingleSelect
            name="tredicesima_rateizzata_mensile"
            placeholder="Seleziona..."
            options={["Si", "No"]}
          />
        </EditableField>
        <EditableField label="Ci sono telecamere sul posto di lavoro?">
          <FieldSingleSelect
            name="telecamere_posto_lavoro"
            placeholder="Seleziona..."
            options={["Si", "No"]}
          />
        </EditableField>
        <EditableField label="Data di assunzione">
          <FieldInput name="data_assunzione" type="date" />
        </EditableField>
        <EditableField label="Appunti extra">
          <FieldTextarea
            name="note_aggiuntive"
            className="min-h-24"
            placeholder="Aggiungi note sul rapporto o sulla pratica"
          />
        </EditableField>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Documenti datore"
        icon={<ShieldCheckIcon className="text-muted-foreground size-4" />}
        contentClassName="grid gap-3 md:grid-cols-3"
      >
        <AttachmentUploadSlot
          label="Documento identita"
          value={documentoIdentitaAllegati}
          onAdd={(file) => onAttachmentAdd("datore", "documento_identita_allegati", file)}
          onRemove={(link) => onAttachmentRemove("datore", "documento_identita_allegati", link)}
          onPreviewOpen={onAttachmentPreview}
          isUploading={uploadingAttachment === "datore:documento_identita_allegati"}
          multiple={false}
        />
        <AttachmentUploadSlot
          label="Codice fiscale"
          value={codiceFiscaleAllegati}
          onAdd={(file) => onAttachmentAdd("datore", "codice_fiscale_allegati", file)}
          onRemove={(link) => onAttachmentRemove("datore", "codice_fiscale_allegati", link)}
          onPreviewOpen={onAttachmentPreview}
          isUploading={uploadingAttachment === "datore:codice_fiscale_allegati"}
          multiple={false}
        />
        <AttachmentUploadSlot
          label="Permesso di soggiorno"
          value={permessoSoggiornoAllegati}
          onAdd={(file) => onAttachmentAdd("datore", "permesso_di_soggiorno_allegati", file)}
          onRemove={(link) => onAttachmentRemove("datore", "permesso_di_soggiorno_allegati", link)}
          onPreviewOpen={onAttachmentPreview}
          isUploading={uploadingAttachment === "datore:permesso_di_soggiorno_allegati"}
          multiple={false}
        />
        <AttachmentUploadSlot
          label="Delega INPS"
          value={delegaInpsAllegati}
          onAdd={(file) => onAttachmentAdd("datore", "delega_inps_allegati", file)}
          onRemove={(link) => onAttachmentRemove("datore", "delega_inps_allegati", link)}
          onPreviewOpen={onAttachmentPreview}
          isUploading={uploadingAttachment === "datore:delega_inps_allegati"}
          multiple={false}
        />
      </DetailSectionBlock>
    </div>
    </Form>
  )
}
