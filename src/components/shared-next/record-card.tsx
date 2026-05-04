import * as React from "react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

/**
 * RecordCard — pattern di card "record in lista" usato dovunque ci sia
 * un elenco di entità (famiglia, ricerca, lavoratore, etc.).
 *
 * Compone visivamente `Card` di ui aggiungendo:
 *   - struttura compound `Header / Body / Footer` con slot tipizzati
 *   - prop `accent` per il bordo laterale colorato
 *   - hover shadow + cursor-pointer quando `onClick` è passato
 *
 * Esempio:
 *   <RecordCard accent="rose" onClick={...}>
 *     <RecordCard.Header
 *       title="Aria Bocelli"
 *       rightSlot={<Badge>Nuova</Badge>}
 *     />
 *     <RecordCard.Body>
 *       <CardMetaRow icon={<MailIcon />}>aria@bazeapp.it</CardMetaRow>
 *     </RecordCard.Body>
 *     <RecordCard.Footer
 *       leftSlot={<span>Preventivo accettato</span>}
 *       rightSlot={<Avatar />}
 *     />
 *   </RecordCard>
 */

export type RecordCardAccent =
  | "red"
  | "rose"
  | "orange"
  | "amber"
  | "emerald"
  | "sky"
  | "blue"
  | "violet"
  | "zinc";

const accentBgClasses: Record<RecordCardAccent, string> = {
  red: "bg-red-500",
  rose: "bg-rose-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  zinc: "bg-zinc-400",
};

export interface RecordCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Striscia accent sul lato sinistro (preset). */
  accent?: RecordCardAccent;
  /**
   * Classe Tailwind `bg-*` custom per la striscia accent. Usalo quando il
   * colore dipende da logica runtime (es. deadline, assegnatario).
   * Esempio: `bg-emerald-500`, `bg-rose-500`.
   */
  accentClassName?: string;
  /** Stato selezionato della card nella lista. Applica feedback visivo centralizzato. */
  selected?: boolean;
  children?: React.ReactNode;
}

export interface RecordCardHeaderProps {
  title: React.ReactNode;
  rightSlot?: React.ReactNode;
  /**
   * Slot a sinistra del titolo. Tipicamente un Avatar (con eventuale
   * status overlay), o una piccola icona. Il consumer è libero di
   * dimensionare il contenuto.
   */
  media?: React.ReactNode;
  /**
   * Sottotitolo opzionale sotto al titolo. Pensato per metadati primari
   * come "49 anni", "ID-1234", etc.
   */
  subtitle?: React.ReactNode;
  className?: string;
}

export interface RecordCardBodyProps {
  children?: React.ReactNode;
  className?: string;
}

export interface RecordCardFooterProps {
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  className?: string;
}

function RecordCardHeader({
  title,
  rightSlot,
  media,
  subtitle,
  className,
}: RecordCardHeaderProps) {
  return (
    <div
      data-slot="record-card-header"
      className={cn(
        "flex min-w-0 items-start justify-between gap-3",
        className,
      )}
    >
      {media ? <div className="shrink-0">{media}</div> : null}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 className="min-w-0 truncate text-base leading-snug font-semibold">
          {title}
        </h3>
        {subtitle ? (
          <div className="text-muted-foreground min-w-0 truncate text-xs leading-none">
            {subtitle}
          </div>
        ) : null}
      </div>
      {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
    </div>
  );
}
RecordCardHeader.displayName = "RecordCardHeader";

function RecordCardBody({ children, className }: RecordCardBodyProps) {
  return (
    <div
      data-slot="record-card-body"
      className={cn("flex flex-col gap-1.5", className)}
    >
      {children}
    </div>
  );
}
RecordCardBody.displayName = "RecordCardBody";

function RecordCardFooter({
  leftSlot,
  rightSlot,
  className,
}: RecordCardFooterProps) {
  return (
    <div
      data-slot="record-card-footer"
      className={cn(
        "flex min-w-0 items-center justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">{leftSlot}</div>
      {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
    </div>
  );
}
RecordCardFooter.displayName = "RecordCardFooter";

const RecordCardImpl = React.forwardRef<HTMLDivElement, RecordCardProps>(
  (
    { accent, accentClassName, selected = false, onClick, children, className, ...rest },
    ref,
  ) => {
    const hasAccent = Boolean(accent || accentClassName);
    return (
      <Card
        ref={ref}
        onClick={onClick}
        data-slot="record-card"
        className={cn(
          // Shape + chrome (CSS border invece della box-shadow ring di Card primitive)
          "relative overflow-hidden rounded-[10px] border border-border-subtle bg-surface p-4 gap-1.5",
          // 2-layer flat shadow @ 2-4% nero
          "shadow-[0_1px_1px_rgba(0,0,0,0.02),0_2px_4px_rgba(0,0,0,0.04)]",
          // Hover: cambio solo colore del bordo
          "transition-colors hover:border-border",
          selected &&
            "border-accent/70 bg-accent/5 ring-accent/40 ring-2 ring-offset-1 ring-offset-background shadow-md",
          onClick && "cursor-pointer",
          className,
        )}
        data-selected={selected || undefined}
        {...rest}
      >
        {hasAccent ? (
          <span
            aria-hidden
            className={cn(
              // Striscia accent assoluta, clippata dal border-radius del card (overflow-hidden)
              "pointer-events-none absolute top-0 bottom-0 left-0 w-1",
              accent && accentBgClasses[accent],
              accentClassName,
            )}
          />
        ) : null}
        {children}
      </Card>
    );
  },
);
RecordCardImpl.displayName = "RecordCard";

export const RecordCard = Object.assign(RecordCardImpl, {
  Header: RecordCardHeader,
  Body: RecordCardBody,
  Footer: RecordCardFooter,
});
