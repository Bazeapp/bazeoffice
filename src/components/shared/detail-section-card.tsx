import type { ReactNode } from "react";
import { PencilIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── DetailSectionCard (legacy) ───────────────────────────────────────────────
// @deprecated — Predates the Lovable design system refresh. Still in active use
// by rapporto-detail-panel, gate1-view, skills-competenze-card, and others
// outside the current restyling scope. Do not use in new code — prefer
// DetailSectionBlock for section headers inside detail sheets.
// Will be migrated in a future cleanup step.
// ─────────────────────────────────────────────────────────────────────────────

type DetailSectionCardProps = {
  title: ReactNode;
  titleIcon?: ReactNode;
  titleAction?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  titleClassName?: string;
  titleOnBorder?: boolean;
};

export function DetailSectionCard({
  title,
  titleIcon,
  titleAction,
  children,
  className,
  contentClassName,
  titleClassName,
  titleOnBorder = false,
}: DetailSectionCardProps) {
  return (
    <Card
      className={cn(
        titleOnBorder && "relative overflow-visible p-0",
        className,
      )}
    >
      {titleOnBorder ? (
        <CardTitle
          className={cn(
            "ui-type-subsection text-foreground pointer-events-none absolute top-1 right-3 left-1 flex -translate-y-1/2 items-center justify-between gap-2 px-0 font-semibold",
            titleClassName,
          )}
        >
          <span className="flex items-center gap-2">
            {titleIcon ? titleIcon : null}
            <span>{title}</span>
          </span>
          {titleAction ? (
            <span className="pointer-events-auto shrink-0">{titleAction}</span>
          ) : null}
        </CardTitle>
      ) : (
        <CardHeader>
          <CardTitle
            className={cn(
              "ui-type-section flex items-center justify-between gap-2",
              titleClassName,
            )}
          >
            <span className="flex items-center gap-2">
              {titleIcon ? titleIcon : null}
              <span>{title}</span>
            </span>
            {titleAction ? (
              <span className="shrink-0">{titleAction}</span>
            ) : null}
          </CardTitle>
        </CardHeader>
      )}
      {children ? (
        <CardContent className={cn(titleOnBorder && "pt-6", contentClassName)}>{children}</CardContent>
      ) : null}
    </Card>
  );
}

// ─── DetailSectionBlock ───────────────────────────────────────────────────────
// BREAKING CHANGE (Step 6a): Previously rendered as two nested Shadcn Cards.
// Now renders a sticky header bar followed by a plain content div.
// ─────────────────────────────────────────────────────────────────────────────

type DetailSectionBlockProps = {
  title: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  onActionClick?: () => void;
  actionLabel?: string;
  showDefaultAction?: boolean;
  children?: ReactNode;
  className?: string;
  /** @deprecated No longer renders a banner Card. Kept for interface compat. */
  bannerClassName?: string;
  /** @deprecated No longer renders an inner content Card. Kept for interface compat. */
  cardClassName?: string;
  contentClassName?: string;
  /** Pass true on the first block to suppress the top border/margin separator. */
  first?: boolean;
};

export function DetailSectionBlock({
  title,
  icon,
  action,
  onActionClick,
  actionLabel = "Modifica sezione",
  showDefaultAction = true,
  children,
  className,
  // bannerClassName and cardClassName kept in signature but not applied
  contentClassName,
  first = false,
}: DetailSectionBlockProps) {
  const resolvedAction =
    action ??
    (showDefaultAction ? (
      <button
        type="button"
        onClick={onActionClick}
        disabled={!onActionClick}
        aria-label={actionLabel}
        title={actionLabel}
        className="p-1.5 rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
      >
        <PencilIcon className="size-3.5" />
      </button>
    ) : null);

  return (
    <div
      className={cn(
        "mt-6 pt-6 border-t border-border/50",
        "first:mt-0 first:pt-0 first:border-t-0",
        first && "mt-0 pt-0 border-t-0",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 mb-4 bg-primary/[0.04] border border-primary/20 shadow-elevation-xs sticky top-0 z-10 backdrop-blur-sm">
        {icon ? (
          <div className="flex items-center justify-center w-7 h-7 shrink-0 rounded-md bg-primary/10 [&_svg]:!size-3.5 [&_svg]:!text-primary">
            {icon}
          </div>
        ) : null}
        <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider flex-1 leading-none">
          {title}
        </h3>
        {resolvedAction ? <div className="shrink-0">{resolvedAction}</div> : null}
      </div>

      {children != null ? (
        <div className={cn("px-1 pb-4", contentClassName)}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

// ─── DetailField ──────────────────────────────────────────────────────────────

type DetailFieldProps = {
  label: string;
  value: ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
};

export function DetailField({
  label,
  value,
  className,
  labelClassName,
  valueClassName,
}: DetailFieldProps) {
  return (
    <div className={cn(className)}>
      <span className={cn("text-muted-foreground text-xs", labelClassName)}>
        {label}:
      </span>{" "}
      <span className={cn("text-foreground text-xs", valueClassName)}>
        {value ?? "–"}
      </span>
    </div>
  );
}

// ─── DetailFieldControl ───────────────────────────────────────────────────────
// Child inputs should use `h-8 text-xs bg-background` for visual consistency.

type DetailFieldControlProps = {
  label: string;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
};

export function DetailFieldControl({
  label,
  children,
  className,
  labelClassName,
}: DetailFieldControlProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className={cn("text-[11px] font-medium text-muted-foreground", labelClassName)}>
        {label}
      </p>
      {children}
    </div>
  );
}
