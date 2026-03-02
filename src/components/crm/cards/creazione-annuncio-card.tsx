import * as React from "react";
import {
  ExternalLinkIcon,
  FileTextIcon,
  MessageSquareTextIcon,
  SparklesIcon,
} from "lucide-react";

import { CrmDetailCard } from "@/components/crm/detail-card";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

const ANNUNCIO_FIELDS = {
  titolo: "Colf Part-Time Mattina a Milano Arco della Pace",
  descrizioneSeo:
    "Offerta lavoro Colf a Milano, Arco della Pace: pulizie, pasti, lavanderia e stiro. Part-time mattina, lun-ven, 20 ore settimanali. Paga 9€/ora.",
  slug: "lavoro-colf-milano-arco-della-pace-mattina-part-time",
  annuncioUrl:
    "https://www.bazeapp.com/lavori/lavoro-colf-milano-arco-della-pace-mattina-part-time",
  ruolo: "Colf / Pulizie",
  quartiere: "Arco della Pace",
  citta: "Milano",
  cap: "20121",
  giorniSettimana: "5",
  oreSettimana: "20",
  mansioni:
    "pulizie generali e di fino, preparazione pasti, lavanderia e stiro (anche camicie)",
  casaMq: "150",
  composizioneFamiglia: "2 adulti e 2 ragazze",
  animali: "2 gatti",
  retribuzione: "9€ netti l'ora",
};

function formatBodyAnnuncio(raw: string) {
  const rows = raw.split("\n").map((row) => row.trimEnd());
  const cleaned: string[] = [];

  for (const row of rows) {
    const previous = cleaned.at(-1) ?? "";
    if (!row && !previous) continue;
    cleaned.push(row);
  }

  return cleaned.join("\n").trim();
}

