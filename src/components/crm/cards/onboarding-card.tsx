import * as React from "react";
import type { ReactNode } from "react";
import {
  BriefcaseIcon,
  CalendarDaysIcon,
  CatIcon,
  CopyIcon,
  HomeIcon,
  MapPinnedIcon,
  ShieldCheckIcon,
  TimerResetIcon,
  UsersIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  OnboardingDecisioneLavoroSection,
  type OnboardingDecisioneLavoroSectionKey,
  type OnboardingDecisioneLavoroCheckboxDefaults,
} from "@/components/crm/cards/onboarding-decisione-lavoro-card";
import { CrmDetailCard } from "@/components/crm/detail-card";
import {
  DetailField,
  DetailFieldControl,
  DetailSectionBlock,
} from "@/components/shared/detail-section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type {
  CrmPipelineCardData,
  LookupOptionsByField,
} from "@/hooks/use-crm-pipeline-preview";
import { cn } from "@/lib/utils";

type OnboardingCardProps = {
  card: CrmPipelineCardData | null;
  lookupOptionsByField?: LookupOptionsByField;
  titleAction?: ReactNode;
  showTitle?: boolean;
  showTempistiche?: boolean;
  readOnly?: boolean;
  flattenSections?: boolean;
  sectionContainerProps?: Partial<
    Record<OnboardingFlatSectionKey, React.ComponentProps<"div">>
  >;
  onPatchProcess?: (
    processId: string,
    patch: Record<string, unknown>,
  ) => void | Promise<void>;
};

export type OnboardingFlatSectionKey =
  | "orari-frequenza"
  | "luogo-lavoro"
  | OnboardingDecisioneLavoroSectionKey
  | "tempistiche";

type LookupOption = LookupOptionsByField[string][number];

function toInputValue(value: string | null | undefined) {
  if (!value) return "";
  const normalized = value.trim();
  if (!normalized || normalized === "-") return "";
  return normalized;
}

function clampNumericInput(value: string, max: number) {
  const digitsOnly = value.replace(/[^\d]/g, "");
  if (!digitsOnly) return "";
  const parsed = Number.parseInt(digitsOnly, 10);
  if (Number.isNaN(parsed)) return "";
  return String(Math.min(parsed, max));
}

function toIsoDate(value: string) {
  const normalized = value.trim();
  const parts = normalized.split("/");
  if (parts.length !== 3) return normalized || null;
  const day = parts[0]?.padStart(2, "0");
  const month = parts[1]?.padStart(2, "0");
  const year = parts[2];
  if (!day || !month || !year) return null;
  return `${year}-${month}-${day}`;
}

const WEEKDAY_ITEMS = [
  "Lunedì",
  "Martedì",
  "Mercoledì",
  "Giovedì",
  "Venerdì",
  "Sabato",
  "Domenica",
] as const;

const WEEKDAY_ALIASES: Record<string, (typeof WEEKDAY_ITEMS)[number]> = {
  lunedi: "Lunedì",
  "lunedì": "Lunedì",
  martedi: "Martedì",
  "martedì": "Martedì",
  mercoledi: "Mercoledì",
  "mercoledì": "Mercoledì",
  giovedi: "Giovedì",
  "giovedì": "Giovedì",
  venerdi: "Venerdì",
  "venerdì": "Venerdì",
  sabato: "Sabato",
  domenica: "Domenica",
};

function normalizeWeekday(value: string): (typeof WEEKDAY_ITEMS)[number] | null {
  const token = value.trim().toLowerCase();
  return WEEKDAY_ALIASES[token] ?? null;
}

function normalizeLookupToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

function getTagClassName(color: string | null | undefined) {
  switch ((color ?? "").toLowerCase()) {
    case "red":
      return "border-red-200 bg-red-100 text-red-700";
    case "rose":
      return "border-rose-200 bg-rose-100 text-rose-700";
    case "orange":
      return "border-orange-200 bg-orange-100 text-orange-700";
    case "amber":
      return "border-amber-200 bg-amber-100 text-amber-700";
    case "yellow":
      return "border-yellow-200 bg-yellow-100 text-yellow-700";
    case "lime":
      return "border-lime-200 bg-lime-100 text-lime-700";
    case "green":
      return "border-green-200 bg-green-100 text-green-700";
    case "emerald":
      return "border-emerald-200 bg-emerald-100 text-emerald-700";
    case "teal":
      return "border-teal-200 bg-teal-100 text-teal-700";
    case "cyan":
      return "border-cyan-200 bg-cyan-100 text-cyan-700";
    case "sky":
      return "border-sky-200 bg-sky-100 text-sky-700";
    case "blue":
      return "border-blue-200 bg-blue-100 text-blue-700";
    case "indigo":
      return "border-indigo-200 bg-indigo-100 text-indigo-700";
    case "violet":
      return "border-violet-200 bg-violet-100 text-violet-700";
    case "purple":
      return "border-purple-200 bg-purple-100 text-purple-700";
    case "fuchsia":
      return "border-fuchsia-200 bg-fuchsia-100 text-fuchsia-700";
    case "pink":
      return "border-pink-200 bg-pink-100 text-pink-700";
    case "slate":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "gray":
      return "border-gray-200 bg-gray-100 text-gray-700";
    case "zinc":
      return "border-zinc-200 bg-zinc-100 text-zinc-700";
    case "neutral":
      return "border-neutral-200 bg-neutral-100 text-neutral-700";
    case "stone":
      return "border-stone-200 bg-stone-100 text-stone-700";
    default:
      return "border-border bg-muted text-foreground";
  }
}

