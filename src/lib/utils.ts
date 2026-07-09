import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Iniziali da un nome: "Mario Rossi" -> "MR", "Mario" -> "MA", vuoto -> "-". */
export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "-"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

/** Deterministic string hash for stable pseudo-random selection. */
export function hashString(input: string) {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

/** Alternate deterministic hash (djb2-style) used by assignee seeding UIs. */
export function hashStringDjb2(input: string) {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

/** Converts legacy avatar ring classes to Tailwind `ring-*` classes. */
export function toAvatarRingClass(legacyClassName: string) {
  return legacyClassName.replace(/after:border-/g, "ring-2 ring-")
}