function sanitizeHtml(raw: string) {
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function createInitialBodyAnnuncio() {
  return `<H2>Offerta di Lavoro Part-Time a ${ANNUNCIO_FIELDS.citta}: ${ANNUNCIO_FIELDS.ruolo}</H2>

<H3>Dettagli dell'Offerta di Lavoro</H3>
Sei alla ricerca di un lavoro part-time a ${ANNUNCIO_FIELDS.citta}? Abbiamo un'opportunità per una famiglia residente in ${ANNUNCIO_FIELDS.quartiere}, ${ANNUNCIO_FIELDS.citta} (CAP ${ANNUNCIO_FIELDS.cap}). Il lavoro richiede un impegno di ${ANNUNCIO_FIELDS.giorniSettimana} giorni a settimana, per un totale di ${ANNUNCIO_FIELDS.oreSettimana} ore settimanali.

<H3>Mansioni Richieste</H3>
Le mansioni specifiche includono ${ANNUNCIO_FIELDS.mansioni}.

<H3>Descrizione della Casa e della Famiglia</H3>
La casa in cui si svolgerà il lavoro è di ${ANNUNCIO_FIELDS.casaMq} metri quadri. La famiglia è composta da ${ANNUNCIO_FIELDS.composizioneFamiglia}. Inoltre, ci sono ${ANNUNCIO_FIELDS.animali} in casa.

<H3>Retribuzione</H3>
La paga netta oraria è di ${ANNUNCIO_FIELDS.retribuzione}.`;
}

const READONLY_BLOCK_CLASS =
  "rounded-md bg-muted/60 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words";
const WHATSAPP_TEXT = `**Offerta di Lavoro - Colf Part-Time a Milano**

🕒 **Orario**: Lun-Ven, 9:00-13:00 o 10:00-14:00 (20h/settimana)
💰 **Retribuzione**: 9€/ora netti, con contratto
📍 **Luogo**: Arco della Pace, Milano

Mansioni: pulizie, pasti, lavanderia, stiro. Famiglia con 2 adulti, 2 ragazze e 2 gatti.

Pensi di essere la persona giusta? Candidati qui sotto
https://go.Bazeapp.com/HBT`;

export function CreazioneAnnuncioCard() {
  const [isEditingBody, setIsEditingBody] = React.useState(false);
  const [bodyAnnuncio, setBodyAnnuncio] = React.useState(
    createInitialBodyAnnuncio(),
  );

  const handleBodyToggle = React.useCallback(() => {
    if (isEditingBody) {
      setBodyAnnuncio((current) => formatBodyAnnuncio(current));
      setIsEditingBody(false);
      return;
    }
    setIsEditingBody(true);
  }, [isEditingBody]);

  return (
    <CrmDetailCard title="Creazione Annuncio">
      <FieldGroup>
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" type="button">
              <SparklesIcon />
              Crea i testi
            </Button>
            <div className="bg-border mx-1 h-px min-w-6 flex-1" />

            <Button variant="outline" size="sm" type="button">
              <FileTextIcon />
              Crea annuncio
              <ExternalLinkIcon />
            </Button>
            <div className="bg-border mx-1 h-px min-w-6 flex-1" />
            <Button variant="outline" size="sm" type="button">
              <MessageSquareTextIcon />
              Crea whatsapp
              <ExternalLinkIcon />
            </Button>
          </div>
        </div>

        <Field>
          <FieldLabel htmlFor="onboarding-annuncio-titolo">Titolo</FieldLabel>
          <div id="onboarding-annuncio-titolo" className={READONLY_BLOCK_CLASS}>
            {ANNUNCIO_FIELDS.titolo}
          </div>
        </Field>

        <Field>
          <FieldLabel htmlFor="onboarding-annuncio-seo">Descrizione SEO</FieldLabel>
          <div id="onboarding-annuncio-seo" className={READONLY_BLOCK_CLASS}>
            {ANNUNCIO_FIELDS.descrizioneSeo}
          </div>
        </Field>

        <Field>
          <FieldLabel htmlFor="onboarding-annuncio-slug">Slug</FieldLabel>
          <div id="onboarding-annuncio-slug" className={READONLY_BLOCK_CLASS}>
            {ANNUNCIO_FIELDS.slug}
          </div>
        </Field>

        <Field>
          <FieldLabel>Annuncio</FieldLabel>
          <FieldDescription>
            <a
              href={ANNUNCIO_FIELDS.annuncioUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary break-all underline underline-offset-2"
            >
              {ANNUNCIO_FIELDS.annuncioUrl}
            </a>
          </FieldDescription>
        </Field>

        <Field>
          <div className="mb-1 flex items-center justify-between gap-3">
            <FieldLabel htmlFor="onboarding-annuncio-body">Body Annuncio</FieldLabel>
            <Button variant="outline" size="sm" type="button" onClick={handleBodyToggle}>
              {isEditingBody ? "Salva" : "Modifica"}
            </Button>
          </div>
          {isEditingBody ? (
            <Textarea
              id="onboarding-annuncio-body"
              value={bodyAnnuncio}
              onChange={(event) => setBodyAnnuncio(event.target.value)}
              className="min-h-72 resize-y"
            />
          ) : (
            <div
              id="onboarding-annuncio-body"
              className={`${READONLY_BLOCK_CLASS} min-h-72 [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-semibold [&_p]:mb-3`}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(bodyAnnuncio) }}
            />
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="onboarding-testo-whatsapp">Testo per whatsapp</FieldLabel>
          <div
            id="onboarding-testo-whatsapp"
            className="rounded-md border bg-[#efeae2] p-3 dark:bg-muted/40"
          >
            <div className="ml-auto max-w-[92%] rounded-xl rounded-br-sm border border-emerald-200 bg-emerald-100/80 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap text-foreground shadow-sm">
              {WHATSAPP_TEXT}
            </div>
          </div>
        </Field>
      </FieldGroup>
    </CrmDetailCard>
  );
}
