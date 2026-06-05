import type { AppConfig, Icon } from '@lombokapp/types'
import fs from 'fs'
import path from 'path'

import { validateSvg } from './svg-validate'

export interface AppIconValidateResult {
  errors: { path: string; message: string }[]
}

const UI_BUNDLE_PREFIX = 'ui'

const collectCustomSvgIconPaths = (config: AppConfig): string[] => {
  const out = new Set<string>()
  const collect = (icon: Icon | undefined) => {
    if (icon?.source !== 'custom' || icon.format !== 'svg') {
      return
    }
    icon.assets.forEach((asset) => out.add(asset.path))
  }
  collect(config.icon)
  const contributions = config.contributions
  if (contributions) {
    for (const key of [
      'sidebarMenuLinks',
      'folderSidebarViews',
      'objectSidebarViews',
      'objectDetailViews',
      'folderDetailViews',
    ] as const) {
      contributions[key].forEach((link) => collect(link.icon))
    }
  }
  return Array.from(out)
}

// Validates every custom SVG icon referenced by an app config against the
// platform's allowlist. Bundle files are never mutated; if an icon contains
// disallowed content the install is rejected with the offending paths and a
// description of what was rejected.
export function validateAppIcons(
  config: AppConfig,
  appRoot: string,
): AppIconValidateResult {
  const errors: AppIconValidateResult['errors'] = []

  for (const assetPath of collectCustomSvgIconPaths(config)) {
    const absolutePath = path.join(appRoot, UI_BUNDLE_PREFIX, assetPath)
    let contents: string
    try {
      contents = fs.readFileSync(absolutePath, 'utf-8')
    } catch (err) {
      errors.push({
        path: assetPath,
        message: `Could not read SVG icon asset: ${err instanceof Error ? err.message : String(err)}`,
      })
      continue
    }

    const result = validateSvg(contents)
    if (!result.ok) {
      errors.push({ path: assetPath, message: result.reason })
    }
  }

  return { errors }
}
