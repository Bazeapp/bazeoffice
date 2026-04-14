import {
  BellIcon,
  ExternalLinkIcon,
  MapPinIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ─── Mock data ────────────────────────────────────────────────────────────────

type RicercaRow = {
  famiglia: string;
  oreSett: string;
  orario: string;
  luogo: string;
  lavoro: string;
  stato: string;
  recruiter: string;
};

const RICERCHE_ATTIVE: RicercaRow[] = [
  {
    famiglia: "Demo – Ferrara Marco",
    oreSett: "15",
    orario: "—",
    luogo: "Como – Isola",
    lavoro: "Colf",
    stato: "Fare ricerca",
    recruiter: "—",
  },
  {
    famiglia: "Demo – Giulia Bianchi",
    oreSett: "20",
    orario: "Mattina",
    luogo: "Milano – Centro",
    lavoro: "Badante",
    stato: "In attesa",
    recruiter: "Alberto R.",
  },
  {
    famiglia: "Demo – Luca Esposito",
    oreSett: "12",
    orario: "Sera",
    luogo: "Monza",
    lavoro: "Colf",
    stato: "Selezione",
    recruiter: "—",
  },
  {
    famiglia: "Demo – Sara Conti",
    oreSett: "25",
    orario: "Full day",
    luogo: "Bergamo",
    lavoro: "Badante",
    stato: "Colloquio",
    recruiter: "Maria V.",
  },
  {
    famiglia: "Demo – Toni Mancini",
    oreSett: "18",
    orario: "Pomeriggio",
    luogo: "Varese",
    lavoro: "Colf",
    stato: "Fare ricerca",
    recruiter: "—",
  },
];

// ─── Badge inline helpers ─────────────────────────────────────────────────────

function LavoroBadge({ label }: { label: string }) {
  const isBadante = label === "Badante";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
        isBadante
          ? "bg-badge-blue-bg text-badge-blue"
          : "bg-badge-gray-bg text-badge-gray"
      }`}
    >
      {label}
    </span>
  );
}

function StatoBadge({ label }: { label: string }) {
  const map: Record<string, string> = {
    "Fare ricerca": "bg-badge-orange-bg text-badge-orange",
    "In attesa":    "bg-badge-amber-bg text-badge-amber",
    "Selezione":    "bg-badge-blue-bg text-badge-blue",
    "Colloquio":    "bg-badge-teal-bg text-badge-teal",
  };
  const cls = map[label] ?? "bg-badge-gray-bg text-badge-gray";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function HomePage() {
  return (
    <div className="flex w-full flex-col gap-6 pb-8">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Buongiorno 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ecco una panoramica di quello che succede oggi su BazeOffice.
        </p>
      </div>

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ricerche attivate con Baze
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-badge-green">346</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ricerche attive
            </CardTitle>
            <p className="text-xs text-muted-foreground">In corso adesso</p>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-badge-blue">14</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Contratti attivi
            </CardTitle>
            <p className="text-xs text-muted-foreground">Con data di assunzione</p>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-badge-orange">5</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Run rate stipendi (12m)
            </CardTitle>
            <p className="text-xs text-muted-foreground">Stima annuale</p>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-badge-purple">€ 312k</p>
          </CardContent>
        </Card>

      </div>

      {/* ── Map + Notifiche ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Mappa */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <UsersIcon className="size-4 text-muted-foreground" />
              Lavoratori certificati a Milano
            </CardTitle>
            <span className="inline-flex items-center rounded-full bg-badge-blue-bg px-2 py-0.5 text-[11px] font-semibold text-badge-blue">
              138
            </span>
          </CardHeader>
          <CardContent>
            <div className="flex h-[360px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-surface-inset">
              <MapPinIcon className="size-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Mappa lavoratori — in arrivo
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifiche */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <BellIcon className="size-4 text-muted-foreground" />
              Notifiche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[360px] items-center justify-center">
              <p className="text-sm text-muted-foreground">
                Nessuna notifica recente
              </p>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* ── Tabella ricerche attive ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <SearchIcon className="size-4 text-muted-foreground" />
            Ricerche attive
          </CardTitle>
          <span className="inline-flex items-center rounded-full bg-badge-blue-bg px-2 py-0.5 text-[11px] font-semibold text-badge-blue">
            8
          </span>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Famiglia</TableHead>
                <TableHead>Ore sett.</TableHead>
                <TableHead>Orario</TableHead>
                <TableHead>Luogo</TableHead>
                <TableHead>Lavoro</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Recruiter</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>

              {/* Riga di raggruppamento */}
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableCell
                  colSpan={8}
                  className="py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Sostituzioni
                  <span className="ml-2 inline-flex items-center rounded-full bg-badge-gray-bg px-1.5 py-0.5 text-[10px] font-semibold text-badge-gray">
                    5
                  </span>
                </TableCell>
              </TableRow>

              {/* Righe dati */}
              {RICERCHE_ATTIVE.map((row) => (
                <TableRow key={row.famiglia}>
                  <TableCell className="font-medium">{row.famiglia}</TableCell>
                  <TableCell>{row.oreSett}</TableCell>
                  <TableCell className="text-muted-foreground">{row.orario}</TableCell>
                  <TableCell className="text-muted-foreground">{row.luogo}</TableCell>
                  <TableCell>
                    <LavoroBadge label={row.lavoro} />
                  </TableCell>
                  <TableCell>
                    <StatoBadge label={row.stato} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.recruiter}</TableCell>
                  <TableCell>
                    <button className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors">
                      <ExternalLinkIcon className="size-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}

            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}
