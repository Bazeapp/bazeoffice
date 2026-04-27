import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import {
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  FileSearchIcon,
  FolderArchiveIcon,
  MapPinIcon,
  MessageSquareTextIcon,
  NotebookPenIcon,
  PhoneIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";

import { AddressSectionCard } from "@/components/lavoratori/address-section-card";
import { AvailabilityCalendarCard } from "@/components/lavoratori/availability-calendar-card";
import { AvailabilityStatusCard } from "@/components/lavoratori/availability-status-card";
import { DocumentsCard } from "@/components/lavoratori/documents-card";
import { ExperienceReferencesCard } from "@/components/lavoratori/experience-references-card";
import { JobSearchCard } from "@/components/lavoratori/job-search-card";
import { SkillsCompetenzeCard } from "@/components/lavoratori/skills-competenze-card";
import { WorkerDetailComposite } from "@/components/lavoratori/worker-detail-composite";
import { WorkerProfileHeader } from "@/components/lavoratori/worker-profile-header";
import { SchedaColloquioPanel } from "@/components/ricerca/scheda-colloquio-panel";
import { DetailSectionBlock } from "@/components/shared/detail-section-card";
import { Button } from "@/components/ui/button";
import {
  lookupColorsByDomain,
  lookupOptions,
  mockWorker,
  mockWorkerRow,
} from "../mocks";

const fullWorkerTabs = [
  { id: "profilo", label: "Profilo", icon: UsersIcon },
  { id: "residenza", label: "Residenza", icon: MapPinIcon },
  { id: "calendario", label: "Calendario", icon: CalendarDaysIcon },
  { id: "ricerca", label: "Ricerca", icon: BriefcaseBusinessIcon },
  { id: "esperienze", label: "Esperienze", icon: UsersIcon },
  { id: "competenze", label: "Competenze", icon: SparklesIcon },
  {
    id: "documenti",
    label: "Documenti e dati amministrativi",
    icon: FolderArchiveIcon,
  },
  { id: "processi", label: "Ricerche", icon: MessageSquareTextIcon },
];

const gateTabs = [
  { id: "referente", label: "Referente", icon: UsersIcon },
  { id: "contatti", label: "Contatti", icon: PhoneIcon },
  { id: "presentazione", label: "Presentazione", icon: UsersIcon },
  { id: "documenti", label: "Documenti", icon: FolderArchiveIcon },
  { id: "tipologia", label: "Tipologia", icon: BriefcaseBusinessIcon },
  { id: "disponibilita", label: "Disponibilità", icon: CalendarDaysIcon },
  { id: "check_baze", label: "Check Baze", icon: ShieldCheckIcon },
  { id: "aspetti", label: "Aspetti", icon: SparklesIcon },
  { id: "assessment", label: "Assessment", icon: NotebookPenIcon },
];

const ricercaWorkerTabs = [
  { id: "processo", label: "Processo", icon: FileSearchIcon },
  { id: "profilo", label: "Profilo", icon: UsersIcon },
  { id: "colloquio", label: "Scheda colloquio", icon: ClipboardListIcon },
  { id: "dettagli", label: "Dettagli worker", icon: MessageSquareTextIcon },
];

const tabPresets = {
  full: fullWorkerTabs,
  gate1: gateTabs,
  gate2: gateTabs,
  ricerca: ricercaWorkerTabs,
} as const;

const jobSearchDraft = {
  tipo_lavoro_domestico: ["Colf", "Tata"],
  tipo_rapporto_lavorativo: ["Part time"],
  check_lavori_accettabili: ["Lavori di 3 giorni", "Lavori di 5 giorni"],
  check_accetta_lavori_con_trasferta: "Accetta",
  check_accetta_multipli_contratti: "Accetta",
  check_accetta_paga_9_euro_netti: "Accetta",
};

const experienceDraft = {
  anni_esperienza_colf: "6",
  anni_esperienza_badante: "2",
  anni_esperienza_babysitter: "3",
  situazione_lavorativa_attuale:
    "Attualmente lavora part time presso una famiglia a Milano.",
};

const documentsDraft = {
  stato_verifica_documenti: "Documenti verificati",
  documenti_in_regola: "Ho tutti i documenti in regola",
  data_scadenza_naspi: "2026-12-31",
  iban: "IT60X0542811101000000123456",
  id_stripe_account: "acct_story",
};

const skillValues = {
  livello_pulizie: "Alto",
  check_accetta_salire_scale_o_soffitti_alti: "Accetta",
  compatibilita_famiglie_numerose: "Consigliata",
  compatibilita_famiglie_molto_esigenti: "Sconsigliata",
  compatibilita_lavoro_con_datore_presente_in_casa: "Consigliata",
  compatibilita_con_case_di_grandi_dimensioni: "Consigliata",
  compatibilita_con_elevata_autonomia_richiesta: "Consigliata",
  compatibilita_con_contesti_pacati: "Consigliata",
  livello_stiro: "Medio",
  compatibilita_con_stiro_esigente: "Sconsigliata",
  livello_cucina: "Alto",
  compatibilita_con_cucina_strutturata: "Consigliata",
  livello_babysitting: "Medio",
  check_accetta_babysitting_multipli_bambini: "Accetta",
  check_accetta_babysitting_neonati: "Accetta",
  compatibilita_babysitting_neonati: "Consigliata",
  livello_dogsitting: "Medio",
  check_accetta_case_con_cani: "Accetta",
  check_accetta_case_con_cani_grandi: "Non accetta",
  check_accetta_case_con_gatti: "Accetta",
  compatibilita_con_animali_in_casa: "Consigliata",
  livello_giardinaggio: "Basso",
  livello_italiano: "Alto",
  livello_inglese: "Basso",
};

const levelOptions = [
  { label: "Basso", value: "Basso" },
  { label: "Medio", value: "Medio" },
  { label: "Alto", value: "Alto" },
];

const choiceOptions = [
  { label: "Accetta", value: "Accetta" },
  { label: "Non accetta", value: "Non accetta" },
  { label: "Consigliata", value: "Consigliata" },
  { label: "Sconsigliata", value: "Sconsigliata" },
];

const lookupOptionsByDomain = new Map<string, typeof levelOptions>([
  ["lavoratori.livello_pulizie", levelOptions],
  ["lavoratori.livello_stiro", levelOptions],
  ["lavoratori.livello_cucina", levelOptions],
  ["lavoratori.livello_babysitting", levelOptions],
  ["lavoratori.livello_dogsitting", levelOptions],
  ["lavoratori.livello_giardinaggio", levelOptions],
  ["lavoratori.livello_italiano", levelOptions],
  ["lavoratori.livello_inglese", levelOptions],
]);

for (const key of Object.keys(skillValues)) {
  if (!key.startsWith("livello_")) {
    lookupOptionsByDomain.set(`lavoratori.${key}`, choiceOptions);
  }
}

const editDays = [
  { field: "mon", label: "Lun" },
  { field: "tue", label: "Mar" },
  { field: "wed", label: "Mer" },
  { field: "thu", label: "Gio" },
  { field: "fri", label: "Ven" },
];

const editBands = [
  { field: "morning", label: "Mattina" },
  { field: "afternoon", label: "Pomeriggio" },
  { field: "evening", label: "Sera" },
];

type StoryArgs = React.ComponentProps<typeof WorkerDetailComposite> & {
  tabPreset: keyof typeof tabPresets;
  width: number;
  height: number;
  showTopBar: boolean;
};

const meta = {
  title: "Lavoratori/WorkerDetailComposite",
  component: WorkerDetailComposite,
  parameters: {
    controls: { sort: "requiredFirst" },
  },
  argTypes: {
    tabPreset: {
      options: Object.keys(tabPresets),
      control: { type: "inline-radio" },
    },
    activeSection: { control: "text" },
    width: { control: { type: "number", min: 520, max: 1440, step: 20 } },
    height: { control: { type: "number", min: 420, max: 980, step: 20 } },
    showTopBar: { control: "boolean" },
    showProfileHeader: { control: "boolean" },
    showProfileBlock: { control: "boolean" },
    showAddressBlock: { control: "boolean" },
    showAvailabilityStatusBlock: { control: "boolean" },
    showAvailabilityCalendarBlock: { control: "boolean" },
    showJobSearchBlock: { control: "boolean" },
    showExperienceReferencesBlock: { control: "boolean" },
    showSkillsBlock: { control: "boolean" },
    showDocumentsBlock: { control: "boolean" },
    showProcessesBlock: { control: "boolean" },
    showInterviewBlock: { control: "boolean" },
    tabs: { table: { disable: true } },
    topBar: { table: { disable: true } },
    profileHeader: { table: { disable: true } },
    profileBlock: { table: { disable: true } },
    addressBlock: { table: { disable: true } },
    availabilityStatusBlock: { table: { disable: true } },
    availabilityCalendarBlock: { table: { disable: true } },
    jobSearchBlock: { table: { disable: true } },
    experienceReferencesBlock: { table: { disable: true } },
    skillsBlock: { table: { disable: true } },
    documentsBlock: { table: { disable: true } },
    processesBlock: { table: { disable: true } },
    interviewBlock: { table: { disable: true } },
    sectionRef: { table: { disable: true } },
    headerRef: { table: { disable: true } },
    className: { table: { disable: true } },
    onSectionChange: { action: "section changed" },
  },
  args: {
    tabPreset: "full",
    tabs: fullWorkerTabs,
    activeSection: "profilo",
    width: 1040,
    height: 760,
    showTopBar: true,
    showProfileHeader: true,
    showProfileBlock: false,
    showAddressBlock: true,
    showAvailabilityStatusBlock: true,
    showAvailabilityCalendarBlock: true,
    showJobSearchBlock: true,
    showExperienceReferencesBlock: true,
    showSkillsBlock: true,
    showDocumentsBlock: true,
    showProcessesBlock: true,
    showInterviewBlock: false,
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

function DefaultRender({
  tabPreset,
  width,
  height,
  showTopBar,
  ...args
}: StoryArgs) {
    const mobilityAnchor = React.useRef<HTMLDivElement | null>(null);
    const tabs = tabPresets[tabPreset];
    const activeSection = tabs.some((tab) => tab.id === args.activeSection)
      ? args.activeSection
      : tabs[0]?.id ?? "";

    return (
      <div style={{ width, height } as React.CSSProperties}>
        <WorkerDetailComposite
          {...args}
          tabs={tabs}
          activeSection={activeSection}
          className="h-full w-full"
          topBar={
            showTopBar ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Chiudi scheda lavoratore"
                title="Chiudi scheda lavoratore"
              >
                <XIcon />
              </Button>
            ) : undefined
          }
          profileHeader={
            <WorkerProfileHeader
              worker={mockWorker}
              workerRow={mockWorkerRow}
              headerLayout="side"
              statoLavoratoreOptions={[
                { label: "Idoneo", value: "Idoneo" },
                { label: "Non idoneo", value: "Non idoneo" },
              ]}
              disponibilitaOptions={lookupOptions.availability}
              sessoOptions={[
                { label: "Donna", value: "Donna" },
                { label: "Uomo", value: "Uomo" },
              ]}
              nazionalitaOptions={[
                { label: "Peru", value: "Peru" },
                { label: "Italia", value: "Italia" },
              ]}
              motivazioniOptions={[
                { label: "Non disponibile", value: "Non disponibile" },
                { label: "Altro", value: "Altro" },
              ]}
              presentationPhotoSlots={[
                "/worker_placeholder_1.png",
                "/worker_placeholder_2.png",
              ]}
              selectedPresentationPhotoIndex={0}
              showAiImageEditAction
              showUploadPhotoAction
              onPatchField={() => undefined}
              onStatoLavoratoreChange={() => undefined}
              onDisponibilitaChange={() => undefined}
              onDataRitornoDisponibilitaChange={() => undefined}
              onMotivazioneChange={() => undefined}
              onBlacklistToggle={() => undefined}
              onSelectedPresentationPhotoIndexChange={() => undefined}
              onAiImageEdit={() => undefined}
              onUploadPhoto={() => undefined}
            />
          }
          profileBlock={
            <DetailSectionBlock
              title="Profilo"
              icon={<UsersIcon className="text-muted-foreground size-4" />}
              showDefaultAction={false}
              collapsible
              defaultOpen
            >
              Profilo lavoratore sintetico.
            </DetailSectionBlock>
          }
          addressBlock={
            <AddressSectionCard
              isEditing={false}
              isUpdating={false}
              showEditAction
              showCap
              addressDraft={{
                provincia: "Milano",
                cap: "20141",
                indirizzo_residenza_completo: "Via Roma 10, Milano",
                come_ti_sposti: ["Mi sposto con i mezzi"],
              }}
              provinciaOptions={lookupOptions.province}
              mobilityOptions={lookupOptions.mobility}
              selectedProvincia="Milano"
              selectedCap="20141"
              selectedAddress="Via Roma 10, Milano"
              selectedMobility={["Mi sposto con i mezzi"]}
              mobilityAnchor={mobilityAnchor}
              onToggleEdit={() => undefined}
              onProvinciaChange={() => undefined}
              onCapChange={() => undefined}
              onCapBlur={() => undefined}
              onAddressChange={() => undefined}
              onAddressBlur={() => undefined}
              onMobilityChange={() => undefined}
            />
          }
          availabilityStatusBlock={
            <AvailabilityStatusCard
              isEditing={false}
              showEditAction
              isUpdating={false}
              disponibilitaOptions={lookupOptions.availability}
              draft={{ disponibilita: "Disponibile", data_ritorno_disponibilita: "" }}
              selectedDisponibilita="Disponibile"
              selectedDisponibilitaBadgeClassName="border-emerald-200 bg-emerald-100 text-emerald-700"
              selectedDataRitorno=""
              onToggleEdit={() => undefined}
              onDisponibilitaChange={() => undefined}
              onDataRitornoChange={() => undefined}
              onDataRitornoBlur={() => undefined}
            />
          }
          availabilityCalendarBlock={
            <AvailabilityCalendarCard
              titleMeta="20 ore / settimana"
              isEditing={false}
              showEditAction
              collapsible
              defaultOpen
              isUpdating={false}
              editDays={editDays}
              editBands={editBands}
              hourLabels={["Mattina", "Pomeriggio", "Sera"]}
              readOnlyRows={[
                { day: "Lunedì", activeByHour: [true, true, false] },
                { day: "Martedì", activeByHour: [true, false, false] },
                { day: "Mercoledì", activeByHour: [true, true, false] },
                { day: "Giovedì", activeByHour: [true, true, false] },
                { day: "Venerdì", activeByHour: [true, false, false] },
              ]}
              comparisonRows={[
                { day: "Lunedì", activeByHour: [true, false, false] },
              ]}
              familyRequestsText="Richiesta famiglia: mattina dal lunedì al venerdì."
              matrix={{
                "mon:morning": true,
                "mon:afternoon": true,
                "tue:morning": true,
              }}
              vincoliOrari="Preferisce lavorare entro le 15:00."
              onToggleEdit={() => undefined}
              onMatrixChange={() => undefined}
              onVincoliChange={() => undefined}
              onVincoliBlur={() => undefined}
            />
          }
          jobSearchBlock={
            <JobSearchCard
              isEditing={false}
              showEditAction
              isUpdating={false}
              draft={jobSearchDraft}
              tipoLavoroOptions={lookupOptions.lavori}
              tipoRapportoOptions={lookupOptions.rapporti}
              lavoriAccettabiliOptions={lookupOptions.giorni}
              trasfertaOptions={lookupOptions.yesNo}
              multipliContrattiOptions={lookupOptions.yesNo}
              paga9Options={lookupOptions.yesNo}
              lookupColorsByDomain={lookupColorsByDomain}
              selectedTipoLavoro={jobSearchDraft.tipo_lavoro_domestico}
              selectedTipoRapporto={jobSearchDraft.tipo_rapporto_lavorativo}
              selectedLavoriAccettabili={jobSearchDraft.check_lavori_accettabili}
              selectedTrasferta={jobSearchDraft.check_accetta_lavori_con_trasferta}
              selectedMultipliContratti={
                jobSearchDraft.check_accetta_multipli_contratti
              }
              selectedPaga9={jobSearchDraft.check_accetta_paga_9_euro_netti}
              onToggleEdit={() => undefined}
              onTipoLavoroChange={() => undefined}
              onTipoRapportoChange={() => undefined}
              onLavoriAccettabiliChange={() => undefined}
              onTrasfertaChange={() => undefined}
              onMultipliContrattiChange={() => undefined}
              onPaga9Change={() => undefined}
            />
          }
          experienceReferencesBlock={
            <ExperienceReferencesCard
              workerId="worker-story-1"
              isEditing={false}
              showEditAction
              showCreateExperienceAction
              collapsible
              defaultOpen
              title="Esperienze e referenze"
              showSummaryFields
              showSituationField
              showReferencesSection
              aiSummaryValue="Esperienza solida come colf e tata, con referenze verificabili."
              isGeneratingAiSummary={false}
              isUpdating={false}
              draft={experienceDraft}
              experiences={[]}
              experiencesLoading={false}
              references={[]}
              referencesLoading={false}
              lookupColorsByDomain={lookupColorsByDomain}
              experienceTipoLavoroOptions={lookupOptions.lavori}
              experienceTipoRapportoOptions={lookupOptions.rapporti}
              referenceStatusOptions={[
                { label: "Verificata", value: "Verificata" },
                { label: "Da verificare", value: "Da verificare" },
              ]}
              selectedAnniEsperienzaColf={experienceDraft.anni_esperienza_colf}
              selectedAnniEsperienzaBadante={
                experienceDraft.anni_esperienza_badante
              }
              selectedAnniEsperienzaBabysitter={
                experienceDraft.anni_esperienza_babysitter
              }
              selectedSituazioneLavorativaAttuale={
                experienceDraft.situazione_lavorativa_attuale
              }
              onGenerateAiSummary={() => undefined}
              onToggleEdit={() => undefined}
              onAnniEsperienzaColfChange={() => undefined}
              onAnniEsperienzaBadanteChange={() => undefined}
              onAnniEsperienzaBabysitterChange={() => undefined}
              onSituazioneLavorativaAttualeChange={() => undefined}
              onAnniEsperienzaColfBlur={() => undefined}
              onAnniEsperienzaBadanteBlur={() => undefined}
              onAnniEsperienzaBabysitterBlur={() => undefined}
              onSituazioneLavorativaAttualeBlur={() => undefined}
              onExperiencePatch={() => undefined}
              onExperienceCreate={() => undefined}
              onExperienceDelete={() => undefined}
              onReferencePatch={() => undefined}
              onReferenceCreate={() => undefined}
            />
          }
          skillsBlock={
            <SkillsCompetenzeCard
              isEditing={false}
              showEditAction
              collapsible
              defaultOpen
              isUpdating={false}
              draft={skillValues}
              selectedValues={skillValues}
              lookupOptionsByDomain={lookupOptionsByDomain}
              lookupColorsByDomain={lookupColorsByDomain}
              onToggleEdit={() => undefined}
              onFieldChange={() => undefined}
            />
          }
          documentsBlock={
            <DocumentsCard
              workerId="worker-story-1"
              isEditing={false}
              showEditAction
              collapsible
              defaultOpen
              isUpdating={false}
              draft={documentsDraft}
              selectedValues={{
                stato_verifica_documenti: documentsDraft.stato_verifica_documenti,
                documenti_in_regola: documentsDraft.documenti_in_regola,
                data_scadenza_naspi: documentsDraft.data_scadenza_naspi,
              }}
              documents={[]}
              documentsLoading={false}
              verificationOptions={[
                { label: "Documenti verificati", value: "Documenti verificati" },
                { label: "Da verificare", value: "Da verificare" },
              ]}
              statoDocumentiOptions={[
                {
                  label: "Ho tutti i documenti in regola",
                  value: "Ho tutti i documenti in regola",
                },
                { label: "Documenti mancanti", value: "Documenti mancanti" },
              ]}
              lookupColorsByDomain={lookupColorsByDomain}
              administrativeValues={{
                iban: documentsDraft.iban,
                id_stripe_account: documentsDraft.id_stripe_account,
              }}
              onToggleEdit={() => undefined}
              onVerificationChange={() => undefined}
              onStatoDocumentiChange={() => undefined}
              onNaspiChange={() => undefined}
              onNaspiBlur={() => undefined}
              onIbanChange={() => undefined}
              onIbanBlur={() => undefined}
              onStripeAccountChange={() => undefined}
              onStripeAccountBlur={() => undefined}
              onDocumentUpsert={() => undefined}
              onUploadError={() => undefined}
            />
          }
          processesBlock={
            <DetailSectionBlock
              title="Processi coinvolti"
              icon={<MessageSquareTextIcon className="text-muted-foreground size-4" />}
              showDefaultAction={false}
              collapsible
              defaultOpen
            >
              <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                Famiglia Giannobi · fase di colloquio · Prova con cliente
              </div>
            </DetailSectionBlock>
          }
          interviewBlock={
            <DetailSectionBlock
              title="Scheda colloquio"
              icon={<ClipboardListIcon className="text-muted-foreground size-4" />}
              showDefaultAction={false}
              collapsible
              defaultOpen
            >
              <SchedaColloquioPanel
                selectionRow={{
                  stato_selezione: "Da colloquiare",
                  vanno_bene_i_giorni: "Sì",
                  vanno_bene_gli_orari: "Sì",
                  distanza_con_altri_impegni: "Compatibile",
                  accetta_stipendio: "Sì",
                  pro_motivazioni: "Esperienza coerente con la famiglia.",
                  aspetti_divergenza: "Da verificare distanza.",
                  score_distanza_orari: "Alto",
                  score_esperienze: "Alto",
                  score_paga_9_euro: "Medio",
                  score_overall: "Alto",
                  feedback_baze: "Feedback finale da inviare alla famiglia.",
                }}
                statusOptions={[
                  { label: "Da colloquiare", value: "Da colloquiare" },
                  { label: "No Match", value: "No Match" },
                  { label: "Match", value: "Match" },
                ]}
                nonSelezionatoOptions={[{ label: "Poor fit", value: "Poor fit" }]}
                noMatchOptions={[{ label: "Budget", value: "Budget" }]}
                lookupColorsByDomain={lookupColorsByDomain}
                disabled={false}
                isGeneratingFeedback={false}
                onGenerateFeedback={() => "Feedback generato"}
                onMoveStatus={() => undefined}
                onPatchField={() => undefined}
              />
            </DetailSectionBlock>
          }
        />
      </div>
    );
}

export const Default: Story = {
  render: (args) => <DefaultRender {...args} />,
};
