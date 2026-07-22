import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { CheckboxChip } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { RICERCA_DETAIL_WEEKDAY_ITEMS } from "../lib/ricerca-detail-view.constants"
import type { RicercaDetailCardData, RicercaDetailOrariDraft, RicercaDetailSectionEdit } from "../lib/ricerca-detail-view.types"
import { editableValue } from "../lib/ricerca-detail-view.utils"
import { RicercaDetailSectionEditBar } from "./ricerca-detail-view-shared"

type Props = {
  card: RicercaDetailCardData
  sectionEdit: RicercaDetailSectionEdit
  draft: RicercaDetailOrariDraft
  setDraft: React.Dispatch<React.SetStateAction<RicercaDetailOrariDraft>>
}

export function RicercaDetailViewSectionOrari({ card, sectionEdit, draft, setDraft }: Props) {
  return (
                  <AccordionItem value="orari">
                    <AccordionTrigger
                      titleAction={<RicercaDetailSectionEditBar {...sectionEdit} />}
                    >
                      Orari e frequenza
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <Field>
                        <FieldLabel variant="eyebrow">Orario di lavoro</FieldLabel>
                        {sectionEdit.editing ? (
                          <Textarea
                            value={draft.orarioDiLavoro}
                            onChange={(e) =>
                              setDraft((d) => ({ ...d, orarioDiLavoro: e.target.value }))
                            }
                            rows={4}
                          />
                        ) : (
                          <p className="text-sm text-foreground">
                            {editableValue(card.orarioDiLavoro) || "—"}
                          </p>
                        )}
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field>
                          <FieldLabel variant="eyebrow" className="whitespace-nowrap text-[11px]">
                            Ore settimanali
                          </FieldLabel>
                          {sectionEdit.editing ? (
                            <Input
                              value={draft.oreSettimana}
                              onChange={(e) =>
                                setDraft((d) => ({ ...d, oreSettimana: e.target.value }))
                              }
                            />
                          ) : (
                            <p className="text-sm text-foreground">
                              {editableValue(card.oreSettimana) || "—"}
                            </p>
                          )}
                        </Field>
                        <Field>
                          <FieldLabel variant="eyebrow" className="whitespace-nowrap text-[11px]">
                            Giorni settimanali
                          </FieldLabel>
                          {sectionEdit.editing ? (
                            <Input
                              value={draft.giorniSettimana}
                              onChange={(e) =>
                                setDraft((d) => ({ ...d, giorniSettimana: e.target.value }))
                              }
                            />
                          ) : (
                            <p className="text-sm text-foreground">
                              {editableValue(card.giorniSettimana) || "—"}
                            </p>
                          )}
                        </Field>
                      </div>
                      {sectionEdit.editing ? (
                        <Field>
                          <FieldLabel variant="eyebrow">Giornate preferite</FieldLabel>
                          <div className="flex flex-wrap gap-1.5">
                            {RICERCA_DETAIL_WEEKDAY_ITEMS.map((day) => {
                              const checked = draft.giornatePreferite.includes(day);
                              return (
                                <CheckboxChip
                                  key={day}
                                  checked={checked}
                                  onCheckedChange={(next) =>
                                    setDraft((d) => {
                                      const set = new Set(d.giornatePreferite);
                                      if (next) set.add(day);
                                      else set.delete(day);
                                      return {
                                        ...d,
                                        giornatePreferite: RICERCA_DETAIL_WEEKDAY_ITEMS.filter((item) =>
                                          set.has(item),
                                        ),
                                      };
                                    })
                                  }
                                >
                                  {day}
                                </CheckboxChip>
                              );
                            })}
                          </div>
                        </Field>
                      ) : card.giornatePreferite &&
                        card.giornatePreferite.length > 0 ? (
                        <Field>
                          <FieldLabel variant="eyebrow">Giornate preferite</FieldLabel>
                          <div className="flex flex-wrap gap-1.5">
                            {card.giornatePreferite.map((giorno) => (
                              <Badge
                                key={giorno}
                                className="border-blue-200 bg-blue-50 text-blue-700"
                              >
                                {giorno}
                              </Badge>
                            ))}
                          </div>
                        </Field>
                      ) : null}
                    </AccordionContent>
                  </AccordionItem>
  )
}
