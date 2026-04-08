import type { ReactNode } from "react"

import { FieldTitle } from "@/components/ui/field"

type DetailRowProps = {
  label: string
  children: ReactNode
  align?: "start" | "center"
}

export function DetailRow({
  label,
  children,
  align = "center",
}: DetailRowProps) {
  return (
    <div
      className={`flex gap-3 text-sm ${align === "start" ? "items-start" : "items-center"}`}
    >
      <FieldTitle className="w-24 shrink-0">
        {label}
      </FieldTitle>
      <div className="min-w-0 flex-1 text-foreground">{children}</div>
    </div>
  )
}
