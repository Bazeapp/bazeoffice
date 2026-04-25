"use client";

import * as React from "react";

import { Input } from "@/components/ui-next/input";

function parseItalianDate(value: string): Date | null {
  const trimmed = value.trim();
  const parts = trimmed.split("/");
  if (parts.length !== 3) return null;

  const day = Number.parseInt(parts[0] ?? "", 10);
  const month = Number.parseInt(parts[1] ?? "", 10);
  const year = Number.parseInt(parts[2] ?? "", 10);
  if (!day || !month || !year) return null;

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromIsoDate(value: string): Date | null {
  if (!value) return null;
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  const year = Number.parseInt(yearRaw ?? "", 10);
  const month = Number.parseInt(monthRaw ?? "", 10);
  const day = Number.parseInt(dayRaw ?? "", 10);
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatItalianDate(date: Date) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export type DatePickerProps = {
  value?: string | null;
  onValueChange?: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
};

export function DatePicker({
  value,
  onValueChange,
  placeholder = "Seleziona data",
  disabled = false,
  invalid,
  className,
}: DatePickerProps) {
  const inputValue = React.useMemo(() => {
    const normalized = String(value ?? "").trim();
    if (!normalized || normalized === "-") return "";
    if (normalized.includes("/")) {
      const parsed = parseItalianDate(normalized);
      return parsed ? toIsoDate(parsed) : "";
    }
    const parsed = fromIsoDate(normalized);
    return parsed ? toIsoDate(parsed) : "";
  }, [value]);

  return (
    <Input
      type="date"
      value={inputValue}
      onChange={(event) => {
        const next = fromIsoDate(event.target.value);
        onValueChange?.(next ? formatItalianDate(next) : "");
      }}
      disabled={disabled}
      invalid={invalid}
      className={className}
      aria-label={placeholder}
    />
  );
}
