import type { Icon } from '@lombokapp/types'

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
