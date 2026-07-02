# Baze Office — Frontend

Frontend di **Baze**, gestionale HR/staffing per il mercato italiano del lavoro domestico:
copre l'intero ciclo **Lead → CRM → assegnazione recruiter → ricerca lavoratori → colloqui →
assunzione → contratto attivo → payroll → variazioni/chiusure → riattivazioni → support**.

È una **SPA React** che non ha un application server proprio: tutta la logica di business e i
dati vivono nel **backend Supabase** (repo `Bazeapp/backend-supabase`). Questo repo è solo la
UI; legge e scrive **esclusivamente** attraverso le RPC e le Edge Functions di quel progetto.

Il deploy è **automatico su GitHub Pages**: un ambiente di **produzione** e uno di **staging**,
ognuno collegato alla **propria istanza Supabase**.

---

## Indice

- [Stack](#stack)
- [Architettura in breve](#architettura-in-breve)
- [Ambienti e mappa di deploy](#ambienti-e-mappa-di-deploy)
- [Variabili d'ambiente](#variabili-dambiente)
- [Setup locale](#setup-locale)
- [Comandi](#comandi)
- [Flusso di lavoro per fare modifiche](#flusso-di-lavoro-per-fare-modifiche)
- [Esporre un nuovo campo del backend](#esporre-un-nuovo-campo-del-backend)
- [Documentazione di approfondimento](#documentazione-di-approfondimento)

---

## Stack

- **React 19** + **TypeScript** + **Vite** (`base` di build `/bazeoffice/`).
- **Tailwind 4** via `@tailwindcss/vite` (nessun `tailwind.config.js`, nessun PostCSS; token in `src/index.css`).
- **TanStack Query** come unica fonte di verità lato client (`staleTime: Infinity`, refresh solo da mutation o eventi realtime).
- **`@supabase/supabase-js`** per auth, query board (RPC) e realtime.
- UI: Radix UI / shadcn-style vendorizzati in `src/components/ui/`, AG Grid + react-querybuilder per il browser raw delle Anagrafiche.
- **Nessun router library**: routing custom a slug in `src/routes/app-routes.ts`.
- Test: **Vitest** (`happy-dom`); **Storybook** per i componenti.

Node **20** (allineato alla CI).

---

## Architettura in breve

`main.tsx` → `App.tsx` → `MainApp` (gate di auth) → `AppShell`.

I dati passano **sempre** dal backend Supabase tramite tre percorsi di lettura (RPC board,
edge function `table-query`, edge function `lookup-values`) e tre writer centrali
(`create-record` / `update-record` / `delete-record`). Le board si aggiornano via realtime
(Postgres CDC) con soppressione dell'eco delle scritture locali.

> Il dettaglio completo dell'architettura (data layer, pattern realtime, autosave/form-context,
> vincoli ESLint architetturali, modello di dominio) è in **[`CLAUDE.md`](CLAUDE.md)** /
> **[`AGENTS.md`](AGENTS.md)**. Questo README copre stack, ambienti e deploy.

Sezioni principali dell'app (sidebar): **Anagrafiche** (Lavoratori, Famiglie, Processi, Mesi
lavorati, Pagamenti, Selezioni, Rapporti), **Customer Support** (Ticket, Prove e Colloqui,
Riattivazioni), **CRM Famiglie** (Pipeline, Assegnazione), **Ricerca**, **Lavoratori**
(Cerca, Gate 1, Gate 2), **Gestione contrattuale** (Rapporti, Assunzioni, Chiusure,
Variazioni) e **Payroll** (Cedolini, Contributi INPS).

---

## Ambienti e mappa di deploy

Lo **stesso codice** viene buildato due volte, con env diverse, e pubblicato su **due siti
GitHub Pages** distinti. Ogni sito parla con il proprio progetto Supabase.

| Ambiente   | Ramo git  | Workflow                                         | Repo Pages di destinazione | `base` | URL pubblico | Backend Supabase |
|------------|-----------|--------------------------------------------------|----------------------------|--------|--------------|------------------|
| Produzione | `main`    | `.github/workflows/deploy-pages.yml`             | `Bazeapp/bazeoffice` (questo repo) | `/bazeoffice/`         | https://bazeapp.github.io/bazeoffice/         | prod (`vrrusyyxqgitgovazbfe`)   |
| Staging    | `staging` | `.github/workflows/deploy-pages-staging.yml`     | `Bazeapp/staging-bazeoffice`       | `/staging-bazeoffice/` | https://bazeapp.github.io/staging-bazeoffice/ | staging (`zpjafcnpdiekzegcecjn`) |

Come funziona:

- **Produzione** — push su `main` → build con il `base` di default (`/bazeoffice/`) → pubblica
  l'artefatto sulle GitHub Pages **di questo stesso repo**. I secret arrivano dal GitHub
  Environment **`github-pages`**.
- **Staging** — push su `staging` → build con `--base=/staging-bazeoffice/` e `VITE_APP_ENV=staging`
  → la action `JamesIves/github-pages-deploy-action` **pusha la `dist/` sul ramo `gh-pages` di
  un repo separato** (`Bazeapp/staging-bazeoffice`), usando il secret `STAGING_DEPLOY_TOKEN`
  (PAT con scope `repo`). I secret di build arrivano dal GitHub Environment **`staging`**.
- Entrambi i workflow **validano la presenza** delle tre `VITE_SUPABASE_*` prima di buildare e
  abilitano il **fallback SPA** copiando `index.html` in `404.html` (serve perché il routing è
  client-side senza hash).

> **Quale backend?** È deciso *al build* dalle tre variabili `VITE_SUPABASE_*` iniettate
> dall'Environment GitHub corrispondente. Per far puntare staging e produzione allo stesso
> Supabase basta copiare gli stessi secret nei due Environment.

---

## Variabili d'ambiente

Tutte e tre sono **obbligatorie**: il client Supabase fa `throw` all'avvio se ne manca una
(`src/lib/supabase-client.ts`, `src/lib/supabase-edge.ts`).

| Variabile | Esempio (produzione) | Uso |
|-----------|----------------------|-----|
| `VITE_SUPABASE_URL`           | `https://vrrusyyxqgitgovazbfe.supabase.co`               | Endpoint REST/Realtime/Auth |
| `VITE_SUPABASE_ANON_KEY`      | `eyJ...` (anon JWT)                                      | Chiave pubblica anon |
| `VITE_SUPABASE_FUNCTIONS_URL` | `https://vrrusyyxqgitgovazbfe.supabase.co/functions/v1` | Base URL delle Edge Functions |
| `VITE_APP_ENV` *(opz.)*       | `staging`                                                | Impostata solo dal workflow di staging |

In CI vivono nei GitHub Environment (`github-pages` per prod, `staging` per staging). In locale
stanno in **`.env`** (gitignored). Vedi **`.env.example`** per il template.

> ⚠️ Il `.env` locale **non va committato** ed è già in `.gitignore`. Non mettere il
> `STAGING_DEPLOY_TOKEN` o altri segreti CI nel `.env` di chi sviluppa: il token di deploy vive
> come secret nel repo GitHub, non nel frontend.

---

## Setup locale

```bash
cp .env.example .env     # poi compila le tre VITE_SUPABASE_* (di solito quelle di staging)
npm ci
npx lefthook install     # installa il pre-push hook (una volta)
npm run dev              # http://localhost:5173/bazeoffice/
```

Per sviluppare contro **staging** (consigliato, così non si toccano dati di produzione) usa le
chiavi del progetto `zpjafcnpdiekzegcecjn`. Le chiavi sono nella dashboard Supabase del
progetto → **Project Settings → API**.

---

## Comandi

Tutti dalla cartella `bazeoffice/`.

```bash
npm run dev           # dev server (React StrictMode on)
npm run dev:nostrict  # dev server senza StrictMode
npm run build         # tsc -b && vite build
npm run lint          # ESLint 9 (flat config)
npm test              # vitest run (tutti i test)
npm run test:unit     # solo unit (esclude *.integration.test.*)
npm run test:integration
npm run test:watch
npm run storybook     # Storybook su :6006

# Audit (eseguire a mano prima del push se hai toccato lookup o autosave):
npm run audit:lookup
npm run audit:autosave:strict
```

**Pre-push hook** (Lefthook): esegue test + `tsc` + eslint in parallelo. Bypass d'emergenza:
`LEFTHOOK=0 git push`.

---

## Flusso di lavoro per fare modifiche

> Regola d'oro: direzione unica **`dev` → `staging` → `main`.** In produzione ci arriva solo
> ciò che è passato da staging. Un push su `staging`/`main` è automaticamente pubblicato — non
> è inerte.

I tre rami:

- **`dev`** — ramo di **sviluppo**, qui si lavora (o si mergiano le feature branch). **Non ha
  workflow di deploy**: pushare su `dev` non pubblica nulla.
- **`staging`** — ambiente di **verifica**, deploy automatico.
- **`main`** — **produzione**, deploy automatico.

```bash
# 1. si lavora su dev
git checkout dev
git commit -am "..."
git push origin dev          # nessun deploy

# 2. si promuove a staging per verificare
git checkout staging
git merge --no-ff dev
git push origin staging      # -> build + deploy su https://bazeapp.github.io/staging-bazeoffice/

# 3. verifica su staging; se è tutto ok, si promuove a produzione
git checkout main
git merge --no-ff staging
git push origin main         # -> build + deploy su https://bazeapp.github.io/bazeoffice/ (PRODUZIONE)
```

Lo stato di ogni deploy è in **GitHub → Actions** (workflow "Deploy To GitHub Pages" /
"Deploy Staging To GitHub Pages") e in **Settings → Pages** per la produzione.

---

## Esporre un nuovo campo del backend

Il frontend può leggere solo i campi presenti nelle **allow-list del backend**. Esporre un
campo nuovo è un'operazione **cross-repo**:

1. **Backend** (`backend-supabase`): aggiungi il campo a `ALLOWED_FIELDS[table]` in
   `supabase/functions/table-query/index.ts` e **deploya la funzione**
   (`supabase functions deploy table-query`).
2. **Frontend** (questo repo): aggiungi il campo al `select` in
   `src/.../anagrafiche-api.ts`.

Senza il passo 1 il campo torna `undefined`. Il deploy delle Edge Functions **non** è gestito
da questo repo: vive nel backend (vedi il suo README).

---

## Documentazione di approfondimento

- **[`CLAUDE.md`](CLAUDE.md)** / **[`AGENTS.md`](AGENTS.md)** — architettura dettagliata: data
  layer, write-tracking, pattern realtime, form-context/autosave, vincoli ESLint, modello di
  dominio. Lettura obbligatoria prima di toccare board, hook o autosave.
- **Backend** — repo `Bazeapp/backend-supabase`: schema DB, Edge Functions, ambienti e deploy
  automatico via Supabase Branching. Il suo `README.md` spiega come prod/staging vengono
  applicate.
- `doc.md`, `roadmap.md`, `task.md` — note di prodotto e roadmap (storiche/di lavoro).
