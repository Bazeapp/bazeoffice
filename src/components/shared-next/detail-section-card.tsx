import * as React from "react";
import type { ReactNode } from "react";
import { ChevronDownIcon, PencilIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
            "ui-type-subsection text-foreground pointer-events-none absolute top-0 right-4 left-4 z-10 flex -translate-y-1/2 items-center justify-between gap-2 px-0 font-semibold",
            titleClassName,
          )}
        >
          <span className="bg-card flex min-w-0 items-center gap-2 rounded-full px-2 py-0.5">
            {titleIcon ? titleIcon : null}
            <span className="truncate">{title}</span>
          </span>
          {titleAction ? (
            <span className="bg-card pointer-events-auto shrink-0 rounded-full px-1 py-0.5">{titleAction}</span>
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
        <CardContent className={cn(titleOnBorder && "pt-7", contentClassName)}>{children}</CardContent>
      ) : null}
    </Card>
  );
}

type DetailSectionBlockProps = {
  title: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  onActionClick?: () => void;
  actionLabel?: string;
  showDefaultAction?: boolean;
  tone?: "primary" | "muted" | "neutral" | "transparent";
  collapsible?: boolean;
  defaultOpen?: boolean;
  children?: ReactNode;
  className?: string;
  bannerClassName?: string;
  cardClassName?: string;
  contentClassName?: string;
};

export function DetailSectionBlock({
  title,
  icon,
  action,
  onActionClick,
  actionLabel = "Modifica sezione",
  showDefaultAction = false,
  tone = "primary",
  collapsible = false,
  defaultOpen = true,
  children,
  className,
  bannerClassName,
  cardClassName,
  contentClassName,
}: DetailSectionBlockProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  React.useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen, title]);

  const resolvedAction =
    action ??
    (showDefaultAction ? (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onActionClick}
        disabled={!onActionClick}
        aria-label={actionLabel}
        title={actionLabel}
      >
        <PencilIcon className="size-4" />
      </Button>
    ) : null);

  const resolvedHeaderAction = collapsible ? (
    <div className="flex items-center gap-1">
      {resolvedAction ? <div className="shrink-0">{resolvedAction}</div> : null}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? "Comprimi sezione" : "Espandi sezione"}
        title={isOpen ? "Comprimi sezione" : "Espandi sezione"}
      >
        <ChevronDownIcon className={cn("size-4 transition-transform", !isOpen && "-rotate-90")} />
      </Button>
    </div>
  ) : resolvedAction ? (
    <div className="shrink-0">{resolvedAction}</div>
  ) : null;

  const iconToneClassName = {
    primary: "bg-blue-100 text-blue-600",
    muted: "bg-muted text-muted-foreground",
    neutral: "bg-muted text-muted-foreground",
    transparent: "bg-muted text-muted-foreground",
  }[tone];

  const hasContent = isOpen && Boolean(children);

  return (
    <Card className={cn("py-0 gap-0", cardClassName, className)}>
      <CardContent
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-3",
          bannerClassName,
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          {icon ? (
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:text-current",
                iconToneClassName,
              )}
            >
              {icon}
            </div>
          ) : null}
          <p className="ui-type-section truncate uppercase">{title}</p>
        </div>
        {resolvedHeaderAction}
      </CardContent>
      {hasContent ? (
        <CardContent
          className={cn(
            "space-y-4 border-t border-border-subtle px-4 py-4",
            contentClassName,
          )}
        >
          {children}
        </CardContent>
      ) : null}
    </Card>
  );
}

type DetailFieldProps = {
  label: string;
  value: ReactNode;
  multiline?: boolean;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
};

export function DetailField({
  label,
  value,
  multiline = false,
  className,
  labelClassName,
  valueClassName,
}: DetailFieldProps) {
  const isPrimitiveValue =
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint";

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className={labelClassName}>{label}</Label>
      {isPrimitiveValue && !multiline ? (
        <Input
          readOnly
          tabIndex={-1}
          value={String(value)}
          className={valueClassName}
        />
      ) : multiline ? (
        <div
          className={cn(
            "min-h-(--h-md) w-full rounded-md bg-surface",
            "px-3 py-2 text-sm text-foreground-strong",
            "shadow-[inset_0_0_0_1px_var(--border)]",
            "leading-snug whitespace-pre-wrap break-words",
            valueClassName,
          )}
        >
          {isPrimitiveValue ? String(value) : value}
        </div>
      ) : (
        <div
          className={cn(
            "flex min-h-(--h-md) items-center text-sm text-foreground-strong",
            valueClassName,
          )}
        >
          {value}
        </div>
      )}
    </div>
  );
}

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
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label className={labelClassName}>{label}</Label>
      {children}
    </div>
  );
}
