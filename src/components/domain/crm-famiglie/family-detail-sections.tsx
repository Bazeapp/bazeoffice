/**
 * FamilyDetailSection* — 9 sezioni del detail sheet (Orari, Luogo, Famiglia, Casa,
 * Animali, Mansioni, Richieste, Tempistiche, Annuncio).
 *
 * File singolo per semplicità playground — in Fase 5 vera vanno in 9 file separati
 * secondo contract §10 R2 (`src/components/domain/crm-famiglie/family-detail-section-*.tsx`).
 *
 * Vedi spec in `outputs/04_spec/domain/family-detail-section-*.md`.
 */
import * as React from "react"
import {
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  CatIcon,
  CheckCircle2Icon,
  ClockIcon,
  CopyIcon,
  FileTextIcon,
  HomeIcon,
  LoaderIcon,
  MapPinnedIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TimerResetIcon,
  UsersIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DetailSection } from "@/components/shared/detail-section"
import { DetailFieldControl } from "@/components/shared/detail-field-v2"
import { cn } from "@/lib/utils"

import type { FamilyDetailData } from "@/pages/_dev-family-mock-data"

type SectionCommonProps<K extends keyof FamilyDetailData> = {
  data: Pick<FamilyDetailData, K>
  readOnly?: boolean
  onPatch?: (patch: Partial<FamilyDetailData>) => void
}

const WEEKDAYS = [
  { key: "lun", label: "Lun" },
  { key: "mar", label: "Mar" },
  { key: "mer", label: "Mer" },
  { key: "gio", label: "Gio" },
  { key: "ven", label: "Ven" },
  { key: "sab", label: "Sab" },
  { key: "dom", label: "Dom" },
] as const

// ============================================================
// Chip toggle utility
// ============================================================

