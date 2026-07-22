import * as React from "react";

import { cn } from "@/lib/utils";

export function ToolbarField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex min-w-0 flex-col gap-1 text-xs font-medium text-muted-foreground",
        className,
      )}
    >
      <span>{label}</span>
      {children}
    </label>
  );
}
