import {
  ArrowUpRightIcon,
  BriefcaseIcon,
  FileTextIcon,
  HomeIcon,
  SearchIcon,
  TargetIcon,
  UserIcon,
} from "lucide-react"

import type { CommentSectionKind } from "../types/section"
import type { EntityType } from "../types/entity"

const ENTITY_ICONS: Record<EntityType, typeof HomeIcon> = {
  famiglia: HomeIcon,
  lavoratore: UserIcon,
  ricerca: SearchIcon,
  candidatura: TargetIcon,
  rapporto: BriefcaseIcon,
  assunzione: FileTextIcon,
  variazione: FileTextIcon,
  chiusura: FileTextIcon,
  cedolino: FileTextIcon,
  contributi: FileTextIcon,
  ticket: FileTextIcon,
}

type CommentSectionIconProps = {
  entityType: EntityType | null
  kind: CommentSectionKind
  muted?: boolean
}

export function CommentSectionIcon({
  entityType,
  kind,
  muted = false,
}: CommentSectionIconProps) {
  const className = muted ? "size-3.5 text-foreground-faint" : "size-3.5 text-foreground-subtle"

  if (kind === "descendants") {
    return <ArrowUpRightIcon aria-hidden className={className} />
  }

  const Icon = entityType ? ENTITY_ICONS[entityType] : SearchIcon
  return <Icon aria-hidden className={className} />
}
