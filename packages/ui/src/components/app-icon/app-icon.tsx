import type { Icon } from '@lombokapp/types'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import { Box } from 'lucide-react'

import { lookupBuiltinIcon } from '@/src/icons/builtin-catalog'
import { resolveAppAssetUrl } from '@/src/utils/app-asset-url'

import { useTheme } from '../../contexts/theme/theme.hooks'

interface AppIconProps {
  icon: Icon | undefined
  fallbackLabel: string
  appIdentifier?: string
  size?: number
  className?: string
}

type Appearance = 'light' | 'dark' | 'any'

// True when the icon is a monochromatic glyph (built-in lucide icon or a
// tinted SVG) — those look best on a neutral tile background. PNGs and
// `rendering: "original"` SVGs supply their own treatment and should render
// raw without a wrapping border.
export function iconRendersAsGlyph(icon: Icon | undefined): boolean {
  if (!icon) {
    return true
  }
  if (icon.source === 'builtin') {
    return true
  }
  return icon.format === 'svg' && icon.rendering === 'template'
}

const pickAssetsForAppearance = <T extends { appearance?: Appearance }>(
  assets: T[],
  theme: 'light' | 'dark',
): T[] => {
  const themeMatch = assets.filter((a) => a.appearance === theme)
  if (themeMatch.length > 0) {
    return themeMatch
  }
  const anyMatch = assets.filter(
    (a) => a.appearance === 'any' || a.appearance === undefined,
  )
  if (anyMatch.length > 0) {
    return anyMatch
  }
  return assets.filter((a) => a.appearance === 'light')
}

export function AppIcon({
  icon,
  fallbackLabel,
  appIdentifier,
  size = 20,
  className,
}: AppIconProps) {
  const { theme } = useTheme()
  const themeMode: 'light' | 'dark' = theme === 'dark' ? 'dark' : 'light'

  if (!icon) {
    return (
      <Box
        size={size}
        aria-label={fallbackLabel}
        className={cn('text-muted-foreground', className)}
      />
    )
  }

  if (icon.source === 'builtin') {
    const Component = lookupBuiltinIcon(icon.name)
    return (
      <Component
        size={size}
        aria-label={icon.label ?? fallbackLabel}
        className={className}
      />
    )
  }

  if (!appIdentifier) {
    return (
      <Box
        size={size}
        aria-label={icon.label ?? fallbackLabel}
        className={cn('text-muted-foreground', className)}
      />
    )
  }

  if (icon.format === 'svg') {
    const assets = pickAssetsForAppearance(icon.assets, themeMode)
    const asset = assets[0]
    if (!asset) {
      return (
        <Box
          size={size}
          aria-label={icon.label ?? fallbackLabel}
          className={cn('text-muted-foreground', className)}
        />
      )
    }
    const url = resolveAppAssetUrl(appIdentifier, asset.path)

    if (icon.rendering === 'template') {
      return (
        <span
          role="img"
          aria-label={icon.label ?? fallbackLabel}
          style={{
            display: 'inline-block',
            width: size,
            height: size,
            backgroundColor: 'currentColor',
            maskImage: `url(${JSON.stringify(url)})`,
            WebkitMaskImage: `url(${JSON.stringify(url)})`,
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
          }}
          className={className}
        />
      )
    }
    return (
      <img
        src={url}
        width={size}
        height={size}
        alt={icon.label ?? fallbackLabel}
        className={cn('rounded-md', className)}
      />
    )
  }

  // PNG, rendering: 'original' (template+png is rejected at install)
  const pngAssets = pickAssetsForAppearance(icon.assets, themeMode)
  const sorted = [...pngAssets].sort((a, b) => a.scale - b.scale)
  const primary = sorted[0]
  if (!primary) {
    return (
      <Box
        size={size}
        aria-label={icon.label ?? fallbackLabel}
        className={cn('text-muted-foreground', className)}
      />
    )
  }
  const primaryUrl = resolveAppAssetUrl(appIdentifier, primary.path)
  const srcSet = sorted
    .map((a) => `${resolveAppAssetUrl(appIdentifier, a.path)} ${a.scale}x`)
    .join(', ')

  return (
    <img
      src={primaryUrl}
      srcSet={srcSet}
      width={size}
      height={size}
      alt={icon.label ?? fallbackLabel}
      className={cn('rounded-md', className)}
    />
  )
}
