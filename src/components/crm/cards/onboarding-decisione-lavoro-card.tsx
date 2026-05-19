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
import { CheckboxChip } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { LookupOptionsByField } from "@/hooks/use-crm-pipeline-preview";
import { cn } from "@/lib/utils";

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
  nazionalitaEscluse?: string[];
  nazionalitaObbligatorie?: string[];
  famigliaMoltoEsigente?: boolean;
  richiestaAutonomia?: boolean;
  datoreSpessoPresente?: boolean;
  richiestaDiscrezione?: boolean;
  comunicareBeneItaliano?: boolean;
  comunicareBeneInglese?: boolean;
  presenzaNeonati?: boolean;
  piuBambini?: boolean;
  famiglia4Persone?: boolean;
  caniPiccoli?: boolean;
  caniGrandi?: boolean;
  gatti?: boolean;
  pulireRipianiAlti?: boolean;
  stirare?: boolean;
  stirareAbitiDifficili?: boolean;
  cucinare?: boolean;
  cucinareElaborato?: boolean;
  curaPiante?: boolean;
};

const REQUIRED_FIELD_CLASS =
  "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30";
const AGE_MIN = 18;
const AGE_MAX = 99;

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

function normalizeAgeInput(value: string) {
  return clampNumberInRange(value, AGE_MIN, AGE_MAX);
}

function normalizeGenderValue(value: string | null | undefined): "donna" | "uomo" | "indifferente" | "" {
  const normalized = toInputValue(value).toLowerCase();
  if (normalized === "donna" || normalized === "uomo" || normalized === "indifferente") {
    return normalized;
  }
  return "";
}

function normalizeStringArray(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
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
    <CheckboxChip
      id={id}
      {...(isControlled
        ? {
            checked,
            onCheckedChange: (value) => onCheckedChange?.(Boolean(value)),
          }
        : { defaultChecked })}
    >
      {label}
    </CheckboxChip>
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
      <FieldGroup className="flex-row flex-wrap gap-2">{children}</FieldGroup>
    </FieldSet>
  );
}