function ChipToggle({
  active,
  onClick,
  disabled,
  children,
}: {
  active: boolean
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-active={active}
      className={cn(
        "inline-flex h-[26px] items-center gap-1.5 rounded-md border px-2 text-[12px] transition-colors",
        "data-[active=true]:border-primary data-[active=true]:bg-primary/10 data-[active=true]:text-primary",
        "data-[active=false]:border-border data-[active=false]:bg-background data-[active=false]:text-foreground",
        "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      {active ? <CheckCircle2Icon className="size-3" /> : null}
      {children}
    </button>
  )
}

// ============================================================
// 1. Orari
// ============================================================

export function FamilyDetailSectionOrari({
  data,
  readOnly,
  onPatch,
}: SectionCommonProps<"orarioLavoro" | "oreSettimanali" | "giorniSettimanali" | "giornatePreferite">) {
  const giornate = data.giornatePreferite ?? []
  const toggleGiornata = (k: string) =>
    onPatch?.({
      giornatePreferite: giornate.includes(k) ? giornate.filter((g) => g !== k) : [...giornate, k],
    })

  return (
    <DetailSection title="Orari e frequenza" icon={ClockIcon} showDefaultAction={false}>
      <DetailFieldControl label="Orario di lavoro" hint="es. Lun-Ven 8-19 OPPURE Sab mattina">
        <Textarea
          value={data.orarioLavoro ?? ""}
          onChange={(e) => onPatch?.({ orarioLavoro: e.target.value })}
          disabled={readOnly}
          rows={2}
        />
      </DetailFieldControl>
      <div className="grid grid-cols-2 gap-3">
        <DetailFieldControl label="Ore settimanali">
          <Input
            type="number"
            value={data.oreSettimanali ?? ""}
            onChange={(e) => onPatch?.({ oreSettimanali: Number(e.target.value) || undefined })}
            disabled={readOnly}
          />
        </DetailFieldControl>
        <DetailFieldControl label="Giorni settimanali">
          <Input
            type="number"
            value={data.giorniSettimanali ?? ""}
            onChange={(e) => onPatch?.({ giorniSettimanali: Number(e.target.value) || undefined })}
            disabled={readOnly}
          />
        </DetailFieldControl>
      </div>
      <DetailFieldControl label="Giornate preferite">
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((d) => (
            <ChipToggle
              key={d.key}
              active={giornate.includes(d.key)}
              onClick={() => toggleGiornata(d.key)}
              disabled={readOnly}
            >
              {d.label}
            </ChipToggle>
          ))}
        </div>
      </DetailFieldControl>
    </DetailSection>
  )
}

// ============================================================
// 2. Luogo
// ============================================================

export function FamilyDetailSectionLuogo({
  data,
  readOnly,
  onPatch,
  provinceOptions,
}: SectionCommonProps<"provincia" | "cap" | "quartiere" | "indirizzo" | "mapsUrl"> & {
  provinceOptions: Array<{ value: string; label: string }>
}) {
  return (
    <DetailSection title="Luogo di lavoro" icon={MapPinnedIcon} showDefaultAction={false}>
      <div className="grid grid-cols-2 gap-3">
        <DetailFieldControl label="Provincia">
          <Select
            value={data.provincia ?? ""}
            onValueChange={(v) => onPatch?.({ provincia: v })}
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona" />
            </SelectTrigger>
            <SelectContent>
              {provinceOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </DetailFieldControl>
        <DetailFieldControl label="CAP">
          <Input
            value={data.cap ?? ""}
            onChange={(e) => onPatch?.({ cap: e.target.value })}
            disabled={readOnly}
            inputMode="numeric"
          />
        </DetailFieldControl>
      </div>
      <DetailFieldControl label="Quartiere">
        <Input
          value={data.quartiere ?? ""}
          onChange={(e) => onPatch?.({ quartiere: e.target.value })}
          disabled={readOnly}
        />
      </DetailFieldControl>
      <DetailFieldControl label="Indirizzo completo">
        <Input
          value={data.indirizzo ?? ""}
          onChange={(e) => onPatch?.({ indirizzo: e.target.value })}
          disabled={readOnly}
        />
      </DetailFieldControl>
      <DetailFieldControl label="Google Maps URL" hint="per geolocalizzazione">
        <Input
          value={data.mapsUrl ?? ""}
          onChange={(e) => onPatch?.({ mapsUrl: e.target.value })}
          disabled={readOnly}
          placeholder="https://..."
        />
      </DetailFieldControl>
    </DetailSection>
  )
}

// ============================================================
// 3. Famiglia
// ============================================================

export function FamilyDetailSectionFamiglia({
  data,
  readOnly,
  onPatch,
}: SectionCommonProps<"composizione" | "neonatiPresenti" | "piuBambini" | "quattroPiu">) {
  return (
    <DetailSection title="Famiglia" icon={UsersIcon} showDefaultAction={false}>
      <DetailFieldControl label="Composizione" hint="es. 2 adulti + 1 bimba 3 anni">
        <Input
          value={data.composizione ?? ""}
          onChange={(e) => onPatch?.({ composizione: e.target.value })}
          disabled={readOnly}
        />
      </DetailFieldControl>
      <div className="flex flex-wrap gap-1.5">
        <ChipToggle
          active={!!data.neonatiPresenti}
          onClick={() => onPatch?.({ neonatiPresenti: !data.neonatiPresenti })}
          disabled={readOnly}
        >
          Neonati presenti
        </ChipToggle>
        <ChipToggle
          active={!!data.piuBambini}
          onClick={() => onPatch?.({ piuBambini: !data.piuBambini })}
          disabled={readOnly}
        >
          Più di un bambino
        </ChipToggle>
        <ChipToggle
          active={!!data.quattroPiu}
          onClick={() => onPatch?.({ quattroPiu: !data.quattroPiu })}
          disabled={readOnly}
        >
          Famiglia 4+ persone
        </ChipToggle>
      </div>
    </DetailSection>
  )
}

// ============================================================
// 4. Casa
// ============================================================

export function FamilyDetailSectionCasa({
  data,
  readOnly,
  onPatch,
}: SectionCommonProps<"descrizioneCasa" | "metraturaCasa">) {
  return (
    <DetailSection title="Casa" icon={HomeIcon} showDefaultAction={false}>
      <DetailFieldControl label="Descrizione della casa">
        <Input
          value={data.descrizioneCasa ?? ""}
          onChange={(e) => onPatch?.({ descrizioneCasa: e.target.value })}
          disabled={readOnly}
        />
      </DetailFieldControl>
      <DetailFieldControl label="Metratura (m²)">
        <Input
          value={data.metraturaCasa ?? ""}
          onChange={(e) => onPatch?.({ metraturaCasa: e.target.value })}
          disabled={readOnly}
          inputMode="numeric"
        />
      </DetailFieldControl>
    </DetailSection>
  )
}

// ============================================================
// 5. Animali
// ============================================================

export function FamilyDetailSectionAnimali({
  data,
  readOnly,
  onPatch,
}: SectionCommonProps<"descrizioneAnimali" | "cani" | "gatti">) {
  return (
    <DetailSection title="Animali" icon={CatIcon} showDefaultAction={false}>
      <DetailFieldControl label="Animali" hint="es. 2 gatti">
        <Input
          value={data.descrizioneAnimali ?? ""}
          onChange={(e) => onPatch?.({ descrizioneAnimali: e.target.value })}
          disabled={readOnly}
        />
      </DetailFieldControl>
      <DetailFieldControl label="Ci sono dei cani?">
        <div className="flex flex-wrap gap-1.5">
          <ChipToggle
            active={data.cani === "media"}
            onClick={() => onPatch?.({ cani: data.cani === "media" ? null : "media" })}
            disabled={readOnly}
          >
            Sì, taglia media o inferiore
          </ChipToggle>
          <ChipToggle
            active={data.cani === "grande"}
            onClick={() => onPatch?.({ cani: data.cani === "grande" ? null : "grande" })}
            disabled={readOnly}
          >
            Sì, taglia grande
          </ChipToggle>
        </div>
      </DetailFieldControl>
      <DetailFieldControl label="Ci sono dei gatti?">
        <div className="flex flex-wrap gap-1.5">
          <ChipToggle
            active={!!data.gatti}
            onClick={() => onPatch?.({ gatti: !data.gatti })}
            disabled={readOnly}
          >
            Sì
          </ChipToggle>
        </div>
      </DetailFieldControl>
    </DetailSection>
  )
}

// ============================================================
// 6. Mansioni
// ============================================================

export function FamilyDetailSectionMansioni({
  data,
  readOnly,
  onPatch,
}: SectionCommonProps<
  "descrizioneMansioni" | "pulizieAlte" | "stirare" | "cucinare" | "giardino"
>) {
  return (
    <DetailSection title="Mansioni" icon={BriefcaseBusinessIcon} showDefaultAction={false}>
      <DetailFieldControl label="Descrizione mansioni">
        <Textarea
          value={data.descrizioneMansioni ?? ""}
          onChange={(e) => onPatch?.({ descrizioneMansioni: e.target.value })}
          disabled={readOnly}
          rows={3}
        />
      </DetailFieldControl>
      <DetailFieldControl label="Pulizie">
        <label className="flex items-center gap-2 text-[12.5px]">
          <Checkbox
            checked={!!data.pulizieAlte}
            onCheckedChange={(c) => onPatch?.({ pulizieAlte: c === true })}
            disabled={readOnly}
          />
          Deve pulire ripiani alti usando scale
        </label>
      </DetailFieldControl>
      <DetailFieldControl label="Deve stirare">
        <div className="flex flex-wrap gap-1.5">
          <ChipToggle
            active={data.stirare === "si"}
            onClick={() => onPatch?.({ stirare: data.stirare === "si" ? null : "si" })}
            disabled={readOnly}
          >
            Sì
          </ChipToggle>
          <ChipToggle
            active={data.stirare === "si_diff"}
            onClick={() => onPatch?.({ stirare: data.stirare === "si_diff" ? null : "si_diff" })}
            disabled={readOnly}
          >
            Sì, abiti difficili
          </ChipToggle>
        </div>
      </DetailFieldControl>
      <DetailFieldControl label="Deve cucinare">
        <div className="flex flex-wrap gap-1.5">
          <ChipToggle
            active={data.cucinare === "si"}
            onClick={() => onPatch?.({ cucinare: data.cucinare === "si" ? null : "si" })}
            disabled={readOnly}
          >
            Sì
          </ChipToggle>
          <ChipToggle
            active={data.cucinare === "si_elab"}
            onClick={() => onPatch?.({ cucinare: data.cucinare === "si_elab" ? null : "si_elab" })}
            disabled={readOnly}
          >
            Sì, piatti elaborati
          </ChipToggle>
        </div>
      </DetailFieldControl>
      <DetailFieldControl label="Giardino">
        <label className="flex items-center gap-2 text-[12.5px]">
          <Checkbox
            checked={!!data.giardino}
            onCheckedChange={(c) => onPatch?.({ giardino: c === true })}
            disabled={readOnly}
          />
          Richiesta la cura del giardino
        </label>
      </DetailFieldControl>
    </DetailSection>
  )
}

// ============================================================
// 7. Richieste
// ============================================================

export function FamilyDetailSectionRichieste({
  data,
  readOnly,
  onPatch,
}: SectionCommonProps<
  | "notePrivate"
  | "italiano"
  | "inglese"
  | "genere"
  | "trasferte"
  | "trasferteNote"
  | "ferie"
  | "ferieNote"
  | "patente"
  | "automunita"
  | "etaMin"
  | "etaMax"
  | "profilo"
>) {
  return (
    <DetailSection title="Richieste specifiche" icon={ShieldCheckIcon} showDefaultAction={false}>
      <DetailFieldControl label="Note private recruiter" hint="non comparirà nell'annuncio">
        <Textarea
          value={data.notePrivate ?? ""}
          onChange={(e) => onPatch?.({ notePrivate: e.target.value })}
          disabled={readOnly}
          rows={3}
        />
      </DetailFieldControl>
      <DetailFieldControl label="Lingue">
        <div className="flex flex-wrap gap-1.5">
          <ChipToggle
            active={!!data.italiano}
            onClick={() => onPatch?.({ italiano: !data.italiano })}
            disabled={readOnly}
          >
            Comunica in italiano
          </ChipToggle>
          <ChipToggle
            active={!!data.inglese}
            onClick={() => onPatch?.({ inglese: !data.inglese })}
            disabled={readOnly}
          >
            Comunica in inglese
          </ChipToggle>
        </div>
      </DetailFieldControl>
      <DetailFieldControl label="Genere preferito">
        <RadioGroup
          value={data.genere ?? ""}
          onValueChange={(v) => onPatch?.({ genere: v === "" ? null : (v as "donna" | "uomo") })}
          disabled={readOnly}
          className="flex flex-row gap-4"
        >
          <label className="flex items-center gap-1.5 text-[12.5px]">
            <RadioGroupItem value="donna" /> Donna
          </label>
          <label className="flex items-center gap-1.5 text-[12.5px]">
            <RadioGroupItem value="uomo" /> Uomo
          </label>
          <label className="flex items-center gap-1.5 text-[12.5px]">
            <RadioGroupItem value="" /> Indifferente
          </label>
        </RadioGroup>
      </DetailFieldControl>
      <DetailFieldControl label="Vincoli operativi">
        <div className="flex flex-wrap gap-1.5">
          <ChipToggle
            active={!!data.trasferte}
            onClick={() => onPatch?.({ trasferte: !data.trasferte })}
            disabled={readOnly}
          >
            Trasferte
          </ChipToggle>
          <ChipToggle
            active={!!data.ferie}
            onClick={() => onPatch?.({ ferie: !data.ferie })}
            disabled={readOnly}
          >
            Richieste su ferie
          </ChipToggle>
        </div>
        {data.trasferte ? (
          <div className="mt-2 rounded-md border-l-2 border-primary/30 bg-muted/40 pl-3 py-1.5">
            <DetailFieldControl label="Specifica richieste per le trasferte">
              <Input
                value={data.trasferteNote ?? ""}
                onChange={(e) => onPatch?.({ trasferteNote: e.target.value })}
                disabled={readOnly}
                placeholder="es. trasferte occasionali in Liguria"
              />
            </DetailFieldControl>
          </div>
        ) : null}
        {data.ferie ? (
          <div className="mt-2 rounded-md border-l-2 border-primary/30 bg-muted/40 pl-3 py-1.5">
            <DetailFieldControl label="Specifica richieste su ferie">
              <Input
                value={data.ferieNote ?? ""}
                onChange={(e) => onPatch?.({ ferieNote: e.target.value })}
                disabled={readOnly}
                placeholder="es. ferie concordate 30gg prima"
              />
            </DetailFieldControl>
          </div>
        ) : null}
      </DetailFieldControl>
      <DetailFieldControl label="Patente">
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-[12.5px]">
            <Checkbox
              checked={!!data.patente}
              onCheckedChange={(c) => onPatch?.({ patente: c === true })}
              disabled={readOnly}
            />
            Patente richiesta
          </label>
          <label className="flex items-center gap-2 text-[12.5px]">
            <Checkbox
              checked={!!data.automunita}
              onCheckedChange={(c) => onPatch?.({ automunita: c === true })}
              disabled={readOnly}
            />
            Automunita (patente + auto propria)
          </label>
        </div>
      </DetailFieldControl>
      <div className="grid grid-cols-2 gap-3">
        <DetailFieldControl label="Età min">
          <Input
            type="number"
            value={data.etaMin ?? ""}
            onChange={(e) => onPatch?.({ etaMin: Number(e.target.value) || undefined })}
            disabled={readOnly}
          />
        </DetailFieldControl>
        <DetailFieldControl label="Età max">
          <Input
            type="number"
            value={data.etaMax ?? ""}
            onChange={(e) => onPatch?.({ etaMax: Number(e.target.value) || undefined })}
            disabled={readOnly}
          />
        </DetailFieldControl>
      </div>
      <DetailFieldControl label="Profilo famiglia">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { key: "esigente", label: "Molto esigente" },
              { key: "autonomia", label: "Richiesta autonomia" },
              { key: "presente", label: "Datore spesso presente" },
              { key: "discrezione", label: "Richiesta discrezione" },
            ] as const
          ).map((opt) => {
            const profilo = data.profilo ?? []
            const active = profilo.includes(opt.key)
            return (
              <ChipToggle
                key={opt.key}
                active={active}
                onClick={() =>
                  onPatch?.({
                    profilo: active
                      ? profilo.filter((p) => p !== opt.key)
                      : [...profilo, opt.key],
                  })
                }
                disabled={readOnly}
              >
                {opt.label}
              </ChipToggle>
            )
          })}
        </div>
      </DetailFieldControl>
    </DetailSection>
  )
}

