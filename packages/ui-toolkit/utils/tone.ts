import type { CSSProperties } from 'react'

/**
 * Named additive tones — seed colors mapped to `--color-tone-*` tokens (theme.css).
 * Applied as a cva `tone` variant on Button/Badge (static `[--*-color:…]` classes), so
 * tone works through both the component and the `*Variants()` className helpers.
 * The `color` prop is the one-shot escape hatch (inline style). See §4.6 of
 * packages/demo-apps/coder/UI_TOOLKIT_ALIGNMENT.md.
 */
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

/**
 * A readable (black/white) foreground for a solid swatch of `color`, via YIQ brightness.
 * Returns undefined for colors we can't parse (named, var(), oklch, …) — callers then let
 * CSS `contrast-color()` handle it.
 */
export function readableForeground(color: string): string | undefined {
  const rgb = parseRgb(color)
  if (!rgb) {
    return undefined
  }
  const [r, g, b] = rgb
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 140 ? '#1c1917' : '#fff'
}

/**
 * Inline style for the one-shot `color`/`fg` overrides on a toned component.
 * `scope` is the component prefix, e.g. `'button'` → sets `--button-color` / `--button-fg`.
 * When `color` is set without an explicit `fg`, a readable fg is computed for hex/rgb colors
 * (so solid text doesn't depend on `contrast-color()` support); unparseable colors fall
 * through to the CSS `contrast-color()` default. Merges any caller `style` last.
 */
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
  } as CSSProperties
}
