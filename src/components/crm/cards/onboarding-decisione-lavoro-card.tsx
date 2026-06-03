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
import { useController } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { FieldInput, FieldTextarea } from "@/components/forms/field-components";
import { useAutoSaveForm } from "@/hooks/use-auto-save-form";
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

// FASE 5 BIS — thin wrapper form-aware del CheckboxRow (booleano).
function FieldCheckboxRow({
  name,
  id,
  label,
}: {
  name: string;
  id: string;
  label: ReactNode;
}) {
  const { field } = useController({ name });
  return (
    <CheckboxRow
      id={id}
      label={label}
      checked={Boolean(field.value)}
      onCheckedChange={(checked) => field.onChange(checked)}
    />
  );
}

// FASE 5 BIS — RadioGroup genere form-aware (preserva normalizeGenderValue).
function FieldGenereRadio({ name }: { name: string }) {
  const { field } = useController({ name });
  return (
    <RadioGroup
      value={typeof field.value === "string" ? field.value : ""}
      onValueChange={(value) => field.onChange(normalizeGenderValue(value))}
      className="gap-3"
    >
      <Field orientation="horizontal">
        <RadioGroupItem id="onboarding-genere-donna" value="donna" />
        <FieldLabel htmlFor="onboarding-genere-donna" className="font-normal">
          Donna
        </FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <RadioGroupItem id="onboarding-genere-uomo" value="uomo" />
        <FieldLabel htmlFor="onboarding-genere-uomo" className="font-normal">
          Uomo
        </FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <RadioGroupItem id="onboarding-genere-indifferente" value="indifferente" />
        <FieldLabel htmlFor="onboarding-genere-indifferente" className="font-normal">
          Indifferente
        </FieldLabel>
      </Field>
    </RadioGroup>
  );
}

