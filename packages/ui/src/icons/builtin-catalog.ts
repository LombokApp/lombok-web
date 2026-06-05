import type { BuiltinIconName } from '@lombokapp/types'
import { BUILTIN_ICON_NAMES } from '@lombokapp/types'
import type { LucideIcon } from 'lucide-react'
import {
  AppWindow,
  Box,
  Code,
  FileIcon,
  Folder,
  Settings,
  Sparkles,
  Terminal,
} from 'lucide-react'

export const BUILTIN_CATALOG_VERSION = '1'

// Exhaustive mapping from the platform's catalog names to lucide-react
// components. TS enforces full coverage via the `Record<BuiltinIconName, …>`
// type — any name added to BUILTIN_ICON_NAMES in @lombokapp/types but missing
// here is a compile-time error.
export const BUILTIN_ICON_CATALOG: Record<BuiltinIconName, LucideIcon> = {
  app: AppWindow,
  box: Box,
  code: Code,
  file: FileIcon,
  folder: Folder,
  settings: Settings,
  sparkles: Sparkles,
  terminal: Terminal,
}

// At install time the platform rejects unknown names, but the wire type for
// `name` is a plain string — so the runtime lookup has to tolerate misses.
export function lookupBuiltinIcon(name: string): LucideIcon {
  return (
    (BUILTIN_ICON_CATALOG as Record<string, LucideIcon | undefined>)[name] ??
    Box
  )
}

export { BUILTIN_ICON_NAMES }
export type { BuiltinIconName }
