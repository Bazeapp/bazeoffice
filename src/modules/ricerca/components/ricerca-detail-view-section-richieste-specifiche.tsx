import * as React from "react"

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { LookupOption } from "@/modules/crm/types"
import type { RicercaDetailCardData, RicercaDetailSectionEdit } from "../lib/ricerca-detail-view.types"
import {
  RicercaDetailEditableCheckboxField,
  RicercaDetailEditableTextField,
  RicercaDetailSectionEditBar,
} from "./ricerca-detail-view-shared"
import { RicercaDetailReadOnlyField } from "./ricerca-detail-view-states"

type Props = {
  card: RicercaDetailCardData
  sectionEdit: RicercaDetailSectionEdit
  nazionalitaEscluseOptions: LookupOption[]
  nazionalitaObbligatorieOptions: LookupOption[]
  saveProcessPatch: (section: string, patch: Record<string, unknown>) => void | Promise<void>
}

export function RicercaDetailViewSectionRichiesteSpecifiche({
  card,
  sectionEdit,
  nazionalitaEscluseOptions,
  nazionalitaObbligatorieOptions,
  saveProcessPatch,
}: Props) {
  const nazionalitaEscluseAnchor = useComboboxAnchor()
  const nazionalitaObbligatorieAnchor = useComboboxAnchor()

  return (
    <AccordionItem value="richieste-specifiche">
      <AccordionTrigger
        titleAction={<RicercaDetailSectionEditBar {...sectionEdit} />}
      >
        Richieste specifiche
      </AccordionTrigger>
      <AccordionContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <RicercaDetailEditableCheckboxField
            label="Richiesta patente"
            name="richiesta_patente"
            value={Boolean(card.richiestaPatente)}
            editing={sectionEdit.editing}
          />
          <RicercaDetailEditableCheckboxField
            label="Richiesta trasferte"
            name="richiesta_trasferte"
            value={Boolean(card.richiestaTrasferte)}
            editing={sectionEdit.editing}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <RicercaDetailEditableCheckboxField
            label="Richiesta ferie"
            name="richiesta_ferie"
            value={Boolean(card.richiestaFerie)}
            editing={sectionEdit.editing}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {sectionEdit.editing ? (
            <>
              <RicercaDetailEditableTextField
                label="Età minima"
                name="eta_minima"
                value={card.etaMinima}
                editing
              />
              <RicercaDetailEditableTextField
                label="Età massima"
                name="eta_massima"
                value={card.etaMassima}
                editing
              />
            </>
          ) : (
            <RicercaDetailReadOnlyField
              label="Età lavoratore"
              value={`${card.etaMinima ?? "-"} - ${card.etaMassima ?? "-"}`}
            />
          )}
          <Field>
            <FieldLabel variant="eyebrow">Sesso</FieldLabel>
            {sectionEdit.editing ? (
              <Select
                value={(() => {
                  const raw = (card.sesso ?? "").toLowerCase()
                  if (raw === "uomo") return "Uomo"
                  if (raw === "donna") return "Donna"
                  if (raw === "indifferente") return "Indifferente"
                  return ""
                })()}
                onValueChange={(next) =>
                  void saveProcessPatch("richieste-specifiche", {
                    sesso: next || null,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Indifferente">Indifferente</SelectItem>
                  <SelectItem value="Donna">Donna</SelectItem>
                  <SelectItem value="Uomo">Uomo</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-foreground">{card.sesso || "—"}</p>
            )}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <RicercaDetailEditableCheckboxField
            label="Comunica in italiano"
            name="comunicare_bene_italiano"
            value={Boolean(card.comunicareBeneItaliano)}
            editing={sectionEdit.editing}
          />
          <RicercaDetailEditableCheckboxField
            label="Comunica in inglese"
            name="comunicare_bene_inglese"
            value={Boolean(card.comunicareBeneInglese)}
            editing={sectionEdit.editing}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <RicercaDetailEditableCheckboxField
            label="Famiglia molto esigente"
            name="famiglia_molto_esigente"
            value={Boolean(card.famigliaMoltoEsigente)}
            editing={sectionEdit.editing}
          />
          <RicercaDetailEditableCheckboxField
            label="Richiesta autonomia"
            name="richiesta_autonomia"
            value={Boolean(card.richiestaAutonomia)}
            editing={sectionEdit.editing}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <RicercaDetailEditableCheckboxField
            label="Datore spesso presente"
            name="datore_spesso_presente"
            value={Boolean(card.datoreSpessoPresente)}
            editing={sectionEdit.editing}
          />
          <RicercaDetailEditableCheckboxField
            label="Richiesta discrezione"
            name="richiesta_discrezione"
            value={Boolean(card.richiestaDiscrezione)}
            editing={sectionEdit.editing}
          />
        </div>
        <Field>
          <FieldLabel variant="eyebrow">Nazionalità escluse</FieldLabel>
          {sectionEdit.editing ? (
            <Combobox
              multiple
              autoHighlight
              items={nazionalitaEscluseOptions.map((o) => o.valueLabel)}
              value={card.nazionalitaEscluse ?? []}
              onValueChange={(nextValues) =>
                void saveProcessPatch("richieste-specifiche", {
                  nazionalita_escluse:
                    (nextValues as string[]).length > 0
                      ? (nextValues as string[])
                      : null,
                })
              }
            >
              <ComboboxChips ref={nazionalitaEscluseAnchor} className="w-full">
                <ComboboxValue>
                  {(values) => (
                    <React.Fragment>
                      {(values as string[]).map((value) => (
                        <ComboboxChip key={value}>{value}</ComboboxChip>
                      ))}
                      <ComboboxChipsInput placeholder="Seleziona nazionalità" />
                    </React.Fragment>
                  )}
                </ComboboxValue>
              </ComboboxChips>
              <ComboboxContent anchor={nazionalitaEscluseAnchor} className="max-h-80">
                <ComboboxEmpty>Nessuna opzione trovata.</ComboboxEmpty>
                <ComboboxList className="max-h-72 overflow-y-auto">
                  {(item) => (
                    <ComboboxItem key={item as string} value={item as string}>
                      {item as string}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          ) : (
            <p className="text-sm text-foreground">
              {card.nazionalitaEscluseLabel || "—"}
            </p>
          )}
        </Field>
        <Field>
          <FieldLabel variant="eyebrow">Nazionalità obbligatorie</FieldLabel>
          {sectionEdit.editing ? (
            <Combobox
              multiple
              autoHighlight
              items={nazionalitaObbligatorieOptions.map((o) => o.valueLabel)}
              value={card.nazionalitaObbligatorie ?? []}
              onValueChange={(nextValues) =>
                void saveProcessPatch("richieste-specifiche", {
                  nazionalita_obbligatorie:
                    (nextValues as string[]).length > 0
                      ? (nextValues as string[])
                      : null,
                })
              }
            >
              <ComboboxChips ref={nazionalitaObbligatorieAnchor} className="w-full">
                <ComboboxValue>
                  {(values) => (
                    <React.Fragment>
                      {(values as string[]).map((value) => (
                        <ComboboxChip key={value}>{value}</ComboboxChip>
                      ))}
                      <ComboboxChipsInput placeholder="Seleziona nazionalità" />
                    </React.Fragment>
                  )}
                </ComboboxValue>
              </ComboboxChips>
              <ComboboxContent anchor={nazionalitaObbligatorieAnchor} className="max-h-80">
                <ComboboxEmpty>Nessuna opzione trovata.</ComboboxEmpty>
                <ComboboxList className="max-h-72 overflow-y-auto">
                  {(item) => (
                    <ComboboxItem key={item as string} value={item as string}>
                      {item as string}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          ) : (
            <p className="text-sm text-foreground">
              {card.nazionalitaObbligatorieLabel || "—"}
            </p>
          )}
        </Field>
        <RicercaDetailEditableTextField
          label="Descrizione trasferte"
          name="descrizione_richiesta_trasferte"
          value={card.descrizioneRichiestaTrasferte}
          editing={sectionEdit.editing}
          multiline
        />
        <RicercaDetailEditableTextField
          label="Descrizione ferie"
          name="descrizione_richiesta_ferie"
          value={card.descrizioneRichiestaFerie}
          editing={sectionEdit.editing}
          multiline
        />
        <RicercaDetailEditableTextField
          label="Informazioni extra riservate"
          name="informazioni_extra_riservate"
          value={card.informazioniExtraRiservate}
          editing={sectionEdit.editing}
          multiline
        />
      </AccordionContent>
    </AccordionItem>
  )
}
