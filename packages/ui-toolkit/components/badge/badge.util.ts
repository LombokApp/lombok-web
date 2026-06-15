/*
 * Badge — same additive color model as Button (UI_TOOLKIT_ALIGNMENT.md §4.6).
 * `variant` (solid|soft|outline) × `tone`/`color` × `size`. Derives from `--badge-color`.
 */

import { cva } from 'class-variance-authority'

export const badgeVariants = cva(
  'inline-flex items-center rounded-full border font-semibold transition-colors ' +
    'focus:outline-none focus:ring-2 focus:ring-[var(--badge-color)] focus:ring-offset-2',
  {
    variants: {
      variant: {
        solid:
          'border-transparent bg-[var(--badge-color)] text-[var(--badge-fg,contrast-color(var(--badge-color)))]',
        soft: 'border-transparent bg-[color-mix(in_srgb,var(--badge-color)_16%,transparent)] text-[var(--badge-color)]',
        outline:
          'border-[color-mix(in_srgb,var(--badge-color)_35%,var(--border))] text-[var(--badge-color)]',
      },
      tone: {
        // Explicit solid foreground per tone (see Button). neutral falls back to contrast-color.
        neutral: '[--badge-color:var(--muted-foreground)]',
        blue: '[--badge-color:var(--color-tone-blue)] [--badge-fg:#fff]',
        green: '[--badge-color:var(--color-tone-green)] [--badge-fg:#fff]',
        red: '[--badge-color:var(--color-tone-red)] [--badge-fg:#fff]',
        yellow: '[--badge-color:var(--color-tone-yellow)] [--badge-fg:#1c1917]',
        cyan: '[--badge-color:var(--color-tone-cyan)] [--badge-fg:#08272f]',
        orange: '[--badge-color:var(--color-tone-orange)] [--badge-fg:#1c1917]',
        danger: '[--badge-color:var(--color-tone-danger)] [--badge-fg:#fff]',
        fuchsia: '[--badge-color:var(--color-tone-fuchsia)] [--badge-fg:#fff]',
        purple: '[--badge-color:var(--color-tone-purple)] [--badge-fg:#fff]',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-1.5 py-0 text-[0.65rem] leading-4',
      },
    },
    compoundVariants: [
      // Neutral outline border = foreground at low opacity (adapts to light/dark; % is the
      // visibility knob, unlike opacity of the near-white --border token).
      {
        variant: 'outline',
        tone: 'neutral',
        class: 'border-[color-mix(in_srgb,var(--foreground)_15%,transparent)]',
      },
    ],
    defaultVariants: {
      variant: 'solid',
      tone: 'neutral',
      size: 'default',
    },
  },
)
