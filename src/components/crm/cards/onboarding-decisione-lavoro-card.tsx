import * as React from "react";
import type { ReactNode } from "react";
import {
  BriefcaseIcon,
  CatIcon,
  HomeIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";

import { CrmDetailCard } from "@/components/crm/detail-card";
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card";
import { Checkbox } from "@/components/ui-next/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui-next/field";
import { Input } from "@/components/ui-next/input";
import { Textarea } from "@/components/ui-next/textarea";
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
} from "@/components/ui-next/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui-next/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui-next/radio-group";
import type { LookupOptionsByField } from "@/hooks/use-crm-pipeline-preview";

export type OnboardingDecisioneLavoroCheckboxDefaults = Partial<
  Record<string, boolean>
>;

type LookupOption = LookupOptionsByField[string][number];

type OnboardingDecisioneLavoroDefaults = {
  nucleoFamigliare?: string;
  descrizioneCasa?: string;
  metraturaCasa?: string;
  descrizioneAnimaliInCasa?: string;
  mansioniRichieste?: string;
  informazioniExtraRiservate?: string;
  etaMinima?: string;
  etaMassima?: string;
  descrizioneRichiestaTrasferte?: string;
  descrizioneRichiestaFerie?: string;
  patenteDettaglio?: string;
  sesso?: string | null;
  richiestaPatente?: boolean;
  richiestaTrasferte?: boolean;
  richiestaFerie?: boolean;
};

export type OnboardingDecisioneLavoroSectionKey =
  | "famiglia"
  | "casa"
  | "animali"
  | "mansioni"
  | "richieste-specifiche";

function toInputValue(value: string | null | undefined) {
  if (!value) return "";
  const normalized = value.trim();
  if (!normalized || normalized === "-") return "";
  return normalized;
}

function numbersOnly(value: string) {
  return value.replace(/[^\d]/g, "");
}

function clampNumberInRange(value: string, min: number, max: number) {
  const digits = numbersOnly(value);
  if (!digits) return "";
  const parsed = Number.parseInt(digits, 10);
  if (Number.isNaN(parsed)) return "";
  return String(Math.max(min, Math.min(parsed, max)));
}

function CheckboxRow({
  id,
  label,
  defaultChecked = false,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: ReactNode;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}) {
  const isControlled = typeof checked === "boolean";
  return (
    <Field orientation="horizontal">
      <Checkbox
        id={id}
        {...(isControlled
          ? {
              checked,
              onCheckedChange: (value) => onCheckedChange?.(Boolean(value)),
            }
          : { defaultChecked })}
      />
      <FieldLabel htmlFor={id} className="font-normal">
        {label}
      </FieldLabel>
    </Field>
  );
}

function CheckboxGroupSet({
  legend,
  description,
  children,
}: {
  legend: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <FieldSet>
      <FieldLegend variant="label">{legend}</FieldLegend>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <FieldGroup className="gap-3">{children}</FieldGroup>
    </FieldSet>
  );
}

