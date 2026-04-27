"use client";

import { cn } from "@/lib/utils";
import { Button } from "./button";

/**
 * DayCountSelector — refresh primitive.
 * 36px square tiles, weekend tint, live count + presets.
 *
 *   const [days, setDays] = React.useState(["Mar", "Gio", "Dom"]);
 *   <DayCountSelector value={days} onChange={setDays} />
 */
const DEFAULT_DAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const WEEKEND_INDEXES = [5, 6];

const PRESETS: Record<string, string[]> = {
  "Lun-Ven": ["Lun", "Mar", "Mer", "Gio", "Ven"],
  Tutto: DEFAULT_DAYS,
  Pulisci: [],
};

export interface DayCountSelectorProps {
  value?: string[];
  onChange?: (days: string[]) => void;
  days?: string[];
  presets?: Record<string, string[]>;
  showCount?: boolean;
  className?: string;
}

export function DayCountSelector({
  value = [],
  onChange,
  days = DEFAULT_DAYS,
  presets = PRESETS,
  showCount = true,
  className,
}: DayCountSelectorProps) {
  const toggle = (day: string) => {
    const next = value.includes(day)
      ? value.filter((d) => d !== day)
      : [...value, day];
    onChange?.(next);
  };

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div className="flex gap-1" role="group" aria-label="Giorni settimanali">
        {days.map((day, i) => {
          const active = value.includes(day);
          const weekend = WEEKEND_INDEXES.includes(i);
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggle(day)}
              aria-pressed={active}
              className={cn(
                "h-9 w-9 rounded-md text-xs font-medium",
                "transition-[background,color,box-shadow] duration-(--duration-fast)",
                "outline-none focus-visible:shadow-(--shadow-ring)",
                active
                  ? "bg-accent text-foreground-on-accent shadow-[var(--shadow-inset-top),0_0_0_1px_var(--accent)] font-semibold"
                  : weekend
                  ? "bg-neutral-100 text-foreground-subtle shadow-[inset_0_0_0_1px_var(--border)]"
                  : "bg-surface text-foreground-muted shadow-[inset_0_0_0_1px_var(--border-strong)] hover:bg-neutral-50"
              )}
            >
              {day.slice(0, 1)}
            </button>
          );
        })}
      </div>
      {(showCount || Object.keys(presets).length > 0) && (
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-foreground-muted">
          {showCount ? (
            <span>
              <strong className="tabular-nums text-foreground-strong">
                {value.length}
              </strong>{" "}
              giorni selezionati
            </span>
          ) : null}
          {Object.keys(presets).length > 0 ? (
            <span className="text-foreground-faint">·</span>
          ) : null}
          {Object.entries(presets).map(([name, vals]) => (
            <Button
              key={name}
              variant="link"
              size="xs"
              type="button"
              onClick={() => onChange?.(vals)}
            >
              {name}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