// ============================================================
// 8. Tempistiche
// ============================================================

export function FamilyDetailSectionTempistiche({
  data,
  readOnly,
  onPatch,
}: SectionCommonProps<
  "deadline" | "tipologiaIncontro" | "disponibilita" | "preventivoUrl"
>) {
  return (
    <DetailSection title="Tempistiche" icon={TimerResetIcon} showDefaultAction={false}>
      <div className="grid grid-cols-2 gap-3">
        <DetailFieldControl label="Deadline">
          <Input
            type="text"
            placeholder="dd/mm/yyyy"
            value={data.deadline ?? ""}
            onChange={(e) => onPatch?.({ deadline: e.target.value })}
            disabled={readOnly}
          />
        </DetailFieldControl>
        <DetailFieldControl label="Tipologia primo incontro">
          <Select
            value={data.tipologiaIncontro ?? ""}
            onValueChange={(v) =>
              onPatch?.({ tipologiaIncontro: v as "presenza" | "video" | "telefono" })
            }
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="presenza">In presenza</SelectItem>
              <SelectItem value="video">Video call</SelectItem>
              <SelectItem value="telefono">Telefonica</SelectItem>
            </SelectContent>
          </Select>
        </DetailFieldControl>
      </div>
      <DetailFieldControl
        label="Disponibilità per incontro"
        hint="3 disponibilità di giorno e fascia oraria"
      >
        <Textarea
          value={data.disponibilita ?? ""}
          onChange={(e) => onPatch?.({ disponibilita: e.target.value })}
          disabled={readOnly}
          rows={3}
        />
      </DetailFieldControl>
      <DetailFieldControl label="Preventivo da inviare">
        <Input
          type="url"
          placeholder="https://..."
          value={data.preventivoUrl ?? ""}
          onChange={(e) => onPatch?.({ preventivoUrl: e.target.value })}
          disabled={readOnly}
        />
      </DetailFieldControl>
    </DetailSection>
  )
}

