import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  CheckCheckIcon,
  CircleUserRoundIcon,
  ShieldCheckIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";

import { Gate1View } from "@/components/lavoratori/gate1-view";

const GATE2_WORKER_STATUSES = ["idoneo", "qualificato"];

export function Gate2View() {
  return (
    <Gate1View
      gateLabel="Gate 2"
      workerStatus={GATE2_WORKER_STATUSES}
      workerCountLabel="idonei o qualificati"
      applyGate1BaseFilters={false}
      showCertificationReferente
      showFollowup={false}
      showFollowupFilter={false}
      allowCertifiedStatus
      showSelfCertification={false}
      showReferencesInWorkTypes
      showAdministrativeFields
      showStepper
      splitBazeChecksStep
      stepInfoBySection={{
        referente: {
          title: (
            <span className="flex items-center gap-2">
              <UsersIcon className="text-muted-foreground size-4" />
              <span>1. Referente certificazione</span>
            </span>
          ),
          content: (
            <p className="text-muted-foreground">
              Assegna chi segue il Gate 2 e controlla chi ha gestito il Gate 1.
            </p>
          ),
        },
        presentazione: {
          title: (
            <span className="flex items-center gap-2">
              <CircleUserRoundIcon className="text-muted-foreground size-4" />
              <span>2. Introduzione - Benvenuto e Check Veloci</span>
            </span>
          ),
          content: (
            <>
              <p className="text-muted-foreground">
                Usa questo momento per mettere il lavoratore a proprio agio e
                spiegare cosa farete insieme oggi.
              </p>
              <blockquote className="border-l-2 pl-3">
                Oggi lavoriamo insieme sul tuo profilo, così possiamo proporti
                solo lavori adatti a te. Non è un esame, ma un lavoro che
                facciamo insieme.
              </blockquote>
            </>
          ),
        },
        tipologia: {
          title: (
            <span className="flex items-center gap-2">
              <BriefcaseBusinessIcon className="text-muted-foreground size-4" />
              <span>3. Esperienze - Inserisci le esperienze rilevanti</span>
            </span>
          ),
          content: (
            <>
              <div className="space-y-1">
                <p className="text-muted-foreground">
                  Ricostruisci con il lavoratore le esperienze più importanti.
                </p>
                <blockquote className="border-l-2 pl-3">
                  Usa una struttura chiara: contesto → mansioni → durata →
                  motivo di chiusura.
                </blockquote>
              </div>
              <p className="text-muted-foreground">
                Importante riuscire a farsi dare le referenze, spiegare che
                possono essere anche di lavori non in regola. Se dichiara
                referenze, spiegagli che ne verificheremo almeno una a campione.
              </p>
            </>
          ),
        },
        disponibilita: {
          title: (
            <span className="flex items-center gap-2">
              <SearchIcon className="text-muted-foreground size-4" />
              <span>4. Check rapido su Ricerca Lavoro</span>
            </span>
          ),
          content: (
            <>
              <p className="text-muted-foreground">
                Questi aspetti sono già stati verificati nel GATE 1.
              </p>
              <p className="text-muted-foreground">
                Qui fai solo un check veloce per confermare che sia tutto ancora
                valido.
              </p>
              <ul className="space-y-1 pt-1">
                <li>Disponibilità ancora attuale</li>
                <li>Orari coerenti con quanto detto prima</li>
                <li>Eventuali note importanti (preferenze / limiti)</li>
              </ul>
            </>
          ),
        },
        check_baze: {
          title: (
            <span className="flex items-center gap-2">
              <CheckCheckIcon className="text-muted-foreground size-4" />
              <span>5. Check rapido su accettazioni</span>
            </span>
          ),
          content: (
            <>
              <p className="text-muted-foreground">
                Conferma rapidamente gli aspetti già verificati nel primo
                colloquio.
              </p>
              <p className="text-muted-foreground">
                Se emergono dubbi o incoerenze, chiariscili ora.
              </p>
              <blockquote className="border-l-2 pl-3">
                Se una risposta è cambiata rispetto al GATE 1, fermati e
                chiarisci il motivo.
              </blockquote>
            </>
          ),
        },
        aspetti: {
          title: (
            <span className="flex items-center gap-2">
              <ShieldCheckIcon className="text-muted-foreground size-4" />
              <span>6. Assessment Skills e Caratteristiche</span>
            </span>
          ),
          content: (
            <>
              <p className="text-muted-foreground">
                Ora svolgi il test pratico insieme al lavoratore.
              </p>
              <p className="text-muted-foreground">
                Non guidare le risposte: osserva, fai domande situazionali e
                registra ciò che emerge.
              </p>
              <blockquote className="border-l-2 pl-3">
                I livelli di competenza che emergono qui sovrascriveranno le
                autocertificazioni in automatico.
              </blockquote>
            </>
          ),
        },
        documenti: {
          title: (
            <span className="flex items-center gap-2">
              <CheckCheckIcon className="text-muted-foreground size-4" />
              <span>7. Raccolta documenti</span>
            </span>
          ),
          content: (
            <p className="text-muted-foreground">
              Per concludere, raccogli i documenti del lavoratore. Usa questo
              form (idealmente aprilo dal telefono per fare le foto)
            </p>
          ),
        },
        assessment: {
          title: (
            <span className="flex items-center gap-2">
              <ArrowRightIcon className="text-muted-foreground size-4" />
              <span>Chiusura</span>
            </span>
          ),
          content: (
            <>
              <p className="text-muted-foreground">
                Se ritieni che il lavoratore abbia tutte le carte in regola per
                performare bene con Baze, cambia lo stato a certificato, se
                invece dovesse presentare evidenti red flag per carenza di
                skills o attitudine professionale/comportamentale non
                sufficiente, cambia lo stato a Non idoneo inserendo la
                motivazione.
              </p>
              <p className="text-muted-foreground">
                Al termine del colloquio se il lavoratore e Certificato,
                consegna anche il Welcome Kit.
              </p>
            </>
          ),
        },
      }}
      presentationEditMode="always"
      photoEditMode="editable"
      addressEditMode="always"
      workTypesEditMode="always"
      availabilityEditMode="always"
      bazeChecksEditMode="always"
      documentSectionMode="documents"
      showAssessment
      specificChecksMode="confirmation"
      specificChecksEditMode="always"
    />
  );
}