function LookupMultiComboboxField({
  id,
  label,
  options,
  value,
  onValueChange,
}: {
  id: string;
  label: string;
  options: LookupOption[];
  value: string[];
  onValueChange: (nextValues: string[]) => void;
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
      <Combobox
        multiple
        autoHighlight
        items={labels}
        value={value}
        onValueChange={(nextValues) => {
          onValueChange(
            Array.isArray(nextValues)
              ? nextValues.filter((item): item is string => typeof item === "string")
              : [],
          );
        }}
      >
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
  requiredMissingFields = [],
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
  requiredMissingFields?: string[];
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
    normalizeAgeInput(toInputValue(defaults?.etaMinima)),
  );
  const [etaMax, setEtaMax] = React.useState(
    normalizeAgeInput(toInputValue(defaults?.etaMassima)),
  );
  const [genere, setGenere] = React.useState<"donna" | "uomo" | "indifferente" | "">(
    normalizeGenderValue(defaults?.sesso),
  );
  const [nazionalitaEscluse, setNazionalitaEscluse] = React.useState(
    normalizeStringArray(defaults?.nazionalitaEscluse),
  );
  const [nazionalitaObbligatorie, setNazionalitaObbligatorie] = React.useState(
    normalizeStringArray(defaults?.nazionalitaObbligatorie),
  );
  const [persistedCheckboxes, setPersistedCheckboxes] = React.useState(() => ({
    presenza_neonati: defaults?.presenzaNeonati ?? isChecked("onboarding-neonati"),
    piu_bambini: defaults?.piuBambini ?? isChecked("onboarding-piu-bambini"),
    famiglia_4_persone: defaults?.famiglia4Persone ?? isChecked("onboarding-famiglia-4"),
    cani_piccoli: defaults?.caniPiccoli ?? isChecked("onboarding-cani-piccoli"),
    cani_grandi: defaults?.caniGrandi ?? isChecked("onboarding-cani-grandi"),
    gatti: defaults?.gatti ?? isChecked("onboarding-gatti"),
    pulire_ripiani_alti:
      defaults?.pulireRipianiAlti ?? isChecked("onboarding-ripiani-alti-si"),
    stirare: defaults?.stirare ?? isChecked("onboarding-stirare-si"),
    stirare_abiti_difficili:
      defaults?.stirareAbitiDifficili ?? isChecked("onboarding-stirare-difficile"),
    cucinare: defaults?.cucinare ?? isChecked("onboarding-cucinare-si"),
    cucinare_elaborato:
      defaults?.cucinareElaborato ?? isChecked("onboarding-cucinare-elaborati"),
    cura_piante: defaults?.curaPiante ?? isChecked("onboarding-giardino-si"),
    comunicare_bene_italiano:
      defaults?.comunicareBeneItaliano ?? isChecked("onboarding-italiano-si"),
    comunicare_bene_inglese:
      defaults?.comunicareBeneInglese ?? isChecked("onboarding-inglese-si"),
    famiglia_molto_esigente:
      defaults?.famigliaMoltoEsigente ?? isChecked("onboarding-esigente-si"),
    richiesta_autonomia:
      defaults?.richiestaAutonomia ?? isChecked("onboarding-autonomia-si"),
    datore_spesso_presente:
      defaults?.datoreSpessoPresente ?? isChecked("onboarding-datore-presente-si"),
    richiesta_discrezione:
      defaults?.richiestaDiscrezione ?? isChecked("onboarding-discrezione-si"),
  }));

  React.useEffect(() => {
    setRichiestaTrasferte(
      defaults?.richiestaTrasferte ?? checkboxDefaults?.["onboarding-trasferte-si"] ?? false,
    );
    setRichiestaFerie(
      defaults?.richiestaFerie ?? checkboxDefaults?.["onboarding-ferie-si"] ?? false,
    );
    setRichiestaPatente(
      defaults?.richiestaPatente ?? checkboxDefaults?.["onboarding-patente-si"] ?? false,
    );
    setGenere(normalizeGenderValue(defaults?.sesso));
    setPersistedCheckboxes({
      presenza_neonati: defaults?.presenzaNeonati ?? checkboxDefaults?.["onboarding-neonati"] ?? false,
      piu_bambini: defaults?.piuBambini ?? checkboxDefaults?.["onboarding-piu-bambini"] ?? false,
      famiglia_4_persone: defaults?.famiglia4Persone ?? checkboxDefaults?.["onboarding-famiglia-4"] ?? false,
      cani_piccoli: defaults?.caniPiccoli ?? checkboxDefaults?.["onboarding-cani-piccoli"] ?? false,
      cani_grandi: defaults?.caniGrandi ?? checkboxDefaults?.["onboarding-cani-grandi"] ?? false,
      gatti: defaults?.gatti ?? checkboxDefaults?.["onboarding-gatti"] ?? false,
      pulire_ripiani_alti:
        defaults?.pulireRipianiAlti ?? checkboxDefaults?.["onboarding-ripiani-alti-si"] ?? false,
      stirare: defaults?.stirare ?? checkboxDefaults?.["onboarding-stirare-si"] ?? false,
      stirare_abiti_difficili:
        defaults?.stirareAbitiDifficili ?? checkboxDefaults?.["onboarding-stirare-difficile"] ?? false,
      cucinare: defaults?.cucinare ?? checkboxDefaults?.["onboarding-cucinare-si"] ?? false,
      cucinare_elaborato:
        defaults?.cucinareElaborato ?? checkboxDefaults?.["onboarding-cucinare-elaborati"] ?? false,
      cura_piante: defaults?.curaPiante ?? checkboxDefaults?.["onboarding-giardino-si"] ?? false,
      comunicare_bene_italiano:
        defaults?.comunicareBeneItaliano ?? checkboxDefaults?.["onboarding-italiano-si"] ?? false,
      comunicare_bene_inglese:
        defaults?.comunicareBeneInglese ?? checkboxDefaults?.["onboarding-inglese-si"] ?? false,
      famiglia_molto_esigente:
        defaults?.famigliaMoltoEsigente ?? checkboxDefaults?.["onboarding-esigente-si"] ?? false,
      richiesta_autonomia:
        defaults?.richiestaAutonomia ?? checkboxDefaults?.["onboarding-autonomia-si"] ?? false,
      datore_spesso_presente:
        defaults?.datoreSpessoPresente ?? checkboxDefaults?.["onboarding-datore-presente-si"] ?? false,
      richiesta_discrezione:
        defaults?.richiestaDiscrezione ?? checkboxDefaults?.["onboarding-discrezione-si"] ?? false,
    });
  }, [
    checkboxDefaults,
    defaults?.richiestaTrasferte,
    defaults?.richiestaFerie,
    defaults?.richiestaPatente,
    defaults?.sesso,
    defaults?.presenzaNeonati,
    defaults?.piuBambini,
    defaults?.famiglia4Persone,
    defaults?.caniPiccoli,
    defaults?.caniGrandi,
    defaults?.gatti,
    defaults?.pulireRipianiAlti,
    defaults?.stirare,
    defaults?.stirareAbitiDifficili,
    defaults?.cucinare,
    defaults?.cucinareElaborato,
    defaults?.curaPiante,
    defaults?.comunicareBeneItaliano,
    defaults?.comunicareBeneInglese,
    defaults?.famigliaMoltoEsigente,
    defaults?.richiestaAutonomia,
    defaults?.datoreSpessoPresente,
    defaults?.richiestaDiscrezione,
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
    setEtaMin(normalizeAgeInput(toInputValue(defaults?.etaMinima)));
    setEtaMax(normalizeAgeInput(toInputValue(defaults?.etaMassima)));
    setNazionalitaEscluse(normalizeStringArray(defaults?.nazionalitaEscluse));
    setNazionalitaObbligatorie(
      normalizeStringArray(defaults?.nazionalitaObbligatorie),
    );
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
    defaults?.nazionalitaEscluse,
    defaults?.nazionalitaObbligatorie,
  ]);

  const patchProcess = React.useCallback(
    async (patch: Record<string, unknown>) => {
      await onPatchProcess?.(patch);
    },
    [onPatchProcess],
  );
  const patchCheckbox = React.useCallback(
    (field: keyof typeof persistedCheckboxes, checked: boolean) => {
      setPersistedCheckboxes((current) => ({ ...current, [field]: checked }));
      void patchProcess({ [field]: checked });
    },
    [patchProcess],
  );
  const shouldCollapseSections = sectionsCollapsible ?? useSectionBlocks;
  const isRequiredMissing = React.useCallback(
    (field: string) => requiredMissingFields.includes(field),
    [requiredMissingFields],
  );

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
        <Field invalid={isRequiredMissing("nucleoFamigliare")}>
          <FieldLabel
            htmlFor="onboarding-famiglia-note"
            className="font-semibold"
          >
            Famiglia
          </FieldLabel>
          <Input
            id="onboarding-famiglia-note"
            className={cn(isRequiredMissing("nucleoFamigliare") && REQUIRED_FIELD_CLASS)}
            placeholder="indica situazioni o casi particolari sul nucleo familiare"
            value={nucleoFamigliare}
            onChange={(event) => setNucleoFamigliare(event.target.value)}
            onBlur={() => {
              void patchProcess({ nucleo_famigliare: nucleoFamigliare || null });
            }}
          />
        </Field>

        <FieldSet>
          <FieldGroup className="flex-row flex-wrap gap-2">
            <CheckboxRow
              id="onboarding-neonati"
              label="Sono presenti neonati"
              checked={persistedCheckboxes.presenza_neonati}
              onCheckedChange={(checked) => patchCheckbox("presenza_neonati", checked)}
            />
            <CheckboxRow
              id="onboarding-piu-bambini"
              label="Deve accudire più di un bambino?"
              checked={persistedCheckboxes.piu_bambini}
              onCheckedChange={(checked) => patchCheckbox("piu_bambini", checked)}
            />
            <CheckboxRow
              id="onboarding-famiglia-4"
              label="Famiglia 4+ persone"
              checked={persistedCheckboxes.famiglia_4_persone}
              onCheckedChange={(checked) => patchCheckbox("famiglia_4_persone", checked)}
            />
          </FieldGroup>
        </FieldSet>
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
        <Field invalid={isRequiredMissing("descrizioneCasa")}>
          <FieldLabel
            htmlFor="onboarding-casa-desc"
            className="font-semibold"
          >
            Casa
          </FieldLabel>
          <Input
            id="onboarding-casa-desc"
            className={cn(isRequiredMissing("descrizioneCasa") && REQUIRED_FIELD_CLASS)}
            placeholder="Descrizione della casa"
            value={descrizioneCasa}
            onChange={(event) => setDescrizioneCasa(event.target.value)}
            onBlur={() => {
              void patchProcess({ descrizione_casa: descrizioneCasa || null });
            }}
          />
        </Field>

        <Field invalid={isRequiredMissing("metraturaCasa")}>
          <FieldLabel htmlFor="onboarding-casa-mq">Metratura casa</FieldLabel>
          <Input
            id="onboarding-casa-mq"
            className={cn(isRequiredMissing("metraturaCasa") && REQUIRED_FIELD_CLASS)}
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
        <Field invalid={isRequiredMissing("mansioniRichieste")}>
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
              checked={persistedCheckboxes.cani_piccoli}
              onCheckedChange={(checked) => patchCheckbox("cani_piccoli", checked)}
            />
            <CheckboxRow
              id="onboarding-cani-grandi"
              label="Si, di taglia grande"
              checked={persistedCheckboxes.cani_grandi}
              onCheckedChange={(checked) => patchCheckbox("cani_grandi", checked)}
            />
          </CheckboxGroupSet>
          <FieldSet>
            <FieldLegend variant="label">Ci sono dei gatti?</FieldLegend>
            <FieldGroup className="flex-row flex-wrap gap-2">
              <CheckboxRow
                id="onboarding-gatti"
                label="Si"
                checked={persistedCheckboxes.gatti}
                onCheckedChange={(checked) => patchCheckbox("gatti", checked)}
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
            className={cn(isRequiredMissing("mansioniRichieste") && REQUIRED_FIELD_CLASS)}
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
            label="Pulire ripiani/soffitti alti con scala"
            checked={persistedCheckboxes.pulire_ripiani_alti}
            onCheckedChange={(checked) => patchCheckbox("pulire_ripiani_alti", checked)}
          />
        </CheckboxGroupSet>

        <CheckboxGroupSet legend="Deve stirare:">
          <CheckboxRow
            id="onboarding-stirare-si"
            label="Sì"
            checked={persistedCheckboxes.stirare}
            onCheckedChange={(checked) => patchCheckbox("stirare", checked)}
          />
          <CheckboxRow
            id="onboarding-stirare-difficile"
            label="Sì, abiti difficili"
            checked={persistedCheckboxes.stirare_abiti_difficili}
            onCheckedChange={(checked) =>
              patchCheckbox("stirare_abiti_difficili", checked)
            }
          />
        </CheckboxGroupSet>

        <CheckboxGroupSet legend="Deve cucinare:">
          <CheckboxRow
            id="onboarding-cucinare-si"
            label="Sì"
            checked={persistedCheckboxes.cucinare}
            onCheckedChange={(checked) => patchCheckbox("cucinare", checked)}
          />
          <CheckboxRow
            id="onboarding-cucinare-elaborati"
            label="Sì, cucina elaborata"
            checked={persistedCheckboxes.cucinare_elaborato}
            onCheckedChange={(checked) => patchCheckbox("cucinare_elaborato", checked)}
          />
        </CheckboxGroupSet>

        <CheckboxGroupSet legend="Giardino">
          <CheckboxRow
            id="onboarding-giardino-si"
            label="Cura delle piante richiesta"
            checked={persistedCheckboxes.cura_piante}
            onCheckedChange={(checked) => patchCheckbox("cura_piante", checked)}
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

        <CheckboxGroupSet legend="Lingue">
          <CheckboxRow
            id="onboarding-italiano-si"
            label="Comunicare bene in italiano"
            checked={persistedCheckboxes.comunicare_bene_italiano}
            onCheckedChange={(checked) =>
              patchCheckbox("comunicare_bene_italiano", checked)
            }
          />
          <CheckboxRow
            id="onboarding-inglese-si"
            label="Comunicare bene in inglese"
            checked={persistedCheckboxes.comunicare_bene_inglese}
            onCheckedChange={(checked) =>
              patchCheckbox("comunicare_bene_inglese", checked)
            }
          />
        </CheckboxGroupSet>

        <FieldSet
          className={cn(
            isRequiredMissing("sesso") &&
              "rounded-md border border-destructive p-3 text-destructive",
          )}
        >
          <FieldLegend variant="label">Genere</FieldLegend>
          <RadioGroup
            value={genere}
            onValueChange={(value) => {
              const next = normalizeGenderValue(value);
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
            <Field orientation="horizontal">
              <RadioGroupItem id="onboarding-genere-indifferente" value="indifferente" />
              <FieldLabel
                htmlFor="onboarding-genere-indifferente"
                className="font-normal"
              >
                Indifferente
              </FieldLabel>
            </Field>
          </RadioGroup>
        </FieldSet>

        <FieldLegend variant="label">Vincoli Operativi</FieldLegend>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FieldSet>
            <FieldGroup className="flex-row flex-wrap gap-2">
              <CheckboxRow
                id="onboarding-trasferte-si"
                label="Trasferte richieste"
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
            <FieldGroup className="flex-row flex-wrap gap-2">
              <CheckboxRow
                id="onboarding-ferie-si"
                label="Ferie con richieste specifiche"
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
            <FieldGroup className="flex-row flex-wrap gap-2">
              <CheckboxRow
                id="onboarding-patente-si"
                label="Patente richiesta"
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
            value={nazionalitaEscluse}
            onValueChange={(nextValues) => {
              setNazionalitaEscluse(nextValues);
              void patchProcess({
                nazionalita_escluse: nextValues.length > 0 ? nextValues : null,
              });
            }}
          />

          <LookupMultiComboboxField
            id="onboarding-nazionalita-obbligatorie"
            label="Nazionalità obbligatorie"
            options={nazionalitaObbligatorieOptions}
            value={nazionalitaObbligatorie}
            onValueChange={(nextValues) => {
              setNazionalitaObbligatorie(nextValues);
              void patchProcess({
                nazionalita_obbligatorie: nextValues.length > 0 ? nextValues : null,
              });
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="onboarding-eta-min">Età min</FieldLabel>
            <Input
              id="onboarding-eta-min"
              type="number"
              inputMode="numeric"
              min={AGE_MIN}
              max={AGE_MAX}
              value={etaMin}
              onChange={(event) => setEtaMin(numbersOnly(event.target.value))}
              placeholder="24"
              onBlur={() => {
                const normalized = normalizeAgeInput(etaMin);
                setEtaMin(normalized);
                void patchProcess({ eta_minima: normalized || null });
              }}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="onboarding-eta-max">Età max</FieldLabel>
            <Input
              id="onboarding-eta-max"
              type="number"
              inputMode="numeric"
              min={AGE_MIN}
              max={AGE_MAX}
              value={etaMax}
              onChange={(event) => setEtaMax(numbersOnly(event.target.value))}
              placeholder="60"
              onBlur={() => {
                const normalized = normalizeAgeInput(etaMax);
                setEtaMax(normalized);
                void patchProcess({ eta_massima: normalized || null });
              }}
            />
          </Field>
        </div>

        <CheckboxGroupSet legend="Profilo famiglia">
          <CheckboxRow
            id="onboarding-esigente-si"
            label="Famiglia molto esigente"
            checked={persistedCheckboxes.famiglia_molto_esigente}
            onCheckedChange={(checked) =>
              patchCheckbox("famiglia_molto_esigente", checked)
            }
          />
          <CheckboxRow
            id="onboarding-autonomia-si"
            label="Richiesta autonomia"
            checked={persistedCheckboxes.richiesta_autonomia}
            onCheckedChange={(checked) => patchCheckbox("richiesta_autonomia", checked)}
          />
          <CheckboxRow
            id="onboarding-datore-presente-si"
            label="Datore spesso presente"
            checked={persistedCheckboxes.datore_spesso_presente}
            onCheckedChange={(checked) =>
              patchCheckbox("datore_spesso_presente", checked)
            }
          />
          <CheckboxRow
            id="onboarding-discrezione-si"
            label="Richiesta discrezione"
            checked={persistedCheckboxes.richiesta_discrezione}
            onCheckedChange={(checked) => patchCheckbox("richiesta_discrezione", checked)}
          />
        </CheckboxGroupSet>
      </SectionWrapper>
      ) : null}
    </FieldGroup>
  );
}