// ============================================================
// 9. Annuncio
// ============================================================

export function FamilyDetailSectionAnnuncio({
  data,
  readOnly,
  onCreate,
}: SectionCommonProps<"annuncioStatus" | "annuncioUrl"> & {
  onCreate?: () => void
}) {
  const status = data.annuncioStatus
  const url = data.annuncioUrl

  const handleCopy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // noop
    }
  }

  return (
    <DetailSection title="Annuncio" icon={FileTextIcon} showDefaultAction={false}>
      {status === "created" && url ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
            <CheckCircle2Icon className="size-4 shrink-0 text-emerald-600" />
            <div className="flex-1">
              <p className="text-[13px] font-medium">Annuncio pubblicato</p>
              <p className="font-mono text-[11.5px] text-emerald-800">{url}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleCopy}
              aria-label="Copia URL"
            >
              <CopyIcon className="size-3.5" />
            </Button>
          </div>
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCreate}
              disabled={readOnly}
            >
              <SparklesIcon data-icon="inline-start" />
              Ri-crea annuncio
            </Button>
          </div>
        </div>
      ) : status === "loading" ? (
        <div className="flex justify-center py-4">
          <Button type="button" variant="default" size="default" disabled>
            <LoaderIcon data-icon="inline-start" className="animate-spin" />
            Creazione in corso...
          </Button>
        </div>
      ) : status === "error" ? (
        <div className="space-y-3">
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-[13px] text-red-800">
            Errore durante la creazione dell'annuncio.
          </div>
          <div className="flex justify-center">
            <Button type="button" variant="default" onClick={onCreate} disabled={readOnly}>
              Riprova
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-center py-4">
          <Button type="button" variant="default" size="default" onClick={onCreate} disabled={readOnly}>
            <SparklesIcon data-icon="inline-start" />
            Crea annuncio
          </Button>
        </div>
      )}
    </DetailSection>
  )
}

// ============================================================
// Map tab → section
// ============================================================

export const DETAIL_TABS = [
  { id: "orari", label: "Orari", icon: ClockIcon },
  { id: "luogo", label: "Luogo", icon: MapPinnedIcon },
  { id: "famiglia", label: "Famiglia", icon: UsersIcon },
  { id: "casa", label: "Casa", icon: HomeIcon },
  { id: "animali", label: "Animali", icon: CatIcon },
  { id: "mansioni", label: "Mansioni", icon: BriefcaseBusinessIcon },
  { id: "richieste", label: "Richieste", icon: ShieldCheckIcon },
  { id: "tempistiche", label: "Tempistiche", icon: CalendarDaysIcon },
  { id: "annuncio", label: "Annuncio", icon: FileTextIcon },
] as const

export type DetailTabId = (typeof DETAIL_TABS)[number]["id"]