function LookupMultiComboboxField({
  id,
  label,
  options,
}: {
  id: string;
  label: string;
  options: LookupOption[];
}) {
  const anchor = useComboboxAnchor();

  const labels = React.useMemo(
    () =>
      Array.from(
        new Set(
          options
            .map((option) => option.valueLabel?.trim())
            .filter((option): option is string => Boolean(option)),
        ),
      ),
    [options],
  );

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Combobox multiple autoHighlight items={labels}>
        <ComboboxChips ref={anchor} id={id} className="w-full">
          <ComboboxValue>
            {(values) => (
              <>
                {values.map((value: string) => (
                  <ComboboxChip key={value}>{value}</ComboboxChip>
                ))}
                <ComboboxChipsInput />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor} className="max-h-80">
          <ComboboxEmpty>Nessuna nazionalità trovata.</ComboboxEmpty>
          <ComboboxList className="max-h-72">
            {(item) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  );
}

function SectionWrapper({
  title,
  icon,
  titleAction,
  children,
  useSectionBlocks,
  collapsible = false,
  defaultOpen = true,
  containerProps,
}: {
  title: string;
  icon: ReactNode;
  titleAction?: ReactNode;
  children: ReactNode;
  useSectionBlocks: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
  containerProps?: React.ComponentProps<"div">;
}) {
  if (useSectionBlocks) {
    return (
      <div {...containerProps}>
        <DetailSectionBlock
          title={title}
          icon={icon}
          action={titleAction}
          showDefaultAction={false}
          collapsible={collapsible}
          defaultOpen={defaultOpen}
          contentClassName="space-y-4"
        >
          {children}
        </DetailSectionBlock>
      </div>
    );
  }

  return (
    <div
      {...containerProps}
      className="rounded-xl bg-muted/60 p-4 space-y-4"
    >
      {children}
    </div>
  );
}

export function OnboardingDecisioneLavoroCard() {
  return (
    <CrmDetailCard title="Onboarding - Descisione lavoro">
      <OnboardingDecisioneLavoroSection />
    </CrmDetailCard>
  );
}

export function OnboardingDecisioneLavoroSection({
  checkboxDefaults,
  lookupOptionsByField,
  defaults,
  onPatchProcess,
  useSectionBlocks = false,
  sectionContainerProps,
  titleAction,
  sectionsCollapsible,
  firstSectionDefaultOpen = true,
  sectionsDefaultOpen = false,
  showFamiglia = true,
  showCasa = true,
  showAnimali = true,
  showMansioni = true,
  showRichiesteSpecifiche = true,
}: {
  checkboxDefaults?: OnboardingDecisioneLavoroCheckboxDefaults;
  lookupOptionsByField?: LookupOptionsByField;
  defaults?: OnboardingDecisioneLavoroDefaults;
  onPatchProcess?: (patch: Record<string, unknown>) => void | Promise<void>;
  useSectionBlocks?: boolean;
  titleAction?: ReactNode;
  sectionsCollapsible?: boolean;
  firstSectionDefaultOpen?: boolean;
  sectionsDefaultOpen?: boolean;
  showFamiglia?: boolean;
  showCasa?: boolean;
  showAnimali?: boolean;
  showMansioni?: boolean;
  showRichiesteSpecifiche?: boolean;
  sectionContainerProps?: Partial<
    Record<OnboardingDecisioneLavoroSectionKey, React.ComponentProps<"div">>
  >;
} = {}) {
  const isChecked = (id: string) => checkboxDefaults?.[id] ?? false;
  const nazionalitaEscluseOptions =
    lookupOptionsByField?.nazionalita_escluse ?? [];
  const nazionalitaObbligatorieOptions =
    lookupOptionsByField?.nazionalita_obbligatorie ?? [];
  const [richiestaTrasferte, setRichiestaTrasferte] = React.useState(
    defaults?.richiestaTrasferte ?? isChecked("onboarding-trasferte-si"),
  );
  const [richiestaFerie, setRichiestaFerie] = React.useState(
    defaults?.richiestaFerie ?? isChecked("onboarding-ferie-si"),
  );
  const [richiestaPatente, setRichiestaPatente] = React.useState(
    defaults?.richiestaPatente ?? isChecked("onboarding-patente-si"),
  );
  const [descrizioneTrasferte, setDescrizioneTrasferte] = React.useState(
    toInputValue(defaults?.descrizioneRichiestaTrasferte),
  );
  const [descrizioneFerie, setDescrizioneFerie] = React.useState(
    toInputValue(defaults?.descrizioneRichiestaFerie),
  );
  const [patenteDettaglio, setPatenteDettaglio] = React.useState(
    toInputValue(defaults?.patenteDettaglio),
  );
  const [nucleoFamigliare, setNucleoFamigliare] = React.useState(
    toInputValue(defaults?.nucleoFamigliare),
  );
  const [descrizioneCasa, setDescrizioneCasa] = React.useState(
    toInputValue(defaults?.descrizioneCasa),
  );
  const [metraturaCasa, setMetraturaCasa] = React.useState(
    numbersOnly(toInputValue(defaults?.metraturaCasa)),
  );
  const [descrizioneAnimaliInCasa, setDescrizioneAnimaliInCasa] = React.useState(
    toInputValue(defaults?.descrizioneAnimaliInCasa),
  );
  const [mansioniRichieste, setMansioniRichieste] = React.useState(
    toInputValue(defaults?.mansioniRichieste),
  );
  const [informazioniExtraRiservate, setInformazioniExtraRiservate] =
    React.useState(toInputValue(defaults?.informazioniExtraRiservate));
  const [etaMin, setEtaMin] = React.useState(
    clampNumberInRange(toInputValue(defaults?.etaMinima), 20, 80),
  );
  const [etaMax, setEtaMax] = React.useState(
    clampNumberInRange(toInputValue(defaults?.etaMassima), 20, 80),
  );
  const [genere, setGenere] = React.useState<"donna" | "uomo" | "">(
    toInputValue(defaults?.sesso).toLowerCase() === "donna"
      ? "donna"
      : toInputValue(defaults?.sesso).toLowerCase() === "uomo"
        ? "uomo"
        : "",
  );

  React.useEffect(() => {
    setRichiestaTrasferte(
      defaults?.richiestaTrasferte ?? isChecked("onboarding-trasferte-si"),
    );
    setRichiestaFerie(
      defaults?.richiestaFerie ?? isChecked("onboarding-ferie-si"),
    );
    setRichiestaPatente(
      defaults?.richiestaPatente ?? isChecked("onboarding-patente-si"),
    );
    setGenere(
      toInputValue(defaults?.sesso).toLowerCase() === "donna"
        ? "donna"
        : toInputValue(defaults?.sesso).toLowerCase() === "uomo"
          ? "uomo"
          : "",
    );
  }, [
    checkboxDefaults,
    defaults?.richiestaTrasferte,
    defaults?.richiestaFerie,
    defaults?.richiestaPatente,
    defaults?.sesso,
  ]);

  React.useEffect(() => {
    setDescrizioneTrasferte(
      toInputValue(defaults?.descrizioneRichiestaTrasferte),
    );
    setDescrizioneFerie(toInputValue(defaults?.descrizioneRichiestaFerie));
    setPatenteDettaglio(toInputValue(defaults?.patenteDettaglio));
    setNucleoFamigliare(toInputValue(defaults?.nucleoFamigliare));
    setDescrizioneCasa(toInputValue(defaults?.descrizioneCasa));
    setMetraturaCasa(numbersOnly(toInputValue(defaults?.metraturaCasa)));
    setDescrizioneAnimaliInCasa(toInputValue(defaults?.descrizioneAnimaliInCasa));
    setMansioniRichieste(toInputValue(defaults?.mansioniRichieste));
    setInformazioniExtraRiservate(
      toInputValue(defaults?.informazioniExtraRiservate),
    );
    setEtaMin(clampNumberInRange(toInputValue(defaults?.etaMinima), 20, 80));
    setEtaMax(clampNumberInRange(toInputValue(defaults?.etaMassima), 20, 80));
  }, [
    defaults?.descrizioneRichiestaTrasferte,
    defaults?.descrizioneRichiestaFerie,
    defaults?.patenteDettaglio,
    defaults?.nucleoFamigliare,
    defaults?.descrizioneCasa,
    defaults?.metraturaCasa,
    defaults?.descrizioneAnimaliInCasa,
    defaults?.mansioniRichieste,
    defaults?.informazioniExtraRiservate,
    defaults?.etaMinima,
    defaults?.etaMassima,
  ]);

  const patchProcess = React.useCallback(
    async (patch: Record<string, unknown>) => {
      await onPatchProcess?.(patch);
    },
    [onPatchProcess],
  );
  const shouldCollapseSections = sectionsCollapsible ?? useSectionBlocks;

  const patenteOptions = React.useMemo(() => {
    const fromLookup = lookupOptionsByField?.patente ?? [];
    if (fromLookup.length > 0) return fromLookup;
    return [
      {
        valueKey: "solo_patente",
        valueLabel: "Solo patente",
        color: null,
        sortOrder: 1,
      },
      {
        valueKey: "patente_e_macchina",
        valueLabel: "Patente e macchina",
        color: null,
        sortOrder: 2,
      },
    ];
  }, [lookupOptionsByField]);

  return (
    <FieldGroup>
      {showFamiglia ? (
      <SectionWrapper
        title="Famiglia"
        icon={<UsersIcon className="size-4" />}
        titleAction={titleAction}
        useSectionBlocks={useSectionBlocks}
        collapsible={shouldCollapseSections}
        defaultOpen={firstSectionDefaultOpen}
        containerProps={sectionContainerProps?.famiglia}
      >
        <Field>
          <FieldLabel
            htmlFor="onboarding-famiglia-note"
            className="font-semibold"
          >
            Famiglia
          </FieldLabel>
          <Input
            id="onboarding-famiglia-note"
            placeholder="indica situazioni o casi particolari sul nucleo familiare"
            value={nucleoFamigliare}
            onChange={(event) => setNucleoFamigliare(event.target.value)}
            onBlur={() => {
              void patchProcess({ nucleo_famigliare: nucleoFamigliare || null });
            }}
          />
        </Field>

        <div className="space-y-3">
          <FieldSet>
            <FieldGroup className="gap-3">
              <CheckboxRow
                id="onboarding-neonati"
                label="Sono presenti neonati"
                defaultChecked={isChecked("onboarding-neonati")}
              />
            </FieldGroup>
          </FieldSet>
          <FieldSet>
            <FieldGroup className="gap-3">
              <CheckboxRow
                id="onboarding-piu-bambini"
                label="Deve accudire più di un bambino?"
                defaultChecked={isChecked("onboarding-piu-bambini")}
              />
            </FieldGroup>
          </FieldSet>
          <FieldSet>
            <FieldGroup className="gap-3">
              <CheckboxRow
                id="onboarding-famiglia-4"
                label="Famiglia 4+ persone"
                defaultChecked={isChecked("onboarding-famiglia-4")}
              />
            </FieldGroup>
          </FieldSet>
        </div>
      </SectionWrapper>
      ) : null}

      {showCasa ? (
      <SectionWrapper
        title="Casa"
        icon={<HomeIcon className="size-4" />}
        titleAction={titleAction}
        useSectionBlocks={useSectionBlocks}
        collapsible={shouldCollapseSections}
        defaultOpen={sectionsDefaultOpen}
        containerProps={sectionContainerProps?.casa}
      >
        <Field>
          <FieldLabel
            htmlFor="onboarding-casa-desc"
            className="font-semibold"
          >
            Casa
          </FieldLabel>
          <Input
            id="onboarding-casa-desc"
            placeholder="Descrizione della casa"
            value={descrizioneCasa}
            onChange={(event) => setDescrizioneCasa(event.target.value)}
            onBlur={() => {
              void patchProcess({ descrizione_casa: descrizioneCasa || null });
            }}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="onboarding-casa-mq">Metratura casa</FieldLabel>
          <Input
            id="onboarding-casa-mq"
            type="number"
            inputMode="numeric"
            min={0}
            value={metraturaCasa}
            onChange={(event) => setMetraturaCasa(numbersOnly(event.target.value))}
            placeholder="120"
            onBlur={() => {
              void patchProcess({ metratura_casa: metraturaCasa || null });
            }}
          />
        </Field>
      </SectionWrapper>
      ) : null}

      {showAnimali ? (
      <SectionWrapper
        title="Animali"
        icon={<CatIcon className="size-4" />}
        titleAction={titleAction}
        useSectionBlocks={useSectionBlocks}
        collapsible={shouldCollapseSections}
        defaultOpen={sectionsDefaultOpen}
        containerProps={sectionContainerProps?.animali}
      >
        <Field>
          <FieldLabel
            htmlFor="onboarding-animali-note"
            className="font-semibold"
          >
            Animali
          </FieldLabel>
          <Input
            id="onboarding-animali-note"
            placeholder="Ci sono 3 gatti e un cane"
            value={descrizioneAnimaliInCasa}
            onChange={(event) => setDescrizioneAnimaliInCasa(event.target.value)}
            onBlur={() => {
              void patchProcess({
                descrizione_animali_in_casa: descrizioneAnimaliInCasa || null,
              });
            }}
          />
        </Field>

        <div className="space-y-3">
          <CheckboxGroupSet legend="Ci sono dei cani?">
            <CheckboxRow
              id="onboarding-cani-piccoli"
              label="Si, di taglia media o inferiore"
              defaultChecked={isChecked("onboarding-cani-piccoli")}
            />
            <CheckboxRow
              id="onboarding-cani-grandi"
              label="Si, di taglia grande"
              defaultChecked={isChecked("onboarding-cani-grandi")}
            />
          </CheckboxGroupSet>
          <FieldSet>
            <FieldLegend variant="label">Ci sono dei gatti?</FieldLegend>
            <FieldGroup className="gap-3">
              <CheckboxRow
                id="onboarding-gatti"
                label="Si"
                defaultChecked={isChecked("onboarding-gatti")}
              />
            </FieldGroup>
          </FieldSet>
        </div>
      </SectionWrapper>
      ) : null}

      {showMansioni ? (
      <SectionWrapper
        title="Mansioni"
        icon={<BriefcaseIcon className="size-4" />}
        titleAction={titleAction}
        useSectionBlocks={useSectionBlocks}
        collapsible={shouldCollapseSections}
        defaultOpen={sectionsDefaultOpen}
        containerProps={sectionContainerProps?.mansioni}
      >
        <Field>
          <FieldLabel
            htmlFor="onboarding-mansioni-note"
            className="font-semibold"
          >
            Mansioni
          </FieldLabel>
          <Textarea
            id="onboarding-mansioni-note"
            rows={4}
            placeholder='Inserire solo le mansioni "particolari" Es: deve saper essere una massima esperta di orchidee da competizione'
            value={mansioniRichieste}
            onChange={(event) => setMansioniRichieste(event.target.value)}
            onBlur={() => {
              void patchProcess({ mansioni_richieste: mansioniRichieste || null });
            }}
          />
        </Field>

        <CheckboxGroupSet legend="Pulizie">
          <CheckboxRow
            id="onboarding-ripiani-alti-si"
            label="Deve pulire ripiani alti usando se necessario scale?"
            defaultChecked={isChecked("onboarding-ripiani-alti-si")}
          />
        </CheckboxGroupSet>

        <CheckboxGroupSet legend="Deve stirare:">
          <CheckboxRow
            id="onboarding-stirare-si"
            label="Si"
            defaultChecked={isChecked("onboarding-stirare-si")}
          />
          <CheckboxRow
            id="onboarding-stirare-difficile"
            label="Si e abiti difficile"
            defaultChecked={isChecked("onboarding-stirare-difficile")}
          />
        </CheckboxGroupSet>

        <CheckboxGroupSet legend="Deve cucinare:">
          <CheckboxRow
            id="onboarding-cucinare-si"
            label="Si"
            defaultChecked={isChecked("onboarding-cucinare-si")}
          />
          <CheckboxRow
            id="onboarding-cucinare-elaborati"
            label="Si e piatti elaborati"
            defaultChecked={isChecked("onboarding-cucinare-elaborati")}
          />
        </CheckboxGroupSet>

        <CheckboxGroupSet legend="Giardino">
          <CheckboxRow
            id="onboarding-giardino-si"
            label="È richiesta la cura del giardino?"
            defaultChecked={isChecked("onboarding-giardino-si")}
          />
        </CheckboxGroupSet>
      </SectionWrapper>
      ) : null}

      {showRichiesteSpecifiche ? (
      <SectionWrapper
        title="Richieste specifiche"
        icon={<ShieldCheckIcon className="size-4" />}
        titleAction={titleAction}
        useSectionBlocks={useSectionBlocks}
        collapsible={shouldCollapseSections}
        defaultOpen={sectionsDefaultOpen}
        containerProps={sectionContainerProps?.["richieste-specifiche"]}
      >
        <Field>
          <FieldLabel htmlFor="onboarding-altre-info">
            Note private del recruiter
          </FieldLabel>
          <Textarea
            id="onboarding-altre-info"
            rows={4}
            placeholder="Informazioni extra riservate"
            value={informazioniExtraRiservate}
            onChange={(event) =>
              setInformazioniExtraRiservate(event.target.value)
            }
            onBlur={() => {
              void patchProcess({
                informazioni_extra_riservate: informazioniExtraRiservate || null,
              });
            }}
          />
        </Field>

        <FieldSet>
          <FieldGroup className="gap-3">
            <CheckboxRow
              id="onboarding-italiano-si"
              label="Deve comunicare spesso in italiano?"
              defaultChecked={isChecked("onboarding-italiano-si")}
            />
          </FieldGroup>
        </FieldSet>

        <FieldSet>
          <FieldGroup className="gap-3">
            <CheckboxRow
              id="onboarding-inglese-si"
              label="Deve comunicare spesso in inglese?"
              defaultChecked={isChecked("onboarding-inglese-si")}
            />
          </FieldGroup>
        </FieldSet>

        <FieldSet>
          <FieldLegend variant="label">Genere</FieldLegend>
          <RadioGroup
            value={genere}
            onValueChange={(value) => {
              const next = value === "donna" || value === "uomo" ? value : "";
              setGenere(next);
              void patchProcess({ sesso: next || null });
            }}
            className="gap-3"
          >
            <Field orientation="horizontal">
              <RadioGroupItem id="onboarding-genere-donna" value="donna" />
              <FieldLabel
                htmlFor="onboarding-genere-donna"
                className="font-normal"
              >
                Donna
              </FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem id="onboarding-genere-uomo" value="uomo" />
              <FieldLabel
                htmlFor="onboarding-genere-uomo"
                className="font-normal"
              >
                Uomo
              </FieldLabel>
            </Field>
          </RadioGroup>
        </FieldSet>

        <FieldLegend variant="label">Vincoli Operativi</FieldLegend>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FieldSet>
            <FieldGroup className="gap-3">
              <CheckboxRow
                id="onboarding-trasferte-si"
                label="Chiedono trasferte?"
                checked={richiestaTrasferte}
                onCheckedChange={(checked) => {
                  setRichiestaTrasferte(checked);
                  void patchProcess({ richiesta_trasferte: checked });
                }}
              />
            </FieldGroup>
          </FieldSet>
          {richiestaTrasferte ? (
            <Field>
              <FieldLabel htmlFor="onboarding-trasferte-desc">
                Che trasferte bisogna fare?
              </FieldLabel>
              <Input
                id="onboarding-trasferte-desc"
                value={descrizioneTrasferte}
                onChange={(event) => setDescrizioneTrasferte(event.target.value)}
                onBlur={() => {
                  void patchProcess({
                    descrizione_richiesta_trasferte:
                      descrizioneTrasferte || null,
                  });
                }}
              />
            </Field>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FieldSet>
            <FieldGroup className="gap-3">
              <CheckboxRow
                id="onboarding-ferie-si"
                label="Richieste specifiche su ferie?"
                checked={richiestaFerie}
                onCheckedChange={(checked) => {
                  setRichiestaFerie(checked);
                  void patchProcess({ richiesta_ferie: checked });
                }}
              />
            </FieldGroup>
          </FieldSet>
          {richiestaFerie ? (
            <Field>
              <FieldLabel htmlFor="onboarding-ferie-desc">
                Che ferie richiedono?
              </FieldLabel>
              <Input
                id="onboarding-ferie-desc"
                value={descrizioneFerie}
                onChange={(event) => setDescrizioneFerie(event.target.value)}
                onBlur={() => {
                  void patchProcess({
                    descrizione_richiesta_ferie: descrizioneFerie || null,
                  });
                }}
              />
            </Field>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FieldSet>
            <FieldGroup className="gap-3">
              <CheckboxRow
                id="onboarding-patente-si"
                label="Chiedono patente?"
                checked={richiestaPatente}
                onCheckedChange={(checked) => {
                  setRichiestaPatente(checked);
                  void patchProcess({ richiesta_patente: checked });
                }}
              />
            </FieldGroup>
          </FieldSet>
          {richiestaPatente ? (
            <Field>
              <FieldLabel htmlFor="onboarding-patente-dettaglio">
                Serve solo patente o anche macchina?
              </FieldLabel>
              <Select
                value={patenteDettaglio}
                onValueChange={(next) => {
                  setPatenteDettaglio(next);
                  void patchProcess({ patente: next ? [next] : [] });
                }}
              >
                <SelectTrigger id="onboarding-patente-dettaglio" className="w-full">
                  <SelectValue placeholder="Seleziona opzione" />
                </SelectTrigger>
                <SelectContent>
                  {patenteOptions.map((option) => (
                    <SelectItem key={option.valueKey} value={option.valueLabel}>
                      {option.valueLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LookupMultiComboboxField
            id="onboarding-nazionalita-escluse"
            label="Nazionalità escluse"
            options={nazionalitaEscluseOptions}
          />

          <LookupMultiComboboxField
            id="onboarding-nazionalita-obbligatorie"
            label="Nazionalità obbligatorie"
            options={nazionalitaObbligatorieOptions}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="onboarding-eta-min">Età min</FieldLabel>
            <Input
              id="onboarding-eta-min"
              type="number"
              inputMode="numeric"
              min={20}
              max={80}
              value={etaMin}
              onChange={(event) =>
                setEtaMin(clampNumberInRange(event.target.value, 20, 80))
              }
              placeholder="20"
              onBlur={() => {
                void patchProcess({ eta_minima: etaMin || null });
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="onboarding-eta-max">Età max</FieldLabel>
            <Input
              id="onboarding-eta-max"
              type="number"
              inputMode="numeric"
              min={20}
              max={80}
              value={etaMax}
              onChange={(event) =>
                setEtaMax(clampNumberInRange(event.target.value, 20, 80))
              }
              placeholder="80"
              onBlur={() => {
                void patchProcess({ eta_massima: etaMax || null });
              }}
            />
          </Field>
        </div>

        <CheckboxGroupSet legend="Profilo famiglia">
          <CheckboxRow
            id="onboarding-esigente-si"
            label="Famiglia molto esigente"
            defaultChecked={isChecked("onboarding-esigente-si")}
          />
          <CheckboxRow
            id="onboarding-autonomia-si"
            label="Richiesta autonomia"
            defaultChecked={isChecked("onboarding-autonomia-si")}
          />
          <CheckboxRow
            id="onboarding-datore-presente-si"
            label="Datore spesso presente"
            defaultChecked={isChecked("onboarding-datore-presente-si")}
          />
          <CheckboxRow
            id="onboarding-discrezione-si"
            label="Richiesta discrezione"
            defaultChecked={isChecked("onboarding-discrezione-si")}
          />
        </CheckboxGroupSet>
      </SectionWrapper>
      ) : null}
    </FieldGroup>
  );
}
