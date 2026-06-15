import type { Icon } from '@lombokapp/types'

// True for monochromatic glyphs (builtin or tinted SVG) that want a neutral tile; PNGs and original-rendering SVGs render raw.
export function iconRendersAsGlyph(icon: Icon | undefined): boolean {
  if (!icon) {
    return true
  }
  if (icon.source === 'builtin') {
    return true
  }
  return icon.format === 'svg' && icon.rendering === 'template'
}