// FASE 5 BIS — Select patente form-aware (memorizza la label; onSave → array `patente`).
function FieldPatenteSelect({
  name,
  options,
}: {
  name: string;
  options: LookupOption[];
}) {
  const { field } = useController({ name });
  return (
    <Select
      value={typeof field.value === "string" ? field.value : ""}
      onValueChange={field.onChange}
    >
      <SelectTrigger id="onboarding-patente-dettaglio" className="w-full">
        <SelectValue placeholder="Seleziona opzione" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.valueKey} value={option.valueLabel}>
            {option.valueLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// FASE 5 BIS — combobox nazionalità form-aware (riusa LookupMultiComboboxField).
function FieldLookupMultiCombobox({
  name,
  id,
  label,
  options,
}: {
  name: string;
  id: string;
  label: string;
  options: LookupOption[];
}) {
  const { field } = useController({ name });
  const value = Array.isArray(field.value) ? (field.value as string[]) : [];
  return (
    <LookupMultiComboboxField
      id={id}
      label={label}
      options={options}
      value={value}
      onValueChange={field.onChange}
    />
  );
}

// FASE 5 BIS — defaults del form (chiavi = colonne DB, eccetto `patenteDettaglio`
// che onSave mappa su `patente`). Merge defaults + checkboxDefaults legacy.
function buildDecisioneDefaults(
  defaults?: OnboardingDecisioneLavoroDefaults,
  checkboxDefaults?: OnboardingDecisioneLavoroCheckboxDefaults,
) {
  const isChecked = (id: string) => checkboxDefaults?.[id] ?? false;
  return {
    nucleo_famigliare: toInputValue(defaults?.nucleoFamigliare),
    descrizione_casa: toInputValue(defaults?.descrizioneCasa),
    metratura_casa: numbersOnly(toInputValue(defaults?.metraturaCasa)),
    descrizione_animali_in_casa: toInputValue(defaults?.descrizioneAnimaliInCasa),
    mansioni_richieste: toInputValue(defaults?.mansioniRichieste),
    informazioni_extra_riservate: toInputValue(defaults?.informazioniExtraRiservate),
    descrizione_richiesta_trasferte: toInputValue(defaults?.descrizioneRichiestaTrasferte),
    descrizione_richiesta_ferie: toInputValue(defaults?.descrizioneRichiestaFerie),
    eta_minima: normalizeAgeInput(toInputValue(defaults?.etaMinima)),
    eta_massima: normalizeAgeInput(toInputValue(defaults?.etaMassima)),
    sesso: normalizeGenderValue(defaults?.sesso),
    patenteDettaglio: toInputValue(defaults?.patenteDettaglio),
    nazionalita_escluse: normalizeStringArray(defaults?.nazionalitaEscluse),
    nazionalita_obbligatorie: normalizeStringArray(defaults?.nazionalitaObbligatorie),
    richiesta_trasferte: defaults?.richiestaTrasferte ?? isChecked("onboarding-trasferte-si"),
    richiesta_ferie: defaults?.richiestaFerie ?? isChecked("onboarding-ferie-si"),
    richiesta_patente: defaults?.richiestaPatente ?? isChecked("onboarding-patente-si"),
    presenza_neonati: defaults?.presenzaNeonati ?? isChecked("onboarding-neonati"),
    piu_bambini: defaults?.piuBambini ?? isChecked("onboarding-piu-bambini"),
    famiglia_4_persone: defaults?.famiglia4Persone ?? isChecked("onboarding-famiglia-4"),
    cani_piccoli: defaults?.caniPiccoli ?? isChecked("onboarding-cani-piccoli"),
    cani_grandi: defaults?.caniGrandi ?? isChecked("onboarding-cani-grandi"),
    gatti: defaults?.gatti ?? isChecked("onboarding-gatti"),
    pulire_ripiani_alti: defaults?.pulireRipianiAlti ?? isChecked("onboarding-ripiani-alti-si"),
    stirare: defaults?.stirare ?? isChecked("onboarding-stirare-si"),
    stirare_abiti_difficili: defaults?.stirareAbitiDifficili ?? isChecked("onboarding-stirare-difficile"),
    cucinare: defaults?.cucinare ?? isChecked("onboarding-cucinare-si"),
    cucinare_elaborato: defaults?.cucinareElaborato ?? isChecked("onboarding-cucinare-elaborati"),
    cura_piante: defaults?.curaPiante ?? isChecked("onboarding-giardino-si"),
    comunicare_bene_italiano: defaults?.comunicareBeneItaliano ?? isChecked("onboarding-italiano-si"),
    comunicare_bene_inglese: defaults?.comunicareBeneInglese ?? isChecked("onboarding-inglese-si"),
    famiglia_molto_esigente: defaults?.famigliaMoltoEsigente ?? isChecked("onboarding-esigente-si"),
    richiesta_autonomia: defaults?.richiestaAutonomia ?? isChecked("onboarding-autonomia-si"),
    datore_spesso_presente: defaults?.datoreSpessoPresente ?? isChecked("onboarding-datore-presente-si"),
    richiesta_discrezione: defaults?.richiestaDiscrezione ?? isChecked("onboarding-discrezione-si"),
  };
}

const DECISIONE_TEXT_NULLABLE = new Set([
  "nucleo_famigliare",
  "descrizione_casa",
  "descrizione_animali_in_casa",
  "mansioni_richieste",
  "informazioni_extra_riservate",
  "descrizione_richiesta_trasferte",
  "descrizione_richiesta_ferie",
]);

// FASE 5 BIS — instrada la patch (solo chiavi cambiate) verso le colonne DB con
// le trasformazioni originali (trim→null, numbersOnly, età clamp, patente array,
// nazionalità []→null). Booleani (toggle + checkbox) passano invariati.
function buildDecisionePatch(patch: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (DECISIONE_TEXT_NULLABLE.has(key)) {
      out[key] = (value as string) || null;
    } else if (key === "metratura_casa") {
      out.metratura_casa = numbersOnly(value as string) || null;
    } else if (key === "eta_minima" || key === "eta_massima") {
      out[key] = normalizeAgeInput(numbersOnly(value as string)) || null;
    } else if (key === "sesso") {
      out.sesso = (value as string) || null;
    } else if (key === "patenteDettaglio") {
      out.patente = value ? [value as string] : [];
    } else if (key === "nazionalita_escluse" || key === "nazionalita_obbligatorie") {
      out[key] = (value as string[]).length > 0 ? value : null;
    } else {
      out[key] = value; // booleani (richiesta_* + checkbox)
    }
  }
  return out;
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
  const nazionalitaEscluseOptions =
    lookupOptionsByField?.nazionalita_escluse ?? [];
  const nazionalitaObbligatorieOptions =
    lookupOptionsByField?.nazionalita_obbligatorie ?? [];

  // FASE 5 BIS — form + autosave: il form è la source of truth. Sostituisce ~17
  // useState, 2 useEffect di resync, 7 dirty-ref + la mappa dirty dei checkbox e
  // patchCheckbox. Il resync realtime senza clobber è gestito da keepDirtyValues;
  // le trasformazioni per-colonna sono centralizzate in buildDecisionePatch.
  const form = useAutoSaveForm({
    defaults: buildDecisioneDefaults(defaults, checkboxDefaults),
    onSave: async (patch) => {
      await onPatchProcess?.(buildDecisionePatch(patch));
    },
  });
  const richiestaTrasferte = form.watch("richiesta_trasferte");
  const richiestaFerie = form.watch("richiesta_ferie");
  const richiestaPatente = form.watch("richiesta_patente");

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
    <Form {...form}>
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
          <FieldInput
            name="nucleo_famigliare"
            id="onboarding-famiglia-note"
            className={cn(isRequiredMissing("nucleoFamigliare") && REQUIRED_FIELD_CLASS)}
            placeholder="indica situazioni o casi particolari sul nucleo familiare"
          />
        </Field>

        <FieldSet>
          <FieldGroup className="flex-row flex-wrap gap-2">
            <FieldCheckboxRow
              name="presenza_neonati"
              id="onboarding-neonati"
              label="Sono presenti neonati"
            />
            <FieldCheckboxRow
              name="piu_bambini"
              id="onboarding-piu-bambini"
              label="Deve accudire più di un bambino?"
            />
            <FieldCheckboxRow
              name="famiglia_4_persone"
              id="onboarding-famiglia-4"
              label="Famiglia 4+ persone"
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
          <FieldInput
            name="descrizione_casa"
            id="onboarding-casa-desc"
            className={cn(isRequiredMissing("descrizioneCasa") && REQUIRED_FIELD_CLASS)}
            placeholder="Descrizione della casa"
          />
        </Field>

        <Field invalid={isRequiredMissing("metraturaCasa")}>
          <FieldLabel htmlFor="onboarding-casa-mq">Metratura casa</FieldLabel>
          <FieldInput
            name="metratura_casa"
            id="onboarding-casa-mq"
            className={cn(isRequiredMissing("metraturaCasa") && REQUIRED_FIELD_CLASS)}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="120"
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
          <FieldInput
            name="descrizione_animali_in_casa"
            id="onboarding-animali-note"
            placeholder="Ci sono 3 gatti e un cane"
          />
        </Field>

        <div className="space-y-3">
          <CheckboxGroupSet legend="Ci sono dei cani?">
            <FieldCheckboxRow
              name="cani_piccoli"
              id="onboarding-cani-piccoli"
              label="Si, di taglia media o inferiore"
            />
            <FieldCheckboxRow
              name="cani_grandi"
              id="onboarding-cani-grandi"
              label="Si, di taglia grande"
            />
          </CheckboxGroupSet>
          <FieldSet>
            <FieldLegend variant="label">Ci sono dei gatti?</FieldLegend>
            <FieldGroup className="flex-row flex-wrap gap-2">
              <FieldCheckboxRow
                name="gatti"
                id="onboarding-gatti"
                label="Si"
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
          <FieldTextarea
            name="mansioni_richieste"
            id="onboarding-mansioni-note"
            className={cn(isRequiredMissing("mansioniRichieste") && REQUIRED_FIELD_CLASS)}
            rows={4}
            placeholder='Inserire solo le mansioni "particolari" Es: deve saper essere una massima esperta di orchidee da competizione'
          />
        </Field>

        <CheckboxGroupSet legend="Pulizie">
          <FieldCheckboxRow
            name="pulire_ripiani_alti"
            id="onboarding-ripiani-alti-si"
            label="Pulire ripiani/soffitti alti con scala"
          />
        </CheckboxGroupSet>

        <CheckboxGroupSet legend="Deve stirare:">
          <FieldCheckboxRow
            name="stirare"
            id="onboarding-stirare-si"
            label="Sì"
          />
          <FieldCheckboxRow
            name="stirare_abiti_difficili"
            id="onboarding-stirare-difficile"
            label="Sì, abiti difficili"
          />
        </CheckboxGroupSet>

        <CheckboxGroupSet legend="Deve cucinare:">
          <FieldCheckboxRow
            name="cucinare"
            id="onboarding-cucinare-si"
            label="Sì"
          />
          <FieldCheckboxRow
            name="cucinare_elaborato"
            id="onboarding-cucinare-elaborati"
            label="Sì, cucina elaborata"
          />
        </CheckboxGroupSet>

        <CheckboxGroupSet legend="Giardino">
          <FieldCheckboxRow
            name="cura_piante"
            id="onboarding-giardino-si"
            label="Cura delle piante richiesta"
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
          <FieldTextarea
            name="informazioni_extra_riservate"
            id="onboarding-altre-info"
            rows={4}
            placeholder="Informazioni extra riservate"
          />
        </Field>

        <CheckboxGroupSet legend="Lingue">
          <FieldCheckboxRow
            name="comunicare_bene_italiano"
            id="onboarding-italiano-si"
            label="Comunicare bene in italiano"
          />
          <FieldCheckboxRow
            name="comunicare_bene_inglese"
            id="onboarding-inglese-si"
            label="Comunicare bene in inglese"
          />
        </CheckboxGroupSet>

        <FieldSet
          className={cn(
            isRequiredMissing("sesso") &&
              "rounded-md border border-destructive p-3 text-destructive",
          )}
        >
          <FieldLegend variant="label">Genere</FieldLegend>
          <FieldGenereRadio name="sesso" />
        </FieldSet>

        <FieldLegend variant="label">Vincoli Operativi</FieldLegend>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FieldSet>
            <FieldGroup className="flex-row flex-wrap gap-2">
              <FieldCheckboxRow
                name="richiesta_trasferte"
                id="onboarding-trasferte-si"
                label="Trasferte richieste"
              />
            </FieldGroup>
          </FieldSet>
          {richiestaTrasferte ? (
            <Field>
              <FieldLabel htmlFor="onboarding-trasferte-desc">
                Che trasferte bisogna fare?
              </FieldLabel>
              <FieldInput
                name="descrizione_richiesta_trasferte"
                id="onboarding-trasferte-desc"
              />
            </Field>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FieldSet>
            <FieldGroup className="flex-row flex-wrap gap-2">
              <FieldCheckboxRow
                name="richiesta_ferie"
                id="onboarding-ferie-si"
                label="Ferie con richieste specifiche"
              />
            </FieldGroup>
          </FieldSet>
          {richiestaFerie ? (
            <Field>
              <FieldLabel htmlFor="onboarding-ferie-desc">
                Che ferie richiedono?
              </FieldLabel>
              <FieldInput
                name="descrizione_richiesta_ferie"
                id="onboarding-ferie-desc"
              />
            </Field>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FieldSet>
            <FieldGroup className="flex-row flex-wrap gap-2">
              <FieldCheckboxRow
                name="richiesta_patente"
                id="onboarding-patente-si"
                label="Patente richiesta"
              />
            </FieldGroup>
          </FieldSet>
          {richiestaPatente ? (
            <Field>
              <FieldLabel htmlFor="onboarding-patente-dettaglio">
                Serve solo patente o anche macchina?
              </FieldLabel>
              <FieldPatenteSelect name="patenteDettaglio" options={patenteOptions} />
            </Field>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FieldLookupMultiCombobox
            name="nazionalita_escluse"
            id="onboarding-nazionalita-escluse"
            label="Nazionalità escluse"
            options={nazionalitaEscluseOptions}
          />

          <FieldLookupMultiCombobox
            name="nazionalita_obbligatorie"
            id="onboarding-nazionalita-obbligatorie"
            label="Nazionalità obbligatorie"
            options={nazionalitaObbligatorieOptions}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="onboarding-eta-min">Età min</FieldLabel>
            <FieldInput
              name="eta_minima"
              id="onboarding-eta-min"
              type="number"
              inputMode="numeric"
              min={AGE_MIN}
              max={AGE_MAX}
              placeholder="24"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="onboarding-eta-max">Età max</FieldLabel>
            <FieldInput
              name="eta_massima"
              id="onboarding-eta-max"
              type="number"
              inputMode="numeric"
              min={AGE_MIN}
              max={AGE_MAX}
              placeholder="60"
            />
          </Field>
        </div>

        <CheckboxGroupSet legend="Profilo famiglia">
          <FieldCheckboxRow
            name="famiglia_molto_esigente"
            id="onboarding-esigente-si"
            label="Famiglia molto esigente"
          />
          <FieldCheckboxRow
            name="richiesta_autonomia"
            id="onboarding-autonomia-si"
            label="Richiesta autonomia"
          />
          <FieldCheckboxRow
            name="datore_spesso_presente"
            id="onboarding-datore-presente-si"
            label="Datore spesso presente"
          />
          <FieldCheckboxRow
            name="richiesta_discrezione"
            id="onboarding-discrezione-si"
            label="Richiesta discrezione"
          />
        </CheckboxGroupSet>
      </SectionWrapper>
      ) : null}
    </FieldGroup>
    </Form>
  );
}
