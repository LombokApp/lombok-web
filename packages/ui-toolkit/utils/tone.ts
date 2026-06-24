import type { CSSProperties } from 'react'

// Named additive tones mapped to `--color-tone-*` tokens; `color` prop is the one-shot escape hatch (UI_TOOLKIT_ALIGNMENT.md §4.6).
export type Tone =
  | 'neutral'
  | 'blue'
  | 'green'
  | 'red'
  | 'yellow'
  | 'cyan'
  | 'orange'
  | 'fuchsia'
  | 'purple'
  | 'danger'

/** Parse #rgb / #rrggbb / rgb()/rgba() to [r,g,b] (0–255). Returns null for anything else. */
function parseRgb(color: string): [number, number, number] | null {
  const c = color.trim()
  if (c.startsWith('#')) {
    const hex =
      c.length === 4
        ? c
            .slice(1)
            .split('')
            .map((x) => x + x)
            .join('')
        : c.slice(1)
    if (hex.length !== 6 || /[^0-9a-f]/i.test(hex)) {
      return null
    }
    const n = parseInt(hex, 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const inner = /^rgba?\(([^)]+)\)/i.exec(c)?.[1]
  if (inner) {
    const parts = inner
      .split(/[\s,/]+/)
      .filter(Boolean)
      .slice(0, 3)
      .map(Number)
    if (parts.length === 3 && parts.every((v) => !Number.isNaN(v))) {
      return parts as [number, number, number]
    }
  }
  return null
}

// Readable black/white foreground for a solid `color` via YIQ; undefined for unparseable colors (caller falls back to CSS contrast-color()).
export function readableForeground(color: string): string | undefined {
  const rgb = parseRgb(color)
  if (!rgb) {
    return undefined
  }
  const [r, g, b] = rgb
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 140 ? '#1c1917' : '#fff'
}

// Inline style for one-shot `color`/`fg` overrides; `scope` is the var prefix (e.g. 'button' → --button-color). Computes a readable fg for hex/rgb when none given.
export function toneStyle(
  scope: string,
  color?: string,
  fg?: string,
  style?: CSSProperties,
): CSSProperties | undefined {
  if (!color && !fg) {
    return style
  }
  const resolvedFg = fg ?? (color ? readableForeground(color) : undefined)
  return {
    ...(color ? { [`--${scope}-color`]: color } : {}),
    ...(resolvedFg ? { [`--${scope}-fg`]: resolvedFg } : {}),
    ...style,
  }
}
