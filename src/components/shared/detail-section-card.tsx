import type { ReactNode } from "react";
import { PencilIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type DetailSectionBlockProps = {
  title: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  onActionClick?: () => void;
  actionLabel?: string;
  showDefaultAction?: boolean;
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
  showDefaultAction = true,
  children,
  className,
  bannerClassName,
  cardClassName,
  contentClassName,
}: DetailSectionBlockProps) {
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

  return (
    <div className={cn("space-y-3", className)}>
      <Card className={cn("bg-primary/5 py-0 shadow-none", bannerClassName)}>
        <CardContent className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            {icon ? (
              <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-xl">
                {icon}
              </div>
            ) : null}
            <p className="ui-type-section uppercase">{title}</p>
          </div>
          {resolvedAction ? <div className="shrink-0">{resolvedAction}</div> : null}
        </CardContent>
      </Card>

      <DetailSectionCard
        title={title}
        titleIcon={icon}
        className={cn(
          "rounded-[1.6rem] bg-background px-3 py-3 shadow-none [&_[data-slot=card-header]]:hidden",
          cardClassName,
        )}
        contentClassName={cn("space-y-4 px-1 pt-1", contentClassName)}
      >
        {children}
      </DetailSectionCard>
    </div>
  );
}

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
  const isPrimitiveValue =
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint";

  return (
    <div className={cn("space-y-1.5", className)}>
      <p className={cn("ui-type-label", labelClassName)}>{label}</p>
      {isPrimitiveValue ? (
        <Input
          readOnly
          tabIndex={-1}
          value={String(value)}
          className={cn(
            "ui-type-value h-auto border-transparent bg-transparent px-0 py-0 shadow-none focus-visible:ring-0",
            valueClassName,
          )}
        />
      ) : (
        <div
          className={cn(
            "ui-type-value flex min-h-0 items-center px-0 py-0 shadow-none",
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
    <div className={cn("space-y-1.5", className)}>
      <p className={cn("ui-type-label", labelClassName)}>{label}</p>
      {children}
    </div>
  );
}
