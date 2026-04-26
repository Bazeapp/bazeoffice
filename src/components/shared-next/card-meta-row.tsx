import * as React from "react";

import { cn } from "@/lib/utils";

export interface CardMetaRowProps {
  /**
   * Icona leading. Se omessa, la riga renderizza i children inline con
   * flex-wrap (utile per righe di Badge/tag).
   */
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * CardMetaRow — riga di metadati standard per le card di lista
 * (mail, telefono, deadline, luogo, ore, etc.).
 *
 * Single source of truth per la coppia testo/icona delle metadata row:
 *   - testo  → 12.5px · #76756f
 *   - icona  → 12px · #a3a29b
 *
 * Due modalità:
 *   - **icon + text** (default): icon prop + children = stringa.
 *     `<CardMetaRow icon={<MailIcon />}>aria@bazeapp.it</CardMetaRow>`
 *     Layout: flex row, icona shrink-0 + testo truncate.
 *
 *   - **tags variant**: icon assente, children = badges/elementi inline.
 *     `<CardMetaRow><Badge>Colf</Badge><Badge>Lavoro</Badge></CardMetaRow>`
 *     Layout: flex-wrap, gap 1.5.
 */
export const CardMetaRow = React.forwardRef<HTMLDivElement, CardMetaRowProps>(
  ({ icon, children, className }, ref) => {
    if (icon) {
      return (
        <div
          ref={ref}
          data-slot="card-meta-row"
          className={cn(
            "flex min-w-0 items-center gap-2 text-[12.5px] text-[#76756f]",
            className,
          )}
        >
          <span
            aria-hidden
            className="shrink-0 [&_svg]:size-3 [&_svg]:shrink-0 [&_svg]:text-[#a3a29b]"
          >
            {icon}
          </span>
          <span className="min-w-0 truncate">{children}</span>
        </div>
      );
    }
    return (
      <div
        ref={ref}
        data-slot="card-meta-row"
        className={cn(
          "flex min-w-0 flex-wrap items-center gap-1.5",
          className,
        )}
      >
        {children}
      </div>
    );
  },
);
CardMetaRow.displayName = "CardMetaRow";
