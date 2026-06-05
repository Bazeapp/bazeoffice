import * as React from "react";

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card";

/**
 * D2 — wrapper di sezione condiviso dalle Gate*Card (estratto da gate1-view).
 * Thin layer su DetailSectionBlock senza action di default.
 */
export function GateInfoCard({
  title,
  icon,
  titleAction,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  titleAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <DetailSectionBlock
      title={title}
      icon={icon}
      action={titleAction}
      showDefaultAction={false}
      contentClassName="space-y-4"
    >
      {children}
    </DetailSectionBlock>
  );
}