function normalizeWeekdayList(values: string[] | null | undefined): string[] {
  if (!values?.length) return [];
  return Array.from(
    new Set(
      values.map((value) => normalizeWeekday(value)).filter(Boolean),
    ),
  ) as string[];
}

function displayText(value: string | null | undefined) {
  const normalized = toInputValue(value);
  return normalized || "-";
}

export function OnboardingCard({
  card,
  lookupOptionsByField,
  titleAction,
  showTitle = true,
  showTempistiche = true,
  readOnly = false,
  flattenSections = false,
  sectionContainerProps,
  onPatchProcess,
}: OnboardingCardProps) {
  const [orarioDiLavoro, setOrarioDiLavoro] = React.useState(
    toInputValue(card?.orarioDiLavoro),
  );
  const [indirizzoProvincia, setIndirizzoProvincia] = React.useState(
    toInputValue(card?.indirizzoProvincia),
  );
  const [indirizzoCap, setIndirizzoCap] = React.useState(
    toInputValue(card?.indirizzoCap),
  );
  const [indirizzoNote, setIndirizzoNote] = React.useState(
    toInputValue(card?.indirizzoNote),
  );
  const [indirizzoCompleto, setIndirizzoCompleto] = React.useState(
    toInputValue(card?.indirizzoCompleto),
  );
  const [srcMapsUrl, setSrcMapsUrl] = React.useState(
    toInputValue(card?.srcEmbedMapsAnnucio),
  );
  const [disponibilitaColloqui, setDisponibilitaColloqui] = React.useState(
    toInputValue(card?.disponibilitaColloquiInPresenza),
  );
  const [preventivoUrl, setPreventivoUrl] = React.useState(
    "https://app.bazeapp.com/checkout/accettare-preventivo?utm_source=whatsapp&utm_medium=organic&utm_campaign=whatsapp&utm_content=reminder1&session_id=rechnKFsmhqbiQP4D",
  );
  const anchor = useComboboxAnchor();
  const [oreSettimanali, setOreSettimanali] = React.useState(
    toInputValue(card?.oreSettimana),
  );
  const [giorniSettimanali, setGiorniSettimanali] = React.useState(
    toInputValue(card?.giorniSettimana),
  );
  const [deadline, setDeadline] = React.useState("");
  const [tipoIncontro, setTipoIncontro] = React.useState("");
  const [giornatePreferite, setGiornatePreferite] = React.useState<string[]>(
    normalizeWeekdayList(card?.giornatePreferite),
  );

  const weekdayColorMap = React.useMemo(() => {
    const options = (lookupOptionsByField?.preferenza_giorno ??
      []) as LookupOption[];
    const map = new Map<string, string>();
    for (const option of options) {
      if (!option.color) continue;
      map.set(normalizeLookupToken(option.valueKey), option.color);
      map.set(normalizeLookupToken(option.valueLabel), option.color);
    }
    return map;
  }, [lookupOptionsByField]);

  const getWeekdayColor = React.useCallback(
    (weekday: string) => {
      const normalizedWeekday = normalizeLookupToken(weekday);
      return weekdayColorMap.get(normalizedWeekday) ?? null;
    },
    [weekdayColorMap],
  );

  React.useEffect(() => {
    setOreSettimanali(toInputValue(card?.oreSettimana));
    setGiorniSettimanali(toInputValue(card?.giorniSettimana));
    setOrarioDiLavoro(toInputValue(card?.orarioDiLavoro));
    setIndirizzoProvincia(toInputValue(card?.indirizzoProvincia));
    setIndirizzoCap(toInputValue(card?.indirizzoCap));
    setIndirizzoNote(toInputValue(card?.indirizzoNote));
    setIndirizzoCompleto(toInputValue(card?.indirizzoCompleto));
    setSrcMapsUrl(toInputValue(card?.srcEmbedMapsAnnucio));
    setDisponibilitaColloqui(
      toInputValue(card?.disponibilitaColloquiInPresenza),
    );
    setGiornatePreferite(normalizeWeekdayList(card?.giornatePreferite));
  }, [
    card?.id,
    card?.oreSettimana,
    card?.giorniSettimana,
    card?.orarioDiLavoro,
    card?.indirizzoProvincia,
    card?.indirizzoCap,
    card?.indirizzoNote,
    card?.indirizzoCompleto,
    card?.srcEmbedMapsAnnucio,
    card?.disponibilitaColloquiInPresenza,
    card?.giornatePreferite,
  ]);

  React.useEffect(() => {
    setDeadline(toInputValue(card?.deadlineMobile));
    setTipoIncontro(toInputValue(card?.tipoIncontroFamigliaLavoratore));
  }, [card?.id, card?.deadlineMobile, card?.tipoIncontroFamigliaLavoratore]);

  const cardId = card?.id;

  const patchProcess = React.useCallback(
    async (patch: Record<string, unknown>) => {
      if (!cardId) return;
      await onPatchProcess?.(cardId, patch);
    },
    [cardId, onPatchProcess],
  );

  const copyToClipboard = React.useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiato`);
    } catch {
      toast.error(`Impossibile copiare ${label.toLowerCase()}`);
    }
  }, []);

  const checkboxDefaults = React.useMemo<OnboardingDecisioneLavoroCheckboxDefaults>(
    () => {
      const sesso = String(card?.sesso ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "");

      return {
        "onboarding-patente-si": card?.richiestaPatente ?? false,
        "onboarding-trasferte-si": card?.richiestaTrasferte ?? false,
        "onboarding-ferie-si": card?.richiestaFerie ?? false,
        "onboarding-genere-donna": sesso === "donna",
        "onboarding-genere-uomo": sesso === "uomo",
      };
    },
    [card?.richiestaFerie, card?.richiestaPatente, card?.richiestaTrasferte, card?.sesso],
  );

  const tipoIncontroOptions = React.useMemo(() => {
    const fromLookup =
      lookupOptionsByField?.tipo_incontro_famiglia_lavoratore ?? [];
    if (fromLookup.length > 0) return fromLookup;
    return [
      {
        valueKey: "prova_diretta",
        valueLabel: "Prova diretta",
        color: null,
        sortOrder: 1,
      },
      {
        valueKey: "colloquio_conoscitivo",
        valueLabel: "Colloquio conoscitivo",
        color: null,
        sortOrder: 2,
      },
    ] as LookupOption[];
  }, [lookupOptionsByField]);

  const lookupLabel = React.useCallback(
    (field: string, rawValue: string | null | undefined) => {
      const token = normalizeLookupToken(rawValue);
      if (!token || token === "-") return "-";
      const options = lookupOptionsByField?.[field] ?? [];
      const match = options.find(
        (option) =>
          normalizeLookupToken(option.valueKey) === token ||
          normalizeLookupToken(option.valueLabel) === token,
      );
      return match?.valueLabel ?? displayText(rawValue);
    },
    [lookupOptionsByField],
  );

  if (readOnly) {
    const weekdayBadges = normalizeWeekdayList(card?.giornatePreferite);
    const srcMapsValue = displayText(card?.srcEmbedMapsAnnucio);
    const hasMapsUrl = srcMapsValue !== "-";
    const tipoIncontroLabel = lookupLabel(
      "tipo_incontro_famiglia_lavoratore",
      card?.tipoIncontroFamigliaLavoratore,
    );
    const richiestaPatente = card?.richiestaPatente ? "Si" : "No";
    const richiestaTrasferte = card?.richiestaTrasferte ? "Si" : "No";
    const richiestaFerie = card?.richiestaFerie ? "Si" : "No";
    const compactGridClassName = "grid gap-4 sm:grid-cols-2";

    return (
      <div className="space-y-4">
        <div {...sectionContainerProps?.["orari-frequenza"]}>
          <DetailSectionBlock
            title="Orari e frequenza"
            icon={<CalendarDaysIcon className="size-4" />}
            action={showTitle ? titleAction : undefined}
            showDefaultAction={false}
            collapsible={flattenSections}
            defaultOpen
            contentClassName="space-y-4"
          >
          <DetailField
            label="Orario di lavoro"
            value={displayText(card?.orarioDiLavoro)}
            multiline
          />
          <div className={compactGridClassName}>
            <DetailField label="Ore settimanali" value={displayText(card?.oreSettimana)} />
            <DetailField label="Giorni settimanali" value={displayText(card?.giorniSettimana)} />
          </div>
          <DetailFieldControl label="Giornate preferite">
            {weekdayBadges.length ? (
              <div className="flex flex-wrap gap-1.5">
                {weekdayBadges.map((day) => (
                  <Badge
                    key={day}
                    variant="outline"
                    className={cn(
                      "h-5 px-2 text-[11px] font-medium",
                      getTagClassName(getWeekdayColor(day)),
                    )}
                  >
                    {day}
                  </Badge>
                ))}
              </div>
            ) : (
              <div className="ui-type-value">-</div>
            )}
          </DetailFieldControl>
          </DetailSectionBlock>
        </div>

        <div {...sectionContainerProps?.["luogo-lavoro"]}>
          <DetailSectionBlock
            title="Luogo di lavoro"
            icon={<MapPinnedIcon className="size-4" />}
            showDefaultAction={false}
            collapsible={flattenSections}
            defaultOpen={false}
            contentClassName="space-y-4"
          >
          <div className={compactGridClassName}>
            <DetailField label="Provincia" value={displayText(card?.indirizzoProvincia)} />
            <DetailField label="CAP" value={displayText(card?.indirizzoCap)} />
          </div>
          <DetailField label="Quartiere" value={displayText(card?.indirizzoNote)} />
          <DetailField label="Indirizzo completo" value={displayText(card?.indirizzoCompleto)} />
          <DetailFieldControl label="SRC Maps">
            {hasMapsUrl ? (
              <a
                href={srcMapsValue}
                target="_blank"
                rel="noreferrer"
                className="ui-type-value text-primary break-all underline underline-offset-2"
              >
                {srcMapsValue}
              </a>
            ) : (
              <div className="ui-type-value">-</div>
            )}
          </DetailFieldControl>
          </DetailSectionBlock>
        </div>

        <div {...sectionContainerProps?.famiglia}>
          <DetailSectionBlock
            title="Famiglia"
            icon={<UsersIcon className="size-4" />}
            showDefaultAction={false}
            collapsible={flattenSections}
            defaultOpen={false}
            contentClassName="space-y-4"
          >
          <div className={compactGridClassName}>
            <DetailField label="Nucleo famigliare" value={displayText(card?.nucleoFamigliare)} />
            <DetailField label="Eta lavoratore" value={`${displayText(card?.etaMinima)} - ${displayText(card?.etaMassima)}`} />
          </div>
          </DetailSectionBlock>
        </div>

        <div {...sectionContainerProps?.casa}>
          <DetailSectionBlock
            title="Casa"
            icon={<HomeIcon className="size-4" />}
            showDefaultAction={false}
            collapsible={flattenSections}
            defaultOpen={false}
            contentClassName="space-y-4"
          >
            <DetailField label="Descrizione casa" value={displayText(card?.descrizioneCasa)} />
            <div className={compactGridClassName}>
              <DetailField label="Metratura casa" value={displayText(card?.metraturaCasa)} />
              <DetailField label="Sesso" value={displayText(card?.sesso)} />
            </div>
          </DetailSectionBlock>
        </div>

        <div {...sectionContainerProps?.animali}>
          <DetailSectionBlock
            title="Animali"
            icon={<CatIcon className="size-4" />}
            showDefaultAction={false}
            collapsible={flattenSections}
            defaultOpen={false}
            contentClassName="space-y-4"
          >
            <DetailField label="Animali in casa" value={displayText(card?.descrizioneAnimaliInCasa)} />
          </DetailSectionBlock>
        </div>

        <div {...sectionContainerProps?.mansioni}>
          <DetailSectionBlock
            title="Mansioni"
            icon={<BriefcaseIcon className="size-4" />}
            showDefaultAction={false}
            collapsible={flattenSections}
            defaultOpen={false}
            contentClassName="space-y-4"
          >
            <DetailField label="Mansioni richieste" value={displayText(card?.mansioniRichieste)} />
          </DetailSectionBlock>
        </div>

        <div {...sectionContainerProps?.["richieste-specifiche"]}>
          <DetailSectionBlock
            title="Richieste specifiche"
            icon={<ShieldCheckIcon className="size-4" />}
            showDefaultAction={false}
            collapsible={flattenSections}
            defaultOpen={false}
            contentClassName="space-y-4"
          >
          <div className={compactGridClassName}>
            <DetailField label="Richiesta patente" value={richiestaPatente} />
            <DetailField label="Richiesta trasferte" value={richiestaTrasferte} />
          </div>
          <div className={compactGridClassName}>
            <DetailField label="Richiesta ferie" value={richiestaFerie} />
            <DetailField label="Dettaglio patente" value={displayText(card?.patenteDettaglio)} />
          </div>
          <DetailField label="Descrizione trasferte" value={displayText(card?.descrizioneRichiestaTrasferte)} />
          <DetailField label="Descrizione ferie" value={displayText(card?.descrizioneRichiestaFerie)} />
          <DetailField label="Informazioni extra riservate" value={displayText(card?.informazioniExtraRiservate)} />
          </DetailSectionBlock>
        </div>

        {showTempistiche ? (
          <div {...sectionContainerProps?.tempistiche}>
            <DetailSectionBlock
              title="Tempistiche"
              icon={<TimerResetIcon className="size-4" />}
              showDefaultAction={false}
              collapsible={flattenSections}
              defaultOpen={false}
              contentClassName="space-y-4"
            >
              <DetailField label="Deadline" value={displayText(card?.deadlineMobile)} />
              <DetailField label="Disponibilita colloqui" value={displayText(card?.disponibilitaColloquiInPresenza)} />
              <DetailField label="Tipologia primo incontro" value={tipoIncontroLabel} />
            </DetailSectionBlock>
          </div>
        ) : null}
      </div>
    );
  }

  const flattenedContent = (
    <div className="space-y-4">
      <div {...sectionContainerProps?.["orari-frequenza"]}>
        <DetailSectionBlock
          title="Orari e frequenza"
          icon={<CalendarDaysIcon className="size-4" />}
          action={titleAction}
          showDefaultAction={false}
          collapsible={flattenSections}
          defaultOpen
          contentClassName="space-y-4"
        >
        <Field>
          <FieldLabel htmlFor="onboarding-orario-lavoro" className="font-semibold">
            Orario di lavoro
          </FieldLabel>
          <FieldDescription>
            Cerca di essere il più chiaro possibile e mantieni il formato del
            placeholder; in caso di più giornate specifica indicando
            &quot;OPPURE&quot;.
          </FieldDescription>
          <Input
            id="onboarding-orario-lavoro"
            placeholder="da lunedì a venerdì, dalle 9:00 alle 19:00"
            value={orarioDiLavoro}
            onChange={(event) => setOrarioDiLavoro(event.target.value)}
            onBlur={() => {
              void patchProcess({ orario_di_lavoro: orarioDiLavoro || null });
            }}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="onboarding-ore-settimanali">
              Ore Settimanali
            </FieldLabel>
            <Input
              id="onboarding-ore-settimanali"
              type="number"
              inputMode="numeric"
              min={0}
              max={52}
              value={oreSettimanali}
              placeholder="8"
              onChange={(event) =>
                setOreSettimanali(clampNumericInput(event.target.value, 52))
              }
              onBlur={() => {
                void patchProcess({ ore_settimanale: oreSettimanali || null });
              }}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="onboarding-giorni-settimanali">
              Giorni Settimanali
            </FieldLabel>
            <Input
              id="onboarding-giorni-settimanali"
              type="number"
              inputMode="numeric"
              min={0}
              max={7}
              value={giorniSettimanali}
              placeholder="8"
              onChange={(event) =>
                setGiorniSettimanali(clampNumericInput(event.target.value, 7))
              }
              onBlur={() => {
                void patchProcess({
                  numero_giorni_settimanali: giorniSettimanali || null,
                });
              }}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="onboarding-giornate-preferite">
              Giornate preferite
            </FieldLabel>
            <Combobox
              key={`giornate-preferite-${card?.id ?? "new"}`}
              multiple
              autoHighlight
              items={WEEKDAY_ITEMS}
              value={giornatePreferite}
              onValueChange={(nextValues) => {
                const normalized = normalizeWeekdayList(nextValues as string[]);
                setGiornatePreferite(normalized);
                void patchProcess({ preferenza_giorno: normalized });
              }}
            >
              <ComboboxChips
                ref={anchor}
                id="onboarding-giornate-preferite"
                className="w-full"
              >
                <ComboboxValue>
                  {(values) => (
                    <>
                      {values.map((value: string) => (
                        <ComboboxChip
                          key={value}
                          className={getTagClassName(getWeekdayColor(value))}
                        >
                          {value}
                        </ComboboxChip>
                      ))}
                      <ComboboxChipsInput />
                    </>
                  )}
                </ComboboxValue>
              </ComboboxChips>
              <ComboboxContent anchor={anchor}>
                <ComboboxEmpty>Nessun giorno trovato.</ComboboxEmpty>
                <ComboboxList>
                  {(item) => (
                    <ComboboxItem
                      key={item}
                      value={item}
                      className={getTagClassName(getWeekdayColor(item))}
                    >
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </Field>
        </div>
        </DetailSectionBlock>
      </div>

      <div {...sectionContainerProps?.["luogo-lavoro"]}>
        <DetailSectionBlock
          title="Luogo di lavoro"
          icon={<MapPinnedIcon className="size-4" />}
          showDefaultAction={false}
          collapsible={flattenSections}
          defaultOpen={false}
          contentClassName="space-y-4"
        >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="onboarding-provincia">Provincia</FieldLabel>
            <Select
              value={indirizzoProvincia}
              onValueChange={(next) => {
                setIndirizzoProvincia(next);
                void patchProcess({ indirizzo_prova_provincia: next || null });
              }}
            >
              <SelectTrigger id="onboarding-provincia" className="w-full">
                <SelectValue placeholder="Seleziona provincia" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="mi">Milano</SelectItem>
                  <SelectItem value="rm">Roma</SelectItem>
                  <SelectItem value="to">Torino</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="onboarding-cap">CAP</FieldLabel>
            <Input
              id="onboarding-cap"
              placeholder="20158"
              value={indirizzoCap}
              onChange={(event) => setIndirizzoCap(event.target.value)}
              onBlur={() => {
                void patchProcess({ indirizzo_prova_cap: indirizzoCap || null });
              }}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="onboarding-quartiere">Quartiere</FieldLabel>
            <Input
              id="onboarding-quartiere"
              value={indirizzoNote}
              onChange={(event) => setIndirizzoNote(event.target.value)}
              onBlur={() => {
                void patchProcess({ indirizzo_prova_note: indirizzoNote || null });
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="onboarding-indirizzo-completo">
              Indirizzo completo
            </FieldLabel>
            <Input
              id="onboarding-indirizzo-completo"
              value={indirizzoCompleto}
              onChange={(event) => setIndirizzoCompleto(event.target.value)}
              onBlur={() => {
                const parts = indirizzoCompleto
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean);
                void patchProcess({
                  indirizzo_prova_via: parts[0] ?? null,
                  indirizzo_prova_civico: parts[1] ?? null,
                  indirizzo_prova_comune: parts[2] ?? null,
                  indirizzo_prova_cap: parts[3] ?? indirizzoCap ?? null,
                });
              }}
            />
          </Field>
        </div>

        <Field>
          <div className="mb-1 flex items-center gap-2">
            <FieldLabel>SRC Maps</FieldLabel>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(srcMapsUrl, "SRC Maps")}
              aria-label="Copia SRC Maps"
            >
              <CopyIcon className="size-4" />
            </Button>
          </div>
          <FieldDescription>
            <a
              href={srcMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2"
            >
              {srcMapsUrl}
            </a>
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="onboarding-src-maps-edit">SRC Maps URL</FieldLabel>
          <Input
            id="onboarding-src-maps-edit"
            value={srcMapsUrl}
            onChange={(event) => setSrcMapsUrl(event.target.value)}
            onBlur={() => {
              void patchProcess({ src_embed_maps_annucio: srcMapsUrl || null });
            }}
          />
        </Field>
        </DetailSectionBlock>
      </div>

      <OnboardingDecisioneLavoroSection
        checkboxDefaults={checkboxDefaults}
        lookupOptionsByField={lookupOptionsByField}
        defaults={{
          nucleoFamigliare: card?.nucleoFamigliare,
          descrizioneCasa: card?.descrizioneCasa,
          metraturaCasa: card?.metraturaCasa,
          descrizioneAnimaliInCasa: card?.descrizioneAnimaliInCasa,
          mansioniRichieste: card?.mansioniRichieste,
          informazioniExtraRiservate: card?.informazioniExtraRiservate,
          etaMinima: card?.etaMinima,
          etaMassima: card?.etaMassima,
          descrizioneRichiestaTrasferte: card?.descrizioneRichiestaTrasferte,
          descrizioneRichiestaFerie: card?.descrizioneRichiestaFerie,
          patenteDettaglio: card?.patenteDettaglio,
          sesso: card?.sesso,
          richiestaPatente: card?.richiestaPatente,
          richiestaTrasferte: card?.richiestaTrasferte,
          richiestaFerie: card?.richiestaFerie,
        }}
        onPatchProcess={patchProcess}
        useSectionBlocks
        sectionContainerProps={{
          famiglia: sectionContainerProps?.famiglia,
          casa: sectionContainerProps?.casa,
          animali: sectionContainerProps?.animali,
          mansioni: sectionContainerProps?.mansioni,
          "richieste-specifiche":
            sectionContainerProps?.["richieste-specifiche"],
        }}
      />

      {showTempistiche ? (
        <div {...sectionContainerProps?.tempistiche}>
          <DetailSectionBlock
            title="Tempistiche"
            icon={<TimerResetIcon className="size-4" />}
            showDefaultAction={false}
            collapsible={flattenSections}
            defaultOpen={false}
            contentClassName="space-y-4"
          >
          <Field>
            <FieldLabel htmlFor="onboarding-deadline">Deadline</FieldLabel>
            <DatePicker
              value={deadline}
              onValueChange={(next) => {
                setDeadline(next);
                void patchProcess({
                  deadline_mobile: next ? toIsoDate(next) : null,
                });
              }}
              placeholder="dd/mm/yyyy"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="onboarding-disponibilita-incontro">
              Inserire 3 disponibilità di giorno e fascia oraria, es. 12/10 dalle 8 alle 12
            </FieldLabel>
            <Input
              id="onboarding-disponibilita-incontro"
              value={disponibilitaColloqui}
              onChange={(event) => setDisponibilitaColloqui(event.target.value)}
              onBlur={() => {
                void patchProcess({
                  disponibilita_colloqui_in_presenza:
                    disponibilitaColloqui || null,
                });
              }}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="onboarding-tipologia-primo-incontro">
              Seleziona la tipologia del primo incontro
            </FieldLabel>
            <Select
              value={tipoIncontro}
              onValueChange={(next) => {
                setTipoIncontro(next);
                void patchProcess({
                  tipo_incontro_famiglia_lavoratore: next || null,
                });
              }}
            >
              <SelectTrigger id="onboarding-tipologia-primo-incontro" className="w-full">
                <SelectValue placeholder="Seleziona tipologia" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {tipoIncontroOptions.map((option) => (
                    <SelectItem key={option.valueKey} value={option.valueKey}>
                      {option.valueLabel}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <div className="mb-1 flex items-center gap-2">
              <FieldLabel>Preventivo da inviare</FieldLabel>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(preventivoUrl, "Preventivo")}
                aria-label="Copia link preventivo"
              >
                <CopyIcon className="size-4" />
              </Button>
            </div>
            <FieldDescription>
              <a
                href={preventivoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2 break-all"
              >
                {preventivoUrl}
              </a>
            </FieldDescription>
            <Input
              id="onboarding-preventivo-url"
              value={preventivoUrl}
              onChange={(event) => setPreventivoUrl(event.target.value)}
            />
          </Field>
          </DetailSectionBlock>
        </div>
      ) : null}
    </div>
  );

  if (flattenSections) {
    return flattenedContent;
  }

  return (
    <CrmDetailCard title={showTitle ? "Onboarding" : ""} titleAction={titleAction}>
      <FieldGroup>
        <p className="text-base font-semibold">Orari e frequenza</p>
        <Field>
          <FieldLabel htmlFor="onboarding-orario-lavoro" className="font-semibold">
            Orario di lavoro
          </FieldLabel>
          <FieldDescription>
            Cerca di essere il più chiaro possibile e mantieni il formato del
            placeholder; in caso di più giornate specifica indicando
            &quot;OPPURE&quot;.
          </FieldDescription>
          <Input
            id="onboarding-orario-lavoro"
            placeholder="da lunedì a venerdì, dalle 9:00 alle 19:00"
            value={orarioDiLavoro}
            onChange={(event) => setOrarioDiLavoro(event.target.value)}
            onBlur={() => {
              void patchProcess({ orario_di_lavoro: orarioDiLavoro || null });
            }}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="onboarding-ore-settimanali">
              Ore Settimanali
            </FieldLabel>
            <Input
              id="onboarding-ore-settimanali"
              type="number"
              inputMode="numeric"
              min={0}
              max={52}
              value={oreSettimanali}
              placeholder="8"
              onChange={(event) =>
                setOreSettimanali(clampNumericInput(event.target.value, 52))
              }
              onBlur={() => {
                void patchProcess({ ore_settimanale: oreSettimanali || null });
              }}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="onboarding-giorni-settimanali">
              Giorni Settimanali
            </FieldLabel>
            <Input
              id="onboarding-giorni-settimanali"
              type="number"
              inputMode="numeric"
              min={0}
              max={7}
              value={giorniSettimanali}
              placeholder="8"
              onChange={(event) =>
                setGiorniSettimanali(clampNumericInput(event.target.value, 7))
              }
              onBlur={() => {
                void patchProcess({
                  numero_giorni_settimanali: giorniSettimanali || null,
                });
              }}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="onboarding-giornate-preferite">
              Giornate preferite
            </FieldLabel>
            <Combobox
              key={`giornate-preferite-${card?.id ?? "new"}`}
              multiple
              autoHighlight
              items={WEEKDAY_ITEMS}
              value={giornatePreferite}
              onValueChange={(nextValues) => {
                const normalized = normalizeWeekdayList(nextValues as string[]);
                setGiornatePreferite(normalized);
                void patchProcess({ preferenza_giorno: normalized });
              }}
            >
              <ComboboxChips ref={anchor} id="onboarding-giornate-preferite" className="w-full">
                <ComboboxValue>
                  {(values) => (
                    <>
                      {values.map((value: string) => (
                        <ComboboxChip
                          key={value}
                          className={getTagClassName(getWeekdayColor(value))}
                        >
                          {value}
                        </ComboboxChip>
                      ))}
                      <ComboboxChipsInput />
                    </>
                  )}
                </ComboboxValue>
              </ComboboxChips>
              <ComboboxContent anchor={anchor}>
                <ComboboxEmpty>Nessun giorno trovato.</ComboboxEmpty>
                <ComboboxList>
                  {(item) => (
                    <ComboboxItem
                      key={item}
                      value={item}
                      className={getTagClassName(getWeekdayColor(item))}
                    >
                      {item}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </Field>
        </div>

        <Separator />

        <p className="text-base font-semibold">Descrizione lavoro</p>
        <OnboardingDecisioneLavoroSection
          checkboxDefaults={checkboxDefaults}
          lookupOptionsByField={lookupOptionsByField}
          defaults={{
            nucleoFamigliare: card?.nucleoFamigliare,
            descrizioneCasa: card?.descrizioneCasa,
            metraturaCasa: card?.metraturaCasa,
            descrizioneAnimaliInCasa: card?.descrizioneAnimaliInCasa,
            mansioniRichieste: card?.mansioniRichieste,
            informazioniExtraRiservate: card?.informazioniExtraRiservate,
            etaMinima: card?.etaMinima,
            etaMassima: card?.etaMassima,
            descrizioneRichiestaTrasferte: card?.descrizioneRichiestaTrasferte,
            descrizioneRichiestaFerie: card?.descrizioneRichiestaFerie,
            patenteDettaglio: card?.patenteDettaglio,
            sesso: card?.sesso,
            richiestaPatente: card?.richiestaPatente,
            richiestaTrasferte: card?.richiestaTrasferte,
            richiestaFerie: card?.richiestaFerie,
          }}
          onPatchProcess={patchProcess}
        />

        <Separator />

        <p className="text-base font-semibold">Luogo di lavoro</p>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="onboarding-provincia">Provincia</FieldLabel>
              <Select
                value={indirizzoProvincia}
                onValueChange={(next) => {
                  setIndirizzoProvincia(next);
                  void patchProcess({ indirizzo_prova_provincia: next || null });
                }}
              >
                <SelectTrigger id="onboarding-provincia" className="w-full">
                  <SelectValue placeholder="Seleziona provincia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="mi">Milano</SelectItem>
                    <SelectItem value="rm">Roma</SelectItem>
                    <SelectItem value="to">Torino</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="onboarding-cap">CAP</FieldLabel>
              <Input
                id="onboarding-cap"
                placeholder="20158"
                value={indirizzoCap}
                onChange={(event) => setIndirizzoCap(event.target.value)}
                onBlur={() => {
                  void patchProcess({ indirizzo_prova_cap: indirizzoCap || null });
                }}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="onboarding-quartiere">Quartiere</FieldLabel>
              <Input
                id="onboarding-quartiere"
                value={indirizzoNote}
                onChange={(event) => setIndirizzoNote(event.target.value)}
                onBlur={() => {
                  void patchProcess({ indirizzo_prova_note: indirizzoNote || null });
                }}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="onboarding-indirizzo-completo">
                Indirizzo completo
              </FieldLabel>
              <Input
                id="onboarding-indirizzo-completo"
                value={indirizzoCompleto}
                onChange={(event) => setIndirizzoCompleto(event.target.value)}
                onBlur={() => {
                  const parts = indirizzoCompleto
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean);
                  void patchProcess({
                    indirizzo_prova_via: parts[0] ?? null,
                    indirizzo_prova_civico: parts[1] ?? null,
                    indirizzo_prova_comune: parts[2] ?? null,
                    indirizzo_prova_cap: parts[3] ?? indirizzoCap ?? null,
                  });
                }}
              />
            </Field>
          </div>
          <Field>
            <div className="mb-1 flex items-center gap-2">
              <FieldLabel>SRC Maps</FieldLabel>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(srcMapsUrl, "SRC Maps")}
                aria-label="Copia SRC Maps"
              >
                <CopyIcon className="size-4" />
              </Button>
            </div>
            <FieldDescription>
              <a
                href={srcMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2"
              >
                {srcMapsUrl}
              </a>
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="onboarding-src-maps-edit">SRC Maps URL</FieldLabel>
            <Input
              id="onboarding-src-maps-edit"
              value={srcMapsUrl}
              onChange={(event) => setSrcMapsUrl(event.target.value)}
              onBlur={() => {
                void patchProcess({ src_embed_maps_annucio: srcMapsUrl || null });
              }}
            />
          </Field>
        </div>

        {showTempistiche ? (
          <>
            <Separator />

            <p className="text-base font-semibold">Tempistiche</p>
            <div className="space-y-4">
              <Field>
                <FieldLabel htmlFor="onboarding-deadline">Deadline</FieldLabel>
                <DatePicker
                  value={deadline}
                  onValueChange={(next) => {
                    setDeadline(next);
                    void patchProcess({
                      deadline_mobile: next ? toIsoDate(next) : null,
                    });
                  }}
                  placeholder="dd/mm/yyyy"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="onboarding-disponibilita-incontro">
                  Inserire 3 disponibilità di giorno e fascia oraria, es. 12/10 dalle 8 alle 12
                </FieldLabel>
                <Input
                  id="onboarding-disponibilita-incontro"
                  value={disponibilitaColloqui}
                  onChange={(event) => setDisponibilitaColloqui(event.target.value)}
                  onBlur={() => {
                    void patchProcess({
                      disponibilita_colloqui_in_presenza:
                        disponibilitaColloqui || null,
                    });
                  }}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="onboarding-tipologia-primo-incontro">
                  Seleziona la tipologia del primo incontro
                </FieldLabel>
                <Select
                  value={tipoIncontro}
                  onValueChange={(next) => {
                    setTipoIncontro(next);
                    void patchProcess({
                      tipo_incontro_famiglia_lavoratore: next || null,
                    });
                  }}
                >
                  <SelectTrigger id="onboarding-tipologia-primo-incontro" className="w-full">
                    <SelectValue placeholder="Seleziona tipologia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {tipoIncontroOptions.map((option) => (
                        <SelectItem key={option.valueKey} value={option.valueKey}>
                          {option.valueLabel}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <div className="mb-1 flex items-center gap-2">
                  <FieldLabel>Preventivo da inviare</FieldLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(preventivoUrl, "Preventivo")}
                    aria-label="Copia link preventivo"
                  >
                    <CopyIcon className="size-4" />
                  </Button>
                </div>
                <FieldDescription>
                  <a
                    href={preventivoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-2 break-all"
                  >
                    {preventivoUrl}
                  </a>
                </FieldDescription>
                <Input
                  id="onboarding-preventivo-url"
                  value={preventivoUrl}
                  onChange={(event) => setPreventivoUrl(event.target.value)}
                />
              </Field>
            </div>
          </>
        ) : null}
      </FieldGroup>
    </CrmDetailCard>
  );
}
